"use client";

import { FlaskConical } from "lucide-react";
import { useRef, useState } from "react";
import type {
  IntegrationResult,
  IntegrationReview,
} from "@motionux/build-core/integration";

type Request = <T>(
  path: string,
  method?: string,
  value?: unknown,
) => Promise<T>;
const outcomes: Record<IntegrationResult["status"], string> = {
  "verified-and-restored": "Integration and rollback verified.",
  "failed-and-restored": "Integration failed. Rollback verified.",
  "cancelled-and-restored": "Integration cancelled. Rollback verified.",
  "rollback-unverified":
    "Rollback could not be verified. The isolated evidence was retained.",
};

export function IntegrationLab({
  project,
  revision,
  route,
  request,
  disabled,
}: {
  project: string;
  revision: number;
  route: string;
  request: Request;
  disabled: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [available, setAvailable] = useState<boolean>();
  const [review, setReview] = useState<IntegrationReview>();
  const [result, setResult] = useState<IntegrationResult>();
  const [signature, setSignature] = useState("");
  const [phase, setPhase] = useState<"prepare" | "apply" | "cancel">();
  const [error, setError] = useState("");
  const endpoint = "/" + project + "/integration";

  async function open() {
    dialog.current?.showModal();
    setError("");
    try {
      const status = await request<{ available: boolean }>(endpoint);
      setAvailable(status.available);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Integration Lab is unavailable.",
      );
    }
  }

  async function prepare() {
    setError("");
    setResult(undefined);
    setPhase("prepare");
    try {
      setReview(
        await request<IntegrationReview>(endpoint + "/review", "POST", {
          revision,
          route,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The review could not be prepared.",
      );
    } finally {
      setPhase(undefined);
    }
  }

  async function apply() {
    if (!review) return;
    setError("");
    setPhase("apply");
    try {
      setResult(
        await request<IntegrationResult>(endpoint + "/apply", "POST", {
          id: review.challenge.id,
          signature: signature.trim(),
        }),
      );
      setSignature("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The integration could not start.",
      );
    } finally {
      setPhase(undefined);
    }
  }

  async function cancel() {
    if (!review || result) return;
    const running = phase === "apply";
    setError("");
    if (running) setPhase("cancel");
    try {
      await request(endpoint + "/" + review.challenge.id, "DELETE");
      if (!running) {
        setReview(undefined);
        setSignature("");
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Cancellation could not be confirmed.",
      );
      if (running) setPhase("apply");
    }
  }

  function download() {
    if (!review) return;
    const url = URL.createObjectURL(
      new Blob([review.payload], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "motionux-review-" + review.challenge.id + ".json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function close() {
    if (phase) return;
    if (!result) void cancel();
    dialog.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        title={
          disabled
            ? "Save the project before reviewing an integration"
            : undefined
        }
      >
        <FlaskConical size={14} aria-hidden="true" /> Integration Lab
      </button>
      <dialog
        className="build-dialog build-integration-dialog"
        ref={dialog}
        aria-labelledby="build-integration-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <h2 id="build-integration-title">Integration Lab</h2>
        <p className="build-integration-meta">
          Test the registered Dialog block in a disposable Next.js copy. The lab
          rebuilds and checks the restored copy after the test.
        </p>
        {available === false && (
          <p className="build-integration-meta">
            Host approval requires macOS and a pinned Ed25519 public key
            configured at Studio startup.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {available && !review && (
          <div className="build-integration-row">
            <code>
              {route} · Revision {revision}
            </code>
            <button
              className="build-button accent"
              type="button"
              disabled={Boolean(phase)}
              onClick={prepare}
            >
              Prepare review
            </button>
          </div>
        )}
        {review && (
          <div className="build-integration-review">
            <div className="build-integration-row">
              <strong>
                {review.challenge.project.route} · Revision{" "}
                {review.challenge.project.revision}
              </strong>
              <span>
                Dialog v{review.challenge.source.version} ·{" "}
                {review.challenge.source.license}
              </span>
            </div>
            <details>
              <summary>Review digest and file changes</summary>
              <code>{review.digest}</code>
              <ul>
                {review.challenge.files.map(({ path, before, after }) => (
                  <li key={path}>
                    <strong>{path}</strong>
                    <code>
                      {before} → {after}
                    </code>
                  </li>
                ))}
              </ul>
            </details>
            {!result && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void apply();
                }}
              >
                <button
                  className="build-button"
                  type="button"
                  onClick={download}
                  disabled={Boolean(phase)}
                >
                  Download approval request
                </button>
                <label>
                  Host signature
                  <textarea
                    value={signature}
                    onChange={(event) => setSignature(event.target.value)}
                    autoCapitalize="none"
                    autoComplete="off"
                    spellCheck={false}
                    rows={2}
                    maxLength={128}
                    aria-describedby="build-signature-help"
                    disabled={Boolean(phase)}
                  />
                </label>
                <p className="build-integration-meta" id="build-signature-help">
                  Have the pinned host review and sign the downloaded JSON. Stop
                  any active Run before applying.
                </p>
                <div>
                  <button
                    className="build-button accent"
                    type="submit"
                    disabled={
                      Boolean(phase) ||
                      !/^[A-Za-z0-9_-]{86}$/.test(signature.trim())
                    }
                  >
                    Apply, verify and restore
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
        <p className="build-integration-meta" role="status">
          {result
            ? outcomes[result.status]
            : phase === "apply"
              ? "Checking the integrated app and its rollback…"
              : phase === "cancel"
                ? "Cancelling and checking the restored copy…"
                : ""}
        </p>
        {result && (
          <div className="build-integration-review">
            {result.failure && <p>{result.failure}</p>}
            {result.rollback && (
              <p className="build-integration-meta">
                {result.rollback.viewports.length} browser sizes passed after
                restoration.
              </p>
            )}
            <details>
              <summary>Rollback evidence</summary>
              <code>Baseline {result.baseline}</code>
              {result.restored && <code>Restored {result.restored}</code>}
              <code>Receipt {result.id}</code>
            </details>
          </div>
        )}
        <div className="build-integration-actions">
          {phase === "apply" ? (
            <button className="build-button" type="button" onClick={cancel}>
              Cancel integration
            </button>
          ) : (
            <button
              className="build-button"
              type="button"
              onClick={close}
              disabled={Boolean(phase)}
            >
              Close
            </button>
          )}
          {result && (
            <button
              className="build-button"
              type="button"
              onClick={() => {
                setReview(undefined);
                setResult(undefined);
              }}
            >
              New review
            </button>
          )}
        </div>
      </dialog>
    </>
  );
}
