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
2026-10-27T07:08:25.984Z s9-win: CARRIED R17B-F-RAW as R17 block f-raw
2026-10-27T07:08:26.320Z s9-win: PARK cursor at (1924,181) in W's page area (F-RAW)
2026-10-27T07:08:26.693Z s9-win: READY seen for F-RAW-sample
2026-10-27T07:08:33.961Z s9-win: SAMPLER F-RAW polls=35 (after the reply 20) banner=seen
ANSWER F-RAW BAD_PARAMS <message len=80>
LEAKS F-RAW 0
ROW F-RAW FAIL: F-RAW: banner seen
ROW R17B-F-RAW FAIL (as R17 F-RAW; 1 verdict line)
2026-10-27T07:08:34.400Z s9-win: CARRIED R17B-F-RAW-2 as R17 block f-raw-2
2026-10-27T07:08:34.413Z s9-win: PARK cursor at (1924,181) in W's page area (F-RAW-2)
2026-10-27T07:08:34.707Z s9-win: READY seen for F-RAW-2-sample
2026-10-27T07:08:41.992Z s9-win: SAMPLER F-RAW-2 polls=36 (after the reply 20) banner=seen
ANSWER F-RAW-2 BAD_PARAMS <message len=80>
LEAKS F-RAW-2 0
ROW F-RAW-2 FAIL: F-RAW-2: banner seen
ROW R17B-F-RAW-2 FAIL (as R17 F-RAW-2; 1 verdict line)
2026-10-27T07:08:42.441Z s9-win: CARRIED R17B-F-RAW-DIR as R17 block f-raw-dir
2026-10-27T07:08:42.455Z s9-win: PARK cursor at (1924,181) in W's page area (F-RAW-DIR)
2026-10-27T07:08:42.759Z s9-win: READY seen for F-RAW-DIR-sample
2026-10-27T07:08:50.016Z s9-win: SAMPLER F-RAW-DIR polls=36 (after the reply 20) banner=seen
ANSWER F-RAW-DIR BAD_PARAMS <message len=76>
LEAKS F-RAW-DIR 0
ROW F-RAW-DIR FAIL: F-RAW-DIR: banner seen
ROW R17B-F-RAW-DIR FAIL (as R17 F-RAW-DIR; 1 verdict line)
2026-10-27T07:08:50.432Z s9-win: CARRIED R17B-F-RAW-ENC as R17 block f-raw-enc
2026-10-27T07:08:50.451Z s9-win: PARK cursor at (1924,181) in W's page area (F-RAW-ENC)
ANSWER F-RAW-ENC ok
ROW F-RAW-ENC PASS: files, hashes, isTrusted and mark clauses hold
ROW R17B-F-RAW-ENC PASS (as R17 F-RAW-ENC; 1 verdict line)
2026-10-27T07:08:51.071Z s9-win: CARRIED R17B-F-RAW-OK as R17 block f-raw-ok
2026-10-27T07:08:51.092Z s9-win: PARK cursor at (1924,181) in W's page area (F-RAW-OK)
ANSWER F-RAW-OK ok
ROW F-RAW-OK PASS: files, hashes, isTrusted and mark clauses hold
ROW R17B-F-RAW-OK PASS (as R17 F-RAW-OK; 1 verdict line)
2026-10-27T07:08:51.697Z s9-win: CARRIED R17B-UP-RACE-A as R17 block r17-up-race-a
2026-10-27T07:08:51.735Z s9-win: PARK cursor at (1924,181) in W's page area (race A)
2026-10-27T07:08:51.832Z s9-win: toolbar buttons named 'Chrome Agent Bridge…': 1 after 45 ms (window 1936 px) -> pinned=true
2026-10-27T07:08:51.901Z s9-win: ACTION name "Chrome Agent Bridge — armed (click to turn off)" (+1 further line(s) not shown) class 'ToolbarActionView'
2026-10-27T07:08:51.904Z s9-win: PARK cursor at (1924,181) in W's page area (race A)
2026-10-27T07:08:52.038Z s9-win: READY seen for UP-RACE-A
2026-10-27T07:08:53.605Z s9-win: PARK cursor at (1924,181) in W's page area (before the click guards)
2026-10-27T07:08:53.687Z s9-win: CLICK 'Chrome Agent Bridge — armed (click to turn off)' at (3691,63)
2026-10-27T07:08:53.689Z s9-win: PARK cursor at (1924,181) in W's page area (after the click)
2026-10-27T07:08:53.696Z s9-win: PRESS button 1/1 at 2026-10-27T07:08:53.691Z
2026-10-27T07:08:55.198Z s9-win: PARK cursor at (1924,181) in W's page area (before the click guards)
2026-10-27T07:08:55.270Z s9-win: CLICK 'Chrome Agent Bridge — OFF: agents are refused (click to turn on)' at (3691,63)
2026-10-27T07:08:55.272Z s9-win: PARK cursor at (1924,181) in W's page area (after the click)
2026-10-27T07:08:55.274Z s9-win: PRESS button 1/1 at 2026-10-27T07:08:55.274Z
2026-10-27T07:08:55.347Z s9-win: TITLE ok after 67 ms: "Chrome Agent Bridge — armed (click to turn off)"
2026-10-27T07:08:55.401Z s9-win: ACTION name "Chrome Agent Bridge — armed (click to turn off)" (+1 further line(s) not shown) class 'ToolbarActionView'
2026-10-27T07:09:09.910Z s9-win: READY seen for UP-RACE-A-loop-done
2026-10-27T07:09:10.164Z ROW UP-RACE-A wait-safety reached safety armed=true evaluate=true blockedCount=0 after 1 ms (wanted {"armed":true,"evaluate":true,"blockedCount":0})
CALL 1 start=4 reply=29 ok
CALL 2 start=153 reply=167 ok
CALL 3 start=300 reply=313 ok
CALL 4 start=457 reply=470 ok
CALL 5 start=607 reply=621 ok
CALL 6 start=765 reply=778 ok
CALL 7 start=907 reply=920 ok
CALL 8 start=1065 reply=1078 ok
CALL 9 start=1207 reply=1220 ok
CALL 10 start=1363 reply=1376 ok
CALL 11 start=1503 reply=1516 ok
CALL 12 start=1653 reply=1663 DISARMED
CALL 13 start=1805 reply=1809 DISARMED
CALL 14 start=1953 reply=1957 DISARMED
CALL 15 start=2103 reply=2106 DISARMED
CALL 16 start=2250 reply=2254 DISARMED
CALL 17 start=2408 reply=2412 DISARMED
CALL 18 start=2552 reply=2555 DISARMED
CALL 19 start=2709 reply=2712 DISARMED
CALL 20 start=2851 reply=2855 DISARMED
CALL 21 start=3009 reply=3012 DISARMED
CALL 22 start=3151 reply=3154 DISARMED
CALL 23 start=3303 reply=3318 ok
CALL 24 start=3453 reply=3467 ok
CALL 25 start=3603 reply=3617 ok
CALL 26 start=3753 reply=3767 ok
CALL 27 start=3904 reply=3917 ok
CALL 28 start=4054 reply=4067 ok
CALL 29 start=4206 reply=4218 ok
CALL 30 start=4356 reply=4368 ok
CALL 31 start=4514 reply=4526 ok
CALL 32 start=4655 reply=4668 ok
CALL 33 start=4813 reply=4825 ok
CALL 34 start=4955 reply=4968 ok
CALL 35 start=5113 reply=5125 ok
CALL 36 start=5253 reply=5265 ok
CALL 37 start=5403 reply=5417 ok
CALL 38 start=5560 reply=5573 ok
CALL 39 start=5702 reply=5715 ok
CALL 40 start=5860 reply=5872 ok
CALL 41 start=6001 reply=6014 ok
CALL 42 start=6159 reply=6172 ok
CALL 43 start=6308 reply=6320 ok
CALL 44 start=6450 reply=6462 ok
CALL 45 start=6608 reply=6620 ok
CALL 46 start=6750 reply=6763 ok
CALL 47 start=6907 reply=6919 ok
CALL 48 start=7065 reply=7077 ok
CALL 49 start=7207 reply=7219 ok
CALL 50 start=7356 reply=7368 ok
CALL 51 start=7514 reply=7526 ok
CALL 52 start=7655 reply=7668 ok
CALL 53 start=7813 reply=7825 ok
CALL 54 start=7954 reply=7967 ok
CALL 55 start=8112 reply=8125 ok
CALL 56 start=8253 reply=8265 ok
CALL 57 start=8403 reply=8416 ok
CALL 58 start=8561 reply=8573 ok
CALL 59 start=8703 reply=8716 ok
CALL 60 start=8861 reply=8873 ok
CALL 61 start=9003 reply=9016 ok
CALL 62 start=9161 reply=9173 ok
CALL 63 start=9304 reply=9316 ok
CALL 64 start=9461 reply=9473 ok
CALL 65 start=9603 reply=9615 ok
CALL 66 start=9760 reply=9773 ok
CALL 67 start=9902 reply=9914 ok
CALL 68 start=10060 reply=10072 ok
CALL 69 start=10202 reply=10214 ok
CALL 70 start=10356 reply=10368 ok
CALL 71 start=10513 reply=10525 ok
CALL 72 start=10656 reply=10668 ok
CALL 73 start=10814 reply=10826 ok
CALL 74 start=10956 reply=10968 ok
CALL 75 start=11113 reply=11126 ok
CALL 76 start=11253 reply=11265 ok
CALL 77 start=11403 reply=11417 ok
CALL 78 start=11560 reply=11573 ok
CALL 79 start=11702 reply=11714 ok
CALL 80 start=11860 reply=11872 ok
CALL 81 start=12002 reply=12018 ok
CALL 82 start=12159 reply=12172 ok
CALL 83 start=12308 reply=12320 ok
CALL 84 start=12450 reply=12462 ok
CALL 85 start=12608 reply=12621 ok
CALL 86 start=12750 reply=12763 ok
CALL 87 start=12908 reply=12920 ok
CALL 88 start=13050 reply=13062 ok
CALL 89 start=13208 reply=13220 ok
CALL 90 start=13356 reply=13368 ok
CALL 91 start=13514 reply=13525 ok
CALL 92 start=13656 reply=13669 ok
CALL 93 start=13813 reply=13826 ok
CALL 94 start=13956 reply=13968 ok
CALL 95 start=14113 reply=14126 ok
CALL 96 start=14253 reply=14265 ok
CALL 97 start=14402 reply=14415 ok
CALL 98 start=14561 reply=14573 ok
CALL 99 start=14703 reply=14716 ok
CALL 100 start=14860 reply=14873 ok
CALL 101 start=15003 reply=15015 ok
CALL 102 start=15160 reply=15172 ok
CALL 103 start=15309 reply=15321 ok
CALL 104 start=15451 reply=15464 ok
CALL 105 start=15609 reply=15621 ok
CALL 106 start=15751 reply=15763 ok
CALL 107 start=15908 reply=15921 ok
CALL 108 start=16050 reply=16062 ok
CALL 109 start=16208 reply=16220 ok
CALL 110 start=16356 reply=16368 ok
CALL 111 start=16513 reply=16525 ok
CALL 112 start=16655 reply=16668 ok
CALL 113 start=16813 reply=16825 ok
CALL 114 start=16955 reply=16967 ok
CALL 115 start=17113 reply=17125 ok
CALL 116 start=17253 reply=17265 ok
CALL 117 start=17403 reply=17417 ok
CALL 118 start=17561 reply=17573 ok
CALL 119 start=17703 reply=17715 ok
CALL 120 start=17860 reply=17872 ok
RECORD UP-RACE-A page-files=1
RACE P=1735 ms from ready; calls=120
RECORD R17-UP-RACE-A first-refusal-after-P=-82 ms
ROW UP-RACE-A FAIL: 98 call(s) started at or after P + 1 000 ms answered ok
ROW R17B-UP-RACE-A FAIL (as R17 R17-UP-RACE-A; 1 verdict line)
2026-10-27T07:09:10.603Z s9-win: CARRIED R17B-UP-DEVT as R17 block r17-up-devt
2026-10-27T07:09:11.699Z s9-win: LEG S11 open: my check window 48434556 - the only window carrying this call's marker (after 1046 ms), its address bar on the marker URL
2026-10-27T07:09:11.701Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:09:12.364Z s9-win: window 48434556 now shows http://127.0.0.1:8081/s11-upload.html?s11=xwin
CHECK setup x PASS: opened T2288
STATECOMPAT nothing missing
2026-10-27T07:09:13.252Z s9-win: READY seen for UP-DEVT
2026-10-27T07:09:15.086Z s9-win: KEY F12 pressed into window 48434556
2026-10-27T07:09:15.145Z s9-win: READY seen for UP-DEVT-done
2026-10-27T07:09:16.956Z s9-win: KEY F12 pressed into window 48434556
2026-10-27T07:09:17.212Z ROW UP-DEVT wait-safety reached safety armed=true evaluate=true blockedCount=0 after 0 ms (wanted {"armed":true,"evaluate":true,"blockedCount":0})
ANSWER UP-DEVT control1 ok
ANSWER UP-DEVT upload ok
ANSWER UP-DEVT control2 ok
ROW R17-UP-DEVT NOT MEASURED: DevTools was not attached
2026-10-27T07:09:17.453Z s9-win: window 48434556 closed
ROW R17B-UP-DEVT NOT MEASURED (as R17 R17-UP-DEVT; 1 verdict line)
2026-10-27T07:09:17.695Z s9-win: CARRIED R17B-RESTORE as R17 block rd-restore
2026-10-27T07:09:17.791Z s9-win: toolbar buttons named 'Chrome Agent Bridge…': 1 after 43 ms (window 1936 px) -> pinned=true
2026-10-27T07:09:17.841Z s9-win: ACTION name "Chrome Agent Bridge — armed (click to turn off)" (+1 further line(s) not shown) class 'ToolbarActionView'
2026-10-27T07:09:17.888Z s9-win: PARK cursor at (1924,181) in W's page area (before the click guards)
2026-10-27T07:09:17.968Z s9-win: CLICK 'Chrome Agent Bridge — armed (click to turn off)' at (3691,63)
2026-10-27T07:09:17.972Z s9-win: PARK cursor at (1924,181) in W's page area (after the click)
2026-10-27T07:09:17.975Z s9-win: PRESS button 1/1 at 2026-10-27T07:09:17.974Z
2026-10-27T07:09:18.047Z s9-win: TITLE ok after 68 ms: "Chrome Agent Bridge — OFF: agents are refused (click to turn on)"
2026-10-27T07:09:19.493Z s9-win: PARK cursor at (1924,181) in W's page area (before the click guards)
2026-10-27T07:09:19.560Z s9-win: CLICK 'Chrome Agent Bridge — OFF: agents are refused (click to turn on)' at (3691,63)
2026-10-27T07:09:19.564Z s9-win: PARK cursor at (1924,181) in W's page area (after the click)
2026-10-27T07:09:19.566Z s9-win: PRESS button 1/1 at 2026-10-27T07:09:19.566Z
2026-10-27T07:09:19.634Z s9-win: TITLE ok after 66 ms: "Chrome Agent Bridge — armed (click to turn off)"
2026-10-27T07:09:19.688Z s9-win: ACTION name "Chrome Agent Bridge — armed (click to turn off)" (+1 further line(s) not shown) class 'ToolbarActionView'
2026-10-27T07:09:19.695Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:09:20.679Z s9-win: window 16191248 now shows about:blank
2026-10-27T07:09:20.695Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:09:21.381Z s9-win: window 16191248 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:09:21.510Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=1
2026-10-27T07:09:22.424Z s9-win: BOX uploadfolders set (0 non-blank line(s); saved; text withheld)
2026-10-27T07:09:22.432Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:09:23.119Z s9-win: window 16191248 now shows about:blank
2026-10-27T07:09:23.141Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:09:23.809Z s9-win: window 16191248 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:09:23.931Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T07:09:23.933Z s9-win: RESTORE uploadfolders lines=0 hash=equal
2026-10-27T07:09:23.941Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:09:24.618Z s9-win: window 16191248 now shows about:blank
2026-10-27T07:09:24.640Z s9-win: PARK cursor at (1924,181) in W's page area (before the omnibox foreground/focus guard)
2026-10-27T07:09:25.311Z s9-win: window 16191248 now shows chrome-extension://cpnemjbgecfbeicldpaaegbhjgjgjfep/options.html
2026-10-27T07:09:25.435Z s9-win: STATE armed=true evaluate=true blocklist lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 uploadfolders lines=0 sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
2026-10-27T07:09:25.681Z ROW RD-RESTORE wait-safety reached safety armed=true evaluate=true blockedCount=0 after 1 ms (wanted {"armed":true,"evaluate":true,"blockedCount":0})
2026-10-27T07:09:25.744Z s9-win: ACTION name "Chrome Agent Bridge — armed (click to turn off)" (+1 further line(s) not shown) class 'ToolbarActionView'
2026-10-27T07:09:25.746Z s9-win: RESTORE read-back: stored page equal true, daemon.status equal true, title armed true
2026-10-27T07:09:25.752Z s9-win: RESTORE ok: the found texts (outside the repo) deleted after the read-back matched
RESTORE armed=equal evaluate=equal blocklist lines=0 hash=equal uploadfolders lines=0 hash=equal
CHECK UP-RESTORE stored PASS: armed, evaluate, block list and Upload folders equal to UP-0 by count and hash
CHECK UP-RESTORE daemon PASS: daemon.status armed and evaluate equal the found state
ROW UP-RESTORE PASS: armed, evaluate, block list and Upload folders equal to UP-0 by count and hash
EXPR rules ok len=103
2026-10-27T07:09:27.016Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:09:29.775Z s9-win: PARK cursor at (1924,181) in W's page area (console prompt)
2026-10-27T07:09:30.508Z s9-win: CONSOLE rules submitted
RULES 0
ROW RULES PASS: RULES 0
ROW R17B-RESTORE PASS (as R17 RD-RESTORE; 2 verdict lines)
2026-10-27T07:09:32.310Z s9-win: CARRIED R17B-LOGS as R17 block rd-logs
2026-10-27T07:09:33.199Z s9-win: worker console: 770 texts written to <PROFILE>\AppData\Local\Temp\bridge-e2e\s11b-r17b-2\console.txt (not printed; Console tab found: True)
CONSOLE window-title lines dropped=3
SCAN console: ://=0 (fixture 0, other 0) token=0 localhost:8085=0 aaaaaaaaaaaaaaaaaaaaaaaa=0 bank.example=0 alias7=0 sock127=0 sentinel=0 profile=0
ROW RD-LOGS PASS: all counts zero
CONSOLE chrome-blocked lines redacted=0
SCAN daemon: ://=0 (fixture 0, other 0) token=0 localhost:8085=0 aaaaaaaaaaaaaaaaaaaaaaaa=0 bank.example=0 alias7=0 sock127=0 sentinel=0 profile=0
ROW RD-LOGS PASS: all counts zero
2026-10-27T07:09:34.097Z s9-win: RD-LOGS actors: no actor ran in this slice; nothing to scan
ROW R17B-LOGS PASS (as R17 RD-LOGS; 2 verdict lines)
