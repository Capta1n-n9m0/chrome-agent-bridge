MANIFEST dnrWithHostAccess=true staticRuleSets=absent
ROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent
EXPR rules ok len=103
2026-10-27T02:08:11.530Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:08:13.830Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:08:14.564Z s9-win: CONSOLE rules submitted
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
ROW RD-CTL concurrent 302 in 16 ms, 302 in 12 ms (idle socket held open: yes)
ROW RD-CTL concurrent 302 in 3 ms, 302 in 3 ms (idle socket held open: yes)
ROW RD-CTL concurrent 302 in 3 ms, 302 in 3 ms (idle socket held open: yes)
ROW RD-CTL concurrent 302 in 4005 ms, 302 in 4003 ms (idle socket held open: yes)
CTL 8091 flip 200 then 302
HITS ctl redirect=0 blocked=1
ROW RD-CTL PASS: all controls hold
2026-10-27T02:08:28.037Z s9-win: window 11013686 closed
2026-10-27T02:08:28.044Z s9-win: F-FILETAB closed the wave's options window O before the file window (own page is hidden as blocked)
2026-10-27T02:08:29.125Z s9-win: LEG S11b open: my check window 7079528 - the only window carrying this call's marker (after 1043 ms), its address bar on the marker URL
2026-10-27T02:08:29.137Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:08:29.809Z s9-win: window 7079528 omnibox sent; the page reads a file: URL: True
2026-10-27T02:08:29.813Z s9-win: FILEWINDOW 7079528 opened <ROOT>\s11b-file.html
2026-10-27T02:08:32.072Z ROW F-FILETAB tabs ok tabs total=12 hidden(disarmed)=0 hidden(blocked)=1 withTitle=11 withUrl=11 url8081=0 (5 ms)
ROW F-FILETAB tabs PASS: exactly one tab is hidden as blocked
TABSHIDDEN F-FILETAB rows=12 hidden=1 reason=blocked url=no title=no
ROW F-FILETAB tabs hidden row PASS: the one hidden row is hidden=blocked with no url and no title
2026-10-27T02:08:32.867Z ROW F-FILETAB snap DOMAIN_BLOCKED This tab shows a local file (a file: page), which the bridge never reads or acts on. (2 ms)
ROW F-FILETAB snapshot PASS: F-FILETAB snapshot: exact
2026-10-27T02:08:33.352Z ROW F-FILETAB nav-after T2062 hidden=blocked
2026-10-27T02:08:33.355Z ROW F-FILETAB nav DOMAIN_BLOCKED This tab shows a local file (a file: page), which the bridge never reads or acts on. (2 ms)
ROW F-FILETAB navigate PASS: F-FILETAB navigate: exact
2026-10-27T02:08:33.835Z ROW F-FILETAB tabs2 ok tabs total=12 hidden(disarmed)=0 hidden(blocked)=1 withTitle=11 withUrl=11 url8081=0 (3 ms)
ROW F-FILETAB untouched PASS: exactly one tab is hidden as blocked
2026-10-27T02:08:34.393Z ROW F-FILETAB setup-ft ok T2063 tabs before=12 after=13 (56 ms)
2026-10-27T02:08:34.396Z CHECK F-FILETAB setup-ft PASS — ok
2026-10-27T02:08:34.681Z ROW F-FILETAB ctl-after T2063 url <non-fixture url withheld>
2026-10-27T02:08:34.684Z ROW F-FILETAB ctl DOMAIN_BLOCKED The bridge never opens local files (file: URLs). (2 ms)
ROW F-FILETAB control PASS: F-FILETAB control: exact
2026-10-27T02:08:35.181Z ROW F-FILETAB close-ft ok T2063 (17 ms)
2026-10-27T02:08:35.210Z s9-win: RECORD F-FILETAB tabCreated url-empty=NOT MEASURED (tab events reach the daemon only; no client call and no log line carries them)
2026-10-27T02:08:35.431Z s9-win: window 7079528 closed
2026-10-27T02:08:36.506Z s9-win: LEG S11 open: my check window 33557992 - the only window carrying this call's marker (after 1037 ms), its address bar on the marker URL
2026-10-27T02:08:36.508Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:08:37.177Z s9-win: window 33557992 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T02:08:37.550Z s9-win: BOX uploadfolders set (5 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T02:08:38.333Z s9-win: BOX uploadfolders set (0 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T02:08:38.751Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:08:39.418Z s9-win: window 33557992 now shows about:blank
2026-10-27T02:08:39.438Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:08:40.110Z s9-win: window 33557992 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T02:08:40.221Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T02:08:40.223Z s9-win: TYPED uploadfolders reverted; stored equal
ROW F-HOME PASS: summary and four K-opt-home items exact, the work line valid, nothing stored
2026-10-27T02:08:40.766Z s9-win: BOX blocklist set (2 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T02:08:41.227Z s9-win: CAPS items=1 by=id (texts withheld)
2026-10-27T02:08:41.516Z s9-win: BOX blocklist set (3 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T02:08:41.979Z s9-win: CAPS items=1 by=id (texts withheld)
2026-10-27T02:08:42.270Z s9-win: BOX blocklist set (0 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T02:08:42.690Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:08:43.369Z s9-win: window 33557992 now shows about:blank
2026-10-27T02:08:43.388Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:08:44.045Z s9-win: window 33557992 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T02:08:44.160Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T02:08:44.162Z s9-win: TYPED blocklist reverted; stored equal
ROW RD-CAPS-WARN PASS: exact K-caps items, nothing stored
EXPR regex ok len=659
2026-10-27T02:08:45.166Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:08:47.529Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:08:48.280Z s9-win: CONSOLE regex submitted
REGEX bank443-schemes supported=true len=59
REGEX bank443-explicit supported=true len=57
REGEX h119 supported=true len=119
REGEX h120 supported=true len=120
REGEX h121 supported=true len=121
