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
import { Layers3, Search } from "lucide-react";
import {
  appearanceKey,
  galleryOrigin,
  isAppearance,
  isBuildPath,
  isGalleryPath,
  projectPathKey,
  type Appearance,
} from "../../../../lib/studio-bridge";

export function StudioChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [appearance, setAppearance] = useState<Appearance | null>(null);
  const [resume, setResume] = useState("/build");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("");
  const [turkish, setTurkish] = useState(false);
  const t = (english: string, tr: string) => (turkish ? tr : english);
  const search = useRef<HTMLInputElement>(null);
  const activeFrame = () =>
    document.querySelector<HTMLIFrameElement>(".studio-discover");
  function sendAppearance(value: Appearance) {
    activeFrame()?.contentWindow?.postMessage(
      { type: "motionux:appearance", value },
      galleryOrigin,
    );
  }
  useEffect(() => {
    setTurkish(navigator.language.toLowerCase().startsWith("tr"));
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
        setView(url.searchParams.get("view") ?? "");
      }
      try {
        const path = sessionStorage.getItem(projectPathKey);
        if (isBuildPath(path)) setResume(path);
      } catch {
        /* The default Build link remains available. */
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
      if (event.data?.type === "motionux:focus-search") search.current?.focus();
      if (
        event.data?.type === "motionux:gallery-route" &&
        isGalleryPath(event.data.path)
      ) {
        const url = new URL(event.data.path, galleryOrigin);
        setView(url.searchParams.get("view") ?? "");
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
        search.current?.focus();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
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
  const gallery = pathname === "/discover" && view !== "library";
  const library = pathname === "/discover" && view === "library";
  return (
    <>
      <a className="studio-skip" href="#workspace-content">
        {t("Skip to workspace", "Çalışma alanına geç")}
      </a>
      <header className="studio-home-nav studio-chrome">
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
          <Link
            href={"/discover" + (filter ? "?" + filter : "")}
            prefetch={false}
            onNavigate={(event) => {
              if (!canLeave()) event.preventDefault();
            }}
            aria-current={gallery ? "page" : undefined}
          >
            {t("Gallery", "Galeri")}
          </Link>
          <Link
            href={"/discover?view=library" + (filter ? "&" + filter : "")}
            prefetch={false}
            onNavigate={(event) => {
              if (!canLeave()) event.preventDefault();
            }}
            aria-current={library ? "page" : undefined}
          >
            {t("My Library", "Kitaplığım")}
          </Link>
          <Link
            href={resume}
            prefetch={false}
            aria-current={pathname === "/build" ? "page" : undefined}
          >
            {t("Build", "Oluştur")}
          </Link>
        </nav>
        <form
          className="studio-search"
          role="search"
          action="/discover"
          onSubmit={submit}
        >
          <label htmlFor="studio-search" className="build-sr">
            {t("Search components", "Bileşenleri ara")}
          </label>
          <input
            ref={search}
            type="search"
            id="studio-search"
            name="q"
            placeholder={t("Search components…", "Bileşenleri ara…")}
            value={query}
            maxLength={160}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") search.current?.blur();
            }}
          />
          <button
            type="submit"
            className="build-icon"
            aria-label={t("Search", "Ara")}
          >
            <Search size={16} aria-hidden="true" />
          </button>
        </form>
        <div className="studio-appearance">
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
    </>
  );
}
