import { notFound } from "next/navigation";
import { AppScreen } from "../../runtime/screen";
import { project } from "../../runtime/project";

export const dynamicParams = false;
export function generateStaticParams() {
  return project.document.pages.map((page) => ({
    route: page.route === "/" ? [] : [page.route.slice(1)],
  }));
}
type Props = { params: Promise<{ route?: string[] }> };
export async function generateMetadata({ params }: Props) {
  const path = "/" + ((await params).route ?? []).join("/");
  return {
    title:
      project.document.pages.find((page) => page.route === path)?.title ??
      "Page unavailable",
  };
}
export default async function Page({ params }: Props) {
  const path = "/" + ((await params).route ?? []).join("/");
  const page = project.document.pages.find((page) => page.route === path);
  if (!page) notFound();
  return <AppScreen id={project.id} revision={project.revision} document={project.document} page={page} />;
}
