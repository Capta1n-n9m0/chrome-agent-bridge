// recipes/s11-evidence.ts — scans committed-evidence files (the run record, the framing output, a report) with the same fixture
// rule as UP-LOGS (s11-rules.ts isFixture11 / scanText, #277). Run 16, S5-liveA set-up fix (#281 (a)): a runner hand-counted
// `scheme://host` and called chrome://extensions non-fixture; this counts by code.
//   npm run recipe -- recipes/s11-evidence.ts --file <f> [--file <f2> ...]
// One count line per file, counts only, never the matched text. Not a row: no ROW/CHECK line. No daemon, no SDK, no connection.
// The sentinel is counted by its generic shape (`s11-` + 12 hex: the per-run one is gone after teardown), and by state.json's
// when that file still exists. Exit 0 when other + token + sentinel + profile are all 0, else 2 (1 for a usage error).
import { existsSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extensionIdFromPath } from "./s9-rules.js";
import { scanText, type Scan } from "./s11-rules.js";

const GENERIC_SENTINEL = /s11-[0-9a-f]{12}/gi;
const GENERIC_ONE = /^s11-[0-9a-f]{12}$/i;

export interface EvidenceCtx {
  token?: string;
  /** The per-run sentinel from state.json, when it still exists. */
  sentinel?: string;
  profile: readonly string[];
  ownId?: string;
}

/** The UP-LOGS counts for one text, with the sentinel also counted by its generic pattern (no double count of the same shape). */
export function evidenceCounts(text: string, ctx: EvidenceCtx): Scan {
  const extra = ctx.sentinel && !GENERIC_ONE.test(ctx.sentinel) ? ctx.sentinel : "";
  const base = scanText(text, { token: ctx.token, sentinel: extra, profile: ctx.profile, ownId: ctx.ownId });
  const generic = text.match(GENERIC_SENTINEL)?.length ?? 0;
  return { ...base, sentinel: base.sentinel + generic };
}

export function evidenceLine(name: string, s: Scan): string {
  return `EVIDENCE ${name}: ://=${s.urls} (fixture ${s.fixture}, other ${s.other}) token=${s.token} sentinel=${s.sentinel} profile=${s.profile}`;
}

export const evidenceClean = (s: Scan): boolean => s.other + s.token + s.sentinel + s.profile === 0;

export function filesFromArgv(argv: readonly string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) if (argv[i] === "--file" && argv[i + 1] !== undefined) out.push(argv[++i]!);
  return out;
}

export function main(argv: readonly string[]): number {
  const files = filesFromArgv(argv);
  if (files.length === 0) {
    console.log("STOP: evidence needs --file <f> [--file <f2>]");
    return 1;
  }
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const out = process.env.S11_OUT?.trim() || join(tmpdir(), "bridge-e2e", "s11");
  let sentinel: string | undefined;
  try {
    const st = join(out, "state.json");
    if (existsSync(st)) sentinel = (JSON.parse(readFileSync(st, "utf8")) as { sentinel?: string }).sentinel;
  } catch {
    sentinel = undefined;
  }
  const tf = join(repo, "bridge.token");
  const token = process.env.BRIDGE_TOKEN?.trim() || (existsSync(tf) ? readFileSync(tf, "utf8").trim() : undefined);
  const ctx: EvidenceCtx = { token: token || undefined, sentinel, profile: [homedir()], ownId: extensionIdFromPath(join(repo, "extension")) };
  let clean = true;
  for (const f of files) {
    if (!existsSync(f)) {
      console.log(`STOP: evidence file missing: ${f.split(/[\\/]/).pop()}`);
      return 1;
    }
    const s = evidenceCounts(readFileSync(f, "utf8"), ctx);
    console.log(evidenceLine(f.split(/[\\/]/).pop() ?? "file", s));
    if (!evidenceClean(s)) clean = false;
  }
  return clean ? 0 : 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
