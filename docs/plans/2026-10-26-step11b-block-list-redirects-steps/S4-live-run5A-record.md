MANIFEST dnrWithHostAccess=true staticRuleSets=absent
ROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent
EXPR rules ok len=103
2026-10-27T01:47:05.751Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T01:47:08.064Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T01:47:08.794Z s9-win: CONSOLE rules submitted
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
2026-10-27T01:47:22.400Z s9-win: window 855870 closed
2026-10-27T01:47:22.406Z s9-win: F-FILETAB closed the wave's options window O before the file window (own page is hidden as blocked)
2026-10-27T01:47:23.495Z s9-win: LEG S11b open: my check window 5900766 - the only window carrying this call's marker (after 1045 ms), its address bar on the marker URL
2026-10-27T01:47:23.505Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T01:47:24.179Z s9-win: window 5900766 omnibox sent; the page reads a file: URL: True
2026-10-27T01:47:24.181Z s9-win: FILEWINDOW 5900766 opened <ROOT>\s11b-file.html
2026-10-27T01:47:26.448Z ROW F-FILETAB tabs ok tabs total=12 hidden(disarmed)=0 hidden(blocked)=1 withTitle=11 withUrl=11 url8081=0 (4 ms)
ROW F-FILETAB tabs PASS: exactly one tab is hidden as blocked
TABSHIDDEN F-FILETAB rows=12 hidden=1 reason=blocked url=no title=no
ROW F-FILETAB tabs hidden row PASS: the one hidden row is hidden=blocked with no url and no title
2026-10-27T01:47:27.248Z ROW F-FILETAB snap DOMAIN_BLOCKED This tab shows a local file (a file: page), which the bridge never reads or acts on. (2 ms)
ROW F-FILETAB snapshot PASS: F-FILETAB snapshot: exact
2026-10-27T01:47:27.738Z ROW F-FILETAB nav-after T1998 hidden=blocked
2026-10-27T01:47:27.741Z ROW F-FILETAB nav DOMAIN_BLOCKED This tab shows a local file (a file: page), which the bridge never reads or acts on. (2 ms)
ROW F-FILETAB navigate PASS: F-FILETAB navigate: exact
2026-10-27T01:47:28.219Z ROW F-FILETAB tabs2 ok tabs total=12 hidden(disarmed)=0 hidden(blocked)=1 withTitle=11 withUrl=11 url8081=0 (4 ms)
ROW F-FILETAB untouched PASS: exactly one tab is hidden as blocked
2026-10-27T01:47:28.767Z ROW F-FILETAB setup-ft ok T1999 tabs before=12 after=13 (61 ms)
2026-10-27T01:47:28.783Z CHECK F-FILETAB setup-ft PASS — ok
2026-10-27T01:47:29.070Z ROW F-FILETAB ctl-after T1999 url <non-fixture url withheld>
2026-10-27T01:47:29.072Z ROW F-FILETAB ctl DOMAIN_BLOCKED The bridge never opens local files (file: URLs). (3 ms)
ROW F-FILETAB control PASS: F-FILETAB control: exact
2026-10-27T01:47:29.573Z ROW F-FILETAB close-ft ok T1999 (17 ms)
2026-10-27T01:47:29.601Z s9-win: RECORD F-FILETAB tabCreated url-empty=NOT MEASURED (tab events reach the daemon only; no client call and no log line carries them)
2026-10-27T01:47:29.819Z s9-win: window 5900766 closed
2026-10-27T01:47:30.898Z s9-win: LEG S11 open: my check window 1118014 - the only window carrying this call's marker (after 1041 ms), its address bar on the marker URL
2026-10-27T01:47:30.900Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T01:47:31.561Z s9-win: window 1118014 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T01:47:31.933Z s9-win: BOX uploadfolders set (5 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T01:47:32.699Z s9-win: BOX uploadfolders set (0 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T01:47:33.108Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T01:47:33.771Z s9-win: window 1118014 now shows about:blank
2026-10-27T01:47:33.791Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T01:47:34.459Z s9-win: window 1118014 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T01:47:34.575Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T01:47:34.577Z s9-win: TYPED uploadfolders reverted; stored equal
ROW F-HOME PASS: summary and four K-opt-home items exact, the work line valid, nothing stored
2026-10-27T01:47:35.116Z s9-win: BOX blocklist set (2 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T01:47:35.580Z s9-win: CAPS items=1 by=id (texts withheld)
2026-10-27T01:47:35.867Z s9-win: BOX blocklist set (3 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T01:47:36.323Z s9-win: CAPS items=1 by=id (texts withheld)
2026-10-27T01:47:36.615Z s9-win: BOX blocklist set (0 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T01:47:37.029Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T01:47:37.704Z s9-win: window 1118014 now shows about:blank
2026-10-27T01:47:37.723Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T01:47:38.394Z s9-win: window 1118014 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T01:47:38.505Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T01:47:38.507Z s9-win: TYPED blocklist reverted; stored equal
ROW RD-CAPS-WARN PASS: exact K-caps items, nothing stored
EXPR regex ok len=659
2026-10-27T01:47:39.524Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T01:47:41.874Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T01:47:42.596Z s9-win: CONSOLE regex submitted
REGEX bank443-schemes supported=true len=59
REGEX bank443-explicit supported=true len=57
REGEX h119 supported=true len=119
REGEX h120 supported=true len=120
REGEX h121 supported=true len=121
