import { isAbsolute, resolve, sep } from "node:path";
import { lstat } from "node:fs/promises";
import { motionRoot, verifyRoot } from "../agent/workspace.mjs";

export const builtinProjects = ["fixtures/agent/booking-demo", "fixtures/agent/react-entry"].map(path => resolve(motionRoot, path));
const credential = /(?:^|[/_.-])(?:secrets?|credentials?|tokens?|passwords?|keychain|api[-_]?keys?)(?:$|[/_.-])|(?:gh[pousr]_[a-z\d]{8,}|sk-[a-z\d_-]{12,}|AKIA[A-Z0-9]{16})/i;
const denied = () => Object.assign(new Error("Project is outside the configured read scope."), { code: "project-not-authorized" });
const clean = path => path.normalize("NFC") === path && !credential.test(path) && !/[\x00-\x1f\x7f\\%]/.test(path) &&
  !path.split(sep).slice(isAbsolute(path) ? 1 : 0).some(part => !part || part.startsWith("."));

export async function projectPolicy(explicit = []) {
  if (explicit.length > 12) throw denied();
  const roots = new Map();
  for (const path of [...builtinProjects, ...explicit]) {
    if (!isAbsolute(path) || !clean(path) || resolve(path) !== path) throw denied();
    const root = await verifyRoot(path);
    const stat = await lstat(root);
    roots.set(root, { dev: stat.dev, ino: stat.ino });
  }
  return {
    count: roots.size,
    async authorize(value) {
      const path = value.replace(/^\.\//, "");
      if (!clean(path) || value.startsWith("./") && isAbsolute(path)) throw denied();
      const root = isAbsolute(path) ? path : resolve(motionRoot, path);
      const record = roots.get(root);
      // Lexical authorization happens before any read or directory probe on caller input.
      if (!record || resolve(root) !== root) throw denied();
      try {
        if (await verifyRoot(root) !== root) throw denied();
        const now = await lstat(root);
        if (now.dev !== record.dev || now.ino !== record.ino) throw denied();
      } catch { throw denied(); }
      return root;
    },
  };
}
