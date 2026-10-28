/*
  Step 12 S7-helpers-a (Run 19) fixture script: the console page of docs/e2e-test-plan.md section 4.27, selected by the query
  `s12=`. Fixture-only text; it fetches and sends nothing. Every query sets window.__s12 = {logged, thrown} (the page's own
  reporter, counts only); window.__s12eff (the effect counter) is never set here: a row's function sets it.
  con: 10 messages (8 log, 1 warn, 1 error) then one uncaught Error from setTimeout 0. rej: one unhandled rejection and one
  handled 200 ms later. big: one 1 000 000-character string. tick: a message and an uncaught Error every 1 000 ms, times in
  __s12.ticks / __s12.excs. frame / frameoop: 2 messages and an iframe. notea / noteaok: an object holding an Error, logged by
  a script file of another host. nav: 3 messages, then 400 ms later a navigation to nav2 (2 messages). cap: 200 messages of
  2 000 characters (part B's R19-CON-CAP).
*/
(function () {
  "use strict";
  var SENTINEL = "s12sent-5f3a9c71";
  window.S12_SENTINEL = SENTINEL;
  var q = new URLSearchParams(location.search).get("s12");
  var S = (window.__s12 = { logged: 0, thrown: 0 });
  function log(kind, text) { console[kind](text); S.logged++; }
  function later(f, ms) { setTimeout(f, ms); }
  function throwLater(msg) { later(function () { S.thrown++; throw new Error(msg + " " + SENTINEL); }, 0); }
  function script(src) { var s = document.createElement("script"); s.src = src; document.head.appendChild(s); }
  function frame(src) { var f = document.createElement("iframe"); f.src = src; document.body.appendChild(f); }
  function two() { log("log", "s12-frame-1 " + SENTINEL); log("log", "s12-frame-2 " + SENTINEL); }
  if (q === "con") {
    for (var i = 1; i <= 10; i++) log(i === 9 ? "warn" : i === 10 ? "error" : "log", "s12-con-" + i + " " + SENTINEL);
    throwLater("s12-con-throw");
  } else if (q === "rej") {
    Promise.reject(new Error("s12-rej " + SENTINEL));
    var late = Promise.reject(new Error("s12-rej-late " + SENTINEL));
    S.thrown = 1;
    later(function () { late.catch(function () {}); }, 200);
  } else if (q === "big") {
    log("log", "x".repeat(1000000));
  } else if (q === "tick") {
    S.ticks = [];
    S.excs = [];
    var n = 0;
    setInterval(function () {
      n++;
      log("log", "tick " + n + " " + SENTINEL);
      S.ticks.push(Date.now());
      var k = n;
      later(function () { S.excs.push(Date.now()); S.thrown++; throw new Error("s12-exc-" + k + " " + SENTINEL); }, 0);
    }, 1000);
  } else if (q === "frame") {
    two();
    frame("http://f.s12site.localhost:8081/s12-console.html?s12=con");
  } else if (q === "frameoop") {
    two();
    frame("http://127.0.0.1:8081/s12-console.html?s12=con");
  } else if (q === "notea") {
    S.logged = 2;
    script("http://s12blk.localhost:8081/s12-notea.js");
  } else if (q === "noteaok") {
    S.logged = 2;
    script("http://localhost:8081/s12-noteaok.js");
  } else if (q === "nav") {
    for (var j = 1; j <= 3; j++) log("log", "s12-nav-" + j + " " + SENTINEL);
    later(function () { location.href = location.pathname + "?s12=nav2"; }, 400);
  } else if (q === "nav2") {
    log("log", "s12-nav2-1 " + SENTINEL);
    log("log", "s12-nav2-2 " + SENTINEL);
  } else if (q === "cap") {
    for (var c = 1; c <= 200; c++) log("log", ("s12-cap-" + c + ":" + SENTINEL).padEnd(2000, "x"));
  }
})();
