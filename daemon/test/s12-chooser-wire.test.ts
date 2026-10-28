// Step 12 S5c (#355) over real sockets on port 0: a fake extension's hello without "uploadChooser" gets
// `uploadFiles {chooser}` refused VERSION (CHOOSER_RELOAD_HINT), 0 frames forwarded; without `chooser` it is forwarded.
import { describe, it, expect, afterEach } from "vitest";
import { WebSocket } from "ws";
import { Bridge } from "../src/bridge.js";
import { WsHost } from "../src/wsHost.js";
import { CHOOSER_RELOAD_HINT } from "../src/intercept.js";
type Frame = Record<string, any>;
const TOKEN = "s5c-wire-token";
async function peer(port: number, hello: Frame, answer?: (f: Frame) => unknown) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`), frames: Frame[] = [];
  const next = (pred: (f: Frame) => boolean) => new Promise<Frame>((r) => {
    const t = setInterval(() => { const f = frames.find(pred); if (f) { clearInterval(t); r(f); } }, 5);
  });
  ws.on("message", (raw) => {
    const f = JSON.parse(raw.toString()) as Frame;
    frames.push(f);
    if (answer && typeof f.id === "string" && f.method) ws.send(JSON.stringify({ id: f.id, result: answer(f) }));
  });
  await new Promise((r) => ws.on("open", r));
  ws.send(JSON.stringify({ type: "hello", token: TOKEN, proto: 2, ...hello }));
  await next((f) => f.type === "welcome");
  return { ws, frames, next, call: (id: string, method: string, params: Frame) =>
    (ws.send(JSON.stringify({ id, method, params })), next((f) => f.id === id)) };
}

describe("S5c — the chooser VERSION rule over a real WsHost on port 0", () => {
  let host: WsHost | undefined;
  afterEach(async () => { await host?.close(); host = undefined; });
  for (const features of [undefined, ["evaluateArgs"], ["evaluateArgs", "uploadChooser"]]) {
    it(`extension hello features ${JSON.stringify(features)}`, async () => {
      host = new WsHost(new Bridge(), { port: 0, token: TOKEN, build: "b", log: () => {} });
      const port = await host.listen();
      const ext = await peer(port, { role: "extension", ...(features && { features }) }, (f) =>
        f.method === "listTabs" ? { tabs: [{ id: 41, title: "", url: "", active: true, current: true }] } : { files: [] });
      const c = await peer(port, { role: "client", name: "A" });
      const tab = (await c.call("c1", "tabs.claim", { active: true })).result.tab;
      const up = { tab, ref: "e1", paths: ["C:\\up\\x.txt"] };
      const refused = (await c.call("c2", "uploadFiles", { ...up, chooser: true })).error, uploads = () =>
        ext.frames.filter((f) => f.method === "uploadFiles");
      if (features?.includes("uploadChooser")) expect(uploads()[0]?.params).toEqual({ tabId: 41, ref: "e1", paths: up.paths, chooser: true });
      else expect([refused, uploads().length]).toEqual([{ code: "VERSION", message: CHOOSER_RELOAD_HINT }, 0]);
      expect((await c.call("c3", "uploadFiles", up)).result).toEqual({ files: [] });
      expect(uploads().at(-1)?.params).toEqual({ tabId: 41, ref: "e1", paths: up.paths });
      c.ws.terminate(); ext.ws.terminate();
    });
  }
});
