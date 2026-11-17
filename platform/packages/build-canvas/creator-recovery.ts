import {
  draftSchema,
  isBlockGroup,
  type CreatorDraft,
  type BuildPage,
} from "@motionux/build-core";

const key = (project: string) => "motionux-build-draft-v1:" + project;

export function readLocalDraft(project: string): CreatorDraft | null {
  try {
    const encoded = localStorage.getItem(key(project));
    if (!encoded || encoded.length > 192 * 1024) return null;
    const decoded = draftSchema.safeParse(JSON.parse(encoded));
    return decoded.success ? decoded.data : null;
  } catch {
    return null;
  }
}

export function writeLocalDraft(project: string, encoded: string) {
  try {
    localStorage.setItem(key(project), encoded);
    return true;
  } catch {
    return false;
  }
}

export function selectBlock(page: BuildPage, selected: string | null) {
  if (!selected) return null;
  const index = page.blocks.findIndex(({ id }) => id === selected);
  if (index >= 0) return { index };
  for (const block of page.blocks) {
    if (!isBlockGroup(block.type)) continue;
    const index = block.children?.findIndex(({ id }) => id === selected) ?? -1;
    if (index >= 0) return { index, zone: block.id + ":items" };
  }
  return null;
}
