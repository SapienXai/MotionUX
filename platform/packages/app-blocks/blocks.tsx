"use client";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BedDouble,
  CalendarDays,
  Check,
  CircleDollarSign,
  DoorOpen,
  Inbox,
  TrendingUp,
} from "lucide-react";
import { useEffect, useId, useState, type ReactNode, type Ref } from "react";
import type { Block, BlockId, BlockProps } from "@motionux/build-core";
import {
  CommandPalette,
  MobileDrawer,
  NavLinks,
  Notifications,
  Panel,
  RouteLink,
  WorkspaceSwitcher,
  useHotel,
} from "./frame.tsx";
import {
  currency,
  date,
  occupancy,
  reservations,
  rooms,
  statuses,
  week,
  type Reservation,
} from "./data.ts";

import { ArticleLibrary, OperationsQueue, OperationsSummary, WorkspaceResponse } from "./workspace.tsx";
import { Contacts, Pipeline, SalesActivity, SalesBreakdown, SalesKpis } from "./crm.tsx";

type View = (props: BlockProps) => ReactNode;
const metric = [
  {
    label: "Occupancy",
    value: () => occupancy.at(-1) + "%",
    tip: "Room occupancy today",
    icon: BedDouble,
  },
  {
    label: "Arrivals today",
    value: () => reservations.filter((item) => item.arrival === date).length,
    tip: "Scheduled for November 16",
    icon: DoorOpen,
  },
  {
    label: "Booked revenue",
    value: () =>
      currency.format(
        reservations.reduce((total, row) => total + row.total, 0),
      ),
    tip: "Total across demo reservations",
    icon: CircleDollarSign,
  },
] as const;
function Tile({ entry }: { entry: (typeof metric)[number] }) {
  return (
    <div className="hotel-metric">
      <div>
        <span>{entry.label}</span>
        <span className="hotel-metric-icon">
          <entry.icon size={17} aria-hidden="true" />
        </span>
      </div>
      <strong>{entry.value()}</strong>
      <small>{entry.tip}</small>
    </div>
  );
}
function Heading({
  title,
  description,
  anchor,
}: {
  title: string;
  description?: string;
  anchor?: Ref<HTMLDivElement>;
}) {
  return (
    <div className="hotel-card-title" ref={anchor}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
function Card({
  title,
  description,
  children,
  headingRef,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  headingRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div className="hotel-card">
      <Heading title={title} description={description} anchor={headingRef} />
      {children}
    </div>
  );
}
function Badge({ status }: { status: string }) {
  const tone = /ready|checked/i.test(status)
    ? "success"
    : /arriving|housekeeping/i.test(status)
      ? "warning"
      : "neutral";
  return (
    <span className="hotel-badge" data-tone={tone}>
      <i aria-hidden="true" />
      {status}
    </span>
  );
}
function Chart({ title, description }: BlockProps) {
  const id = useId();
  const values = occupancy.map((value, index) => [
    38 + index * 80,
    160 - (value - 52) * (125 / 48),
  ]);
  const path = values
    .map(([x, y], index) => (index ? "L" : "M") + x + "," + y)
    .join(" ");
  const delta = occupancy.at(-1)! - occupancy[0];
  return (
    <Card title={title} description={description}>
      <div className="hotel-trend">
        <strong>{occupancy.at(-1)}%</strong>
        <span>
          <TrendingUp size={14} /> +{delta} pts this week
        </span>
      </div>
      <figure className="hotel-chart">
        <svg viewBox="0 0 550 210" aria-hidden="true">
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop stopColor="currentColor" stopOpacity=".2" />
              <stop offset="1" stopColor="currentColor" stopOpacity=".015" />
            </linearGradient>
          </defs>
          {[35, 35 + 125 / 3, 160 - 125 / 3, 160].map((y, i) => (
            <g key={y}>
              <text x="2" y={y + 4}>
                {100 - i * 16}%
              </text>
              <line x1="36" x2="528" y1={y} y2={y} />
            </g>
          ))}
          <path d={path + " L518,160 L38,160 Z"} fill={"url(#" + id + ")"} />
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {values.map(([x, y], i) => (
            <g key={x}>
              <circle
                cx={x}
                cy={y}
                r={i === 6 ? 5 : 3.5}
                fill="var(--hotel-panel)"
                stroke="currentColor"
                strokeWidth="2"
              />
              <text x={x} y="189" textAnchor="middle">
                {week[i]}
              </text>
            </g>
          ))}
        </svg>
        <figcaption className="hotel-sr">
          {week.map((day, i) => day + " " + occupancy[i] + "%").join(", ")}
        </figcaption>
      </figure>
    </Card>
  );
}
function Empty({
  title = "No reservations match",
  reset,
}: {
  title?: string;
  reset: () => void;
}) {
  return (
    <div className="hotel-empty" role="status">
      <Inbox size={26} aria-hidden="true" />
      <strong>{title}</strong>
      <p>Try clearing the filters.</p>
      <button className="hotel-button" type="button" onClick={reset}>
        Clear filters
      </button>
    </div>
  );
}
type Filter = "full" | "status" | "search" | "date";
function Reservations({ title, filter }: { title: string; filter: Filter }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{
    key: "guest" | "arrival" | "total";
    asc: boolean;
  }>({ key: "arrival", asc: true });
  const reset = () => {
    setQuery("");
    setStatus("");
    setStart("");
    setEnd("");
    setPage(0);
  };
  const filtered = reservations.filter(
    (row) =>
      (!status || row.status === status) &&
      (!start || row.arrival >= start) &&
      (!end || row.arrival <= end) &&
      (row.guest + " " + row.room)
        .toLocaleLowerCase("en")
        .includes(query.toLocaleLowerCase("en")),
  );
  const sorted = [...filtered].sort((a, b) => {
    const left = a[sort.key],
      right = b[sort.key];
    return (left === right ? 0 : left < right ? -1 : 1) * (sort.asc ? 1 : -1);
  });
  const cols: { key: typeof sort.key; label: string }[] = [
    { key: "guest", label: "Guest" },
    { key: "arrival", label: "Arrival" },
    { key: "total", label: "Total" },
  ];
  function sortBy(key: keyof Pick<Reservation, "guest" | "arrival" | "total">) {
    setSort((value) => ({ key, asc: value.key === key ? !value.asc : true }));
    setPage(0);
  }
  return (
    <Card title={title}>
      <div className="hotel-filters">
        {(filter === "full" || filter === "search") && (
          <label>
            <span>Search reservations</span>
            <input
              type="search"
              placeholder="Guest or room"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
          </label>
        )}
        {(filter === "full" || filter === "status") && (
          <label>
            <span>Status</span>
            <select
              aria-label="Status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(0);
              }}
            >
              <option value="">All statuses</option>
              {statuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        )}
        {filter === "date" && (
          <>
            <label>
              From
              <input
                type="date"
                value={start}
                max={end || undefined}
                onChange={(event) => {
                  setStart(event.target.value);
                  setPage(0);
                }}
              />
            </label>
            <label>
              Until
              <input
                type="date"
                value={end}
                min={start || undefined}
                onChange={(event) => {
                  setEnd(event.target.value);
                  setPage(0);
                }}
              />
            </label>
          </>
        )}
      </div>
      {!sorted.length ? (
        <Empty reset={reset} />
      ) : (
        <>
          <div
            className="hotel-table-overflow"
            tabIndex={0}
            role="region"
            aria-label="Reservation results"
          >
            <table className="hotel-table">
              <caption className="hotel-sr">
                Fictional hotel reservations
              </caption>
              <thead>
                <tr>
                  {cols.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={
                        sort.key === col.key
                          ? sort.asc
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      <button onClick={() => sortBy(col.key)}>
                        {col.label}
                        {sort.key === col.key &&
                          (sort.asc ? (
                            <ArrowUp size={13} aria-hidden="true" />
                          ) : (
                            <ArrowDown size={13} aria-hidden="true" />
                          ))}
                      </button>
                    </th>
                  ))}
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(page * 5, page * 5 + 5).map((row) => (
                  <tr key={row.guest}>
                    <th scope="row">
                      <span className="hotel-row-guest">
                        <span aria-hidden="true">{row.initials}</span>
                        <span>
                          {row.guest}
                          <small>{row.room}</small>
                        </span>
                      </span>
                    </th>
                    <td>{row.arrival}</td>
                    <td>{currency.format(row.total)}</td>
                    <td>
                      <Badge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="hotel-table-foot">
            <span aria-live="polite">
              {page * 5 + 1}–{Math.min(page * 5 + 5, sorted.length)} of{" "}
              {sorted.length}
            </span>
            <div>
              <button
                className="hotel-button"
                disabled={!page}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                className="hotel-button"
                disabled={(page + 1) * 5 >= sorted.length}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
function Activity({ title, description }: BlockProps) {
  const activities = [
    {
      icon: CalendarDays,
      task: "Arrival confirmed",
      detail: reservations[0].guest + " · room 204",
      when: "09:40",
    },
    {
      icon: BedDouble,
      task: "Room marked ready",
      detail: rooms[2].name + " · room 401",
      when: "09:12",
    },
    {
      icon: Check,
      task: "Guest checked in",
      detail: reservations[1].guest + " · room 307",
      when: "08:25",
    },
  ];
  return (
    <Card title={title} description={description}>
      <ol className="hotel-activity">
        {activities.map((item) => (
          <li key={item.task}>
            <span className="hotel-activity-icon">
              <item.icon size={17} aria-hidden="true" />
            </span>
            <div>
              <strong>{item.task}</strong>
              <small>{item.detail}</small>
            </div>
            <time>{item.when}</time>
          </li>
        ))}
      </ol>
    </Card>
  );
}
function Form({
  title,
  mode,
}: {
  title: string;
  mode: "text" | "select" | "settings";
}) {
  const { theme, setTheme, storageKey, profile } = useHotel();
  const [name, setName] = useState("");
  const [preference, setPreference] = useState("Daily summary");
  const [saved, setSaved] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    try {
      setName(localStorage.getItem(storageKey + "-display-name") ?? "");
      const preference = localStorage.getItem(storageKey + "-notification");
      if (
        preference === "Daily summary" ||
        preference === profile.alternatePreference ||
        preference === "Off"
      )
        setPreference(preference);
    } catch {
      setStorageAvailable(false);
    }
  }, [storageKey, profile]);
  return (
    <Card title={title}>
      <form
        className="hotel-form"
        method="post"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            localStorage.setItem(storageKey + "-display-name", name);
            localStorage.setItem(storageKey + "-notification", preference);
          } catch {
            setStorageAvailable(false);
          }
          setSaved(true);
        }}
      >
        {mode !== "select" && (
          <label>
            Display name
            <input
              name="displayName"
              value={name}
              maxLength={60}
              required={mode === "text"}
              onChange={(event) => {
                setName(event.target.value);
                setSaved(false);
              }}
            />
          </label>
        )}
        {mode !== "text" && (
          <label>
            Notifications
            <select
              name="notifications"
              value={preference}
              onChange={(event) => {
                setPreference(event.target.value);
                setSaved(false);
              }}
            >
              <option>Daily summary</option>
              <option>{profile.alternatePreference}</option>
              <option>Off</option>
            </select>
          </label>
        )}
        {mode === "settings" && (
          <label>
            Appearance
            <select
              value={theme}
              onChange={(event) =>
                setTheme(event.target.value === "dark" ? "dark" : "light")
              }
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        )}
        <button className="hotel-button primary" type="submit">
          {mode === "text" ? "Save locally" : "Save preferences"}
        </button>
        <p role="status">
          {saved
            ? storageAvailable
              ? "Preferences saved on this browser."
              : "Browser storage is unavailable. Changes apply until reload."
            : ""}
        </p>
      </form>
    </Card>
  );
}
function RoomGrid({ title }: BlockProps) {
  return (
    <Card title={title}>
      <div className="hotel-rooms">
        {rooms.map((room) => (
          <article className="hotel-room" key={room.no}>
            <div className="hotel-room-art" aria-hidden="true">
              <BedDouble size={28} />
              <span>{room.no}</span>
            </div>
            <div className="hotel-room-label">
              <h3>{room.name}</h3>
              <Badge status={room.status} />
            </div>
            <p>{room.detail}</p>
            <Panel label={"View room " + room.no} title={room.name}>
              <p>{room.detail}</p>
              <Badge status={room.status} />
            </Panel>
          </article>
        ))}
      </div>
    </Card>
  );
}
function Feedback({
  title,
  description,
  kind,
}: BlockProps & { kind: "toast" | "skeleton" | "confirmation" | "empty" }) {
  const [state, setState] = useState(false);
  const { document } = useHotel();
  const count = document.data === "hotel-demo-v1" ? reservations.length + " demo reservations" : "Demo content";
  return (
    <Card title={title} description={description}>
      {kind === "confirmation" ? (
        <>
          <Panel label="Review reset" title="Reset the demo note?">
            {(close) => (
              <>
                <p>This clears only the local example state.</p>
                <button className="hotel-button" onClick={close}>
                  Cancel
                </button>{" "}
                <button
                  className="hotel-button primary"
                  onClick={() => {
                    setState(true);
                    close();
                  }}
                >
                  Reset note
                </button>
              </>
            )}
          </Panel>
          {state && <p role="status">Demo note reset.</p>}
        </>
      ) : kind === "empty" ? (
        state ? (
          <p role="status">
            Filters cleared. {count} available.
          </p>
        ) : (
          <Empty reset={() => setState(true)} />
        )
      ) : (
        <>
          <button
            className="hotel-button"
            type="button"
            onClick={() => setState(!state)}
          >
            {kind === "toast"
              ? state
                ? "Hide feedback"
                : "Show feedback"
              : state
                ? "Show content"
                : "Preview pending state"}
          </button>
          {kind === "toast" && state && (
            <p role="status" className="hotel-feedback">
              Local action complete.
            </p>
          )}
          {kind === "skeleton" && (
            <div className="hotel-pending" aria-busy={state}>
              {state ? (
                <>
                  <span />
                  <span />
                  <span />
                  <p className="hotel-sr">Pending preview state</p>
                </>
              ) : (
                <p>{count} ready.</p>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
function Breadcrumbs() {
  const { route, document } = useHotel();
  const title = document.pages.find((page) => page.route === route)?.title;
  return (
    <nav aria-label="Breadcrumb">
      <ol className="hotel-breadcrumb">
        <li>
          <RouteLink to="/">Home</RouteLink>
        </li>
        {route !== "/" && <li aria-current="page">{title}</li>}
      </ol>
    </nav>
  );
}
function Collapsible({ title }: BlockProps) {
  const [expanded, setExpanded] = useState(true);
  return (
    <Card title={title}>
      <button
        className="hotel-button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Collapse navigation" : "Expand navigation"}
      </button>
      <NavLinks compact={!expanded} />
    </Card>
  );
}
function Hero({ title, description }: BlockProps) {
  const { document } = useHotel();
  const destination = document.pages[1];
  const label = document.data === "hotel-demo-v1" && destination?.route === "/bookings" ? "See reservations" : destination ? "Open " + destination.title : "Open overview";
  return (
    <div className="hotel-hero">
      <Heading title={title} description={description} />
      <RouteLink to={destination?.route ?? "/"}>
        {label}{" "}
        <ArrowRight size={17} />
      </RouteLink>
    </div>
  );
}
const views: Partial<Record<BlockId, View>> = {
  AppSidebar: (props) => (
    <Card {...props}>
      <WorkspaceSwitcher />
      <NavLinks />
    </Card>
  ),
  IconRail: (props) => (
    <Card {...props}>
      <NavLinks compact />
    </Card>
  ),
  CollapsibleSidebar: (props) => <Collapsible {...props} />,
  SidebarInset: (props) => (
    <Card {...props}>
      <Breadcrumbs />
      <NavLinks />
    </Card>
  ),
  WorkspaceSwitcher: (props) => (
    <Card {...props}>
      <WorkspaceSwitcher />
    </Card>
  ),
  Topbar: (props) => (
    <Card {...props}>
      <div className="hotel-header-actions">
        <CommandPalette />
        <Notifications />
      </div>
    </Card>
  ),
  Breadcrumbs: (props) => (
    <Card {...props}>
      <Breadcrumbs />
    </Card>
  ),
  CommandPalette: (props) => (
    <Card {...props}>
      <CommandPalette />
    </Card>
  ),
  MobileBottomNav: (props) => (
    <Card {...props}>
      <NavLinks mobile />
    </Card>
  ),
  MobileDrawer: (props) => (
    <Card {...props}>
      <MobileDrawer />
    </Card>
  ),
  KpiCard: (props) => (
    <Card {...props}>
      <Tile
        entry={
          metric[
            props.dataBinding === "arrivals"
              ? 1
              : props.dataBinding === "revenue"
                ? 2
                : 0
          ]
        }
      />
    </Card>
  ),
  KpiGrid: (props) => (
    <div role="group" aria-label={props.title} className="hotel-metrics">
      {metric.map((entry) => (
        <Tile entry={entry} key={entry.label} />
      ))}
    </div>
  ),
  ChartCard: (props) => <Chart {...props} />,
  DataTable: (props) => <Reservations title={props.title} filter="full" />,
  FilterBar: (props) => <Reservations title={props.title} filter="status" />,
  RecentActivity: (props) => <Activity {...props} />,
  StatusBadge: (props) => (
    <Card {...props}>
      {statuses.map((status) => (
        <Badge key={status} status={status} />
      ))}
    </Card>
  ),
  EmptyState: (props) => <Feedback {...props} kind="empty" />,
  FormField: (props) => <Form title={props.title} mode="text" />,
  SearchField: (props) => <Reservations title={props.title} filter="search" />,
  SelectField: (props) => <Form title={props.title} mode="select" />,
  DateRangeFilter: (props) => (
    <Reservations title={props.title} filter="date" />
  ),
  SettingsPanel: (props) => <Form title={props.title} mode="settings" />,
  Dialog: (props) => (
    <Card {...props}>
      <Panel label="Open details" title={props.title}>
        <p>
          {props.description ||
            "This example is stored in the project document."}
        </p>
      </Panel>
    </Card>
  ),
  Sheet: (props) => (
    <Card {...props}>
      <Panel kind="sheet" label="Open side panel" title={props.title}>
        <p>
          {props.description ||
            "Review details without losing the current page."}
        </p>
      </Panel>
    </Card>
  ),
  Toast: (props) => <Feedback {...props} kind="toast" />,
  Skeleton: (props) => <Feedback {...props} kind="skeleton" />,
  ConfirmationFlow: (props) => <Feedback {...props} kind="confirmation" />,
  PageHeader: (props) => (
    <div className="hotel-page-title">
      <h1>{props.title}</h1>
      {props.description && <p>{props.description}</p>}
    </div>
  ),
  Hero: (props) => <Hero {...props} />,
  FeatureGrid: (props) => <RoomGrid {...props} />,
  Contacts, Pipeline, SalesActivity, SalesBreakdown,
  ArticleLibrary, OperationsQueue, OperationsSummary, WorkspaceResponse,
};
export function RenderBlock({
  block,
  slot,
  edit = false,
  dragRef,
}: {
  block: Block;
  slot?: ReactNode;
  edit?: boolean;
  dragRef?: Ref<HTMLDivElement>;
}) {
  const { type, props } = block;
  const { document } = useHotel();
  const view = views[type];
  return (
    <section
      aria-label={props.accessibleLabel || undefined}
      data-block-id={block.id}
      data-block={type}
      data-variant={props.variant}
      data-motion={props.motion}
      data-visibility={props.visibility}
    >
      {type === "SidebarInset" ? (
        <Card {...props} headingRef={dragRef}>
          <div inert={edit || undefined}>
            <Breadcrumbs />
            <NavLinks />
          </div>
          {slot ??
            (block.children?.length ? (
              <div className="hotel-layout-slot">
                {block.children.map((child) => (
                  <RenderBlock key={child.id} block={child} />
                ))}
              </div>
            ) : null)}
        </Card>
      ) : (
        document.data === "crm-demo-v1" && (type === "KpiGrid" || type === "KpiCard") ? <SalesKpis title={props.title} binding={type === "KpiCard" ? props.dataBinding : undefined} /> : view?.(props)
      )}
    </section>
  );
}
