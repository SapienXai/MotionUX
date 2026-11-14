import { readFileSync, writeFileSync } from "node:fs";

const inventory = JSON.parse(readFileSync("metadata/reference-inventory.json", "utf8"));
const rows = inventory.items.map((item) => {
  const reference = `[${item.name}](${item.referencePreview})`;
  const provider = `[${item.provider}](${item.sourceUrl})`;
  const check = item.test ? `[Test](../${item.test})` : "—";
  const preview = item.preview ? `[${item.registryItem}](${item.preview})` : `\`${item.registryItem}\``;
  const evidence = item.evidence ? `[Evidence](../${item.evidence})` : "—";
  return `| ${item.order} | ${reference} | ${provider} | ${item.category} | ${item.interaction} | ${item.id} | ${preview} | ${item.version ?? "—"} · ${item.status} | ${check} · ${evidence} |`;
});
writeFileSync("docs/REFERENCE-INVENTORY.md", [
  "# Reference inventory",
  "",
  `Checked ${inventory.checked} against [the live catalog](${inventory.reference}). The 81 brief references remain in scope. Pagination dots is the additional live reference.`,
  "",
  "The per-file license of upstream implementations has not been established for these references. The default decision is independent implementation without copying upstream code or assets. A verified adaptation must record its exact file, revision and license before code is taken. A reference URL identifies the catalog preview when the source has no stable individual URL.",
  "",
  "| # | Live reference | Provider | Category | Interaction | Source ID | MotionUX | Version and status | Verification |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...rows,
  "",
].join("\n"));
