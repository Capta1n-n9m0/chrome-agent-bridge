// Step 12 S7-helpers-a: loaded from http://s12blk.localhost:8081 by s12-console.html?s12=notea (docs/e2e-test-plan.md section 4.27,
// R19-CON-NOTEA, blocked leg). Logs two objects that hold an Error: one whose message is the sentinel, one of 3 000 characters.
(function () {
  "use strict";
  var long = "s12-notea-long";
  console.log({ e: new Error("s12-notea " + window.S12_SENTINEL) });
  console.log({ e: new Error(long + "y".repeat(3000 - long.length)) });
})();
