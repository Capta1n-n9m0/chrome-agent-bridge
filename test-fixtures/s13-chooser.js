/*
  Step 13 S5-helpers (Run 20) fixture script, selected by the query `s13=`:
    kept    a button #open that clicks a hidden file input #in (R20-CHOOSE-KEPT: two chooser uploads on one load);
    disflip a button #open whose handler is `in.click(); in.disabled = true;` (the input is enabled at the click and disabled when read);
    disself a visible file input #dis that is disabled from the start (the call targets the input itself, css:#dis);
    disbtn  a button #open that clicks #in, an input disabled from the start (Run 19's `dis` shape; the baseline, opens nothing).
  Reporter window.__s13ch = {clicks, input, change, cancel, files, size, digest}: clicks = click gestures on #open (a click within 50 ms
  of a counted one is its own activation, not counted); input, change, cancel = those events on any file input, cumulative on the load;
  files = file count over every file input, read live; size = byte size of the first file of the last change; digest = a page-computed
  SHA-256 (hex) of that file, null until read. Names and contents never leave the page; the driver prints counts and yes/no only.
*/
(function () {
  "use strict";
  var q = new URLSearchParams(location.search).get("s13");
  var R = (window.__s13ch = { clicks: 0, input: 0, change: 0, cancel: 0, size: null, digest: null });
  Object.defineProperty(R, "files", {
    enumerable: true,
    get: function () {
      return Array.prototype.slice.call(document.querySelectorAll("input[type=file]")).reduce(function (n, i) { return n + i.files.length; }, 0);
    },
  });
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
  var last = 0;
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("#open") : null;
    if (!t || Date.now() - last < 50) return;
    last = Date.now();
    R.clicks++;
  }, true);
  ["input", "cancel"].forEach(function (name) {
    document.addEventListener(name, function (e) { if (e.target && e.target.type === "file") R[name]++; }, true);
  });
  document.addEventListener("change", function (e) {
    if (!e.target || e.target.type !== "file") return;
    R.change++;
    var file = e.target.files[0];
    if (!file) return;
    R.size = file.size;
    file.arrayBuffer().then(function (b) { return crypto.subtle.digest("SHA-256", b); }).then(function (d) { R.digest = hex(d); });
  }, true);

  var BTN = '<button id="open">Open chooser</button>';
  var BODY = {
    kept: BTN + '<input id="in" type="file" hidden />',
    disflip: BTN + '<input id="in" type="file" hidden />',
    disself: '<p><input id="dis" type="file" disabled /></p>',
    disbtn: BTN + '<input id="in" type="file" disabled />',
  };
  document.body.insertAdjacentHTML("beforeend", BODY[q] || "");
  var open = document.getElementById("open");
  var input = document.getElementById("in");
  if (!open || !input) return;
  if (q === "disflip") open.addEventListener("click", function () { input.click(); input.disabled = true; });
  else open.addEventListener("click", function () { input.click(); });
})();
