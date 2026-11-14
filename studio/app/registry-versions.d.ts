declare module "virtual:motionux-registry-versions" {
  type Version = { item: string; pin: string | null };
  const versions: Record<string, { selected: Version; base: Version | null; recipe: Version | null } | undefined>;
  export default versions;
}
