import { crc32 } from "node:zlib";

export function describeKit(ids, catalog) {
  const ready = ids.map(id => catalog.get(id)).filter(item => item?.availability === "ready");
  const pins = new Map();
  for (const item of ready) for (const [name, version] of Object.entries(item.dependencies)) {
    if (!pins.has(name)) pins.set(name, new Set());
    pins.get(name).add(version);
  }
  return {
    items: ready.map(({ id, title, sourceKind }) => ({ id, title, sourceKind })),
    missing: ids.filter(id => catalog.get(id)?.availability !== "ready"),
    conflicts: [...pins].filter(([, versions]) => versions.size > 1).map(([name, versions]) => ({ name, versions: [...versions] })),
  };
}

export function kitArchive(name, plan, packages) {
  const instructions = [
    "# " + name.replace(/[\r\n]+/g, " "),
    "",
    "Keep this local export private. Each registry file includes its original source and packaged assets.",
    "From a shadcn-configured React project, run one of the commands below for each item you want to install.",
    "Replace the relative path with the path to the unzipped registry file if needed.",
    "Review each package's dependencies, CSS and file targets first. Upstream packages can use the same CSS or file names.",
    "Verify the selected combination in your own consumer. The archive does not install or modify any project.",
    "",
    ...(plan.conflicts.length ? ["## Conflicting dependency pins", ...plan.conflicts.map(({ name, versions }) => "- " + name + " " + versions.join(", ")), ""] : []),
    ...plan.items.flatMap(item => [
      "## " + item.title, item.sourceKind === "html" ? "Standalone HTML with a sandboxed React iframe host." : "React source and its install dependencies.",
      "`npx shadcn@4.23.0 add ./registry/" + item.id + ".json`", "",
    ]),
    ...(plan.missing.length ? ["## Unavailable originals", ...plan.missing.map(id => "- " + id)] : []),
  ].join("\n") + "\n";
  return zip([
    ["README.md", Buffer.from(instructions)],
    ["manifest.json", Buffer.from(JSON.stringify(plan, null, 2) + "\n")],
    ...packages.map(({ id, bytes }) => ["registry/" + id + ".json", bytes]),
  ]);
}

// Entries are short, known filenames. Store exact registry bytes without recompressing assets.
function zip(entries) {
  const body = [];
  const index = [];
  let offset = 0;
  let directorySize = 0;
  for (const [name, bytes] of entries) {
    const filename = Buffer.from(name);
    const checksum = crc32(bytes);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(bytes.length, 18);
    local.writeUInt32LE(bytes.length, 22);
    local.writeUInt16LE(filename.length, 26);
    body.push(local, filename, bytes);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(bytes.length, 20);
    central.writeUInt32LE(bytes.length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt32LE(offset, 42);
    index.push(central, filename);
    offset += local.length + filename.length + bytes.length;
    directorySize += central.length + filename.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directorySize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...body, ...index, end]);
}
