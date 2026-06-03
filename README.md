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
- **Design spec:** [`docs/specs/2026-06-04-chrome-real-profile-agent-bridge-design.md`](docs/specs/2026-06-04-chrome-real-profile-agent-bridge-design.md)

## Status

Implemented (Milestones 1–5). Manual in-browser E2E pending — see [`docs/setup.md`](docs/setup.md).
