# Chrome Real-Profile Agent Bridge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome MV3 extension (running in the user's real, logged-in default profile) bridged over a localhost WebSocket to a Node/TypeScript MCP server, so Claude can perceive (hybrid accessibility snapshot + screenshot) and operate (content-script actions with a `chrome.debugger` trusted-input fallback) the active browser tab.

**Architecture:** Claude ↔ (MCP/stdio) ↔ MCP server [hosts `ws://127.0.0.1:<port>`] ↔ (JSON req/resp + token) ↔ extension service worker ↔ `chrome.tabs`/`chrome.scripting`/`chrome.debugger` ↔ active tab. The MCP server is the long-lived process and the WebSocket *host*; the extension is the WebSocket *client* that dials out, solving the "extensions can't listen" constraint.

**Tech Stack:** Node.js + TypeScript, `@modelcontextprotocol/sdk`, `ws`, `zod`; extension is MV3 TypeScript bundled with `esbuild`; tests with `vitest` (+ `jsdom` for snapshot tests); typecheck with `tsc --noEmit`.

**Source spec:** `docs/specs/2026-06-04-chrome-real-profile-agent-bridge-design.md`

---

## Testing philosophy (read first)

- **Unit-test with TDD** the pure/logic units: the protocol types' runtime helpers, the request/response correlation (`ExtensionConnection`), the connection gate (`Bridge`), the handshake validator, the tool-layer wiring (against a fake bridge), and the DOM snapshot/ref-map builders (via `jsdom`).
- **Do NOT unit-test the `chrome.*` glue** (service worker, command handlers calling `chrome.tabs`/`scripting`/`debugger`). Mocking the entire extension runtime is brittle and low-value. These get **full implementation code + a manual E2E verification step** at the end of each milestone. This is deliberate good test design, not a shortcut.
- Run `npm test` (vitest) and `npm run typecheck` before every commit that touches TS.

## File structure (decomposition)

```
chrome-remote-extention/
  package.json                 # root, npm workspaces, scripts
  tsconfig.base.json           # shared compiler options
  vitest.config.ts             # test config (node + jsdom envs)
  shared/
    package.json
    tsconfig.json
    src/protocol.ts            # wire message types + type guards (isResponse, isHello…)
  server/
    package.json
    tsconfig.json
    build.mjs                  # esbuild → dist/index.js
    src/connection.ts          # ExtensionConnection: id-correlated call()/handleMessage()
    src/bridge.ts              # Bridge: holds current connection, "not connected" gate
    src/handshake.ts           # validateHello(data, token)
    src/wsHost.ts              # WsHost: ws.Server on 127.0.0.1, wires sockets→Bridge
    src/config.ts              # reads port + token from env
    src/tools/registry.ts      # registers all MCP tools on an McpServer
    src/index.ts               # entry: McpServer + StdioServerTransport + WsHost
    test/*.test.ts
  extension/
    package.json
    tsconfig.json
    build.mjs                  # esbuild → dist/{sw,content,options,offscreen}.js
    manifest.json
    options.html
    offscreen.html             # (Milestone 5)
    src/sw.ts                  # service worker: client wiring, keepalive, router
    src/client.ts              # ReconnectingClient: ws dial-out + backoff
    src/router.ts              # dispatch {method,params} → handler, return result/error
    src/handlers/navigate.ts
    src/handlers/tabs.ts
    src/handlers/perceive.ts   # snapshot + screenshot
    src/handlers/actions.ts    # click/type/scroll/select/hover/press_key
    src/handlers/history.ts    # back/forward
    src/tabs.ts                # active-tab resolution + waitForLoad helpers
    src/inject.ts              # ensureContentScript + callInPage helpers
    src/debugger.ts            # chrome.debugger attach/detach + trusted input (Milestone 4)
    src/content/index.ts       # attaches window.__agentBridge (guarded, idempotent)
    src/content/snapshot.ts    # buildSnapshot(doc) → {text, refs}
    src/content/refmap.ts      # RefMap: id↔element registry
    src/content/actions.ts     # clickRef/typeRef/… in page context
    src/options.ts             # options page logic (token + port)
    test/*.test.ts             # jsdom: snapshot.test.ts, refmap.test.ts
```

---

## Phase 0: Project scaffolding

### Task 0.1: Root workspace + tooling

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `vitest.config.ts`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "chrome-remote-extention",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "workspaces": ["shared", "server", "extension"],
  "scripts": {
    "typecheck": "tsc -p shared/tsconfig.json && tsc -p server/tsconfig.json && tsc -p extension/tsconfig.json",
    "test": "vitest run",
    "build": "node server/build.mjs && node extension/build.mjs"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "esbuild": "^0.24.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  }
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Per-file environment via docblock: server/shared use node, content tests use jsdom.
    environment: "node",
    include: ["**/test/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: workspaces resolve, `node_modules/` created, no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.base.json vitest.config.ts package-lock.json
git commit -m "chore: scaffold npm workspaces + vitest + tsc tooling"
```

### Task 0.2: `shared` protocol package

**Files:**
- Create: `shared/package.json`, `shared/tsconfig.json`, `shared/src/protocol.ts`, `shared/test/protocol.test.ts`

- [ ] **Step 1: Create `shared/package.json`**

```json
{
  "name": "@bridge/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "src/protocol.ts",
  "exports": { ".": "./src/protocol.ts" }
}
```

- [ ] **Step 2: Create `shared/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Write the failing test** — `shared/test/protocol.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { isResponse, isHello, type ResponseMessage } from "../src/protocol.js";

describe("protocol guards", () => {
  it("recognizes a success response", () => {
    const msg = { id: "1", result: { ok: true } } satisfies ResponseMessage;
    expect(isResponse(msg)).toBe(true);
  });
  it("recognizes an error response", () => {
    expect(isResponse({ id: "1", error: { message: "boom" } })).toBe(true);
  });
  it("rejects a non-response object", () => {
    expect(isResponse({ method: "navigate" })).toBe(false);
  });
  it("recognizes a hello handshake", () => {
    expect(isHello({ type: "hello", token: "abc" })).toBe(true);
    expect(isHello({ id: "1", result: 1 })).toBe(false);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- protocol`
Expected: FAIL — cannot find module `../src/protocol.js`.

- [ ] **Step 5: Implement `shared/src/protocol.ts`**

```ts
export interface RequestMessage {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface SuccessResponse {
  id: string;
  result: unknown;
}

export interface ErrorResponse {
  id: string;
  error: { message: string };
}

export type ResponseMessage = SuccessResponse | ErrorResponse;

export interface HelloMessage {
  type: "hello";
  token: string;
}

export function isResponse(value: unknown): value is ResponseMessage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && ("result" in v || "error" in v);
}

export function isErrorResponse(value: ResponseMessage): value is ErrorResponse {
  return "error" in value;
}

export function isHello(value: unknown): value is HelloMessage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.type === "hello" && typeof v.token === "string";
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- protocol`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add shared
git commit -m "feat(shared): wire protocol types and type guards"
```

---

## Milestone 1: Walking skeleton (navigate round-trips end-to-end)

Goal: Claude → `browser_navigate` → MCP server → WebSocket → extension → `chrome.tabs.update` → active tab navigates. Proves channel, token handshake, MCP wiring, and basic keepalive.

### Task 1.1: `ExtensionConnection` (id-correlated calls)

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`, `server/src/connection.ts`, `server/test/connection.test.ts`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "@bridge/server",
  "version": "0.1.0",
  "type": "module",
  "bin": { "chrome-bridge-server": "dist/index.js" },
  "scripts": { "build": "node build.mjs" },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "ws": "^8.18.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.0"
  }
}
```

- [ ] **Step 2: Create `server/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "types": ["node"] },
  "include": ["src", "test", "build.mjs"]
}
```

- [ ] **Step 3: Install** — Run: `npm install`. Expected: server deps resolve.

- [ ] **Step 4: Write the failing test** — `server/test/connection.test.ts`

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExtensionConnection } from "../src/connection.js";

describe("ExtensionConnection", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("sends a request with an incrementing id and resolves on matching response", async () => {
    const sent: string[] = [];
    const conn = new ExtensionConnection((d) => sent.push(d), 1000);

    const p = conn.call("navigate", { url: "https://example.com" });
    expect(JSON.parse(sent[0])).toEqual({ id: "1", method: "navigate", params: { url: "https://example.com" } });

    conn.handleMessage(JSON.stringify({ id: "1", result: { ok: true } }));
    await expect(p).resolves.toEqual({ ok: true });
  });

  it("rejects on an error response", async () => {
    const conn = new ExtensionConnection(() => {}, 1000);
    const p = conn.call("click", { ref: "e1" });
    conn.handleMessage(JSON.stringify({ id: "1", error: { message: "ref not found" } }));
    await expect(p).rejects.toThrow("ref not found");
  });

  it("rejects on timeout", async () => {
    const conn = new ExtensionConnection(() => {}, 1000);
    const p = conn.call("navigate", {});
    vi.advanceTimersByTime(1001);
    await expect(p).rejects.toThrow(/Timed out/);
  });

  it("ignores responses with unknown ids", () => {
    const conn = new ExtensionConnection(() => {}, 1000);
    expect(() => conn.handleMessage(JSON.stringify({ id: "999", result: 1 }))).not.toThrow();
  });

  it("rejectAll fails every pending call", async () => {
    const conn = new ExtensionConnection(() => {}, 1000);
    const p = conn.call("navigate", {});
    conn.rejectAll("disconnected");
    await expect(p).rejects.toThrow("disconnected");
  });
});
```

- [ ] **Step 5: Run test to verify it fails** — Run: `npm test -- connection`. Expected: FAIL (module not found).

- [ ] **Step 6: Implement `server/src/connection.ts`**

```ts
import { isResponse, isErrorResponse, type RequestMessage } from "@bridge/shared";

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class ExtensionConnection {
  private pending = new Map<string, Pending>();
  private nextId = 1;

  constructor(
    private readonly send: (data: string) => void,
    private readonly timeoutMs = 30_000,
  ) {}

  call(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = String(this.nextId++);
    const message: RequestMessage = { id, method, params };
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out after ${this.timeoutMs}ms calling ${method}`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.send(JSON.stringify(message));
    });
  }

  handleMessage(data: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (!isResponse(parsed)) return;
    const pending = this.pending.get(parsed.id);
    if (!pending) return;
    this.pending.delete(parsed.id);
    clearTimeout(pending.timer);
    if (isErrorResponse(parsed)) pending.reject(new Error(parsed.error.message));
    else pending.resolve(parsed.result);
  }

  rejectAll(reason: string): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    this.pending.clear();
  }
}
```

- [ ] **Step 7: Run test to verify it passes** — Run: `npm test -- connection`. Expected: PASS (5 tests).

- [ ] **Step 8: Commit**

```bash
git add server
git commit -m "feat(server): ExtensionConnection with id correlation + timeouts"
```

### Task 1.2: `Bridge` (connection gate)

**Files:**
- Create: `server/src/bridge.ts`, `server/test/bridge.test.ts`

- [ ] **Step 1: Write the failing test** — `server/test/bridge.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { Bridge } from "../src/bridge.js";
import { ExtensionConnection } from "../src/connection.js";

describe("Bridge", () => {
  it("throws a clear error when no extension is connected", async () => {
    const bridge = new Bridge();
    await expect(bridge.call("navigate", {})).rejects.toThrow(/not connected/i);
  });

  it("delegates to the current connection", async () => {
    const bridge = new Bridge();
    const sent: string[] = [];
    const conn = new ExtensionConnection((d) => sent.push(d), 1000);
    bridge.setConnection(conn);
    const p = bridge.call("navigate", { url: "x" });
    conn.handleMessage(JSON.stringify({ id: "1", result: "done" }));
    await expect(p).resolves.toBe("done");
  });

  it("reports connection status", () => {
    const bridge = new Bridge();
    expect(bridge.isConnected()).toBe(false);
    bridge.setConnection(new ExtensionConnection(() => {}));
    expect(bridge.isConnected()).toBe(true);
    bridge.setConnection(null);
    expect(bridge.isConnected()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npm test -- bridge`. Expected: FAIL.

- [ ] **Step 3: Implement `server/src/bridge.ts`**

```ts
import { ExtensionConnection } from "./connection.js";

const NOT_CONNECTED =
  "Extension not connected — is Chrome open and the Chrome Agent Bridge extension enabled?";

export class Bridge {
  private connection: ExtensionConnection | null = null;

  setConnection(connection: ExtensionConnection | null): void {
    this.connection = connection;
  }

  isConnected(): boolean {
    return this.connection !== null;
  }

  async call(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.connection) throw new Error(NOT_CONNECTED);
    return this.connection.call(method, params);
  }
}
```

- [ ] **Step 4: Run test to verify it passes** — Run: `npm test -- bridge`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server
git commit -m "feat(server): Bridge connection gate"
```

### Task 1.3: Handshake validator + config

**Files:**
- Create: `server/src/handshake.ts`, `server/src/config.ts`, `server/test/handshake.test.ts`

- [ ] **Step 1: Write the failing test** — `server/test/handshake.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { validateHello } from "../src/handshake.js";

describe("validateHello", () => {
  const token = "secret";
  it("accepts a valid hello", () => {
    expect(validateHello(JSON.stringify({ type: "hello", token }), token)).toEqual({ ok: true });
  });
  it("rejects a wrong token", () => {
    const r = validateHello(JSON.stringify({ type: "hello", token: "nope" }), token);
    expect(r).toEqual({ ok: false, reason: "invalid token" });
  });
  it("rejects a non-hello first message", () => {
    expect(validateHello(JSON.stringify({ id: "1", result: 1 }), token)).toEqual({
      ok: false,
      reason: "expected hello handshake",
    });
  });
  it("rejects unparseable data", () => {
    expect(validateHello("not json", token)).toEqual({ ok: false, reason: "expected hello handshake" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npm test -- handshake`. Expected: FAIL.

- [ ] **Step 3: Implement `server/src/handshake.ts`**

```ts
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
```

- [ ] **Step 4: Implement `server/src/config.ts`** (no test — trivial env reads)

```ts
export interface Config {
  port: number;
  token: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.BRIDGE_PORT ?? "9234");
  const token = env.BRIDGE_TOKEN ?? "";
  if (!token) {
    throw new Error(
      "BRIDGE_TOKEN is required. Set it in the MCP server config and in the extension options page.",
    );
  }
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`BRIDGE_PORT must be a valid port number, got: ${env.BRIDGE_PORT}`);
  }
  return { port, token };
}
```

- [ ] **Step 5: Run test to verify it passes** — Run: `npm test -- handshake`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server
git commit -m "feat(server): hello handshake validator + config loader"
```

### Task 1.4: `WsHost` (wires sockets → Bridge)

**Files:**
- Create: `server/src/wsHost.ts`, `server/test/wsHost.test.ts`

- [ ] **Step 1: Write the failing integration test** — `server/test/wsHost.test.ts`

```ts
import { describe, it, expect, afterEach } from "vitest";
import { WebSocket } from "ws";
import { Bridge } from "../src/bridge.js";
import { WsHost } from "../src/wsHost.js";

describe("WsHost", () => {
  let host: WsHost | undefined;
  afterEach(async () => {
    await host?.close();
    host = undefined;
  });

  function connect(port: number): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      ws.on("open", () => resolve(ws));
      ws.on("error", reject);
    });
  }

  it("accepts a valid token and routes a call to the extension", async () => {
    const bridge = new Bridge();
    host = new WsHost(bridge, { port: 0, token: "secret" });
    const port = await host.listen();

    const ws = await connect(port);
    ws.send(JSON.stringify({ type: "hello", token: "secret" }));
    // Echo any request straight back as a success result.
    ws.on("message", (raw) => {
      const req = JSON.parse(raw.toString());
      if (req.method) ws.send(JSON.stringify({ id: req.id, result: { echoed: req.method } }));
    });

    await new Promise((r) => setTimeout(r, 50)); // allow hello to register
    await expect(bridge.call("navigate", { url: "x" })).resolves.toEqual({ echoed: "navigate" });
    ws.close();
  });

  it("closes connections that send a bad token", async () => {
    const bridge = new Bridge();
    host = new WsHost(bridge, { port: 0, token: "secret" });
    const port = await host.listen();
    const ws = await connect(port);
    const closed = new Promise<number>((resolve) => ws.on("close", (code) => resolve(code)));
    ws.send(JSON.stringify({ type: "hello", token: "wrong" }));
    await expect(closed).resolves.toBeGreaterThan(0);
    expect(bridge.isConnected()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npm test -- wsHost`. Expected: FAIL.

- [ ] **Step 3: Implement `server/src/wsHost.ts`**

```ts
import { WebSocketServer, type WebSocket } from "ws";
import type { AddressInfo } from "node:net";
import { Bridge } from "./bridge.js";
import { ExtensionConnection } from "./connection.js";
import { validateHello } from "./handshake.js";

export interface WsHostOptions {
  port: number;
  token: string;
}

export class WsHost {
  private wss: WebSocketServer | undefined;

  constructor(
    private readonly bridge: Bridge,
    private readonly options: WsHostOptions,
  ) {}

  listen(): Promise<number> {
    return new Promise((resolve, reject) => {
      const wss = new WebSocketServer({ host: "127.0.0.1", port: this.options.port });
      wss.on("error", reject);
      wss.on("listening", () => {
        this.wss = wss;
        wss.off("error", reject);
        wss.on("connection", (ws) => this.onConnection(ws));
        resolve((wss.address() as AddressInfo).port);
      });
    });
  }

  private onConnection(ws: WebSocket): void {
    let authed = false;
    let connection: ExtensionConnection | undefined;

    ws.on("message", (raw) => {
      const data = raw.toString();
      if (!authed) {
        const result = validateHello(data, this.options.token);
        if (!result.ok) {
          ws.close(4001, result.reason);
          return;
        }
        authed = true;
        connection = new ExtensionConnection((d) => ws.send(d));
        this.bridge.setConnection(connection);
        return;
      }
      connection?.handleMessage(data);
    });

    ws.on("close", () => {
      if (connection) {
        connection.rejectAll("extension disconnected");
        this.bridge.setConnection(null);
      }
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.wss) return resolve();
      this.wss.close(() => resolve());
      for (const client of this.wss.clients) client.terminate();
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes** — Run: `npm test -- wsHost`. Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server
git commit -m "feat(server): WsHost binds 127.0.0.1, token gate, wires Bridge"
```

### Task 1.5: Tool registry + `browser_navigate`

**Files:**
- Create: `server/src/tools/registry.ts`, `server/test/tools.test.ts`

- [ ] **Step 1: Write the failing test** — `server/test/tools.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "../src/tools/registry.js";
import { Bridge } from "../src/bridge.js";

function fakeBridge(handler: (method: string, params?: any) => Promise<unknown>): Bridge {
  const bridge = new Bridge();
  vi.spyOn(bridge, "call").mockImplementation((m, p) => handler(m, p));
  return bridge;
}

describe("registerTools", () => {
  it("registers browser_navigate which calls bridge.navigate and returns text", async () => {
    const calls: Array<[string, any]> = [];
    const bridge = fakeBridge(async (m, p) => {
      calls.push([m, p]);
      return { url: p.url };
    });
    const server = new McpServer({ name: "test", version: "0.0.0" });
    registerTools(server, bridge);

    // Access the registered tool via the server's internal registry.
    const tool = (server as any)._registeredTools["browser_navigate"];
    expect(tool).toBeDefined();
    const res = await tool.callback({ url: "https://example.com" }, {});
    expect(calls).toEqual([["navigate", { url: "https://example.com" }]]);
    expect(res.content[0].text).toContain("https://example.com");
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npm test -- tools`. Expected: FAIL.

- [ ] **Step 3: Implement `server/src/tools/registry.ts`** (Milestone-1 subset; later tasks extend this same file)

```ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Bridge } from "../bridge.js";

function text(s: string) {
  return { content: [{ type: "text" as const, text: s }] };
}

export function registerTools(server: McpServer, bridge: Bridge): void {
  server.tool(
    "browser_navigate",
    "Navigate the active browser tab to a URL.",
    { url: z.string().url().describe("Absolute URL to navigate to") },
    async ({ url }) => {
      await bridge.call("navigate", { url });
      return text(`Navigated active tab to ${url}`);
    },
  );
}
```

- [ ] **Step 4: Run test to verify it passes** — Run: `npm test -- tools`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server
git commit -m "feat(server): tool registry + browser_navigate"
```

### Task 1.6: Server entry + esbuild

**Files:**
- Create: `server/src/index.ts`, `server/build.mjs`

- [ ] **Step 1: Implement `server/src/index.ts`**

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { Bridge } from "./bridge.js";
import { WsHost } from "./wsHost.js";
import { registerTools } from "./tools/registry.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const bridge = new Bridge();
  const host = new WsHost(bridge, config);
  const port = await host.listen();
  // stderr only — stdout is reserved for the MCP stdio transport.
  console.error(`[chrome-bridge] WebSocket host listening on 127.0.0.1:${port}`);

  const server = new McpServer({ name: "chrome-agent-bridge", version: "0.1.0" });
  registerTools(server, bridge);
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error("[chrome-bridge] fatal:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Implement `server/build.mjs`**

```js
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: "dist/index.js",
  banner: { js: "#!/usr/bin/env node" },
  // ws ships optional native deps it can run without; keep them external.
  external: ["bufferutil", "utf-8-validate"],
});
console.error("built server → dist/index.js");
```

- [ ] **Step 3: Build + smoke test** — Run: `npm run build -w server` then `BRIDGE_TOKEN=test node server/dist/index.js` (PowerShell: `$env:BRIDGE_TOKEN="test"; node server/dist/index.js`).
Expected: prints `WebSocket host listening on 127.0.0.1:9234` to stderr and waits (no crash). Ctrl-C to exit.

- [ ] **Step 4: Typecheck** — Run: `npm run typecheck`. Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add server
git commit -m "feat(server): MCP stdio entry + esbuild bundle"
```

### Task 1.7: Extension skeleton — manifest, client, router, navigate handler, service worker

**Files:**
- Create: `extension/package.json`, `extension/tsconfig.json`, `extension/manifest.json`, `extension/build.mjs`, `extension/src/client.ts`, `extension/src/router.ts`, `extension/src/tabs.ts`, `extension/src/handlers/navigate.ts`, `extension/src/sw.ts`, `extension/options.html`, `extension/src/options.ts`

> The `chrome.*` code below is verified manually (Step «E2E») — not unit tested. Write it completely and exactly.

- [ ] **Step 1: Create `extension/package.json`**

```json
{
  "name": "@bridge/extension",
  "version": "0.1.0",
  "type": "module",
  "scripts": { "build": "node build.mjs" }
}
```

- [ ] **Step 2: Create `extension/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "lib": ["ES2022", "DOM", "DOM.Iterable"], "types": ["chrome"] },
  "include": ["src"]
}
```

Then add `@types/chrome` to root dev deps: Run `npm install -D @types/chrome -w extension` (or root). Expected: installs.

- [ ] **Step 3: Create `extension/manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Chrome Agent Bridge",
  "version": "0.1.0",
  "description": "Bridges your real Chrome profile to a local MCP server for AI agent control.",
  "minimum_chrome_version": "116",
  "background": { "service_worker": "dist/sw.js", "type": "module" },
  "permissions": ["debugger", "tabs", "scripting", "activeTab", "alarms", "storage", "offscreen"],
  "host_permissions": ["<all_urls>"],
  "options_page": "options.html"
}
```

- [ ] **Step 4: Implement `extension/src/client.ts`** (reconnecting WS dial-out)

```ts
type MessageHandler = (data: string) => void;

export interface ClientOptions {
  url: string;
  token: string;
  onMessage: MessageHandler;
  onStatus?: (connected: boolean) => void;
}

export class ReconnectingClient {
  private ws: WebSocket | undefined;
  private closedByUs = false;
  private backoffMs = 500;

  constructor(private readonly opts: ClientOptions) {}

  start(): void {
    this.closedByUs = false;
    this.open();
  }

  stop(): void {
    this.closedByUs = true;
    this.ws?.close();
    this.ws = undefined;
  }

  send(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(data);
  }

  isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private open(): void {
    const ws = new WebSocket(this.opts.url);
    this.ws = ws;
    ws.onopen = () => {
      this.backoffMs = 500;
      ws.send(JSON.stringify({ type: "hello", token: this.opts.token }));
      this.opts.onStatus?.(true);
    };
    ws.onmessage = (ev) => this.opts.onMessage(String(ev.data));
    ws.onclose = () => {
      this.opts.onStatus?.(false);
      if (!this.closedByUs) this.scheduleReconnect();
    };
    ws.onerror = () => ws.close();
  }

  private scheduleReconnect(): void {
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, 10_000);
    setTimeout(() => {
      if (!this.closedByUs) this.open();
    }, delay);
  }
}
```

- [ ] **Step 5: Implement `extension/src/router.ts`** (method dispatch → response)

```ts
export type Handler = (params: Record<string, unknown>) => Promise<unknown>;

export class Router {
  private handlers = new Map<string, Handler>();

  on(method: string, handler: Handler): void {
    this.handlers.set(method, handler);
  }

  /** Returns the JSON string to send back, or null if the message was not a request. */
  async handle(data: string): Promise<string | null> {
    let msg: { id?: string; method?: string; params?: Record<string, unknown> };
    try {
      msg = JSON.parse(data);
    } catch {
      return null;
    }
    if (!msg.id || !msg.method) return null;
    const handler = this.handlers.get(msg.method);
    if (!handler) {
      return JSON.stringify({ id: msg.id, error: { message: `unknown method: ${msg.method}` } });
    }
    try {
      const result = await handler(msg.params ?? {});
      return JSON.stringify({ id: msg.id, result: result ?? { ok: true } });
    } catch (err) {
      return JSON.stringify({ id: msg.id, error: { message: (err as Error).message } });
    }
  }
}
```

- [ ] **Step 6: Implement `extension/src/tabs.ts`** (active-tab resolution + load wait)

```ts
export async function activeTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) throw new Error("No active tab in the last-focused window");
  return tab;
}

export function waitForLoad(tabId: number, timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error(`Timed out waiting for tab ${tabId} to load`));
    }, timeoutMs);
    function listener(id: number, info: chrome.tabs.TabChangeInfo): void {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}
```

- [ ] **Step 7: Implement `extension/src/handlers/navigate.ts`**

```ts
import { activeTab, waitForLoad } from "../tabs.js";

export async function navigate(params: Record<string, unknown>): Promise<{ ok: true; url: string }> {
  const url = String(params.url ?? "");
  if (!url) throw new Error("navigate requires a url");
  const tab = await activeTab();
  await chrome.tabs.update(tab.id!, { url });
  await waitForLoad(tab.id!);
  return { ok: true, url };
}
```

- [ ] **Step 8: Implement `extension/src/sw.ts`** (service worker: config, client, router, keepalive)

```ts
import { ReconnectingClient } from "./client.js";
import { Router } from "./router.js";
import { navigate } from "./handlers/navigate.js";

const DEFAULT_PORT = 9234;
const router = new Router();
router.on("navigate", navigate);

let client: ReconnectingClient | undefined;

async function getConfig(): Promise<{ port: number; token: string }> {
  const { port, token } = await chrome.storage.local.get(["port", "token"]);
  return { port: Number(port) || DEFAULT_PORT, token: String(token ?? "") };
}

async function connect(): Promise<void> {
  const { port, token } = await getConfig();
  if (!token) {
    console.warn("[bridge] no token set — open the extension options page to configure.");
    return;
  }
  client?.stop();
  client = new ReconnectingClient({
    url: `ws://127.0.0.1:${port}`,
    token,
    onMessage: async (data) => {
      const reply = await router.handle(data);
      if (reply) client!.send(reply);
    },
    onStatus: (connected) => console.error(`[bridge] connection: ${connected ? "up" : "down"}`),
  });
  client.start();
}

// Connect on install and on browser startup.
chrome.runtime.onInstalled.addListener(() => void connect());
chrome.runtime.onStartup.addListener(() => void connect());

// Keepalive: wake the SW periodically and ensure the socket is up.
chrome.alarms.create("keepalive", { periodInMinutes: 0.41 }); // ~25s
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepalive" && !client?.isOpen()) void connect();
});

// Reconnect when options change the token/port.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.token || changes.port)) void connect();
});

// Kick off immediately when the SW first loads.
void connect();
```

- [ ] **Step 9: Implement `extension/options.html` + `extension/src/options.ts`**

`extension/options.html`:
```html
<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Chrome Agent Bridge — Options</title></head>
  <body>
    <h1>Chrome Agent Bridge</h1>
    <label>Port <input id="port" type="number" value="9234" /></label><br />
    <label>Token <input id="token" type="password" size="40" /></label><br />
    <button id="save">Save</button>
    <span id="status"></span>
    <script type="module" src="dist/options.js"></script>
  </body>
</html>
```

`extension/src/options.ts`:
```ts
const portEl = document.getElementById("port") as HTMLInputElement;
const tokenEl = document.getElementById("token") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLSpanElement;

chrome.storage.local.get(["port", "token"]).then(({ port, token }) => {
  if (port) portEl.value = String(port);
  if (token) tokenEl.value = String(token);
});

document.getElementById("save")!.addEventListener("click", async () => {
  await chrome.storage.local.set({ port: Number(portEl.value), token: tokenEl.value });
  statusEl.textContent = "Saved.";
  setTimeout(() => (statusEl.textContent = ""), 1500);
});
```

- [ ] **Step 10: Implement `extension/build.mjs`**

```js
import { build } from "esbuild";
import { cp } from "node:fs/promises";

await build({
  entryPoints: {
    sw: "src/sw.ts",
    options: "src/options.ts",
  },
  bundle: true,
  format: "esm",
  target: "chrome116",
  outdir: "dist",
});
await cp("options.html", "dist/../options.html", { force: true }); // options.html already at root
console.error("built extension → dist/");
```

> Note: `options.html` lives at the extension root and references `dist/options.js`; the `cp` line is a no-op placeholder kept for symmetry if the file is later moved. Manifest paths are root-relative.

- [ ] **Step 11: Build** — Run: `npm run build -w extension`. Expected: `dist/sw.js`, `dist/options.js` produced. Run `npm run typecheck`. Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add extension
git commit -m "feat(extension): MV3 skeleton — client, router, navigate, SW, options"
```

### Task 1.8: Milestone 1 manual E2E verification

- [ ] **Step 1: Generate a token** — pick any random string, e.g. `openssl rand -hex 16` (or any 32-char string). Call it `<TOKEN>`.

- [ ] **Step 2: Start the server** — PowerShell: `$env:BRIDGE_TOKEN="<TOKEN>"; node server/dist/index.js`. Expected: stderr shows it listening on `127.0.0.1:9234`.

- [ ] **Step 3: Load the extension** — open `chrome://extensions`, enable Developer Mode, "Load unpacked", select the `extension/` folder. Expected: "Chrome Agent Bridge" loads with no errors. Open its service-worker console; expect `connection: up` once the token is set.

- [ ] **Step 4: Configure the extension** — open the extension's Options, set Port `9234` and Token `<TOKEN>`, Save. Expected: SW console logs `connection: up`; server stderr unchanged (still listening).

- [ ] **Step 5: Drive a navigate from the MCP client** — register the server in an MCP client (Claude Desktop/Code) with env `BRIDGE_TOKEN=<TOKEN>`, OR use the MCP Inspector: `npx @modelcontextprotocol/inspector node server/dist/index.js` with `BRIDGE_TOKEN` set. Call `browser_navigate` with `{"url":"https://example.com"}`.
Expected: the active tab in your real Chrome navigates to example.com; the tool returns "Navigated active tab to https://example.com".

- [ ] **Step 6: Record the result** — if it works, Milestone 1 is done. If not, debug via the SW console + server stderr before proceeding.

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "test(e2e): milestone 1 walking skeleton verified"
```

---

## Milestone 2: Perception (snapshot + screenshot)

Goal: `browser_snapshot` returns an accessibility outline with refs; `browser_screenshot` returns the viewport image.

### Task 2.1: `RefMap` (id ↔ element registry)

**Files:**
- Create: `extension/src/content/refmap.ts`, `extension/test/refmap.test.ts`

- [ ] **Step 1: Write the failing test** — `extension/test/refmap.test.ts`

```ts
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { RefMap } from "../src/content/refmap.js";

describe("RefMap", () => {
  it("assigns stable incrementing refs and resolves them", () => {
    const map = new RefMap();
    const a = document.createElement("button");
    const b = document.createElement("a");
    expect(map.add(a)).toBe("e1");
    expect(map.add(b)).toBe("e2");
    expect(map.get("e1")).toBe(a);
    expect(map.get("e2")).toBe(b);
  });
  it("returns the same ref for the same element within a generation", () => {
    const map = new RefMap();
    const a = document.createElement("button");
    expect(map.add(a)).toBe("e1");
    expect(map.add(a)).toBe("e1");
  });
  it("reset clears the map and restarts numbering", () => {
    const map = new RefMap();
    map.add(document.createElement("button"));
    map.reset();
    expect(map.add(document.createElement("a"))).toBe("e1");
    expect(map.get("e2")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npm test -- refmap`. Expected: FAIL.

- [ ] **Step 3: Implement `extension/src/content/refmap.ts`**

```ts
export class RefMap {
  private byRef = new Map<string, Element>();
  private byEl = new WeakMap<Element, string>();
  private counter = 0;

  add(el: Element): string {
    const existing = this.byEl.get(el);
    if (existing) return existing;
    const ref = `e${++this.counter}`;
    this.byRef.set(ref, el);
    this.byEl.set(el, ref);
    return ref;
  }

  get(ref: string): Element | undefined {
    return this.byRef.get(ref);
  }

  reset(): void {
    this.byRef.clear();
    this.byEl = new WeakMap();
    this.counter = 0;
  }
}
```

- [ ] **Step 4: Run test to verify it passes** — Run: `npm test -- refmap`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add extension
git commit -m "feat(extension): RefMap id/element registry"
```

### Task 2.2: `buildSnapshot` (accessibility outline)

**Files:**
- Create: `extension/src/content/snapshot.ts`, `extension/test/snapshot.test.ts`

- [ ] **Step 1: Write the failing test** — `extension/test/snapshot.test.ts`

```ts
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { buildSnapshot } from "../src/content/snapshot.js";
import { RefMap } from "../src/content/refmap.js";

describe("buildSnapshot", () => {
  it("lists interactive elements with role, accessible name, and ref", () => {
    document.body.innerHTML = `
      <input type="text" aria-label="Email" />
      <button>Sign in</button>
      <a href="/forgot">Forgot password?</a>
      <p>not interactive</p>
    `;
    const map = new RefMap();
    const { text } = buildSnapshot(document, map);
    expect(text).toContain('textbox "Email" [ref=e1]');
    expect(text).toContain('button "Sign in" [ref=e2]');
    expect(text).toContain('link "Forgot password?" [ref=e3]');
    expect(text).not.toContain("not interactive");
  });

  it("skips hidden elements", () => {
    document.body.innerHTML = `<button style="display:none">Hidden</button><button>Shown</button>`;
    const map = new RefMap();
    const { text } = buildSnapshot(document, map);
    expect(text).not.toContain("Hidden");
    expect(text).toContain('button "Shown"');
  });

  it("returns a refs count matching the listed elements", () => {
    document.body.innerHTML = `<button>A</button><button>B</button>`;
    const map = new RefMap();
    const { count } = buildSnapshot(document, map);
    expect(count).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npm test -- snapshot`. Expected: FAIL.

- [ ] **Step 3: Implement `extension/src/content/snapshot.ts`**

```ts
import { RefMap } from "./refmap.js";

interface RoleRule {
  role: string;
  match: (el: Element) => boolean;
}

const RULES: RoleRule[] = [
  { role: "textbox", match: (el) => el.matches('input:not([type]),input[type="text"],input[type="email"],input[type="search"],input[type="url"],input[type="tel"],input[type="password"],textarea') },
  { role: "checkbox", match: (el) => el.matches('input[type="checkbox"]') },
  { role: "radio", match: (el) => el.matches('input[type="radio"]') },
  { role: "combobox", match: (el) => el.matches("select") },
  { role: "button", match: (el) => el.matches('button,input[type="button"],input[type="submit"],[role="button"]') },
  { role: "link", match: (el) => el.matches("a[href],[role=link]") },
];

function roleOf(el: Element): string | null {
  for (const rule of RULES) if (rule.match(el)) return rule.role;
  return null;
}

function isVisible(el: Element): boolean {
  const style = (el.ownerDocument.defaultView ?? window).getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  return true;
}

function accessibleName(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();
  if (el instanceof HTMLInputElement && el.placeholder) return el.placeholder.trim();
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  return text;
}

export interface Snapshot {
  text: string;
  count: number;
}

export function buildSnapshot(doc: Document, refs: RefMap): Snapshot {
  refs.reset();
  const lines: string[] = [];
  const all = doc.body ? Array.from(doc.body.querySelectorAll("*")) : [];
  for (const el of all) {
    const role = roleOf(el);
    if (!role) continue;
    if (!isVisible(el)) continue;
    const ref = refs.add(el);
    const name = accessibleName(el);
    lines.push(`- ${role} "${name}" [ref=${ref}]`);
  }
  const header = `url: ${doc.location?.href ?? ""}   title: ${JSON.stringify(doc.title)}`;
  return { text: `${header}\n${lines.join("\n")}`, count: lines.length };
}
```

- [ ] **Step 4: Run test to verify it passes** — Run: `npm test -- snapshot`. Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add extension
git commit -m "feat(extension): buildSnapshot accessibility outline"
```

### Task 2.3: Content entry + injection helper + perceive handler

**Files:**
- Create: `extension/src/content/actions.ts` (stub for now), `extension/src/content/index.ts`, `extension/src/inject.ts`, `extension/src/handlers/perceive.ts`
- Modify: `extension/src/sw.ts` (register snapshot + screenshot), `extension/build.mjs` (add content entry)

- [ ] **Step 1: Implement `extension/src/content/actions.ts`** (placeholder — filled in Milestone 3)

```ts
import { RefMap } from "./refmap.js";

// Action implementations are added in Milestone 3; declared here so the
// content bundle's public surface is stable.
export function clickRef(_refs: RefMap, _ref: string): { ok: true } {
  throw new Error("clickRef not implemented until Milestone 3");
}
```

- [ ] **Step 2: Implement `extension/src/content/index.ts`** (attaches `window.__agentBridge`, idempotent)

```ts
import { buildSnapshot } from "./snapshot.js";
import { RefMap } from "./refmap.js";

declare global {
  interface Window {
    __agentBridge?: {
      refs: RefMap;
      snapshot: () => { text: string; count: number };
    };
  }
}

if (!window.__agentBridge) {
  const refs = new RefMap();
  window.__agentBridge = {
    refs,
    snapshot: () => buildSnapshot(document, refs),
  };
}
```

- [ ] **Step 3: Implement `extension/src/inject.ts`** (ensure content script + call in page)

```ts
export async function ensureContent(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["dist/content.js"],
  });
}

export async function callInPage<T>(
  tabId: number,
  fn: (...args: unknown[]) => T,
  args: unknown[] = [],
): Promise<T> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: fn,
    args,
    world: "ISOLATED",
  });
  if (result?.result === undefined) throw new Error("page function returned no result");
  return result.result as T;
}
```

- [ ] **Step 4: Implement `extension/src/handlers/perceive.ts`**

```ts
import { activeTab } from "../tabs.js";
import { ensureContent, callInPage } from "../inject.js";

export async function snapshot(): Promise<{ text: string; count: number }> {
  const tab = await activeTab();
  await ensureContent(tab.id!);
  return callInPage(tab.id!, () => window.__agentBridge!.snapshot());
}

export async function screenshot(params: Record<string, unknown>): Promise<{ dataUrl: string }> {
  const tab = await activeTab();
  // Viewport capture — no debugger banner. fullPage is handled in Milestone 4.
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  void params;
  return { dataUrl };
}
```

- [ ] **Step 5: Modify `extension/build.mjs`** — add `content` entry point

```js
  entryPoints: {
    sw: "src/sw.ts",
    options: "src/options.ts",
    content: "src/content/index.ts",
  },
```

- [ ] **Step 6: Modify `extension/src/sw.ts`** — register the new handlers

Add imports near the top:
```ts
import { snapshot, screenshot } from "./handlers/perceive.js";
```
Add registrations next to `router.on("navigate", navigate);`:
```ts
router.on("snapshot", snapshot);
router.on("screenshot", screenshot);
```

- [ ] **Step 7: Build + typecheck** — Run: `npm run build -w extension && npm run typecheck`. Expected: `dist/content.js` produced; no type errors.

- [ ] **Step 8: Commit**

```bash
git add extension
git commit -m "feat(extension): content entry, injection helpers, snapshot+screenshot handlers"
```

### Task 2.4: Server tools `browser_snapshot` + `browser_screenshot`

**Files:**
- Modify: `server/src/tools/registry.ts`
- Modify: `server/test/tools.test.ts` (add cases)

- [ ] **Step 1: Add failing tests** — append to `server/test/tools.test.ts`

```ts
import { describe as describe2, it as it2, expect as expect2 } from "vitest";

describe2("perception tools", () => {
  it2("browser_snapshot returns the snapshot text", async () => {
    const bridge = fakeBridge(async () => ({ text: "url: x\n- button \"Go\" [ref=e1]", count: 1 }));
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    const tool = (server as any)._registeredTools["browser_snapshot"];
    const res = await tool.callback({}, {});
    expect2(res.content[0].text).toContain("[ref=e1]");
  });

  it2("browser_screenshot returns image content", async () => {
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    const bridge = fakeBridge(async () => ({ dataUrl: png }));
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    const tool = (server as any)._registeredTools["browser_screenshot"];
    const res = await tool.callback({}, {});
    expect2(res.content[0].type).toBe("image");
    expect2(res.content[0].mimeType).toBe("image/png");
    expect2(res.content[0].data.startsWith("iVBOR")).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure** — Run: `npm test -- tools`. Expected: FAIL (tools not registered).

- [ ] **Step 3: Extend `server/src/tools/registry.ts`** — add inside `registerTools`, after `browser_navigate`:

```ts
  server.tool("browser_snapshot", "Capture an accessibility snapshot of the active tab with element refs.", {}, async () => {
    const result = (await bridge.call("snapshot")) as { text: string };
    return text(result.text);
  });

  server.tool(
    "browser_screenshot",
    "Capture a screenshot of the active tab's viewport.",
    { fullPage: z.boolean().optional().describe("Capture the full scrollable page (Milestone 4)") },
    async ({ fullPage }) => {
      const result = (await bridge.call("screenshot", { fullPage: fullPage ?? false })) as { dataUrl: string };
      const base64 = result.dataUrl.replace(/^data:image\/png;base64,/, "");
      return { content: [{ type: "image" as const, data: base64, mimeType: "image/png" }] };
    },
  );
```

- [ ] **Step 4: Run to verify pass** — Run: `npm test -- tools`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server
git commit -m "feat(server): browser_snapshot + browser_screenshot tools"
```

### Task 2.5: Milestone 2 manual E2E verification

- [ ] **Step 1:** Rebuild both: `npm run build`. Reload the extension at `chrome://extensions`.
- [ ] **Step 2:** Via MCP Inspector (server running with `BRIDGE_TOKEN`), navigate to a real login page, then call `browser_snapshot`. Expected: a text outline listing the page's inputs/buttons/links with `[ref=eN]`.
- [ ] **Step 3:** Call `browser_screenshot`. Expected: a PNG of the current viewport is returned and renders.
- [ ] **Step 4:** Commit any fixes: `git commit -am "test(e2e): milestone 2 perception verified"`.

---

## Milestone 3: Actions (content-script path) + tabs + history

Goal: click/type/scroll/select/hover/press_key act on refs; tab tools list/select/new/close; back/forward.

### Task 3.1: Content-script action implementations

**Files:**
- Modify: `extension/src/content/actions.ts`, `extension/src/content/index.ts`
- Create: `extension/test/actions.test.ts`

- [ ] **Step 1: Write failing tests** — `extension/test/actions.test.ts`

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { RefMap } from "../src/content/refmap.js";
import { clickRef, typeRef, selectOptionRef } from "../src/content/actions.js";

function withRef(el: Element): { refs: RefMap; ref: string } {
  const refs = new RefMap();
  document.body.appendChild(el);
  return { refs, ref: refs.add(el) };
}

describe("content actions", () => {
  it("clickRef dispatches a click on the element", () => {
    const btn = document.createElement("button");
    const spy = vi.fn();
    btn.addEventListener("click", spy);
    const { refs, ref } = withRef(btn);
    expect(clickRef(refs, ref)).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledOnce();
  });

  it("typeRef sets the value and fires input/change", () => {
    const input = document.createElement("input");
    const events: string[] = [];
    input.addEventListener("input", () => events.push("input"));
    input.addEventListener("change", () => events.push("change"));
    const { refs, ref } = withRef(input);
    typeRef(refs, ref, "hello", false);
    expect(input.value).toBe("hello");
    expect(events).toContain("input");
  });

  it("selectOptionRef selects by visible label", () => {
    const sel = document.createElement("select");
    for (const v of ["A", "B"]) {
      const o = document.createElement("option");
      o.textContent = v;
      o.value = v;
      sel.appendChild(o);
    }
    const { refs, ref } = withRef(sel);
    selectOptionRef(refs, ref, ["B"]);
    expect(sel.value).toBe("B");
  });

  it("throws a re-snapshot error for an unknown ref", () => {
    const refs = new RefMap();
    expect(() => clickRef(refs, "e99")).toThrow(/re-snapshot/);
  });
});
```

- [ ] **Step 2: Run to verify failure** — Run: `npm test -- actions`. Expected: FAIL.

- [ ] **Step 3: Implement `extension/src/content/actions.ts`** (replace the placeholder file)

```ts
import { RefMap } from "./refmap.js";

function resolve(refs: RefMap, ref: string): Element {
  const el = refs.get(ref);
  if (!el) throw new Error(`ref ${ref} not found — call browser_snapshot to re-snapshot`);
  return el;
}

export function clickRef(refs: RefMap, ref: string): { ok: true } {
  const el = resolve(refs, ref) as HTMLElement;
  el.scrollIntoView({ block: "center", inline: "center" });
  el.click();
  return { ok: true };
}

export function typeRef(refs: RefMap, ref: string, value: string, submit: boolean): { ok: true } {
  const el = resolve(refs, ref) as HTMLInputElement | HTMLTextAreaElement;
  el.focus();
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  if (submit) {
    const form = (el as HTMLInputElement).form;
    if (form) form.requestSubmit();
    else el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  }
  return { ok: true };
}

export function scrollRef(refs: RefMap, ref: string | undefined, direction: string): { ok: true } {
  if (ref) {
    (resolve(refs, ref) as HTMLElement).scrollIntoView({ block: "center" });
  } else {
    const delta = direction === "up" ? -window.innerHeight : window.innerHeight;
    window.scrollBy({ top: delta * 0.9, behavior: "instant" as ScrollBehavior });
  }
  return { ok: true };
}

export function hoverRef(refs: RefMap, ref: string): { ok: true } {
  const el = resolve(refs, ref) as HTMLElement;
  el.scrollIntoView({ block: "center" });
  el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
  return { ok: true };
}

export function selectOptionRef(refs: RefMap, ref: string, values: string[]): { ok: true } {
  const el = resolve(refs, ref) as HTMLSelectElement;
  const wanted = new Set(values);
  let matched = false;
  for (const opt of Array.from(el.options)) {
    const on = wanted.has(opt.value) || wanted.has(opt.textContent?.trim() ?? "");
    opt.selected = on;
    if (on) matched = true;
  }
  if (!matched) throw new Error(`no option matched ${JSON.stringify(values)}`);
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return { ok: true };
}
```

- [ ] **Step 4: Run to verify pass** — Run: `npm test -- actions`. Expected: PASS (4 tests).

- [ ] **Step 5: Wire actions into `extension/src/content/index.ts`** — replace its body with:

```ts
import { buildSnapshot } from "./snapshot.js";
import { RefMap } from "./refmap.js";
import { clickRef, typeRef, scrollRef, hoverRef, selectOptionRef } from "./actions.js";

declare global {
  interface Window {
    __agentBridge?: {
      refs: RefMap;
      snapshot: () => { text: string; count: number };
      click: (ref: string) => { ok: true };
      type: (ref: string, value: string, submit: boolean) => { ok: true };
      scroll: (ref: string | undefined, direction: string) => { ok: true };
      hover: (ref: string) => { ok: true };
      selectOption: (ref: string, values: string[]) => { ok: true };
    };
  }
}

if (!window.__agentBridge) {
  const refs = new RefMap();
  window.__agentBridge = {
    refs,
    snapshot: () => buildSnapshot(document, refs),
    click: (ref) => clickRef(refs, ref),
    type: (ref, value, submit) => typeRef(refs, ref, value, submit),
    scroll: (ref, direction) => scrollRef(refs, ref, direction),
    hover: (ref) => hoverRef(refs, ref),
    selectOption: (ref, values) => selectOptionRef(refs, ref, values),
  };
}
```

- [ ] **Step 6: Build + typecheck** — Run: `npm run build -w extension && npm run typecheck`. Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add extension
git commit -m "feat(extension): content-script click/type/scroll/hover/select actions"
```

### Task 3.2: Action + history + tab handlers (SW side)

**Files:**
- Create: `extension/src/handlers/actions.ts`, `extension/src/handlers/history.ts`, `extension/src/handlers/tabs.ts`
- Modify: `extension/src/sw.ts`

- [ ] **Step 1: Implement `extension/src/handlers/actions.ts`**

```ts
import { activeTab } from "../tabs.js";
import { ensureContent, callInPage } from "../inject.js";

async function inActiveTab<T>(fn: (...args: unknown[]) => T, args: unknown[]): Promise<T> {
  const tab = await activeTab();
  await ensureContent(tab.id!);
  return callInPage(tab.id!, fn, args);
}

export const click = (p: Record<string, unknown>) =>
  inActiveTab((ref) => window.__agentBridge!.click(ref as string), [p.ref]);

export const type = (p: Record<string, unknown>) =>
  inActiveTab(
    (ref, value, submit) => window.__agentBridge!.type(ref as string, value as string, submit as boolean),
    [p.ref, p.text, p.submit ?? false],
  );

export const scroll = (p: Record<string, unknown>) =>
  inActiveTab(
    (ref, dir) => window.__agentBridge!.scroll(ref as string | undefined, dir as string),
    [p.ref, p.direction ?? "down"],
  );

export const hover = (p: Record<string, unknown>) =>
  inActiveTab((ref) => window.__agentBridge!.hover(ref as string), [p.ref]);

export const selectOption = (p: Record<string, unknown>) =>
  inActiveTab(
    (ref, values) => window.__agentBridge!.selectOption(ref as string, values as string[]),
    [p.ref, p.values],
  );

export async function pressKey(p: Record<string, unknown>): Promise<{ ok: true }> {
  const tab = await activeTab();
  await ensureContent(tab.id!);
  await callInPage(
    tab.id!,
    (key) => {
      const el = (document.activeElement ?? document.body) as HTMLElement;
      for (const t of ["keydown", "keyup"]) el.dispatchEvent(new KeyboardEvent(t, { key: key as string, bubbles: true }));
      return { ok: true };
    },
    [p.key],
  );
  return { ok: true };
}
```

- [ ] **Step 2: Implement `extension/src/handlers/history.ts`**

```ts
import { activeTab } from "../tabs.js";

export async function back(): Promise<{ ok: true }> {
  const tab = await activeTab();
  await chrome.tabs.goBack(tab.id!);
  return { ok: true };
}

export async function forward(): Promise<{ ok: true }> {
  const tab = await activeTab();
  await chrome.tabs.goForward(tab.id!);
  return { ok: true };
}
```

- [ ] **Step 3: Implement `extension/src/handlers/tabs.ts`**

```ts
import { waitForLoad } from "../tabs.js";

export async function listTabs(): Promise<{ tabs: Array<{ id: number; title: string; url: string; active: boolean }> }> {
  const tabs = await chrome.tabs.query({});
  return {
    tabs: tabs
      .filter((t) => t.id !== undefined)
      .map((t) => ({ id: t.id!, title: t.title ?? "", url: t.url ?? "", active: t.active ?? false })),
  };
}

export async function selectTab(p: Record<string, unknown>): Promise<{ ok: true }> {
  const id = Number(p.id);
  const tab = await chrome.tabs.get(id);
  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(id, { active: true });
  return { ok: true };
}

export async function newTab(p: Record<string, unknown>): Promise<{ id: number }> {
  const url = p.url ? String(p.url) : undefined;
  const tab = await chrome.tabs.create({ url, active: true });
  if (url) await waitForLoad(tab.id!);
  return { id: tab.id! };
}

export async function closeTab(p: Record<string, unknown>): Promise<{ ok: true }> {
  await chrome.tabs.remove(Number(p.id));
  return { ok: true };
}
```

- [ ] **Step 4: Register all handlers in `extension/src/sw.ts`** — add imports + registrations:

```ts
import { click, type as typeText, scroll, hover, selectOption, pressKey } from "./handlers/actions.js";
import { back, forward } from "./handlers/history.js";
import { listTabs, selectTab, newTab, closeTab } from "./handlers/tabs.js";
```
```ts
router.on("click", click);
router.on("type", typeText);
router.on("scroll", scroll);
router.on("hover", hover);
router.on("selectOption", selectOption);
router.on("pressKey", pressKey);
router.on("back", back);
router.on("forward", forward);
router.on("listTabs", listTabs);
router.on("selectTab", selectTab);
router.on("newTab", newTab);
router.on("closeTab", closeTab);
```

- [ ] **Step 5: Build + typecheck** — Run: `npm run build -w extension && npm run typecheck`. Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add extension
git commit -m "feat(extension): action, history, and tab SW handlers"
```

### Task 3.3: Server tools for actions/history/tabs

**Files:**
- Modify: `server/src/tools/registry.ts`
- Modify: `server/test/tools.test.ts`

- [ ] **Step 1: Add a representative failing test** — append to `server/test/tools.test.ts`

```ts
import { describe as d3, it as i3, expect as e3 } from "vitest";

d3("action tools", () => {
  i3("browser_click forwards the ref to bridge.click", async () => {
    const calls: Array<[string, any]> = [];
    const bridge = fakeBridge(async (m, p) => {
      calls.push([m, p]);
      return { ok: true };
    });
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    const tool = (server as any)._registeredTools["browser_click"];
    await tool.callback({ ref: "e5" }, {});
    e3(calls).toEqual([["click", { ref: "e5" }]]);
  });

  i3("browser_list_tabs renders the tab list as text", async () => {
    const bridge = fakeBridge(async () => ({ tabs: [{ id: 1, title: "A", url: "http://a", active: true }] }));
    const server = new McpServer({ name: "t", version: "0" });
    registerTools(server, bridge);
    const tool = (server as any)._registeredTools["browser_list_tabs"];
    const res = await tool.callback({}, {});
    e3(res.content[0].text).toContain("[1]");
    e3(res.content[0].text).toContain("A");
  });
});
```

- [ ] **Step 2: Run to verify failure** — Run: `npm test -- tools`. Expected: FAIL.

- [ ] **Step 3: Extend `server/src/tools/registry.ts`** — add after the perception tools:

```ts
  server.tool("browser_click", "Click the element with the given ref (from a snapshot).", { ref: z.string() }, async ({ ref }) => {
    await bridge.call("click", { ref });
    return text(`Clicked ${ref}`);
  });

  server.tool(
    "browser_type",
    "Type text into the element with the given ref. Optionally submit.",
    { ref: z.string(), text: z.string(), submit: z.boolean().optional() },
    async ({ ref, text: value, submit }) => {
      await bridge.call("type", { ref, text: value, submit: submit ?? false });
      return text(`Typed into ${ref}`);
    },
  );

  server.tool(
    "browser_press_key",
    "Press a key (e.g. Enter, Escape, Tab) on the focused element.",
    { key: z.string() },
    async ({ key }) => {
      await bridge.call("pressKey", { key });
      return text(`Pressed ${key}`);
    },
  );

  server.tool(
    "browser_scroll",
    "Scroll to a ref, or scroll the page up/down.",
    { ref: z.string().optional(), direction: z.enum(["up", "down"]).optional() },
    async ({ ref, direction }) => {
      await bridge.call("scroll", { ref, direction: direction ?? "down" });
      return text("Scrolled");
    },
  );

  server.tool("browser_hover", "Hover the element with the given ref.", { ref: z.string() }, async ({ ref }) => {
    await bridge.call("hover", { ref });
    return text(`Hovered ${ref}`);
  });

  server.tool(
    "browser_select_option",
    "Select option(s) in a <select> by value or visible label.",
    { ref: z.string(), values: z.array(z.string()).min(1) },
    async ({ ref, values }) => {
      await bridge.call("selectOption", { ref, values });
      return text(`Selected ${values.join(", ")} in ${ref}`);
    },
  );

  server.tool("browser_back", "Navigate the active tab back in history.", {}, async () => {
    await bridge.call("back");
    return text("Went back");
  });

  server.tool("browser_forward", "Navigate the active tab forward in history.", {}, async () => {
    await bridge.call("forward");
    return text("Went forward");
  });

  server.tool("browser_list_tabs", "List all open tabs.", {}, async () => {
    const { tabs } = (await bridge.call("listTabs")) as {
      tabs: Array<{ id: number; title: string; url: string; active: boolean }>;
    };
    const lines = tabs.map((t) => `[${t.id}]${t.active ? "*" : " "} ${t.title} — ${t.url}`);
    return text(lines.join("\n"));
  });

  server.tool("browser_select_tab", "Make a tab active by id (the new control target).", { id: z.number() }, async ({ id }) => {
    await bridge.call("selectTab", { id });
    return text(`Selected tab ${id}`);
  });

  server.tool("browser_new_tab", "Open a new tab and make it active.", { url: z.string().url().optional() }, async ({ url }) => {
    const { id } = (await bridge.call("newTab", { url })) as { id: number };
    return text(`Opened tab ${id}`);
  });

  server.tool("browser_close_tab", "Close a tab by id.", { id: z.number() }, async ({ id }) => {
    await bridge.call("closeTab", { id });
    return text(`Closed tab ${id}`);
  });
```

- [ ] **Step 4: Run to verify pass** — Run: `npm test -- tools`. Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add server
git commit -m "feat(server): action, history, and tab MCP tools"
```

### Task 3.4: Milestone 3 manual E2E verification

- [ ] **Step 1:** `npm run build`; reload the extension.
- [ ] **Step 2:** Snapshot a form page; `browser_type` into an input ref; `browser_click` a button ref. Expected: the page reacts (text entered, button activates).
- [ ] **Step 3:** `browser_list_tabs`, then `browser_select_tab` a different tab; `browser_snapshot` reflects the newly active tab. `browser_new_tab` and `browser_close_tab` work.
- [ ] **Step 4:** Commit fixes: `git commit -am "test(e2e): milestone 3 actions verified"`.

---

## Milestone 4: Trusted input fallback + full-page screenshot

Goal: when a content-script action is ineffective or `trusted:true` is requested, escalate to `chrome.debugger` CDP input; full-page screenshots via `Page.captureScreenshot`.

### Task 4.1: `chrome.debugger` session helper + coordinate math

**Files:**
- Create: `extension/src/debugger.ts`, `extension/src/content/geometry.ts`, `extension/test/geometry.test.ts`

- [ ] **Step 1: Write failing test for coordinate math** — `extension/test/geometry.test.ts`

```ts
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { centerOf } from "../src/content/geometry.js";

describe("centerOf", () => {
  it("returns the center point of a rect", () => {
    const el = document.createElement("div");
    el.getBoundingClientRect = () => ({ x: 10, y: 20, width: 100, height: 40, top: 20, left: 10, right: 110, bottom: 60, toJSON() {} });
    expect(centerOf(el)).toEqual({ x: 60, y: 40 });
  });
});
```

- [ ] **Step 2: Run to verify failure** — Run: `npm test -- geometry`. Expected: FAIL.

- [ ] **Step 3: Implement `extension/src/content/geometry.ts`**

```ts
export function centerOf(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
}
```

Also add a page-context helper to `extension/src/content/index.ts` (extend the `__agentBridge` object and its type) returning a ref's center, used by the SW for CDP clicks:
```ts
    centerOf: (ref: string) => {
      const el = refs.get(ref);
      if (!el) throw new Error(`ref ${ref} not found — call browser_snapshot to re-snapshot`);
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    },
```
(and add `centerOf: (ref: string) => { x: number; y: number };` to the `Window["__agentBridge"]` type.)

- [ ] **Step 4: Run to verify pass** — Run: `npm test -- geometry`. Expected: PASS.

- [ ] **Step 5: Implement `extension/src/debugger.ts`**

```ts
const PROTOCOL = "1.3";

async function send(tabId: number, method: string, params: object = {}): Promise<unknown> {
  return chrome.debugger.sendCommand({ tabId }, method, params);
}

export async function withDebugger<T>(tabId: number, fn: () => Promise<T>): Promise<T> {
  await chrome.debugger.attach({ tabId }, PROTOCOL);
  try {
    return await fn();
  } finally {
    try {
      await chrome.debugger.detach({ tabId });
    } catch {
      /* already detached */
    }
  }
}

export async function trustedClick(tabId: number, x: number, y: number): Promise<void> {
  await send(tabId, "Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1, buttons: 1 });
  await send(tabId, "Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1, buttons: 0 });
}

export async function trustedType(tabId: number, text: string): Promise<void> {
  for (const ch of text) {
    await send(tabId, "Input.dispatchKeyEvent", { type: "keyDown", text: ch });
    await send(tabId, "Input.dispatchKeyEvent", { type: "keyUp", text: ch });
  }
}

export async function fullPageScreenshot(tabId: number): Promise<string> {
  return withDebugger(tabId, async () => {
    const { data } = (await send(tabId, "Page.captureScreenshot", { captureBeyondViewport: true, format: "png" })) as {
      data: string;
    };
    return `data:image/png;base64,${data}`;
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add extension
git commit -m "feat(extension): chrome.debugger trusted-input + full-page screenshot helpers"
```

### Task 4.2: Wire escalation into click/type + fullPage screenshot

**Files:**
- Modify: `extension/src/handlers/actions.ts`, `extension/src/handlers/perceive.ts`

- [ ] **Step 1: Add escalation to `click` in `extension/src/handlers/actions.ts`** — replace the `click` export with:

```ts
import { withDebugger, trustedClick } from "../debugger.js";

export async function click(p: Record<string, unknown>): Promise<{ ok: true }> {
  const tab = await activeTab();
  await ensureContent(tab.id!);
  const trusted = p.trusted === true;
  if (!trusted) {
    try {
      await callInPage(tab.id!, (ref) => window.__agentBridge!.click(ref as string), [p.ref]);
      return { ok: true };
    } catch {
      /* fall through to trusted input */
    }
  }
  const { x, y } = await callInPage<{ x: number; y: number }>(
    tab.id!,
    (ref) => window.__agentBridge!.centerOf(ref as string),
    [p.ref],
  );
  await withDebugger(tab.id!, () => trustedClick(tab.id!, x, y));
  return { ok: true };
}
```

- [ ] **Step 2: Add `fullPage` branch to `screenshot` in `extension/src/handlers/perceive.ts`** — replace `screenshot` with:

```ts
import { fullPageScreenshot } from "../debugger.js";

export async function screenshot(params: Record<string, unknown>): Promise<{ dataUrl: string }> {
  const tab = await activeTab();
  if (params.fullPage === true) {
    return { dataUrl: await fullPageScreenshot(tab.id!) };
  }
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  return { dataUrl };
}
```

- [ ] **Step 3: Add `trusted` param to `browser_click`** in `server/src/tools/registry.ts`:

```ts
  server.tool(
    "browser_click",
    "Click the element with the given ref. Set trusted=true to force real CDP input (shows the debugging banner).",
    { ref: z.string(), trusted: z.boolean().optional() },
    async ({ ref, trusted }) => {
      await bridge.call("click", { ref, trusted: trusted ?? false });
      return text(`Clicked ${ref}`);
    },
  );
```
(Replace the Milestone-3 `browser_click` registration with this one.)

- [ ] **Step 4: Build + typecheck + test** — Run: `npm run build && npm run typecheck && npm test`. Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: trusted-input click escalation + full-page screenshot"
```

### Task 4.3: Milestone 4 manual E2E verification

- [ ] **Step 1:** Reload extension. Call `browser_click` with `{ "ref": "...", "trusted": true }` on a button. Expected: the "an extension is debugging this browser" banner appears; the click registers; banner clears after the action.
- [ ] **Step 2:** Call `browser_screenshot` with `{ "fullPage": true }` on a long page. Expected: a full-page PNG (taller than the viewport).
- [ ] **Step 3:** Commit fixes: `git commit -am "test(e2e): milestone 4 trusted input verified"`.

---

## Milestone 5: Hardening (offscreen keepalive, reconnection UX, install docs)

### Task 5.1: Offscreen-document WebSocket host

**Files:**
- Create: `extension/offscreen.html`, `extension/src/offscreen.ts`
- Modify: `extension/src/sw.ts` (delegate the socket to the offscreen doc), `extension/build.mjs`

- [ ] **Step 1: Create `extension/offscreen.html`**

```html
<!doctype html>
<html><head><meta charset="utf-8" /></head><body><script type="module" src="dist/offscreen.js"></script></body></html>
```

- [ ] **Step 2: Implement `extension/src/offscreen.ts`** — holds the `ReconnectingClient`; relays messages to/from the SW via `chrome.runtime` messaging

```ts
import { ReconnectingClient } from "./client.js";

let client: ReconnectingClient | undefined;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== "offscreen") return false;
  if (msg.type === "connect") {
    client?.stop();
    client = new ReconnectingClient({
      url: `ws://127.0.0.1:${msg.port}`,
      token: msg.token,
      onMessage: (data) => chrome.runtime.sendMessage({ target: "sw", type: "ws-message", data }),
      onStatus: (connected) => chrome.runtime.sendMessage({ target: "sw", type: "ws-status", connected }),
    });
    client.start();
    sendResponse({ ok: true });
  } else if (msg.type === "send") {
    client?.send(msg.data);
    sendResponse({ ok: true });
  }
  return true;
});
```

- [ ] **Step 3: Modify `extension/src/sw.ts`** — replace direct `ReconnectingClient` usage with offscreen orchestration:

```ts
async function ensureOffscreen(): Promise<void> {
  const existing = await chrome.offscreen.hasDocument?.();
  if (existing) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.WORKERS ?? ("WORKERS" as chrome.offscreen.Reason)],
    justification: "Maintain a persistent WebSocket to the local MCP bridge server.",
  });
}

async function connect(): Promise<void> {
  const { port, token } = await getConfig();
  if (!token) return;
  await ensureOffscreen();
  await chrome.runtime.sendMessage({ target: "offscreen", type: "connect", port, token });
}

// Route messages coming back from the offscreen document.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.target !== "sw") return;
  if (msg.type === "ws-message") {
    void router.handle(msg.data).then((reply) => {
      if (reply) void chrome.runtime.sendMessage({ target: "offscreen", type: "send", data: reply });
    });
  }
});
```
(Remove the old inline `client` variable and its `onMessage` wiring; keep the alarm + storage-change listeners calling `connect()`.)

- [ ] **Step 4: Add `offscreen` entry to `extension/build.mjs`**

```js
    offscreen: "src/offscreen.ts",
```

- [ ] **Step 5: Build + typecheck** — Run: `npm run build -w extension && npm run typecheck`. Expected: clean.

- [ ] **Step 6: Manual verify** — reload extension; confirm `connection: up`; leave Chrome idle 2+ minutes, then call `browser_snapshot`. Expected: still connected (offscreen kept the socket alive).

- [ ] **Step 7: Commit**

```bash
git add extension
git commit -m "feat(extension): offscreen-document WebSocket for robust MV3 keepalive"
```

### Task 5.2: Install + usage docs

**Files:**
- Create: `docs/setup.md`
- Modify: `README.md` (link setup)

- [ ] **Step 1: Write `docs/setup.md`** covering: prerequisites (Node 20+, Chrome 116+); `npm install && npm run build`; generating a token; registering the MCP server in Claude Desktop/Code with `BRIDGE_TOKEN`/`BRIDGE_PORT` env; loading the unpacked extension; setting token+port in Options; the full tool list; the debugging-banner note; and a troubleshooting section ("extension not connected", DevTools conflict, banner won't clear).

Concrete MCP registration block to include:
```json
{
  "mcpServers": {
    "chrome-agent-bridge": {
      "command": "node",
      "args": ["<absolute-path-to-repo>/server/dist/index.js"],
      "env": { "BRIDGE_TOKEN": "<your-token>", "BRIDGE_PORT": "9234" }
    }
  }
}
```

- [ ] **Step 2: Link it from `README.md`** under Documentation.

- [ ] **Step 3: Commit**

```bash
git add docs README.md
git commit -m "docs: setup + usage guide"
```

### Task 5.3: Final full-suite verification

- [ ] **Step 1:** Run `npm test && npm run typecheck && npm run build`. Expected: all green, both bundles built.
- [ ] **Step 2:** Full E2E pass: navigate → snapshot → type → click → screenshot → switch tab → trusted click. Expected: all succeed against the real profile.
- [ ] **Step 3:** Commit: `git commit -am "chore: final verification pass"`.

---

## Self-review notes (author)

- **Spec coverage:** every §7 tool has a task (1.5, 2.4, 3.3, 4.2); hybrid perception → M2+M4; action fallback → M4.1/4.2; channel/handshake/token → 1.1–1.4; keepalive MVP → 1.7 (alarms) and hardened → 5.1 (offscreen); security token → 1.3 + handshake 1.4; active-tab targeting → `tabs.ts` (1.7) + tab tools (3.x); error handling → Bridge "not connected", router error envelope, ref re-snapshot errors, timeouts; testing strategy → unit TDD on logic units + manual E2E gates; repo layout matches §14.
- **Type consistency:** `__agentBridge` surface defined once in `content/index.ts` and grows with each milestone (snapshot → +actions → +centerOf); handler method names (`navigate`, `snapshot`, `click`, …) match the `router.on(...)` keys and the `bridge.call(...)` strings exactly.
- **Known intentional gaps:** chrome-API handlers are verified by manual E2E, not unit tests (documented above); `world: "ISOLATED"` is used consistently so the RefMap persists between snapshot and action calls on the same page.
```
