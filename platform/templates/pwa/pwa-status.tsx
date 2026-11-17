"use client";

import { useEffect, useState } from "react";
import { useOptionalApp } from "./frame";

type InstallationPrompt = Event & {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function prepareOffline(controller: ServiceWorker) {
  return new Promise<boolean>((resolve) => {
    const channel = new MessageChannel();
    const finish = (ready: boolean) => {
      clearTimeout(timeout);
      channel.port1.close();
      resolve(ready);
    };
    const timeout = setTimeout(() => finish(false), 15_000);
    channel.port1.onmessage = (event) => finish(event.data === true);
    try {
      controller.postMessage("motionux:prepare-offline", [channel.port2]);
    } catch {
      channel.port2.close();
      finish(false);
    }
  });
}

export function PwaStatus() {
  const theme = useOptionalApp()?.theme;
  const [online, setOnline] = useState(true);
  const [worker, setWorker] = useState<"preparing" | "ready" | "unavailable">(
    "preparing",
  );
  const [installPrompt, setInstallPrompt] = useState<InstallationPrompt>();
  const [hasNativeInstall, setHasNativeInstall] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState("");

  useEffect(() => {
    const container = document.querySelector(".motionux-pwa :is(.hotel, .site)");
    if (!container) return;
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const color = getComputedStyle(container)
        .getPropertyValue(container.classList.contains("site") ? "--site-paper" : "--hotel-panel").trim();
      if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
    };
    apply();
    scheme.addEventListener("change", apply);
    return () => scheme.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    if (window.top !== window) return;
    const display = matchMedia("(display-mode: standalone)");
    const setDisplay = () => setStandalone(display.matches);
    let probe: AbortController | undefined;
    const connection = () => {
      probe?.abort();
      if (!navigator.onLine) {
        setOnline(false);
        return;
      }
      const current = new AbortController();
      probe = current;
      const deadline = setTimeout(() => current.abort(), 3000);
      void fetch("/manifest.webmanifest", {
        method: "HEAD",
        cache: "no-store",
        signal: current.signal,
      })
        .then((response) => {
          if (probe === current) setOnline(response.ok);
        })
        .catch(() => {
          if (probe === current) setOnline(false);
        })
        .finally(() => clearTimeout(deadline));
    };
    const installed = () => {
      setStandalone(true);
      setInstallPrompt(undefined);
    };
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallationPrompt);
    };
    setDisplay();
    connection();
    setHasNativeInstall(
      typeof (navigator as Navigator & { install?: unknown }).install ===
        "function",
    );
    display.addEventListener("change", setDisplay);
    addEventListener("online", connection);
    addEventListener("offline", connection);
    addEventListener("beforeinstallprompt", prompt);
    addEventListener("appinstalled", installed);

    let disposed = false;
    let pending: ServiceWorker | null = null;
    let check = 0;
    const controlled = () => {
      const controller = navigator.serviceWorker.controller;
      if (!controller) return;
      const current = ++check;
      void prepareOffline(controller).then((ready) => {
        if (!disposed && current === check)
          setWorker(ready ? "ready" : "unavailable");
      });
    };
    const workerState = () => {
      if (
        !disposed &&
        pending?.state === "redundant" &&
        !navigator.serviceWorker.controller
      )
        setWorker("unavailable");
    };
    if (
      window.isSecureContext &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.addEventListener("controllerchange", controlled);
      addEventListener("online", controlled);
      controlled();
      void navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => {
          if (disposed) return;
          pending = registration.installing;
          pending?.addEventListener("statechange", workerState);
          workerState();
        })
        .catch(() => {
          if (!disposed && !navigator.serviceWorker.controller)
            setWorker("unavailable");
        });
    } else setWorker("unavailable");
    return () => {
      disposed = true;
      const current = probe;
      probe = undefined;
      current?.abort();
      pending?.removeEventListener("statechange", workerState);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        controlled,
      );
      display.removeEventListener("change", setDisplay);
      removeEventListener("online", connection);
      removeEventListener("online", controlled);
      removeEventListener("offline", connection);
      removeEventListener("beforeinstallprompt", prompt);
      removeEventListener("appinstalled", installed);
    };
  }, []);

  async function install() {
    if (installing) return;
    setInstalling(true);
    try {
      if (hasNativeInstall) {
        await (
          navigator as Navigator & { install(): Promise<unknown> }
        ).install();
        setInstallStatus("App installed or opened.");
      } else if (installPrompt) {
        setInstallPrompt(undefined);
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        setInstallStatus(
          outcome === "accepted" ? "App installed." : "Installation cancelled.",
        );
      }
    } catch {
      setInstallStatus("Installation could not complete.");
    } finally {
      setInstalling(false);
    }
  }

  const connection =
    worker === "ready"
      ? online
        ? "Available offline"
        : "Offline"
      : worker === "preparing" && online
        ? "Preparing offline access…"
        : online
          ? "Offline access unavailable"
          : "Offline setup needs a connection";
  return (
    <div className="pwa-status">
      <span
        role="status"
        className="pwa-connection"
        data-ready={worker === "ready"}
      >
        {connection}
      </span>
      {online && !standalone && (hasNativeInstall || installPrompt) && (
        <button
          className="hotel-button"
          type="button"
          aria-disabled={installing}
          onClick={() => void install()}
        >
          Install app
        </button>
      )}
      <span role="status" className="hotel-sr">
        {installStatus}
      </span>
    </div>
  );
}
