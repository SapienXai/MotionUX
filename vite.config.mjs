import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

function registryVersions() {
  const id = "virtual:motionux-registry-versions";
  const watched = new Set(["registry.json", "metadata/parity-manifest.json"]);
  return {
    name: "motionux-registry-versions",
    resolveId(source) { if (source === id) return "\0" + id; },
    load(source) {
      if (source !== "\0" + id) return;
      const { items } = JSON.parse(readFileSync("metadata/parity-manifest.json"));
      const registry = JSON.parse(readFileSync("registry.json"));
      const contracts = new Map(registry.items.map(item => [item.name, item]));
      const hashes = new Map();
      const pins = {};
      for (const entry of items) {
        const contract = contracts.get(entry.installItem);
        for (const file of entry.files) watched.add(file.path);
        const matches = entry.pin && JSON.stringify(contract) === JSON.stringify(entry.publicContract)
          && entry.files.every(file => {
            if (!hashes.has(file.path)) {
              try { hashes.set(file.path, createHash("sha256").update(readFileSync(file.path)).digest("hex")); }
              catch { hashes.set(file.path, undefined); }
            }
            return hashes.get(file.path) === file.sha256;
          });
        pins[entry.id] = {
          item: entry.installItem,
          pin: matches ? entry.pin : null,
        };
      }
      for (const file of watched) this.addWatchFile(resolve(file));
      return `export default ${JSON.stringify(pins)}`;
    },
    handleHotUpdate({ file, server }) {
      if (!Array.from(watched).some(path => file.endsWith("/" + path))) return;
      const module = server.moduleGraph.getModuleById("\0" + id);
      if (module) return [module, ...server.moduleGraph.getModulesByFile(file) ?? []];
    },
  };
}

export default defineConfig({ plugins: [registryVersions()] });
