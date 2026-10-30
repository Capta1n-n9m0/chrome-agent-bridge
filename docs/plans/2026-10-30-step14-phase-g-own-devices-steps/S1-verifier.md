# Step 14 S1 verifier: the ~ path

Model / effort: Opus, medium. Role: verifier (`docs/agent-rules.md` §6). Deviation (from the brief): verified in a scratch
git worktree at HEAD `6e22e3b` with S1's four files copied in, its own `npm ci` (no junction to the main tree), because
S2a is in flight in the main tree. The worktree was removed after its `@bridge/*` junctions (all pointing inside the
worktree) were removed with `cmd /c rmdir`; the main tree's `node_modules/.bin` is still present.

## 1. Verdict: PASS-with-notes

P1.1 holds: S1's tests show a home-folder path as `~\…` and a non-home path unchanged, and no other message changed.
One MINOR finding (F1, a display bug for a home folder containing `İ`) and NITs. I recommend fixing F1 in this stage, since
the fix is cheap and the phase is about the user's other devices.

## 2. Outputs (the commands I ran)

| Check | Result | Evidence |
|---|---|---|
| `npm run typecheck` | exit 0 | `S1-verifier-tsc.txt` |
| `npx tsc --noEmit -p recipes/tsconfig{,.fe,.s6,.s9,.s10,.s11,.s11b,.s13}.json` | all eight exit 0 (`.s6` covers `test/s12-r19-static.test.ts`) | `S1-verifier-tsc.txt` |
| `npm run build` | exit 0 (daemon, mcp, extension built) | `S1-verifier-build.txt` |
| `npm test`, fresh checkout as is | 9 failed / 6027 passed (6036), 1 of 252 files failed: all 9 in `recipes/test/s11-r16-runner.test.ts` | `S1-verifier-test-crlf.txt` |
| `npm test`, `recipes/*.ps1` set to LF in the scratch tree only | **6036 passed (6036), 252 files** | `S1-verifier-test.txt` |
| Red proof: `sdk/src/error.ts` at HEAD, S1's tests | 5 failed (all 5 new behaviour tests, including the end-to-end `report()` one); the 6th new test (the temp dir stays absolute) passes on old code, which is right because it guards "unchanged" | `S1-verifier-red.txt` |
| Red proof: the re-stated static test against HEAD's `error.ts` | 1 failed (the re-stated pin) | `S1-verifier-red.txt` |
| Green: S1's `error.ts` with s14, failure-report, s12-r19-static and s5-cross | 116 passed (4 files) | `S1-verifier-red.txt` |

The 9 red tests are not S1's. They come from Stage0 m2: a fresh checkout has CRLF `.ps1` files (`core.autocrlf=true`), while the main
tree's copy is LF. They pass once the `.ps1` files are LF. The test count goes from 6030 to 6036 (+5 in the new
`s14-home-path.test.ts`, +1 in `failure-report.test.ts`), which matches the builder's claim; I re-derived it from the run.

## 3. Attacks and what they showed

- **`git diff` of S1's files.** In `error.ts`, the only output change is the `Screenshot:` line: `tail.push` now prints
  `homeAsTilde(...)`, and a `home` field is added to `ReportInput`. `err.screenshotPath` is still assigned the absolute
  `file`, and the file write is unchanged. No other message string changed, and no existing expectation was edited. The only edited
  expectation is the static pin.
- **The static pin.** The old test pinned the exact source text `` tail.push(`Screenshot: ${input.screenshotPath}`) ``,
  and the new one pins the exact new text. The pin is just as strict: an exact substring of the source, and it fails against HEAD's
  `error.ts` (red proof above). Its three other pins (`failuresDir` source, `failure-report.test.ts:540`, `s5-cross.test.ts:230`) are
  untouched and still pass. `SHOT_LINE_RE` (`recipes/s12-r19.ts:54`) still matches the `~` line
  (`S1-verifier-probe.txt`, last line: `true`).
- **Case and separators** (probe, `S1-verifier-probe.txt`). `c:\USERS\AB\Sub\X.png` under `C:\Users\ab` → `~\Sub\X.png`.
  Forward slashes in the path or the home → `~\a\b.png`. A trailing separator on the home is handled. The rest of the path
  keeps its own case.
- **Sibling prefix.** `C:\Users\abc\x.png` under `C:\Users\ab` stays unchanged. **The home itself** stays unchanged. **Another drive** (`D:`)
  stays unchanged. **A `\\?\` long path** stays unchanged. **UNC:** a UNC path under a drive home stays unchanged, and so does a UNC path under a UNC home (see N1).
  A POSIX home is case-sensitive, `/home/u2` is not under `/home/u`, and `/` as the home does nothing.
- **The os.tmpdir trap.** On this machine `os.tmpdir()` is under `os.homedir()` (probe: `true`). A tmpdir shot with the real home
  would print `~`. With an injected home elsewhere, or with no `home` given, it stays absolute (probe). Every existing test
  injects a home that is not the shot's parent (`failure-report.test.ts:140` `dir/home`, `s5-cross.test.ts:174`
  `home-not-used`), or one that is not a parent of the env dir. The new end-to-end test injects a temp home with `env: {}`, so it
  works on any OS.
- **The seam end to end.** In the SDK, `enrich` sets `home: opts.homedir()`, and `opts` comes from `client.ts:225`
  (`options.homedir ?? os.homedir`). In the MCP, `registry.ts` passes `{...reports, call}` to `attachContext`, and
  `reports.homedir` is `os.homedir` (real) or the injected `failureReports`. I proved it in the scratch tree by mutating
  `s5-cross.test.ts` (home → `root`, expect `Screenshot: ~<sep>failures`): 3/3 passed, and the image block from the
  absolute path was still delivered (`S1-verifier-mcp-seam.txt`; the mutation was reverted and never touched the main tree).

## 4. Findings

**F1 · MINOR · `sdk/src/error.ts:315,319`. A home containing `İ` (U+0130) prints a wrong path.** `norm` uses
`toLowerCase()`, which turns `İ` into two code units (`i̇`). `h.length` then counts one more than the original home, and
`p.slice(h.length + 1)` cuts one character too many. Evidence (`S1-verifier-probe.txt`), via `npx tsx` on a probe calling
`homeAsTilde`: home `C:\Users\İlham`, path `…\İlham\.chrome-agent-bridge\failures\a.png` →
`~\chrome-agent-bridge\failures\a.png`. The leading `.` is lost, so the report names a folder that does not exist. The effect is on
display only: the PNG and `err.screenshotPath` are correct, and the MCP still attaches the image. `İ` is a common letter in Azerbaijani and
Turkish names, and the phase targets the user's other devices. Suggested fix: fold case without changing length (for example,
`s.replace(/[A-Z]/g, c => c.toLowerCase())`), or test `norm(p.slice(0, home.length))` against `norm(home)` and slice by
the original home's length. Add a test with `C:\Users\İlham`.

**N1 · NIT · `sdk/src/error.ts:314`. A UNC Windows home (`\\server\share\u`) is treated as POSIX.** The match is exact
with a `/` separator, so a path under it is never shown as `~` (probe). This fails safe (the path stays unchanged), and roaming
or redirected homes are rare.

**N2 · NIT · `sdk/src/error.ts:280`. `opts.homedir()` is now called outside the screenshot task.** If it throws, `attachContext`'s
catch drops the whole report, where before only the screenshot failed, and with `BRIDGE_FAILURES_DIR` set nothing failed.
`os.homedir` throws only in an environment without HOME/USERPROFILE and no passwd entry. Suggested fix: wrap the call (`home`
undefined on a throw).

**N3 · NIT · stale wording.** The comment at `recipes/s12-r19.ts:53` still says `error.ts` prints `` `Screenshot: ${path}` ``, and the
static test's title (`recipes/test/s12-r19-static.test.ts:60`) still reads "prints `Screenshot: <path>`". Neither is wrong about what
the regex accepts. `recipes/s6-rules.ts:125` compares the line with the absolute path. That is a past wave's rule, outside `npm test`
(already noted in Stage0 m1), and it would fail if re-run live against the default folder.

## 5. Deviations
Verified in a scratch worktree (as briefed). To get a clean `npm test` reading, the scratch tree's `recipes/*.ps1` were
converted to LF and then restored with `git checkout -- recipes` in the worktree only. That also reverted the copied static test, which
I copied in again before the red and green runs (the full green run of 6036 used S1's static test). The main tree was only read.

## 6. Proposed decisions
None. The builder's case and separator rule is consistent with P1.1, apart from F1.

## 7. Handoff
The scratch worktree `s1-verify` is removed. Another worktree, `s2a-verify`, exists and is not mine. Evidence:
`S1-verifier-{tsc,build,test,test-crlf,red,probe,mcp-seam}.txt` in this folder. They are scrubbed of the user name and home path, and the
probe uses only synthetic names.
