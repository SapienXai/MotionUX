import { useReducedMotion } from "motion/react";
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { references } from "../catalog";
import { FEATURED, hrefFor, readRoute, visibleItems, type Route } from "./catalog-view";
import { Gallery } from "./gallery";
import { Components, Examples, Guides } from "./pages";
import { PreviewLoading } from "./preview";
import { Shell } from "./shell";
import { useLocalSources } from "../sources/local";

const Playground = lazy(() => import("./playground"));
const SourceLab = lazy(() => import("../sources/lab"));
const schemePreference = "(prefers-color-scheme: dark)";
function savedScheme(): "light" | "dark" | undefined {
  const saved = document.documentElement.dataset.mxScheme;
  return saved === "dark" || saved === "light" ? saved : undefined;
}

function subscribeToScheme(onChange: () => void) {
  const media = matchMedia(schemePreference);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function systemUsesDarkScheme() {
  return matchMedia(schemePreference).matches;
}

export default function Studio() {
  const [route, setRoute] = useState(readRoute);
  const [schemeOverride, setSchemeOverride] = useState(savedScheme);
  const systemDark = useSyncExternalStore(subscribeToScheme, systemUsesDarkScheme);
  const scheme = schemeOverride ?? (systemDark ? "dark" : "light");
  const [lastItem, setLastItem] = useState(route.item);
  const [entered, setEntered] = useState(false);
  const focus = useRef<"none" | "heading" | "gallery">("none");
  const scroll = useRef(0);
  const selectedCard = useRef("");
  const platformReduced = useReducedMotion() === true;
  const item = references.find(entry => entry.id === route.item);
  const items = visibleItems(route);
  const originals = useLocalSources();
  function navigate(next: Route, replace = false) {
    if (route.page === "gallery" && next.page === "playground") { scroll.current = window.scrollY; selectedCard.current = next.item; }
    const href = hrefFor(next);
    if (hrefFor(route) !== href) history[replace ? "replaceState" : "pushState"](null, "", href);
    if (next.item) setLastItem(next.item);
    if (!replace) setEntered(route.page !== next.page);
    if (!replace) focus.current = next.page === "gallery" && route.page === "playground" ? "gallery" : "heading";
    setRoute(next);
  }
  useEffect(() => {
    function pop() {
      const next = readRoute();
      focus.current = next.page === "gallery" ? "gallery" : "heading";
      setEntered(false);
      setRoute(next);
      if (next.item) setLastItem(next.item);
    }
    window.addEventListener("popstate", pop);
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => { window.removeEventListener("popstate", pop); history.scrollRestoration = previous; };
  }, []);
  useLayoutEffect(() => {
    const target = focus.current;
    focus.current = "none";
    if (target === "heading") {
      window.scrollTo(0, 0);
      const heading = document.querySelector<HTMLElement>("#studio-main h1");
      (heading ?? document.getElementById("studio-main"))?.focus({ preventScroll: true });
    } else if (target === "gallery") {
      window.scrollTo(0, scroll.current);
      const link = document.querySelector<HTMLElement>(`[data-card="${CSS.escape(selectedCard.current)}"] .mx-open-playground`);
      (link ?? document.querySelector<HTMLElement>("#studio-main h1"))?.focus({ preventScroll: true });
    }
  }, [route]);
  function setQuery(query: string) {
    const page = route.page === "components" || route.page === "sources" ? route.page : "gallery";
    navigate({ ...route, query, page, item: "", source: undefined }, true);
  }
  function toggleScheme() {
    const next = scheme === "light" ? "dark" : "light";
    document.documentElement.dataset.mxScheme = next;
    try { localStorage.setItem("mx-studio-scheme", next); } catch { /* session-only preference */ }
    setSchemeOverride(next);
  }
  const open = (id: string, configuration?: string, panel?: Route["panel"]) => navigate({ ...route, page: "playground", item: id, configuration, panel, preset: true });
  const openSource = (id: string, sourcePanel?: Route["sourcePanel"]) => navigate({ page: "sources", item: "", category: "", query: "", source: id, sourcePanel });
  const clear = () => navigate({ ...route, query: "", category: "", item: "" });
  return <div className="mx-studio" data-scheme={scheme}>
    <Shell route={route} navigate={navigate} updateQuery={setQuery} scheme={scheme} toggleScheme={toggleScheme} reduced={platformReduced} lastItem={lastItem}>
      <div className={`mx-view mx-view-${route.page}`} key={route.page} data-entering={entered || undefined}>
        {route.page === "gallery" ? <Gallery items={items} originals={originals} openSource={openSource} route={route} open={open} reduced={platformReduced} clear={clear} scheme={scheme} selectCategory={category => navigate({ ...route, category })} /> :
          route.page === "components" ? <Components items={items} route={route} open={open} clear={clear} /> :
          route.page === "guides" ? <Guides /> : route.page === "examples" ? <Examples route={route} open={open} /> :
          route.page === "sources" ? <Suspense fallback={<PreviewLoading />}><SourceLab originals={originals} route={route} scheme={scheme} navigate={navigate} /></Suspense> :
          item ? <Suspense fallback={<PreviewLoading />}><Playground key={item.id} item={item} route={route}
            back={() => navigate({ ...route, page: "gallery", item: "" })} reduced={platformReduced} systemReduced={platformReduced} scheme={scheme} /></Suspense> :
          <section className="mx-inner-page"><h1 tabIndex={-1}>Specimen unavailable</h1><button className="mx-button" type="button" onClick={() => open(FEATURED[0][0])}>Open Sliding Tab Pill</button></section>}
      </div>
    </Shell>
  </div>;
}
