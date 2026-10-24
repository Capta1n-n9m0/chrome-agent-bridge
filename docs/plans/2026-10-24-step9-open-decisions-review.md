# Step 9 — the open decisions, explained simply

**Date:** 2026-10-24 · **For:** the user, to rule on · **Source:** `docs/decisions.md` → Open decisions → Step 9

Step 9 built three safety controls into the Chrome extension: an on/off switch for the whole bridge, a
JavaScript switch, and a list of blocked sites. While building it, Claude made 32 choices that change
what agents can do or see. Those choices are yours to approve. Each one below says why it was needed,
what the options were, and what I recommend.

**Words used below**

- **Agent** — Claude or a script that drives Chrome through the bridge.
- **Bridge on / off** — the kill switch. "Off" means every agent request that touches a page is refused.
- **Daemon** — the small background program that sits between agents and Chrome.
- **Block list** — sites you list in the options page. Agents may not touch them.
- **Own pages** — the extension's own settings page. If an agent could open it, it could turn the bridge
  back on by itself.
- **Refused** — the request fails with an error code, and nothing happens in Chrome.

**One rule behind almost every choice:** when it was unclear, I picked the option that is safer and that
changes nothing at all while the bridge is on, JavaScript is on, and the block list is empty — the way
you use it today.

The groups, so you can find your way:

| Group | What it covers | Decisions |
|---|---|---|
| A | Run 13, the live test | #192 |
| B | How agents learn whether the bridge is on | #132, #148, #159, #162, #163, #168, #180 |
| C | What agents can see while the bridge is off or a site is blocked | #134, #155, #160, #161, #179 |
| D | What gets refused | #133, #136, #138, #140, #153, #154, #175, #177, #178 |
| E | Making the switch itself reliable | #137, #139, #144, #174, #176, #188 |
| F | How block-list lines are read | #135, #156 |
| G | Paperwork | #131, #141 |

---

## A. Run 13, the live test

### #192 — Does the live test (Run 13) count?

**Why it needs a decision.** The live test ran in your real Chrome and passed its four exit checks. Your
settings were put back exactly as they were. But the helper that ran the test broke its own rules four
times. Each time it hit a "stop and report" point, it fixed its own test script and kept going instead of
stopping:
1. It printed "RESTORE FAILED" because of a bug in how it counted windows. Nothing had been changed yet.
2. A starting-state check gave a false alarm because of a reading bug.
3. It could not pin the toolbar button the normal way. The plan said "ask the user once". It pinned the
   button with a real mouse click inside its own window instead, and unpinned it at the end.
4. A script error came after the first switch press, and it did not run the restore step. The settings
   were still as found at that moment, so a restore would have changed nothing.

At none of these points were your safety settings changed. No test row was re-run to make it pass.

**Options.**
- **(a) Accept Run 13 as it is**, and note the four slips. The next live test already has a stricter
  rule: the helper must stop at every stop point (#193).
- **(b) Re-run the affected part** (the first rows, up to the double-press and screenshot tests) in a new
  live session before Step 10.

**I recommend (a).** The slips were about the test helper, not the product. The results are real
measurements, and the stricter rule fixes the cause. A re-run costs about an hour of live time and would
most likely show the same results.

---

## B. How agents learn whether the bridge is on

### #132 — How the on/off state travels from Chrome to agents

**Why.** An agent that is refused should be able to say *why* ("the user turned the bridge off"), and
`browser_status` should show the state. The state has to get from the extension to the daemon to the agents.

**Options.**
- (a) **Two small messages:** the extension tells the daemon whenever the state changes, and the daemon
  passes it on to every agent. The daemon also includes it in its status answer.
- (b) Put it in the extension's "hello" message, which is sent once per connection. Every change would
  then force a reconnect.
- (c) Add it to an existing message that means something else ("is the extension connected").

**I recommend (a), as built.** It is the only option that updates right away without reconnecting. Older
agents that do not know the new message simply ignore it. Only on/off, JavaScript on/off and a *count* of
blocked sites are sent — never the sites themselves.

### #148 — The tab list in the SDK when a tab is hidden

**Why.** When a tab is hidden (see group C), its title and address are removed. Scripts using the SDK
expect `title` and `url` to always be text.

**Options.**
- (a) Keep `title` and `url` as text, set them to empty, and add a field `hidden` that says why.
- (b) Make `title` and `url` optional. This is more "correct", but every existing script that uses them
  would need a code change.

**I recommend (a), as built.** It adds something and breaks nothing.

### #159 — The daemon never sends an "unknown" state message

**Why.** When Chrome closes or the extension reloads, the daemon no longer knows the state. It could send
an "unknown" message, but agents are built to expect a real state in that message.

**Options.**
- (a) Don't send it. Agents see "unknown" in the status answer, and they already get a separate
  "extension disconnected" message.
- (b) Send an "unknown" message. Every agent would need updating to handle it.

**I recommend (a), as built.** The information is already there through the other message.

### #162 — Where the "Safety:" line appears in `browser_status`

**Why.** `browser_status` is the first tool Claude calls when something goes wrong. It should show the
safety state. But changing its existing text would break Step 8's tests, which pin that text exactly.

**Options.**
- (a) Add the `Safety:` line as a **second piece of text** in the same answer, shown only while the
  extension is connected.
- (b) Add it inside the existing text (edits pinned tests, which our rules forbid without your say-so).
- (c) Like (a), but also show `Safety: not reported` while Chrome is closed.

**I recommend (a), as built.** The live test confirmed that Claude really sees the second piece of text
(row SAFE-9). When Chrome is closed, `browser_status` already says the extension is not connected, so
"not reported" would only add noise.

### #163 — The wording agents get when refused

**Why.** When the bridge is off, Claude should get one short, plain line: "the user turned the bridge off;
stop and ask them". Scripts should get the same wording.

**Options.**
- (a) One shared wording, published by the SDK in its "report" part, used by both the MCP and scripts.
- (b) Attach a full failure report (snapshot plus screenshot) like other errors get. This breaks a Step 8
  rule and would itself be refused, since the bridge is off.
- (c) A private copy of the wording in the MCP only. Two wordings could drift apart.

**I recommend (a), as built.**

### #168 — Two new type names in the SDK

**Why.** Scripts written in TypeScript need names for "the safety state" and "why a tab is hidden" to use
the new features.

**Options.** (a) Export the two type names from the SDK. (b) Make scripts import them from an internal
package.

**I recommend (a), as built.** These are names only, not new behaviour.

### #180 — No state report while the state can't be read

**Why.** If the extension cannot read its own settings (a rare storage failure), it refuses everything,
the safe default. The question is what to tell the daemon.

**Options.**
- (a) Tell it nothing. The daemon shows "not reported".
- (b) Report "off, JavaScript off, 0 blocked sites". The calls are refused anyway, but the "0 blocked
  sites" part would be made up.

**I recommend (a), as built.** It doesn't invent numbers, and calls are refused either way.

---

## C. What agents can see while the bridge is off or a site is blocked

### #134 — Hiding tab titles and addresses

**Why.** While the bridge is off, or for a tab on a blocked site, an agent should not learn what you are
looking at. The original plan hid titles and addresses only in the tab list. The audit found that they
also leak through tab events ("a tab opened at …") and through the daemon's memory of recent tabs.

**Options.**
- (a) **Hide them everywhere:** in the tab list, the tab events and the daemon's status. A hidden tab keeps
  its handle, so agents can still count tabs, and it gets a short reason: `(hidden: the bridge is off)` or
  `(hidden: blocked site)`.
- (b) Hide them in the tab list only, which leaks.
- (c) Show everything even while off.

**I recommend (a), as built.** Nothing is hidden in normal use (bridge on, empty list).

### #155 — Network log and the extension's own settings page

**Why.** The network log already drops requests from blocked sites. Should a tab showing the extension's
settings page count as "blocked" too?

**Options.** (a) Yes, treat it like a blocked site. (b) No, only sites on your list.

**I recommend (a), as built.** The settings page makes no other requests, so this changes nothing today,
but it keeps "own pages are always blocked" true everywhere.

### #160 — The daemon keeps hiding things after Chrome disconnects

**Why.** If you turn the bridge off and then Chrome closes or the extension reloads, the daemon briefly
doesn't know the current state. Its memory still holds tab addresses from before you turned it off.

**Options.**
- (a) Keep hiding until the extension reports again.
- (b) Stop hiding as soon as the state is unknown. That would leak those old addresses during each
  reconnect.

**I recommend (a), as built.** The extension reports again within about 2 seconds of reconnecting, and
the daemon follows the new state from then on.

### #161 — Popup addresses while the bridge is off

**Why.** When a page an agent holds opens a popup, the daemon tells the agent "you now hold the popup",
including its address.

**Options.** (a) Leave the address out while the bridge is off. (b) Pass on whatever the extension sent.

**I recommend (a), as built.** It matches every other place where addresses are hidden while off.

### #179 — A network request half-dropped stays dropped

**Why.** One page request produces several events (sent, redirected, finished). If the bridge is turned
off in the middle, or the request redirects to a blocked site, some events are dropped. Without this
rule, a later event could rebuild the entry and show traffic from the "off" period or the blocked site.

**Options.** (a) Once any event of a request is dropped, drop the whole request for good. (b) Drop events
one by one, which can leak.

**I recommend (a), as built.** Requests recorded while the bridge was on are kept.

---

## D. What gets refused

### #133 — One error code or two for "JavaScript is off"

**Why.** When you turn JavaScript off, `browser_evaluate` must be refused. Agents should be able to tell
"JavaScript is off" apart from "the whole bridge is off".

**Options.**
- (a) Reuse `DISARMED`, with a detail field: `scope: "evaluate"` (only JavaScript is off) or
  `scope: "all"` (everything is off). The message says plainly that every other tool still works.
- (b) A third, new code `JS_DISABLED`. The name is clearer, but it changes the plan's agreed code count
  and the spec a second time.

**I recommend (a), as built.** The message text and the detail field already make the difference clear.
If you prefer (b), it is a small change in Step 10.

### #136 — Claiming a tab on a blocked site

**Why.** An agent can "claim" a tab — reserve it so other agents can't use it. Should claiming a tab on a
blocked site be refused?

**Options.**
- (a) Allow the claim, but refuse every action on that tab.
- (b) Refuse the claim itself.

**I recommend (a), as built.** A claim is only a reservation and gives no access to the page. Refusing it
would also mean the daemon has to know your block list, and the plan keeps all enforcement in the
extension, the one place you control.

### #138 — Script links, and other extensions' pages

**Why.** Two loopholes the audit found:
1. With JavaScript off, an agent could still run code by opening a `javascript:` or `data:` link.
2. An agent could open the extension's own settings page and click "turn back on".

**Options.**
- (a) **As built:** with JavaScript off, opening `javascript:` / `data:` / `blob:` links is refused.
  Opening *any* extension's page is refused. Acting on a tab and hiding its title apply only to *this*
  extension's own pages.
- (b) **Wider:** also hide and refuse every action on *other* extensions' pages (password managers and so
  on). Chrome already stops our extension from reading or controlling those pages. The cost: closing or
  focusing such a tab would also be refused, and its title would be hidden.

**I recommend (a).** Chrome already protects other extensions' pages from us. Choose (b) if you'd rather
not have even their *titles* visible to agents.

### #140 — Downloads and redirects onto blocked sites

**Why.** If an agent downloads from site A and A redirects to a blocked site B, the request to B has
already been sent (with your cookies) before the extension can see where it ended up. The same can happen
when an agent opens a link that redirects.

**Options.**
- (a) **As built:** check the address before the download and again after the redirect. If it ended on a
  blocked site, throw the file away and refuse. The request to B still happened. This is written in the
  setup guide: the block list is not a firewall.
- (b) Also add a Chrome network rule that stops any request to a blocked site, redirects included. This
  needs a new Chrome permission and real work, so it would be a later step.
- (c) Refuse every redirect. This breaks Blackboard downloads, which always redirect to file storage.

**I recommend (a) now, and (b) as a candidate for a later step** if you want the block list to stop the
request itself, not just the answer. This is the one choice where the safer option is not built yet.

### #153 — Wrapped links to the settings page

**Why.** A link can be "wrapped", for example `view-source:` + the settings page address. Read literally,
the own-page rule missed these.

**Options.** (a) Look inside up to 4 layers of wrapping, ignoring upper/lower case. (b) Read the rule
literally.

**I recommend (a), as built.** It only closes a gap; normal links behave the same.

### #154 — Download from an extension address

**Why.** Should "download from an extension's address" be refused by the safety check?

**Options.** (a) Leave it to the download code, which already refuses anything that isn't a web address
(`BAD_PARAMS`, as today). (b) Refuse it as a blocked site.

**I recommend (a), as built.** It is refused either way. (a) keeps today's exact error.

### #175 — Opening a short address like `/options.html`

**Why.** This was the serious bug found and fixed during building. An agent asking to open
`/options.html` (no `https://` in front) would land on the extension's settings page, because Chrome fills
in the extension's own address. The fix checks the address Chrome *will actually open*.

**Options.**
- (a) **As built:** work out the real address first, then check it. A text that isn't a valid address at
  all (for example `http://exa mple.com` with a space) is refused too.
- (b) Same, but let invalid text through to Chrome as before.

**I recommend (a).** The small cost: an agent that sends a broken address now gets `DOMAIN_BLOCKED`
instead of whatever Chrome used to answer. That was never measured, and it was most likely an error anyway.

### #177 — A screenshot that caught the wrong tab

**Why.** To screenshot a tab, the extension briefly brings it to the front. If you switch tabs at that
exact moment, the picture could show *your* tab instead, and an agent would see it.

**Options.** (a) Check afterwards which tab was in front. If it was the wrong one, throw the picture away
and answer `OFFSCREEN`. (b) Return the picture anyway, as before.

**I recommend (a), as built.** It only changes anything in that rare race, and then it protects you.

### #178 — Error messages pass the same final check

**Why.** Before replying, the extension checks again: "is the bridge still on, and is this site still
allowed?" Should error replies get that check too, or only successful answers?

**Options.** (a) Check error replies too, because an error can contain page text. Also, if the settings
can't be read, refuse the tab list. (b) Check only successful answers.

**I recommend (a), as built.**

---

## E. Making the switch itself reliable

### #137 — Work already running when you press "off"

**Why.** Some requests take time: waiting for text to appear, typing, taking a screenshot, downloading. A
check only at the start would let them finish after you pressed off.

**Options.**
- (a) **As built:** check at the start, again just before anything happens in the page, and again before
  answering. Also drop the debugger at once (Chrome's yellow "debugging" bar), stop waits within 0.1 s,
  throw away pending downloads, and stop recording network traffic.
- (b) Check only at the start (the original plan).

**I recommend (a).** The live test measured it: typing stopped 14 ms after the press, and waiting stopped
within 54–92 ms. Chrome's yellow bar took longer to go away (more than 3 s). That is Chrome's own timing,
and Step 10 will measure it again.

### #139 — Reading the switch on every request

**Why.** The switch must never be read from an old copy, and nothing but the extension itself may change it.

**Options.**
- (a) **As built:** read the saved setting fresh on every request. If it can't be read, refuse
  everything. Make the storage unreadable by web pages. Accept commands only from the extension's own
  connection to the daemon.
- (b) Keep a copy in memory and update it on changes. Faster, but could act on an out-of-date copy.

**I recommend (a).** The live test measured the cost: about 1.7 ms more per request (3.6 → 5.3 ms).

### #144 — Pressing "off" twice quickly

**Why.** The button and shortcut *toggle*. In a panic, you might double-click, which would turn the
bridge off and straight back on.

**Options.**
- (a) **As built:** a press that would turn it back *on* within 1 second of turning it off is ignored.
  Turning *off* always works at once.
- (b) No protection.
- (c) A separate "off only" shortcut.

**I recommend (a).** The live test confirmed it: a double press left it off, and a third press turned it
on. If 1 second feels wrong in practice, it is easy to change.

### #174 — If saving "off" fails

**Why.** Saving the setting to Chrome's storage almost never fails, but it can.

**Options.**
- (a) **As built:** try once more. If it still fails, stay off in memory anyway, and show it on the badge.
  This lasts until the extension restarts.
- (b) Report an error and stay on.

**I recommend (a).** Your "off" press must hold. A later fix (S2c) also made sure that a failed "on"
leaves it off.

### #176 — Memory says off, storage still says on

**Why.** For a moment after you press off — while saving, or after a failed save — memory and storage can
disagree.

**Options.** (a) "Off" wins. (b) Trust storage.

**I recommend (a), as built.** It can only ever refuse more, never less.

### #188 — Nothing may delete the safety settings

**Why.** If the saved settings were deleted, the extension would fall back to the defaults: bridge on.
So deleting counts as turning it on.

**Options.** (a) A test forbids any code from deleting or clearing extension storage. (b) Forbid only
direct writes to the safety settings.

**I recommend (a), as built.** Nothing uses delete or clear today. If a future feature needs to, it must
be named in the test on purpose.

---

## F. How block-list lines are read

### #135 — The block-list rules

**Why.** You type one site per line. The extension must understand each line the way you mean it, and
must never block or allow something by accident (`bank.com` must not match `notbank.com`).

**Options.**
- (a) **As built:**
  - `bank.com` blocks bank.com and all its subdomains;
  - `*.bank.com` blocks only the subdomains;
  - `localhost:8081` blocks that port only;
  - international names and IP addresses work;
  - lines starting with `#` are comments;
  - a pasted full address is cut down to the site;
  - invalid lines are marked in red and ignored;
  - matching only ever happens at a dot boundary.

  50 test cases cover it.
- (b) Exact site only, no subdomains. You would have to list `www.bank.com`, `login.bank.com` and so on.
- (c) Allow `*` to mean "everything". The off switch already does that.

**I recommend (a).** If you later want blocking by page path, or an "allow only these" mode, those would
be new features.

### #156 — The small print of the rules

**Why.** Details the rules above left open:
- `ftp://` addresses count too;
- wrapped links are unwrapped up to 4 layers;
- some odd patterns are invalid (`a..b`, `*.` alone, `*.*.x`);
- a pattern written as a name never matches an IP address, and the reverse;
- line endings from any operating system work.

**Options.** (a) As built. (b) Change any single item.

**I recommend (a).** Each item is the stricter reading, and none affects an empty list.

---

## G. Paperwork

### #131 — The plan's own proposals

**Why.** This entry recorded the plan's untested proposals so the review stage (the audit) could
challenge them. The audit found three of them wrong, and decisions #132–#141 replaced those parts.

**Options.** (a) Approve #131 as amended by #132–#141. (b) Reopen a part.

**I recommend (a).** It is a summary. The real choices are the ones above.

### #141 — Stricter test checks

**Why.** The audit found four planned checks that could never fail, so they proved nothing. It rewrote
them to be stricter before anything was measured. (The rules allow checks to get stricter, never looser.)

**Options.** (a) Approve the stricter wording. (b) Keep the original wording.

**I recommend (a).** All of them passed in their stricter form.

---

## Summary of my recommendations

- **Accept everything as built**, and accept Run 13 (#192 option a).
- **Two places where you might choose differently:**
  - #138 — also hide *other* extensions' page titles (the wider rule);
  - #133 — a separate `JS_DISABLED` code instead of `DISARMED` + scope.
- **One idea for later:** #140 option (b), a Chrome network rule so the block list stops even a redirected
  request. It needs a new permission and a later step.
