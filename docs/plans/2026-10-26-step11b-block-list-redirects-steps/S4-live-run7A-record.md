MANIFEST dnrWithHostAccess=true staticRuleSets=absent
ROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent
EXPR rules ok len=103
2026-10-27T02:31:46.034Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:31:48.329Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:31:49.049Z s9-win: CONSOLE rules submitted
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
2026-10-27T02:32:02.537Z s9-win: window 22217294 closed
2026-10-27T02:32:02.545Z s9-win: F-FILETAB closed the wave's options window O before the file window (own page is hidden as blocked)
2026-10-27T02:32:03.639Z s9-win: LEG S11b open: my check window 3738514 - the only window carrying this call's marker (after 1050 ms), its address bar on the marker URL
2026-10-27T02:32:03.650Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:32:04.332Z s9-win: window 3738514 omnibox sent; the page reads a file: URL: True
2026-10-27T02:32:04.334Z s9-win: FILEWINDOW 3738514 opened <ROOT>\s11b-file.html
2026-10-27T02:32:06.605Z ROW F-FILETAB tabs ok tabs total=12 hidden(disarmed)=0 hidden(blocked)=1 withTitle=11 withUrl=11 url8081=0 (4 ms)
ROW F-FILETAB tabs PASS: exactly one tab is hidden as blocked
TABSHIDDEN F-FILETAB rows=12 hidden=1 reason=blocked url=no title=no
ROW F-FILETAB tabs hidden row PASS: the one hidden row is hidden=blocked with no url and no title
2026-10-27T02:32:07.405Z ROW F-FILETAB snap DOMAIN_BLOCKED This tab shows a local file (a file: page), which the bridge never reads or acts on. (2 ms)
ROW F-FILETAB snapshot PASS: F-FILETAB snapshot: exact
2026-10-27T02:32:07.887Z ROW F-FILETAB nav-after T2126 hidden=blocked
2026-10-27T02:32:07.889Z ROW F-FILETAB nav DOMAIN_BLOCKED This tab shows a local file (a file: page), which the bridge never reads or acts on. (2 ms)
ROW F-FILETAB navigate PASS: F-FILETAB navigate: exact
2026-10-27T02:32:08.373Z ROW F-FILETAB tabs2 ok tabs total=12 hidden(disarmed)=0 hidden(blocked)=1 withTitle=11 withUrl=11 url8081=0 (3 ms)
ROW F-FILETAB untouched PASS: exactly one tab is hidden as blocked
2026-10-27T02:32:08.923Z ROW F-FILETAB setup-ft ok T2127 tabs before=12 after=13 (58 ms)
2026-10-27T02:32:08.926Z CHECK F-FILETAB setup-ft PASS — ok
2026-10-27T02:32:09.212Z ROW F-FILETAB ctl-after T2127 url <non-fixture url withheld>
2026-10-27T02:32:09.214Z ROW F-FILETAB ctl DOMAIN_BLOCKED The bridge never opens local files (file: URLs). (3 ms)
ROW F-FILETAB control PASS: F-FILETAB control: exact
2026-10-27T02:32:09.711Z ROW F-FILETAB close-ft ok T2127 (21 ms)
2026-10-27T02:32:09.742Z s9-win: RECORD F-FILETAB tabCreated url-empty=NOT MEASURED (tab events reach the daemon only; no client call and no log line carries them)
2026-10-27T02:32:09.967Z s9-win: window 3738514 closed
2026-10-27T02:32:11.062Z s9-win: LEG S11 open: my check window 22479438 - the only window carrying this call's marker (after 1046 ms), its address bar on the marker URL
2026-10-27T02:32:11.064Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:32:11.729Z s9-win: window 22479438 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T02:32:12.120Z s9-win: BOX uploadfolders set (5 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T02:32:12.884Z s9-win: BOX uploadfolders set (0 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T02:32:13.308Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:32:13.970Z s9-win: window 22479438 now shows about:blank
2026-10-27T02:32:13.989Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:32:14.662Z s9-win: window 22479438 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T02:32:14.772Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T02:32:14.774Z s9-win: TYPED uploadfolders reverted; stored equal
ROW F-HOME PASS: summary and four K-opt-home items exact, the work line valid, nothing stored
2026-10-27T02:32:15.318Z s9-win: BOX blocklist set (2 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T02:32:15.780Z s9-win: CAPS items=1 by=id (texts withheld)
2026-10-27T02:32:16.067Z s9-win: BOX blocklist set (3 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T02:32:16.529Z s9-win: CAPS items=1 by=id (texts withheld)
2026-10-27T02:32:16.818Z s9-win: BOX blocklist set (0 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T02:32:17.227Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:32:17.904Z s9-win: window 22479438 now shows about:blank
2026-10-27T02:32:17.922Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:32:18.595Z s9-win: window 22479438 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T02:32:18.707Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T02:32:18.709Z s9-win: TYPED blocklist reverted; stored equal
ROW RD-CAPS-WARN PASS: exact K-caps items, nothing stored
EXPR regex ok len=659
2026-10-27T02:32:19.713Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:32:22.048Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:32:22.767Z s9-win: CONSOLE regex submitted
REGEX bank443-schemes supported=true len=59
REGEX bank443-explicit supported=true len=57
REGEX h119 supported=true len=119
REGEX h120 supported=true len=120
REGEX h121 supported=true len=121
2026-10-27T02:32:28.606Z ROW RD-1 setup-r1 ok T2131 tabs before=14 after=15 (58 ms)
2026-10-27T02:32:28.609Z CHECK RD-1 setup-r1 PASS — ok
2026-10-27T02:32:28.990Z ROW RD-1 nav-after T2131 hidden=blocked
2026-10-27T02:32:28.993Z ROW RD-1 nav DOMAIN_BLOCKED This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user. (94 ms)
2026-10-27T02:32:28.994Z CHECK RD-1 nav PASS — DOMAIN_BLOCKED, exact message, no data
LAT RD-1 94 ms
2026-10-27T02:32:31.508Z ROW RD-1 tabs ok tabs total=15 hidden(disarmed)=0 hidden(blocked)=2 withTitle=13 withUrl=13 url8081=1 (4 ms)
2026-10-27T02:32:31.785Z ROW RD-1 snap DOMAIN_BLOCKED This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user. (3 ms)
HITS rd1 redirect=1 blocked=0
EXPR rules ok len=103
2026-10-27T02:32:32.899Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:32:35.457Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:32:36.182Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
2026-10-27T02:32:37.885Z ROW RD-1 close-r1 DOMAIN_BLOCKED This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user. (3 ms)
EXPR rules ok len=103
2026-10-27T02:32:38.811Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:32:41.342Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:32:42.069Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
2026-10-27T02:32:44.606Z s9-win: LEG S11b open: my check window 11472438 - the only window carrying this call's marker (after 1039 ms), its address bar on the marker URL
2026-10-27T02:32:44.608Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:33:00.227Z s9-win: window 11472438 did NOT reach http://localhost:8083/e2e-playground.html?s11b=rd6 within 15 s
2026-10-27T02:33:03.243Z s9-win: RD6 url=fixture-8085
2026-10-27T02:33:03.468Z s9-win: window 11472438 closed
HITS rd6 redirect=1 blocked=1
EXPR rules ok len=103
2026-10-27T02:33:04.594Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:33:07.225Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:33:07.970Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
2026-10-27T02:33:09.831Z ROW RD-2 open ok T2133 tabs before=15 after=16 (64 ms)
2026-10-27T02:33:12.115Z ROW RD-2 tabs ok tabs total=16 hidden(disarmed)=0 hidden(blocked)=3 withTitle=13 withUrl=13 url8081=1 (4 ms)
2026-10-27T02:33:12.387Z ROW RD-2 snap DOMAIN_BLOCKED This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user. (3 ms)
HITS rd2 redirect=1 blocked=1
2026-10-27T02:33:12.880Z ROW RD-2 close-r2 DOMAIN_BLOCKED This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user. (3 ms)
2026-10-27T02:33:13.186Z ROW RD-3 dl DOMAIN_BLOCKED That address is on the user's block list in Chrome; the bridge will not open or fetch it. Ask the user. (10 ms)
2026-10-27T02:33:13.189Z CHECK RD-3 dl PASS — DOMAIN_BLOCKED, exact message, no data
2026-10-27T02:33:13.190Z ROW RD-3 dl-file hello-rd3.txt exists=no part=no
2026-10-27T02:33:13.191Z CHECK RD-3 dl-file PASS — no file written
LAT RD-3 10 ms
EXPR rules ok len=103
2026-10-27T02:33:14.352Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:33:17.042Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:33:17.771Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
2026-10-27T02:33:19.552Z ROW RD-3 dl-ctl DOMAIN_BLOCKED That address is on the user's block list in Chrome; the bridge will not open or fetch it. Ask the user. (3 ms)
2026-10-27T02:33:19.554Z CHECK RD-3 dl-ctl PASS — DOMAIN_BLOCKED, exact message, no data
2026-10-27T02:33:19.555Z ROW RD-3 dl-ctl-file hello-rd3c.txt exists=no part=no
2026-10-27T02:33:19.556Z CHECK RD-3 dl-ctl-file PASS — no file written
HITS rd3 redirect=1 blocked=0
HITS rd3c redirect=0 blocked=0
EXPR rules ok len=103
2026-10-27T02:33:22.949Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:33:25.591Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:33:26.322Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
2026-10-27T02:33:28.429Z ROW RD-DL-ERR e1 INTERNAL Failed to fetch (314 ms)
2026-10-27T02:33:28.431Z ROW RD-DL-ERR e1-file x.txt exists=no part=no
EXPR rules ok len=103
2026-10-27T02:33:29.407Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:33:32.106Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:33:32.851Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
LAT RD-DL-ERR-1 314 ms
ROW RD-DL-ERR-1 PASS: K-fetch
2026-10-27T02:33:35.173Z ROW RD-DL-ERR e2 INTERNAL Failed to fetch (312 ms)
2026-10-27T02:33:35.175Z ROW RD-DL-ERR e2-file x.txt exists=no part=no
EXPR rules ok len=103
2026-10-27T02:33:36.151Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:33:38.875Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:33:39.606Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
LAT RD-DL-ERR-2 312 ms
ROW RD-DL-ERR-2 PASS: K-fetch
2026-10-27T02:33:41.938Z ROW RD-DL-ERR e3 INTERNAL Failed to fetch (312 ms)
2026-10-27T02:33:41.940Z ROW RD-DL-ERR e3-file x.txt exists=no part=no
EXPR rules ok len=103
2026-10-27T02:33:42.951Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:33:45.737Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:33:46.487Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
LAT RD-DL-ERR-3 312 ms
ROW RD-DL-ERR-3 PASS: K-fetch
2026-10-27T02:33:48.567Z ROW RD-DL-HOP h1 DOMAIN_BLOCKED That address is on the user's block list in Chrome; the bridge will not open or fetch it. Ask the user. (9 ms)
2026-10-27T02:33:48.569Z ROW RD-DL-HOP h1-file hop1.txt exists=no part=no
HITS dlhop1 redirect=1 blocked=0
EXPR rules ok len=103
2026-10-27T02:33:49.794Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:33:52.607Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:33:53.339Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
LAT RD-DL-HOP-1 9 ms
ROW RD-DL-HOP-1 PASS: K-url, no file, blocked=0
2026-10-27T02:33:55.393Z ROW RD-DL-HOP h2 DOMAIN_BLOCKED That address is on the user's block list in Chrome; the bridge will not open or fetch it. Ask the user. (9 ms)
2026-10-27T02:33:55.395Z ROW RD-DL-HOP h2-file hop2.txt exists=no part=no
HITS dlhop2 redirect=1 blocked=0
EXPR rules ok len=103
2026-10-27T02:33:56.652Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:33:59.492Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:34:00.238Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
LAT RD-DL-HOP-2 9 ms
ROW RD-DL-HOP-2 PASS: K-url, no file, blocked=0
2026-10-27T02:34:02.331Z ROW RD-DL-HOP h3 DOMAIN_BLOCKED That address is on the user's block list in Chrome; the bridge will not open or fetch it. Ask the user. (9 ms)
2026-10-27T02:34:02.333Z ROW RD-DL-HOP h3-file hop3.txt exists=no part=no
HITS dlhop3 redirect=1 blocked=0
EXPR rules ok len=103
2026-10-27T02:34:03.603Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:34:06.493Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:34:07.239Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
LAT RD-DL-HOP-3 9 ms
ROW RD-DL-HOP-3 PASS: K-url, no file, blocked=0
RECORD RD-DL-HOP hop=9,9,9 err=314,312,312 rd3=10 d=-303 ms reading=the event was in hand at the rejection
EXPR rules ok len=103
2026-10-27T02:34:10.378Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:34:13.287Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:34:14.022Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
2026-10-27T02:34:16.008Z ROW RD-7 setup-r7 ok T2134 tabs before=16 after=17 (64 ms)
2026-10-27T02:34:16.011Z CHECK RD-7 setup-r7 PASS — ok
2026-10-27T02:34:16.334Z ROW RD-7 nav-after T2134 hidden=blocked
2026-10-27T02:34:16.336Z ROW RD-7 nav DOMAIN_BLOCKED This tab shows one of the bridge extension's own pages, which the bridge never reads or acts on. (39 ms)
EXPR rules ok len=103
2026-10-27T02:34:17.442Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:34:20.423Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:34:21.172Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
2026-10-27T02:34:25.131Z ROW RD-7 tabs ok tabs total=17 hidden(disarmed)=0 hidden(blocked)=4 withTitle=13 withUrl=13 url8081=1 (4 ms)
HITS rd7 redirect=1
EXPR ctx ok len=384
2026-10-27T02:34:26.468Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:34:29.455Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:34:30.217Z s9-win: CONSOLE ctx submitted
CTX r7 tabs=1
CTX r7 count=0
2026-10-27T02:34:31.960Z s9-win: RD-7 UIA read of the options heading NOT MEASURED: no wave window shows the tab, so the second proof of rendering cannot be read (the console CTX is the stopper)
2026-10-27T02:34:32.208Z ROW RD-7 close-r7 DOMAIN_BLOCKED This tab shows one of the bridge extension's own pages, which the bridge never reads or acts on. (2 ms)
2026-10-27T02:34:32.587Z ROW RD-8 setup-r8 ok T2135 tabs before=17 after=18 (60 ms)
2026-10-27T02:34:32.590Z CHECK RD-8 setup-r8 PASS — ok
2026-10-27T02:34:32.931Z ROW RD-8 nav ok T2135 url <non-fixture url withheld> (41 ms)
EXPR rules ok len=103
2026-10-27T02:34:34.108Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:34:37.184Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:34:37.907Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
2026-10-27T02:34:41.917Z ROW RD-8 tabs ok tabs total=18 hidden(disarmed)=0 hidden(blocked)=4 withTitle=14 withUrl=14 url8081=1 (3 ms)
2026-10-27T02:34:42.195Z ROW RD-8 snap INTERNAL Could not inject into the target tab — it may be a restricted URL (<non-fixture url withheld> the New Tab page, or the Chrome Web Store) where extensions can't run. (Frame with ID 0 is showing error page) (5 ms)
HITS rd8 redirect=1
2026-10-27T02:34:42.695Z ROW RD-8 close-r8 ok T2135 (12 ms)
LAT RD-BACK 6 ms
ANSWER RD-BACK INTERNAL <message len=35>
HISTREPLY RD-BACK kind=INTERNAL ms=6 start=1793068483039 reply=1793068483045
RECORD RD-BACK answer=INTERNAL reply-ms=6 status-after=NOT MEASURED (the SDK exposes no tab status)
HITS bk blocked=0
FLIP bk n200=1 n302=0 total=1
EXPR rules ok len=103
2026-10-27T02:34:44.468Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:34:47.575Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:34:48.323Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
ROW RD-BACK FAIL: answer INTERNAL is neither ok nor K-tab
2026-10-27T02:34:50.282Z s9-win: ROW RD-FWD NOT MEASURED: its history set-up was not built (see HISTORY fwd set-up NOT BUILT)
2026-10-27T02:34:50.626Z ROW RD-BACK-SAMEDOC setup-hs ok T2136 tabs before=17 after=18 (60 ms)
2026-10-27T02:34:50.629Z CHECK RD-BACK-SAMEDOC setup-hs PASS — ok
HISTORY samedoc built navigations=2 backs=0
LAT RD-BACK-SAMEDOC 6 ms
ANSWER RD-BACK-SAMEDOC INTERNAL <message len=35>
HISTREPLY RD-BACK-SAMEDOC kind=INTERNAL ms=6 start=1793068491319 reply=1793068491325
RECORD RD-BACK-SAMEDOC answer=INTERNAL reply-ms=6 status-after=NOT MEASURED (the SDK exposes no tab status)
EXPR rules ok len=103
2026-10-27T02:34:52.521Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:34:55.613Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:34:56.354Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
ROW RD-BACK-SAMEDOC FAIL: answer INTERNAL, not ok
2026-10-27T02:34:58.593Z ROW RD-BACK-SAMEDOC close-hs ok T2136 (16 ms)
2026-10-27T02:34:58.983Z ROW RD-REBUILD-NARROW setup-rn ok T2137 tabs before=17 after=18 (59 ms)
2026-10-27T02:34:58.985Z CHECK RD-REBUILD-NARROW setup-rn PASS — ok
EXPR rules ok len=262
2026-10-27T02:35:00.187Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:35:03.290Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:35:04.021Z s9-win: CONSOLE rules submitted
2026-10-27T02:35:04.343Z s9-win: READY seen for RD-REBUILD-NARROW
2026-10-27T02:35:05.743Z s9-win: SWITCH evaluate -> false at 2026-10-27T02:35:05.419Z (now false)
2026-10-27T02:35:06.262Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:35:06.941Z s9-win: window 22479438 now shows about:blank
2026-10-27T02:35:06.966Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:35:07.635Z s9-win: window 22479438 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T02:35:07.757Z s9-win: STATE armed=true evaluate=false blocklist lines=1 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T02:35:07.759Z s9-win: FLAG evaluate read back equal
2026-10-27T02:35:08.119Z s9-win: SWITCH evaluate -> true at 2026-10-27T02:35:07.800Z (now true)
2026-10-27T02:35:08.629Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:35:09.323Z s9-win: window 22479438 now shows about:blank
2026-10-27T02:35:09.344Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:35:10.001Z s9-win: window 22479438 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T02:35:10.117Z s9-win: STATE armed=true evaluate=true blocklist lines=1 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T02:35:10.119Z s9-win: FLAG evaluate read back equal
CALLT RD-REBUILD-NARROW start=1793068504307 reply=1793068507433
LAT RD-REBUILD-NARROW 3126 ms
ANSWER RD-REBUILD-NARROW ok
CHECK RD-REBUILD-NARROW PASS: RD-REBUILD-NARROW: ok
RULES samples=[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] min=1 max=1
RULES after=0
ROW RD-REBUILD-NARROW rules-inflight PASS: in flight min=1, 0 after
EXPR rules ok len=103
2026-10-27T02:35:16.535Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:35:19.674Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:35:20.407Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
2026-10-27T02:35:22.390Z ROW RD-REBUILD-NARROW close-rn ok T2137 (15 ms)
2026-10-27T02:35:22.422Z s9-win: ROW RD-REBUILD-NARROW PASS (by 2 clause checks)
2026-10-27T02:35:22.781Z ROW RD-DISARM setup-rdd ok T2138 tabs before=17 after=18 (61 ms)
2026-10-27T02:35:22.783Z CHECK RD-DISARM setup-rdd PASS — ok
2026-10-27T02:35:22.865Z s9-win: toolbar buttons named 'Chrome Agent Bridge…': 1 after 46 ms (window 1936 px) -> pinned=true
2026-10-27T02:35:22.934Z s9-win: ACTION name "Chrome Agent Bridge — armed (click to turn off)" (+1 further line(s) not shown) class 'ToolbarActionView'
RULES expect=1
EXPR rules ok len=262
2026-10-27T02:35:24.270Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:35:27.261Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:35:27.984Z s9-win: CONSOLE rules submitted
2026-10-27T02:35:28.283Z s9-win: READY seen for RD-DISARM
2026-10-27T02:35:29.342Z s9-win: PARK cursor at (4,181) in W's page area (before the click guards)
2026-10-27T02:35:29.760Z s9-win: CLICK 'Chrome Agent Bridge — armed (click to turn off)' at (1771,63)
2026-10-27T02:35:29.762Z s9-win: PARK cursor at (4,181) in W's page area (after the click)
2026-10-27T02:35:29.764Z s9-win: PRESS button 1/1 at 2026-10-27T02:35:29.764Z
2026-10-27T02:35:29.827Z s9-win: TITLE ok after 53 ms: "Chrome Agent Bridge — OFF: agents are refused (click to turn on)"
2026-10-27T02:35:30.943Z s9-win: PARK cursor at (4,181) in W's page area (before the click guards)
2026-10-27T02:35:31.026Z s9-win: CLICK 'Chrome Agent Bridge — OFF: agents are refused (click to turn on)' at (1771,63)
2026-10-27T02:35:31.030Z s9-win: PARK cursor at (4,181) in W's page area (after the click)
2026-10-27T02:35:31.032Z s9-win: PRESS button 1/1 at 2026-10-27T02:35:31.032Z
2026-10-27T02:35:31.087Z s9-win: TITLE ok after 54 ms: "Chrome Agent Bridge — armed (click to turn off)"
2026-10-27T02:35:31.139Z s9-win: ACTION name "Chrome Agent Bridge — armed (click to turn off)" (+1 further line(s) not shown) class 'ToolbarActionView'
CALLT RD-DISARM start=1793068528272 reply=1793068532307
LAT RD-DISARM 4035 ms
ANSWER RD-DISARM DOMAIN_BLOCKED "This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user."
CHECK RD-DISARM FAIL: RD-DISARM: code DOMAIN_BLOCKED, want DISARMED
RULES samples=[1,1,1,1] min=1 max=1
RULES after=0
ROW RD-DISARM rules-at PASS: sample = 1, then 0
2026-10-27T02:35:44.518Z ROW RD-DISARM wait-safety NOT reached safety armed=true evaluate=true blockedCount=1 after 5065 ms (wanted {"armed":true,"evaluate":true,"blockedCount":0})
HITS rdd redirect=1 blocked=0
2026-10-27T02:35:45.002Z ROW RD-DISARM close-rdd DOMAIN_BLOCKED This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user. (3 ms)
2026-10-27T02:35:45.030Z s9-win: ROW RD-DISARM FAIL (by 4 clause checks)
2026-10-27T02:35:54.494Z ROW RD-4 setup-r4 ok T2139 tabs before=18 after=19 (59 ms)
2026-10-27T02:35:54.497Z CHECK RD-4 setup-r4 PASS — ok
2026-10-27T02:35:54.854Z ROW RD-4 nav ok T2139 url <non-fixture url withheld> (63 ms)
2026-10-27T02:35:54.856Z CHECK RD-4 nav PASS — ok
HITS rd4 redirect=1 blocked=1
EXPR rules ok len=103
2026-10-27T02:35:58.264Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:36:01.303Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:36:02.024Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
2026-10-27T02:36:04.022Z ROW RD-4 close-r4 ok T2139 (23 ms)
2026-10-27T02:36:04.423Z ROW RD-5 setup-r5 ok T2140 tabs before=18 after=19 (61 ms)
2026-10-27T02:36:04.425Z CHECK RD-5 setup-r5 PASS — ok
2026-10-27T02:36:05.634Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:36:08.698Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:36:09.438Z s9-win: CONSOLE stored submitted
2026-10-27T02:36:09.735Z s9-win: READY seen for RD-5
2026-10-27T02:36:10.652Z s9-win: BOX blocklist set (1 non-blank line(s); saved; text withheld)
EXPR stored ok len=437
STORED match=yes lines=1
STOREDAT 1793068570094
CALLT RD-5 start=1793068570106 reply=1793068570145
LAT RD-5 38 ms
ANSWER RD-5 DOMAIN_BLOCKED "This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user."
CHECK RD-5 PASS: RD-5: exact
GAP 369 ms
ROW RD-5 gap PASS: GAP 369 ms, call after the read-back
HITS rd5 redirect=1 blocked=0
2026-10-27T02:36:31.518Z s9-win: BOX blocklist set (0 non-blank line(s); saved; text withheld)
2026-10-27T02:36:31.526Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:36:32.193Z s9-win: window 22479438 now shows about:blank
2026-10-27T02:36:32.215Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:36:32.884Z s9-win: window 22479438 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T02:36:33.002Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T02:36:33.005Z s9-win: RESTORE blocklist lines=0 hash=equal
EXPR rules ok len=103
2026-10-27T02:36:34.195Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:36:37.333Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:36:38.058Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
2026-10-27T02:36:40.074Z ROW RD-5 close-r5 ok T2140 (13 ms)
2026-10-27T02:36:40.104Z s9-win: ROW RD-5 PASS (by 4 clause checks)
2026-10-27T02:36:40.483Z ROW RD-5b setup-r5b ok T2141 tabs before=18 after=19 (84 ms)
2026-10-27T02:36:40.485Z CHECK RD-5b setup-r5b PASS — ok
RULES expect=1
EXPR rules ok len=262
2026-10-27T02:36:41.921Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:36:45.051Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:36:45.789Z s9-win: CONSOLE rules submitted
2026-10-27T02:36:46.094Z s9-win: READY seen for RD-5b
2026-10-27T02:36:48.041Z s9-win: BOX blocklist set (1 non-blank line(s); saved; text withheld)
CALLT RD-5b start=1793068606072 reply=1793068610107
LAT RD-5b 4035 ms
ANSWER RD-5b DOMAIN_BLOCKED "This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user."
CHECK RD-5b PASS: RD-5b: exact
RULES samples=[1,1,1,1] min=1 max=1
RULES after=0
ROW RD-5b rules-at PASS: sample = 1, then 0
2026-10-27T02:36:58.157Z s9-win: BOX blocklist set (1 non-blank line(s); saved; text withheld)
2026-10-27T02:36:58.167Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:36:58.842Z s9-win: window 22479438 now shows about:blank
2026-10-27T02:36:58.862Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:36:59.516Z s9-win: window 22479438 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T02:36:59.636Z s9-win: STATE armed=true evaluate=true blocklist lines=1 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T02:36:59.638Z s9-win: RESTORE blocklist lines=1 hash=equal
2026-10-27T02:37:00.560Z s9-win: BOX blocklist set (0 non-blank line(s); saved; text withheld)
2026-10-27T02:37:00.568Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:37:01.243Z s9-win: window 22479438 now shows about:blank
2026-10-27T02:37:01.265Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:37:01.933Z s9-win: window 22479438 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T02:37:02.056Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T02:37:02.058Z s9-win: RESTORE blocklist lines=0 hash=equal
HITS rd5b redirect=1 blocked=0
EXPR rules ok len=103
2026-10-27T02:37:03.488Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:37:06.683Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:37:07.422Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
2026-10-27T02:37:09.476Z ROW RD-5b close-r5b ok T2141 (14 ms)
2026-10-27T02:37:09.506Z s9-win: ROW RD-5b PASS (by 3 clause checks)
2026-10-27T02:37:09.861Z ROW RD-BACK-EMPTY setup-he ok T2142 tabs before=18 after=19 (63 ms)
2026-10-27T02:37:09.863Z CHECK RD-BACK-EMPTY setup-he PASS — ok
HISTORY empty built navigations=2 backs=0
EXPR rules ok len=262
2026-10-27T02:37:11.500Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:37:14.689Z s9-win: PARK cursor at (4,181) in W's page area (console prompt)
2026-10-27T02:37:15.437Z s9-win: CONSOLE rules submitted
LAT RD-BACK-EMPTY 5 ms
ANSWER RD-BACK-EMPTY INTERNAL <message len=35>
HISTREPLY RD-BACK-EMPTY kind=INTERNAL ms=5 start=1793068635715 reply=1793068635720
RECORD RD-BACK-EMPTY answer=INTERNAL reply-ms=5 status-after=NOT MEASURED (the SDK exposes no tab status)
ROW RD-BACK-EMPTY STOP: answer INTERNAL, not ok: a call on a page with no redirect answers differently
STOP: RD-BACK-EMPTY: answer INTERNAL, not ok: a call on a page with no redirect answers differently
2026-10-27T02:37:16.009Z s9-win: WAVE stopping: an exception in block liveA (RuntimeException: node s11b judge-history ended in a STOP)
2026-10-27T02:37:16.072Z s9-win: toolbar buttons named 'Chrome Agent Bridge…': 1 after 37 ms (window 1936 px) -> pinned=true
2026-10-27T02:37:16.116Z s9-win: ACTION name "Chrome Agent Bridge — armed (click to turn off)" (+1 further line(s) not shown) class 'ToolbarActionView'
2026-10-27T02:37:16.162Z s9-win: PARK cursor at (4,181) in W's page area (before the click guards)
2026-10-27T02:37:16.561Z s9-win: CLICK 'Chrome Agent Bridge — armed (click to turn off)' at (1771,63)
2026-10-27T02:37:16.563Z s9-win: PARK cursor at (4,181) in W's page area (after the click)
2026-10-27T02:37:16.565Z s9-win: PRESS button 1/1 at 2026-10-27T02:37:16.565Z
2026-10-27T02:37:16.626Z s9-win: TITLE ok after 57 ms: "Chrome Agent Bridge — OFF: agents are refused (click to turn on)"
2026-10-27T02:37:17.771Z s9-win: PARK cursor at (4,181) in W's page area (before the click guards)
2026-10-27T02:37:17.843Z s9-win: CLICK 'Chrome Agent Bridge — OFF: agents are refused (click to turn on)' at (1771,63)
2026-10-27T02:37:17.845Z s9-win: PARK cursor at (4,181) in W's page area (after the click)
2026-10-27T02:37:17.847Z s9-win: PRESS button 1/1 at 2026-10-27T02:37:17.847Z
2026-10-27T02:37:17.908Z s9-win: TITLE ok after 56 ms: "Chrome Agent Bridge — armed (click to turn off)"
2026-10-27T02:37:17.958Z s9-win: ACTION name "Chrome Agent Bridge — armed (click to turn off)" (+1 further line(s) not shown) class 'ToolbarActionView'
2026-10-27T02:37:17.966Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:37:18.944Z s9-win: window 22479438 now shows about:blank
2026-10-27T02:37:18.967Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:37:19.633Z s9-win: window 22479438 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T02:37:19.751Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T02:37:19.765Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:37:20.426Z s9-win: window 22479438 now shows about:blank
2026-10-27T02:37:20.448Z s9-win: PARK cursor at (4,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T02:37:21.116Z s9-win: window 22479438 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T02:37:21.233Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T02:37:21.479Z ROW RD-RESTORE wait-safety reached safety armed=true evaluate=true blockedCount=0 after 0 ms (wanted {"armed":true,"evaluate":true,"blockedCount":0})
2026-10-27T02:37:21.540Z s9-win: ACTION name "Chrome Agent Bridge — armed (click to turn off)" (+1 further line(s) not shown) class 'ToolbarActionView'
2026-10-27T02:37:21.542Z s9-win: RESTORE read-back: stored page equal true, daemon.status equal true, title armed true
2026-10-27T02:37:21.545Z s9-win: RESTORE ok: the found texts (outside the repo) deleted after the read-back matched
2026-10-27T02:37:22.656Z s9-win: worker console: 1379 texts written to <PROFILE>\AppData\Local\Temp\bridge-e2e\s11b\console.txt (not printed; Console tab found: True)
2026-10-27T02:37:22.870Z s9-win: window 17959458 closed
2026-10-27T02:37:23.085Z s9-win: window 27134104 closed
2026-10-27T02:37:23.307Z s9-win: window 4393762 closed
2026-10-27T02:37:23.524Z s9-win: window 22479438 closed
2026-10-27T02:37:23.738Z s9-win: stopped own process srv8083
2026-10-27T02:37:23.892Z s9-win: stopped own process srv8091
2026-10-27T02:37:24.050Z s9-win: stopped own process srv8087
2026-10-27T02:37:24.203Z s9-win: stopped own process srv8089
2026-10-27T02:37:24.359Z s9-win: stopped own process srv8086
2026-10-27T02:37:24.514Z s9-win: stopped own process srv8088
2026-10-27T02:37:24.670Z s9-win: stopped own process srv8085
2026-10-27T02:37:24.824Z s9-win: stopped own process srv8081
STOP: the wave ended (an exception in block liveA (RuntimeException: node s11b judge-history ended in a STOP)) (at 2026-10-27T02:37:24.826Z)
