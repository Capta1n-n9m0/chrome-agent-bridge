# Browser Agent Bridge

Automate your **real, already-logged-in** Chrome or Safari profile from an AI agent.

Since Chrome 136 (May 2025) blocked `--remote-debugging-port` on the default user-data-dir,
CDP-against-your-real-profile no longer works for Playwright/Puppeteer/Selenium. This project
restores agent control of that profile via a browser extension + an MCP server, so Claude
(or any MCP client) can drive the browser you're already signed in to.

> Think of it as "Playwright MCP, but pointed at your real logged-in browser."

Chrome has the complete feature set. The macOS Safari build supports navigation, snapshots,
viewport screenshots, DOM actions, tabs, history, waits, MAIN-world evaluation, and network
inspection. Safari does not expose the debugger protocol, so trusted input and CDP full-page
screenshots are unavailable there. See [Safari setup and limitations](docs/setup.md#safari-macos).

## Documentation

All documentation lives in [`docs/`](docs/).

- **Setup & usage:** [`docs/setup.md`](docs/setup.md)
- **Local installation changes:** [`docs/local-installation-changes.md`](docs/local-installation-changes.md)
- **Progress & roadmap:** [`docs/progress-and-roadmap.md`](docs/progress-and-roadmap.md)
- **E2E test plan:** [`docs/e2e-test-plan.md`](docs/e2e-test-plan.md) (+ fixture `test-fixtures/e2e-playground.html`)
- **Design spec:** [`docs/specs/2026-06-04-chrome-real-profile-agent-bridge-design.md`](docs/specs/2026-06-04-chrome-real-profile-agent-bridge-design.md)

## Status

**20 tools**, implemented and **E2E-validated** against the real default profile: Phases A–D
(connection, navigation, perception, action fidelity, robustness) plus `browser_evaluate` and
network inspection (`browser_network_requests`, `browser_network_clear`, and
`browser_wait_for({networkIdle:true})`).

266 unit tests green; live Chrome runs of 29 cases (2026-06-04), Phase C (13), Phase D (7) and
Phase B (6) on 2026-09-03, the evaluate pass (20 of 22) and the network pass (15 of 15) on
2026-09-07 — 6 runtime bugs found & fixed across them. Details in
[`docs/progress-and-roadmap.md`](docs/progress-and-roadmap.md).

Merged to `main` and published as a public GitHub repo under the MIT license (2026-09-03).

## License

[MIT](LICENSE).
