/*
  Step 12 S7-helpers-a (Run 19) fixture script: the file-chooser page of docs/e2e-test-plan.md section 4.27 (part B's fixture
  pages), selected by the query `s12=` (c1, label, none, picker, single, dir, dis, late49, late51, human, frame). It builds the
  query's elements and reports through window.__s12ch = {clicks, change, files, bytes, bytesEqual, late}: clicks = click gestures on
  the opener (a button or the label; a click within 50 ms of a counted one is its own activation, not counted), change = change
  events of any file input (the frame's too), files = file count over every file input read live, bytes = size of the first file of
  the last change, bytesEqual = a page-computed SHA-256 of that file against `#sum=<hex>` in the URL hash (null without a hash),
  late = "no" until a late opener runs, then "yes" (click() returned) or "error" (it threw). Names and digests never leave the page.
*/
(function () {
  "use strict";
  var q = new URLSearchParams(location.search).get("s12");
  var sum = (/(?:^#|&)sum=([0-9a-f]+)/i.exec(location.hash) || [])[1] || null;
  var R = (window.__s12ch = { clicks: 0, change: 0, bytes: null, bytesEqual: null, late: "no" });
  function allInputs() {
    var all = Array.prototype.slice.call(document.querySelectorAll("input[type=file]"));
    var f = document.querySelector("iframe");
    try { if (f && f.contentDocument) all = all.concat(Array.prototype.slice.call(f.contentDocument.querySelectorAll("input[type=file]"))); } catch (e) { /* cross-origin */ }
    return all;
  }
  Object.defineProperty(R, "files", { enumerable: true, get: function () { return allInputs().reduce(function (n, i) { return n + i.files.length; }, 0); } });
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
  window.__s12chChange = function (input) {
    R.change++;
    var file = input.files[0];
    if (!file) return;
    R.bytes = file.size;
    if (sum) file.arrayBuffer().then(function (b) { return crypto.subtle.digest("SHA-256", b); }).then(function (d) { R.bytesEqual = hex(d) === sum.toLowerCase(); });
  };
  var last = 0;
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("#open, #lab") : null;
    if (!t || Date.now() - last < 50) return;
    last = Date.now();
    R.clicks++;
  }, true);
  document.addEventListener("change", function (e) { if (e.target && e.target.type === "file") window.__s12chChange(e.target); }, true);

  var VIS = '<p><input id="vis" type="file" /></p>';
  var BTN = '<button id="open">Open chooser</button>';
  var HID = '<input id="in" type="file" hidden />';
  var BODY = {
    c1: BTN + HID + VIS,
    label: '<label id="lab" for="in2">Pick files</label><input id="in2" type="file" multiple />',
    none: BTN + VIS,
    picker: BTN,
    single: BTN + '<input id="in" type="file" hidden />' + VIS,
    dir: BTN + '<input id="in" type="file" webkitdirectory hidden />',
    dis: BTN + '<input id="in" type="file" disabled />',
    late49: BTN + HID,
    late51: BTN + HID,
    human: BTN + '<input id="second" type="file" />',
    frame: '<iframe src="s12-chooser-frame.html" width="400" height="120"></iframe>',
  };
  document.body.insertAdjacentHTML("beforeend", BODY[q] || "");
  var open = document.getElementById("open");
  var input = document.getElementById("in");
  if (!open) return;
  if (q === "picker") open.addEventListener("click", function () { try { window.showOpenFilePicker().catch(function () {}); } catch (e) { /* none */ } });
  else if (q === "late49" || q === "late51") {
    open.addEventListener("click", function () {
      setTimeout(function () { try { input.click(); R.late = "yes"; } catch (e) { R.late = "error"; } }, q === "late49" ? 4900 : 5100);
    });
  } else if (input) open.addEventListener("click", function () { input.click(); });
})();
