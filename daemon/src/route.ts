import { BridgeError, ErrorCodes, type ResponseMessage, type WireError } from "@bridge/shared";
import type { Bridge } from "./bridge.js";
import type { Caller, TabLayer } from "./intercept.js";
import type { ClientRegistry } from "./registry.js";

/** Bounds of a client's `timeoutMs` (decision 0.3 / decisions.md #17). */
export const MIN_TIMEOUT_MS = 100;
export const MAX_TIMEOUT_MS = 600_000;
/** Timeout when a request carries none — the extension connection's historical default. */
export const DEFAULT_TIMEOUT_MS = 30_000;
/** The daemon waits this much longer than asked, so the extension's own timer reports first. */
export const DAEMON_SLACK_MS = 5_000;

/** How long the daemon waits for the extension: `clamp(timeoutMs ?? 30000, 100, 600000) + 5000`. */
export function daemonWaitMs(timeoutMs: number | undefined): number {
  const asked = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, asked)) + DAEMON_SLACK_MS;
}

/** What `route` needs from the host. */
export interface RouteHost {
  readonly build: string;
  /** The bound port, `null` before listening. */
  readonly port: number | null;
  uptimeMs(): number;
  /** Stop accepting, close every socket with `code`, terminate stragglers after ~1 s. */
  shutdown(code: number): Promise<void>;
}

export interface RouteContext {
  bridge: Bridge;
  registry: ClientRegistry<unknown>;
  host: RouteHost;
  /**
   * Step 7: the tab layer and the calling client. `WsHost` always sets both for a client connection;
   * without them `route` keeps its Step 6 behaviour (forward everything that is not `daemon.*`).
   */
  tabs?: TabLayer;
  caller?: Caller;
}

/**
 * A routed request's answer. `after` runs once the response has been handed to the socket — this is
 * how `daemon.shutdown` replies `{ok:true}` before the 4002 close frames go out.
 */
export interface RouteOutcome {
  response: ResponseMessage;
  after?: () => void | Promise<void>;
}

/** Close code that tells clients the daemon is being replaced (they reconnect; decision 0.7). */
export const CLOSE_UPGRADING = 4002;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorResponse(id: string, error: WireError): RouteOutcome {
  return { response: { id, error } };
}

function toWireError(err: unknown): WireError {
  if (err instanceof BridgeError) return err.toWire();
  const message = err instanceof Error ? err.message : String(err);
  return { code: ErrorCodes.INTERNAL, message: message || "unknown error" };
}

/**
 * Handle one parsed client frame. Never rejects. Returns `null` for a frame that cannot be answered
 * (not an object, or no string/number id) — the caller counts and drops it.
 */
export async function route(frame: unknown, ctx: RouteContext): Promise<RouteOutcome | null> {
  if (!isPlainObject(frame)) return null;
  const rawId = frame.id;
  if (typeof rawId !== "string" && typeof rawId !== "number") return null;
  // Echo the client's id verbatim, even when it is the reason for the rejection (B8).
  const id = rawId as string;
  const bad = (message: string) => errorResponse(id, { code: ErrorCodes.BAD_PARAMS, message });

  if (typeof rawId !== "string" || rawId === "") return bad("request id must be a non-empty string");
  const { method, params, timeoutMs } = frame;
  if (typeof method !== "string" || method === "") return bad("request method must be a non-empty string");
  if ("params" in frame && params !== undefined && !isPlainObject(params)) {
    return bad("request params must be an object");
  }
  if ("timeoutMs" in frame && timeoutMs !== undefined && !(typeof timeoutMs === "number" && Number.isFinite(timeoutMs))) {
    return bad("request timeoutMs must be a finite number");
  }

  if (method.startsWith("daemon.")) return daemonMethod(id, method, ctx);

  if (ctx.tabs && ctx.caller) {
    try {
      const result = await ctx.tabs.request(
        ctx.caller,
        method,
        params as Record<string, unknown> | undefined,
        timeoutMs as number | undefined,
      );
      return { response: { id, result: result === undefined ? null : result } };
    } catch (err) {
      return errorResponse(id, toWireError(err));
    }
  }

  try {
    const result = await ctx.bridge.call(method, params as Record<string, unknown> | undefined, {
      timeoutMs: daemonWaitMs(timeoutMs as number | undefined),
    });
    // `undefined` would vanish in JSON and leave a frame that is neither result nor error.
    return { response: { id, result: result === undefined ? null : result } };
  } catch (err) {
    return errorResponse(id, toWireError(err));
  }
}

function daemonMethod(id: string, method: string, ctx: RouteContext): RouteOutcome {
  switch (method) {
    case "daemon.status":
      return {
        response: {
          id,
          result: {
            build: ctx.host.build,
            uptime: ctx.host.uptimeMs(),
            extensionConnected: ctx.bridge.isConnected(),
            clients: ctx.registry.list(),
            port: ctx.host.port,
            ...(ctx.tabs ? ctx.tabs.status() : {}),
          },
        },
      };
    case "daemon.shutdown":
      return { response: { id, result: { ok: true } }, after: () => ctx.host.shutdown(CLOSE_UPGRADING) };
    default:
      return errorResponse(id, { code: ErrorCodes.UNKNOWN_METHOD, message: `unknown daemon method: ${method}` });
  }
}
