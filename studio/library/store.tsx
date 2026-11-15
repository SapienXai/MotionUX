import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { localStudio } from "../sources/local";

export type Personal = { note: string; tags: string[]; scene?: string; theme?: "light" | "dark" };
export type Collection = { id: string; name: string; items: string[] };
export type Library = { schemaVersion: 1; revision: number; favorites: string[]; collections: Collection[]; details: Record<string, Personal> };
export type Command =
  | { action: "favorite"; source: string; value: boolean }
  | { action: "create"; name: string }
  | { action: "rename"; collection: string; name: string }
  | { action: "delete"; collection: string }
  | { action: "membership"; source: string; collections: string[] }
  | { action: "personal"; source: string; value: Personal; keepPreferences?: boolean }
  | { action: "import"; mode: "merge" | "replace"; library: unknown };
type Session = { library: Library; token: string };
type Store = {
  data?: Library; saving: boolean; loading: boolean; error?: string; notice?: string;
  load: () => Promise<void>; save: (command: Command) => Promise<boolean>; retry: () => Promise<boolean>; canRetry: boolean;
};

const LibraryContext = createContext<Store | undefined>(undefined);
export function useLibrary() { return useContext(LibraryContext); }

export function LibraryStore({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Library>();
  const [loading, setLoading] = useState(localStudio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const pending = useRef(false);
  const session = useRef<Session | undefined>(undefined);
  const previous = useRef<Command | undefined>(undefined);
  const endpoint = "/v11/library";
  const refresh = useCallback(async () => {
    const response = await fetch(endpoint);
    const body = await response.json();
    if (!response.ok) throw new Error(body.message);
    session.current = body as Session;
    setData(body.library);
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try { await refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "The local library could not be loaded."); }
    finally { setLoading(false); }
  }, [refresh]);
  useEffect(() => { if (localStudio) void load(); }, [load]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(undefined), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  async function save(command: Command) {
    if (pending.current) return false;
    pending.current = true;
    previous.current = command;
    setSaving(true);
    setError(undefined);
    setNotice(undefined);
    try {
      if (!session.current) await refresh();
      const current = session.current!;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-MotionUX-Token": current.token },
        body: JSON.stringify({ ...command, revision: current.library.revision }),
      });
      const body = await response.json();
      if (response.status === 409) {
        session.current = { ...current, library: body.library };
        setData(body.library);
        throw new Error("The library changed in another tab. Review the latest data, then retry.");
      }
      if (response.status === 403) {
        session.current = undefined;
        throw new Error("Studio restarted. Retry to open a new session.");
      }
      if (!response.ok) throw new Error(body.message);
      session.current = { ...current, library: body.library };
      setData(body.library);
      previous.current = undefined;
      setNotice(command.action === "import" ? "Library imported." : "Saved to My Library.");
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "The change could not be saved. Try again.");
      return false;
    } finally { pending.current = false; setSaving(false); }
  }

  return <LibraryContext value={{ data, saving, loading, load, save, error, notice, canRetry: Boolean(previous.current),
    retry: () => previous.current ? save(previous.current) : Promise.resolve(false) }}>
    {children}
  </LibraryContext>;
}
