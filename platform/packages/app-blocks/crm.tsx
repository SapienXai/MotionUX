"use client";
import { useId, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CircleDollarSign,
  ListChecks,
  TrendingUp,
  Users,
} from "lucide-react";
import { Panel, useApp } from "./frame.tsx";
import {
  activities,
  companyFor,
  contactFor,
  contacts,
  salesMetrics,
  salesRows,
  stageSummary,
  stages,
  usd,
  type Contact,
  type Opportunity,
  type Stage,
} from "./crm-data.ts";
import type { BlockProps } from "@motionux/build-core";

function SalesCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="hotel-card crm-card">
      <div className="hotel-card-title">
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
export function SalesKpis({
  title,
  binding,
}: {
  title: string;
  binding?: BlockProps["dataBinding"];
}) {
  const { stageChanges } = useApp();
  const figures = salesMetrics(salesRows(stageChanges));
  const tiles = [
    {
      id: "pipeline-value",
      label: "Open pipeline",
      value: usd(figures.value),
      note: "Value across open opportunities",
      icon: CircleDollarSign,
    },
    {
      id: "qualified-deals",
      label: "Qualified deals",
      value: figures.qualified,
      note: "Ready for the next conversation",
      icon: TrendingUp,
    },
    {
      id: "contacts",
      label: "Contacts",
      value: figures.people,
      note: "People in the directory",
      icon: Users,
    },
    {
      id: "open-tasks",
      label: "Open activities",
      value: figures.tasks,
      note: "Meetings and follow-ups",
      icon: ListChecks,
    },
  ];
  const selected = binding
    ? [tiles.find((entry) => entry.id === binding) ?? tiles[0]]
    : tiles;
  return (
    <div className="hotel-metrics crm-metrics" role="group" aria-label={title}>
      {selected.map(({ id, label, value, note, icon: Icon }) => (
        <div className="hotel-metric" key={id}>
          <div>
            <span>{label}</span>
            <span className="hotel-metric-icon">
              <Icon size={17} aria-hidden="true" />
            </span>
          </div>
          <strong>{value}</strong>
          <small>{note}</small>
        </div>
      ))}
    </div>
  );
}
export function SalesBreakdown({ title }: BlockProps) {
  const { stageChanges } = useApp();
  const rows = salesRows(stageChanges);
  const summaries = stages.map((stage) => ({
    stage,
    ...stageSummary(rows, stage),
  }));
  const max = Math.max(1, ...summaries.map((stage) => stage.value));
  return (
    <SalesCard title={title}>
      <p className="crm-caption">
        Opportunity value by stage, including won deals.
      </p>
      <ul className="crm-breakdown">
        {summaries.map(({ stage, count, value }) => (
          <li key={stage}>
            <div>
              <strong>{stage}</strong>
              <span>
                {count} {count === 1 ? "deal" : "deals"} · {usd(value)}
              </span>
            </div>
            <div className="crm-meter" aria-hidden="true">
              <span style={{ inlineSize: (value / max) * 100 + "%" }} />
            </div>
          </li>
        ))}
      </ul>
    </SalesCard>
  );
}

export function Contacts({ title }: BlockProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState<{ key: "name" | "company"; desc: boolean }>({
    key: "name",
    desc: false,
  });
  const company = (row: Contact) => companyFor(row.company).name;
  const rows = contacts
    .filter(
      (row) =>
        (status === "All" || row.status === status) &&
        (row.name + " " + company(row) + " " + row.role)
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        (sort.desc ? -1 : 1) *
        (sort.key === "name"
          ? a.name.localeCompare(b.name)
          : company(a).localeCompare(company(b))),
    );
  const toggle = (key: typeof sort.key) =>
    setSort({ key, desc: sort.key === key && !sort.desc });
  return (
    <SalesCard title={title}>
      <search className="crm-filters" aria-label="Filter contacts">
        <label htmlFor={id + "-query"}>
          Search contacts
          <input
            id={id + "-query"}
            name="query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label htmlFor={id + "-status"}>
          Relationship
          <select
            id={id + "-status"}
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="All">All relationships</option>
            <option>Active</option>
            <option>Prospect</option>
          </select>
        </label>
      </search>
      <p role="status" className="crm-caption">
        {rows.length} {rows.length === 1 ? "contact" : "contacts"}
      </p>
      {rows.length ? (
        <div
          className="crm-table-scroll"
          role="region"
          aria-label="Contact directory table"
          tabIndex={0}
        >
          <table className="crm-table">
            <thead>
              <tr>
                {(["name", "company"] as const).map((key) => (
                  <th
                    key={key}
                    scope="col"
                    aria-sort={
                      sort.key === key
                        ? sort.desc
                          ? "descending"
                          : "ascending"
                        : undefined
                    }
                  >
                    <button type="button" onClick={() => toggle(key)}>
                      {key === "name" ? "Name" : "Company"}{" "}
                      {sort.key === key &&
                        (sort.desc ? (
                          <ArrowDown size={14} aria-hidden="true" />
                        ) : (
                          <ArrowUp size={14} aria-hidden="true" />
                        ))}
                    </button>
                  </th>
                ))}
                <th scope="col">Role</th>
                <th scope="col">Relationship</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">
                    <Panel label={row.name} title={row.name}>
                      <dl className="crm-detail">
                        <dt>Company</dt>
                        <dd>{company(row)}</dd>
                        <dt>Industry</dt>
                        <dd>{companyFor(row.company).industry}</dd>
                        <dt>Role</dt>
                        <dd>{row.role}</dd>
                        <dt>Relationship</dt>
                        <dd>{row.status}</dd>
                      </dl>
                    </Panel>
                  </th>
                  <td>{company(row)}</td>
                  <td>{row.role}</td>
                  <td>
                    <span className="crm-chip">{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="crm-empty">
          No contacts match these filters.{" "}
          <button
            type="button"
            className="hotel-button"
            onClick={() => {
              setQuery("");
              setStatus("All");
            }}
          >
            Clear filters
          </button>
        </p>
      )}
    </SalesCard>
  );
}

export function Pipeline({ title }: BlockProps) {
  const { stageChanges, setStage } = useApp();
  const [last, setLast] = useState<{ deal: Opportunity; next: Stage }>();
  const [message, setMessage] = useState("");
  const deals = salesRows(stageChanges);
  return (
    <SalesCard title={title}>
      <div className="crm-board-info">
        <p className="crm-caption">
          Changes stay in this browser for this app revision.
        </p>
        <button
          type="button"
          className="hotel-button"
          disabled={!last}
          onClick={() => {
            if (!last) return;
            setStage(last.deal.id, last.deal.stage);
            setMessage(
              last.deal.name + " restored to " + last.deal.stage + ".",
            );
            setLast(undefined);
          }}
        >
          Undo stage change
        </button>
      </div>
      <p role="status" className="crm-announcement">
        {message}
      </p>
      <div className="crm-board">
        {stages.map((stage) => {
          const summary = stageSummary(deals, stage);
          return (
            <section aria-label={stage} className="crm-stage" key={stage}>
              <h3>
                {stage}
                <span>{summary.count}</span>
              </h3>
              <p>{usd(summary.value)}</p>
              {summary.count ? (
                deals
                  .filter((deal) => deal.stage === stage)
                  .map((deal) => (
                    <article key={deal.id} className="crm-deal">
                      <strong>{deal.name}</strong>
                      <span>{companyFor(deal.company).name}</span>
                      <b>{usd(deal.value)}</b>
                      <label>
                        Stage for {deal.name}
                        <select
                          name={"stage-" + deal.id}
                          value={stage}
                          data-deal={deal.id}
                          onChange={(event) => {
                            const next = stages.find(
                              (value) => value === event.target.value,
                            );
                            if (!next || next === stage) return;
                            const lane =
                              event.currentTarget.closest(".crm-board");
                            const hadFocus =
                              event.currentTarget ===
                              event.currentTarget.ownerDocument.activeElement;
                            setStage(deal.id, next);
                            setLast({ deal, next });
                            setMessage(deal.name + " moved to " + next + ".");
                            if (hadFocus)
                              requestAnimationFrame(() =>
                                lane
                                  ?.querySelector<HTMLSelectElement>(
                                    '[data-deal="' + deal.id + '"]',
                                  )
                                  ?.focus({ preventScroll: false }),
                              );
                          }}
                        >
                          {stages.map((stage) => (
                            <option key={stage}>{stage}</option>
                          ))}
                        </select>
                      </label>
                    </article>
                  ))
              ) : (
                <p className="crm-empty">No opportunities</p>
              )}
            </section>
          );
        })}
      </div>
    </SalesCard>
  );
}

export function SalesActivity({ title }: BlockProps) {
  return (
    <SalesCard title={title}>
      <ul className="crm-timeline">
        {activities.map((activity) => (
          <li key={activity.id}>
            <span className="crm-activity-icon">
              <CalendarDays size={17} aria-hidden="true" />
            </span>
            <div>
              <Panel label={activity.subject} title={activity.subject}>
                <p>{activity.detail}</p>
                <dl className="crm-detail">
                  <dt>Contact</dt>
                  <dd>{contactFor(activity.contact).name}</dd>
                  <dt>Scheduled</dt>
                  <dd>{activity.date}</dd>
                  <dt>Status</dt>
                  <dd>{activity.complete ? "Complete" : "Open"}</dd>
                </dl>
              </Panel>
              <small>
                {activity.kind} · {contactFor(activity.contact).name}
              </small>
            </div>
            <span className="crm-chip">
              {activity.complete ? "Complete" : "Open"}
            </span>
          </li>
        ))}
      </ul>
    </SalesCard>
  );
}
