// recipes/s11-r16-opt.ts: UP-OPT's judge. s11-win.ps1 Invoke-S11Opt writes what the options page showed (OptObs plus foundCount and
// firstTypedLine) to a file outside the repo; this prints CHECK / ROW lines from s11-rules.ts optExpected + optVerdict and nothing
// else (no text of the page, no hash). Exit 0 pass, 1 fail, 2 STOP (unreadable input).
//   node --import tsx recipes/s11-r16-opt.ts <obs.json>
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { checkLine, optExpected, optVerdict, rowLine, type Judged, type OptObs } from "./s11-rules.js";

export function judgeOpt(obs: OptObs & { foundCount: number; firstTypedLine: number }): { lines: string[]; pass: boolean } {
  const res = optVerdict(obs, optExpected(obs.foundCount, obs.firstTypedLine));
  const lines = res.map((r) => checkLine(`UP-OPT ${r.step}`, r.j));
  const pass = res.every((r) => r.j.pass);
  const j: Judged = pass ? { pass, why: "every clause held" } : { pass, why: `${res.filter((r) => !r.j.pass).length} clause(s) failed` };
  return { lines: [...lines, rowLine("UP-OPT", j)], pass };
}

export function main(argv: readonly string[]): number {
  try {
    const obs = JSON.parse(readFileSync(argv[0] ?? "", "utf8")) as OptObs & { foundCount: number; firstTypedLine: number };
    const r = judgeOpt(obs);
    for (const l of r.lines) console.log(l);
    return r.pass ? 0 : 1;
  } catch {
    console.log("STOP: UP-OPT: the observation file is unreadable");
    return 2;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
