# Step 11b — Stage 0: S1's translation case table

**Date:** 2026-10-26 · **Role:** Stage 0 auditor (Opus 5.5, medium) · **Tree:** HEAD `9ddaa36`, product code unchanged
(`git diff --stat HEAD` lists only `journal.md`). Companion of `stage0-audit.md` (finding F4 is this table's one
disagreement).

**How the columns were made.** A scratch script (`s1cases.ts` in the session scratchpad, never in the repo) ran:
- **expected** — the shipped `isUrlBlocked(url, parseBlockList(pattern))` (`extension/src/safety-match.ts:208`), run, not
  reasoned. Invalid and ignored lines make no rule (`parsePatternLine(...).kind`, run).
- **proposed DNR form** — a draft of S1's `rulesOf` (not product code): a pattern with no `*.`, no port and no IP →
  `requestDomains: [host]`; anything else → one anchored `regexFilter` (RE2 subset: no lookaround, no backreference),
  with an optional userinfo, an optional trailing dot, and the *effective* port (`:443` matches an `https`/`wss` URL with
  no port and an `http`/`ws` URL with `:443`; `:80` the converse).
- **DNR (emulated)** — `requestDomains` by Chrome's documented domain-or-subdomain rule over the request URL's host *as
  the WHATWG parser gives it* (a trailing dot kept); `regexFilter` by running the regex on the canonical `href`. Only
  `http(s)`/`ws(s)` URLs make a request a rule can see (`view-source:` by its inner URL); `blob:`, `filesystem:`,
  `file:`, `data:`, `about:`, `chrome:`, `chrome-extension:` and unparsable URLs are "n/a".
- In the regex column `\|` is the table's escape of the regex's `|`.
- `✓` = the emulated rule agrees with `isUrlBlocked`; **`✗`** = it does not.

**Result (script output):** `ROWS 104 agree=82 disagree=1 na=21` · `DISAGREE 9 bank.example https://bank.example./
expected=true dnr=false`. Rows 1–50 are the 50 numbered cases of `extension/test/safety-match.test.ts` (31 and 36 have
two lines/URLs each); P = ports, I = IP literals, S = `*.`, A = anchoring and userinfo (54 added rows).

**What the emulation cannot tell (facts for the DNR measurement, not reasoned here):** whether Chrome's `requestDomains`
matches a host with a trailing dot (row 9 — if not, S1 adds `host.` to the list or uses the regex form); whether Chrome
accepts `requestDomains` entries with `_` (row 42), a single label (`example`, `localhost`, rows 38, P5) or an IP
literal (it is given the regex form here); whether the URL a rule sees keeps userinfo (rows 33, A1–A2: the regex allows
both); `ws(s)` rows are matched only if a rule lists `websocket` (it must not — audit F2).

| # | pattern | URL | expected (`isUrlBlocked`) | proposed DNR form | DNR (emulated) |
|---|---|---|---|---|---|
| 1 | `bank.example` | `https://bank.example/` | **blocked** | requestDomains `bank.example` | match ✓ |
| 2 | `bank.example` | `https://www.bank.example/a` | **blocked** | requestDomains `bank.example` | match ✓ |
| 3 | `bank.example` | `https://notbank.example/` | allowed | requestDomains `bank.example` | no ✓ |
| 4 | `bank.example` | `https://bank.example.evil.test/` | allowed | requestDomains `bank.example` | no ✓ |
| 5 | `*.bank.example` | `https://bank.example/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)bank\.example\.?(?::[0-9]+)?(?:[/?#]\|$)` | no ✓ |
| 6 | `*.bank.example` | `https://a.b.bank.example/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)bank\.example\.?(?::[0-9]+)?(?:[/?#]\|$)` | match ✓ |
| 7 | `BANK.EXAMPLE` | `https://Bank.Example/` | **blocked** | requestDomains `bank.example` | match ✓ |
| 8 | `bank.example.` | `https://bank.example/` | **blocked** | requestDomains `bank.example` | match ✓ |
| 9 | `bank.example` | `https://bank.example./` | **blocked** | requestDomains `bank.example` | **no ✗** |
| 10 | `bank.example:8443` | `https://bank.example:8443/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:8443(?:[/?#]\|$)` | match ✓ |
| 11 | `bank.example:8443` | `https://bank.example/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:8443(?:[/?#]\|$)` | no ✓ |
| 12 | `bank.example:443` | `https://bank.example/` | **blocked** | regex `^(?:(?:https\|wss)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?(?::443)?\|(?:http\|ws)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:443)(?:[/?#]\|$)` | match ✓ |
| 13 | `bank.example` | `http://bank.example:8080/` | **blocked** | requestDomains `bank.example` | match ✓ |
| 14 | `localhost:8081` | `http://localhost:8081/x` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?localhost\.?:8081(?:[/?#]\|$)` | match ✓ |
| 15 | `localhost:8081` | `http://localhost:8080/x` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?localhost\.?:8081(?:[/?#]\|$)` | no ✓ |
| 16 | `localhost:8081` | `http://app.localhost:8081/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?localhost\.?:8081(?:[/?#]\|$)` | match ✓ |
| 17 | `127.0.0.1` | `http://127.0.0.1:8081/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?127\.0\.0\.1(?::[0-9]+)?(?:[/?#]\|$)` | match ✓ |
| 18 | `127.0.0.1` | `http://localhost:8081/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?127\.0\.0\.1(?::[0-9]+)?(?:[/?#]\|$)` | no ✓ |
| 19 | `127.0.0.1` | `http://2130706433/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?127\.0\.0\.1(?::[0-9]+)?(?:[/?#]\|$)` | match ✓ |
| 20 | `"*.127.0.0.1"` | — | invalid (no rule) | none | — |
| 21 | `[::1]:8081` | `http://[::1]:8081/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?\[::1\]:8081(?:[/?#]\|$)` | match ✓ |
| 22 | `"::1"` | — | invalid (no rule) | none | — |
| 23 | `bücher.example` | `https://xn--bcher-kva.example/` | **blocked** | requestDomains `xn--bcher-kva.example` | match ✓ |
| 24 | `xn--bcher-kva.example` | `https://bücher.example/` | **blocked** | requestDomains `xn--bcher-kva.example` | match ✓ |
| 25 | `bank.example` | `https://bank.example/` | **blocked** | requestDomains `bank.example` | match ✓ |
| 26 | `""` | — | ignored (no rule) | none | — |
| 27 | `"# my bank"` | — | ignored (no rule) | none | — |
| 28 | `"bank example"` | — | invalid (no rule) | none | — |
| 29 | `"*bank.example"` | — | invalid (no rule) | none | — |
| 30 | `"*"` | — | invalid (no rule) | none | — |
| 31a | `"bank.example:0"` | — | invalid (no rule) | none | — |
| 31b | `"bank.example:70000"` | — | invalid (no rule) | none | — |
| 32 | `https://bank.example/login?x=1` | `https://www.bank.example/` | **blocked** | requestDomains `bank.example` | match ✓ |
| 33 | `bank.example` | `https://user:pw@bank.example/` | **blocked** | requestDomains `bank.example` | match ✓ |
| 34 | `bank.example` | `blob:https://bank.example/uuid` | **blocked** | requestDomains `bank.example` | n/a (no covered request) |
| 35 | `bank.example` | `view-source:https://bank.example/` | **blocked** | requestDomains `bank.example` | match ✓ |
| 36a | `bank.example` | `about:blank` | allowed | requestDomains `bank.example` | n/a (no covered request) |
| 36b | `bank.example` | `data:text/html,x` | allowed | requestDomains `bank.example` | n/a (no covered request) |
| 37 | `bank.example` | `wss://bank.example/socket` | **blocked** | requestDomains `bank.example` | match ✓ |
| 38 | `example` | `https://bank.example/` | **blocked** | requestDomains `example` | match ✓ |
| 39 | `bank.example` | `chrome-extension://abcdefghijklmnopabcdefghijklmnop/options.html` | allowed | requestDomains `bank.example` | n/a (no covered request) |
| 40 | `extensions` | `chrome://extensions` | allowed | requestDomains `extensions` | n/a (no covered request) |
| 41 | `ponmlkjihgfedcbaponmlkjihgfedcba` | `chrome-extension://ponmlkjihgfedcbaponmlkjihgfedcba/page.html` | allowed | requestDomains `ponmlkjihgfedcbaponmlkjihgfedcba` | n/a (no covered request) |
| 42 | `my_host.example` | `https://my_host.example/` | **blocked** | requestDomains `my_host.example` | match ✓ |
| 43 | `bank.example` | `filesystem:https://bank.example/temporary/x` | **blocked** | requestDomains `bank.example` | n/a (no covered request) |
| 44 | `bank.example` | `file://bank.example/share/x` | **blocked** | requestDomains `bank.example` | n/a (no covered request) |
| 45 | `bank.example:445` | `file://bank.example/share/x` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:445(?:[/?#]\|$)` | n/a (no covered request) |
| 46 | `bank.example` | `file:///C:/x` | allowed | requestDomains `bank.example` | n/a (no covered request) |
| 47 | `https://bank.example:443/` | `https://bank.example:8443/` | **blocked** | requestDomains `bank.example` | match ✓ |
| 48 | `bank.example:443` | `https://bank.example:8443/` | allowed | regex `^(?:(?:https\|wss)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?(?::443)?\|(?:http\|ws)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:443)(?:[/?#]\|$)` | no ✓ |
| 49 | `https://bank.example:8443/x` | `https://bank.example:8443/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:8443(?:[/?#]\|$)` | match ✓ |
| 50 | `https://bank.example:8443/x` | `https://bank.example/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:8443(?:[/?#]\|$)` | no ✓ |
| P1a | `bank.example:80` | `http://bank.example/` | **blocked** | regex `^(?:(?:http\|ws)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?(?::80)?\|(?:https\|wss)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:80)(?:[/?#]\|$)` | match ✓ |
| P1b | `bank.example:80` | `https://bank.example/` | allowed | regex `^(?:(?:http\|ws)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?(?::80)?\|(?:https\|wss)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:80)(?:[/?#]\|$)` | no ✓ |
| P1c | `bank.example:80` | `http://bank.example:80/` | **blocked** | regex `^(?:(?:http\|ws)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?(?::80)?\|(?:https\|wss)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:80)(?:[/?#]\|$)` | match ✓ |
| P2a | `bank.example:443` | `http://bank.example:443/` | **blocked** | regex `^(?:(?:https\|wss)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?(?::443)?\|(?:http\|ws)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:443)(?:[/?#]\|$)` | match ✓ |
| P2b | `bank.example:443` | `wss://bank.example/` | **blocked** | regex `^(?:(?:https\|wss)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?(?::443)?\|(?:http\|ws)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:443)(?:[/?#]\|$)` | match ✓ |
| P2c | `bank.example:443` | `ws://bank.example/` | allowed | regex `^(?:(?:https\|wss)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?(?::443)?\|(?:http\|ws)://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:443)(?:[/?#]\|$)` | no ✓ |
| P3a | `bank.example:8443` | `https://bank.example:8443?x` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:8443(?:[/?#]\|$)` | match ✓ |
| P3b | `bank.example:8443` | `https://bank.example:84430/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:8443(?:[/?#]\|$)` | n/a (no covered request) |
| P3c | `bank.example:8443` | `https://bank.example.:8443/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:8443(?:[/?#]\|$)` | match ✓ |
| P4a | `localhost:8081` | `ws://localhost:8081/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?localhost\.?:8081(?:[/?#]\|$)` | match ✓ |
| P4b | `localhost:8081` | `http://localhost:18081/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?localhost\.?:8081(?:[/?#]\|$)` | no ✓ |
| P4c | `localhost:8081` | `http://localhost:808/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?localhost\.?:8081(?:[/?#]\|$)` | no ✓ |
| P5 | `localhost` | `http://localhost:9234/` | **blocked** | requestDomains `localhost` | match ✓ |
| P6 | `https://bank.example/` | `http://bank.example:8080/` | **blocked** | requestDomains `bank.example` | match ✓ |
| P7 | `xn--bcher-kva.example:8443` | `https://bücher.example:8443/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?xn--bcher-kva\.example\.?:8443(?:[/?#]\|$)` | match ✓ |
| P8a | `my_host.example:8443` | `https://my_host.example:8443/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?my_host\.example\.?:8443(?:[/?#]\|$)` | match ✓ |
| P8b | `my_host.example:8443` | `https://myxhost.example:8443/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?my_host\.example\.?:8443(?:[/?#]\|$)` | no ✓ |
| P9 | `bank.example:8443` | `ftp://bank.example:8443/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:8443(?:[/?#]\|$)` | n/a (no covered request) |
| I1a | `127.0.0.1:8081` | `http://127.0.0.1:8081/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?127\.0\.0\.1:8081(?:[/?#]\|$)` | match ✓ |
| I1b | `127.0.0.1:8081` | `http://127.0.0.1:8082/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?127\.0\.0\.1:8081(?:[/?#]\|$)` | no ✓ |
| I1c | `127.0.0.1:8081` | `http://localhost:8081/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?127\.0\.0\.1:8081(?:[/?#]\|$)` | no ✓ |
| I2a | `127.0.0.1` | `http://127.0.0.2/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?127\.0\.0\.1(?::[0-9]+)?(?:[/?#]\|$)` | no ✓ |
| I2b | `127.0.0.1` | `http://127.0.0.10/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?127\.0\.0\.1(?::[0-9]+)?(?:[/?#]\|$)` | no ✓ |
| I2c | `127.0.0.1` | `http://127.0.0.1.example/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?127\.0\.0\.1(?::[0-9]+)?(?:[/?#]\|$)` | no ✓ |
| I2d | `127.0.0.1` | `http://0x7f.1/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?127\.0\.0\.1(?::[0-9]+)?(?:[/?#]\|$)` | match ✓ |
| I3 | `127.0.0.1` | `http://[::ffff:127.0.0.1]/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?127\.0\.0\.1(?::[0-9]+)?(?:[/?#]\|$)` | no ✓ |
| I4a | `[::1]` | `http://[::1]:9/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?\[::1\](?::[0-9]+)?(?:[/?#]\|$)` | match ✓ |
| I4b | `[::1]` | `http://[::2]/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?\[::1\](?::[0-9]+)?(?:[/?#]\|$)` | no ✓ |
| I5 | `[::1]:8081` | `http://[::1]:8082/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?\[::1\]:8081(?:[/?#]\|$)` | no ✓ |
| I6 | `[0:0:0:0:0:0:0:1]` | `http://[::1]/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?\[::1\](?::[0-9]+)?(?:[/?#]\|$)` | match ✓ |
| I7 | `[::ffff:127.0.0.1]` | `http://[::ffff:7f00:1]/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?\[::ffff:7f00:1\](?::[0-9]+)?(?:[/?#]\|$)` | match ✓ |
| I8 | `2130706433` | `http://127.0.0.1/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?127\.0\.0\.1(?::[0-9]+)?(?:[/?#]\|$)` | match ✓ |
| I9a | `127.0.0.1` | `http://evil.test/?h=127.0.0.1` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?127\.0\.0\.1(?::[0-9]+)?(?:[/?#]\|$)` | no ✓ |
| I9b | `127.0.0.1` | `http://evil.test/127.0.0.1` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?127\.0\.0\.1(?::[0-9]+)?(?:[/?#]\|$)` | no ✓ |
| S1a | `*.bank.example` | `https://www.bank.example/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)bank\.example\.?(?::[0-9]+)?(?:[/?#]\|$)` | match ✓ |
| S1b | `*.bank.example` | `https://xbank.example/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)bank\.example\.?(?::[0-9]+)?(?:[/?#]\|$)` | no ✓ |
| S1c | `*.bank.example` | `https://a.bank.example./` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)bank\.example\.?(?::[0-9]+)?(?:[/?#]\|$)` | match ✓ |
| S2a | `*.bank.example:8443` | `https://a.bank.example:8443/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)bank\.example\.?:8443(?:[/?#]\|$)` | match ✓ |
| S2b | `*.bank.example:8443` | `https://bank.example:8443/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)bank\.example\.?:8443(?:[/?#]\|$)` | no ✓ |
| S2c | `*.bank.example:8443` | `https://a.bank.example/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)bank\.example\.?:8443(?:[/?#]\|$)` | no ✓ |
| S3a | `*.bank.example` | `https://evil.test/#.bank.example` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)bank\.example\.?(?::[0-9]+)?(?:[/?#]\|$)` | no ✓ |
| S3b | `*.bank.example` | `https://evil.test/x.bank.example` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)bank\.example\.?(?::[0-9]+)?(?:[/?#]\|$)` | no ✓ |
| S4a | `*.localhost:8081` | `http://app.localhost:8081/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)localhost\.?:8081(?:[/?#]\|$)` | match ✓ |
| S4b | `*.localhost:8081` | `http://localhost:8081/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)localhost\.?:8081(?:[/?#]\|$)` | no ✓ |
| A1a | `bank.example` | `https://evil.test/?u=https://bank.example/` | allowed | requestDomains `bank.example` | no ✓ |
| A1b | `bank.example` | `https://evil.test@bank.example/` | **blocked** | requestDomains `bank.example` | match ✓ |
| A1c | `bank.example` | `https://bank.example@evil.test/` | allowed | requestDomains `bank.example` | no ✓ |
| A2a | `bank.example:8443` | `https://evil.test/?u=https://bank.example:8443/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:8443(?:[/?#]\|$)` | no ✓ |
| A2b | `bank.example:8443` | `https://bank.example:8443@evil.test/` | allowed | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:8443(?:[/?#]\|$)` | no ✓ |
| A2c | `bank.example:8443` | `https://u:p@bank.example:8443/` | **blocked** | regex `^[a-z][a-z0-9+.-]*://(?:[^/?#@]*@)?(?:[^/?#@:\[\]]+\.)?bank\.example\.?:8443(?:[/?#]\|$)` | match ✓ |
| A3a | `example` | `https://example/` | **blocked** | requestDomains `example` | match ✓ |
| A3b | `example` | `https://example.example.evil.test/` | allowed | requestDomains `example` | no ✓ |
