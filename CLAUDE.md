# CLAUDE.md

Guidance for working in this repo. Keep it accurate — update it when the architecture or the gotchas change.

## What this is

An MCP server + Chrome MV3 extension that lets an AI agent (Claude) drive the user's **real, logged-in
Chrome default profile**. Chrome 136 (May 2025) blocked `--remote-debugging-port` on the default
user-data-dir, breaking CDP-against-your-real-profile; this restores it from *inside* the profile via an
extension. Mental model: "Playwright MCP, but pointed at your real logged-in Chrome."

## Architecture

```
Claude ⇄ (MCP/stdio) ⇄ server/ [hosts ws://127.0.0.1:9234, token handshake]
                            ⇅ JSON {id,method,params} / {id,result|error}
  extension/ (loaded unpacked in the real profile):
    offscreen document  → holds the WebSocket (survives MV3 service-worker culling)
    service worker      → routes methods to handlers; uses chrome.tabs/scripting/debugger
    content script      → window.__agentBridge: RefMap + snapshot + DOM actions (ISOLATED world)
```

Flow: tool → `bridge.call(method, params)` → WS → extension `router.on(method, …)` → handler →
`chrome.*` / `callInPage`. Default actions use synthetic content-script events (no banner);
`browser_click {trusted:true}` (or a content-action failure) escalates to real CDP `Input` via
`chrome.debugger` (shows the "extension is debugging this browser" banner). Control targets the
**active tab**; tab tools switch it.

### Key files
- `shared/src/protocol.ts` — wire message types + guards (imported by both halves).
- `server/src/`: `wsHost.ts` (binds 127.0.0.1, token gate), `connection.ts` (id-correlated calls),
  `bridge.ts` (connection gate), `startup.ts` (non-fatal port bind), `tools/registry.ts` (the 16 MCP
  tools), `index.ts` (entry).
- `extension/src/`: `sw.ts` (router + offscreen orchestration), `offscreen.ts` (the socket),
  `inject.ts` (`ensureContent`/`callInPage` + `toSerializableArgs`/`unwrapResult`), `handlers/*`,
  `content/{index,snapshot,refmap,actions,geometry}.ts`, `debugger.ts`.

## Commands

```bash
npm install
npm run build        # builds server (dist/index.js) + extension (dist/{sw,options,offscreen,content}.js)
npm test             # vitest (92 tests)
npm run typecheck    # tsc --noEmit across shared/server/extension
```
Load the extension: `chrome://extensions` → Developer mode → Load unpacked → `extension/`, then set the
token + port `9234` in its Options. Full setup + the 16 tools: `docs/setup.md`.
E2E: serve `test-fixtures/e2e-playground.html` (`python -m http.server 8080 --directory test-fixtures`)
and follow `docs/e2e-test-plan.md`.

## Runtime gotchas (learned the hard way — read before touching the extension)

- **`chrome.scripting.executeScript` can't serialize `undefined` in `args`** → "Value is unserializable".
  Optional handler params arrive undefined. `callInPage` runs args through `toSerializableArgs`
  (undefined→null). Don't pass raw optional values into executeScript args.
- **A thrown injected function does NOT reject `executeScript`** — Chrome resolves the frame with
  `result: null`. `unwrapResult` treats null OR undefined as failure (no page fn returns those on
  success). Without it, bad/stale refs *silently succeed*. Keep that invariant if you add page fns.
- **The content script is built as an IIFE** (separate esbuild call in `extension/build.mjs`), because
  it's injected as a *classic* script via `executeScript({files})` — it must contain no `import`/`export`.
  `sw`/`options`/`offscreen` are ESM.
- **MCP SDK (`@modelcontextprotocol/sdk` v1.29) stores a tool's handler at `_registeredTools[name].handler`**
  (not `.callback`). Tool tests rely on this.
- **The server must not crash on a busy WS port.** A single fixed port (9234) is tied to the process; an
  orphaned instance or a 2nd session causes `EADDRINUSE`. `startWsHost` never throws; stdio connects
  regardless. **Only run one Claude session driving the bridge at a time.**
- **`ws` is `external` in the server esbuild bundle** (it's CJS) — it resolves from `node_modules` at
  runtime, so the server runs from the repo.
- **`@types/chrome` quirks**: use `chrome.tabs.OnUpdatedInfo` (not `TabChangeInfo`);
  `InjectionResult<any>` (its `Awaited<T>` conflicts with TS's); `sendCommand` params want
  `{[k:string]:unknown}` (not `object`).
- **Editing extension code requires a manual reload**: `npm run build` then `chrome://extensions` →
  reload ↻. The service worker won't pick up `dist/` changes otherwise. Server changes need an MCP
  reconnect (`/mcp`) or a fresh session.
- **Snapshots list only interactive elements** (native controls, links, and an explicit-ARIA-role
  allowlist — button/tab/menuitem/switch/option/slider/…), each with a ref; non-interactive text
  (e.g. a status `<div>`) won't appear — verify those via screenshot. The walk descends into **open**
  shadow roots and **same-origin** frames, and prunes `aria-hidden`/`inert`/`hidden`/`display:none`
  subtrees. Output is capped at 800 elements.
- **The zero-size snapshot filter is gated on `hasLayout(doc)`** — jsdom reports every rect as 0x0,
  so an ungated filter would empty the snapshot in every unit test. Keep the gate if you touch
  `snapshot.ts`; tests that want the filter stub `documentElement.getBoundingClientRect`.
- **A character's ASCII code is its virtual key code only for `A-Z`, `0-9` and space.** In
  `keys.ts`, sending punctuation with `windowsVirtualKeyCode = charCodeAt(0)` makes Chrome act on the
  wrong key and *drop the character*: `"."` is 46, i.e. `VK_DELETE`, so trusted-typing `x@y.com`
  produced `x@ycom`. Punctuation uses OEM virtual keys — send `text` alone for it.
- **`centerOf` is top-document relative** — it adds each ancestor `frameElement`'s rect, because
  CDP `Input.*` dispatches against the top-level viewport. Don't hand it a raw
  `getBoundingClientRect` from inside a frame.

## Testing philosophy

Logic units (protocol, WS correlation, bridge, handshake, RefMap, snapshot, actions, geometry, tools,
startup, inject helpers) are **TDD with real assertions**. The `chrome.*` glue (service worker,
chrome-API handlers) is **not unit-tested** — mocking the extension runtime is low-value; it's covered
by `docs/e2e-test-plan.md` against real Chrome. New pure logic → write a failing test first.

## Conventions

- Commits end with the `Co-Authored-By: Claude …` trailer for the model that wrote them (plus the
  `Claude-Session:` line the session supplies).
- Don't commit the token (`bridge.token`, `.env` are gitignored). The localhost bind + token are the
  only security boundary — treat the token as a password; never log it.

## Docs
`docs/specs/…-design.md` (design), `docs/plans/…` (impl plan), `docs/setup.md` (install/usage),
`docs/e2e-test-plan.md` (manual suite + fixture), `docs/progress-and-roadmap.md` (status + roadmap).
