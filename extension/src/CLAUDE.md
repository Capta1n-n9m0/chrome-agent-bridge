# extension/src/ — the safety gate's redirect, DNR and `file:` rules; uploads; the console read and the kept session

`extension/CLAUDE.md` also applies (Key files, the rest of the Safety gate). These bullets bind `safety.ts`,
`safety-dnr.ts`, `safety-dnr-keeper.ts`, `safety-hop.ts`, `upload-exists.ts`, `upload-files.ts`, `console-messages.ts` and
`debugger-keeper.ts`, which sit flat in `src/`, and `handlers/upload.ts`, so this file loads with any file under `src/`.

## Safety gate (Step 9, Step 11, Step 11b)

- **The block list is not a network firewall; since Step 11b it stops redirect hops of a bridge call in flight.**
  While a `navigate`, `newTab` with a URL, `back`, `forward` or `downloadStart` runs, session DNR rules built from the
  list hold, so a hop onto a blocked host is never sent: the blocked fixture server saw 0 requests (Run 17 RD-1, RD-3;
  before: 1, SAFE-5b, R14-5c; `newTab` R17B-RD-2, was 1 in RD-2; `back`/`forward` R17B-BACK, R17B-FWD, once each, on
  histories with a user activation), answers unchanged; the rules follow the list (RD-4, RD-5, RD-5b) and read 0 after
  each reply. `newTab` opens `about:blank` first (S6, #311, #312). `downloadStart` still checks its own URL, then
  `res.url` (#140, #154). Not covered: the human's own browsing (RD-6; 0.4 (C)) and requests a page starts after the
  call (0.9). A cross-origin frame of a blocked host shows in screenshots (stage0-audit F16, by reading).
- **DNR facts the rule builder binds (`safety-dnr.ts`, Step 11b; Chrome 156, `…step11b…-steps/Stage0.md` §4, `S1.md`).**
  `requestDomains` matches a host and its subdomains, ignores the port and suffix-matches IP literals (`0.0.1` blocked
  `127.0.0.1`), so IPs, `*.` and ports go by anchored regex; `regexFilter` sees the canonical URL with its port
  (never a default one), RE2 without lookaround or backreferences, compiled in Latin-1 under a 2048-byte memory cap
  (read in Chromium's source by S1's verifier): a default-port pattern makes two regex rules, and a host of about 80+
  characters with a port or `*.` makes a regex Chrome rejects, so the covered call fails closed. Caps 5000 session
  rules, 1000 regex. A download rule must be typed `resourceTypes:["xmlhttprequest"]`: an untyped `tabIds:[-1]` +
  own-initiator rule refuses the offscreen document's new WebSocket handshakes (measured 3 of 3).
- **The gate refuses `file:` pages whatever the file-URL toggle says** (Step 11): every tab call on a tab showing a
  `file:` URL (`closeTab`, `focusTab` included) and every `navigate`/`newTab` to one is `DOMAIN_BLOCKED`
  (`FILE_PAGE_MESSAGE`, `FILE_URL_MESSAGE`; order own page > `file:` > block list; a wrapper deeper than the unwrap bound
  counts as `file:`); `listTabs` rows and tab events of a `file:` tab are listed hidden with the `"blocked"` reason, no `url`/`title` (Step 11b S0F-a, #288, `hiddenReason` in `safety.ts`; was listed, #259).
  `downloadStart` to a `file:` URL keeps its handler's `BAD_PARAMS` (`safety.ts` comment). For class `upload` the
  folder rule runs at receipt even for a gone tab, so a refused path never reaches the handler (#260).

## Uploads

- **`DOM.setFileInputFiles` needs the extension's "Allow access to file URLs"** (Chromium answers "Not
  allowed" otherwise, `stage0-cdp.txt`): `handlers/upload.ts` reads `isAllowedFileSchemeAccess()` before attaching and
  refuses `UPLOAD_REFUSED` (`NO_FILE_ACCESS_MESSAGE`). A wave never presses it (G11-3). With it on, an upload
  reached a **background tab** with no focus or lock (Run 16 UP-1). Since Step 11b S0F-b the worker checks each path
  before the attach (`upload-exists.ts`: a `file:` fetch, only a 200 with a readable first chunk is a file, one 5 s
  bound for the whole check) and refuses anything else `BAD_PARAMS` naming `paths[i]`, never the path (#288; was
  UP-RAW's `ok`, #284); missing and unreadable look the same to it; live proof Run 17 F-RAW. CDP calls: 15 s bound, unmeasured (#268). With the toggle on, "Not allowed" surfacing as `DEBUGGER_ATTACH` is
  unmeasured.
- **The three shipped upload page sources are closure-free literal strings** (`UPLOAD_FINDER_SRC`,
  `UPLOAD_MARK_PAGE_FN`, `UPLOAD_UNMARK_PAGE_FN`): the guard `extension/test/s3-closure-free.test.ts` copies esbuild's
  options instead of reading `build.mjs`, so `keepNames: true` there would pass the tests and ship a source calling
  `__name` (S3 verifier 2 NIT A; same cause as tsx in `recipes/CLAUDE.md`). Extension tests are not type-checked
  (tsconfig covers `src`; S2.md §6).
- **The chooser upload (`uploadFiles {chooser: true}`, Step 12 S5):** the disabled-input refusal is reached only after a
  chooser opens, and a page button that calls `click()` on a disabled input opens none (HTML spec), so a page like that
  cannot reach it (R19-CHOOSE-REFUSE leg `dis` NOT DISCRIMINATING, #370); it is unit-tested in
  `extension/test/s5a-chooser.test.ts`. Run 20 reached it live on a page whose own control flips the input to disabled
  after the chooser opens (R20-CHOOSE-REFUSE-DIS PASS, `BAD_PARAMS`, 2026-10-30). Two chooser calls in a row with the same
  file left the page's `change` count at 1 (R19-CHOOSE-KEPT FAIL, 2026-10-29, #373); an identical second selection fires
  no `input` or `change`, and `cancel` fires (R20-CHOOSE-KEPT RECORD,
  2026-10-30). A second chooser upload on a tab whose first has not ended answers `DEBUGGER_DEVTOOLS` with the fixed
  `CHOOSER_BUSY_MESSAGE` (`handlers/upload.ts`; `extension/test/s5a-chooser.test.ts`; R20-CHOOSE-TWICE PASS,
  `names-devtools=no`); every other `DEBUGGER_DEVTOOLS` text is unchanged, and the MCP prints it bare with `isError`
  (`mcp/test/s13-chooser-busy.test.ts`).

## Console read and the kept session (Step 12)

- **Replayed console args carry no `preview`** (`console-messages.ts`, `remoteText`): an object logged before the read
  comes back as its class name (`Object`), and an Error inside it loses its message; nothing leaks (`url=0 stack=0`).
  Measured: Stage 0's replayed args against live ones (`…step12…-steps/stage0-m1-C.txt`); R19-CON-NOTEA FAIL (Run 19,
  2026-10-29, #373). Step 13 made this the documented limit, not a defect (#387; R20-CON-NOTEA PASS, 2026-10-30; the
  tool's description says it). A shortened preview drops its entry, fail closed (#344); do not rebuild text from a page call.
- **A same-site frame's console messages are read; a cross-site frame in another process is not** (R19-CON-FRAME PASS:
  13 entries without the block pattern, 2 with it, 2 for the out-of-process frame; 2026-10-29). The tool's description
  and `Tab.consoleMessages`' JSDoc say so (Step 13 S3b; R20-CON-DESC PASS, 2026-10-30).
- **A second `Runtime.enable` in a kept session replays every message again** (#352: 5 of 5 after S4b; R19-CON-KEPT PASS,
  `first=11 second=11 equal=yes`), so the read is the same whether the session was kept or new.
- **The kept session** (`debugger-keeper.ts`, `extension/test/debugger-keeper.test.ts`; #335): idle detach
  `KEEPER_IDLE_MS` = 5000 after the last use; live, the idle detach ended the banner a median 5.1 s later than an
  immediate drop (R19-KEEP-2 PASS, idle 10 132 ms against control 5 028 ms). That the banner stays steady across calls
  is not shown live (R19-KEEP-1's banner clause NOT DISCRIMINATING: no attach counter exists, #351 (2)). Run 18's banner
  `seen` on refused uploads did not reproduce at a 20 s idle with a passing control (R19-UP-6, R19-F-RAW family, #373).
