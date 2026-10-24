/**
 * Step 9 S2a fixer r1 (verifier finding 3): the offscreen document's sender check. The offscreen document
 * holds the daemon socket; it acts on a `connect`/`send` message only from this extension's own contexts
 * that are not in a tab — the service worker. A content script, or an extension page shown in a tab, always
 * carries `sender.tab`; another extension has another `sender.id`. Pure, no imports (the offscreen bundle
 * stays small); tested in `extension/test/s2a-fixer1.test.ts`. Never logs.
 */
export function acceptOffscreenSender(sender: { id?: string; tab?: unknown } | undefined, runtimeId: string): boolean {
  if (!sender || typeof runtimeId !== "string" || runtimeId === "") return false;
  return sender.tab === undefined && sender.id === runtimeId;
}
