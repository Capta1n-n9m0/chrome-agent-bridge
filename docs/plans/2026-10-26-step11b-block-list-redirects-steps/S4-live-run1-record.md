MANIFEST dnrWithHostAccess=true staticRuleSets=absent
ROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent
EXPR rules ok len=103
2026-10-27T00:35:30.675Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T00:35:32.955Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T00:35:33.696Z s9-win: CONSOLE rules submitted
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
ROW RD-CTL concurrent 302 in 3 ms, 302 in 3 ms (idle socket held open: yes)
ROW RD-CTL concurrent 302 in 4004 ms, 302 in 4004 ms (idle socket held open: yes)
CTL 8091 flip 200 then 302
HITS ctl redirect=0 blocked=1
ROW RD-CTL PASS: all controls hold
2026-10-27T00:35:47.949Z s9-win: LEG S11b open: my check window 26151064 - the only window carrying this call's marker (after 1050 ms), its address bar on the marker URL
2026-10-27T00:35:47.961Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T00:35:48.641Z s9-win: window 26151064 omnibox sent; the page reads a file: URL: True
2026-10-27T00:35:48.645Z s9-win: FILEWINDOW 26151064 opened <ROOT>\s11b-file.html
2026-10-27T00:35:50.919Z ROW F-FILETAB tabs ok tabs total=13 hidden(disarmed)=0 hidden(blocked)=2 withTitle=11 withUrl=11 url8081=0 (4 ms)
NOT MEASURED: no ROW line for step tabs in the call's output (nothing was read)
TABSHIDDEN F-FILETAB rows=13 hidden=2
ROW F-FILETAB tabs hidden row NOT MEASURED: 2 hidden rows, not exactly one
STOP: s9.ts call: FAILED — SET-UP: expected exactly 1 listTabs row hidden "blocked", found 2 (at 2026-10-27T00:35:51.720Z)
2026-10-27T00:35:51.757Z s9-win: WAVE stopping: an exception in block liveA (RuntimeException)
2026-10-27T00:35:52.417Z s9-win: worker console: 242 texts written to <PROFILE>\AppData\Local\Temp\bridge-e2e\s11b\console.txt (not printed; Console tab found: True)
2026-10-27T00:35:52.629Z s9-win: window 12258772 closed
2026-10-27T00:35:52.846Z s9-win: window 787754 closed
2026-10-27T00:35:53.063Z s9-win: window 10096182 closed
2026-10-27T00:35:53.278Z s9-win: window 6884888 closed
2026-10-27T00:35:53.497Z s9-win: window 26151064 closed
2026-10-27T00:35:53.674Z s9-win: stopped own process srv8083
2026-10-27T00:35:53.836Z s9-win: stopped own process srv8091
2026-10-27T00:35:54.001Z s9-win: stopped own process srv8087
2026-10-27T00:35:54.163Z s9-win: stopped own process srv8089
2026-10-27T00:35:54.323Z s9-win: stopped own process srv8086
2026-10-27T00:35:54.482Z s9-win: stopped own process srv8088
2026-10-27T00:35:54.637Z s9-win: stopped own process srv8085
2026-10-27T00:35:54.794Z s9-win: stopped own process srv8081
STOP: the wave ended (an exception in block liveA (RuntimeException)) (at 2026-10-27T00:35:54.797Z)
