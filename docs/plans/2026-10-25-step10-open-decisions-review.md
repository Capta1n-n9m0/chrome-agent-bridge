# Step 10 — the decisions waiting for you (plain-language review)

Written 2026-10-25 at Step 10's close. Each item says what was built, why, the other option, and my recommendation.
Everything below is already built the "as built" way and works; ruling "accept" changes nothing. Full entries:
`docs/decisions.md` (cited by number).

**Words used here**
- **Wire**: the messages between the daemon, the extension and the clients (SDK scripts, the MCP).
- **SDK**: the TypeScript library scripts use (`Tab`, `connect`). It promises exactly eight exported values.
- **MCP**: the tool server Claude uses (`browser_click`, `browser_evaluate`, …).
- **`saveTo`**: the new option that writes a page value straight to a file, so it never passes through the model.
- **Store**: memory inside the extension that holds a value while the SDK pulls it in 1 MiB pieces.

## Group A — how `saveTo` works

**A1. The value travels in pieces through a store (#205).** The extension keeps the value in memory and the SDK pulls
it in 1 MiB pieces through three new extension methods. *Why:* we measured that one message over 100 MiB closes
the extension's connection for every user of the bridge, so one big message is unsafe. *Other option:* one big
message (simpler, but risky above 100 MiB). **Recommend: accept.**

**A2. The file rules are strict (#207).** `saveTo` needs an absolute path; it refuses a folder, a missing parent
folder, an existing file (unless `overwrite`), and values that can't be saved (functions, page elements, …).
*Why:* the download tool's looser rules can write somewhere other than the path you gave. *Other option:* copy the
download tool's rules. **Recommend: accept.**

**A3. The details (#218).** Method names `evaluateSaveStart/Chunk/End`; a lost or expired value answers `INTERNAL`
(as downloads do); the store keeps at most 8 values, 256 MiB each, 5 minutes; when full, the oldest is dropped — even
another script's, which then fails cleanly; the SDK method is `tab.evaluateToFile(expression, {path, overwrite?})`.
**Recommend: accept.**

**A4. One leg is not split (#217).** If a page expression's last value is a plain string (no `return`), Chrome hands
the whole string to the extension in one message; everything after that is split. Run 15 saved a 64 MiB string this
way without trouble. *Other option:* refuse such values above a size. **Recommend: accept**, with the tool's advice
to write `return …` for big values.

**A5. The `saveTo` parameter's own description doesn't mention `kind`** (the answer and the tool description do).
Fixing it changes a pinned tool schema. **Recommend: fix it in Step 11's first code stage.**

## Group B — warnings and refusal texts

**B1. The 800-element warning reaches scripts as an event (#206).** A script hears it through
`client.on("warning", …)`; actions still return nothing; the SDK adds a type `BridgeWarning` (still eight values).
*Why:* putting it in the actions' return value would change every action's signature. **Recommend: accept.**

**B2. A text match inside the 800th element itself is flagged (#216 item 2)**, though the snapshot lists the element
around it. It follows the rule's wording. *Other option:* don't flag it. **Recommend: accept** (rare; harmless).

**B3. `JS_DISABLED` carries no extra data (#219 item 1)** — the code itself says "JavaScript is off". **Recommend:
accept.**

**B4. `saveTo`'s refusals start with `[chrome.debugger] ` (#227).** For example, refusing a function value reads
`[chrome.debugger] ` followed by the refusal text. The prefix suggests the debugger failed, though the bridge refused on purpose. *Options:* (a) keep
it; (b) a small fix so the bridge's own refusals have no prefix (real debugger errors keep it), proved by a new row.
**Recommend: (b), in Step 11's first code stage.**

## Group C — the Step 8 release branch

**C1. Layout of `release/step8` (#208).** Six commits with Step 8's six "Part" messages; the final files are
identical to Step 8's close; the in-between commits don't build alone. *Other option:* one commit carrying all six
messages. **Recommend: accept.**

**C2. Tag and push (G10-1).** Creating the `step8` tag and pushing the branch and tag is yours to allow. **Recommend:
allow** (`git tag -a step8 release/step8` and push both).

## Group D — order of later work

**D1.** Where does the block list's network rule (stop redirects onto blocked sites, #140) go? *Options:* inside
Step 11; its own small step after Step 11; after Step 12. **Recommend: its own small step after Step 11.**

**D2.** The ~1.5 s screen switch during screenshots: Run 15's measurement was inconclusive. **Recommend: re-measure
with a warm-up trial in Step 11's live wave**, no code change before that.

**D3.** A popup opened from a background tab gets no lease, because Chrome names another tab as its opener (measured,
Run 15). **Recommend: leave as is** (a design change only if it bites).
