"use client";
import { useId, useState } from "react";
import { articleRecords, type BlockProps } from "@motionux/build-core";
import { useApp } from "./frame.tsx";

export function ArticleLibrary({ title, description, articles, items }: BlockProps) {
  const { document } = useApp();
  const tr = document.locale === "tr";
  const t = (en: string, turkish: string) => tr ? turkish : en;
  const id = useId();
  const [query, setQuery] = useState("");
  const lower = (value: string) => value.toLocaleLowerCase(document.locale);
  const search = lower(query.trim());
  const matches = articleRecords(articles, items)
    .filter(({ title, body, tag }) => lower([title, body, tag].join(" ")).includes(search));
  return (
    <div className="hotel-card workspace-library">
      <div className="hotel-card-title"><h2>{title}</h2>{description && <p>{description}</p>}</div>
      <div className="workspace-filters">
        <label htmlFor={id}>{t("Search guides", "Kılavuzları ara")}</label>
        <input id={id} type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <p className="workspace-count" role="status">{t(`${matches.length} ${matches.length === 1 ? "guide" : "guides"}`, `${matches.length} kılavuz`)}</p>
      {matches.length ? (
        <ul className="workspace-articles">
          {matches.map(({ title, body, tag, id: articleId }) => (
            <li key={articleId}>
              <details name={"guide-" + id}>
                <summary>{title || t("Untitled guide", "Adsız kılavuz")}</summary>
                {tag && <small>{tag}</small>}
                <p>{body}</p>
              </details>
            </li>
          ))}
        </ul>
      ) : <p>{t("No matching guides.", "Eşleşen kılavuz yok.")}</p>}
    </div>
  );
}

export function WorkspaceResponse({ title }: BlockProps) {
  const { document } = useApp();
  const tr = document.locale === "tr";
  const [accepted, setAccepted] = useState(false);
  return (
    <div className="hotel-card">
      <div className="hotel-card-title"><h2>{title}</h2></div>
      <form className="hotel-form" onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.querySelector("textarea")?.value.trim()) return;
        setAccepted(true);
        form.reset();
      }}>
        <label>
          {tr ? "Yanıtınız" : "Your response"}
          <textarea required maxLength={600} rows={4} onInput={(event) => {
            const field = event.currentTarget;
            field.setCustomValidity(field.value && !field.value.trim() ? (tr ? "Bir yanıt yazın." : "Enter a response.") : "");
            setAccepted(false);
          }} />
        </label>
        <button type="submit" className="hotel-button primary">{tr ? "Yanıtı doğrula" : "Validate response"}</button>
        <p role="status">{accepted && (tr ? "Yanıt geçerli. Gönderilmedi." : "Response is valid. It was not sent.")}</p>
      </form>
    </div>
  );
}

export function OperationsSummary({ title, description }: BlockProps) {
  const { document, completedTasks, tasks } = useApp();
  const tr = document.locale === "tr";
  const totals = [
    [tr ? "Açık" : "Open", tasks.length - completedTasks.length],
    [tr ? "Tamamlanan" : "Completed", completedTasks.length],
    [tr ? "Toplam" : "Total", tasks.length],
  ] as const;
  return (
    <div className="hotel-card">
      <div className="hotel-card-title"><h2>{title}</h2>{description && <p>{description}</p>}</div>
      <dl className="workspace-totals" aria-label={title}>
        {totals.map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}
      </dl>
    </div>
  );
}

export function OperationsQueue({ title, description }: BlockProps) {
  const { document, completedTasks, toggleTask, tasks: records } = useApp();
  const tr = document.locale === "tr";
  const t = (en: string, turkish: string) => tr ? turkish : en;
  const id = useId();
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const tasks = records.filter(({ id }) => filter === "all" || completedTasks.includes(id) === (filter === "completed"));
  return (
    <div className="hotel-card">
      <div className="hotel-card-title">
        <h2>{title}</h2>
        <p>{description || t("Changes apply to this demo workspace in this browser.", "Değişiklikler bu tarayıcıdaki örnek çalışma alanına uygulanır.")}</p>
      </div>
      <div className="workspace-filters">
        <label htmlFor={id}>{t("Task status", "Görev durumu")}</label>
        <select id={id} value={filter} onChange={(event) => { setFilter(event.target.value); setNotice(""); }}>
          <option value="all">{t("All tasks", "Tüm görevler")}</option>
          <option value="open">{t("Open", "Açık")}</option>
          <option value="completed">{t("Completed", "Tamamlanan")}</option>
        </select>
      </div>
      <p className="workspace-count" role="status">{notice || t(`${tasks.length} tasks shown`, `${tasks.length} görev gösteriliyor`)}</p>
      {tasks.length ? (
        <div className="hotel-table-overflow" tabIndex={0} role="region" aria-labelledby={id + "-caption"}>
          <table className="hotel-table workspace-task-table">
            <caption id={id + "-caption"} className="hotel-sr">{title}</caption>
            <thead><tr>
              {[t("Task", "Görev"), t("Owner", "Sorumlu"), t("Priority", "Öncelik"), t("Status", "Durum"), t("Action", "İşlem")].map((label) =>
                <th key={label} scope="col">{label}</th>)}
            </tr></thead>
            <tbody>
              {tasks.map((task) => {
                const done = completedTasks.includes(task.id);
                const label = task.title || t("Untitled task", "Adsız görev");
                const action = done ? t("Reopen", "Yeniden aç") : t("Complete", "Tamamla");
                return <tr key={task.id}>
                  <th scope="row">{label}{task.summary && <small className="workspace-task-summary">{task.summary}</small>}</th>
                  <td>{task.owner}</td>
                  <td>{task.priority === "high" ? t("High", "Yüksek") : t("Normal", "Normal")}</td>
                  <td><span className="crm-chip">{done ? t("Completed", "Tamamlandı") : t("Open", "Açık")}</span></td>
                  <td><button type="button" className="hotel-button" aria-label={action + " " + label} onClick={() => {
                    toggleTask(task.id);
                    setNotice(done ? t("Task reopened.", "Görev yeniden açıldı.") : t("Task completed.", "Görev tamamlandı."));
                    if (filter !== "all") window.document.getElementById(id)?.focus();
                  }}>{action}</button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      ) : <p>{t("No tasks in this view.", "Bu görünümde görev yok.")}</p>}
    </div>
  );
}
