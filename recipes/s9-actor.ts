// recipes/s9-actor.ts — a headless Claude session (an MCP actor) for Step 9's live wave (Run 13; docs/e2e-test-plan.md
// §4.20). Written 2026-10-24 by the S4 prep builder, before the Step 9 build was loaded; not run by its author.
// It is recipes/t5-actor.ts's persistent host (one `claude -p --input-format stream-json` process fed prompt by
// prompt, so the MCP's cursor and leases outlive a turn), changed in three ways:
//   - the session gets an MCP config naming only chrome-agent-bridge (`--strict-mcp-config --mcp-config <file>`,
//     the file written by `start` into the actor's directory: node + mcp/dist/index.js, no token, no env) and
//     `--allowedTools mcp__chrome-agent-bridge` (LESSONS: the actors are headless sessions with that config);
//   - each tool result is printed item by item (`[1/2] …`), so the record shows whether browser_status's `Safety:`
//     line arrived as its own text item (decisions.md · 2026-10-24 · S3: `browser_status`'s Safety line is a second
//     text item … (#162), whose Revisit-if this reads), with a `SAFETY-DELIVERY` line per result that has one;
//   - `extract` writes the whole transcript as text, for the count-grep before any line of it is quoted.
//
//   node --import tsx recipes/s9-actor.ts start <name> [--model sonnet]
//   node --import tsx recipes/s9-actor.ts send <name> "<prompt>" [--timeout <s>]
//   node --import tsx recipes/s9-actor.ts end <name>
//   node --import tsx recipes/s9-actor.ts extract <name> --out <file>
//   node --import tsx recipes/s9-actor.ts status
//
// Use `node --import tsx`, not npx (cmd.exe refuses a command line over 8191 characters; CLAUDE.md). Files:
// $S9_ACTORS (default %TEMP%\bridge-e2e\s9-actors)\<name>\{mcp.json, in.txt, out.jsonl, err.txt, pids.json, end,
// exit.txt} — outside the repo; transcripts are never committed whole (wave sheet: only quoted lines, after
// `s9.ts scan-file … --mode committed`). Never `end` by a tree kill (CLAUDE.md: it can kill the daemon).
import { spawn } from "node:child_process";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { actorArgs, mcpConfig, safetyDelivery, toolResultItems } from "./s9-rules.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.S9_ACTORS?.trim() || join(tmpdir(), "bridge-e2e", "s9-actors");
const CLAUDE = process.env.S9_CLAUDE?.trim() || "claude";

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

function host(): void {
  const d = dir(requireName());
  const model = option("--model", "sonnet");
  const cfg = join(d, "mcp.json");
  const out = join(d, "out.jsonl");
  const errFd = openSync(join(d, "err.txt"), "a");
  // shell:false; on Windows `claude` resolves through PATHEXT only with a shell, so S9_CLAUDE may name claude.exe.
  const child = spawn(CLAUDE, actorArgs(model, cfg), { cwd: ROOT, stdio: ["pipe", "pipe", errFd], windowsHide: true });
  writeFileSync(join(d, "pids.json"), JSON.stringify({ host: process.pid, claude: child.pid ?? null, model, started: stamp() }));
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
  child.on("close", (code, signal) => {
    clearInterval(timer);
    writeFileSync(join(d, "exit.txt"), `${stamp()} exit code ${code ?? "null"}${signal ? ` signal ${signal}` : ""}\n`);
    closeSync(errFd);
    process.exit(0);
  });
}

function start(): void {
  const n = requireName();
  const d = dir(n);
  if (existsSync(join(d, "pids.json")) && !existsSync(join(d, "exit.txt"))) throw new Error(`actor ${n} is already running (${d})`);
  mkdirSync(d, { recursive: true });
  for (const f of ["in.txt", "out.jsonl", "end", "exit.txt", "pids.json", "err.txt", "mcp.json"]) rmSync(join(d, f), { force: true });
  writeFileSync(join(d, "mcp.json"), JSON.stringify(mcpConfig(process.execPath, join(ROOT, "mcp", "dist", "index.js")), null, 2));
  const h = spawn(process.execPath, ["--import", "tsx", fileURLToPath(import.meta.url), "host", n, "--model", option("--model", "sonnet")], {
    cwd: ROOT,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  h.unref();
  const t0 = Date.now();
  const wait = (): void => {
    if (existsSync(join(d, "pids.json")) && readFileSync(join(d, "pids.json"), "utf8").trim()) {
      const p = JSON.parse(readFileSync(join(d, "pids.json"), "utf8")) as { host: number; claude: number | null; model: string };
      console.log(`${stamp()} actor ${n}: started — host pid ${p.host}, claude pid ${p.claude ?? "?"}, model ${p.model}, MCP config ${join(d, "mcp.json")} (chrome-agent-bridge only)`);
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

/** The turn's tool calls and results, verbatim, item by item, with the host's receive times. */
function turnLines(lines: Wrapped[]): string[] {
  const out: string[] = [];
  for (const w of lines) {
    const m = w.m;
    if (m.type === "system" && m.subtype === "init") out.push(`${w.t} INIT session ${String(m.session_id)} · mcp ${JSON.stringify(m.mcp_servers ?? [])}`);
    const msg = m.message as { content?: unknown } | undefined;
    if (!msg || !Array.isArray(msg.content)) {
      if (isResult(w)) out.push(`${w.t} RESULT-OF-TURN ${String(m.subtype ?? "")} · ${String(m.result ?? "").replace(/\n/g, " ⏎ ")}`);
      continue;
    }
    for (const c of msg.content as Array<Record<string, unknown>>) {
      if (m.type === "assistant" && c.type === "tool_use") out.push(`${w.t} TOOL ${String(c.name)} ${JSON.stringify(c.input)}`);
      if (m.type === "user" && c.type === "tool_result") {
        const items = toolResultItems(c.content);
        out.push(`${w.t} OUTPUT${c.is_error ? " (isError)" : ""} — ${items.count} item(s): ${items.types.join(",")}`);
        const texts = typeof c.content === "string" ? [c.content] : Array.isArray(c.content) ? (c.content as Array<Record<string, unknown>>) : [];
        texts.forEach((item, i) => {
          const label = `[${i + 1}/${items.count}]`;
          if (typeof item === "string") for (const l of item.split("\n")) out.push(`    ${label} ${l}`);
          else if (item.type === "text") for (const l of String(item.text).split("\n")) out.push(`    ${label} ${l}`);
          else if (item.type === "image") out.push(`    ${label} [image]`);
          else out.push(`    ${label} ${JSON.stringify(item)}`);
        });
        const safety = items.texts.flatMap((t) => t.split("\n")).find((l) => l.startsWith("Safety: "));
        if (safety) {
          const d = safetyDelivery(c.content, safety);
          out.push(`    SAFETY-DELIVERY ${d.where}${d.where === "item" ? ` (text item ${d.index + 1} of ${items.count})` : ""}`);
        }
      }
      if (m.type === "assistant" && c.type === "text") out.push(`${w.t} SAYS ${String(c.text).replace(/\n/g, " ⏎ ")}`);
    }
  }
  return out;
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
    const print = (): void => turnLines(now.slice(before.length)).forEach((l) => console.log(l));
    if (now.filter(isResult).length > results) return print();
    if (existsSync(join(d, "exit.txt")) && readFileSync(join(d, "exit.txt"), "utf8").trim()) {
      print();
      console.log(`${stamp()} actor ${n} exited: ${readFileSync(join(d, "exit.txt"), "utf8").trim()}`);
      process.exitCode = 1;
      return;
    }
    if (Date.now() - t0 > timeout) {
      print();
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
      console.log(`${stamp()} actor ${n}: did not exit within 30 s of closing its stdin (pids in ${join(d, "pids.json")}; Test-SafeToKill before any kill)`);
      process.exitCode = 1;
      return;
    }
    setTimeout(poll, 250);
  };
  poll();
}

function extract(): void {
  const n = requireName();
  const outFile = option("--out", "");
  if (!outFile) throw new Error("extract needs --out <file>");
  writeFileSync(outFile, turnLines(readOut(n)).join("\n") + "\n");
  console.log(`${stamp()} actor ${n}: transcript written to ${outFile} — count-grep it (s9.ts scan-file … --mode committed) before quoting any line`);
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

const commands: Record<string, () => void> = { host, start, send, end, extract, status };
const cmd = commands[command];
if (!cmd) {
  console.log("usage: node --import tsx recipes/s9-actor.ts <start|send|end|extract|status> <name> ...");
  process.exitCode = 2;
} else {
  try {
    cmd();
  } catch (err) {
    console.log(`${stamp()} s9-actor ${command}: FAILED — ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}
