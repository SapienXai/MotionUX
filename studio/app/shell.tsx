import { ArrowRight, BookOpen, Bookmark, ChevronDown, CodeXml, Compass, CreditCard, Grid2X2, Hand, Layers3, Menu, Moon, MousePointer2, Search, Sparkle, SquareStack, Sun, Type, X, Zap, Headphones } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { catalogCounts, categories, FEATURED, hrefFor, repoURL, type Category, type Route } from "./catalog-view";
import { references } from "../catalog";

type Navigate = (route: Route) => void;
const nav = [
  ["gallery", "Gallery", Grid2X2], ["playground", "Playground", CodeXml], ["components", "Components", Layers3],
  ["guides", "Guides", BookOpen], ["examples", "Examples", Bookmark],
] as const;
const categoryIcons = { Navigation: Compass, Buttons: MousePointer2, Cards: SquareStack, Inputs: CreditCard, Gestures: Hand, Feedback: Zap, Typography: Type, AI: Sparkle, Media: Headphones };

export function intercept(event: MouseEvent<HTMLAnchorElement>, action: () => void) {
  if (event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  event.preventDefault();
  action();
}
function Brand({ route, navigate }: { route: Route; navigate: Navigate }) {
  const home: Route = { ...route, page: "gallery", item: "", category: "", query: "" };
  return <a className="mx-brand" href={hrefFor(home)} aria-label="MotionUX Studio home" onClick={event => intercept(event, () => navigate(home))}>
    <svg viewBox="0 0 57 42" width="56" height="42" aria-hidden="true">
      <path fill="#fa7975" d="M7 35c-4-3-4-8-1-12L23 5c4-4 10-4 13 0 3 3 3 8 0 11L19 35c-3 4-9 4-12 0Z"/>
      <path fill="#f76868" d="M25 35c-4-3-4-8-1-12L41 5c4-4 10-4 13 0 3 3 3 8 0 11L37 35c-3 4-9 4-12 0Z"/>
      <path fill="#e95657" fillOpacity=".56" d="m22 25 12-13-5 15c-1 3-4 4-6 2-1-1-1-3-1-4Z"/>
    </svg><span><strong>MotionUX</strong><small>Studio</small></span>
  </a>;
}

function Sidebar({ route, navigate, lastItem, reduced, mobile, close }: { route: Route; navigate: Navigate; lastItem: string; reduced: boolean; mobile?: boolean; close?: () => void }) {
  const [more, setMore] = useState(false);
  const primaryCategory = categories.slice(0, 6);
  const selectedSecondary = categories.slice(6).some(name => route.category === name.toLowerCase());
  const active = (key: string) => !reduced && <motion.span aria-hidden="true" className="mx-active-indicator" layoutId={key} initial={false}
    transition={{ type: "spring", stiffness: 440, damping: 36, mass: .8 }} />;
  const mark = (category: Category | "") => {
    const id = category.toLowerCase();
    const selected = (route.page === "gallery" || route.page === "components") && route.category === id;
    const next: Route = { ...route, page: route.page === "components" ? "components" : "gallery", item: "", category: id };
    const Icon = category ? categoryIcons[category] : Grid2X2;
    return <a key={category} className="mx-side-row" href={hrefFor(next)} aria-current={selected ? "true" : undefined}
      onClick={event => intercept(event, () => navigate(next))}>
      {selected && active("category")}<Icon size={20} aria-hidden="true" /><span>{category || "All components"}</span>
      <span className="mx-count">{category ? catalogCounts[category] : references.length}</span>
    </a>;
  };
  const guide: Route = { ...route, page: "guides", item: "" };
  return <LayoutGroup id={mobile ? "drawer" : "sidebar"}>
    <div className="mx-side-brand"><Brand route={route} navigate={navigate} />{mobile && <button type="button" aria-label="Close menu" className="mx-icon" onClick={close} autoFocus><X size={21} /></button>}</div>
    <div className="mx-side-scroll">
      <nav className="mx-side-nav" aria-label="Studio">
        {nav.map(([page, text, Icon]) => {
          const current = route.page === page;
          const next: Route = { ...route, page, item: page === "playground" ? lastItem || FEATURED[0][0] : "" };
          return <a key={page} href={hrefFor(next)} className="mx-side-row" aria-current={current ? "page" : undefined}
            onClick={event => intercept(event, () => navigate(next))}>{current && active("section")}<Icon size={20} aria-hidden="true" /><span>{text}</span></a>;
        })}
      </nav>
      <nav className="mx-side-categories" aria-label="Categories">
        <h2>Categories</h2>
        {["" as const, ...primaryCategory].map(mark)}
        <button className="mx-more" type="button" aria-expanded={more || selectedSecondary} onClick={() => setMore(!more)}>
          More categories <ChevronDown size={14} aria-hidden="true" />
        </button>
        {(more || selectedSecondary) && categories.slice(6).map(mark)}
      </nav>
    </div>
    <section className="mx-promo"><Sparkle size={31} aria-hidden="true" /><h2>Use MotionUX<br/>in your project</h2>
      <p>Install the components, copy the code, and build beautiful interfaces faster.</p>
      <a href={hrefFor(guide)} onClick={event => intercept(event, () => navigate(guide))}>Get started <ArrowRight size={18} aria-hidden="true" /></a>
    </section>
  </LayoutGroup>;
}

export function Shell({ route, navigate, updateQuery, scheme, toggleScheme, reduced, lastItem, children }: {
  route: Route; navigate: Navigate; updateQuery: (query: string) => void; scheme: "light" | "dark"; toggleScheme: () => void;
  reduced: boolean; lastItem: string; children: ReactNode;
}) {
  const drawer = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  const searchOrigin = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k" || event.isComposing || drawer.current?.open) return;
      event.preventDefault();
      searchOrigin.current = document.activeElement as HTMLElement | null;
      input.current?.focus();
      input.current?.select();
    }
    const wide = matchMedia("(min-width: 1200px)");
    const dismissDrawer = () => { if (wide.matches) drawer.current?.close(); };
    window.addEventListener("keydown", key);
    wide.addEventListener("change", dismissDrawer);
    return () => { window.removeEventListener("keydown", key); wide.removeEventListener("change", dismissDrawer); };
  }, []);
  useEffect(() => {
    if (!open) return;
    closeButton.current = drawer.current?.querySelector<HTMLButtonElement>("button") ?? null;
    closeButton.current?.focus();
    const stopBackground = (event: Event) => { if (event.target === drawer.current) event.preventDefault(); };
    const current = drawer.current;
    current?.addEventListener("touchmove", stopBackground, { passive: false });
    current?.addEventListener("wheel", stopBackground, { passive: false });
    return () => { current?.removeEventListener("touchmove", stopBackground); current?.removeEventListener("wheel", stopBackground); };
  }, [open]);
  function close() { drawer.current?.close(); }
  const sidebar = { route, lastItem, reduced };
  return <>
    <a href="#studio-main" className="mx-skip">Skip to content</a>
    <aside className="mx-sidebar"><Sidebar {...sidebar} navigate={navigate} /></aside>
    <dialog ref={drawer} id="studio-menu" className="mx-drawer" aria-label="Studio navigation" onClose={() => setOpen(false)}
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      {open && <div className="mx-drawer-panel"><Sidebar {...sidebar} mobile close={close} navigate={next => { close(); navigate(next); }} /></div>}
    </dialog>
    <div className="mx-main-frame">
      <header className="mx-top">
        <div className="mx-mobile-brand"><Brand route={route} navigate={navigate} /></div>
        <label className="mx-search"><Search size={21} aria-hidden="true" />
          <input ref={input} type="search" placeholder="Search components..." aria-label="Search components" value={route.query}
            onChange={event => updateQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key !== "Escape") return;
              event.stopPropagation();
              if (route.query) { event.preventDefault(); updateQuery(""); }
              else { searchOrigin.current?.focus(); if (document.activeElement === input.current) input.current?.blur(); }
            }} />
        </label>
        <button type="button" className="mx-icon mx-theme-toggle" onClick={toggleScheme}
          aria-label={scheme === "light" ? "Switch to dark mode" : "Switch to light mode"}>{scheme === "light" ? <Sun size={22} /> : <Moon size={21} />}</button>
        <a href={repoURL} aria-label="MotionUX on GitHub" className="mx-icon mx-github">
          <svg viewBox="0 0 24 24" width="23" height="23" fill="currentColor" aria-hidden="true"><path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.52.1.71-.23.71-.5v-2.04c-2.9.63-3.5-1.23-3.5-1.23-.47-1.22-1.16-1.54-1.16-1.54-.95-.65.07-.64.07-.64 1.05.07 1.61 1.08 1.61 1.08.94 1.6 2.46 1.14 3.06.88.09-.68.36-1.14.66-1.4-2.31-.26-4.75-1.16-4.75-5.19 0-1.14.41-2.08 1.08-2.82-.11-.26-.47-1.32.1-2.76 0 0 .88-.28 2.88 1.08a9.92 9.92 0 0 1 5.24 0c2-1.36 2.88-1.08 2.88-1.08.57 1.44.21 2.5.1 2.76.67.74 1.08 1.68 1.08 2.82 0 4.04-2.44 4.93-4.76 5.19.37.32.7.96.7 1.94v2.95c0 .28.19.61.72.5A10.5 10.5 0 0 0 12 1.5Z"/></svg>
        </a>
        <button ref={trigger} type="button" className="mx-icon mx-menu-open" aria-label="Open menu" aria-controls="studio-menu" aria-expanded={open}
          onClick={() => { trigger.current?.focus(); drawer.current?.showModal(); setOpen(true); }}><Menu size={22} /></button>
      </header>
      <main id="studio-main" tabIndex={-1}>{children}</main>
    </div>
  </>;
}
