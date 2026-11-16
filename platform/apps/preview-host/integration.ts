import {
  createPublicKey,
  randomBytes,
  verify,
  type KeyObject,
} from "node:crypto";
import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import {
  blockSpec,
  makeBlock,
  projectSchema,
  type BuildProject,
} from "@motionux/build-core";
import { BuildError, canonical, fingerprint } from "@motionux/build-core/store";
import type {
  IntegrationChallenge,
  IntegrationResult,
  IntegrationReview,
} from "@motionux/build-core/integration";
import type { InspectionReport } from "@motionux/build-core/inspection";
import { exportTree, writeTree } from "@motionux/app-export";

type Tree = Awaited<ReturnType<typeof exportTree>>;
type BrowserCheck = (
  project: BuildProject,
  tree: Tree,
  route: string,
  title: string,
  phase: "integrated" | "restored",
  signal: AbortSignal,
) => Promise<InspectionReport>;
type Job = {
  folder: string;
  project: BuildProject;
  candidate: BuildProject;
  before: Tree;
  after: Tree;
  review: IntegrationReview;
  timer: ReturnType<typeof setTimeout>;
  abort?: AbortController;
};

const changes = ["motionux-manifest.json", "runtime/project.ts"];
const reviewLifetime = 5 * 60_000;
const documentDigest = (project: BuildProject) =>
  fingerprint(canonical(project.document));
const paths = (tree: Tree) => Object.keys(tree).sort();
const treeDigest = (tree: Tree) =>
  fingerprint(
    canonical(
      paths(tree).map((path) => ({
        path,
        sha256: fingerprint(tree[path]),
        mode: 0o600,
      })),
    ),
  );
function reject(status: number, message: string): never {
  throw new BuildError(status, message);
}

async function privateDirectory(path: string, create = false) {
  if (create) {
    await mkdir(path, { mode: 0o700 }).catch((error) => {
      if (error.code !== "EEXIST") throw error;
    });
  }
  const stat = await lstat(path, { bigint: true });
  if (
    !stat.isDirectory() ||
    (stat.mode & 0o7777n) !== 0o700n ||
    (await realpath(path)) !== path
  )
    reject(409, "The isolated workspace identity changed.");
  return stat.dev + ":" + stat.ino;
}

export function approvalKey(pem: string | undefined): KeyObject | undefined {
  if (!pem?.startsWith("-----BEGIN PUBLIC KEY-----")) return;
  try {
    const key = createPublicKey(pem);
    if (key.asymmetricKeyType === "ed25519") return key;
  } catch {
    /* Invalid startup configuration leaves approval disabled. */
  }
}

export const approvalFingerprint = (key: KeyObject) =>
  fingerprint(key.export({ format: "der", type: "spki" }));

async function checkedTree(
  root: string,
  expected: Tree,
  identity: string,
): Promise<Tree> {
  if ((await privateDirectory(root)) !== identity)
    reject(409, "The reviewed workspace no longer matches its identity.");
  const contents: Tree = Object.create(null);
  const directories = new Map<string, Set<string>>();
  for (const path of paths(expected)) {
    let folder = dirname(path);
    let name = basename(path);
    for (;;) {
      if (!directories.has(folder)) directories.set(folder, new Set());
      directories.get(folder)!.add(name);
      if (folder === ".") break;
      name = basename(folder);
      folder = dirname(folder);
    }
  }
  for (const [folder, names] of directories) {
    const path = join(root, folder);
    await privateDirectory(path);
    const actual = await readdir(path);
    if (actual.length !== names.size || actual.some((name) => !names.has(name)))
      reject(409, "The reviewed workspace contains unexpected entries.");
  }
  for (const path of paths(expected)) {
    const file = await open(
      join(root, path),
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      const stat = await file.stat();
      if (
        !stat.isFile() ||
        stat.nlink !== 1 ||
        (stat.mode & 0o777) !== 0o600 ||
        stat.size !== Buffer.byteLength(expected[path])
      )
        reject(409, "A reviewed source file changed mode, size or identity.");
      const bytes = await file.readFile();
      if (fingerprint(bytes) !== fingerprint(expected[path]))
        reject(409, "A reviewed source file changed.");
      contents[path] = bytes;
    } finally {
      await file.close();
    }
  }
  return contents;
}

async function writeProof(folder: string, name: string, value: unknown) {
  await writeFile(join(folder, name), canonical(value) + "\n", {
    flag: "wx",
    mode: 0o600,
    flush: true,
  });
}

export function createIntegrationLab(
  repo: string,
  vault: string,
  key: KeyObject | undefined,
  checkBrowser: BrowserCheck,
  {
    now = Date.now,
    afterParking,
  }: { now?: () => number; afterParking?: () => Promise<void> } = {},
) {
  let job: Job | undefined;
  let preparing = false;
  const signer = key ? approvalFingerprint(key) : undefined;
  const root = join(vault, "build", "integrations");
  const evidence = join(root, "receipts");
  async function cleanup(current: Job) {
    clearTimeout(current.timer);
    if (job === current) job = undefined;
    if (
      (await privateDirectory(current.folder)) !==
      current.review.challenge.target.jobIdentity
    )
      reject(409, "The isolated workspace changed before cleanup.");
    await rm(current.folder, { recursive: true, force: true });
  }

  function reviewed(projectId: string, id: string) {
    if (!job || job.review.challenge.id !== id || job.project.id !== projectId)
      reject(409, "The review is no longer active. Prepare a fresh review.");
    return job;
  }

  return {
    signer,
    async prepare(
      project: BuildProject,
      route: string,
    ): Promise<IntegrationReview> {
      if (!signer)
        reject(
          503,
          "Start Studio with a trusted host public key to prepare an integration.",
        );
      if (preparing || job?.abort)
        reject(409, "An isolated integration is already running.");
      if (!project.document.pages.some((page) => page.route === route))
        reject(422, "Choose a saved page in this project.");
      preparing = true;
      const id = randomBytes(16).toString("hex");
      const title = "Integration details " + id.slice(0, 8);
      const folder = join(root, id);
      let created = false;
      try {
        if (job) {
          if (job.project.id !== project.id)
            reject(
              409,
              "Close the other integration review or wait for it to expire.",
            );
          await cleanup(job);
        }
        const candidate = projectSchema.safeParse({
          ...project,
          revision: project.revision + 1,
          document: {
            ...project.document,
            pages: project.document.pages.map((page) =>
              page.route === route
                ? {
                    ...page,
                    blocks: [
                      ...page.blocks,
                      makeBlock("Dialog", "b-" + id, { title }),
                    ],
                  }
                : page,
            ),
          },
        });
        if (!candidate.success)
          reject(
            422,
            "The selected page cannot fit the registered Dialog block.",
          );
        await privateDirectory(vault);
        await privateDirectory(join(vault, "build"));
        await privateDirectory(root, true);
        await privateDirectory(evidence, true);
        const before = await exportTree(repo, project);
        const after = await exportTree(repo, candidate.data);
        const files = paths(before)
          .filter(
            (path) => fingerprint(before[path]) !== fingerprint(after[path]),
          )
          .map((path) => ({
            path,
            before: fingerprint(before[path]),
            after: fingerprint(after[path]),
          }));
        if (
          canonical(paths(before)) !== canonical(paths(after)) ||
          canonical(files.map(({ path }) => path)) !== canonical(changes)
        )
          reject(
            409,
            "The generated write set exceeded the integration contract.",
          );
        await mkdir(folder, { mode: 0o700 });
        created = true;
        const target = join(folder, "project");
        const next = join(folder, "candidate");
        await writeTree(target, before);
        await writeTree(next, after);
        const spec = blockSpec("Dialog");
        const challenge: IntegrationChallenge = {
          protocol: "motionux-build-integration/v1",
          operation: "apply-and-restore-disposable-copy",
          id,
          signer,
          expiresAt: now() + reviewLifetime,
          project: {
            id: project.id,
            name: project.document.name,
            revision: project.revision,
            documentDigest: documentDigest(project),
            route,
          },
          target: {
            root: target,
            jobIdentity: await privateDirectory(folder),
            baselineIdentity: await privateDirectory(target),
            candidateIdentity: await privateDirectory(next),
          },
          source: {
            block: "Dialog",
            version: spec.version,
            license: spec.license,
            title,
            renderer: fingerprint(before["runtime/blocks.tsx"]),
            notice: fingerprint(before.LICENSE),
            lockfile: fingerprint(before["package-lock.json"]),
          },
          baseline: treeDigest(before),
          candidate: treeDigest(after),
          files,
        };
        const payload = canonical(challenge) + "\n";
        const review = { challenge, payload, digest: fingerprint(payload) };
        const timer = setTimeout(() => {
          const current = job;
          if (current?.review.challenge.id === id && !current.abort)
            void cleanup(current).catch(() => {});
        }, reviewLifetime);
        timer.unref();
        job = {
          folder,
          project,
          candidate: candidate.data,
          before,
          after,
          review,
          timer,
        };
        return review;
      } catch (error) {
        if (created) await rm(folder, { recursive: true, force: true });
        throw error;
      } finally {
        preparing = false;
      }
    },
    async cancel(projectId: string, id: string) {
      if (preparing) reject(409, "A review is being prepared.");
      const current = reviewed(projectId, id);
      if (current.abort) current.abort.abort();
      else await cleanup(current);
    },
    async execute(
      projectId: string,
      id: string,
      signature: string,
      currentProject: () => Promise<BuildProject>,
      requestSignal?: AbortSignal,
    ): Promise<IntegrationResult> {
      if (preparing) reject(409, "A review is being prepared.");
      const current = reviewed(projectId, id);
      const { challenge, payload, digest } = current.review;
      if (current.abort) reject(409, "The approval has already been claimed.");
      if (now() >= challenge.expiresAt)
        reject(409, "The host approval review expired.");
      if (!key || !/^[A-Za-z0-9_-]{86}$/.test(signature))
        reject(403, "A signature from the configured host is required.");
      const bytes = Buffer.from(signature, "base64url");
      if (
        bytes.toString("base64url") !== signature ||
        !verify(null, Buffer.from(payload), key, bytes)
      )
        reject(403, "The host signature does not match this exact review.");

      current.abort = new AbortController();
      clearTimeout(current.timer);
      const signal = AbortSignal.any([
        current.abort.signal,
        AbortSignal.timeout(165_000),
        ...(requestSignal ? [requestSignal] : []),
      ]);
      const { target, source, project } = challenge;
      const parked = join(current.folder, "baseline");
      const next = join(current.folder, "candidate");
      const bound = async () => {
        if ((await privateDirectory(current.folder)) !== target.jobIdentity)
          reject(409, "The reviewed workspace parent changed.");
      };
      let parkedBaseline = false;
      let installed = false;
      let detached = false;
      const result: IntegrationResult = {
        id,
        approval: digest,
        route: project.route,
        baseline: challenge.baseline,
        candidate: challenge.candidate,
        status: "rollback-unverified",
      };
      try {
        await bound();
        await checkedTree(target.root, current.before, target.baselineIdentity);
        await checkedTree(next, current.after, target.candidateIdentity);
        const latest = await currentProject();
        if (
          latest.revision !== project.revision ||
          documentDigest(latest) !== project.documentDigest ||
          treeDigest(await exportTree(repo, latest)) !== challenge.baseline
        )
          reject(409, "The project revision or source changed after review.");
        await writeProof(current.folder, "approval.json", {
          challenge,
          digest,
          signature,
        });
        signal.throwIfAborted();
        if (now() >= challenge.expiresAt)
          reject(409, "The host approval expired before applying.");
        await bound();
        await rename(target.root, parked);
        parkedBaseline = true;
        await afterParking?.();
        signal.throwIfAborted();
        if (now() >= challenge.expiresAt)
          reject(409, "The host approval expired before publication.");
        await rename(next, target.root);
        installed = true;
        const tree = await checkedTree(
          target.root,
          current.after,
          target.candidateIdentity,
        );
        result.integrated = await checkBrowser(
          current.candidate,
          tree,
          project.route,
          source.title,
          "integrated",
          signal,
        );
        signal.throwIfAborted();
      } catch (error) {
        result.failure = signal.aborted
          ? "Integration cancelled or timed out."
          : error instanceof BuildError
            ? error.message
            : "Integration verification failed.";
      }
      try {
        await bound();
        if (parkedBaseline) {
          await checkedTree(parked, current.before, target.baselineIdentity);
          if (installed) {
            await checkedTree(
              target.root,
              current.after,
              target.candidateIdentity,
            );
            await rename(target.root, next);
            detached = true;
          }
          // A new entry at the target after approval must never be replaced.
          const occupant = await lstat(target.root).catch((error) => {
            if (error.code !== "ENOENT") throw error;
            return null;
          });
          if (occupant)
            reject(409, "An independent change occupied the isolated target.");
          await rename(parked, target.root);
        }
        const restored = await checkedTree(
          target.root,
          current.before,
          target.baselineIdentity,
        );
        result.restored = treeDigest(restored);
        if (result.restored !== challenge.baseline)
          reject(409, "The restored tree failed identity verification.");
        result.rollback = await checkBrowser(
          current.project,
          restored,
          project.route,
          source.title,
          "restored",
          AbortSignal.timeout(165_000),
        );
        await checkedTree(target.root, current.before, target.baselineIdentity);
        result.status = !result.failure
          ? "verified-and-restored"
          : signal.aborted
            ? "cancelled-and-restored"
            : "failed-and-restored";
      } catch {
        result.status = "rollback-unverified";
        if (detached)
          result.failure ??=
            "The restored copy or its browser could not be verified.";
        else
          result.failure ??= "The isolated files could not be safely restored.";
      }
      try {
        await privateDirectory(evidence);
        await writeProof(evidence, id + ".json", {
          review: challenge,
          approval: { digest, signature },
          result,
        });
        if (result.status !== "rollback-unverified") await cleanup(current);
      } finally {
        if (job === current) job = undefined;
      }
      return result;
    },
  };
}
