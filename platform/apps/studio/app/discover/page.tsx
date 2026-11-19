import type { Metadata } from "next";
import { GalleryFrame } from "./gallery-frame";

export const metadata: Metadata = { title: "Gallery and Library" };
export const dynamic = "force-dynamic";

const gallery = "http://127.0.0.1:5199/";

export default async function Discover({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const url = new URL(gallery);
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string" && value.length < 4096)
      url.searchParams.set(key, value);
  }
  const ready = await fetch(gallery, {
    cache: "no-store",
    signal: AbortSignal.timeout(1500),
    redirect: "error",
  }).then(
    async (response) => {
      await response.body?.cancel();
      return response.ok && response.headers.get("x-motionux-studio") === "v11";
    },
    () => false,
  );
  if (!ready)
    return (
      <main className="studio-home">
        <h1>Gallery is offline</h1>
        <p>
          Start the local Studio with its prepared originals, then reopen this
          page.
        </p>
        <a href="/build">Open Build</a>
      </main>
    );
  return <GalleryFrame src={url.href} />;
}
