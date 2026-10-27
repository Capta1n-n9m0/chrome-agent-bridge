MANIFEST dnrWithHostAccess=true staticRuleSets=absent
ROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent
EXPR rules ok len=103
2026-10-27T01:09:09.639Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T01:09:11.931Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T01:09:12.666Z s9-win: CONSOLE rules submitted
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
ROW RD-CTL concurrent 302 in 3 ms, 302 in 3 ms (idle socket held open: yes)
ROW RD-CTL concurrent 302 in 3 ms, 302 in 3 ms (idle socket held open: yes)
ROW RD-CTL concurrent 302 in 4003 ms, 302 in 4004 ms (idle socket held open: yes)
CTL 8091 flip 200 then 302
HITS ctl redirect=0 blocked=1
ROW RD-CTL PASS: all controls hold
2026-10-27T01:09:26.119Z s9-win: window 16845346 closed
2026-10-27T01:09:26.126Z s9-win: F-FILETAB closed the wave's options window O before the file window (own page is hidden as blocked)
2026-10-27T01:09:27.214Z s9-win: LEG S11b open: my check window 1380150 - the only window carrying this call's marker (after 1048 ms), its address bar on the marker URL
2026-10-27T01:09:27.224Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T01:09:27.902Z s9-win: window 1380150 omnibox sent; the page reads a file: URL: True
2026-10-27T01:09:27.904Z s9-win: FILEWINDOW 1380150 opened <ROOT>\s11b-file.html
2026-10-27T01:09:30.170Z ROW F-FILETAB tabs ok tabs total=12 hidden(disarmed)=0 hidden(blocked)=1 withTitle=11 withUrl=11 url8081=0 (3 ms)
ROW F-FILETAB tabs PASS: exactly one tab is hidden as blocked
TABSHIDDEN F-FILETAB rows=12 hidden=1 reason=blocked url=no title=no
ROW F-FILETAB tabs hidden row PASS: the one hidden row is hidden=blocked with no url and no title
2026-10-27T01:09:30.968Z ROW F-FILETAB snap DOMAIN_BLOCKED This tab shows a local file (a file: page), which the bridge never reads or acts on. (2 ms)
ROW F-FILETAB snapshot PASS: F-FILETAB snapshot: exact
2026-10-27T01:09:31.462Z ROW F-FILETAB nav-after T1935 hidden=blocked
2026-10-27T01:09:31.464Z ROW F-FILETAB nav DOMAIN_BLOCKED This tab shows a local file (a file: page), which the bridge never reads or acts on. (3 ms)
ROW F-FILETAB navigate PASS: F-FILETAB navigate: exact
2026-10-27T01:09:31.943Z ROW F-FILETAB tabs2 ok tabs total=12 hidden(disarmed)=0 hidden(blocked)=1 withTitle=11 withUrl=11 url8081=0 (4 ms)
ROW F-FILETAB untouched PASS: exactly one tab is hidden as blocked
2026-10-27T01:09:32.494Z ROW F-FILETAB setup-ft ok T1936 tabs before=12 after=13 (56 ms)
2026-10-27T01:09:32.497Z CHECK F-FILETAB setup-ft PASS — ok
2026-10-27T01:09:32.788Z ROW F-FILETAB ctl-after T1936 url <non-fixture url withheld>
2026-10-27T01:09:32.790Z ROW F-FILETAB ctl DOMAIN_BLOCKED The bridge never opens local files (file: URLs). (3 ms)
ROW F-FILETAB control PASS: F-FILETAB control: exact
2026-10-27T01:09:33.290Z ROW F-FILETAB close-ft ok T1936 (17 ms)
2026-10-27T01:09:33.318Z s9-win: RECORD F-FILETAB tabCreated url-empty=NOT MEASURED (tab events reach the daemon only; no client call and no log line carries them)
2026-10-27T01:09:33.538Z s9-win: window 1380150 closed
2026-10-27T01:09:34.649Z s9-win: LEG S11 open: my check window 17107490 - the only window carrying this call's marker (after 1065 ms), its address bar on the marker URL
2026-10-27T01:09:34.651Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T01:09:35.330Z s9-win: window 17107490 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T01:09:35.721Z s9-win: BOX uploadfolders set (5 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T01:09:36.501Z s9-win: BOX uploadfolders set (0 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T01:09:36.926Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T01:09:37.605Z s9-win: window 17107490 now shows about:blank
2026-10-27T01:09:37.625Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T01:09:38.281Z s9-win: window 17107490 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T01:09:38.393Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T01:09:38.396Z s9-win: TYPED uploadfolders reverted; stored equal
ROW F-HOME PASS: summary and four K-opt-home items exact, the work line valid, nothing stored
2026-10-27T01:09:38.951Z s9-win: BOX blocklist set (2 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T01:09:39.410Z s9-win: WAVE stopping: an exception in block liveA (RuntimeException)
2026-10-27T01:09:40.067Z s9-win: worker console: 224 texts written to <PROFILE>\AppData\Local\Temp\bridge-e2e\s11b\console.txt (not printed; Console tab found: True)
2026-10-27T01:09:40.285Z s9-win: window 1772886 closed
2026-10-27T01:09:40.499Z s9-win: window 854232 closed
2026-10-27T01:09:40.718Z s9-win: window 17107490 closed
2026-10-27T01:09:40.937Z s9-win: window 29888148 closed
2026-10-27T01:09:41.111Z s9-win: stopped own process srv8083
2026-10-27T01:09:41.271Z s9-win: stopped own process srv8091
2026-10-27T01:09:41.426Z s9-win: stopped own process srv8087
2026-10-27T01:09:41.581Z s9-win: stopped own process srv8089
2026-10-27T01:09:41.732Z s9-win: stopped own process srv8086
2026-10-27T01:09:41.880Z s9-win: stopped own process srv8088
2026-10-27T01:09:42.035Z s9-win: stopped own process srv8085
2026-10-27T01:09:42.189Z s9-win: stopped own process srv8081
STOP: the wave ended (an exception in block liveA (RuntimeException)) (at 2026-10-27T01:09:42.191Z)
