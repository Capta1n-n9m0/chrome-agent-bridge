// recipes/t5-actor.ts: a headless Claude session that stays connected between prompts, for the T5
// rows whose leases must outlive one turn (LEASE-1, LEASE-4, SCREEN-3 (b), BG-3). A plain
// `claude -p "<prompt>"` exits after its turn, its MCP exits with it, and the daemon releases that
// client's leases — so a lease could never be seen by a second actor. This host keeps one
// `claude -p --input-format stream-json` process alive and feeds it prompts.
// Written 2026-10-22 before any run (T5 wave sheet, docs/plans/2026-10-21-step7-multi-actor-tabs-steps/T5-wave-sheet.md).
//
//   npx tsx recipes/t5-actor.ts start <name> --tools <t1,t2,...> [--model sonnet]
//                                   spawn the session (detached host); --tools names the exact bridge
//                                   tools the actor's rows use (e.g. browser_snapshot,browser_click),
//                                   each allowed as mcp__chrome-agent-bridge__<tool>; no other tool runs
//                                   without a prompt, and in -p mode a prompt is a refusal (verifier m7)
//   npx tsx recipes/t5-actor.ts send <name> "<prompt>" [--timeout <s>]
//                                   one turn; prints every tool call and its result verbatim
//   npx tsx recipes/t5-actor.ts end <name>                      close its stdin: the session and its
//                                   MCP exit normally (never a tree kill: on Windows a tree kill of
//                                   the daemon's spawner kills the daemon, CLAUDE.md)
//   npx tsx recipes/t5-actor.ts status                          every actor: host pid, claude pid, ended?
//
// Files: $T5_ACTORS (default %TEMP%\bridge-e2e\actors)\<name>\{in.txt, out.jsonl, err.txt, pids.json,
// end, exit.txt}. out.jsonl wraps each stream-json line as {"t":"<iso>","m":<line>}. The session's own
// transcript is also in ~/.claude/projects/<repo>/<session id>.jsonl (the id is in the init line).
// The actor is `claude -p --model <m> --allowedTools mcp__chrome-agent-bridge` in the repo root, so its
// MCP is the user's configured chrome-agent-bridge entry (mcp/dist/index.js) and its client name is
// `claude-code #<mcp pid>`. This script never reads or prints the token.
import { spawn } from "node:child_process";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.T5_ACTORS?.trim() || join(tmpdir(), "bridge-e2e", "actors");
const CLAUDE = process.env.T5_CLAUDE?.trim() || "claude";

const [command = "", name = "", ...rest] = process.argv.slice(2);
const dir = (n: string): string => join(BASE, n);
const stamp = (): string => new Date().toISOString();

function option(key: string, fallback: string): string {
  const i = rest.indexOf(key);
  return i >= 0 && i + 1 < rest.length ? rest[i + 1] : fallback;
}

function requireName(): string {
  if (!/^[A-Za-z0-9_-]+$/.test(name)) throw new Error("actor name: letters, digits, _ and - only");
  return name;
}

// ------------------------------------------------------------------------------------- host (detached)

function host(): void {
  const d = dir(requireName());
  const model = option("--model", "sonnet");
  const tools = option("--tools", "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `mcp__chrome-agent-bridge__${t}`);
  const out = join(d, "out.jsonl");
  const errFd = openSync(join(d, "err.txt"), "a");
  const child = spawn(
    CLAUDE,
    ["-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--model", model, "--allowedTools", ...tools],
    { cwd: ROOT, stdio: ["pipe", "pipe", errFd], windowsHide: true },
  );
  writeFileSync(join(d, "pids.json"), JSON.stringify({ host: process.pid, claude: child.pid ?? null, model, tools, started: stamp() }));
  let buf = "";
  child.stdout!.setEncoding("utf8");
  child.stdout!.on("data", (chunk: string) => {
    buf += chunk;
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let m: unknown;
      try {
        m = JSON.parse(line);
      } catch {
        m = { unparsed: line };
      }
      appendFileSync(out, JSON.stringify({ t: stamp(), m }) + "\n");
    }
  });
  let sent = 0;
  let ended = false;
  const timer = setInterval(() => {
    const inFile = join(d, "in.txt");
    if (existsSync(inFile)) {
      const lines = readFileSync(inFile, "utf8").split("\n");
      // Only complete lines (the last element is what follows the final newline).
      for (; sent < lines.length - 1; sent++) {
        const prompt = lines[sent].trim();
        if (!prompt) continue;
        child.stdin!.write(JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "text", text: prompt }] } }) + "\n");
      }
    }
    if (!ended && existsSync(join(d, "end"))) {
      ended = true;
      child.stdin!.end();
    }
  }, 200);
  // "close", not "exit": every stdout chunk has been read by then (verifier n3).
  child.on("close", (code, signal) => {
    clearInterval(timer);
    writeFileSync(join(d, "exit.txt"), `${stamp()} exit code ${code ?? "null"}${signal ? ` signal ${signal}` : ""}\n`);
    closeSync(errFd);
    process.exit(0);
  });
}

// ------------------------------------------------------------------------------------- driver commands

function start(): void {
  const n = requireName();
  const d = dir(n);
  if (existsSync(join(d, "pids.json")) && !existsSync(join(d, "exit.txt"))) throw new Error(`actor ${n} is already running (${d})`);
  mkdirSync(d, { recursive: true });
  // A fresh start: an earlier run's files would confuse `send` (it counts result lines) and `end`.
  for (const f of ["in.txt", "out.jsonl", "end", "exit.txt", "pids.json", "err.txt"]) rmSync(join(d, f), { force: true });
  // No inherited stdio: a detached child holding the caller's pipe kept a PowerShell call open in W1
  // (CLAUDE.md gotcha), so the host gets "ignore" for all three.
  const tools = option("--tools", "");
  if (!/^browser_[a-z_]+(,browser_[a-z_]+)*$/.test(tools)) throw new Error("start needs --tools <browser_x,browser_y,...>: the exact bridge tools this actor may use");
  const h = spawn(process.execPath, ["--import", "tsx", fileURLToPath(import.meta.url), "host", n, "--model", option("--model", "sonnet"), "--tools", tools], {
    cwd: ROOT,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  h.unref();
  const t0 = Date.now();
  const wait = (): void => {
    if (existsSync(join(d, "pids.json")) && readFileSync(join(d, "pids.json"), "utf8").trim()) {
      const p = JSON.parse(readFileSync(join(d, "pids.json"), "utf8")) as { host: number; claude: number | null; model: string; tools: string[] };
      console.log(`${stamp()} actor ${n}: started — host pid ${p.host}, claude pid ${p.claude ?? "?"}, model ${p.model}, tools ${p.tools.join(" ")}; files in ${d}`);
      return;
    }
    if (Date.now() - t0 > 15_000) {
      console.log(`${stamp()} actor ${n}: FAILED — the host did not start within 15 s (see ${join(d, "err.txt")})`);
      process.exitCode = 1;
      return;
    }
    setTimeout(wait, 200);
  };
  wait();
}

interface Wrapped {
  t: string;
  m: Record<string, unknown>;
}

function readOut(n: string): Wrapped[] {
  const f = join(dir(n), "out.jsonl");
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Wrapped);
}

const isResult = (w: Wrapped): boolean => w.m.type === "result";

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return JSON.stringify(content);
  return content
    .map((c: Record<string, unknown>) => {
      if (c.type === "text") return String(c.text);
      if (c.type === "image") return `[image ${String((c.source as Record<string, unknown> | undefined)?.data ?? "").length} base64 chars]`;
      return JSON.stringify(c);
    })
    .join("\n");
}

/** Prints the turn's tool calls and results, verbatim, with the host's receive times. */
function printTurn(lines: Wrapped[]): void {
  for (const w of lines) {
    const m = w.m;
    if (m.type === "system" && m.subtype === "init") console.log(`${w.t} INIT session ${String(m.session_id)} · mcp ${JSON.stringify(m.mcp_servers ?? [])}`);
    const msg = m.message as { content?: unknown } | undefined;
    if (!msg || !Array.isArray(msg.content)) {
      if (isResult(w)) console.log(`${w.t} RESULT-OF-TURN ${String(m.subtype ?? "")} · ${String(m.result ?? "").replace(/\n/g, " ⏎ ")}`);
      continue;
    }
    for (const c of msg.content as Array<Record<string, unknown>>) {
      if (m.type === "assistant" && c.type === "tool_use") console.log(`${w.t} TOOL ${String(c.name)} ${JSON.stringify(c.input)}`);
      if (m.type === "user" && c.type === "tool_result") {
        console.log(`${w.t} OUTPUT${c.is_error ? " (isError)" : ""}:`);
        for (const l of textOf(c.content).split("\n")) console.log(`    ${l}`);
      }
      if (m.type === "assistant" && c.type === "text") console.log(`${w.t} SAYS ${String(c.text).replace(/\n/g, " ⏎ ")}`);
    }
  }
}

function send(): void {
  const n = requireName();
  const prompt = rest.filter((a, i) => !(a === "--timeout" || rest[i - 1] === "--timeout")).join(" ").replace(/\s*\n\s*/g, " ").trim();
  if (!prompt) throw new Error('usage: send <name> "<prompt>"');
  const d = dir(n);
  if (!existsSync(join(d, "pids.json")) || existsSync(join(d, "exit.txt"))) throw new Error(`actor ${n} is not running`);
  const timeout = Number(option("--timeout", "300")) * 1000;
  const before = readOut(n);
  const results = before.filter(isResult).length;
  appendFileSync(join(d, "in.txt"), prompt + "\n");
  console.log(`${stamp()} SENT to ${n}: ${prompt}`);
  const t0 = Date.now();
  const poll = (): void => {
    const now = readOut(n);
    if (now.filter(isResult).length > results) {
      printTurn(now.slice(before.length));
      return;
    }
    if (existsSync(join(d, "exit.txt")) && readFileSync(join(d, "exit.txt"), "utf8").trim()) {
      printTurn(now.slice(before.length));
      console.log(`${stamp()} actor ${n} exited: ${readFileSync(join(d, "exit.txt"), "utf8").trim()}`);
      process.exitCode = 1;
      return;
    }
    if (Date.now() - t0 > timeout) {
      printTurn(now.slice(before.length));
      console.log(`${stamp()} TIMEOUT after ${timeout / 1000} s waiting for ${n}'s turn to end`);
      process.exitCode = 1;
      return;
    }
    setTimeout(poll, 250);
  };
  poll();
}

function end(): void {
  const n = requireName();
  const d = dir(n);
  writeFileSync(join(d, "end"), stamp());
  const t0 = Date.now();
  const poll = (): void => {
    if (existsSync(join(d, "exit.txt")) && readFileSync(join(d, "exit.txt"), "utf8").trim()) {
      console.log(`${stamp()} actor ${n} ended after ${Date.now() - t0} ms: ${readFileSync(join(d, "exit.txt"), "utf8").trim()}`);
      return;
    }
    if (Date.now() - t0 > 30_000) {
      console.log(`${stamp()} actor ${n}: did not exit within 30 s of closing its stdin (find its pids in ${join(d, "pids.json")}; Test-SafeToKill before any kill)`);
      process.exitCode = 1;
      return;
    }
    setTimeout(poll, 250);
  };
  poll();
}

function status(): void {
  if (!existsSync(BASE)) {
    console.log("no actors");
    return;
  }
  for (const n of readdirSync(BASE)) {
    const d = dir(n);
    const pids = existsSync(join(d, "pids.json")) ? readFileSync(join(d, "pids.json"), "utf8").trim() : "";
    const exit = existsSync(join(d, "exit.txt")) ? readFileSync(join(d, "exit.txt"), "utf8").trim() : "";
    console.log(`${n}: ${pids || "no pids"} · ${exit ? `ended (${exit})` : "running or never started"}`);
  }
}

const commands: Record<string, () => void> = { host, start, send, end, status };
const cmd = commands[command];
if (!cmd) {
  console.log("usage: npx tsx recipes/t5-actor.ts <start|send|end|status> <name> ...");
  process.exitCode = 2;
} else {
  try {
    cmd();
  } catch (err) {
    console.log(`${stamp()} t5-actor ${command}: FAILED — ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}
