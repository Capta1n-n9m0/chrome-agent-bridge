import { isHello, type HelloRole } from "@bridge/shared";

export type HandshakeResult = { ok: true } | { ok: false; reason: string };

/** A parsed hello (decision 0.1): an absent role is the v1 extension. */
export type ParsedHello =
  | { ok: true; role: HelloRole; name?: string; build?: string }
  | { ok: false; reason: string };

const BAD_HELLO = "expected hello handshake";

/**
 * Validate the first frame of a connection. Reasons never echo a field value (the token above all):
 * they become the close reason, which the peer sees.
 */
export function parseHello(data: string, expectedToken: string): ParsedHello {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return { ok: false, reason: BAD_HELLO };
  }
  if (typeof parsed !== "object" || parsed === null) return { ok: false, reason: BAD_HELLO };
  const v = parsed as Record<string, unknown>;
  if (v.type !== "hello" || typeof v.token !== "string") return { ok: false, reason: BAD_HELLO };
  if (v.token !== expectedToken) return { ok: false, reason: "invalid token" };
  if ("role" in v && v.role !== "extension" && v.role !== "client") return { ok: false, reason: "unknown role" };
  if (!isHello(parsed)) return { ok: false, reason: BAD_HELLO };
  const result: ParsedHello = { ok: true, role: parsed.role ?? "extension" };
  if (parsed.name !== undefined) result.name = parsed.name;
  if (parsed.build !== undefined) result.build = parsed.build;
  return result;
}

/** The v1 shape, kept for existing callers: `{ok: true}` or the rejection reason. */
export function validateHello(data: string, expectedToken: string): HandshakeResult {
  const result = parseHello(data, expectedToken);
  return result.ok ? { ok: true } : result;
}

/**
 * The extension's `features` from an (already validated) hello: its strings, else `[]` — Step 12 S2b (#332). Read
 * beside `parseHello`, as `helloSession` is.
 */
export function helloFeatures(data: string): string[] {
  try {
    const features = (JSON.parse(data) as { features?: unknown }).features;
    return Array.isArray(features) ? features.filter((f): f is string => typeof f === "string") : [];
  } catch {
    return [];
  }
}

/**
 * The extension's session marker from an (already validated) hello: a non-empty string, else undefined
 * ("none") — Step 8 S2b.5 (decisions.md · 2026-10-23 · #74, amended by #80). Read beside `parseHello`,
 * whose result shape Step 6 tests pin. The marker is compared, never logged.
 */
export function helloSession(data: string): string | undefined {
  try {
    const session = (JSON.parse(data) as { session?: unknown }).session;
    return typeof session === "string" && session !== "" ? session : undefined;
  } catch {
    return undefined;
  }
}
