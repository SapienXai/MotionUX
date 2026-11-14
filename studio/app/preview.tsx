import { Component, useEffect, useState, type ReactNode } from "react";
import type { Config, Value } from "../playground/controls";
import { CircleAlert } from "lucide-react";
import { previews, type Reference, type Specimen } from "../catalog";

const cache = new Map<string, Promise<{ default: Specimen }>>();
function requestStory(id: string) {
  const stored = cache.get(id);
  if (stored) return stored;
  const next = previews[id]?.() ?? Promise.reject(new Error("Preview unavailable"));
  cache.set(id, next);
  void next.catch(() => { if (cache.get(id) === next) cache.delete(id); });
  return next;
}
let featured: ReturnType<typeof loadFeatured> | undefined;
function loadFeatured() { return import("../demos/gallery-featured"); }
function FeaturedPreview({ item, reduced, config, update, language }: {
  item: Reference; reduced: boolean; config?: Config; update?: (key: string, value: Value) => void; language?: "en" | "tr";
}) {
  const [module, setModule] = useState<Awaited<ReturnType<typeof loadFeatured>>>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    const request = featured ??= loadFeatured();
    void request.then(result => { if (live) setModule(result); }, () => {
      if (featured === request) featured = undefined;
      if (live) setError(true);
    });
    return () => { live = false; };
  }, [attempt]);
  if (error) return <PreviewError retry={() => { setError(false); setAttempt(value => value + 1); }} />;
  return module ? <module.default id={item.id} reduced={reduced} config={config} update={update} language={language} /> : <PreviewLoading />;
}

export function useStory(item: Reference) {
  const [state, setState] = useState<{ story?: Specimen; error?: boolean }>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    requestStory(item.id).then(({ default: story }) => { if (live) setState({ story }); },
      () => { if (live) setState({ error: true }); });
    return () => { live = false; };
  }, [item.id, attempt]);
  return { ...state, retry: () => { setState({}); setAttempt(value => value + 1); } };
}

export function PreviewError({ retry }: { retry: () => void }) {
  return <div className="mx-load-error"><CircleAlert size={20} aria-hidden="true" /><p>Couldn’t load this preview.</p>
    <button type="button" className="mx-button" onClick={retry}>Retry preview</button></div>;
}
export function PreviewLoading() { return <span className="mx-skeleton" role="status">Loading preview…</span>; }

export class PreviewBoundary extends Component<{ children: ReactNode; onRetry?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <PreviewError retry={() => { this.props.onRetry?.(); this.setState({ failed: false }); }} /> : this.props.children;
  }
}

export function GalleryPreview({ item, reduced, lead, config, update, language }: {
  item: Reference; reduced: boolean; lead: boolean; config?: Config; update?: (key: string, value: Value) => void; language?: "en" | "tr";
}) {
  return <PreviewBoundary>{lead ? <FeaturedPreview item={item} reduced={reduced} config={config} update={update} language={language} />
    : <StandardPreview item={item} reduced={reduced} />}</PreviewBoundary>;
}
function StandardPreview({ item, reduced }: { item: Reference; reduced: boolean }) {
  const { story, error, retry } = useStory(item);
  if (error) return <PreviewError retry={retry} />;
  if (!story) return <PreviewLoading />;
  return <story.component reduced={reduced} language="en" comparison />;
}
