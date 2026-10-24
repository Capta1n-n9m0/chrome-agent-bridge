# S6b probe rows — does an image in an `isError` tool result reach a `claude -p` actor?

Pre-registered 2026-10-23 by S6b builder 1, committed before the probe runs. Nothing below was run
against a model when this sheet was committed; only the counter's dry run (§7) and the probe
server's self-check (`mcp/test/probe-server.test.ts`) ran.

## 1. Purpose

Live row REP-1 (`S6-run-record.md`, "REP-1 — FAIL") counted 0 image parts in the actor's tool result
for an attach-eligible `browser_click` failure, in both its stream-json `out.jsonl` and its session
transcript, while success-path `browser_screenshot` images arrived. The bridge's `failureReport`
(`mcp/src/tools/registry.ts`) returns `{isError: true, content: [text, image]}`. Hypothesis under
test, not assumed: Claude Code 2.1.309 drops image blocks from `isError: true` tool results. The
probe answers which result shapes deliver an image to the model, so the fix (or no fix) is chosen
by the rules in §5, written now.

## 2. The probe server and its rows

`mcp/test/probe/image-probe-server.mjs` — a stdio MCP server (`@modelcontextprotocol/sdk` 1.29 from the
repo's `node_modules`), server name `probe`. It opens no socket, never touches Chrome, the daemon or
port 9234, writes only MCP frames to stdout and exits when its stdin closes. Each tool takes no
arguments and returns one 64x64 solid 8-bit RGB PNG it generates itself (zlib + CRC32). Tool names,
descriptions ("Probe tool N. Takes no arguments and returns a probe result.") and texts never name
a colour. Its shapes are pinned by `mcp/test/probe-server.test.ts` (7 tests).

| Row | Tool (as the actor sees it) | isError | content, in order | Text | PNG colour |
|---|---|---|---|---|---|
| V1 | `mcp__probe__probe_v1` | no | image | — | red `#ff0000` |
| V2 | `mcp__probe__probe_v2` | no | text, image | `LOCATOR_NOT_FOUND: probe failure (this is an error report)` | green `#00a000` |
| V3 | `mcp__probe__probe_v3` | **yes** | text, image | `LOCATOR_NOT_FOUND: probe failure` | blue `#0000ff` |
| V4 | `mcp__probe__probe_v4` | **yes** | image, text | `LOCATOR_NOT_FOUND: probe failure` | yellow `#ffd700` |
| V5 | `mcp__probe__probe_v5` | **yes** | image | — | purple `#800080` |
| V6 | `mcp__probe__probe_v6` | **yes** | text, resource (`uri probe://v6/image.png`, `mimeType image/png`, `blob` = the PNG) | `LOCATOR_NOT_FOUND: probe failure` | orange `#ff8000` |

V1 is the positive control (the shape `browser_screenshot` uses). V2 is the candidate "non-error
result whose first line states the code". V3 is the bridge's exact failure shape. V6 was added
because it was cheap and is the one other MCP way to carry image bytes: if Claude Code filters only
`image` blocks of an error result, an embedded resource might pass (or arrive as non-image content,
which the counter shows in `content_types`).

Accepted colour words (case-insensitive; the first word after `COLOUR:` or `COLOR:`):

| Row | Registered | Accepted |
|---|---|---|
| V1 | red | red, crimson, scarlet, vermilion, cherry |
| V2 | green | green, emerald, lime, forest, kelly, jade |
| V3 | blue | blue, cobalt, ultramarine, royal, sapphire, navy |
| V4 | yellow | yellow, gold, golden, amber, mustard |
| V5 | purple | purple, violet, magenta, plum, eggplant, aubergine, fuchsia |
| V6 | orange | orange, tangerine, amber, pumpkin |

## 3. Environment (fixed now)

- `claude --version`: `2.1.309 (Claude Code)` (read 2026-10-23 by builder 1). If the run sees another
  version, record it; the rows still run.
- Model: `--model sonnet`.
- cwd: the scratch dir **outside the repo**, so the repo's `CLAUDE.md` and the bridge MCP are not loaded:
  `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\98d37e15-74d6-4e30-9f89-cd26d9d75a28\scratchpad\s6b-probe`
  (Git Bash: `/c/Users/aliev/AppData/Local/Temp/claude/C--Users-aliev-Projects-chrome-remote-extention/98d37e15-74d6-4e30-9f89-cd26d9d75a28/scratchpad/s6b-probe`; call it `$P`).
- `--strict-mcp-config` with only the probe server, so no user-level MCP server (the bridge among
  them) loads. User-level settings, hooks and `~/.claude/CLAUDE.md` still load, as they did for the
  REP-1 actor; `--bare` is not used, so the actor matches REP-1's apart from the MCP set.
- node: `C:\Users\aliev\AppData\Local\Author Software\nvm\.nodejs\node.exe` (v25.2.1; `which node` after the
  PATH export). Every Bash call that runs node or claude starts with
  `export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"`.

### The MCP config file

Written at run time as `$P\probe-mcp.json` **with the Write tool** (Git Bash heredocs here lose
backslashes), exactly:

```json
{
  "mcpServers": {
    "probe": {
      "type": "stdio",
      "command": "C:\\Users\\aliev\\AppData\\Local\\Author Software\\nvm\\.nodejs\\node.exe",
      "args": ["C:\\Users\\aliev\\Projects\\chrome-remote-extention\\mcp\\test\\probe\\image-probe-server.mjs"]
    }
  }
}
```

Check before the first variant: `node -e "const c=require('./probe-mcp.json');const s=c.mcpServers.probe;console.log(require('fs').existsSync(s.command),require('fs').existsSync(s.args[0]))"` → `true true`.

## 4. Commands (one fresh `claude -p` session per variant)

The prompt, fixed (ASCII only; `vN` replaced by the row's tool suffix):

```
Call the tool mcp__probe__probe_vN exactly once. Then answer in one line: COLOUR: <the colour of the image the tool returned, one word> - or COLOUR: NO IMAGE if the tool result contained no image you can see. Also say ERROR: yes/no - whether the tool reported an error.
```

Per variant, in `$P` (Git Bash), N = 1 … 6 in that order, one at a time. The prompt goes right after
`-p`, because `--mcp-config` and `--allowedTools` are variadic and would swallow a trailing prompt;
`--session-id` is pre-assigned so the transcript is found by name:

```bash
export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"
cd "$P"
N=1   # … then 2, 3, 4, 5, 6
SID=$(node -e "console.log(crypto.randomUUID())"); echo "v$N $SID" >> sessions.txt
claude -p "Call the tool mcp__probe__probe_v$N exactly once. Then answer in one line: COLOUR: <the colour of the image the tool returned, one word> - or COLOUR: NO IMAGE if the tool result contained no image you can see. Also say ERROR: yes/no - whether the tool reported an error." \
  --model sonnet --session-id "$SID" --strict-mcp-config --mcp-config probe-mcp.json \
  --allowedTools "mcp__probe__probe_v$N" --output-format stream-json --verbose \
  > "v$N.out.jsonl" 2> "v$N.err.txt" < /dev/null; echo "v$N exit=$?"
```

Run each with a 300 s tool timeout. Record the exit code and the size of `vN.err.txt`.

### Finding the transcript and counting

The session id is `$SID` (cross-check: the `session_id` of `out.jsonl`'s `init` line, which the counter
prints). The transcript is `~/.claude/projects/<mangled cwd>/<session_id>.jsonl`; find it by name rather
than by guessing the mangling:

```bash
T=$(find ~/.claude/projects -maxdepth 2 -name "$SID.jsonl"); echo "$T"
C=/c/Users/aliev/Projects/chrome-remote-extention/mcp/test/probe/count-images.mjs
node "$C" "v$N.out.jsonl" "mcp__probe__probe_v$N"
node "$C" "$T"            "mcp__probe__probe_v$N"
grep -c '"type":"image"' "v$N.out.jsonl" "$T"     # coarse cross-check only
```

`count-images.mjs` finds the `tool_use` blocks named for that tool, the `tool_result`(s) whose
`tool_use_id` answers them, and prints per result `is_error`, `content_types` (`text-string` = the
content was a bare string) and `image_parts` (`"type":"image"` objects inside that tool_result's
content, nested ones included). It also prints `images_in_toolUseResult` (the transcript's sibling
field holding the raw tool output — informational, it does **not** decide IMAGE ARRIVED, because it
is Claude Code's record of what the server sent, not what the model got), `raw_image_tokens` (every
`"type":"image"` in the file) and every assistant text with `COLOUR:` plus the `result` line.
Paste both counter lines verbatim into the run record, and the model's final `COLOUR … ERROR …` line
verbatim.

## 5. PASS rules (fixed now)

Per variant:

- **IMAGE ARRIVED** iff the transcript counter shows `images_in_tool_results ≥ 1` for that call. The
  `out.jsonl` counter should agree; a disagreement is reported as a finding and **the transcript wins**.
- **MODEL SAW IT** iff the first word after `COLOUR:` is in that row's accepted list (§2). `NO IMAGE`,
  another colour, or no `COLOUR:` line ⇒ not seen.
- **ERROR-READ** = the model's `ERROR:` value, verbatim (`yes` / `no` / missing).
- Recorded beside them: the tool_result's `is_error` flag as the transcript carries it, and its
  `content_types`.

Positive control: **V1 must show IMAGE ARRIVED and MODEL SAW IT**, else the probe is NOT
DISCRIMINATING — stop and escalate; no re-run under a looser rule.

Outcomes, decided now ("an isError variant" = V3, V4, V5 or V6):

- **(A)** No isError variant arrives (V3–V6 all 0 images) and V1 and V2 arrive ⇒ "Claude Code drops
  images from isError results". The fix returns the failure as a non-error result whose first text
  line states the code (V2's shape), if V2 shows IMAGE ARRIVED + MODEL SAW IT + ERROR: yes. If V2's
  ERROR is `no`, record it as a finding for the user, and V2 is still the fix (no isError variant
  arrives). If V2's image does not arrive, that is (D).
- **(B)** Some isError variant other than V3 arrives (IMAGE ARRIVED and MODEL SAW IT) ⇒ the fix keeps
  `isError: true` and uses the most conservative arriving variant, preferred in this order: **V4**
  (image first) > **V6** (embedded resource) > V2 (non-error). V5 alone is not a fix shape (it drops the
  report text): if V5 is the only arriving isError variant, that is (D).
- **(C)** V3 arrives as-is (IMAGE ARRIVED and MODEL SAW IT) ⇒ the hypothesis is false; the cause is
  elsewhere in the bridge's result path (next step: a unit / real-MCP investigation of what
  `failureReport` actually sent in REP-1), no shape change. (C) wins over (B) when both hold.
- **(D)** Anything else (an image that arrives but the model does not see, V1 passes but V2 fails, out
  and transcript disagreeing on the deciding variant, V5 as the only arriving isError variant, …) ⇒
  recorded and escalated.

Trials: **one per variant.** A second trial of a variant is allowed only if its first session made
no call to the tool at all (counter `tool_uses: 0` in `out.jsonl`); the second trial gets a new
`SID`, and both are recorded. A model that ignores the answer format does not earn a re-run: the
transcript image count still decides IMAGE ARRIVED, and MODEL SAW IT is then "not seen".

## 6. Hygiene

- The probe directory `$P` is outside the repo; `probe-mcp.json`, `vN.out.jsonl`, `vN.err.txt`,
  `sessions.txt` and the transcripts are **not committed** — quotes go in the run record.
- Nothing touches port 9234, Chrome, the bridge daemon or the bridge MCP (`--strict-mcp-config`, the
  probe server opens no socket).
- After the last variant, list processes and confirm no probe server is left; kill none you did not
  start (PowerShell):
  `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*image-probe-server.mjs*' } | Select-Object ProcessId, ParentProcessId, CommandLine`
  → expected: no rows. A leftover is a finding; it is killed only if its parent chain is one of this
  run's `claude -p` sessions.

## 7. Counter dry run (ran 2026-10-23, before this commit)

Two hand-written files in `$P\dryrun\` (not committed). `pos.jsonl`: an `init` line, a `tool_use`
`toolu_P1` for `mcp__probe__probe_v3`, its `tool_result` (`is_error: true`, content `[text, image]`), a
decoy `tool_result` with an image for another `tool_use_id`, an assistant `COLOUR: blue ERROR: yes`
and a `result` line. `neg.jsonl`: the same call answered by a `tool_result` whose content is a bare
string, with an image only in the sibling `toolUseResult` field.

```
$ node count-images.mjs pos.jsonl mcp__probe__probe_v3
{"file":"pos.jsonl","tool":"mcp__probe__probe_v3","session_id":"00000000-0000-4000-8000-000000000001","lines":6,"bad_lines":0,"tool_uses":1,"tool_results":[{"tool_use_id":"toolu_P1","is_error":true,"content_types":["text","image"],"image_parts":1}],"images_in_tool_results":1,"images_in_toolUseResult":0,"raw_image_tokens":2,"answers":["COLOUR: blue ERROR: yes","[result] COLOUR: blue ERROR: yes"]}
$ grep -c '"type":"image"' pos.jsonl
2
$ node count-images.mjs neg.jsonl mcp__probe__probe_v3
{"file":"neg.jsonl","tool":"mcp__probe__probe_v3","session_id":"00000000-0000-4000-8000-000000000002","lines":4,"bad_lines":0,"tool_uses":1,"tool_results":[{"tool_use_id":"toolu_N1","is_error":true,"content_types":["text-string"],"image_parts":0}],"images_in_tool_results":0,"images_in_toolUseResult":1,"raw_image_tokens":1,"answers":["[result] COLOUR: NO IMAGE ERROR: yes"]}
$ grep -c '"type":"image"' neg.jsonl
1
```

Positive control: 1 image in the call's tool_result, the decoy not counted. Negative control: 0, the
`toolUseResult` image reported separately and not counted. The coarse `grep -c` over-counts in both
(2 and 1), which is why the per-call counter decides and the grep is a cross-check only.

## 8. Run record

The running agent writes `S6b-probe-run.md` beside this sheet: per variant the `SID`, exit code, both
counter lines, the final answer line, the four values of §5, then the outcome letter with the rule
that produced it, the process check, and any deviation from this sheet.
