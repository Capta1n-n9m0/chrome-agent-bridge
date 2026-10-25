#!/usr/bin/env node
// Proof for stage L2 of the lean-procedures work (exit checks L.1, L.3, L.4).
// Compares the new CLAUDE.md files and decisions files against the baseline commit 817f8b1.
// Usage (from the repo root): node docs/plans/2026-10-25-lean-procedures-steps/check-l2.mjs
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const BASE = "817f8b1";
const git = (a) => execSync(`git ${a}`, { encoding: "utf8", maxBuffer: 64 << 20 });
const norm = (s) => s.replace(/\s+/g, " ").trim();
let fail = 0;
const bad = (m) => { fail++; console.log("  FAIL " + m); };

// ---- L.1: bold gotcha headlines of the old CLAUDE.md ------------------------------------------
const oldMd = git(`show ${BASE}:CLAUDE.md`);
const lines = oldMd.split("\n");
const start = lines.findIndex((l) => l.startsWith("## Runtime gotchas"));
const end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
const section = lines.slice(start + 1, end).join("\n");
// A gotcha item starts with "- **" at column 0; its headline is the first bold span (may wrap lines).
const items = [];
for (const m of section.matchAll(/^- \*\*([\s\S]*?)\*\*/gm)) items.push({ headline: norm(m[1]), at: m.index });
// the item body runs to the next item start
items.forEach((it, i) => (it.body = section.slice(it.at, i + 1 < items.length ? items[i + 1].at : section.length)));
// Gotchas outside the Runtime gotchas section that carry a bold headline are not counted here.

const CLAUDE_FILES = git("ls-files --cached --others --exclude-standard").split("\n")
  .filter((f) => /(^|\/)CLAUDE\.md$/.test(f) && !f.startsWith("node_modules"));
const newText = Object.fromEntries(CLAUDE_FILES.map((f) => [f, readFileSync(f, "utf8")]));

console.log(`L.1  old gotcha items: ${items.length}; CLAUDE.md files now: ${CLAUDE_FILES.length}`);
// Cleanup follow-up G (2026-10-25, "gotchas follow the code"): bullets whose text was split between two files get one
// new headline per part; a bullet folded into another has no headline of its own any more. Every other old headline
// is found as it was, exactly once.
const SPLIT = {
  "The daemon's bind is the lock; the MCP never crashes when there is no daemon.":
    ["The daemon's bind is the lock.", "The MCP never crashes when there is no daemon"],
  "The `saveTo` store is worker memory; the file finish uses `link`.":
    ["The `saveTo` store is worker memory.", "The `saveTo` file finish hard-links `.part` to the target"],
};
const MERGED = {
  "Never log a URL from the service worker": "Never log a pattern, URL or title from the safety code.",
};
// Where each bullet moved by follow-up G now lives (headline, file); it must be there once and in no other CLAUDE.md.
const PLACED = [
  ["On Windows `spawn(…, {detached: true})` keeps the child in the parent's process tree", "sdk/CLAUDE.md"],
  ["A pre-Step-6 server on 9234 takes a v2 hello as the extension.", "sdk/CLAUDE.md"],
  ["Every client must agree on `BRIDGE_PORT`.", "sdk/CLAUDE.md"],
  ["A daemon spawned through `Start-Process -NoNewWindow` held the caller's output pipe open", "sdk/CLAUDE.md"],
  ["`ws` emits several frames from one TCP read synchronously", "sdk/CLAUDE.md"],
  ["The MCP never crashes when there is no daemon", "mcp/CLAUDE.md"],
  ["The daemon's bind is the lock.", "daemon/CLAUDE.md"],
  ["`browser_new_tab`'s `active` flag", "mcp/CLAUDE.md"],
  ["The MCP's trusted tools focus first.", "mcp/CLAUDE.md"],
  ["Trusted input is `focusFirst`", "sdk/CLAUDE.md"],
  ["The SDK rewrites a failure report's `candidates` refs", "sdk/CLAUDE.md"],
  ["The `saveTo` file finish hard-links `.part` to the target", "sdk/CLAUDE.md"],
  ["The `saveTo` store is worker memory.", "extension/CLAUDE.md"],
  ["The block list is not a network firewall.", "extension/CLAUDE.md"],
];
const countOf = (needle) => CLAUDE_FILES.reduce((n, f) => n + norm(newText[f]).split(needle).length - 1, 0);
const filesOf = (needle) => CLAUDE_FILES.filter((f) => norm(newText[f]).includes(needle));
const where = {};
const homeOf = {}; // old headline -> the files whose text holds it now (for the fidelity check)
let pairs = 0;
for (const it of items) {
  const parts = SPLIT[it.headline] ?? null;
  if (MERGED[it.headline]) {
    const own = "**" + it.headline + "**", home = "**" + MERGED[it.headline] + "**";
    if (countOf(own) !== 0 || countOf(home) !== 1) bad(`merged bullet: own headline x${countOf(own)}, home x${countOf(home)}: ${it.headline.slice(0, 70)}`);
    else { pairs++; homeOf[it.headline] = filesOf(home); (where[filesOf(home)[0]] ??= []).push(it.headline); }
    continue;
  }
  const needles = (parts ?? [it.headline]).map((h) => "**" + h + "**");
  const ok = needles.every((n) => filesOf(n).length === 1 && countOf(n) === 1) && countOf("**" + it.headline + "**") === (parts ? 0 : 1);
  homeOf[it.headline] = needles.flatMap((n) => filesOf(n));
  (where[homeOf[it.headline].join(",") || "(none)"] ??= []).push(it.headline);
  if (!ok) bad(`headline in ${homeOf[it.headline].length} files: ${it.headline.slice(0, 80)} -> [${homeOf[it.headline].join(", ")}]`);
  else pairs++;
}
for (const [h, f] of PLACED) {
  const n = "**" + h + "**";
  if (countOf(n) !== 1 || filesOf(n)[0] !== f) bad(`moved bullet not only in ${f}: ${h.slice(0, 70)} -> [${filesOf(n).join(", ")}] x${countOf(n)}`);
}
console.log(`  moved bullets (follow-up G) each in its one expected file: ${PLACED.length}`);
console.log(`  headlines found in exactly one file, once: ${pairs}/${items.length}`);
for (const [f, hs] of Object.entries(where)) console.log(`    ${f}: ${hs.length}`);

// Body fidelity: after removing history notes, every old body word-sequence of 6 words must be in the same
// new file (shingle check) except for the allowed edits; report the share missing per item (info, not a gate).
const stripNotes = (s) => s.replace(/\*(?:Superseded|Corrected|Updated)\b[\s\S]*?\*(?=\s|$|\)|\.)/g, " ");
const shingles = (s, k = 6) => { const w = norm(s).split(" "); const out = []; for (let i = 0; i + k <= w.length; i++) out.push(w.slice(i, i + k).join(" ")); return out; };
const lowFidelity = [];
for (const it of items) {
  const fs = [...new Set(homeOf[it.headline] ?? [])];
  if (!fs.length) continue;
  const hay = norm(fs.map((f) => newText[f]).join("\n"));
  const sh = shingles(stripNotes(it.body).replace(/^- /, ""));
  const miss = sh.filter((s) => !hay.includes(s)).length;
  if (sh.length && miss / sh.length > 0.02) lowFidelity.push(`${(100 * miss / sh.length).toFixed(1)}% of ${sh.length} six-word runs changed: ${it.headline.slice(0, 70)}`);
}
console.log(`  items with more than 2% of their six-word runs changed (history notes excluded): ${lowFidelity.length}`);
lowFidelity.forEach((l) => console.log("    " + l));


// Key files: the old "### Key files" section (history notes stripped) must reappear in the package files.
{
  const ks = lines.findIndex((l) => l.startsWith("### Key files"));
  const ke = lines.findIndex((l, i) => i > ks && /^## /.test(l));
  const old = norm(stripNotes(lines.slice(ks + 1, ke).join("\n")));
  const all = norm(Object.values(newText).join("\n"));
  const w = old.split(" ");
  const missing = [];
  for (let i = 0; i + 6 <= w.length; i++) if (!all.includes(w.slice(i, i + 6).join(" "))) missing.push(i);
  // merge missing runs into regions
  const regions = [];
  for (const i of missing) { const last = regions[regions.length - 1]; if (last && i <= last.end) last.end = i + 6; else regions.push({ start: i, end: i + 6 }); }
  console.log(`  Key files: ${w.length} old words; ${regions.length} changed region(s):`);
  regions.forEach((r) => console.log("    OLD> " + w.slice(Math.max(0, r.start - 2), r.end + 2).join(" ").slice(0, 260)));
}

// history notes gone from every CLAUDE.md
const notes = CLAUDE_FILES.flatMap((f) => [...newText[f].matchAll(/\*(?:Superseded|Corrected|Updated)\s[0-9]/g)].map(() => f));
console.log(`  history notes left in CLAUDE.md files: ${notes.length}`);
if (notes.length) bad("history notes remain: " + [...new Set(notes)].join(", "));

// ---- L.3: decision entries --------------------------------------------------------------------
const oldDec = git(`show ${BASE}:docs/decisions.md`);
const split = (txt) => {
  const L = txt.split("\n"); const out = []; let cur = null;
  for (const l of L) {
    if (/^### /.test(l)) { if (cur) out.push(cur); cur = [l]; }
    else if (/^#{1,2} /.test(l)) { if (cur) out.push(cur); cur = null; }
    // A dated marker directly under a heading (cleanup follow-up D, 2026-10-25) is not part of the entry text.
    else if (cur && cur.length === 1 && /^\*(Superseded|Ruled|Corrected|Note)\b/.test(l)) continue;
    else if (cur) cur.push(l);
  }
  if (cur) out.push(cur);
  return out.map((a) => a.join("\n").replace(/\s+$/, ""));
};
const oldEntries = split(oldDec);
const decFiles = ["docs/decisions.md", ...readdirSync("docs/decisions-archive").filter((f) => f.endsWith(".md")).sort().map((f) => "docs/decisions-archive/" + f)];
const newEntries = decFiles.flatMap((f) => split(readFileSync(f, "utf8")).map((e) => ({ f, e })));
console.log(`L.3  old '### ' entries: ${oldEntries.length}; new (decisions.md + archive): ${newEntries.length}`);
const perFile = {};
newEntries.forEach(({ f }) => (perFile[f] = (perFile[f] ?? 0) + 1));
Object.entries(perFile).forEach(([f, n]) => console.log(`    ${f}: ${n}`));
const newSet = new Map();
newEntries.forEach(({ e, f }) => newSet.set(e, [...(newSet.get(e) ?? []), f]));
let ok = 0;
for (const e of oldEntries) {
  const got = newSet.get(e) ?? [];
  if (got.length === 1) ok++; else bad(`entry ${got.length}x: ${e.split("\n")[0].slice(0, 90)}`);
}
console.log(`  entries present once, text identical: ${ok}/${oldEntries.length}`);
// Entries recorded after the baseline (e.g. #231, 2026-10-25) are new, not lost: only fewer entries than the baseline is a failure.
if (newEntries.length < oldEntries.length) bad("entry counts differ");
else if (newEntries.length > oldEntries.length) console.log(`  (${newEntries.length - oldEntries.length} entry/entries recorded since the baseline, not compared)`);


// Standing decisions: every line must name an entry that exists in the file it points to.
{
  const dec = readFileSync("docs/decisions.md", "utf8");
  const sec = dec.slice(dec.indexOf("## Standing decisions"), dec.indexOf("## Archive"));
  const lines2 = sec.split("\n").filter((l) => /^- \d{4}-\d\d-\d\d · /.test(l));
  let good = 0;
  for (const l of lines2) {
    const m = l.match(/^- (.*?) — (`decisions-archive\/step\d+\.md`|this file \(Log\))/);
    if (!m) { bad("unparsable standing line: " + l.slice(0, 80)); continue; }
    const file = m[2].startsWith("`") ? "docs/" + m[2].replace(/`/g, "") : "docs/decisions.md";
    const heads = readFileSync(file, "utf8").split("\n").filter((x) => x.startsWith("### ")).map((x) => x.slice(4));
    if (heads.includes(m[1])) good++; else bad("standing line without its entry in " + file + ": " + m[1].slice(0, 80));
  }
  console.log(`Standing decisions: ${lines2.length} lines; each names an existing entry in its file: ${good}/${lines2.length}`);
  const tbl = [...dec.matchAll(/\| \[`(step\d+\.md)`\].*?\| (\d+) \|/g)];
  for (const [, f, n] of tbl) {
    const real = readFileSync("docs/decisions-archive/" + f, "utf8").split("\n").filter((x) => x.startsWith("### ")).length;
    if (real !== Number(n)) bad(`archive index says ${n} for ${f}, file has ${real}`);
  }
  console.log(`Archive index: ${tbl.length} rows, entry counts match the files`);
}

// ---- L.4: no code file changed ----------------------------------------------------------------
const changed = git(`diff --name-only ${BASE}`).split("\n").filter(Boolean);
const untracked = git("ls-files --others --exclude-standard").split("\n").filter(Boolean);
const nonMd = [...changed, ...untracked].filter((f) => !f.endsWith(".md") && f !== "scripts/doc-check.mjs");
console.log(`L.4  files changed since ${BASE} (tracked + untracked): ${changed.length + untracked.length}; not .md / doc-check: ${nonMd.length}`);
nonMd.forEach((f) => console.log("    " + f));

console.log(fail ? `RESULT: ${fail} problem(s)` : "RESULT: all checks pass (L.4 lists files above for the reader)");
process.exit(fail ? 1 : 0);
