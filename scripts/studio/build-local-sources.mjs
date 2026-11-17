const reactBits = "https://github.com/DavidHDev/react-bits";
const animateUi = "https://github.com/imskyleen/animate-ui";
const slug = /^[a-z0-9-]{1,96}$/;

export function localBuildSource(entry) {
  if (entry?.availability !== "ready" || !/^[a-f0-9]{64}$/.test(entry.upstreamHash) ||
    typeof entry.id !== "string" || typeof entry.slug !== "string" || !slug.test(entry.id) || !slug.test(entry.slug)) return false;
  if (entry.group === "designbookmark") {
    return entry.id.startsWith("designbookmark-") && /^https:\/\/designbookmark\.com\/motion-src\/code\/db-[a-z0-9-]+\.txt$/.test(entry.sourceURL) &&
      (entry.sourceKind === "html" || entry.id === "designbookmark-command-button");
  }
  return entry.sourceKind === "react" &&
    (entry.id.startsWith("reactbits-") && entry.repo === reactBits && (entry.group === "reactbits" || /^v1[34]-reactbits-[a-f0-9]{16}$/.test(entry.group)) &&
        entry.upstreamCommit === "cf2801031f07f53d4684e65b961bde7c2e2a6921" ||
      entry.id.startsWith("animateui-") && entry.repo === animateUi && /^v1[34]-animateui-[a-f0-9]{16}$/.test(entry.group) &&
        entry.upstreamCommit === "22a9236ae107328f8564edb7e3299375da3247af");
}
