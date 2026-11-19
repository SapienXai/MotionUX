"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Compass, Grid2X2, Layers3, Search, Sun } from "lucide-react";
import {
  appearanceKey,
  buildDraftKey,
  buildSourceIds,
  galleryOrigin,
  isAppearance,
  isGalleryPath,
  type Appearance,
} from "../../../../lib/studio-bridge";
import { sourceRequest } from "./build/source-job";
import type { CompositionComponent } from "./build/component-picker";
import { ProjectSourceHandoff } from "./build/project-source-handoff";
import type { WorkspaceSearch } from "@motionux/build-canvas/workspace";

const discoverSelectionKey = "motionux:discover-selection";

export function StudioChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [appearance, setAppearance] = useState<Appearance | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceSearch | null>(null);
  const [handoff, setHandoff] = useState<CompositionComponent[]>([]);
  const handoffDialog = useRef<HTMLDialogElement>(null);
  const [turkish, setTurkish] = useState(false);
  const t = (english: string, tr: string) => (turkish ? tr : english);
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const update = (event: Event) => setWorkspace((event as CustomEvent<WorkspaceSearch | null>).detail);
    window.addEventListener("motionux:workspace-search", update);
    return () => window.removeEventListener("motionux:workspace-search", update);
  }, []);
  const activeFrame = () =>
    document.querySelector<HTMLIFrameElement>(".studio-discover");
  function sendAppearance(value: Appearance) {
    activeFrame()?.contentWindow?.postMessage(
      { type: "motionux:appearance", value },
      galleryOrigin,
    );
  }
  useEffect(() => {
    const tr = navigator.language.toLowerCase().startsWith("tr");
    setTurkish(tr);
    document.documentElement.lang = tr ? "tr" : "en";
    const initial = document.documentElement.dataset.studioAppearance;
    setAppearance(isAppearance(initial) ? initial : "system");
    function follow(event: StorageEvent) {
      if (event.key === appearanceKey)
        setAppearance(isAppearance(event.newValue) ? event.newValue : "system");
    }
    window.addEventListener("storage", follow);
    return () => window.removeEventListener("storage", follow);
  }, []);
  useEffect(() => {
    function refresh() {
      const url = new URL(location.href);
      if (url.pathname === "/discover") {
        setQuery((url.searchParams.get("q") ?? "").slice(0, 160));
      }

    }
    refresh();
    window.addEventListener("motionux:project", refresh);
    window.addEventListener("popstate", refresh);
    return () => {
      window.removeEventListener("motionux:project", refresh);
      window.removeEventListener("popstate", refresh);
    };
  }, [pathname]);
  useEffect(() => {
    if (!appearance) return;
    const current = appearance;
    document.documentElement.dataset.studioAppearance = current;
    sendAppearance(current);
    function receive(event: MessageEvent) {
      if (
        location.pathname !== "/discover" ||
        event.origin !== galleryOrigin ||
        event.source !== activeFrame()?.contentWindow
      )
        return;
      if (event.data?.type === "motionux:gallery-ready")
        sendAppearance(current);
      if (event.data?.type === "motionux:focus-search") openSearch();
      if (
        event.data?.type === "motionux:gallery-route" &&
        isGalleryPath(event.data.path)
      ) {
        const url = new URL(event.data.path, galleryOrigin);
        setQuery((url.searchParams.get("q") ?? "").slice(0, 160));
        window.history.replaceState(
          window.history.state,
          "",
          "/discover" + url.search,
        );
      }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [appearance, pathname]);
  useEffect(() => {
    if (pathname !== "/discover") return;
    const controller = new AbortController();
    let catalog: Promise<Map<string, CompositionComponent>> | undefined;
    async function receiveBuildSelection(event: MessageEvent) {
      const frame = activeFrame()?.contentWindow;
      if (!frame || event.origin !== galleryOrigin || event.source !== frame ||
        location.pathname !== "/discover") return;
      if (event.data?.type === "motionux:build-catalog-request") {
        catalog ??= sourceRequest<CompositionComponent[]>("/source-jobs/components", "GET", undefined, controller.signal)
          .then((rows) => new Map(rows.filter(({ mode }) => mode !== "reference").map((row) => [row.id, row])));
        try {
          const entries = await catalog;
          if (controller.signal.aborted || activeFrame()?.contentWindow !== frame) return;
          let draft: string[] = [];
          try {
            const previous = JSON.parse(sessionStorage.getItem(discoverSelectionKey) ?? "null");
            draft = (previous?.search === location.search ? buildSourceIds(previous.ids) : undefined) ??
              buildSourceIds(JSON.parse(sessionStorage.getItem(buildDraftKey) ?? "null")?.kit) ?? [];
          } catch { /* A new selection remains available. */ }
          frame.postMessage({
            type: "motionux:build-catalog",
            entries: [...entries.values()].map(({ id, mode }) => [id, mode]),
            selected: draft,
          }, galleryOrigin);
        } catch {
          catalog = undefined;
          if (!controller.signal.aborted) frame.postMessage({ type: "motionux:build-catalog-unavailable" }, galleryOrigin);
        }
      }
      const message = event.data?.type;
      if ((message === "motionux:build-selection" || message === "motionux:choose-project") && catalog) {
        const ids = buildSourceIds(event.data.ids);
        if (!ids?.length) return;
        const entries = await catalog.catch(() => undefined);
        const selected = ids.flatMap((id) => entries?.get(id) ?? []);
        if (controller.signal.aborted || activeFrame()?.contentWindow !== frame || selected.length !== ids.length) return;
        try {
          sessionStorage.setItem(discoverSelectionKey, JSON.stringify({ search: location.search, ids }));
        } catch { /* The current frame keeps its selection. */ }
        if (message === "motionux:choose-project") {
          const dialog = handoffDialog.current;
          if (!dialog || dialog.open) return;
          setHandoff(selected);
          dialog.showModal();
          return;
        }
        const params = new URLSearchParams({ fromGallery: "1" });
        ids.forEach((id) => params.append("source", id));
        router.push("/build?" + params);
      }
    }
    window.addEventListener("message", receiveBuildSelection);
    return () => {
      controller.abort();
      window.removeEventListener("message", receiveBuildSelection);
    };
  }, [pathname, router]);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        document.querySelector("dialog[open]")
      )
        return;
      if (
        (event.key === "k" && (event.metaKey || event.ctrlKey)) ||
        (event.key === "/" &&
          !event.metaKey &&
          !event.ctrlKey &&
          !(
            event.target instanceof Element &&
            event.target.closest("input,textarea,select,[contenteditable]")
          ))
      ) {
        event.preventDefault();
        openSearch();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  function openSearch() {
    setSearchOpen(true);
    requestAnimationFrame(() => search.current?.focus());
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    setSearchOpen(false);
    const value = query.trim();
    const match = value && workspace?.pages.find(({ route, title }) =>
      route.toLowerCase() === value.toLowerCase() || title.toLowerCase() === value.toLowerCase());
    if (match) { workspace?.navigate(match.route); setQuery(""); return; }
    const frame = activeFrame();
    if (pathname === "/discover" && frame?.contentWindow) {
      frame.contentWindow.postMessage(
        { type: "motionux:search", query: value },
        galleryOrigin,
      );
    } else if (canLeave())
      router.push(
        "/discover" + (value ? "?q=" + encodeURIComponent(value) : ""),
      );
  }
  function canLeave() {
    return window.dispatchEvent(
      new Event("motionux:before-leave", { cancelable: true }),
    );
  }
  const filter = query.trim() ? "q=" + encodeURIComponent(query.trim()) : "";
  const discover = pathname === "/discover";
  const pageMatches = query.trim() && workspace?.pages.filter(({ title, route }) =>
    (title + " " + route).toLowerCase().includes(query.toLowerCase().trim())).slice(0, 6);
  return (
    <>
      <a className="studio-skip" href="#workspace-content">
        {t("Skip to workspace", "Çalışma alanına geç")}
      </a>
      <header className="studio-home-nav studio-chrome kinetic-chrome" data-search={searchOpen}>
        <Link
          href="/"
          onNavigate={(event) => {
            if (!canLeave()) event.preventDefault();
          }}
          className="build-brand"
          aria-label={t("MotionUX Studio home", "MotionUX Studio ana sayfası")}
        >
          <span className="build-mark">
            <Layers3 size={17} aria-hidden="true" />
          </span>
          <span>MotionUX</span>
        </Link>
        <nav aria-label={t("Studio navigation", "Studio gezinme")}>
          <Link href="/" prefetch={false}
            onNavigate={(event) => { if (!canLeave()) event.preventDefault(); }}
            aria-current={!discover ? "page" : undefined}>
            <Grid2X2 className="kinetic-nav-icon" size={16} aria-hidden="true" />
            <span>{t("Projects", "Projeler")}</span>
          </Link>
          <Link href={"/discover" + (filter ? "?" + filter : "")} prefetch={false}
            onNavigate={(event) => { if (!canLeave()) event.preventDefault(); }}
            aria-current={discover ? "page" : undefined}>
            <Compass className="kinetic-nav-icon" size={16} aria-hidden="true" />
            <span>{t("Discover", "Keşfet")}</span>
          </Link>
        </nav>
        <button type="button" className="kinetic-icon kinetic-search-toggle" aria-label={t("Search components", "Bileşenleri ara")}
          aria-expanded={searchOpen} onClick={() => searchOpen ? setSearchOpen(false) : openSearch()}><Search size={16} aria-hidden="true" /></button>
        <form
          className="studio-search"
          role="search"
          action="/discover"
          onSubmit={submit}
        >
          <label htmlFor="studio-search" className="build-sr">
            {workspace ? t("Search pages and components", "Sayfa ve bileşen ara") : t("Search components", "Bileşenleri ara")}
          </label>
          <input
            ref={search}
            type="search"
            id="studio-search"
            name="q"
            placeholder={workspace ? t("Search pages and components…", "Sayfa ve bileşen ara…") : t("Search components…", "Bileşenleri ara…")}
            value={query}
            maxLength={160}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") { setSearchOpen(false); search.current?.blur(); }
            }}
          />
          <kbd aria-hidden="true">⌘ / Ctrl K</kbd>
          <button
            type="submit"
            className="build-icon"
            aria-label={t("Search", "Ara")}
          >
            <Search size={16} aria-hidden="true" />
          </button>
          {searchOpen && pageMatches && pageMatches.length > 0 && <ul className="unified-search-pages"
            aria-label={t("Matching project pages", "Eşleşen proje sayfaları")}>
            {pageMatches.map(({ route, title }) => <li key={route}><button type="button" onClick={() => {
              workspace?.navigate(route); setQuery(""); setSearchOpen(false); search.current?.blur();
            }}><span dir="auto">{title}</span><small>{route}</small></button></li>)}
          </ul>}
        </form>
        <div className="studio-appearance">
          <Sun className="kinetic-theme-icon" size={16} aria-hidden="true" />
          <label htmlFor="studio-appearance" className="build-sr">
            {t("Studio theme", "Studio teması")}
          </label>
          <select
            id="studio-appearance"
            value={appearance ?? "system"}
            onChange={(event) => {
              const next = event.target.value;
              if (!isAppearance(next)) return;
              setAppearance(next);
              try {
                if (next === "system") localStorage.removeItem(appearanceKey);
                else localStorage.setItem(appearanceKey, next);
              } catch {
                /* The current tab still applies the selection. */
              }
            }}
          >
            <option value="system">{t("System", "Sistem")}</option>
            <option value="light">{t("Light", "Açık")}</option>
            <option value="dark">{t("Dark", "Koyu")}</option>
          </select>
        </div>
      </header>
      <div id="workspace-content" tabIndex={-1} className="studio-content">
        {children}
      </div>
      {discover && <ProjectSourceHandoff dialog={handoffDialog} selected={handoff} onDismiss={() => {
        setHandoff([]);
        activeFrame()?.contentWindow?.postMessage({ type: "motionux:project-picker-closed" }, galleryOrigin);
      }} onOpen={(id, sources) => {
        const params = new URLSearchParams({ project: id });
        sources.forEach((source) => params.append("attach", source));
        window.location.assign("/build?" + params);
      }} />}
    </>
  );
}
