# S6b probe record — image in an `isError` tool result

Run 2026-10-23 by S6b builder 1 (Claude Opus 5.5), on the step agent's instruction, exactly as
`S6b-probe-rows.md` (committed in `201f5c8`) §3–§6 say. **Outcome: (A) — Claude Code 2.1.309 drops
images from isError results; the fix is V2's shape.** One trial per variant; no re-run.

Name: the sheet's §8 calls this file `S6b-probe-run.md`; the step agent's brief names it
`S6b-probe-record.md`. That is a rename only; nothing else differs.

## Environment check

```
$ claude --version
2.1.309 (Claude Code)
$ which node; node --version
/c/Users/aliev/AppData/Local/Author Software/nvm/.nodejs/node
v25.2.1
$ node -e "const c=require('./probe-mcp.json');…existsSync(s.command),existsSync(s.args[0])"
true true
```
cwd `$P` = `C:\Users\aliev\AppData\Local\Temp\claude\C--Users-aliev-Projects-chrome-remote-extention\98d37e15-74d6-4e30-9f89-cd26d9d75a28\scratchpad\s6b-probe`.
`probe-mcp.json` was written with the Write tool, byte for byte the JSON of §3.

## Commands as run

V1 alone first (the positive control), then V2–V3 and V4–V6 in two sequential foreground loops
(one session at a time, 300 s tool timeout), each iteration exactly:

```bash
export PATH="$(cygpath "$LOCALAPPDATA")/Author Software/nvm/.nodejs:$PATH"
cd "$P"
SID=$(node -e "console.log(crypto.randomUUID())"); echo "v$N $SID" >> sessions.txt
claude -p "Call the tool mcp__probe__probe_v$N exactly once. Then answer in one line: COLOUR: <the colour of the image the tool returned, one word> - or COLOUR: NO IMAGE if the tool result contained no image you can see. Also say ERROR: yes/no - whether the tool reported an error." \
  --model sonnet --session-id "$SID" --strict-mcp-config --mcp-config probe-mcp.json \
  --allowedTools "mcp__probe__probe_v$N" --output-format stream-json --verbose \
  > "v$N.out.jsonl" 2> "v$N.err.txt" < /dev/null; echo "v$N exit=$?"
echo "SID=$SID"; wc -c "v$N.err.txt"
T=$(find ~/.claude/projects -maxdepth 2 -name "$SID.jsonl"); echo "$T"
C=/c/Users/aliev/Projects/chrome-remote-extention/mcp/test/probe/count-images.mjs
node "$C" "v$N.out.jsonl" "mcp__probe__probe_v$N"
node "$C" "$T"            "mcp__probe__probe_v$N"
grep -c '"type":"image"' "v$N.out.jsonl" "$T"
```

Every transcript was found at
`~/.claude/projects/C--Users-aliev-AppData-Local-Temp-claude-C--Users-aliev-Projects-chrome-remote-extention-98d37e15-74d6-4e30-9f89-cd26d9d75a28-scratchpad-s6b-probe/<SID>.jsonl`
(abbreviated `<proj>/<SID>.jsonl` below). Counter lines are verbatim except that the transcript's
`"file"` value is abbreviated the same way.

## Per variant

### V1 — success, [image], red
SID `5e7b534a-2e67-43ff-911e-f6b729295b46` · exit 0 · `v1.err.txt` 0 bytes
```
{"file":"v1.out.jsonl","tool":"mcp__probe__probe_v1","session_id":"5e7b534a-2e67-43ff-911e-f6b729295b46","lines":10,"bad_lines":0,"tool_uses":1,"tool_results":[{"tool_use_id":"toolu_01M135e94tiudyDunA1aQJWo","is_error":false,"content_types":["image","text"],"image_parts":1}],"images_in_tool_results":1,"images_in_toolUseResult":0,"raw_image_tokens":2,"answers":["COLOUR: red\nERROR: no","[result] COLOUR: red\nERROR: no"]}
{"file":"<proj>/5e7b534a-2e67-43ff-911e-f6b729295b46.jsonl","tool":"mcp__probe__probe_v1","session_id":"5e7b534a-2e67-43ff-911e-f6b729295b46","lines":41,"bad_lines":0,"tool_uses":1,"tool_results":[{"tool_use_id":"toolu_01M135e94tiudyDunA1aQJWo","is_error":false,"content_types":["image","text"],"image_parts":1}],"images_in_tool_results":1,"images_in_toolUseResult":1,"raw_image_tokens":2,"answers":["Call the tool mcp__probe__probe_v1 exactly once. Then answer in one line: COLOUR: <the colour of the image the tool returned, one word> - or COLOUR: NO IMAGE if the tool result contained no image you can see. Also say ERROR: yes/no - whether the tool reported an error.","COLOUR: red\nERROR: no"]}
grep -c: v1.out.jsonl:1  transcript:1
```
Final answer: `COLOUR: red` / `ERROR: no`.
IMAGE ARRIVED **yes** (1/1) · MODEL SAW IT **yes** (red) · ERROR-READ `no` · is_error false, content [image, text].
**Positive control passed — the probe is discriminating.**

### V2 — success, [text, image], green
SID `978c1cfa-c49f-41ea-a56c-7aad010045e7` · exit 0 · `v2.err.txt` 0 bytes
```
{"file":"v2.out.jsonl","tool":"mcp__probe__probe_v2","session_id":"978c1cfa-c49f-41ea-a56c-7aad010045e7","lines":10,"bad_lines":0,"tool_uses":1,"tool_results":[{"tool_use_id":"toolu_01LrgfeVSg729dPimnwz74KT","is_error":false,"content_types":["text","image","text"],"image_parts":1}],"images_in_tool_results":1,"images_in_toolUseResult":0,"raw_image_tokens":2,"answers":["COLOUR: green\nERROR: yes (the tool reported \"LOCATOR_NOT_FOUND: probe failure\")","[result] COLOUR: green\nERROR: yes (the tool reported \"LOCATOR_NOT_FOUND: probe failure\")"]}
{"file":"<proj>/978c1cfa-c49f-41ea-a56c-7aad010045e7.jsonl","tool":"mcp__probe__probe_v2","session_id":"978c1cfa-c49f-41ea-a56c-7aad010045e7","lines":41,"bad_lines":0,"tool_uses":1,"tool_results":[{"tool_use_id":"toolu_01LrgfeVSg729dPimnwz74KT","is_error":false,"content_types":["text","image","text"],"image_parts":1}],"images_in_tool_results":1,"images_in_toolUseResult":1,"raw_image_tokens":2,"answers":["Call the tool mcp__probe__probe_v2 exactly once. Then answer in one line: COLOUR: <the colour of the image the tool returned, one word> - or COLOUR: NO IMAGE if the tool result contained no image you can see. Also say ERROR: yes/no - whether the tool reported an error.","COLOUR: green\nERROR: yes (the tool reported \"LOCATOR_NOT_FOUND: probe failure\")"]}
grep -c: v2.out.jsonl:1  transcript:1
```
Final answer: `COLOUR: green` / `ERROR: yes (the tool reported "LOCATOR_NOT_FOUND: probe failure")`.
IMAGE ARRIVED **yes** (1/1) · MODEL SAW IT **yes** (green) · ERROR-READ `yes` · is_error false, content [text, image, text].

### V3 — isError, [text, image], blue (the bridge's shape)
SID `460332eb-11d3-47f8-ba4e-39d533e8a223` · exit 0 · `v3.err.txt` 0 bytes
```
{"file":"v3.out.jsonl","tool":"mcp__probe__probe_v3","session_id":"460332eb-11d3-47f8-ba4e-39d533e8a223","lines":10,"bad_lines":0,"tool_uses":1,"tool_results":[{"tool_use_id":"toolu_01BRhc51HQ9RBL1Ggn9pWs7S","is_error":true,"content_types":["text-string"],"image_parts":0}],"images_in_tool_results":0,"images_in_toolUseResult":0,"raw_image_tokens":0,"answers":["COLOUR: NO IMAGE\nERROR: yes (the tool returned \"LOCATOR_NOT_FOUND: probe failure\")","[result] COLOUR: NO IMAGE\nERROR: yes (the tool returned \"LOCATOR_NOT_FOUND: probe failure\")"]}
{"file":"<proj>/460332eb-11d3-47f8-ba4e-39d533e8a223.jsonl","tool":"mcp__probe__probe_v3","session_id":"460332eb-11d3-47f8-ba4e-39d533e8a223","lines":41,"bad_lines":0,"tool_uses":1,"tool_results":[{"tool_use_id":"toolu_01BRhc51HQ9RBL1Ggn9pWs7S","is_error":true,"content_types":["text-string"],"image_parts":0}],"images_in_tool_results":0,"images_in_toolUseResult":0,"raw_image_tokens":0,"answers":["Call the tool mcp__probe__probe_v3 exactly once. Then answer in one line: COLOUR: <the colour of the image the tool returned, one word> - or COLOUR: NO IMAGE if the tool result contained no image you can see. Also say ERROR: yes/no - whether the tool reported an error.","COLOUR: NO IMAGE\nERROR: yes (the tool returned \"LOCATOR_NOT_FOUND: probe failure\")"]}
grep -c: v3.out.jsonl:0  transcript:0
```
Final answer: `COLOUR: NO IMAGE` / `ERROR: yes (the tool returned "LOCATOR_NOT_FOUND: probe failure")`.
IMAGE ARRIVED **no** (0/0) · MODEL SAW IT **no** · ERROR-READ `yes` · is_error true, content a bare string.

### V4 — isError, [image, text], yellow
SID `e4480a67-0870-4d8a-86fd-1fb58b073423` · exit 0 · `v4.err.txt` 0 bytes
```
{"file":"v4.out.jsonl","tool":"mcp__probe__probe_v4","session_id":"e4480a67-0870-4d8a-86fd-1fb58b073423","lines":10,"bad_lines":0,"tool_uses":1,"tool_results":[{"tool_use_id":"toolu_013Pvx98ztDNmuKbwzqEz2WB","is_error":true,"content_types":["text-string"],"image_parts":0}],"images_in_tool_results":0,"images_in_toolUseResult":0,"raw_image_tokens":0,"answers":["COLOUR: NO IMAGE\nERROR: yes (the tool returned \"LOCATOR_NOT_FOUND: probe failure\")","[result] COLOUR: NO IMAGE\nERROR: yes (the tool returned \"LOCATOR_NOT_FOUND: probe failure\")"]}
{"file":"<proj>/e4480a67-0870-4d8a-86fd-1fb58b073423.jsonl","tool":"mcp__probe__probe_v4","session_id":"e4480a67-0870-4d8a-86fd-1fb58b073423","lines":41,"bad_lines":0,"tool_uses":1,"tool_results":[{"tool_use_id":"toolu_013Pvx98ztDNmuKbwzqEz2WB","is_error":true,"content_types":["text-string"],"image_parts":0}],"images_in_tool_results":0,"images_in_toolUseResult":0,"raw_image_tokens":0,"answers":["Call the tool mcp__probe__probe_v4 exactly once. Then answer in one line: COLOUR: <the colour of the image the tool returned, one word> - or COLOUR: NO IMAGE if the tool result contained no image you can see. Also say ERROR: yes/no - whether the tool reported an error.","COLOUR: NO IMAGE\nERROR: yes (the tool returned \"LOCATOR_NOT_FOUND: probe failure\")"]}
grep -c: v4.out.jsonl:0  transcript:0
```
Final answer: `COLOUR: NO IMAGE` / `ERROR: yes (the tool returned "LOCATOR_NOT_FOUND: probe failure")`.
IMAGE ARRIVED **no** · MODEL SAW IT **no** · ERROR-READ `yes` · is_error true, content a bare string.

### V5 — isError, [image], purple
SID `7302d670-8ecc-4c6c-a790-a6e7dd89f666` · exit 0 · `v5.err.txt` 0 bytes
```
{"file":"v5.out.jsonl","tool":"mcp__probe__probe_v5","session_id":"7302d670-8ecc-4c6c-a790-a6e7dd89f666","lines":10,"bad_lines":0,"tool_uses":1,"tool_results":[{"tool_use_id":"toolu_014SPgCJ8BnNJoEbyNFFAzyB","is_error":true,"content_types":["text-string"],"image_parts":0}],"images_in_tool_results":0,"images_in_toolUseResult":0,"raw_image_tokens":0,"answers":["COLOUR: NO IMAGE\nERROR: yes (the tool returned \"Unknown error\" and no image)","[result] COLOUR: NO IMAGE\nERROR: yes (the tool returned \"Unknown error\" and no image)"]}
{"file":"<proj>/7302d670-8ecc-4c6c-a790-a6e7dd89f666.jsonl","tool":"mcp__probe__probe_v5","session_id":"7302d670-8ecc-4c6c-a790-a6e7dd89f666","lines":41,"bad_lines":0,"tool_uses":1,"tool_results":[{"tool_use_id":"toolu_014SPgCJ8BnNJoEbyNFFAzyB","is_error":true,"content_types":["text-string"],"image_parts":0}],"images_in_tool_results":0,"images_in_toolUseResult":0,"raw_image_tokens":0,"answers":["Call the tool mcp__probe__probe_v5 exactly once. Then answer in one line: COLOUR: <the colour of the image the tool returned, one word> - or COLOUR: NO IMAGE if the tool result contained no image you can see. Also say ERROR: yes/no - whether the tool reported an error.","COLOUR: NO IMAGE\nERROR: yes (the tool returned \"Unknown error\" and no image)"]}
grep -c: v5.out.jsonl:0  transcript:0
```
Final answer: `COLOUR: NO IMAGE` / `ERROR: yes (the tool returned "Unknown error" and no image)`.
IMAGE ARRIVED **no** · MODEL SAW IT **no** · ERROR-READ `yes` · is_error true, content the bare string `"Unknown error"`.

### V6 — isError, [text, resource(blob png)], orange
SID `b8db1095-5947-4042-8390-69c7e78c7dd4` · exit 0 · `v6.err.txt` 0 bytes
```
{"file":"v6.out.jsonl","tool":"mcp__probe__probe_v6","session_id":"b8db1095-5947-4042-8390-69c7e78c7dd4","lines":10,"bad_lines":0,"tool_uses":1,"tool_results":[{"tool_use_id":"toolu_01UXhwvQjHMnc1UVQ4FEBDMk","is_error":true,"content_types":["text-string"],"image_parts":0}],"images_in_tool_results":0,"images_in_toolUseResult":0,"raw_image_tokens":0,"answers":["COLOUR: NO IMAGE. ERROR: yes. The tool returned \"LOCATOR_NOT_FOUND: probe failure\" and no image.","[result] COLOUR: NO IMAGE. ERROR: yes. The tool returned \"LOCATOR_NOT_FOUND: probe failure\" and no image."]}
{"file":"<proj>/b8db1095-5947-4042-8390-69c7e78c7dd4.jsonl","tool":"mcp__probe__probe_v6","session_id":"b8db1095-5947-4042-8390-69c7e78c7dd4","lines":41,"bad_lines":0,"tool_uses":1,"tool_results":[{"tool_use_id":"toolu_01UXhwvQjHMnc1UVQ4FEBDMk","is_error":true,"content_types":["text-string"],"image_parts":0}],"images_in_tool_results":0,"images_in_toolUseResult":0,"raw_image_tokens":0,"answers":["Call the tool mcp__probe__probe_v6 exactly once. Then answer in one line: COLOUR: <the colour of the image the tool returned, one word> - or COLOUR: NO IMAGE if the tool result contained no image you can see. Also say ERROR: yes/no - whether the tool reported an error.","COLOUR: NO IMAGE. ERROR: yes. The tool returned \"LOCATOR_NOT_FOUND: probe failure\" and no image."]}
grep -c: v6.out.jsonl:0  transcript:0
```
Final answer: `COLOUR: NO IMAGE. ERROR: yes. The tool returned "LOCATOR_NOT_FOUND: probe failure" and no image.`
IMAGE ARRIVED **no** · MODEL SAW IT **no** · ERROR-READ `yes` · is_error true, content a bare string.

## Table

| Row | Sent | Image parts transcript / out | is_error (transcript) | Model: COLOUR / ERROR | IMAGE ARRIVED | MODEL SAW IT |
|---|---|---|---|---|---|---|
| V1 | ok [image] red | 1 / 1 | false | red / no | yes | yes |
| V2 | ok [text, image] green | 1 / 1 | false | green / yes | yes | yes |
| V3 | isError [text, image] blue | 0 / 0 | true | NO IMAGE / yes | no | no |
| V4 | isError [image, text] yellow | 0 / 0 | true | NO IMAGE / yes | no | no |
| V5 | isError [image] purple | 0 / 0 | true | NO IMAGE / yes | no | no |
| V6 | isError [text, resource] orange | 0 / 0 | true | NO IMAGE / yes | no | no |

out.jsonl and the transcript agree on every row.

## Outcome: (A)

Rule (§5): V1 passed the positive control; no isError variant (V3–V6) arrived (0 images in each);
V1 and V2 arrived ⇒ "Claude Code drops images from isError results". V2 shows IMAGE ARRIVED + MODEL
SAW IT + ERROR: yes ⇒ **the fix returns an attach-eligible failure as a non-error result whose first
text line states the code (V2's shape).** The finding clause for V2's ERROR = no does not apply.

## Findings (recorded, not rules)

1. **Claude Code flattens an isError result to its text and drops the rest.** From the out.jsonl
   tool_result blocks (a read-only dump of each `tool_result`): V3, V4 and V6 arrived as the bare string
   `"LOCATOR_NOT_FOUND: probe failure"` — the text part survives whatever its position; the image and the
   embedded resource are gone. V5, with no text part, arrived as the bare string `"Unknown error"`. The
   transcript's `toolUseResult` holds no image for V3–V6 either (0), so the drop is before that record.
2. **A success result gains a text part after each image**: V1 `[image, text]`, V2 `[text, image, text]`;
   the added text is `[Image: source: <home>\.claude\projects\<proj>\<SID>\tool-results\mcp-probe-blob-….png]`
   — Claude Code saves the image to a file under the session's `tool-results` directory. A fix in V2's
   shape will therefore also leave a copy of each failure screenshot there.
3. **Every session also called ToolSearch first** (a `tool_reference` tool_result before the probe's):
   the probe tool was deferred and loaded. The counter keys on the probe's own tool_use id, so this did
   not enter any count.
4. **`grep -c` counts matching lines, not occurrences** (each file has the image on one line, so 1 where
   the counter's `raw_image_tokens` says 2). It stayed a cross-check only, as §5 says; its 0 rows agree.
5. The transcript counter's `answers` also lists the user prompt (it contains `COLOUR:`); the decision
   used the final assistant line, which equals out.jsonl's `result`.

## Process check (after V6)

```
PS> Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*image-probe-server.mjs*' } | Select-Object ProcessId, ParentProcessId, CommandLine
(no rows)    count: 0
```
Nothing was killed. Nothing touched port 9234, Chrome, the bridge daemon or the bridge MCP.

## Deviations

- File name `S6b-probe-record.md` instead of the sheet's `S6b-probe-run.md` (the brief's name; rename only).
- V2–V6 ran in two sequential loops (V2–V3, V4–V6) rather than one command per variant; each iteration is
  the sheet's command unchanged, one session at a time.
- Beyond the sheet: one read-only node dump of each out.jsonl's `tool_result` blocks (for findings 1–3);
  it decided nothing.
- The scratch files (`probe-mcp.json`, `vN.out.jsonl`, `vN.err.txt`, `sessions.txt`) and the transcripts
  stay uncommitted in `$P` and `~/.claude/projects/…`.
