// recipes/t5.ts: the SDK-side steps of the Step 7 T5 wave (docs/e2e-test-plan.md §4.14, wave sheet
// docs/plans/2026-10-21-step7-multi-actor-tabs-steps/T5-wave-sheet.md). Written 2026-10-22, before
// any run; the rows' expected texts are the lines this script prints.
//
//   npx tsx recipes/t5.ts <command> [args]
//
//   check                       the stale-extension check (the wave's first recorded line)
//   find <marker> | --current   print the handle of the tab opened for <marker>
//   info <marker>...            one line per marker: handle, chrome id, active/background, owner
//   open <marker> [--active] [--bar <colour>] [--title <t>] [--hold <ms>]
//   mark <marker> <colour> [--title <t>]
//   cleanup [--keep m1,m2]      close every unheld T5 fixture tab (?t5= and ?popup=1) not kept
//   lease2 [--pace <ms>]        LEASE-2: type 30 chars, one trusted call per char, into its own tab
//   lease3 [--hold <ms>]        LEASE-3: the opener rule through the fixture's "Open popup" link
//   lease5                      LEASE-5: hold the tab "lease5", wait for its window to be closed
//   lease6 [--wait <s>]         LEASE-6: a leased background tab through a discard and a reload
//   screen1 [--runs <n>]        SCREEN-1: default-mode capture of a background tab, the flash measured
//   screen2 [--lead <ms>]       SCREEN-2: mode:"cdp" capture of a background tab
//   screen3                     SCREEN-3 (a): three actors capture at the same instant
//   screen4                     SCREEN-4: the tab "screen4" in a minimized window
//   screen5                     SCREEN-5: a background tab of the unfocused window
//   bg1 | bg2 [--then-focus]    BG-1 trusted click / BG-2 trusted typing into a background tab
//   bg4                         BG-4: waitFor text and networkIdle on a background tab
//
// Markers are `?t5=<marker>` fixture URLs (t5-lib.ts `urlOf`). Images are written to
// $T5_OUT (default %TEMP%\bridge-e2e\t5). Exit code 0 = the script ran (read its PASS/FAIL line),
// 1 = it failed, 2 = a set-up problem (nothing measured), 3 = the driver's window is hidden or covered.
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BridgeError, type BridgeClient } from "@bridge/sdk";
import type { LeaseGrantedParams, SnapshotResult, TabGoneParams } from "@bridge/shared";
import {
  barExpression,
  byMarker,
  connectAs,
  COLOURS,
  describeError,
  evalJson,
  FIXTURE,
  isFixtureUrl,
  listTabs,
  requireFixtureCurrent,
  requireMarker,
  run,
  say,
  showTab,
  showUrl,
  sleep,
  urlOf,
  VISLOG_INSTALL,
  VISLOG_READ,
  type ListedTab,
  type VisEntry,
} from "./t5-lib.js";
import { describeBar, describePng } from "./t5-png.js";

/** Client → its actor name, so newTab can check the lease it reports (verifier m4). */
const names = new WeakMap<BridgeClient, string>();
async function connectNamed(name: string): Promise<BridgeClient> {
  const c = await connectAs(name);
  names.set(c, name);
  return c;
}

const [command = "", ...rest] = process.argv.slice(2);
const OUT = process.env.T5_OUT?.trim() || join(tmpdir(), "bridge-e2e", "t5");

function flag(name: string): boolean {
  return rest.includes(name);
}

function option(name: string, fallback?: string): string | undefined {
  const i = rest.indexOf(name);
  return i >= 0 && i + 1 < rest.length ? rest[i + 1] : fallback;
}

function positional(k: number): string | undefined {
  const plain: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith("--")) {
      if (!["--active", "--current", "--then-focus", "--hue", "--minimized"].includes(rest[i])) i++;
      continue;
    }
    plain.push(rest[i]);
  }
  return plain[k];
}

function savePng(file: string, dataUrl: string): Buffer {
  mkdirSync(OUT, { recursive: true });
  const buf = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
  writeFileSync(join(OUT, file), buf);
  return buf;
}

/**
 * Run 9 (pre-registered 2026-10-23, #62): with `--hue` the image is judged by t5-png.ts `describeBar`
 * (three probes on the bar off the label, the hue rule) instead of Run 8's pixel (20,20) ±24. Without
 * `--hue` the Run 8 behaviour is unchanged.
 */
const HUE = rest.includes("--hue");

function imageLine(file: string, dataUrl: string): { line: string; colour: string } {
  const buf = savePng(file, dataUrl);
  if (HUE) {
    try {
      const { line, name } = describeBar(buf);
      return { line: `${line} → ${join(OUT, file)}`, colour: name };
    } catch (err) {
      return { line: `unreadable image (${err instanceof Error ? err.message : String(err)}) → ${join(OUT, file)}`, colour: "other" };
    }
  }
  try {
    const line = describePng(buf, 20, 20);
    const m = /\((\w+)\), /.exec(line);
    return { line: `${line} → ${join(OUT, file)}`, colour: m ? m[1] : "other" };
  } catch (err) {
    return { line: `unreadable image (${err instanceof Error ? err.message : String(err)}) → ${join(OUT, file)}`, colour: "other" };
  }
}

async function snapshotOf(client: BridgeClient, tab: string): Promise<SnapshotResult> {
  return (await client.call("snapshot", { tab })) as SnapshotResult;
}

function refOf(snap: SnapshotResult, role: string, name: string): string {
  const el = snap.elements.find((e) => e.role === role && e.name === name);
  if (!el) throw new Error(`no ${role} "${name}" in the snapshot of ${showUrl(snap.url)}`);
  return el.ref;
}

async function newTab(client: BridgeClient, marker: string, active: boolean): Promise<{ tab: string; id: number }> {
  const r = (await client.call("newTab", { url: urlOf(marker), active })) as { id: number; tab?: string };
  if (typeof r.tab !== "string") throw new Error("newTab answered without a handle — is the daemon a Step 7 build?");
  // "leased to <name>" is printed by the callers only after this check (verifier m4).
  const owner = tabBy(await listTabs(client), r.tab)?.owner;
  if (owner !== names.get(client)) throw new Error(`newTab's tab ${r.tab} is not leased to its opener (owner: ${owner ?? "none"})`);
  return { tab: r.tab, id: r.id };
}

async function visLog(client: BridgeClient, tab: string): Promise<VisEntry[]> {
  return evalJson<VisEntry[]>(client, tab, VISLOG_READ);
}

/** The first `state` change at or after `from` (epoch ms) in a visibility log, or undefined. */
function firstChange(log: VisEntry[], state: string, from: number): number | undefined {
  return log.find((e) => e[2] === "change" && e[0] === state && e[1] >= from)?.[1];
}

const rel = (t: number | undefined, t0: number): string => (t === undefined ? "never" : `+${Math.round(t - t0)} ms`);

function tabBy(tabs: ListedTab[], handle: string): ListedTab | undefined {
  return tabs.find((t) => t.tab === handle);
}

// ---------------------------------------------------------------------------------------- check

async function check(): Promise<void> {
  const name = "t5-check";
  const client = await connectNamed(name);
  const fail = (why: string): void => {
    say(name, `CHECK FAIL — ${why} ⇒ the extension reload did not take (or this is not the new build); stop and ask again`);
    process.exitCode = 1;
  };
  try {
    const w = client.welcome;
    say(name, `connected as client ${w?.clientId ?? "?"} — daemon build ${w?.build ?? "?"}, proto ${w?.proto ?? "?"}, extension ${client.extensionConnected ? "connected" : "not connected"}`);
    let tabs: ListedTab[];
    try {
      tabs = await listTabs(client);
    } catch (err) {
      return fail(`listTabs → ${describeError(err)}`);
    }
    let human: ListedTab;
    try {
      human = requireFixtureCurrent(tabs);
    } catch (err) {
      say(name, err instanceof Error ? err.message : String(err));
      process.exitCode = 2;
      return;
    }
    say(name, `listTabs — ${tabs.length} tab(s); human's tab (current): ${human.tab} (fixture page)`);
    const handles = tabs.every((t) => typeof t.tab === "string" && /^T\d+$/.test(t.tab));
    const windows = tabs.every((t) => Number.isInteger(t.windowId));
    const currents = tabs.filter((t) => t.current === true).length;
    say(name, `listTabs fields — handle on every tab: ${handles ? "yes" : "no"}; windowId on every tab: ${windows ? "yes" : "no"}; current tabs: ${currents}`);
    if (!handles) return fail("listTabs entries without a T<n> handle (not a Step 7 daemon)");
    if (!windows) return fail("listTabs entries without windowId (an extension older than T3)");
    if (currents !== 1) return fail(`${currents} tabs marked current (expected exactly 1)`);
    let snap: SnapshotResult & { text?: unknown };
    try {
      snap = (await snapshotOf(client, human.tab)) as SnapshotResult & { text?: unknown };
    } catch (err) {
      return fail(`snapshot ${human.tab} → ${describeError(err)}`);
    }
    const hasElements = Array.isArray(snap.elements);
    say(name, `snapshot ${human.tab} — elements: ${hasElements ? `yes (${snap.elements.length})` : "no"}; text field: ${typeof snap.text === "string" ? "present" : "absent"}`);
    if (!hasElements) return fail("snapshot returned no elements array (an extension older than T3)");
    try {
      await client.call("focusTab", { tab: human.tab });
    } catch (err) {
      return fail(`focusTab ${human.tab} → ${describeError(err)}`);
    }
    say(name, `focusTab ${human.tab} — ok`);
    say(name, "CHECK PASS — the extension answers with handles, windowId, snapshot elements and focusTab");
  } finally {
    client.close();
  }
}

// ---------------------------------------------------------------------------------------- utilities

async function find(): Promise<void> {
  const client = await connectNamed("t5-find");
  try {
    const tabs = await listTabs(client);
    if (flag("--current")) {
      const human = tabs.find((t) => t.current === true);
      console.log(human ? `${human.tab} ${isFixtureUrl(human.url) ? "fixture" : "not a fixture page"}` : "none");
      return;
    }
    const marker = positional(0);
    if (!marker) throw new Error("usage: find <marker> | --current");
    const t = byMarker(tabs, marker);
    if (!t) {
      console.log(`none (no tab for marker "${marker}")`);
      process.exitCode = 1;
      return;
    }
    console.log(t.tab);
  } finally {
    client.close();
  }
}

async function info(): Promise<void> {
  const client = await connectNamed("t5-info");
  try {
    const tabs = await listTabs(client);
    const markers = rest.filter((a) => !a.startsWith("--"));
    for (const m of markers) {
      const t = byMarker(tabs, m);
      console.log(t ? `${m}: ${showTab(t)}, window ${t.windowId ?? "?"}` : `${m}: none`);
    }
  } finally {
    client.close();
  }
}

async function open(): Promise<void> {
  const marker = positional(0);
  if (!marker) throw new Error("usage: open <marker> [--active] [--bar <colour>] [--title <t>] [--hold <ms>]");
  const name = process.env.T5_NAME?.trim() || "t5-open";
  const client = await connectNamed(name);
  try {
    requireFixtureCurrent(await listTabs(client)); // newTab lands in the last-focused window: the driver's
    const active = flag("--active");
    const { tab } = await newTab(client, marker, active);
    const bar = option("--bar");
    if (bar) {
      if (!COLOURS[bar]) throw new Error(`unknown colour ${bar} (${Object.keys(COLOURS).join(", ")})`);
      await evalJson(client, tab, barExpression(COLOURS[bar], marker.toUpperCase(), option("--title")));
    }
    say(name, `opened ${tab} for ${marker} (${active ? "active" : "background"})${bar ? `, bar ${bar}` : ""}`);
    const hold = Number(option("--hold", "0"));
    if (hold > 0) {
      say(name, `holding ${tab} for ${hold} ms`);
      await sleep(hold);
    }
  } finally {
    client.close();
  }
}

async function mark(): Promise<void> {
  const marker = positional(0);
  const colour = positional(1);
  if (!marker || !colour || !COLOURS[colour]) throw new Error("usage: mark <marker> <colour> [--title <t>]");
  const client = await connectNamed("t5-mark");
  try {
    const t = requireMarker(await listTabs(client), marker);
    const state = await evalJson<string>(client, t.tab, barExpression(COLOURS[colour], marker.toUpperCase(), option("--title")));
    say("t5-mark", `${t.tab} (${marker}) bar ${colour}; visibilityState ${state}`);
  } finally {
    client.close();
  }
}

async function cleanup(): Promise<void> {
  const keep = new Set((option("--keep") ?? "").split(",").filter(Boolean));
  const client = await connectNamed("t5-cleanup");
  try {
    const tabs = await listTabs(client);
    const ours = tabs.filter((t) => t.url.startsWith(`${FIXTURE}?t5=`) || t.url === `${FIXTURE}?popup=1`);
    for (const t of ours) {
      const marker = new URL(t.url).searchParams.get("t5") ?? "popup";
      if (keep.has(marker)) continue;
      if (t.owner) {
        say("t5-cleanup", `kept ${t.tab} (${marker}): held by ${JSON.stringify(t.owner)}`);
        continue;
      }
      try {
        await client.call("closeTab", { tab: t.tab });
        say("t5-cleanup", `closed ${t.tab} (${marker})`);
      } catch (err) {
        say("t5-cleanup", `close ${t.tab} (${marker}) → ${describeError(err)}`);
      }
    }
  } finally {
    client.close();
  }
}

// ---------------------------------------------------------------------------------------- LEASE

const LEASE2_TEXT = "lease2abcdefghijklmnopqrstuvwx"; // 30 characters, letters and one digit only

async function lease2(): Promise<void> {
  const name = "t5-lease2";
  const pace = Number(option("--pace", "1500"));
  if (LEASE2_TEXT.length !== 30) throw new Error("LEASE2_TEXT must be 30 characters");
  const client = await connectNamed(name);
  try {
    requireFixtureCurrent(await listTabs(client));
    const { tab } = await newTab(client, "lease2-script", true);
    say(name, `opened ${tab} for lease2-script (active), leased to ${name}`);
    const ref = refOf(await snapshotOf(client, tab), "textbox", "Trusted-only input");
    const t0 = Date.now();
    say(name, `typing started — ${LEASE2_TEXT.length} trusted type calls into ${ref}, one every ${pace} ms`);
    let ok = 0;
    for (let i = 1; i <= LEASE2_TEXT.length; i++) {
      const started = Date.now();
      try {
        await client.call("type", { ref, text: LEASE2_TEXT.slice(0, i), trusted: true, submit: false, tab });
        ok++;
      } catch (err) {
        say(name, `type ${i}/${LEASE2_TEXT.length} → ${describeError(err)}`);
      }
      const wait = pace - (Date.now() - started);
      if (wait > 0 && i < LEASE2_TEXT.length) await sleep(wait);
    }
    const t1 = Date.now();
    say(name, `typing ended — ${ok}/${LEASE2_TEXT.length} type calls ok, ${((t1 - t0) / 1000).toFixed(1)} s (${new Date(t0).toISOString()} → ${new Date(t1).toISOString()})`);
    const got = await evalJson<{ value: string; status: string }>(
      client,
      tab,
      `({ value: document.getElementById('trusted-input').value, status: document.getElementById('status').textContent })`,
    );
    say(name, `final value ${JSON.stringify(got.value)}; final status ${JSON.stringify(got.status)}`);
    const pass = ok === LEASE2_TEXT.length && got.value === LEASE2_TEXT && got.status === `status: TRUSTED input = ${LEASE2_TEXT}` && t1 - t0 >= 30_000;
    say(name, `LEASE-2 script ${pass ? "PASS" : "FAIL"} — value exact: ${got.value === LEASE2_TEXT ? "yes" : "no"}; status exact: ${got.status === `status: TRUSTED input = ${LEASE2_TEXT}` ? "yes" : "no"}; calls ok: ${ok}/30; typing ≥ 30 s: ${t1 - t0 >= 30_000 ? "yes" : "no"}`);
  } finally {
    client.close();
  }
}

const POPUP_URL = `${FIXTURE}?popup=1`;

async function lease3(): Promise<void> {
  const name = "t5-lease3";
  const hold = Number(option("--hold", "90000"));
  const client = await connectNamed(name);
  const events: Array<{ at: number; p: LeaseGrantedParams }> = [];
  client.on("leaseGranted", (p) => events.push({ at: Date.now(), p }));
  // Run 9 (--race, pre-registered 2026-10-23): another client acts on the popup the moment listTabs shows
  // it, to see it held (TAB_HELD) even before leaseGranted reaches the opener (T5b §9 fix 3).
  const race = flag("--race") ? await connectNamed("t5-lease3-other") : undefined;
  try {
    requireFixtureCurrent(await listTabs(client));
    const { tab } = await newTab(client, "lease3", true);
    say(name, `opened ${tab} for lease3 (active), leased to ${name}`);
    const ref = refOf(await snapshotOf(client, tab), "link", "Open popup");
    let granted: LeaseGrantedParams | undefined;
    let how = "";
    for (const trusted of [false, true]) {
      const before = events.length;
      const t0 = Date.now();
      void before;
      const racing = race
        ? (async () => {
            const r0 = Date.now();
            while (Date.now() - r0 < 5000) {
              const p = (await listTabs(race)).find((t) => t.url === POPUP_URL || (t.openerTabId !== undefined && t.tab !== tab && !t.url.startsWith(`${FIXTURE}?t5=`) && t.owner === name));
              if (p) {
                const seenAt = Date.now();
                const eventBefore = events.length > before;
                let res: string;
                try {
                  await race.call("snapshot", { tab: p.tab });
                  res = "ok (no error)";
                } catch (e) {
                  res = describeError(e);
                }
                return `other client: popup ${p.tab} seen ${seenAt - t0} ms after the click; its snapshot → ${res}; leaseGranted had already arrived: ${eventBefore ? "yes" : "no"}`;
              }
              await sleep(20);
            }
            return "other client: no popup seen within 5 s";
          })()
        : undefined;
      await client.call("click", { ref, trusted, tab });
      say(name, `click ${ref} (${trusted ? "trusted" : "synthetic"}) — ok`);
      if (racing) say(name, await racing);
      while (events.length === before && Date.now() - t0 < 5000) await sleep(100);
      const popups = (await listTabs(client)).filter((t) => t.url === POPUP_URL);
      const ev = events[before];
      say(
        name,
        `after the ${trusted ? "trusted" : "synthetic"} click: leaseGranted ${ev ? JSON.stringify({ ...ev.p, url: showUrl(ev.p.url) }) + ` after ${ev.at - t0} ms` : "none within 5 s"}; popup tabs: ${popups.length ? popups.map((p) => `${showTab(p)} opener ${p.openerTabId ?? "none"}`).join("; ") : "none"}`,
      );
      if (!ev && popups.length > 0) {
        say(name, `LEASE-3 FAIL — the ${trusted ? "trusted" : "synthetic"} click opened a popup but no leaseGranted arrived within 5 s`);
        return;
      }
      if (ev) {
        granted = ev.p;
        how = trusted ? "trusted" : "synthetic";
        break;
      }
    }
    if (!granted) {
      say(name, "LEASE-3 FAIL — no leaseGranted after a synthetic and a trusted click");
      return;
    }
    const popup = tabBy(await listTabs(client), granted.tab);
    const pass = granted.reason === "opener" && granted.url === POPUP_URL && popup?.owner === name;
    if (granted.url === "") say(name, "note: the event's url is empty (F33: tabCreated before the URL was set) — a FAIL of the url sub-check only");
    say(name, `LEASE-3 ${pass ? "PASS" : "FAIL"} (${how} click) — event tab ${granted.tab}, reason ${granted.reason}, url ${granted.url === POPUP_URL ? "the popup URL" : showUrl(granted.url)}; listTabs owner of ${granted.tab}: ${popup?.owner ? JSON.stringify(popup.owner) : "none"}`);
    if (hold > 0) {
      say(name, `holding the opener lease for ${hold} ms — call browser_list_tabs now`);
      await sleep(hold);
      const again = tabBy(await listTabs(client), granted.tab);
      say(name, `after the hold: ${again ? showTab(again) : `${granted.tab} gone`}`);
    }
  } finally {
    race?.close();
    client.close();
  }
}

async function lease5(): Promise<void> {
  const name = "t5-lease5";
  const title = "T5 LEASE5 target";
  const client = await connectNamed(name);
  let gone: { at: number; p: TabGoneParams } | undefined;
  client.on("tabGone", (p) => {
    if (!gone) gone = { at: Date.now(), p };
  });
  try {
    const t = requireMarker(await listTabs(client), "lease5");
    await client.call("tabs.claim", { tab: t.tab });
    await evalJson(client, t.tab, barExpression(COLOURS.yellow, "LEASE-5", title));
    const held = tabBy(await listTabs(client), t.tab);
    say(name, `holding ${held ? showTab(held) : t.tab}; title set to ${JSON.stringify(title)}`);
    say(name, `close the window titled "${title}" now — waiting up to 180 s for tabGone`);
    const t0 = Date.now();
    while (!gone && Date.now() - t0 < 180_000) await sleep(200);
    if (!gone) {
      say(name, "LEASE-5 FAIL — no tabGone within 180 s");
      return;
    }
    const ev = gone.p;
    say(name, `event tabGone ${JSON.stringify({ tab: ev.tab, lastUrl: showUrl(ev.lastUrl), lastTitle: ev.lastTitle })}`);
    let err: unknown;
    try {
      await snapshotOf(client, t.tab);
    } catch (e) {
      err = e;
    }
    say(name, `snapshot ${t.tab} → ${err === undefined ? "ok (no error)" : describeError(err)}`);
    const data = err instanceof BridgeError ? (err.data as Partial<TabGoneParams> | undefined) : undefined;
    const pass =
      ev.tab === t.tab &&
      ev.lastUrl === urlOf("lease5") &&
      ev.lastTitle === title &&
      err instanceof BridgeError &&
      err.code === "TAB_GONE" &&
      err.message === `tab ${t.tab} was closed — call listTabs to pick another tab` &&
      data?.lastUrl === urlOf("lease5") &&
      data?.lastTitle === title;
    say(name, `LEASE-5 ${pass ? "PASS" : "FAIL"}`);
  } finally {
    client.close();
  }
}

async function lease6(): Promise<void> {
  const name = "t5-lease6";
  const title = "T5 LEASE6 target";
  const waitS = Number(option("--wait", "300"));
  const client = await connectNamed(name);
  try {
    requireFixtureCurrent(await listTabs(client));
    const { tab, id } = await newTab(client, "lease6", false);
    await evalJson(client, tab, barExpression(COLOURS.yellow, "LEASE-6", title));
    const before = tabBy(await listTabs(client), tab);
    say(name, `before: ${before ? showTab(before) : tab}; title ${JSON.stringify(title)}`);
    say(name, `discard ${tab} now in chrome://discards (the row titled "${title}") — polling a snapshot every 2 s for up to ${waitS} s`);
    const t0 = Date.now();
    let discardedErr: unknown;
    while (Date.now() - t0 < waitS * 1000) {
      try {
        await snapshotOf(client, tab);
      } catch (err) {
        discardedErr = err;
        break;
      }
      await sleep(2000);
    }
    if (discardedErr === undefined) {
      say(name, `LEASE-6 not measured — no discard seen within ${waitS} s (set-up)`);
      process.exitCode = 2;
      return;
    }
    say(name, `while discarded: snapshot ${tab} → ${describeError(discardedErr)}`);
    if (!describeError(discardedErr).includes("The tab was discarded by Chrome's Memory Saver")) {
      say(name, "LEASE-6 not measured — the snapshot failed without a discard (set-up), see the line above");
      process.exitCode = 2;
      return;
    }
    const during = await listTabs(client);
    const dTab = tabBy(during, tab);
    const dMarker = byMarker(during, "lease6");
    say(name, `while discarded: listTabs ${tab} → ${dTab ? showTab(dTab) : "absent"}; the lease6 tab → ${dMarker ? showTab(dMarker) : "absent"}`);
    await sleep(3000);
    try {
      await client.call("focusTab", { tab });
      say(name, `focusTab ${tab} (reloads the discarded tab) — ok`);
    } catch (err) {
      say(name, `focusTab ${tab} → ${describeError(err)}`);
    }
    let after: SnapshotResult | undefined;
    let lastErr: unknown;
    const t1 = Date.now();
    while (!after && Date.now() - t1 < 20_000) {
      try {
        after = await snapshotOf(client, tab);
      } catch (err) {
        lastErr = err;
        await sleep(1000);
      }
    }
    say(name, `after reload: snapshot ${tab} → ${after ? `ok (${after.elements.length} elements), url ${showUrl(after.url)}` : describeError(lastErr)}`);
    const finalTabs = await listTabs(client);
    const fTab = tabBy(finalTabs, tab);
    const fMarker = byMarker(finalTabs, "lease6");
    say(name, `after reload: listTabs ${tab} → ${fTab ? showTab(fTab) : "absent"}; the lease6 tab → ${fMarker ? showTab(fMarker) : "absent"}`);
    const sameHandle = fMarker?.tab === tab;
    const works = after !== undefined && after.url === urlOf("lease6") && fTab?.owner === name;
    let outcome: string;
    if (sameHandle && works && fMarker?.id === id) outcome = "PASS (a) — same chrome id, no replacement; the handle works after the reload";
    else if (sameHandle && works && fMarker?.id !== id) outcome = `PASS (b) — new chrome id ${fMarker?.id} (was ${id}), the same handle: tabReplaced was applied`;
    else outcome = `FAIL — handle ${tab} → ${fTab ? showTab(fTab) : "absent"}, the lease6 tab is ${fMarker ? showTab(fMarker) : "absent"}, snapshot ${after ? "ok" : "failed"}`;
    say(name, `LEASE-6 ${outcome}`);
  } finally {
    client.close();
  }
}

// ---------------------------------------------------------------------------------------- SCREEN

/** The driver's window: its active tab is the fixture tab opened for `marker`, and it is current. */
function humanOf(tabs: ListedTab[], marker: string): ListedTab {
  const h = requireMarker(tabs, marker);
  if (h.current !== true) throw new Error(`SET-UP: the ${marker} tab is not the human's tab (current) — focus the driver's window`);
  return h;
}

async function visible(client: BridgeClient, tab: string, name: string): Promise<boolean> {
  const state = await evalJson<string>(client, tab, VISLOG_INSTALL);
  if (state !== "visible") {
    say(name, `SET-UP: the human's tab reports visibilityState ${state} — the driver's window is minimized or covered; uncover it (Set-T5Topmost) and rerun`);
    process.exitCode = 3;
    return false;
  }
  return true;
}

async function screen1(): Promise<void> {
  const name = "t5-screen1";
  const runs = Number(option("--runs", "3"));
  const client = await connectNamed(name);
  try {
    const h = humanOf(await listTabs(client), "screen-human");
    const { tab: x } = await newTab(client, "screen1", false);
    await evalJson(client, h.tab, barExpression(COLOURS.cyan, "HUMAN"));
    await evalJson(client, x, barExpression(COLOURS.magenta, "SCREEN-1 TARGET"));
    say(name, `human ${h.tab} (cyan bar), target ${x} (magenta bar, background, leased to ${name})`);
    const flashes: number[] = [];
    let allPass = true;
    for (let k = 1; k <= runs; k++) {
      if (!(await visible(client, h.tab, name))) return;
      await evalJson(client, x, VISLOG_INSTALL);
      await sleep(1000);
      const t0 = Date.now();
      let dataUrl: string | undefined;
      try {
        dataUrl = ((await client.call("screenshot", { tab: x })) as { dataUrl: string }).dataUrl;
      } catch (err) {
        say(name, `run ${k}: screenshot ${x} → ${describeError(err)}`);
      }
      const t1 = Date.now();
      await sleep(1500);
      const hl = await visLog(client, h.tab);
      const xl = await visLog(client, x);
      const hHidden = firstChange(hl, "hidden", t0 - 50);
      const hVisible = hHidden === undefined ? undefined : firstChange(hl, "visible", hHidden);
      const xVisible = firstChange(xl, "visible", t0 - 50);
      const xHidden = xVisible === undefined ? undefined : firstChange(xl, "hidden", xVisible);
      const img = dataUrl ? imageLine(`screen1-run${k}.png`, dataUrl) : { line: "no image", colour: "none" };
      const after = await listTabs(client);
      const hA = tabBy(after, h.tab);
      const xA = tabBy(after, x);
      const flash = hHidden !== undefined && hVisible !== undefined ? Math.round(hVisible - hHidden) : undefined;
      if (flash !== undefined) flashes.push(flash);
      say(name, `run ${k}: call ${t1 - t0} ms; image ${img.line}`);
      say(name, `run ${k}: human tab hidden ${rel(hHidden, t0)}, visible again ${rel(hVisible, t0)} → flash ${flash ?? "?"} ms; target visible ${rel(xVisible, t0)}, hidden ${rel(xHidden, t0)}`);
      say(name, `run ${k}: after — human ${hA ? showTab(hA) : "absent"}; target ${xA ? showTab(xA) : "absent"}`);
      const pass =
        img.colour === "magenta" &&
        hVisible !== undefined &&
        hVisible - t0 <= 2000 &&
        hA?.active === true &&
        hA.current === true &&
        xA?.active === false;
      if (!pass) allPass = false;
      say(name, `run ${k}: ${pass ? "PASS" : "FAIL"}${flash !== undefined && flash > 1000 ? " (finding: flash over 1 s)" : ""}`);
      await sleep(1000);
    }
    const sorted = [...flashes].sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : undefined;
    say(name, `SCREEN-1 ${allPass && flashes.length === runs ? "PASS" : "FAIL"} — flash per run ${flashes.join(", ")} ms; median ${median ?? "?"} ms (method: page-side visibilitychange timestamps on the human's tab)`);
  } finally {
    client.close();
  }
}

async function screen2(): Promise<void> {
  const name = "t5-screen2";
  const lead = Number(option("--lead", "5000"));
  const client = await connectNamed(name);
  try {
    const h = humanOf(await listTabs(client), "screen-human");
    const { tab: x } = await newTab(client, "screen2", false);
    await evalJson(client, h.tab, barExpression(COLOURS.cyan, "HUMAN"));
    await evalJson(client, x, barExpression(COLOURS.magenta, "SCREEN-2 TARGET"));
    if (!(await visible(client, h.tab, name))) return;
    await evalJson(client, x, VISLOG_INSTALL);
    say(name, `human ${h.tab}, target ${x} (background) — capturing with mode:"cdp" in ${lead} ms (start the capture loop now)`);
    await sleep(lead);
    const t0 = Date.now();
    let dataUrl: string | undefined;
    try {
      dataUrl = ((await client.call("screenshot", { tab: x, mode: "cdp" })) as { dataUrl: string }).dataUrl;
    } catch (err) {
      say(name, `screenshot ${x} mode:"cdp" → ${describeError(err)}`);
    }
    const t1 = Date.now();
    say(name, `call ${new Date(t0).toISOString()} → ${new Date(t1).toISOString()} (${t1 - t0} ms)`);
    await sleep(1500);
    const hl = await visLog(client, h.tab);
    const xl = await visLog(client, x);
    const hHidden = firstChange(hl, "hidden", t0 - 50);
    const xVisible = firstChange(xl, "visible", t0 - 50);
    const img = dataUrl ? imageLine("screen2.png", dataUrl) : { line: "no image", colour: "none" };
    const after = await listTabs(client);
    const hA = tabBy(after, h.tab);
    const xA = tabBy(after, x);
    say(name, `image ${img.line}`);
    say(name, `human tab hidden: ${rel(hHidden, t0)}; target visible: ${rel(xVisible, t0)}; after — human ${hA ? showTab(hA) : "absent"}; target ${xA ? showTab(xA) : "absent"}`);
    const pass = img.colour === "magenta" && hHidden === undefined && xVisible === undefined && hA?.active === true && xA?.active === false;
    say(name, `SCREEN-2 (Chrome side) ${pass ? "PASS" : "FAIL"} — no tab switch: ${hHidden === undefined && xVisible === undefined ? "yes" : "no"}; image is the target: ${img.colour === "magenta" ? "yes" : "no"}; banner: judged from the capture loop between the two times above`);
  } finally {
    client.close();
  }
}

async function screen3(): Promise<void> {
  const base = "t5-screen3";
  const ids = ["a", "b", "c"] as const;
  const colours = { a: "red", b: "lime", c: "blue" } as const;
  const clients = await Promise.all(ids.map((k) => connectNamed(`${base}-${k}`)));
  try {
    const h = humanOf(await listTabs(clients[0]), "screen-human");
    const xs: string[] = [];
    for (let i = 0; i < 3; i++) {
      const { tab } = await newTab(clients[i], `screen3-${ids[i]}`, false);
      await evalJson(clients[i], tab, barExpression(COLOURS[colours[ids[i]]], `SCREEN-3 ${ids[i].toUpperCase()}`));
      xs.push(tab);
      say(`${base}-${ids[i]}`, `owns ${tab} (${colours[ids[i]]} bar, background)`);
    }
    if (!(await visible(clients[0], h.tab, base))) return;
    for (let i = 0; i < 3; i++) await evalJson(clients[i], xs[i], VISLOG_INSTALL);
    await sleep(1000);
    const t0 = Date.now();
    const results = await Promise.allSettled(
      clients.map(async (c, i) => {
        const started = Date.now();
        const r = (await c.call("screenshot", { tab: xs[i] })) as { dataUrl: string };
        return { started, ended: Date.now(), dataUrl: r.dataUrl };
      }),
    );
    await sleep(1500);
    const hl = await visLog(clients[0], h.tab);
    const intervals: Array<[number | undefined, number | undefined]> = [];
    let allOwn = true;
    for (let i = 0; i < 3; i++) {
      const who = `${base}-${ids[i]}`;
      const xl = await visLog(clients[i], xs[i]);
      const v = firstChange(xl, "visible", t0 - 50);
      const hid = v === undefined ? undefined : firstChange(xl, "hidden", v);
      intervals.push([v, hid]);
      const r = results[i];
      if (r.status === "fulfilled") {
        const img = imageLine(`screen3-${ids[i]}.png`, r.value.dataUrl);
        const own = img.colour === colours[ids[i]];
        if (!own) allOwn = false;
        say(who, `${xs[i]}: call ${rel(r.value.started, t0)} → ${rel(r.value.ended, t0)} ok; image ${img.line}; own colour: ${own ? "yes" : "no"}; visible ${rel(v, t0)} → hidden ${rel(hid, t0)}`);
      } else {
        allOwn = false;
        say(who, `${xs[i]}: screenshot → ${describeError(r.reason)}`);
      }
    }
    const overlaps: string[] = [];
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++) {
        const [a0, a1] = intervals[i];
        const [b0, b1] = intervals[j];
        if (a0 === undefined || a1 === undefined || b0 === undefined || b1 === undefined) overlaps.push(`${ids[i]}/${ids[j]} unknown`);
        else if (a0 < b1 && b0 < a1) overlaps.push(`${ids[i]}/${ids[j]}`);
      }
    const hiddenCount = hl.filter((e) => e[2] === "change" && e[0] === "hidden" && e[1] >= t0 - 50).length;
    const after = await listTabs(clients[0]);
    const hA = tabBy(after, h.tab);
    say(base, `target visible intervals overlap: ${overlaps.length ? overlaps.join(", ") : "none"}; human tab hidden ${hiddenCount} time(s); after — human ${hA ? showTab(hA) : "absent"}`);
    // The targets share one window, so their own intervals cannot overlap; serialisation shows in the
    // human's tab: hidden/visible exactly three times, alternating, each restore before the next switch
    // (F19), and each target visible inside one of those hidden spans (verifier M1).
    const hChanges = hl.filter((e) => e[2] === "change" && e[1] >= t0 - 50);
    const alternating = hChanges.length === 6 && hChanges.every((e, k) => e[0] === (k % 2 === 0 ? "hidden" : "visible"));
    const spans: Array<[number, number]> = alternating ? [0, 2, 4].map((k) => [hChanges[k][1], hChanges[k + 1][1]]) : [];
    const inSpans = intervals.map(([v, hid]) => spans.findIndex(([a, b]) => v !== undefined && hid !== undefined && v >= a - 50 && hid <= b + 50));
    const distinct = alternating && inSpans.every((k) => k >= 0) && new Set(inSpans).size === 3;
    say(base, `human tab changes after the calls: ${hChanges.map((e) => `${e[0]} ${rel(e[1], t0)}`).join(", ") || "none"}; alternating hidden/visible ×3: ${alternating ? "yes" : "no"}; each target inside its own hidden span: ${distinct ? "yes" : "no"}`);
    const pass = allOwn && overlaps.length === 0 && hiddenCount === 3 && distinct && hA?.active === true && hA.current === true;
    say(base, `SCREEN-3 (a) ${pass ? "PASS" : "FAIL"} — three captures ${results.every((r) => r.status === "fulfilled") ? "all succeeded" : "not all succeeded"}, each its own tab: ${allOwn ? "yes" : "no"}, serialised: ${overlaps.length === 0 && hiddenCount === 3 && distinct ? "yes" : "no"}`);
  } finally {
    for (const c of clients) c.close();
  }
}

async function screen4(): Promise<void> {
  const name = "t5-screen4";
  const client = await connectNamed(name);
  try {
    const t = requireMarker(await listTabs(client), "screen4");
    await client.call("tabs.claim", { tab: t.tab });
    say(name, `claimed ${t.tab} (screen4, in the minimized window)`);
    let err: unknown;
    try {
      await client.call("screenshot", { tab: t.tab });
    } catch (e) {
      err = e;
    }
    say(name, `default mode → ${err === undefined ? "an image (no error)" : describeError(err)}`);
    const expected = `Chrome's window is minimized, so the tab cannot be captured — restore the window, or pass mode:"cdp"`;
    const pass = err instanceof BridgeError && err.code === "WINDOW_MINIMIZED" && err.message === expected;
    say(name, `SCREEN-4 default mode ${pass ? "PASS-as-designed" : "FAIL"} (the window must still be minimized: check with Get-T5ChromeWindows)`);
    try {
      const r = (await client.call("screenshot", { tab: t.tab, mode: "cdp" }, { timeoutMs: 20_000 })) as { dataUrl: string };
      say(name, `mode:"cdp" → image ${imageLine("screen4-cdp.png", r.dataUrl).line} (recorded: rendered / blank)`);
    } catch (e) {
      say(name, `mode:"cdp" → ${describeError(e)} (recorded: error)`);
    }
  } finally {
    client.close();
  }
}

async function screen5(): Promise<void> {
  const name = "t5-screen5";
  const client = await connectNamed(name);
  try {
    const tabs = await listTabs(client);
    const h = humanOf(tabs, "screen5-human");
    const front = requireMarker(tabs, "screen5-front");
    const target = requireMarker(tabs, "screen5-target");
    const layout = front.windowId === target.windowId && front.windowId !== h.windowId && front.active && !target.active;
    say(name, `before — human ${showTab(h)} window ${h.windowId}; front ${showTab(front)} window ${front.windowId}; target ${showTab(target)} window ${target.windowId}; layout as required: ${layout ? "yes" : "no"}`);
    if (!layout) {
      say(name, "SET-UP: need screen5-front active and screen5-target in the background of one window, the human's tab in another");
      process.exitCode = 2;
      return;
    }
    await evalJson(client, target.tab, barExpression(COLOURS.magenta, "SCREEN-5 TARGET"));
    await client.call("tabs.claim", { tab: target.tab });
    const t0 = Date.now();
    let dataUrl: string | undefined;
    try {
      dataUrl = ((await client.call("screenshot", { tab: target.tab })) as { dataUrl: string }).dataUrl;
    } catch (err) {
      say(name, `screenshot ${target.tab} → ${describeError(err)}`);
    }
    say(name, `call ${Date.now() - t0} ms`);
    await sleep(1500);
    const img = dataUrl ? imageLine("screen5.png", dataUrl) : { line: "no image", colour: "none" };
    const after = await listTabs(client);
    const hA = tabBy(after, h.tab);
    const fA = tabBy(after, front.tab);
    const tA = tabBy(after, target.tab);
    say(name, `image ${img.line}`);
    say(name, `after — human ${hA ? showTab(hA) : "absent"}; front ${fA ? showTab(fA) : "absent"}; target ${tA ? showTab(tA) : "absent"}`);
    const pass = img.colour === "magenta" && hA?.current === true && fA?.active === true && tA?.active === false;
    say(name, `SCREEN-5 (Chrome side) ${pass ? "PASS" : "FAIL"} — image is the target: ${img.colour === "magenta" ? "yes" : "no"}; human's tab still current: ${hA?.current ? "yes" : "no"}; front restored: ${fA?.active ? "yes" : "no"} (the OS foreground window is judged by the driver)`);
  } finally {
    client.close();
  }
}

// ---------------------------------------------------------------------------------------- BG

const BG2_TEXT = "bg2typed";

async function bgInput(row: "bg1" | "bg2"): Promise<void> {
  const name = `t5-${row}`;
  const ROW = row.toUpperCase().replace("BG", "BG-");
  const client = await connectNamed(name);
  try {
    const h = humanOf(await listTabs(client), "bg-human");
    const { tab: x } = await newTab(client, row, false);
    if (!(await visible(client, h.tab, name))) return;
    const xState = await evalJson<string>(client, x, VISLOG_INSTALL);
    say(name, `human ${h.tab}; target ${x} (background, leased to ${name}); target visibilityState ${xState}`);
    const snap = await snapshotOf(client, x);
    const ref = row === "bg1" ? refOf(snap, "button", "Trusted-only button") : refOf(snap, "textbox", "Trusted-only input");
    const expected = row === "bg1" ? "status: TRUSTED click received" : `status: TRUSTED input = ${BG2_TEXT}`;
    const act = async (): Promise<void> => {
      if (row === "bg1") await client.call("click", { ref, trusted: true, tab: x }, { timeoutMs: 20_000 });
      else await client.call("type", { ref, text: BG2_TEXT, trusted: true, submit: false, tab: x }, { timeoutMs: 20_000 });
    };
    const read = (): Promise<{ status: string; value: string; vis: string }> =>
      evalJson(client, x, `({ status: document.getElementById('status').textContent, value: document.getElementById('trusted-input').value, vis: document.visibilityState })`);
    const t0 = Date.now();
    let err: unknown;
    try {
      await act();
    } catch (e) {
      err = e;
    }
    say(name, `${row === "bg1" ? `click ${ref} trusted` : `type ${ref} ${JSON.stringify(BG2_TEXT)} trusted`} → ${err === undefined ? "ok" : describeError(err)} (${Date.now() - t0} ms)`);
    const got = await read();
    const hl = await visLog(client, h.tab);
    const after = await listTabs(client);
    const hA = tabBy(after, h.tab);
    const xA = tabBy(after, x);
    const humanHidden = firstChange(hl, "hidden", t0 - 50) !== undefined;
    say(name, `target status ${JSON.stringify(got.status)}; field value ${JSON.stringify(got.value)}; target visibilityState ${got.vis}`);
    say(name, `human tab hidden during the call: ${humanHidden ? "yes" : "no"}; after — human ${hA ? showTab(hA) : "absent"}; target ${xA ? showTab(xA) : "absent"}`);
    const exact = got.status === expected && (row === "bg1" || got.value === BG2_TEXT);
    const pass = err === undefined && exact && got.vis === "hidden" && !humanHidden && hA?.active === true && hA.current === true && xA?.active === false;
    say(name, `${ROW} ${pass ? "PASS" : "FAIL"} — ${exact ? "exact" : `expected ${JSON.stringify(expected)}`}; background throughout: ${xA?.active === false && got.vis === "hidden" ? "yes" : "no"}; human's tab unchanged: ${!humanHidden && hA?.active ? "yes" : "no"}`);
    if (!pass) say(name, `${ROW} focus-emulation retry: not run — no bridge method sends Emulation.setFocusEmulationEnabled, and adding one is an extension change (forbidden in a wave)`);
    if (flag("--then-focus")) {
      await client.call("focusTab", { tab: x });
      await evalJson(client, x, `(() => { document.getElementById('status').textContent = 'status: idle'; document.getElementById('trusted-input').value = ''; return true; })()`);
      let e2: unknown;
      try {
        await act();
      } catch (e) {
        e2 = e;
      }
      const g2 = await read();
      say(name, `informational, not the T5.2 retry — after focusTab ${x}: action → ${e2 === undefined ? "ok" : describeError(e2)}; status ${JSON.stringify(g2.status)}; value ${JSON.stringify(g2.value)}`);
    }
  } finally {
    client.close();
  }
}

async function bg4(): Promise<void> {
  const name = "t5-bg4";
  const needle = "BG4 delayed text";
  const client = await connectNamed(name);
  try {
    const h = humanOf(await listTabs(client), "bg-human");
    const { tab: x } = await newTab(client, "bg4", false);
    const vis = await evalJson<string>(
      client,
      x,
      `(() => { setTimeout(() => { const p = document.createElement('p'); p.id = 't5-bg4'; p.textContent = ${JSON.stringify(needle)}; document.body.append(p); }, 2000); return document.visibilityState; })()`,
    );
    const t0 = Date.now();
    say(name, `human ${h.tab}; target ${x} (background, visibilityState ${vis}); the text is added 2000 ms after the arm`);
    let e1: unknown;
    try {
      await client.call("waitFor", { text: needle, tab: x }, { timeoutMs: 20_000 });
    } catch (e) {
      e1 = e;
    }
    const t1 = Date.now();
    say(name, `waitFor {text} → ${e1 === undefined ? "ok" : describeError(e1)} after ${t1 - t0} ms`);
    const status = await evalJson<number>(client, x, `fetch('/ok.json?t5=bg4').then(r => r.status)`);
    const t2 = Date.now();
    let e2: unknown;
    try {
      await client.call("waitFor", { networkIdle: true, tab: x }, { timeoutMs: 20_000 });
    } catch (e) {
      e2 = e;
    }
    const t3 = Date.now();
    say(name, `fetch /ok.json → ${status}; waitFor {networkIdle} → ${e2 === undefined ? "ok" : describeError(e2)} after ${t3 - t2} ms`);
    const xA = tabBy(await listTabs(client), x);
    const pass = e1 === undefined && t1 - t0 >= 1900 && t1 - t0 <= 10_000 && e2 === undefined && t3 - t2 <= 10_000 && xA?.active === false;
    say(name, `BG-4 ${pass ? "PASS" : "FAIL"} — text after ${t1 - t0} ms, network idle after ${t3 - t2} ms; target still background: ${xA?.active === false ? "yes" : "no"}`);
  } finally {
    client.close();
  }
}

// ---------------------------------------------------------------------------------------- Run 9

/**
 * Run 9, T5b fix 2 (pre-registered 2026-10-23): `screenshot {mode:"cdp"}` refuses at once.
 * Default: a background tab of the driver's window (marker screen-human current) → OFFSCREEN; then the
 * human's own active tab still captures by CDP. `--minimized`: the tab "screen4" in a minimized window
 * → WINDOW_MINIMIZED.
 */
async function r9cdp(): Promise<void> {
  const name = "t5-r9-cdp";
  const minimized = flag("--minimized");
  const client = await connectNamed(name);
  try {
    let tab: string;
    let h: ListedTab | undefined;
    if (minimized) {
      tab = requireMarker(await listTabs(client), "screen4").tab;
      await client.call("tabs.claim", { tab });
    } else {
      h = humanOf(await listTabs(client), "screen-human");
      tab = (await newTab(client, "r9-cdp", false)).tab;
      await evalJson(client, h.tab, barExpression(COLOURS.cyan, "HUMAN")); // the active-tab capture's colour (prereg verifier M1)
      if (!(await visible(client, h.tab, name))) return;
      await evalJson(client, tab, VISLOG_INSTALL);
      say(name, `human ${h.tab}, target ${tab} (background, leased to ${name}) — the call starts in 10000 ms (start the capture loop now)`);
      await sleep(10_000);
    }
    const t0 = Date.now();
    let err: unknown;
    try {
      await client.call("screenshot", { tab, mode: "cdp" }, { timeoutMs: 20_000 });
    } catch (e) {
      err = e;
    }
    const ms = Date.now() - t0;
    say(name, `call ${new Date(t0).toISOString()} → ${new Date(t0 + ms).toISOString()}: screenshot ${tab} mode:"cdp" → ${err === undefined ? "an image (no error)" : describeError(err)} in ${ms} ms`);
    const wantCode = minimized ? "WINDOW_MINIMIZED" : "OFFSCREEN";
    const wantMsg = minimized
      ? "Chrome's window is minimized, so CDP cannot capture the tab — restore the window, or call focusTab first"
      : "The tab is in the background of its window, and CDP cannot capture a hidden tab — use the default mode (it shows the tab briefly) or call focusTab first";
    const refused = err instanceof BridgeError && err.code === wantCode && err.message === wantMsg && ms < 1000;
    if (minimized) {
      say(name, `R9 SCREEN-4 cdp ${refused ? "PASS" : "FAIL"} — ${wantCode} with the exact message in < 1000 ms: ${refused ? "yes" : "no"} (the window must still be minimized: Test-T5Minimized)`);
      return;
    }
    await sleep(1000);
    const hl = await visLog(client, h!.tab);
    const xl = await visLog(client, tab);
    const hHidden = firstChange(hl, "hidden", t0 - 50);
    const xVisible = firstChange(xl, "visible", t0 - 50);
    say(name, `human tab hidden: ${rel(hHidden, t0)}; target visible: ${rel(xVisible, t0)}`);
    let activeOk = false;
    try {
      const r = (await client.call("screenshot", { tab: h!.tab, mode: "cdp" }, { timeoutMs: 20_000 })) as { dataUrl: string };
      const img = imageLine("r9-cdp-active.png", r.dataUrl);
      activeOk = img.colour === "cyan";
      say(name, `the human's active tab ${h!.tab} by mode:"cdp" → image ${img.line}`);
    } catch (e) {
      say(name, `the human's active tab ${h!.tab} by mode:"cdp" → ${describeError(e)}`);
    }
    const pass = refused && hHidden === undefined && xVisible === undefined && activeOk;
    say(name, `R9 SCREEN-2 (Chrome side) ${pass ? "PASS" : "FAIL"} — OFFSCREEN with the exact message in < 1000 ms: ${refused ? "yes" : "no"}; no tab switch: ${hHidden === undefined && xVisible === undefined ? "yes" : "no"}; the active tab still captures (cyan): ${activeOk ? "yes" : "no"}; banner: judged from the capture loop between the call's two times`);
  } finally {
    client.close();
  }
}

/**
 * Run 9, T5b fix 1 (pre-registered 2026-10-23): a default-mode capture that hangs restores the
 * window's previous tab at the 30 s chain bound, before the daemon's 35 s TIMEOUT. Induced as in Run 8
 * SCREEN-5's first attempt: the target's window fully covered by another driver window. Markers:
 * "restore-front" (active) and "restore-target" (background) in one window.
 */
async function r9restore(): Promise<void> {
  const name = "t5-r9-restore";
  const client = await connectNamed(name);
  try {
    const tabs = await listTabs(client);
    const front = requireMarker(tabs, "restore-front");
    const target = requireMarker(tabs, "restore-target");
    const layout = front.windowId === target.windowId && front.active && !target.active;
    say(name, `before — front ${showTab(front)}; target ${showTab(target)}; layout as required: ${layout ? "yes" : "no"}`);
    if (!layout) {
      say(name, "SET-UP: need restore-front active and restore-target in the background of one window");
      process.exitCode = 2;
      return;
    }
    await client.call("tabs.claim", { tab: target.tab });
    const watcher = await connectNamed("t5-r9-watch");
    const t0 = Date.now();
    let switchedAt: number | undefined;
    let restoredAt: number | undefined;
    let done = false;
    const call = client
      .call("screenshot", { tab: target.tab })
      .then(() => "an image (no error)", (e: unknown) => describeError(e))
      .finally(() => {
        done = true;
      });
    while (!done) {
      const now = await listTabs(watcher);
      const f = tabBy(now, front.tab);
      const t = tabBy(now, target.tab);
      if (switchedAt === undefined && t?.active) switchedAt = Date.now();
      if (switchedAt !== undefined && restoredAt === undefined && f?.active && !t?.active) restoredAt = Date.now();
      await sleep(500);
    }
    const outcome = await call;
    const t1 = Date.now();
    const after = await listTabs(watcher);
    watcher.close();
    const fA = tabBy(after, front.tab);
    const tA = tabBy(after, target.tab);
    say(name, `screenshot ${target.tab} → ${outcome} after ${t1 - t0} ms`);
    say(name, `target active from ${rel(switchedAt, t0)}; front active again ${rel(restoredAt, t0)}; after — front ${fA ? showTab(fA) : "absent"}; target ${tA ? showTab(tA) : "absent"}`);
    if (!outcome.startsWith("TIMEOUT")) {
      say(name, "R9 RESTORE not measured — the capture did not hang (set-up: the window was not fully covered)");
      process.exitCode = 2;
      return;
    }
    const inWindow = restoredAt !== undefined && restoredAt - t0 >= 25_000 && restoredAt - t0 < 35_000;
    const pass = inWindow && fA?.active === true && tA?.active === false;
    say(name, `R9 RESTORE ${pass ? "PASS" : "FAIL"} — previous tab back between 25 s and 35 s after the call (before the TIMEOUT): ${inWindow ? "yes" : "no"}; front active and target background afterwards: ${fA?.active && !tA?.active ? "yes" : "no"}`);
  } finally {
    client.close();
  }
}

// ---------------------------------------------------------------------------------------- main

const commands: Record<string, () => Promise<void>> = {
  check,
  find,
  info,
  open,
  mark,
  cleanup,
  lease2,
  lease3,
  lease5,
  lease6,
  screen1,
  screen2,
  screen3,
  screen4,
  screen5,
  bg1: () => bgInput("bg1"),
  bg2: () => bgInput("bg2"),
  bg4,
  "r9-cdp": r9cdp,
  "r9-restore": r9restore,
};

const cmd = commands[command];
if (!cmd) {
  console.log(`usage: npx tsx recipes/t5.ts <${Object.keys(commands).join("|")}> [args] — see the header of recipes/t5.ts`);
  process.exitCode = 2;
} else {
  run(`t5-${command}`, cmd);
}
