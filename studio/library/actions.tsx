import { Bookmark, FolderPlus, StickyNote } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { useLibrary } from "./store";

export function LibraryDialog({ title, children, trigger, label, blocked }: {
  title: string; children: (close: () => void) => ReactNode; trigger: ReactNode; label?: string; blocked?: boolean;
}) {
  const heading = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => dialog.current?.close();
  return <>
    <button type="button" className="mx-button mx-library-trigger" aria-label={label} disabled={blocked} onClick={() => {
      setOpen(true);
      dialog.current?.showModal();
    }}>{trigger}</button>
    <dialog className="mx-library-dialog" aria-labelledby={heading} ref={dialog} onClose={() => setOpen(false)}>
      {open && <><h2 id={heading}>{title}</h2>{children(close)}</>}
    </dialog>
  </>;
}

export function LibraryFeedback({ compact = false }: { compact?: boolean }) {
  const store = useLibrary();
  if (!store || (!store.error && !store.notice)) return null;
  return <div className={compact ? "mx-library-message mx-library-compact" : "mx-library-message"}>
    {store.error ? <p role="alert">{store.error}</p> : <p role="status">{store.notice}</p>}
    {store.error && <button className="mx-button" type="button" disabled={store.saving} onClick={() => void (store.canRetry ? store.retry() : store.load())}>
      {store.canRetry ? "Retry save" : "Reload library"}
    </button>}
  </div>;
}

export function Favorite({ source, title }: { source: string; title: string }) {
  const store = useLibrary();
  const selected = store?.data?.favorites.includes(source) === true;
  return <button type="button" className="mx-library-icon" aria-label={`Favorite ${title}`} title={selected ? "Remove favorite" : "Save favorite"} aria-pressed={selected}
    disabled={!store?.data} aria-disabled={store?.saving || undefined} onClick={() => { if (!store?.saving) void store?.save({ action: "favorite", source, value: !selected }); }}>
    <Bookmark size={16} fill={selected ? "currentColor" : "none"} aria-hidden="true" />
  </button>;
}

export function Collect({ source, title, missing = false }: { source: string; title: string; missing?: boolean }) {
  const store = useLibrary();
  return <LibraryDialog title={`Collections for ${title}`} label={`Add ${title} to collections`} trigger={<FolderPlus size={16} aria-hidden="true" />}
    blocked={!store?.data}>{close => <MembershipForm source={source} missing={missing} close={close} />}</LibraryDialog>;
}

export function MembershipForm({ source, missing, close }: { source: string; missing: boolean; close: () => void }) {
  const store = useLibrary()!;
  const collections = store.data?.collections ?? [];
  const [chosen, setChosen] = useState(() => collections.filter(entry => entry.items.includes(source)).map(entry => entry.id));
  return collections.length ? <form onSubmit={async event => {
    event.preventDefault();
    if (await store.save({ action: "membership", source, collections: chosen })) close();
  }}>
    <fieldset><legend>Save in collections</legend>{collections.map(entry => <label key={entry.id} className="mx-library-check">
      <input type="checkbox" disabled={missing && !entry.items.includes(source)} checked={chosen.includes(entry.id)} onChange={event =>
        setChosen(event.target.checked ? [...chosen, entry.id] : chosen.filter(id => id !== entry.id))} /> {entry.name}
    </label>)}</fieldset>
    <LibraryFeedback compact />
    <div className="mx-library-form-actions"><button className="mx-button" type="button" onClick={close}>Cancel</button>
      <button className="mx-button mx-library-primary" disabled={store.saving}>Save collections</button></div>
  </form> : <form onSubmit={async event => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name"));
    await store.save({ action: "create", name });
  }}>
    <p>Create a collection, then select it below to save this original.</p>
    <label>Collection name <input name="name" maxLength={64} required autoFocus /></label>
    <LibraryFeedback compact />
    <div className="mx-library-form-actions"><button className="mx-button" type="button" onClick={close}>Cancel</button>
      <button className="mx-button mx-library-primary" disabled={store.saving}>Create collection</button></div>
  </form>;
}

export function PersonalEdit({ source, title, scenes = [], supportsTheme = false }: {
  source: string; title: string; scenes?: string[]; supportsTheme?: boolean;
}) {
  const store = useLibrary();
  const current = store?.data?.details[source];
  return <LibraryDialog title={`Personal settings for ${title}`} label={`Edit note for ${title}`} trigger={<><StickyNote size={16} aria-hidden="true" /> Note</>}
    blocked={!store?.data}>{close => <form onSubmit={async event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const theme = fields.get("theme");
      if (await store?.save({ action: "personal", source, keepPreferences: !supportsTheme && !scenes.length, value: {
        note: String(fields.get("note") ?? ""),
        tags: String(fields.get("tags") ?? "").split(",").map(tag => tag.trim()).filter(Boolean),
        scene: String(fields.get("scene") ?? "") || undefined,
        theme: theme === "light" || theme === "dark" ? theme : undefined,
      } })) close();
    }}>
      <label>Note <textarea name="note" maxLength={400} rows={4} defaultValue={current?.note} autoFocus /></label>
      <label>Tags, separated by commas <input name="tags" maxLength={420} defaultValue={current?.tags.join(", ")} /></label>
      {scenes.length > 0 && <label>Saved scene <select name="scene" defaultValue={scenes.includes(current?.scene ?? "") ? current?.scene : ""}>
        <option value="">Original default</option>{scenes.map(scene => <option key={scene}>{scene}</option>)}</select></label>}
      {supportsTheme && <label>Saved preview theme <select name="theme" defaultValue={current?.theme ?? ""}>
        <option value="">Use Studio theme</option><option value="light">Light</option><option value="dark">Dark</option></select></label>}
      <LibraryFeedback compact />
      <div className="mx-library-form-actions"><button className="mx-button" type="button" onClick={close}>Cancel</button>
        <button className="mx-button mx-library-primary" disabled={store?.saving}>Save note</button></div>
    </form>}</LibraryDialog>;
}
