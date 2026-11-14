declare module "virtual:motionux-registry-versions" {
  const versions: Record<string, { item: string; pin: string | null } | undefined>;
  export default versions;
}
