/* Step 11 S5 (Run 16) row UP-PATCH: patches Element.prototype.getAttribute after the reporter cached what it needs. */
(function () {
  "use strict";
  var calls = 0;
  Element.prototype.getAttribute = function () {
    calls++;
    return null;
  };
  Object.defineProperty(window, "__s11PatchedCalls", {
    configurable: true,
    get: function () {
      return calls;
    },
  });
})();
