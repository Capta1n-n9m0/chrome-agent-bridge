# S0 verifier, re-check after fixer round 1

Verifier for Step 8 stage S0. Model: Claude Opus 5.5. Date: 2026-10-23. Scope: V4, V6, V2, V3, V10 and
V11 from `S0-verifier.md`, checked against the claims in `S0-fixer1.md`. I edited nothing in the main
tree.

I made one fresh worktree, `scratchpad/S0-verify/r1`, at `1837dc9` and copied in the 5 lane files from
the main tree:
- `shared/src/codes.ts`
- `shared/src/protocol.ts` (sha256 `50303527…aa8e00`, the same as the fixer's)
- `shared/src/error.ts`
- `shared/test/codes.test.ts`
- `shared/test/protocol-step8.test.ts`

In it I ran `npm ci`, `npm run typecheck`, `npm test` and `npm run build`, then removed it.
`git worktree list` now shows only `C:/Users/aliev/Projects/chrome-remote-extention 1837dc9 [main]`.

## (1) Gates

- `npm ci` exited 0. `npm run typecheck` exited 0 for all five packages.
- `npm test` gave `Test Files 60 passed (60)` and `Tests 1008 passed (1008)`. That matches the fixer's
  claim: 1007 plus the new V4 block.

## (2) V4: the mutation that was missed before is now caught

I applied `| { text: string; nth?: number }` (the text arm with `exact` dropped) and ran
`npx tsc -p shared/tsconfig.json --noEmit`:
```
shared/test/protocol-step8.test.ts(163,26): error TS2339: Property 'exact' does not exist on type '{ text: string; nth?: number | undefined; }'.
shared/test/protocol-step8.test.ts(166,49): error TS2344: Type '"text" | "exact" | "nth"' does not satisfy the constraint ...
shared/test/protocol-step8.test.ts(169,30): error TS2353: Object literal may only specify known properties, and 'exact' does not exist in type '{ text: string; nth?: number | undefined; }'.
tsc exit 2
```
After restoring the file from a copy, tsc exited 0. These lines and codes match the fixer's M1 row.

The new block (test :155-176) also pins each arm's keys with `keyof` and checks `exact` and `name`
against the css arm. I did not re-run the fixer's M2-M6 mutations; by reading, the `keyof` pins cover
them. **V4 is closed.**

## (3) Bundles after the change to the `error.ts` comment

The daemon and extension sha256s equal my earlier post values. The comment changed no bundle byte.

| file | sha256 (r1) | equals the earlier post value? |
|---|---|---|
| `daemon/dist/index.js` | `7712e1afcbc173252aac19f764918f00504b6f0541ba6407a6da672a64019d0e` | yes |
| `extension/dist/sw.js` | `b614aa9e35c3fc3ff04a5d7c47c3d76a5c1deb4d173179596242d7f3f7372179` | yes |
| `extension/dist/content.js` | `451763bf…ba55` | yes (also equals pre) |
| `extension/dist/offscreen.js` | `39daf941…917e` | yes (also equals pre) |
| `extension/dist/options.js` | `9093499a…0b52` | yes (also equals pre) |
| `mcp/dist/index.js` | `fd6d3f13b1b0e40a47e070aa988f3b2322a12062cb6fcf965feb2e46cdfc296e` | yes |

The byte-identity clause against `1837dc9` therefore still fails exactly as in V1. It is still
escalated and is unchanged by this round.

## (4) The docs and V10

- **Deleted lines:** `git diff --numstat` gives `300 0` for the phase doc (it was 286 before; +14 lines
  of notes) and `8 0` for the spec. `git diff <phase doc> | grep -c "^-[^-]"` gives 0.
- **V10, closed:** `git diff shared/src/error.ts` is one line, "outside the 22" → "outside `ErrorCodes`".
- **V6, closed:** a "*Built 2026-10-23 (S0 step agent): F27 as proposed …*" note is at phase doc :425,
  under the Stage 0 notes. It describes the code accurately: the third list, the union, `ErrorCodes`,
  `isErrorCode`'s set and the header.
- **V2, open by design:** the same note records F28's shape and says it is "design-local, proposed in
  S0.md for the session agent to record". There is still no decisions.md entry and no "Ruled" note, so
  the finding stays open until the session agent rules. Also, the note's reference to `S0.md` points at
  a file that does not exist yet: `ls …-steps/ | grep ^S0` lists only `S0.ledger.md`, `S0-builder.md`,
  `S0-docs-builder.md`, `S0-fixer1.md` and `S0-verifier.md`. That is a NIT, fixed by the step agent
  writing its step report `S0.md` with the proposed F28 decision in it.
- **V3, open by design:** a "*Proposed 2026-10-23 (S0 step agent, for the session agent to record):
  `nth` is 0-based …*" note is at phase doc :189, closing §0.1. It is accurate (`isLocator` accepts 0,
  and 0.1 and #83 do leave the base unstated), but it is still a proposal: it needs a ruling before S1.
- **V11, closed:** a "*Ruled 2026-10-23 (… #81)*" note is at phase doc :906-910. Its operative clause,
  "S2b does not remove the Chrome `id` from `newTab`/`listTabs` results", is word for word #81's
  **Decided** line (decisions.md:121). The consequence it adds ("so the 'if S2b removes the Chrome `id`'
  branch does not arise this step") follows directly from that line. It carries the contract-level
  clause, as #81's other notes do.

## Status of the six findings

| finding | status | evidence |
|---|---|---|
| V4 | closed | the mutation that passed before now fails tsc (exit 2, 3 errors); 1008 / 60 |
| V6 | closed | the "Built" note at :425 |
| V2 | open, waiting on the session agent | proposal recorded at :425; no decisions.md entry; `S0.md` is not written yet (NIT) |
| V3 | open, waiting on the session agent | proposal recorded at :189; no ruling |
| V10 | closed | the one-line comment diff; bundles unchanged |
| V11 | closed | the :906-910 note matches #81 word for word |

V2 and V3 can only be closed by the session agent's decisions, which are outside the fixer's power, so
they do not count against this round. V5, V7, V8 and V9 were outside this re-check's scope and are
unchanged.

## Verdict

**Overall: FAIL.** The pre-registered byte-identity clause still fails as measured (V1, escalated): the
daemon and `sw.js` bundles differ from `1837dc9` by exactly the `NO_CURSOR` entry and the `isHello`
`session` line.

**Excluding the escalated byte-identity clause: PASS-with-notes.** The following remain, none above
MINOR:
- V2 and V3, which need the session agent's rulings;
- V5, V7 and V8 from the first report;
- the NITs V9 and the missing `S0.md`.
