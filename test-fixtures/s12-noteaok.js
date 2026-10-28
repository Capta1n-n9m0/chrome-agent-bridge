// Step 12 S7-helpers-a: loaded from http://localhost:8081 by s12-console.html?s12=noteaok (docs/e2e-test-plan.md section 4.27,
// R19-CON-NOTEA, allowed leg). One object holding an Error whose message is exactly s12-noteaok, then the sentinel alone.
(function () {
  "use strict";
  console.log({ e: new Error("s12-noteaok") });
  console.log(window.S12_SENTINEL);
})();
