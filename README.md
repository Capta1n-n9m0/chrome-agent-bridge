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

**22 tools**, implemented and **E2E-validated** against the real default profile: Phases A–D
(connection, navigation, perception, action fidelity, robustness) plus `browser_evaluate` and
network inspection (`browser_network_requests`, `browser_network_clear`, and
`browser_wait_for({networkIdle:true})`). Since Step 6, a shared localhost daemon sits between the
extension and its clients (the MCP server and a TypeScript SDK for scripts). Since Step 7, several
actors work on different tabs at once, through tab handles, one owner per tab, and `browser_focus_tab`.

950 unit tests green in 59 files (`npm test`, 2026-10-23). The Step 6 daemon split was E2E-tested in
wave W1 (2026-10-22), and Step 7's multi-actor tabs in Runs 8–10 (2026-10-22/23). Before that, live
in-browser runs of 29 cases (2026-06-04), Phase C (13), Phase D (7) and
Phase B (6) on 2026-09-03, the evaluate pass (20 of 22) and the network pass (15 of 15) on
2026-09-07 — 6 runtime bugs found & fixed across them. Details in
[`docs/progress-and-roadmap.md`](docs/progress-and-roadmap.md).

*Corrected 2026-10-23 (Step 7 propagator): was "21 tools" and "542 unit tests green (2026-10-22; … its
live E2E pending)"; as built Step 7 added `browser_focus_tab` and the tests, and both live waves ran
(`docs/plans/2026-10-21-step7-multi-actor-tabs-asbuilt.md`).*

Merged to `main` and published as a public GitHub repo under the MIT license (2026-09-03).

## License

[MIT](LICENSE).
