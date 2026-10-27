# extension/src/ — the safety gate's redirect, DNR and `file:` rules

`extension/CLAUDE.md` also applies (Key files, the rest of the Safety gate). These bullets bind `safety.ts`,
`safety-dnr.ts`, `safety-dnr-keeper.ts` and `safety-hop.ts`, which sit flat in `src/`, so this file loads with any
file under `src/`.

## Safety gate (Step 9, Step 11, Step 11b)

- **The block list is not a network firewall; since Step 11b it stops redirect hops of a bridge call in flight.**
  While a `navigate` or `downloadStart` runs, session DNR rules built from the list hold, so a hop onto a blocked host
  is never sent: the blocked fixture server saw 0 requests (Run 17 RD-1, RD-3; before: 1, SAFE-5b, R14-5c), answers
  unchanged; the rules follow the list (RD-4, RD-5, RD-5b) and read 0 after each reply. `downloadStart` still checks
  its own URL, then `res.url` (#140, #154). Not covered: `newTab`'s first request (RD-2 blocked 1; #295), the human's
  own browsing (RD-6; 0.4 (C)), requests a page starts after the call (0.9), and a redirect through `back`/`forward`
  is unmeasured (#308). A cross-origin frame of a blocked host shows in screenshots (stage0-audit F16, by reading).
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
