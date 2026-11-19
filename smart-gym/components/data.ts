"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// Dynamic resource views accept JSON from several typed server services.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
const changeEvent = "smart-gym:data-changed";
const refreshIntervalMs = 15_000;
let tabId = "";
function currentTabId() {
  return (tabId ||= crypto.randomUUID());
}
function publishDatabaseChange() {
  // Notify mounted views only after the API has confirmed the database write.
  window.dispatchEvent(new Event(changeEvent));
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel(changeEvent);
      channel.postMessage({ source: currentTabId() });
      channel.close();
    } catch {
      // Browser privacy settings can disable cross-tab messaging. Polling and
      // local invalidation still work; a committed write must remain a success.
    }
  }
}
export async function api<T = Row>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api/" + path, {
    ...options,
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const body = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(body.error || "Request failed"), {
      status: response.status,
    });
  const method = (options.method || "GET").toUpperCase();
  if (
    ["POST", "PATCH", "PUT", "DELETE"].includes(method) &&
    !path.startsWith("auth/")
  ) {
    publishDatabaseChange();
  }
  return body;
}
export function useData<T = Row>(path: string) {
  const router = useRouter();
  const [state, setState] = useState<{
    data: T | null;
    error: string;
    path: string;
    version: number;
    updatedAt: number | null;
  }>({ data: null, error: "", path: "", version: -1, updatedAt: null });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true,
      sequence = 0,
      inFlight = false;
    let controller: AbortController | null = null;
    async function load(force = false) {
      if (inFlight && !force) return;
      controller?.abort();
      controller = new AbortController();
      const requestSequence = ++sequence;
      inFlight = true;
      try {
        const data = await api<T>(path, { signal: controller.signal });
        if (live && requestSequence === sequence) {
          setState({ data, error: "", path, version, updatedAt: Date.now() });
        }
      } catch (error) {
        const failure = error as Error & { status?: number };
        if (
          live &&
          requestSequence === sequence &&
          failure.name !== "AbortError"
        ) {
          if (failure.status === 401) router.replace("/login");
          setState({
            data: null,
            error: failure.message,
            path,
            version,
            updatedAt: null,
          });
        }
      } finally {
        if (requestSequence === sequence) inFlight = false;
      }
    }
    const refreshVisible = () => {
      if (document.visibilityState !== "hidden") void load();
    };
    const onDatabaseChange = () => {
      void load(true);
    };
    void load();
    const timer = window.setInterval(refreshVisible, refreshIntervalMs);
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("online", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener(changeEvent, onDatabaseChange);
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel(changeEvent);
        channel.onmessage = (event) => {
          if (event.data?.source !== currentTabId()) onDatabaseChange();
        };
      } catch {
        // Focus and periodic refresh remain available without this browser API.
      }
    }
    return () => {
      live = false;
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("online", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener(changeEvent, onDatabaseChange);
      channel?.close();
    };
  }, [path, version, router]);
  return {
    ...state,
    loading: state.path !== path || state.version !== version,
    refresh: () => setVersion((v) => v + 1),
  };
}
export const money = (value: unknown) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
export const shortDate = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";
export const isoToday = () => new Date().toISOString().slice(0, 10);
