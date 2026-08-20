import type { A2UISurface } from "material-a2ui";

const BRIDGE_URL =
  new URLSearchParams(location.search).get("bridge") ??
  (import.meta as { env?: Record<string, string> }).env?.VITE_BRIDGE_URL ??
  "http://localhost:8787";
const SESSION_ID = new URLSearchParams(location.search).get("session") ?? "default";

export function subscribeSurface(onSurface: (surface: A2UISurface) => void, onConnected: (c: boolean) => void) {
  const source = new EventSource(`${BRIDGE_URL}/sessions/${SESSION_ID}/stream`);
  source.onopen = () => onConnected(true);
  source.onerror = () => onConnected(false);
  source.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data) onSurface(data);
  };
  return () => source.close();
}

export interface WireEvent {
  nodeId: string;
  component: string;
  name: string;
  value?: unknown;
}

export function postEvent(event: WireEvent) {
  fetch(`${BRIDGE_URL}/sessions/${SESSION_ID}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }).catch((err) => console.error("[bridge] failed to post event", err));
}

/**
 * AgentUIRenderer's onEvent hands back the raw DOM/React event, which isn't
 * JSON-serializable. Extract the one meaningful value per event shape —
 * mirrors host-demo's sanitizeEventValue in the a2ui-material-kit repo.
 */
export function sanitizeEventValue(value: unknown): string | boolean | number | undefined {
  if (value == null) return undefined;
  if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "object" && "target" in value) {
    const target = (value as { target: unknown }).target;
    if (target && typeof target === "object") {
      if ("checked" in target && typeof (target as { checked?: unknown }).checked === "boolean") {
        return (target as { checked: boolean }).checked;
      }
      if ("value" in target && typeof (target as { value?: unknown }).value === "string") {
        return (target as { value: string }).value;
      }
    }
  }
  return undefined;
}
