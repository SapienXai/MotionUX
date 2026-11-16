"use client";
import {
  Bell,
  Users,
  Columns3,
  Activity,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Command,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { defaultMotionDna, motionEasings, type Document } from "@motionux/build-core";

import { workspaceProfiles } from "./profile.ts";
import { readStageChanges, opportunities, type Stage, type StageChanges } from "./crm-data.ts";

type AppContext = {
  profile: (typeof workspaceProfiles)[keyof typeof workspaceProfiles];
  stageChanges: StageChanges;
  setStage: (id: string, stage: Stage) => void;
  document: Document;
  route: string;
  storageKey: string;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  property: string;
  setProperty: (name: string) => void;
  navigate?: (route: string) => void;
};
const appContext = createContext<AppContext | null>(null);
export function useApp() {
  const value = useContext(appContext);
  if (!value) throw new Error("App blocks require AppFrame.");
  return value;
}
const icons: Record<string, LucideIcon> = {
  "/": LayoutDashboard,
  "/bookings": CalendarDays,
  "/rooms": Building2,
  "/contacts": Users,
  "/pipeline": Columns3,
  "/activities": Activity,
  "/settings": Settings,
};

export function RouteLink({
  to,
  children,
  onFollow,
  className,
}: {
  to: string;
  children: ReactNode;
  onFollow?: () => void;
  className?: string;
}) {
  const state = useApp();
  function follow(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    onFollow?.();
    if (state.navigate) {
      event.preventDefault();
      state.navigate(to);
    }
  }
  return (
    <a
      href={to}
      onClick={follow}
      aria-current={state.route === to ? "page" : undefined}
      className={className}
    >
      {children}
    </a>
  );
}
export function NavLinks({
  compact = false,
  mobile = false,
  close,
}: {
  compact?: boolean;
  mobile?: boolean;
  close?: () => void;
}) {
  const { document, profile } = useApp();
  return (
    <nav
      className={mobile ? "hotel-mobile-links" : "hotel-links"}
      aria-label={mobile ? "Quick navigation" : profile.label + " pages"}
    >
      {document.pages.slice(0, mobile ? (document.template === "crm-dashboard" ? 5 : 4) : undefined).map((page) => {
        const Icon = icons[page.route] ?? ChevronRight;
        return (
          <RouteLink key={page.id} to={page.route} onFollow={close}>
            <Icon size={18} aria-hidden="true" />
            <span className={compact ? "hotel-sr" : undefined}>
              {page.title}
            </span>
          </RouteLink>
        );
      })}
    </nav>
  );
}
export function WorkspaceSwitcher() {
  const { property, setProperty, profile } = useApp();
  if (profile.workspaces.length < 2)
    return profile.workspaces.length ? <div className="hotel-workspace"><span className="hotel-monogram" aria-hidden="true">{profile.mark}</span><span className="hotel-workspace-caption"><span>Workspace</span><strong>{property}</strong></span></div> : null;
  return (
    <label className="hotel-workspace">
      <span className="hotel-monogram" aria-hidden="true">
        <Building2 size={18} />
      </span>
      <span className="hotel-workspace-caption">
        <span>Workspace</span>
        <select
          aria-label={profile.label + " workspace"}
          value={property}
          onChange={(event) => setProperty(event.target.value)}
        >
          {profile.workspaces.map((name) => <option key={name}>{name}</option>)}
        </select>
      </span>
      <ChevronDown
        className="hotel-workspace-chev"
        size={14}
        aria-hidden="true"
      />
    </label>
  );
}
export function Panel({
  label,
  title,
  children,
  kind = "",
  shortcut,
  icon,
}: {
  label: string;
  title: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  kind?: string;
  shortcut?: boolean;
  icon?: ReactNode;
}) {
  const modal = useRef<HTMLDialogElement>(null);
  const id = useId();
  function open() {
    const dialog = modal.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
  }
  useEffect(() => {
    if (!shortcut) return;
    function key(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "k"
      )
        return;
      event.preventDefault();
      open();
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [shortcut]);
  const close = () => modal.current?.close();
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.currentTarget.focus();
          open();
        }}
        className={
          kind.includes("search") ? "hotel-search-trigger" : "hotel-button"
        }
      >
        {icon}
        {label}
        {shortcut && <kbd>⌘ K</kbd>}
      </button>
      <dialog
        ref={modal}
        className={"hotel-dialog " + kind}
        aria-labelledby={id}
      >
        <div className="hotel-dialog-title">
          <h2 id={id}>{title}</h2>
          <button
            type="button"
            className="hotel-icon-btn"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>
        {typeof children === "function" ? children(close) : children}
      </dialog>
    </>
  );
}
export function CommandPalette({ shortcut = false }: { shortcut?: boolean }) {
  const { document } = useApp();
  const [query, setQuery] = useState("");
  const searchId = useId();
  const pages = document.pages.filter((page) =>
    page.title.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Panel
      label="Find a page"
      title="Go to a page"
      kind="search"
      shortcut={shortcut}
      icon={<Search size={16} />}
    >
      {(close) => (
        <div className="hotel-command">
          <label className="hotel-sr" htmlFor={searchId}>
            Search pages
          </label>
          <input
            id={searchId}
            data-initial-focus
            type="search"
            placeholder="Search pages…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                close();
                setQuery("");
              }
            }}
          />
          {pages.length ? (
            pages.map((page) => (
              <RouteLink
                key={page.id}
                to={page.route}
                onFollow={() => {
                  close();
                  setQuery("");
                }}
              >
                <Command size={15} aria-hidden="true" />
                {page.title}
                <span>{page.route}</span>
              </RouteLink>
            ))
          ) : (
            <p role="status">No pages match “{query}”.</p>
          )}
        </div>
      )}
    </Panel>
  );
}
export function Notifications() {
  const [read, setRead] = useState(false);
  const { document } = useApp();
  const notes = document.data === "hotel-demo-v1" ? ["Housekeeping updated room 305.", "Three arrivals appear on today’s schedule."] :
    document.data === "crm-demo-v1" ? ["A proposal walkthrough is on the schedule.", "A pilot scope is due for follow-up."] : [];
  return (
    <Panel
      label={read || !notes.length ? "Notifications" : "Notifications · " + notes.length}
      title="Notifications"
      icon={<Bell size={16} />}
    >
      <ul className="hotel-activity">
        {notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
      {!read && !!notes.length && (
        <button className="hotel-button" onClick={() => setRead(true)}>
          Mark all as read
        </button>
      )}
      {(read || !notes.length) && <p role="status">You’re all caught up.</p>}
    </Panel>
  );
}
export function MobileDrawer() {
  const { profile } = useApp();
  return (
    <Panel
      label="Menu"
      title={profile.label + " navigation"}
      kind="drawer"
      icon={<Menu size={17} />}
    >
      {(close) => (
        <>
          <WorkspaceSwitcher />
          <NavLinks close={close} />
        </>
      )}
    </Panel>
  );
}

export function AppFrame({
  document,
  route,
  children,
  navigate,
  device,
  themeOverride,
  studio = false,
  storageKey = "hotel-desk",
  revision = 0,
  status,
}: {
  document: Document;
  route: string;
  children: ReactNode;
  navigate?: (route: string) => void;
  device?: "desktop" | "tablet" | "mobile";
  themeOverride?: "light" | "dark";
  studio?: boolean;
  storageKey?: string;
  revision?: number;
  status?: ReactNode;
}) {
  const [localTheme, setTheme] = useState<"light" | "dark" | null>(null);
  const [railOverride, setRail] = useState<boolean | null>(null);
  const profile = workspaceProfiles[document.data];
  const [property, setProperty] = useState(profile.workspaces[0] ?? document.name);
  const [stageChanges, setStageChanges] = useState<StageChanges>({});
  const stageKey = storageKey + "-crm-v1-r" + revision;
  useEffect(() => {
    if (studio || document.data !== "crm-demo-v1") return;
    try { setStageChanges(readStageChanges(localStorage.getItem(stageKey))); }
    catch { setStageChanges({}); }
  }, [stageKey, studio, document.data]);
  function setStage(id: string, stage: Stage) {
    const deal = opportunities.find((deal) => deal.id === id);
    if (!deal || document.data !== "crm-demo-v1") return;
    const next = { ...stageChanges };
    if (deal.stage === stage) delete next[id];
    else next[id] = stage;
    setStageChanges(next);
    if (!studio) try { localStorage.setItem(stageKey, JSON.stringify(next)); } catch { /* Current route still works. */ }
  }
  const dna = document.motionDna ?? defaultMotionDna;
  const rail = railOverride ?? document.sidebar === "rail";
  const theme = themeOverride ?? localTheme ?? document.theme;
  const active = document.pages.find((page) => page.route === route);
  const Content = studio ? "div" : "main";
  function changeTheme(next: "light" | "dark") {
    if (!studio) {
      try {
        localStorage.setItem(storageKey + "-theme", next);
      } catch {
        /* Theme still applies for this session. */
      }
    }
    setTheme(next);
  }
  useEffect(() => {
    if (studio) return;
    try {
      const saved = localStorage.getItem(storageKey + "-theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
      const property = sessionStorage.getItem(storageKey + "-property");
      if (property && (profile.workspaces as readonly string[]).includes(property))
        setProperty(property);
    } catch {
      /* The app still works with storage disabled. */
    }
  }, [studio, storageKey, profile]);
  function changeProperty(name: string) {
    setProperty(name);
    if (!studio) {
      try {
        sessionStorage.setItem(storageKey + "-property", name);
      } catch {
        /* Store the setting in the current view. */
      }
    }
  }
  return (
    <appContext.Provider
      value={{
        document,
        profile,
        stageChanges,
        setStage,
        route,
        storageKey,
        theme,
        setTheme: changeTheme,
        property,
        setProperty: changeProperty,
        navigate,
      }}
    >
      <div
        className="hotel"
        data-template={document.template}
        data-theme={theme}
        data-device={device}
        data-motion={document.motionProfile}
        data-page-transition={dna.pageTransition}
        data-reduced-motion={dna.reducedMotion}
        style={{
          "--mx-dna-feedback": dna.feedbackMs + "ms",
          "--mx-dna-transition": dna.transitionMs + "ms",
          "--mx-dna-easing": motionEasings[dna.easing],
        } as CSSProperties}
        data-rail={rail || undefined}
      >
        <a className="hotel-skip" href="#hotel-main">
          Skip to {profile.label.toLowerCase()} content
        </a>
        <aside className="hotel-sidebar" aria-label={profile.label + " sidebar"}>
          <a
            className="hotel-brand"
            href="/"
            onClick={(event) => {
              if (navigate && !event.metaKey && !event.ctrlKey) {
                event.preventDefault();
                navigate("/");
              }
            }}
          >
            <span className="hotel-logomark">{profile.mark}</span>
            <span className={rail ? "hotel-sr" : undefined}>
              {document.name}
              <small>{profile.descriptor}</small>
            </span>
          </a>
          {!rail && <WorkspaceSwitcher />}
          {!rail && <span className="hotel-nav-label">WORKSPACE</span>}
          <NavLinks compact={rail} />
          <div className="hotel-sidebar-foot">
            {!rail && (
              <span className="hotel-avatar" aria-hidden="true">
                {profile.initials}
              </span>
            )}
            {!rail && (
              <span className="hotel-person">
                {profile.user}<small>{profile.role}</small>
              </span>
            )}
            <button
              type="button"
              className="hotel-icon-btn"
              aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setRail(!rail)}
            >
              {rail ? (
                <PanelLeftOpen size={17} />
              ) : (
                <PanelLeftClose size={17} />
              )}
            </button>
          </div>
        </aside>
        <div className="hotel-lane">
          <header className="hotel-header">
            <div className="hotel-header-location">
              <span className="hotel-drawer-trigger">
                <MobileDrawer />
              </span>
              <span>{property}</span>
              <ChevronRight size={14} aria-hidden="true" />
              <strong>{active?.title ?? document.name}</strong>
            </div>
            <div className="hotel-header-actions">
              <CommandPalette shortcut />
              <Notifications />
            </div>
          </header>
          <Content
            className="hotel-main"
            id="hotel-main"
            role={studio ? "region" : undefined}
            aria-label={studio ? profile.label + " content" : undefined}
          >
            <div className="hotel-page-meta">
              <span className="hotel-demo">
                <i />
                Demo data
              </span>
              {status}
              <span>
                <CalendarDays size={15} aria-hidden="true" /> Monday, November
                16, 2026
              </span>
            </div>
            <div className="hotel-grid" key={route}>{children}</div>
          </Content>
          <footer className="hotel-footer">
            <NavLinks mobile />
          </footer>
        </div>
      </div>
    </appContext.Provider>
  );
}

export const HotelFrame = AppFrame;
export const useHotel = useApp;
