MANIFEST dnrWithHostAccess=true staticRuleSets=absent
ROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent
EXPR rules ok len=103
2026-10-27T00:48:55.800Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T00:48:58.071Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T00:48:58.823Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
STATE armed=true evaluate=true blocklist lines=0 uploadfolders valid=0 invalid=0
TOGGLE reading on
ROW RD-0 (c) PASS: armed, JavaScript on, the toggle reads on
FOUNDLIST blocks-fixtures=no
ROW RD-0 (d) PASS: the found list blocks no fixture URL
FOUNDCHECK root=not outside=not
CHECK UP-L1 build PASS: daemon build = sha256 of daemon/dist/index.js
CHECK UP-L1 raw-root PASS: all checks hold
CHECK UP-L1 raw-outside PASS: all checks hold
ROW UP-L1 PASS: all checks hold
ROW RD-CTL concurrent 302 in 15 ms, 302 in 12 ms (idle socket held open: yes)
ROW RD-CTL concurrent 302 in 3 ms, 302 in 4 ms (idle socket held open: yes)
ROW RD-CTL concurrent 302 in 2 ms, 302 in 3 ms (idle socket held open: yes)
ROW RD-CTL concurrent 302 in 4004 ms, 302 in 4004 ms (idle socket held open: yes)
CTL 8091 flip 200 then 302
HITS ctl redirect=0 blocked=1
ROW RD-CTL PASS: all controls hold
2026-10-27T00:49:12.168Z s9-win: window 32902632 closed
2026-10-27T00:49:12.176Z s9-win: F-FILETAB closed the wave's options window O before the file window (own page is hidden as blocked)
2026-10-27T00:49:13.277Z s9-win: LEG S11b open: my check window 1576278 - the only window carrying this call's marker (after 1057 ms), its address bar on the marker URL
2026-10-27T00:49:13.289Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T00:49:13.969Z s9-win: window 1576278 omnibox sent; the page reads a file: URL: True
2026-10-27T00:49:13.971Z s9-win: FILEWINDOW 1576278 opened <ROOT>\s11b-file.html
2026-10-27T00:49:16.245Z ROW F-FILETAB tabs ok tabs total=12 hidden(disarmed)=0 hidden(blocked)=1 withTitle=11 withUrl=11 url8081=0 (4 ms)
NOT MEASURED: no ROW line for step tabs in the call's output (nothing was read)
TABSHIDDEN F-FILETAB rows=12 hidden=1 reason=blocked url=no title=no
ROW F-FILETAB tabs hidden row PASS: the one hidden row is hidden=blocked with no url and no title
2026-10-27T00:49:17.053Z ROW F-FILETAB snap DOMAIN_BLOCKED This tab shows a local file (a file: page), which the bridge never reads or acts on. (2 ms)
NOT MEASURED: no ROW line for step snap in the call's output (nothing was read)
2026-10-27T00:49:17.551Z ROW F-FILETAB nav-after T1870 hidden=blocked
2026-10-27T00:49:17.553Z ROW F-FILETAB nav DOMAIN_BLOCKED This tab shows a local file (a file: page), which the bridge never reads or acts on. (2 ms)
NOT MEASURED: no ROW line for step nav in the call's output (nothing was read)
2026-10-27T00:49:18.042Z ROW F-FILETAB tabs2 ok tabs total=12 hidden(disarmed)=0 hidden(blocked)=1 withTitle=11 withUrl=11 url8081=0 (4 ms)
NOT MEASURED: no ROW line for step tabs2 in the call's output (nothing was read)
STOP: s9.ts call: FAILED — Cannot read properties of undefined (reading 'includes') (at 2026-10-27T00:49:18.600Z)
2026-10-27T00:49:18.638Z s9-win: WAVE stopping: an exception in block liveA (RuntimeException)
2026-10-27T00:49:19.313Z s9-win: worker console: 242 texts written to <PROFILE>\AppData\Local\Temp\bridge-e2e\s11b\console.txt (not printed; Console tab found: True)
2026-10-27T00:49:19.523Z s9-win: window 4983262 closed
2026-10-27T00:49:19.740Z s9-win: window 4458656 closed
2026-10-27T00:49:19.956Z s9-win: window 1576278 closed
2026-10-27T00:49:20.173Z s9-win: window 6950738 closed
2026-10-27T00:49:20.349Z s9-win: stopped own process srv8083
2026-10-27T00:49:20.510Z s9-win: stopped own process srv8091
2026-10-27T00:49:20.669Z s9-win: stopped own process srv8087
2026-10-27T00:49:20.838Z s9-win: stopped own process srv8089
2026-10-27T00:49:20.999Z s9-win: stopped own process srv8086
2026-10-27T00:49:21.154Z s9-win: stopped own process srv8088
2026-10-27T00:49:21.309Z s9-win: stopped own process srv8085
2026-10-27T00:49:21.465Z s9-win: stopped own process srv8081
STOP: the wave ended (an exception in block liveA (RuntimeException)) (at 2026-10-27T00:49:21.469Z)
