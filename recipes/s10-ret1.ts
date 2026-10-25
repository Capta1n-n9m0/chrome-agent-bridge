// recipes/s10-ret1.ts — RET-1's SDK holder (Step 10 phase doc 0.7 with Stage 0 F16; docs/e2e-test-plan.md §4.22 RET-1).
// Written 2026-10-25 by the S7 prep builder. PREPARED, NOT RUN: RET-1 kills and relaunches the user's real Chrome, which
// waits for the user's grant G10-2; the Run 15 runner never runs this file. The driver is recipes/s10-ret1.ps1.
//
//   node --import tsx recipes/s10-ret1.ts hold        (in the background, started by s10-ret1.ps1)
//   node --import tsx recipes/s10-ret1.ts judge --since <iso> --found "<safety tuple line>"
//   node --import tsx recipes/s10-ret1.ts cleanup     closes any restored ?s15=ret1 fixture tab (never another tab)
//
// hold: one client, `s10-ret1-holder`, opens its own fixture tab (http://localhost:8080/e2e-playground.html?s15=ret1, a
// lease of reason "opened"), writes <OUT>\ret1.json {handle, url} and <OUT>\RET-1.ready, then waits (≤ 10 min) for
// the driver's <OUT>\RET-1.pressed (written after Chrome was relaunched and the extension reconnected); meanwhile it
// records every `tabGone`. Then it waits ≤ 30 s for the tabGone of its handle and calls `snapshot` on the old Tab.
// Its lines: `ROW RET-1 holder …`, `ROW RET-1 tabGone …`, `ROW RET-1 old-tab <CODE> …`. It prints fixture URLs only.
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { BridgeError, connect } from "@bridge/sdk";
import { logLinesSince, type Outcome } from "./s9-rules.js";
import { checkLine10, retiredCount, ret1Verdict, rowLine10, show10, stopLine10 } from "./s10-rules.js";

const OUT = process.env.S10_OUT?.trim() || process.env.S9_OUT?.trim() || join(tmpdir(), "bridge-e2e", "s15");
const URL_RET1 = "http://localhost:8080/e2e-playground.html?s15=ret1";
const [command = "", ...rest] = process.argv.slice(2);
const option = (f: string): string | undefined => (rest.indexOf(f) >= 0 ? rest[rest.indexOf(f) + 1] : undefined);
const iso = (): string => new Date().toISOString();
const say = (m: string): void => console.log(`${iso()} ${m}`);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function hold(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  rmSync(join(OUT, "RET-1.pressed"), { force: true });
  const c = await connect({ name: "s10-ret1-holder", failureReports: false });
  const gone: Array<{ at: string; p: { tab?: string; lastUrl?: string } }> = [];
  c.on("tabGone", (p) => gone.push({ at: iso(), p }));
  try {
    const tab = await c.newTab(URL_RET1);
    await tab.waitFor({ text: "Agent Bridge E2E Playground" });
    writeFileSync(join(OUT, "ret1.json"), JSON.stringify({ handle: tab.handle, url: URL_RET1 }));
    say(`ROW RET-1 holder ${tab.handle} at ${URL_RET1} (held by s10-ret1-holder)`);
    writeFileSync(join(OUT, "RET-1.ready"), iso());
    say("READY RET-1");
    const t0 = Date.now();
    while (!existsSync(join(OUT, "RET-1.pressed")) && Date.now() - t0 < 600_000) await sleep(200);
    if (!existsSync(join(OUT, "RET-1.pressed"))) throw new Error("the driver did not signal the relaunch within 10 min");
    const t1 = Date.now();
    while (!gone.some((g) => g.p.tab === tab.handle) && Date.now() - t1 < 30_000) await sleep(200);
    const g = gone.find((x) => x.p.tab === tab.handle);
    say(`ROW RET-1 tabGone ${g ? `${JSON.stringify({ tab: g.p.tab, lastUrl: show10(g.p.lastUrl) })} at ${g.at}` : "none for the held handle within 30 s"} (all tabGone events: ${gone.length})`);
    writeFileSync(join(OUT, "ret1-gone.json"), JSON.stringify(g ? g.p : null));
    const s0 = Date.now();
    let after: Outcome;
    try {
      await tab.snapshot();
      after = { ok: true, ms: Date.now() - s0 };
    } catch (err) {
      after = err instanceof BridgeError ? { ok: false, code: String(err.code), message: err.message, data: err.data, ms: Date.now() - s0 } : { ok: false, code: "SCRIPT", message: String(err), ms: Date.now() - s0 };
    }
    say(rowLine10("RET-1", "old-tab", after));
    writeFileSync(join(OUT, "ret1-after.json"), JSON.stringify(after));
  } finally {
    c.close();
  }
}

async function judge(): Promise<void> {
  const since = option("--since");
  const found = option("--found");
  if (!since || !found) throw new Error("judge --since <iso> --found <the found safety tuple line>");
  const log = join(homedir(), ".chrome-agent-bridge", "daemon.log");
  const lines = existsSync(log) ? logLinesSince(readFileSync(log, "utf8").split(/\r?\n/), since) : [];
  const retired = retiredCount(lines);
  const held = JSON.parse(readFileSync(join(OUT, "ret1.json"), "utf8")) as { handle: string; url: string };
  const gone = JSON.parse(readFileSync(join(OUT, "ret1-gone.json"), "utf8")) as { tab?: string; lastUrl?: string } | null;
  const after = JSON.parse(readFileSync(join(OUT, "ret1-after.json"), "utf8")) as Outcome;
  const c = await connect({ name: "s10-ret1-judge", failureReports: false });
  let now = "safety null";
  try {
    const s = ((await c.call("daemon.status")) as { safety?: { armed: boolean; evaluate: boolean; blockedCount: number } | null }).safety;
    if (s) now = `safety armed=${s.armed} evaluate=${s.evaluate} blockedCount=${s.blockedCount}`;
  } finally {
    c.close();
  }
  say(`ROW RET-1 daemon.log since ${since}: ${retired === null ? "no session-change line" : `extension session changed: ${retired} handles retired`}`);
  say(`ROW RET-1 safety read back ${now} (found ${found})`);
  const v = ret1Verdict({ retired, gone, handle: held.handle, url: held.url, after, safetyEqual: now === found });
  say(checkLine10("RET-1", "retire", v));
  if (!v.pass) process.exitCode = 1;
}

async function cleanup(): Promise<void> {
  const c = await connect({ name: "s10-ret1-cleanup", failureReports: false });
  try {
    const rows = ((await c.call("listTabs")) as { tabs?: Array<{ tab?: string; url?: string }> }).tabs ?? [];
    const mine = rows.filter((r) => r.url === URL_RET1 && r.tab);
    for (const r of mine) {
      await c.call("closeTab", { tab: r.tab });
      say(`cleanup: closed a restored ${URL_RET1} tab ${r.tab}`);
    }
    say(`cleanup: ${mine.length} restored RET-1 fixture tab(s) closed; no other tab touched`);
  } finally {
    c.close();
  }
}

const commands: Record<string, () => Promise<void>> = { hold, judge, cleanup };
const run = commands[command];
if (!run) {
  console.log(stopLine10(`s10-ret1.ts: unknown command ${JSON.stringify(command)}`));
  process.exitCode = 2;
} else {
  run().catch((err: unknown) => {
    console.log(`${stopLine10(`s10-ret1.ts ${command}: FAILED — ${err instanceof BridgeError ? `${String(err.code)}: ${err.message}` : err instanceof Error ? err.message : String(err)}`)} (at ${iso()})`);
    process.exitCode = 2;
  });
}
