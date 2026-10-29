# Step 13 — Stage 0 verifier report

**Date:** 2026-10-29 · **Verifier:** Opus 5.5, medium · **Tree:** `ff121a4` plus Stage 0's untracked docs (no tracked
change but `journal.md`; nothing committed) · **Evidence:** `stage0-v-passrules.txt` (written before the first run; one
dated addendum before the second), `stage0-v-setup.txt`, `stage0-v-readings.txt`.

## 1. Verdict

**PASS-with-notes.** Z.1 is met item by item (§2). Six findings re-executed (§3), all hold. The Chrome facts I re-measured
in my own scratch Chrome match Stage0.md. No CRITICAL or MAJOR finding against the Stage 0 report; five MINOR and three
NIT (§5). The replaced #376 survives the attack (§4). It is stricter than today and measured on more kinds than Stage 0
covered. It is still a contract change (to the meaning of an event field), so it rightly waits for the user's ruling.

## 2. Z.1, item by item

| Z.1 item | Met? | Evidence |
|---|---|---|
| Findings ranked with command and output | yes | Stage0.md §6 ranks them; each cites `stage0-audit.md` / `stage0-audit-2.md` rows with their commands; six re-executed below |
| Every Chrome fact of 0.2–0.4 and 0.8 measured or cited | yes | 0.2 order, spread, missing event, `sourceTabId`, `openerTabId`, reload, warnings (`stage0-m1-*`); 0.3 (`stage0-m2-K.txt`); 0.4 (`stage0-m2-C.txt`); 0.8 DevTools (`stage0-m2-D.txt`). What was not measured (a reload with a visible window, a "Load unpacked" install, DevTools without the flag) is marked NOT MEASURED, not assumed |
| 0.6 decided | yes | #380 (a), with its reason (Stage0.md §5) |
| Counts recomputed | yes | auditor 1 `stage0-a1-counts.txt`; re-derived by me: 25 / 28 / 28 / 9+17+1 = 27 (26 wire) / 54 log sites; `npm test` 5596 passed, 235 files, exit 0 |
| Every proposed decision attacked | yes | #375–#383 and the `webNavigation` reload each get keep/amend/replace with a reason (Stage0.md §5) |
| Step 12's contracts green on port 0 | yes | `stage0-a1-contracts.txt` (1062 passed), `stage0-a2-tests.txt` (178); my full `npm test` includes them all |

**Measured-facts table against the evidence (targeted greps).** Every row checks out:
- G1 order, spread, missing, `sourceTabId`, `openerTabId`, kinds: `stage0-m1-G1.txt` summary (fg/bg 30/30 C-first;
  delta max 0.6; bg opener `{"H":25,"expected":5}`, `wf` 5/5 expected; `blk` "no tab" 3+3; pp 5+5).
- Reload and warnings: `stage0-m1-reload.txt` (both warning arrays identical; every `+webNavigation` row
  `state ENABLED, disableReasonsTrue []`, `webNavigation:true`; flagless path B′ `Fb_wn`, line 82).
- Key order: `stage0-m2-K.txt` K1–K6 (`i_keepsPageOrder:false`, `ii_keepsPageOrder:true`, `descriptionSame:true`;
  (ii) 0.7–1.6 ms, (i) 0.8–2.3 ms, so "same time" is close but not exact).
- getProperties: `stage0-m2-C.txt` (`getter`/`protoGetter` 0 in all 17 readings; `e1msg` 1 in 12, which is the +1 per read;
  `replyChars` 3 645 960 at 494.9 ms).
- DevTools: `stage0-m2-D.txt`, 11 legs, `"probe":{"attach":"ok"` 11/11, `onDetachWithin3s:[]` 11/11,
  `pageAttachedAfter:true` 11/11, undocked titles `DevTools - 127.0.0.1:8086/…`.

**Pass rules written before the runs.** File mtimes (UTC) against run starts: m1 rules last written 09:45:08 (its last
addendum is dated before reload-run3d, 09:45:31). m2 rules last written 09:38:08; Addendum 3 is dated after D2u r1
(09:37:43–53) and before leg 12 (09:38:19). Every addendum is dated and appended. The first version of each file cannot be
dated from an mtime. Its content is consistent with being written first: m1's rules say 4 samples per kind, the run used 5
(N1).

## 3. Findings re-executed (command + output in `stage0-v-readings.txt`)

1. **Auditor 1 F-1: the opener rule, plus the measured `openerTabId` = active tab. HOLDS.** By reading: `daemon/src/intercept.ts:349-356`
   grants to `leases.ownerOf(handles.handleOf(p.openerTabId))`. `grep -rn openerTabId daemon/src sdk/src mcp/src` finds
   only `intercept.ts:323, :350, :353`. Measured in my scratch Chrome (pass rules V1–V4, written first). The control
   fg-wo gave `openerTabId` O 5/5 and `sourceTabId` O 5/5. For bg-wo and bg-lk, `sourceTabId` was O 10/10 and
   `openerTabId` was **H (the active tab) 10/10**. Every sample had both events with C first, D = 0.5 ms. V2 and V3 PASS.
2. **Auditor 2 F1: the fake CDP does not sort, so the page-order test passes on today's code. HOLDS.** A copy of
   `s12-args-cdp.test.ts:109` ran over the shipped `EngineCdp`: ✓. The same test over the same fake with `returnByValue`
   key-sorted: ✗ `expected '{"a":1,"n":null,"z":…' to be '{"z":…,"a":1,"n":null}'`. That fake is S2's failing test.
3. **Auditor 2 F2: a page `toJSON` hook. HOLDS.** The shipped `SERIALIZER_SRC` under a page `Object.prototype.toJSON` gives
   `JSON.stringify(env) = "HOOKED"`. Under a page `JSON.stringify` it gives a forged, well-shaped envelope with an extra
   `ref`. Not in the audit: today the same hooks already control `description` (`description today "\"HOOKED\""`), so
   string crossing widens the hook's reach from `description` to `value` and the keys.
4. **Counts. HOLD.** Registry 25; `router.on("` 28; `METHOD_CLASSES` 28; codes 9 + 17 + 1; allowlist 54. Full `npm test`:
   `Test Files 235 passed (235)`, `Tests 5596 passed (5596)`, exit 0.
5. **Measurer 2 K (i)/(ii), re-measured. HOLDS.** `chrome.debugger` `Runtime.evaluate` from a probe worker on a fixture
   tab, 5 reps. Form (i), `returnByValue`, came back sorted at every level 5/5: `[1,5,a,k,m,z]`, nested `[2,10,b,y]`, array
   items `[c,q]`/`[d,x]`. Form (ii), the JSON string, kept the page's order 5/5: `[1,5,z,a,m,k]`, `[2,10,y,b]`,
   `[q,c]`/`[x,d]`. My planned in-page reference read threw, so the reference is the language's own-key order rule. This
   is recorded in the readings file.
6. **The join numbers in Stage0.md §5 #376. HOLD and extend.** D = 0.5 ms over wo/lk, so the bound of 250 ms is still
   ≥ 4 × D. The attack data is in §4.

## 4. Attack on the Proposed decisions

### #376 as replaced: join in the extension and rewrite `tabCreated.openerTabId`, against auditor 1's (A)

- **Is it "no contract change"?** The wire shape, the hello and the daemon do not change; that part is true. But the spec
  §6.2 text and `shared/src/protocol.ts:148` say `openerTabId` is the opener of "a tab a page opens itself". The
  replacement changes which tab id that field carries (now the navigation source). Under agent-rules §4, events are
  contract, so this is a contract change by meaning. Stage0.md marks it "for user review", which is correct; the wording
  "no wire change" is accurate and should not be read as "no contract change" (M3).
- **`listTabs` rows still carry Chrome's `openerTabId`.** No daemon path grants from it: `record()` (`intercept.ts:649-670`)
  never reads it, and no SDK or MCP source does. After S1 the same tab can therefore show two different "openers": one in
  `tabCreated`, another in a `listTabs` row. The §10 note should say so (M3).
- **Existing tests.** The daemon, `protocol.ts` and `tabCreatedParams` (`tab-events.ts:136-143`) are unchanged, so every
  existing opener test passes as is. `mcp/test/multi-actor.test.ts`'s fake extension sends `openerTabId` as before.
  Nothing breaks. Under (A), `protocol-step7.test.ts` and the daemon's opener tests would gain a feature-split branch.
- **Which tabs lose a grant today's rule gives?** Measured (V4):
  - **Ctrl+click and middle-click** on a background opener: N present 10/10, `sourceTabId` = O, delta 0.7–1.1 ms, and
    `openerTabId` = H 10/10. Today these go wrong (to H's holder); the replacement fixes them.
  - **`chrome.tabs.create({openerTabId})` from an extension** (opener in the background): `tabs.onCreated` carried
    **no `openerTabId`** 5/5, and there was no N. Today such a tab gets no grant, so the replacement loses nothing there.
    That weakens the Revisit-if's own example (M4).
  - **The bridge's own `newTab`** creates the tab with no `openerTabId` (`handlers/tabs.ts:91,100`) and leases it as
    "opened" (`intercept.ts:694`), so it is unaffected. `Ctrl+T` was not measured.
  - No kind measured gave `openerTabId == O` without an N within 250 ms.
- **The stricter side?** Yes. The grant now needs a join to `sourceTabId`, which was right 60/60 + 20/20. With no join
  there is no grant (fail closed), where today the grant can go to the wrong client. Mixed versions: an old extension
  with any daemon behaves as today, and a new extension with an old daemon gets the right opener. (A) with an old daemon
  would still grant from Chrome's `openerTabId`. So the replacement is at least as strict as (A) in every combination.
- **A residual the shape adds (M5).** The hold puts the whole `tabCreated` in worker memory. A worker culled within those
  ≤ 250 ms loses the event itself, not just the grant: the handle is minted only at the next `listTabs`. Today the event
  goes out at once. B9 covers the lost grant but not the lost event. It is fail-closed, so S1 should test it as a limit.

### #380 (a)

It holds. `upload.ts:165-167` builds the refusal from `describeDebuggerError`, and the only code-level pin is
`extension/test/s5a-chooser.test.ts:547-556` (code only, as auditor 2 says). `ATTACH_CODES` and the MCP name no code text.
One more consumer, outside product code: Run 19's judges `recipes/s12-r19-b.ts:50` and `recipes/s12-r19-c.ts:87` accept the
second-chooser answer only through `overlapExact` (today's DevTools text). Their unit pin
(`recipes/test/s12-forms-b.test.ts:200-202`) uses the K text and stays green. These judges must not be reused for any
R20 chooser row (N2).

### Stage split and #375 / #381

The split is sound. #381's "S4 may follow S2/S3b" is consistent with S1 no longer touching `intercept.ts`. S1's lane as the
phase doc writes it (`extension/src/{tab-events,sw}.ts`, `shared/src/protocol.ts`, `daemon/src/intercept.ts`) no longer fits
the replaced shape. The shape needs a new pure join-module file and needs neither `protocol.ts` nor `intercept.ts`. G1.1
says "the join and the lease rule tests", but the lease rule no longer changes. S1's verifier focus needs one more
mutant: a join that falls back to Chrome's `openerTabId` when unjoined must be red (M2).

## 5. Findings

| # | Sev | Where | Finding | Evidence | Suggested fix |
|---|---|---|---|---|---|
| M1 | MINOR | `stage0-m1-passrules.txt:12-13` vs `stage0-m1-G1.txt:2` | Pre-registered "4 samples per kind, 24 per leg"; the run used 5 (30 per leg) with no addendum | G1.txt header "5 reps per kind"; summary n=30 | A one-line dated note in Stage0.md §4 Deviations (harmless: more samples; R1's ≥ 15 is met either way) |
| M2 | MINOR | phase doc §S1 Lane and G1.1; Stage0.md §5 #376 | The S1 lane and G1.1 are written for the old shape; the replaced shape adds a new extension file and drops `protocol.ts`/`intercept.ts`; there is no mutant for an unjoined fallback | §4 above | Dated note amending S1's lane, G1.1 ("the join tests …; the daemon's opener tests unchanged") and its verifier focus (an unjoined-fallback mutant is red; `git diff` shows no change in `daemon/` or `shared/`) |
| M3 | MINOR | Stage0.md §5 #376 "Why"; spec §6.2 / §10 | It is a contract change by meaning, not by wire; after it, `listTabs`' `openerTabId` keeps Chrome's value | `intercept.ts:649-670`; `grep` shows no reader | The §10 note says both: `tabCreated.openerTabId` = the navigation source when joined, `listTabs`' = Chrome's, which no grant reads |
| M4 | MINOR | Stage0.md §5 #376 "Revisit if" | The example ("a tab opened by another extension's `tabs.create`") does not lose a grant: Chrome's `onCreated` carried no `openerTabId` 5/5 | `stage0-v-readings.txt` V4 `tc` | Narrow the Revisit-if to an unmeasured kind (`Ctrl+T`, a tab with an opener and no join); cite V4 for Ctrl/middle-click |
| M5 | MINOR | Stage0.md §5 #376; `stage0-audit.md` B9 | A worker restart inside the hold loses the `tabCreated` itself (late handle), not only the grant | by construction from the shape | S1 lists it as a limit and unit-tests "held, then dropped": no grant, no event replay |
| N1 | NIT | `stage0-m2-K.txt` ms fields vs Stage0.md table | "same time (0.7–1.6 ms)" holds for (ii) only; (i) was 0.8–2.3 ms | K1–K6 `ms` | Write "(i) 0.8–2.3 ms, (ii) 0.7–1.6 ms" |
| N2 | NIT | `recipes/s12-r19-b.ts:50`, `recipes/s12-r19-c.ts:87` | Run 19's judges pin today's overlap text for the second-chooser answer | `grep overlapExact` | S5-helpers writes new judges; note it in #382 (7) / S5's brief |
| N3 | NIT | `stage0-m2-D.txt:5-8` | Legs 12–16 ran on the pre-Addendum-3 driver; their controls are computed from recorded fields (disclosed) | file header | None; it is disclosed. The table's "11/11" control is from those recorded fields |

The audit's own MAJORs are plan-side and are resolved by the proposed decisions. I found none of them mis-stated.

## 6. Integrity and public safety

- **Names and paths.** No match for the git user's name, the Windows account name, the user's e-mail, "Users" or
  "AppData" in any Stage 0 file, mine included: `grep -i` over `Stage0*.md stage0-*.md stage0-*.txt journal.md` printed
  nothing. No drive-letter path either.
- **URLs.** `http://127.0.0.1` 37×, `devtools://` and `chrome-extension://${…}` templates only. Fixture pages only.
- **Nothing committed.** `git status`: everything is untracked except ` M journal.md`. HEAD is `ff121a4`.
- **Scratch Chrome safety (#294, #297).** I ran 2 Chromes, each on its own fresh profile under the verifier's scratch
  folder, pipe only, both closed by `Browser.close` (exit 0). The version came from the install folder name. The fixture
  ran on 127.0.0.1:8087 after `netstat` showed it free, and was stopped by PID after a command-line check. Profiles were
  deleted, and no process with the scratch folder in its command line remains. The user's Chrome, port 9234, the daemon
  and the loaded extension were not touched.
