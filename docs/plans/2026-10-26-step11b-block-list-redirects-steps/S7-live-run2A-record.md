MANIFEST dnrWithHostAccess=true staticRuleSets=absent BUILD disk-s6-names=2/2 created-url=about:blank
ROW RD-0 (a) PASS: dnrWithHostAccess=true, staticRuleSets=absent
RULES 0
ROW RULES PASS: RULES 0
STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
TOGGLE reading on
STATE armed=true evaluate=true blocklist lines=0 uploadfolders valid=0 invalid=0
TOGGLE reading on
ROW RD-0 (c) PASS: armed, JavaScript on, the toggle reads on
FOUNDLIST blocks-fixtures=no
ROW RD-0 (d) PASS: the found list blocks no fixture URL
TABWATCH started
TABWATCH created-url=about:blank completes=1 first-complete-ms=6
S6 commit=ancestor
ROW R17B-0 (e)(f) PASS: 2/2 names, S6 is an ancestor, created-url about:blank
2026-10-27T06:58:05.985Z s9-win: CARRIED R17B-UP-L1 as R17 block r17-up-l1
FOUNDCHECK root=not outside=not
CHECK UP-L1 build PASS: daemon build = sha256 of daemon/dist/index.js
CHECK UP-L1 raw-root PASS: all checks hold
CHECK UP-L1 raw-outside PASS: all checks hold
ROW UP-L1 PASS: all checks hold
ROW R17B-UP-L1 PASS (as R17 R17-UP-L1; 1 verdict line); its console-scan clause is judged by R17B-LOGS' SCAN line, not here
ROW RD-CTL concurrent 302 in 15 ms, 302 in 12 ms (idle socket held open: yes)
ROW RD-CTL concurrent 302 in 4004 ms, 302 in 4004 ms (idle socket held open: yes)
CTL 8091 flip 200 then 302
HITS ctl redirect=0 blocked=1
ROW RD-CTL PASS: all controls hold
ROW R17B-CTL PASS (as R17 RD-CTL; 1 verdict line)
CTL 8087 slow answered after 3066 ms
ROW R17B-CTL 8087 PASS: answered after 3066 ms
2026-10-27T06:58:15.681Z ROW R17B-ACT-CTL setup-ac ok T2256 tabs before=13 after=14 (75 ms)
2026-10-27T06:58:15.684Z CHECK R17B-ACT-CTL setup-ac PASS — ok
HISTORY p3 built navigations=3 backs=0
HIST act-ctl built=3 pages activated=3
ACT act-ctl n=3 ok
LAT R17B-ACT-CTL-1 11 ms
ANSWER R17B-ACT-CTL #1 ok
LAT R17B-ACT-CTL 12 ms
ANSWER R17B-ACT-CTL #2 ok
HISTREPLY R17B-ACT-CTL kind=ok ms=12 start=1793084296619 reply=1793084296631
RECORD R17B-ACT-CTL answer=ok reply-ms=12 status-after=NOT MEASURED (the SDK exposes no tab status)
EXPR rules ok len=103
2026-10-27T06:58:17.598Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:58:20.240Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:58:20.974Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
ROW R17B-ACT-CTL PASS: ok, reply 12 ms
LAT R17B-ACT-CTL-1 12 ms
ANSWER R17B-ACT-CTL #1 ok
LAT R17B-ACT-CTL 12 ms
ANSWER R17B-ACT-CTL #2 ok
HISTREPLY R17B-ACT-CTL kind=ok ms=12 start=1793084302988 reply=1793084303000
RECORD R17B-ACT-CTL answer=ok reply-ms=12 status-after=NOT MEASURED (the SDK exposes no tab status)
EXPR rules ok len=103
2026-10-27T06:58:23.965Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:58:26.607Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:58:27.357Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
ROW R17B-ACT-CTL PASS: ok, reply 12 ms
2026-10-27T06:58:29.364Z ROW R17B-ACT-CTL close-ac ok T2256 (26 ms)
2026-10-27T06:58:29.760Z ROW R17B-BACK-NOACT setup-na ok T2257 tabs before=13 after=14 (75 ms)
2026-10-27T06:58:29.762Z CHECK R17B-BACK-NOACT setup-na PASS — ok
HISTORY p3 built navigations=3 backs=0
LAT R17B-BACK-NOACT 3 ms
ANSWER R17B-BACK-NOACT INTERNAL <message len=35>
HISTREPLY R17B-BACK-NOACT kind=INTERNAL ms=3 start=1793084310500 reply=1793084310503
RECORD R17B-BACK-NOACT answer=INTERNAL reply-ms=3 status-after=NOT MEASURED (the SDK exposes no tab status)
ROW R17B-BACK-NOACT PASS: recorded: answer INTERNAL, reply 3 ms
EXPR rules ok len=103
2026-10-27T06:58:31.493Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:58:34.222Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:58:34.976Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
ROW R17B-BACK-NOACT PASS: recorded: answer INTERNAL, reply 3 ms
2026-10-27T06:58:37.024Z ROW R17B-BACK-NOACT close-na ok T2257 (26 ms)
EXPR tabwatch ok len=636
2026-10-27T06:58:44.118Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:58:46.892Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:58:47.620Z s9-win: CONSOLE tabwatch submitted
TABWATCH started
2026-10-27T06:58:49.667Z ROW R17B-RD-2 open ok T2261 tabs before=16 after=17 (98 ms)
2026-10-27T06:58:49.671Z CHECK R17B-RD-2 open PASS — ok
TABROW R17B-RD-2 rows=17 found=yes hidden=blocked
2026-10-27T06:58:52.260Z ROW R17B-RD-2 snap DOMAIN_BLOCKED This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user. (3 ms)
CHECK R17B-RD-2 snapshot PASS: the r2 row is hidden and the snapshot is K-tab
HITS bd2 redirect=1 blocked=0
EXPR rules ok len=103
2026-10-27T06:58:53.827Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:58:56.796Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:58:57.519Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
EXPR tabwatch ok len=298
2026-10-27T06:59:00.309Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:59:03.282Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:59:04.026Z s9-win: CONSOLE tabwatch submitted
TABWATCH created-url=about:blank completes=1 first-complete-ms=6
ROW R17B-RD-2 PASS: recorded: created-url=about:blank completes=1 first-complete-ms=6
2026-10-27T06:59:05.978Z ROW R17B-RD-2 close-r2 DOMAIN_BLOCKED This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user. (3 ms)
2026-10-27T06:59:06.010Z s9-win: ROW R17B-RD-2 PASS (by 5 clause checks)
EXPR tabwatch ok len=636
2026-10-27T06:59:07.143Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:59:10.207Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:59:10.939Z s9-win: CONSOLE tabwatch submitted
TABWATCH started
2026-10-27T06:59:13.097Z ROW R17B-NEWTAB-PLAIN open ok T2262 tabs before=17 after=18 (77 ms)
2026-10-27T06:59:13.099Z CHECK R17B-NEWTAB-PLAIN open PASS — ok
2026-10-27T06:59:13.392Z ROW R17B-NEWTAB-PLAIN tabs ok tabs total=18 hidden(disarmed)=0 hidden(blocked)=2 withTitle=16 withUrl=16 url8081=3 (4 ms)
2026-10-27T06:59:13.678Z ROW R17B-NEWTAB-PLAIN snap ok T2262 elements=29 counter="Click counter: 0" (13 ms)
CHECK R17B-NEWTAB-PLAIN page PASS: the snapshot shows the playground (elements and its counter)
HITS bnp blocked=0
EXPR rules ok len=103
2026-10-27T06:59:15.353Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:59:18.575Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:59:19.324Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
EXPR tabwatch ok len=298
2026-10-27T06:59:22.360Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:59:25.617Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:59:26.359Z s9-win: CONSOLE tabwatch submitted
TABWATCH created-url=about:blank completes=1 first-complete-ms=7
ROW R17B-NEWTAB-PLAIN PASS: created-url=about:blank
2026-10-27T06:59:28.520Z ROW R17B-NEWTAB-PLAIN close-np ok T2262 (18 ms)
2026-10-27T06:59:28.548Z s9-win: ROW R17B-NEWTAB-PLAIN PASS (by 4 clause checks)
EXPR tabwatch ok len=636
2026-10-27T06:59:29.911Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:59:33.332Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:59:34.048Z s9-win: CONSOLE tabwatch submitted
TABWATCH started
LAT R17B-NEWTAB-LOAD-1 3074 ms
ANSWER R17B-NEWTAB-LOAD-1 ok
RECORD R17B-NEWTAB-LOAD-1 page=playground elements=29 snapshot=ok
ROW R17B-NEWTAB-LOAD-1 NOT MEASURED: reply and page hold; blocked or RULES after not given
HITS bnl1 blocked=0
EXPR rules ok len=103
2026-10-27T06:59:41.108Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:59:44.767Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:59:45.500Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
EXPR tabwatch ok len=298
2026-10-27T06:59:49.029Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:59:52.558Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T06:59:53.281Z s9-win: CONSOLE tabwatch submitted
TABWATCH created-url=about:blank completes=1 first-complete-ms=6 reply-ms=3074
2026-10-27T06:59:55.266Z s9-win: ROW R17B-NEWTAB-LOAD-1 PASS (by 3 clause checks)
2026-10-27T06:59:55.541Z ROW R17B-NEWTAB-LOAD close-nl1 ok T2263 (16 ms)
EXPR tabwatch ok len=636
2026-10-27T06:59:56.998Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:00:00.594Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:00:01.323Z s9-win: CONSOLE tabwatch submitted
TABWATCH started
LAT R17B-NEWTAB-LOAD-2 3102 ms
ANSWER R17B-NEWTAB-LOAD-2 ok
RECORD R17B-NEWTAB-LOAD-2 page=playground elements=29 snapshot=ok
ROW R17B-NEWTAB-LOAD-2 NOT MEASURED: reply and page hold; blocked or RULES after not given
HITS bnl2 blocked=0
EXPR rules ok len=103
2026-10-27T07:00:08.556Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:00:12.400Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:00:13.126Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
EXPR tabwatch ok len=298
2026-10-27T07:00:16.920Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:00:20.868Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:00:21.598Z s9-win: CONSOLE tabwatch submitted
TABWATCH created-url=about:blank completes=1 first-complete-ms=6 reply-ms=3102
2026-10-27T07:00:23.784Z s9-win: ROW R17B-NEWTAB-LOAD-2 PASS (by 3 clause checks)
2026-10-27T07:00:24.047Z ROW R17B-NEWTAB-LOAD close-nl2 ok T2264 (15 ms)
EXPR tabwatch ok len=636
2026-10-27T07:00:25.715Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:00:29.695Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:00:30.415Z s9-win: CONSOLE tabwatch submitted
TABWATCH started
LAT R17B-NEWTAB-LOAD-3 3074 ms
ANSWER R17B-NEWTAB-LOAD-3 ok
RECORD R17B-NEWTAB-LOAD-3 page=playground elements=29 snapshot=ok
ROW R17B-NEWTAB-LOAD-3 NOT MEASURED: reply and page hold; blocked or RULES after not given
HITS bnl3 blocked=0
EXPR rules ok len=103
2026-10-27T07:00:38.034Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:00:42.154Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:00:42.890Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
EXPR tabwatch ok len=298
2026-10-27T07:00:46.810Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:00:50.945Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:00:51.681Z s9-win: CONSOLE tabwatch submitted
TABWATCH created-url=about:blank completes=1 first-complete-ms=6 reply-ms=3074
2026-10-27T07:00:53.873Z s9-win: ROW R17B-NEWTAB-LOAD-3 PASS (by 3 clause checks)
2026-10-27T07:00:54.138Z ROW R17B-NEWTAB-LOAD close-nl3 ok T2265 (17 ms)
EXPR tabwatch ok len=636
2026-10-27T07:00:55.824Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:00:59.886Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:01:00.616Z s9-win: CONSOLE tabwatch submitted
TABWATCH started
LAT R17B-NEWTAB-LOAD-4 3076 ms
ANSWER R17B-NEWTAB-LOAD-4 ok
RECORD R17B-NEWTAB-LOAD-4 page=playground elements=29 snapshot=ok
ROW R17B-NEWTAB-LOAD-4 NOT MEASURED: reply and page hold; blocked or RULES after not given
HITS bnl4 blocked=0
EXPR rules ok len=103
2026-10-27T07:01:08.267Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:01:12.314Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:01:13.049Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
EXPR tabwatch ok len=298
2026-10-27T07:01:16.933Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:01:20.955Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:01:21.682Z s9-win: CONSOLE tabwatch submitted
TABWATCH created-url=about:blank completes=1 first-complete-ms=6 reply-ms=3076
2026-10-27T07:01:23.908Z s9-win: ROW R17B-NEWTAB-LOAD-4 PASS (by 3 clause checks)
2026-10-27T07:01:24.171Z ROW R17B-NEWTAB-LOAD close-nl4 ok T2266 (17 ms)
EXPR tabwatch ok len=636
2026-10-27T07:01:25.881Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:01:29.937Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:01:30.666Z s9-win: CONSOLE tabwatch submitted
TABWATCH started
LAT R17B-NEWTAB-LOAD-5 3075 ms
ANSWER R17B-NEWTAB-LOAD-5 ok
RECORD R17B-NEWTAB-LOAD-5 page=playground elements=29 snapshot=ok
ROW R17B-NEWTAB-LOAD-5 NOT MEASURED: reply and page hold; blocked or RULES after not given
HITS bnl5 blocked=0
EXPR rules ok len=103
2026-10-27T07:01:38.354Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:01:42.566Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:01:43.299Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
EXPR tabwatch ok len=298
2026-10-27T07:01:47.331Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:01:51.673Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:01:52.420Z s9-win: CONSOLE tabwatch submitted
TABWATCH created-url=about:blank completes=1 first-complete-ms=6 reply-ms=3075
2026-10-27T07:01:54.655Z s9-win: ROW R17B-NEWTAB-LOAD-5 PASS (by 3 clause checks)
2026-10-27T07:01:54.917Z ROW R17B-NEWTAB-LOAD close-nl5 ok T2267 (16 ms)
LAT R17B-BACK 37 ms
ANSWER R17B-BACK DOMAIN_BLOCKED "This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user."
HISTREPLY R17B-BACK kind=K-tab ms=37 start=1793084515252 reply=1793084515289
RECORD R17B-BACK answer=DOMAIN_BLOCKED reply-ms=37 status-after=NOT MEASURED (the SDK exposes no tab status)
HITS bbk blocked=0
FLIP bbk n200=1 n302=1 total=2
EXPR rules ok len=103
2026-10-27T07:01:57.271Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:02:01.445Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:02:02.183Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
ROW R17B-BACK PASS: blocked=0, 2 flip requests, reply 37 ms
LAT R17B-FWD-1 33 ms
ANSWER R17B-FWD #1 ok
LAT R17B-FWD 37 ms
ANSWER R17B-FWD #2 DOMAIN_BLOCKED "This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user."
HISTREPLY R17B-FWD kind=K-tab ms=37 start=1793084524966 reply=1793084525003
RECORD R17B-FWD answer=DOMAIN_BLOCKED reply-ms=37 status-after=NOT MEASURED (the SDK exposes no tab status)
HITS bfw blocked=0
FLIP bfw n200=1 n302=1 total=2
EXPR rules ok len=103
2026-10-27T07:02:06.962Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:02:11.107Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:02:11.841Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
ROW R17B-FWD PASS: blocked=0, 2 flip requests, reply 37 ms
LAT R17B-BACK-SAMEDOC 10 ms
ANSWER R17B-BACK-SAMEDOC ok
HISTREPLY R17B-BACK-SAMEDOC kind=ok ms=10 start=1793084534564 reply=1793084534574
RECORD R17B-BACK-SAMEDOC answer=ok reply-ms=10 status-after=NOT MEASURED (the SDK exposes no tab status)
EXPR rules ok len=103
2026-10-27T07:02:16.273Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:02:20.451Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:02:21.177Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
ROW R17B-BACK-SAMEDOC PASS: reply 10 ms
2026-10-27T07:02:23.945Z ROW R17B-DISARM setup-bdd ok T2268 tabs before=17 after=18 (79 ms)
2026-10-27T07:02:23.948Z CHECK R17B-DISARM setup-bdd PASS — ok
2026-10-27T07:02:24.038Z s9-win: toolbar buttons named 'Chrome Agent Bridge…': 1 after 56 ms (window 1936 px) -> pinned=true
2026-10-27T07:02:24.117Z s9-win: ACTION name "Chrome Agent Bridge — armed (click to turn off)" (+1 further line(s) not shown) class 'ToolbarActionView'
RULES expect=1
EXPR rules ok len=262
2026-10-27T07:02:25.969Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:02:29.971Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:02:30.717Z s9-win: CONSOLE rules submitted
2026-10-27T07:02:31.022Z s9-win: READY seen for R17B-DISARM
2026-10-27T07:02:32.083Z s9-win: PARK cursor at (1924,181) in W's page area (before the click guards)
2026-10-27T07:02:32.480Z s9-win: CLICK 'Chrome Agent Bridge — armed (click to turn off)' at (3691,63)
2026-10-27T07:02:32.482Z s9-win: PARK cursor at (1924,181) in W's page area (after the click)
2026-10-27T07:02:32.490Z s9-win: PRESS button 1/1 at 2026-10-27T07:02:32.486Z
2026-10-27T07:02:32.582Z s9-win: TITLE ok after 72 ms: "Chrome Agent Bridge — OFF: agents are refused (click to turn on)"
2026-10-27T07:02:36.700Z s9-win: PARK cursor at (1924,181) in W's page area (before the click guards)
2026-10-27T07:02:36.782Z s9-win: CLICK 'Chrome Agent Bridge — OFF: agents are refused (click to turn on)' at (3691,63)
2026-10-27T07:02:36.798Z s9-win: PARK cursor at (1924,181) in W's page area (after the click)
2026-10-27T07:02:36.809Z s9-win: PRESS button 1/1 at 2026-10-27T07:02:36.809Z
2026-10-27T07:02:36.813Z s9-win: PRESS ON timed from the reply: waited 1577 ms after seeing it
2026-10-27T07:02:36.898Z s9-win: TITLE ok after 81 ms: "Chrome Agent Bridge — armed (click to turn off)"
2026-10-27T07:02:36.952Z s9-win: ACTION name "Chrome Agent Bridge — armed (click to turn off)" (+1 further line(s) not shown) class 'ToolbarActionView'
CALLT R17B-DISARM start=1793084551001 reply=1793084555040
LAT R17B-DISARM 4039 ms
ANSWER R17B-DISARM DISARMED "The user has turned the bridge off in Chrome, so every page call is refused. Stop and ask the user to turn it back on; do not retry." +data
CHECK R17B-DISARM PASS: R17B-DISARM: exact
RULES samples=[1,1,1] min=1 max=1
RULES after=0
ROW R17B-DISARM rules-at PASS: sample = 1, then 0
2026-10-27T07:02:43.781Z ROW R17B-DISARM wait-safety reached safety armed=true evaluate=true blockedCount=1 after 1 ms (wanted {"armed":true,"evaluate":true,"blockedCount":1})
HITS bdd redirect=1 blocked=0
2026-10-27T07:02:44.266Z ROW R17B-DISARM close-bdd DOMAIN_BLOCKED This tab shows a site on the user's block list in Chrome; the bridge will not read or act on it. Ask the user. (3 ms)
2026-10-27T07:02:44.295Z s9-win: ROW R17B-DISARM PASS (by 4 clause checks)
EXPR tabwatch ok len=636
2026-10-27T07:02:56.944Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:03:00.860Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:03:01.585Z s9-win: CONSOLE tabwatch submitted
TABWATCH started
2026-10-27T07:03:04.053Z ROW R17B-NEWTAB-REFUSED tabs ok tabs total=18 hidden(disarmed)=0 hidden(blocked)=1 withTitle=17 withUrl=17 url8081=1 (4 ms)
2026-10-27T07:03:05.334Z ROW R17B-NEWTAB-REFUSED tabs ok tabs total=18 hidden(disarmed)=0 hidden(blocked)=1 withTitle=17 withUrl=17 url8081=1 (4 ms)
2026-10-27T07:03:05.654Z ROW R17B-NEWTAB-REFUSED open-after tabs before=18 after=18
2026-10-27T07:03:05.657Z ROW R17B-NEWTAB-REFUSED open INTERNAL JavaScript URLs are not allowed in API based extension navigations. Use chrome.scripting.executeScript instead. (36 ms)
2026-10-27T07:03:05.940Z ROW R17B-NEWTAB-REFUSED tabs ok tabs total=18 hidden(disarmed)=0 hidden(blocked)=1 withTitle=17 withUrl=17 url8081=1 (4 ms)
2026-10-27T07:03:07.216Z ROW R17B-NEWTAB-REFUSED tabs ok tabs total=18 hidden(disarmed)=0 hidden(blocked)=1 withTitle=17 withUrl=17 url8081=1 (4 ms)
EXPR tabwatch ok len=298
2026-10-27T07:03:08.939Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:03:13.036Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:03:13.774Z s9-win: CONSOLE tabwatch submitted
TABWATCH created-url=about:blank completes=1 first-complete-ms=6
2026-10-27T07:03:16.023Z s9-win: ROW R17B-NEWTAB-REFUSED PASS (tab-row count equal before and after; the answer is a RECORD)
2026-10-27T07:03:16.387Z ROW R17B-BACK-EMPTY setup-he ok T2270 tabs before=18 after=19 (78 ms)
2026-10-27T07:03:16.390Z CHECK R17B-BACK-EMPTY setup-he PASS — ok
HISTORY empty built navigations=2 backs=0
HIST be built=2 pages activated=2
ACT be n=2 ok
EXPR rules ok len=262
2026-10-27T07:03:18.517Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:03:22.502Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:03:23.238Z s9-win: CONSOLE rules submitted
LAT R17B-BACK-EMPTY 12 ms
ANSWER R17B-BACK-EMPTY ok
HISTREPLY R17B-BACK-EMPTY kind=ok ms=12 start=1793084603514 reply=1793084603526
RECORD R17B-BACK-EMPTY answer=ok reply-ms=12 status-after=NOT MEASURED (the SDK exposes no tab status)
ROW R17B-BACK-EMPTY PASS: ok, reply 12 ms
LAT R17B-BACK-EMPTY 10 ms
ANSWER R17B-BACK-EMPTY ok
HISTREPLY R17B-BACK-EMPTY kind=ok ms=10 start=1793084604060 reply=1793084604070
RECORD R17B-BACK-EMPTY answer=ok reply-ms=10 status-after=NOT MEASURED (the SDK exposes no tab status)
ROW R17B-BACK-EMPTY PASS: ok, reply 10 ms
RULES samples=[0,0,0,0,0] min=0 max=0
RULES after=0
ROW R17B-BACK-EMPTY rules-empty PASS: max=0
2026-10-27T07:03:40.338Z ROW R17B-BACK-EMPTY close-he ok T2270 (26 ms)
2026-10-27T07:03:40.389Z s9-win: CARRIED R17B-RD-DL-SOCKET as R17 block rd-dl-socket
2026-10-27T07:03:41.364Z s9-win: BOX blocklist set (1 non-blank line(s); saved; text withheld)
2026-10-27T07:03:41.372Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:03:42.056Z s9-win: window 3280612 now shows about:blank
2026-10-27T07:03:42.079Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:03:42.733Z s9-win: window 3280612 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:03:42.860Z s9-win: STATE armed=true evaluate=true blocklist lines=1 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T07:03:42.863Z s9-win: RESTORE blocklist lines=1 hash=equal
EXPR mark ok len=35
2026-10-27T07:03:44.532Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:03:48.446Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:03:49.176Z s9-win: CONSOLE mark submitted
ROW RD-DL-SOCKET mark-start PASS: the mark stands in the console capture
2026-10-27T07:03:57.617Z ROW RD-DL-SOCKET s1 ok sk1.txt size=69 (3019 ms)
2026-10-27T07:03:57.619Z CHECK RD-DL-SOCKET s1 PASS — ok
2026-10-27T07:03:57.620Z ROW RD-DL-SOCKET s1-file sk1.txt exists=yes part=no
2026-10-27T07:04:00.918Z ROW RD-DL-SOCKET s2 ok sk2.txt size=69 (3018 ms)
2026-10-27T07:04:00.921Z CHECK RD-DL-SOCKET s2 PASS — ok
2026-10-27T07:04:00.922Z ROW RD-DL-SOCKET s2-file sk2.txt exists=yes part=no
2026-10-27T07:04:04.214Z ROW RD-DL-SOCKET s3 ok sk3.txt size=69 (3018 ms)
2026-10-27T07:04:04.217Z CHECK RD-DL-SOCKET s3 PASS — ok
2026-10-27T07:04:04.218Z ROW RD-DL-SOCKET s3-file sk3.txt exists=yes part=no
2026-10-27T07:04:07.510Z ROW RD-DL-SOCKET s4 ok sk4.txt size=69 (3018 ms)
2026-10-27T07:04:07.516Z CHECK RD-DL-SOCKET s4 PASS — ok
2026-10-27T07:04:07.521Z ROW RD-DL-SOCKET s4-file sk4.txt exists=yes part=no
2026-10-27T07:04:10.813Z ROW RD-DL-SOCKET s5 ok sk5.txt size=69 (3017 ms)
2026-10-27T07:04:10.816Z CHECK RD-DL-SOCKET s5 PASS — ok
2026-10-27T07:04:10.817Z ROW RD-DL-SOCKET s5-file sk5.txt exists=yes part=no
2026-10-27T07:04:14.104Z ROW RD-DL-SOCKET s6 ok sk6.txt size=69 (3017 ms)
2026-10-27T07:04:14.107Z CHECK RD-DL-SOCKET s6 PASS — ok
2026-10-27T07:04:14.108Z ROW RD-DL-SOCKET s6-file sk6.txt exists=yes part=no
2026-10-27T07:04:17.401Z ROW RD-DL-SOCKET s7 ok sk7.txt size=69 (3018 ms)
2026-10-27T07:04:17.404Z CHECK RD-DL-SOCKET s7 PASS — ok
2026-10-27T07:04:17.405Z ROW RD-DL-SOCKET s7-file sk7.txt exists=yes part=no
2026-10-27T07:04:20.700Z ROW RD-DL-SOCKET s8 ok sk8.txt size=69 (3018 ms)
2026-10-27T07:04:20.703Z CHECK RD-DL-SOCKET s8 PASS — ok
2026-10-27T07:04:20.704Z ROW RD-DL-SOCKET s8-file sk8.txt exists=yes part=no
2026-10-27T07:04:24.006Z ROW RD-DL-SOCKET s9 ok sk9.txt size=69 (3021 ms)
2026-10-27T07:04:24.008Z CHECK RD-DL-SOCKET s9 PASS — ok
2026-10-27T07:04:24.009Z ROW RD-DL-SOCKET s9-file sk9.txt exists=yes part=no
2026-10-27T07:04:27.302Z ROW RD-DL-SOCKET s10 ok sk10.txt size=69 (3018 ms)
2026-10-27T07:04:27.305Z CHECK RD-DL-SOCKET s10 PASS — ok
2026-10-27T07:04:27.306Z ROW RD-DL-SOCKET s10-file sk10.txt exists=yes part=no
2026-10-27T07:04:30.611Z ROW RD-DL-SOCKET s11 ok sk11.txt size=69 (3019 ms)
2026-10-27T07:04:30.613Z CHECK RD-DL-SOCKET s11 PASS — ok
2026-10-27T07:04:30.615Z ROW RD-DL-SOCKET s11-file sk11.txt exists=yes part=no
2026-10-27T07:04:33.903Z ROW RD-DL-SOCKET s12 ok sk12.txt size=69 (3018 ms)
2026-10-27T07:04:33.905Z CHECK RD-DL-SOCKET s12 PASS — ok
2026-10-27T07:04:33.907Z ROW RD-DL-SOCKET s12-file sk12.txt exists=yes part=no
2026-10-27T07:04:33.936Z s9-win: SOCKET calls ok 12 of 12; HANDSHAKE during call: not exercised (recorded)
EXPR mark ok len=33
2026-10-27T07:04:35.554Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:04:39.948Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:04:40.680Z s9-win: CONSOLE mark submitted
ROW RD-DL-SOCKET mark-end PASS: the mark stands in the console capture
EXPR rules ok len=103
2026-10-27T07:04:44.477Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:04:48.384Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:04:49.117Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
2026-10-27T07:04:51.425Z ROW RD-DL-SOCKET status ok safety armed=true evaluate=true blockedCount=1 extensionConnected=true rows=18 rowsWithUrl=10 rowsWith8081=1 (0 ms)
SOCKET samples=240 connected=240
ROW RD-DL-SOCKET (samples only) PASS: all 240 samples connected
2026-10-27T07:04:52.571Z s9-win: BOX blocklist set (0 non-blank line(s); saved; text withheld)
2026-10-27T07:04:52.579Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:04:53.241Z s9-win: window 3280612 now shows about:blank
2026-10-27T07:04:53.263Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:04:53.931Z s9-win: window 3280612 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:04:54.060Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T07:04:54.062Z s9-win: RESTORE blocklist lines=0 hash=equal
2026-10-27T07:04:54.062Z s9-win: ROW RD-DL-SOCKET PASS (by 3 clause checks)
ROW R17B-RD-DL-SOCKET PASS (as R17 RD-DL-SOCKET; 2 verdict lines)
2026-10-27T07:04:54.306Z s9-win: CARRIED R17B-UP-OPT as R17 block r17-up-opt
2026-10-27T07:04:55.541Z s9-win: LEG S11 open: my check window 124259050 - the only window carrying this call's marker (after 1062 ms), its address bar on the marker URL
2026-10-27T07:04:55.543Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:04:56.231Z s9-win: window 124259050 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:04:57.207Z s9-win: BOX uploadfolders set (1 non-blank line(s); saved; text withheld)
2026-10-27T07:05:03.572Z s9-win: window 124259050 closed
2026-10-27T07:05:03.578Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:05:04.241Z s9-win: window 3280612 now shows about:blank
2026-10-27T07:05:04.265Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:05:04.931Z s9-win: window 3280612 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:05:05.059Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=1
2026-10-27T07:05:05.402Z s9-win: BOX uploadfolders set (4 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T07:05:06.969Z s9-win: LEG S11 open: my check window 2492606 - the only window carrying this call's marker (after 1044 ms), its address bar on the marker URL
2026-10-27T07:05:06.971Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:05:07.656Z s9-win: window 2492606 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:05:07.777Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=1
2026-10-27T07:05:07.997Z s9-win: window 2492606 closed
2026-10-27T07:05:08.294Z s9-win: BOX uploadfolders set (1 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T07:05:08.758Z s9-win: OPT observed: standing x0, invalid items 2, warned items 0, O2 6105 ms; observations written for the judge
2026-10-27T07:05:09.096Z s9-win: BOX uploadfolders set (4 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T07:05:09.876Z s9-win: BOX uploadfolders set (1 non-blank line(s); typed, NOT saved; text withheld)
2026-10-27T07:05:10.297Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:05:10.982Z s9-win: window 3280612 now shows about:blank
2026-10-27T07:05:11.006Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:05:11.673Z s9-win: window 3280612 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:05:11.805Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=1
2026-10-27T07:05:11.807Z s9-win: TYPED uploadfolders reverted; stored equal
ROW R17-UP-OPT FAIL: O2 showed the saved text after 6105 ms, over 5 000 ms
ROW R17B-UP-OPT FAIL (as R17 R17-UP-OPT; 1 verdict line)
2026-10-27T07:05:12.297Z s9-win: CARRIED R17B-UP-6 as R17 block r17-up-6
2026-10-27T07:05:12.634Z s9-win: PARK cursor at (1924,181) in W's page area (R17-UP-6)
2026-10-27T07:05:13.009Z s9-win: READY seen for R17-UP-6-outside-sample
2026-10-27T07:05:20.316Z s9-win: SAMPLER R17-UP-6-outside polls=35 (after the reply 20) banner=seen
2026-10-27T07:05:20.540Z s9-win: READY seen for R17-UP-6-missing-sample
2026-10-27T07:05:27.702Z s9-win: SAMPLER R17-UP-6-missing polls=34 (after the reply 19) banner=seen
2026-10-27T07:05:27.890Z s9-win: READY seen for R17-UP-6-relative-sample
2026-10-27T07:05:35.207Z s9-win: SAMPLER R17-UP-6-relative polls=36 (after the reply 20) banner=seen
2026-10-27T07:05:35.417Z s9-win: READY seen for R17-UP-6-raw-dotdot-sample
2026-10-27T07:05:42.579Z s9-win: SAMPLER R17-UP-6-raw-dotdot polls=34 (after the reply 19) banner=seen
2026-10-27T07:05:42.776Z s9-win: READY seen for R17-UP-6-raw-notarget-sample
2026-10-27T07:05:50.097Z s9-win: SAMPLER R17-UP-6-raw-notarget polls=36 (after the reply 20) banner=seen
CHECK R17-UP-6 outside FAIL: outside: banner seen
CHECK R17-UP-6 missing FAIL: missing: banner seen
CHECK R17-UP-6 relative FAIL: relative: banner seen
CHECK R17-UP-6 raw-dotdot FAIL: raw-dotdot: banner seen
CHECK R17-UP-6 raw-notarget FAIL: raw-notarget: banner seen
ROW R17-UP-6 FAIL: outside: banner seen
ROW R17B-UP-6 FAIL (as R17 R17-UP-6; 1 verdict line)
2026-10-27T07:05:50.521Z s9-win: CARRIED R17B-UP-7 as R17 block r17-up-7
2026-10-27T07:05:50.851Z s9-win: READY seen for UP-7-a
2026-10-27T07:05:51.248Z s9-win: SWITCH armed -> false at 2026-10-27T07:05:50.926Z (now false)
2026-10-27T07:05:51.770Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:05:52.435Z s9-win: window 3280612 now shows about:blank
2026-10-27T07:05:52.455Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:05:53.108Z s9-win: window 3280612 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:05:53.237Z s9-win: STATE armed=false evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=1
2026-10-27T07:05:53.239Z s9-win: FLAG armed read back equal
2026-10-27T07:05:53.270Z s9-win: READY seen for UP-7-a-done
2026-10-27T07:05:53.635Z s9-win: SWITCH armed -> true at 2026-10-27T07:05:53.323Z (now true)
2026-10-27T07:05:54.143Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:05:54.811Z s9-win: window 3280612 now shows about:blank
2026-10-27T07:05:54.828Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:05:55.492Z s9-win: window 3280612 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:05:55.625Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=1
2026-10-27T07:05:55.627Z s9-win: FLAG armed read back equal
2026-10-27T07:05:55.881Z ROW UP-7-a wait-safety reached safety armed=true evaluate=true blockedCount=0 after 0 ms (wanted {"armed":true,"evaluate":true,"blockedCount":0})
2026-10-27T07:05:55.907Z s9-win: READY seen for UP-7-b
2026-10-27T07:05:56.846Z s9-win: BOX blocklist set (1 non-blank line(s); saved; text withheld)
2026-10-27T07:05:56.855Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:05:57.520Z s9-win: window 3280612 now shows about:blank
2026-10-27T07:05:57.537Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:05:58.218Z s9-win: window 3280612 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:05:58.359Z s9-win: STATE armed=true evaluate=true blocklist lines=1 uploadfolders lines=1
2026-10-27T07:05:58.361Z s9-win: RESTORE blocklist lines=1 hash=equal
2026-10-27T07:05:58.408Z s9-win: READY seen for UP-7-b-done
2026-10-27T07:05:59.349Z s9-win: BOX blocklist set (0 non-blank line(s); saved; text withheld)
2026-10-27T07:05:59.359Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:06:00.029Z s9-win: window 3280612 now shows about:blank
2026-10-27T07:06:00.046Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:06:00.772Z s9-win: window 3280612 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:06:01.006Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=1
2026-10-27T07:06:01.008Z s9-win: RESTORE blocklist lines=0 hash=equal
2026-10-27T07:06:01.283Z ROW UP-7-b wait-safety reached safety armed=true evaluate=true blockedCount=0 after 0 ms (wanted {"armed":true,"evaluate":true,"blockedCount":0})
2026-10-27T07:06:01.306Z s9-win: READY seen for UP-7-c
2026-10-27T07:06:02.249Z s9-win: BOX uploadfolders set (0 non-blank line(s); saved; text withheld)
2026-10-27T07:06:02.257Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:06:02.944Z s9-win: window 3280612 now shows about:blank
2026-10-27T07:06:02.962Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:06:03.627Z s9-win: window 3280612 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:06:03.759Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T07:06:03.761Z s9-win: RESTORE uploadfolders lines=0 hash=equal
2026-10-27T07:06:03.802Z s9-win: READY seen for UP-7-c-done
2026-10-27T07:06:04.739Z s9-win: BOX uploadfolders set (1 non-blank line(s); saved; text withheld)
2026-10-27T07:06:04.749Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:06:05.419Z s9-win: window 3280612 now shows about:blank
2026-10-27T07:06:05.437Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:06:06.102Z s9-win: window 3280612 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:06:06.412Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=1
2026-10-27T07:06:06.415Z s9-win: RESTORE uploadfolders lines=1 hash=equal
2026-10-27T07:06:06.696Z ROW UP-7-c wait-safety reached safety armed=true evaluate=true blockedCount=0 after 1 ms (wanted {"armed":true,"evaluate":true,"blockedCount":0})
CHECK UP-7 a-disarmed PASS: K-disarmed: exact, page untouched
CHECK UP-7 b-blocked PASS: K-blocked: exact, page untouched
CHECK UP-7 c-folder-removed PASS: K-gate: exact, page untouched
ROW UP-7 PASS: all checks hold
ROW R17B-UP-7 PASS (as R17 R17-UP-7; 1 verdict line)
2026-10-27T07:06:06.973Z s9-win: CARRIED R17B-SAVE-REFUSE as R17 block r17-save-refuse
CHECK SAVE-REFUSE-R sdk-undef PASS: K-undef: exact
CHECK SAVE-REFUSE-R sdk-node PASS: K-node: exact
CHECK SAVE-REFUSE-R sdk-map PASS: K-map: exact
CHECK SAVE-REFUSE-R sdk-cycle PASS: K-cycle: exact
CHECK SAVE-REFUSE-R sdk-control PASS: control keeps the prefix and names boom
CHECK SAVE-REFUSE-R sdk-files PASS: no file and no .part
ROW SAVE-REFUSE-R sdk-leg PASS: all checks hold
CHECK actor start PASS: started, tool search off
CHECK SAVE-REFUSE-R mcp-undef PASS: K-undef: contained, unprefixed
CHECK SAVE-REFUSE-R mcp-node PASS: K-node: contained, unprefixed
CHECK SAVE-REFUSE-R mcp-map PASS: K-map: contained, unprefixed
CHECK SAVE-REFUSE-R mcp-cycle PASS: K-cycle: contained, unprefixed
CHECK SAVE-REFUSE-R mcp-files PASS: no file and no .part
ROW SAVE-REFUSE-R mcp-leg PASS: all checks hold
CHECK actor end PASS: ended
ROW R17B-SAVE-REFUSE NOT MEASURED (as R17 R17-SAVE-REFUSE; 0 verdict lines, none printed)
2026-10-27T07:06:53.247Z s9-win: CARRIED R17B-RESTORE as R17 block rd-restore
2026-10-27T07:06:53.651Z s9-win: toolbar buttons named 'Chrome Agent Bridge…': 1 after 43 ms (window 1936 px) -> pinned=true
2026-10-27T07:06:53.702Z s9-win: ACTION name "Chrome Agent Bridge — armed (click to turn off)" (+1 further line(s) not shown) class 'ToolbarActionView'
2026-10-27T07:06:53.753Z s9-win: PARK cursor at (1924,181) in W's page area (before the click guards)
2026-10-27T07:06:53.827Z s9-win: CLICK 'Chrome Agent Bridge — armed (click to turn off)' at (3691,63)
2026-10-27T07:06:53.829Z s9-win: PARK cursor at (1924,181) in W's page area (after the click)
2026-10-27T07:06:53.831Z s9-win: PRESS button 1/1 at 2026-10-27T07:06:53.831Z
2026-10-27T07:06:53.916Z s9-win: TITLE ok after 84 ms: "Chrome Agent Bridge — OFF: agents are refused (click to turn on)"
2026-10-27T07:06:55.369Z s9-win: PARK cursor at (1924,181) in W's page area (before the click guards)
2026-10-27T07:06:55.433Z s9-win: CLICK 'Chrome Agent Bridge — OFF: agents are refused (click to turn on)' at (3691,63)
2026-10-27T07:06:55.437Z s9-win: PARK cursor at (1924,181) in W's page area (after the click)
2026-10-27T07:06:55.439Z s9-win: PRESS button 1/1 at 2026-10-27T07:06:55.439Z
2026-10-27T07:06:55.522Z s9-win: TITLE ok after 81 ms: "Chrome Agent Bridge — armed (click to turn off)"
2026-10-27T07:06:55.579Z s9-win: ACTION name "Chrome Agent Bridge — armed (click to turn off)" (+1 further line(s) not shown) class 'ToolbarActionView'
2026-10-27T07:06:55.587Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:06:56.576Z s9-win: window 3280612 now shows about:blank
2026-10-27T07:06:56.600Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:06:57.276Z s9-win: window 3280612 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:06:57.401Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=1
2026-10-27T07:06:58.330Z s9-win: BOX uploadfolders set (0 non-blank line(s); saved; text withheld)
2026-10-27T07:06:58.338Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:06:59.015Z s9-win: window 3280612 now shows about:blank
2026-10-27T07:06:59.040Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:06:59.718Z s9-win: window 3280612 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:06:59.866Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T07:06:59.868Z s9-win: RESTORE uploadfolders lines=0 hash=equal
2026-10-27T07:06:59.878Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:07:00.551Z s9-win: window 3280612 now shows about:blank
2026-10-27T07:07:00.575Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:07:01.234Z s9-win: window 3280612 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:07:01.363Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T07:07:01.612Z ROW RD-RESTORE wait-safety reached safety armed=true evaluate=true blockedCount=0 after 0 ms (wanted {"armed":true,"evaluate":true,"blockedCount":0})
2026-10-27T07:07:01.677Z s9-win: ACTION name "Chrome Agent Bridge — armed (click to turn off)" (+1 further line(s) not shown) class 'ToolbarActionView'
2026-10-27T07:07:01.679Z s9-win: RESTORE read-back: stored page equal true, daemon.status equal true, title armed true
2026-10-27T07:07:01.685Z s9-win: RESTORE ok: the found texts (outside the repo) deleted after the read-back matched
RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal
CHECK UP-RESTORE stored PASS: armed, evaluate, block list and Upload folders equal to UP-0 by count and hash
CHECK UP-RESTORE daemon PASS: daemon.status armed and evaluate equal the found state
ROW UP-RESTORE PASS: armed, evaluate, block list and Upload folders equal to UP-0 by count and hash
EXPR rules ok len=103
2026-10-27T07:07:03.370Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:07:06.935Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:07:07.660Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
ROW R17B-RESTORE PASS (as R17 RD-RESTORE; 2 verdict lines)
2026-10-27T07:07:09.912Z s9-win: CARRIED R17B-LOGS as R17 block rd-logs
2026-10-27T07:07:11.157Z s9-win: worker console: 1675 texts written to <PROFILE>\AppData\Local\Temp\bridge-e2e\s11b-r17b-2\console.txt (not printed; Console tab found: True)
CONSOLE window-title lines dropped=3
SCAN console: ://=0 (fixture 0, other 0) token=0 localhost:8085=0 aaaaaaaaaaaaaaaaaaaaaaaa=0 bank.example=0 alias7=0 sock127=0 sentinel=0 profile=0
ROW RD-LOGS PASS: all counts zero
CONSOLE chrome-blocked lines redacted=0
SCAN daemon: ://=0 (fixture 0, other 0) token=0 localhost:8085=0 aaaaaaaaaaaaaaaaaaaaaaaa=0 bank.example=0 alias7=0 sock127=0 sentinel=0 profile=0
ROW RD-LOGS PASS: all counts zero
SCAN actors: ://=1 (fixture 1, other 0) token=0 localhost:8085=0 aaaaaaaaaaaaaaaaaaaaaaaa=0 bank.example=0 alias7=0 sock127=0 sentinel=0 profile=0
ROW RD-LOGS PASS: all counts zero
ROW R17B-LOGS PASS (as R17 RD-LOGS; 3 verdict lines)
