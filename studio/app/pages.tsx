import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import { type Reference } from "../catalog";
import { FEATURED, hrefFor, presentation, repoURL, type Route } from "./catalog-view";
import { Empty } from "./gallery";
import { intercept } from "./shell";

export function Components({ items, route, open, clear }: { items: Reference[]; route: Route; open: (id: string) => void; clear: () => void }) {
  return <section className="mx-inner-page"><h1 tabIndex={-1}>Components</h1><p>Browse registry entries, review their sources, and copy a pinned install command.</p>
    <p role="status">{items.length} components</p>
    {items.length ? <ul className="mx-directory">{items.map(item => <li key={item.id}>
      <a href={hrefFor({ ...route, page: "playground", item: item.id })} onClick={event => intercept(event, () => open(item.id))}>
        <strong>{presentation(item).title}</strong><code>{item.registryItem}</code><span>{item.provider} · Studio preview</span><ArrowRight size={17} />
      </a></li>)}</ul> : <Empty clear={clear}>Try a name, provider, or category.</Empty>}
  </section>;
}
export function Guides() {
  return <section className="mx-inner-page"><h1 tabIndex={-1}>Get started with MotionUX</h1><p>Install component source directly from the GitHub shadcn registry.</p>
    <ol className="mx-guide-steps">
      <li><h2>Use an existing React project</h2><p>Start in a React 19 project with a shadcn <code>components.json</code>. Use the project's configured component alias.</p></li>
      <li><h2>Install a stable component</h2><pre><code>npx shadcn@4.23.0 add 'SapienXai/MotionUX/motion-disclosure#v1.0.0'</code></pre></li>
      <li><h2>Try a Studio preview</h2><p>Open a Playground, select Install, and copy its commit-pinned command. Select Usage to copy the React example.</p></li>
    </ol>
    <div className="mx-links"><a href={`${repoURL}#readme`}><BookOpen size={17} /> Installation and examples</a>
      <a href={`${repoURL}/blob/main/docs/MOTION-TOKENS.md`}>Theme and motion tokens <ExternalLink size={15} /></a></div>
  </section>;
}
export function Examples({ route, open }: { route: Route; open: (id: string) => void }) {
  return <section className="mx-inner-page"><h1 tabIndex={-1}>Examples</h1><p>Try these interaction examples in the Playground or run the tagged v1 demos.</p>
    <ul className="mx-directory">{FEATURED.map(([id, title, description]) => <li key={id}>
      <a href={hrefFor({ ...route, page: "playground", item: id })} onClick={event => intercept(event, () => open(id))}>
        <strong>{title}</strong><span>{description}</span><ArrowRight size={17} /></a></li>)}</ul>
    <a className="mx-button" href="?legacy=1">Open the v1 demos <ArrowRight size={17} /></a>
  </section>;
}
