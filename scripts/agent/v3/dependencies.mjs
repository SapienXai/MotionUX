import semver from "semver";
import { canonical } from "../../../src/brain/indexer.ts";
import { stop } from "../v2/files.mjs";

export function validateLock(manifest, lock) {
  const root = lock.packages?.[""];
  const permitted = ["name", "private", "version", "type", "dependencies", "devDependencies"];
  if (manifest.private !== true || manifest.type !== "module" || Object.keys(manifest).some(key => !permitted.includes(key)) ||
      lock.lockfileVersion !== 3 || root?.name !== manifest.name || root.version !== manifest.version ||
      canonical(root.dependencies) !== canonical(manifest.dependencies) || canonical(root.devDependencies) !== canonical(manifest.devDependencies) ||
      Object.keys(lock.packages).length > 500) stop("incompatible", "Expected the reviewed npm manifest and lockfile.");
  for (const [path, row] of Object.entries(lock.packages)) {
    if (!path) continue;
    const bundled = row.inBundle === true && path.startsWith("node_modules/@tailwindcss/oxide-wasm32-wasi/node_modules/") &&
      lock.packages["node_modules/@tailwindcss/oxide-wasm32-wasi"]?.integrity && !row.resolved && !row.integrity;
    if (!/^(?:node_modules\/(?:@[a-z\d_.-]+\/)?[a-z\d_.-]+)(?:\/node_modules\/(?:@[a-z\d_.-]+\/)?[a-z\d_.-]+)*$/i.test(path) ||
        path.split("/").some(part => part === "." || part === "..") || !semver.valid(row.version) || row.link ||
        !bundled && (!/^https:\/\/registry\.npmjs\.org\/[a-z\d@%_./-]+\.tgz$/i.test(row.resolved ?? "") || row.resolved.includes("..") ||
        !/^sha(?:512|1)-[a-z\d+/]+={0,2}$/i.test(row.integrity ?? ""))) stop("incompatible", "The lock contains an unsupported artifact or unpinned dependency.");
  }
  for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
    if (!semver.valid(version) || lock.packages["node_modules/" + name]?.version !== version) stop("incompatible", "Direct dependency resolution differs from the reviewed exact pin.");
  }
}
export function packageDelta(before, baseline, afterLock, adapter, profile) {
  validateLock(before, baseline);
  const after = structuredClone(before);
  for (const name of ["react", "react-dom", ...Object.keys(adapter.packages)]) {
    const version = adapter.packages[name] ?? before.dependencies[name];
    if (!version || !profile.dependencies[name] || !semver.satisfies(version, profile.dependencies[name]) ||
        before.dependencies[name] && before.dependencies[name] !== version) {
      stop("incompatible", "A host dependency conflicts with the original component's declared range.");
    }
    after.dependencies[name] = version;
  }
  validateLock(after, afterLock);
  for (const [path, row] of Object.entries(baseline.packages)) {
    if (path && (afterLock.packages[path]?.version !== row.version || afterLock.packages[path]?.integrity !== row.integrity)) {
      stop("incompatible", "Integrating the component changes an existing resolved dependency.");
    }
  }
  return { after, changes: Object.entries(adapter.packages).filter(([name]) => !before.dependencies[name]).map(([name, version]) => ({ name, version })) };
}
