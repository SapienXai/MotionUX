import { useReducedMotion } from "motion/react";
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { references } from "../catalog";
import { FEATURED, hrefFor, readRoute, visibleItems, type Route } from "./catalog-view";
import { Gallery } from "./gallery";
import { Components, Examples, Guides } from "./pages";
import { PreviewLoading } from "./preview";
import { Shell } from "./shell";
import { localStudio, useLocalSources } from "../sources/local";
import { LibraryStore } from "../library/store";
import { LibraryFeedback } from "../library/actions";
import "../library/library.css";
import { OriginalsGallery } from "../sources/gallery";

const LibraryView = lazy(() => import("../library/view"));
const Playground = lazy(() => import("./playground"));
const SourceDetail = lazy(() => import("../sources/lab"));
const Discovery = lazy(() => import("../sources/lab").then(module => ({ default: module.Discovery })));
const Unavailable = lazy(() => import("../sources/lab").then(module => ({ default: module.Unavailable })));
function initialRoute() {
  const route = readRoute();
  if (localStudio && route.page === "sources" && route.source) {
    return { ...route, page: "playground" as const, item: route.source, compare: true };
  }
  return route;
}
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
  return <LibraryStore><StudioRoutes /></LibraryStore>;
}

function StudioRoutes() {
  const [route, setRoute] = useState(initialRoute);
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
  const local = useLocalSources();
  const { originals } = local;
  const originalId = localStudio && !route.collection && route.page === "playground" ? route.item : "";
  const originalCount = localStudio ? [...originals.values()].filter(item => item.availability === "ready").length : undefined;
  const title = originals.get(originalId)?.title;
  useEffect(() => {
    document.title = title ? `${title} | MotionUX Studio` : route.page === "sources" ? "Discovery | MotionUX Studio" : "MotionUX Studio";
  }, [route.page, title]);
  function navigate(next: Route, replace = false) {
    if ((route.page === "gallery" || route.page === "library") && next.page === "playground") {
      scroll.current = window.scrollY;
      selectedCard.current = next.item;
      history.replaceState({ galleryScroll: scroll.current, galleryCard: selectedCard.current }, "", location.href);
    }
    const href = hrefFor(next);
    if (hrefFor(route) !== href) history[replace ? "replaceState" : "pushState"](null, "", href);
    if (next.item) setLastItem(next.item);
    if (!replace) setEntered(route.page !== next.page);
    if (!replace && (next.page !== route.page || next.shelf !== route.shelf || next.collection !== route.collection)) {
      focus.current = (next.page === "gallery" || next.page === "library") && route.page === "playground" ? "gallery" : "heading";
    }
    setRoute(next);
  }
  useEffect(() => {
    function pop(event: PopStateEvent) {
      const next = initialRoute();
      if (next.page === "gallery" || next.page === "library") {
        scroll.current = event.state?.galleryScroll ?? 0;
        selectedCard.current = event.state?.galleryCard ?? "";
      }
      focus.current = next.page === "gallery" || next.page === "library" ? "gallery" : "heading";
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
    const page = route.page === "components" || route.page === "sources" || route.page === "library" ? route.page : "gallery";
    navigate({ ...route, query, page, item: "", source: undefined, sourcePanel: undefined, compare: false }, page === route.page);
    if (page === "gallery") window.scrollTo(0, 0);
  }
  function toggleScheme() {
    const next = scheme === "light" ? "dark" : "light";
    document.documentElement.dataset.mxScheme = next;
    try { localStorage.setItem("mx-studio-scheme", next); } catch { /* session-only preference */ }
    setSchemeOverride(next);
  }
  const open = (id: string, configuration?: string, panel?: Route["panel"]) => navigate({ ...route, page: "playground", item: id, configuration, panel, preset: true });
  const clear = () => navigate({ ...route, query: "", category: "", item: "" });
  const back = () => navigate({ ...route, page: route.fromLibrary ? "library" : "gallery", item: "", source: undefined, sourcePanel: undefined, panel: undefined, compare: false, fromLibrary: false });
  return <div className="mx-studio" data-scheme={scheme}>
    <Shell route={route} navigate={navigate} updateQuery={setQuery} scheme={scheme} toggleScheme={toggleScheme} reduced={platformReduced}
      lastItem={lastItem} originalCount={originalCount}>
      {!localStudio && <p className="mx-public-shell">Legacy/public shell — launch <code>npm run studio</code> to see original sources.</p>}
      {localStudio && route.page !== "library" && <div className="mx-library-toast"><LibraryFeedback /></div>}
      <div className={`mx-view mx-view-${route.page}`} key={route.page} data-entering={entered || undefined}>
        {route.page === "gallery" ? localStudio && !route.collection
          ? <OriginalsGallery {...local} route={route} scheme={scheme} navigate={navigate} />
          : <Gallery items={items} route={route} open={open} reduced={platformReduced} clear={clear} scheme={scheme} selectCategory={category => navigate({ ...route, category })} /> :
          route.page === "library" && localStudio ? <Suspense fallback={<section className="mx-inner-page"><h1 tabIndex={-1}>My Library</h1><p role="status">Loading saved originals…</p></section>}>
            <LibraryView originals={originals} route={route} navigate={navigate} />
          </Suspense> :
          route.page === "components" ? <Components items={items} route={route} open={open} clear={clear} /> :
          route.page === "guides" ? <Guides /> : route.page === "examples" ? <Examples route={route} open={open} /> :
          route.page === "sources" ? <Suspense fallback={<PreviewLoading />}>
            {route.source ? <Unavailable id={route.source} back={back} /> : <Discovery originals={originals} route={route} />}
          </Suspense> :
          originalId ? <Suspense fallback={<section className="mx-inner-page"><h1 tabIndex={-1} className="mx-sr">Source Playground</h1><p role="status">Loading source Playground…</p></section>}>
            <SourceDetail key={originalId} id={originalId} route={route} scheme={scheme} back={back} navigate={navigate} />
          </Suspense> :
          item ? <Suspense fallback={<PreviewLoading />}><Playground key={item.id} item={item} route={route}
            back={back} reduced={platformReduced} systemReduced={platformReduced} scheme={scheme} /></Suspense> :
          <section className="mx-inner-page"><h1 tabIndex={-1}>Specimen unavailable</h1><button className="mx-button" type="button" onClick={() => open(FEATURED[0][0])}>Open Sliding Tab Pill</button></section>}
      </div>
    </Shell>
  </div>;
}
