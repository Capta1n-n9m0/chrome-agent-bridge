# chrome-remote-extention

Automate your **real, already-logged-in** Chrome (default profile) from an AI agent.

Since Chrome 136 (May 2025) blocked `--remote-debugging-port` on the default user-data-dir,
CDP-against-your-real-profile no longer works for Playwright/Puppeteer/Selenium. This project
restores agent control of that profile via a Chrome extension + an MCP server, so Claude
(or any MCP client) can drive the browser you're already signed in to.

> Think of it as "Playwright MCP, but pointed at your real logged-in Chrome."

## Documentation

All documentation lives in [`docs/`](docs/).

- **Setup & usage:** [`docs/setup.md`](docs/setup.md)
- **Progress & roadmap:** [`docs/progress-and-roadmap.md`](docs/progress-and-roadmap.md)
- **E2E test plan:** [`docs/e2e-test-plan.md`](docs/e2e-test-plan.md) (+ fixture `test-fixtures/e2e-playground.html`)
- **Design spec:** [`docs/specs/2026-06-04-chrome-real-profile-agent-bridge-design.md`](docs/specs/2026-06-04-chrome-real-profile-agent-bridge-design.md)

## Status

**23 tools**, implemented and **E2E-validated** against the real default profile: Phases A–D
(connection, navigation, perception, action fidelity, robustness) plus `browser_evaluate` and
network inspection (`browser_network_requests`, `browser_network_clear`, and
`browser_wait_for({networkIdle:true})`). Since Step 6, a shared localhost daemon sits between the
extension and its clients (the MCP server and a TypeScript SDK for scripts). Since Step 7, several
actors work on different tabs at once, through tab handles, one owner per tab, and `browser_focus_tab`.
Since Step 8, scripts and Claude can name elements by role and name, text or CSS (resolved by the same
rules as the snapshot), the SDK has a typed `Tab` API whose failures carry a report (snapshot,
screenshot, recent requests), and a Claude session's tab follows you only when you ask
(`browser_use_active_tab`). How to write a script: [`docs/setup.md`](docs/setup.md#writing-a-script).

**Your controls (Step 9, Phase E safety).** A toolbar button, the shortcut `Alt+Shift+K` and the options
page turn the bridge off, so every page call is refused until you turn it back on; a separate switch
takes `browser_evaluate` away; and a block list keeps agents off the sites you name. All three are
enforced in the extension itself, so no agent, script or token holder can undo them. The block list is
not a network firewall — see [`docs/setup.md` → Safety](docs/setup.md#safety).

**Step 10 (the Step 8 follow-ups).** Claude's trusted click, type and key press now bring the tab to the
front of its window first, as a script's already did; an action on an element past the snapshot's
800-element cap says so; `browser_evaluate {saveTo}` (and `tab.evaluateToFile()` in a script) writes a
large value to a file and answers only its path, size and sha256, so bulk data never passes through
Claude's context; and "JavaScript is off" has its own error code, `JS_DISABLED`.

3273 unit tests green in 132 files (`npm test` 2026-10-25 on Step 10 S8's tree). The Step 6 daemon split was E2E-tested in
wave W1 (2026-10-22), Step 7's multi-actor tabs in Runs 8–10 (2026-10-22/23), Step 8 in Runs 11–12
(2026-10-23/24), Step 9's safety controls in Run 13 (2026-10-24; 24 rows passed, 7 failed — none
shown to be a product defect; ratified by the user, #202), and Step 10 in Runs 14–15 (2026-10-25; Run 15:
27 passed, 3 failed, none a product defect). Before that, live
in-browser runs of 29 cases (2026-06-04), Phase C (13), Phase D (7) and
Phase B (6) on 2026-09-03, the evaluate pass (20 of 22) and the network pass (15 of 15) on
2026-09-07 — 6 runtime bugs found & fixed across them. Details in
[`docs/progress-and-roadmap.md`](docs/progress-and-roadmap.md).

*Corrected 2026-10-23 (Step 7 propagator): was "21 tools" and "542 unit tests green (2026-10-22; … its
live E2E pending)"; as built Step 7 added `browser_focus_tab` and the tests, and both live waves ran
(`docs/plans/2026-10-21-step7-multi-actor-tabs-asbuilt.md`).* *Corrected 2026-10-24 (Step 8 S7):
was "22 tools" and "950 unit tests green in 59 files (2026-10-23)"; Step 8 added `browser_use_active_tab`,
locators, the `Tab` API and failure reports
(`docs/plans/2026-10-21-step8-sdk-surface-and-mcp-cursor-asbuilt.md`).* *Corrected 2026-10-24 (Step 9
S5): was "1714 unit tests green in 85 files"; Step 9 added the safety controls and their tests
(`docs/plans/2026-10-24-step9-phase-e-safety-asbuilt.md`).* *Corrected 2026-10-25 (Step 10 S8): was
"2720 unit tests green in 116 files (… at `ba6029e`)" and "the run's ratification is open for the user";
Step 10 added its features and tests (`docs/plans/2026-10-24-step10-step8-follow-ups-asbuilt.md`), and the
user ruled Run 13 (#202).*

Merged to `main` and published as a public GitHub repo under the MIT license (2026-09-03).

## License

[MIT](LICENSE).
