import { isHello } from "@bridge/shared";

export type HandshakeResult = { ok: true } | { ok: false; reason: string };

export function validateHello(data: string, expectedToken: string): HandshakeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return { ok: false, reason: "expected hello handshake" };
  }
  if (!isHello(parsed)) return { ok: false, reason: "expected hello handshake" };
  if (parsed.token !== expectedToken) return { ok: false, reason: "invalid token" };
  return { ok: true };
}
