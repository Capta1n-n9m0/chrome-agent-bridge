/*
  Step 11 S5 (Run 16) fixture script: the page's own reporter for the upload rows (docs/e2e-test-plan.md section 4.23).
  Written 2026-10-25 by the S5 prep builder, before any Run 16 row ran. It lives in a file of its own (not inline) so
  the same page works under `Content-Security-Policy: script-src 'self'` (row UP-8, port 8084). Nothing here fetches,
  stores or sends anything; it only records what the page itself receives.

  window.__s11 (read through `evaluate` by the S5 helper recipe):
    version              "s11-1"
    state()              { version, inputs: { <input id>: { files, names, sizes, sha256, errors, changeEvents,
                           inputEvents, trusted } }, pending, marks: { events, final }, totals: { files,
                           changeEvents, inputEvents }, patchedCalls, arrivedAfterNav }
                           - files: input.files.length read live; names/sizes/sha256/errors: from the last `change`
                             (sha256 by FileReader + crypto.subtle: 127.0.0.1 and localhost are secure contexts);
                           - trusted: event.isTrusted of every `change`;
                           - pending: file reads still running (wait for 0 before judging);
                           - marks.events: every mutation of the bridge's one-off upload attribute, seen by a
                             MutationObserver on the document, every open shadow root and every same-origin frame:
                             { op: "added" | "removed" | "changed", on: <element id> };
                           - marks.final: how many elements carry the attribute NOW (deep count);
                           - patchedCalls: calls to a patched Element.prototype.getAttribute (s11-patched.html), else null.
    markCount()          the deep count alone
    reset()              clears every recorded event and every input's files (no change event is fired)
  The attribute name and the original prototype methods are cached at load, before any page script patches them.
*/
(function () {
  "use strict";
  var MARK = "data-__bridge-upload";
  var hasAttr = Element.prototype.hasAttribute;
  var S = { inputs: {}, events: [], pending: 0, arrivedAfterNav: false, gen: 0 };
  var observed = [];
  var navOnMark = /[?&]nav=1(&|$)/.test(location.search);
  S.arrivedAfterNav = /[?&]s11=nav-after(&|$)/.test(location.search);

  function rec(id) {
    if (!S.inputs[id]) {
      S.inputs[id] = { names: [], sizes: [], sha256: [], errors: [], changeEvents: 0, inputEvents: 0, trusted: [], gen: 0, input: null };
    }
    return S.inputs[id];
  }

  function hex(buf) {
    var b = new Uint8Array(buf);
    var out = "";
    for (var i = 0; i < b.length; i++) out += (b[i] < 16 ? "0" : "") + b[i].toString(16);
    return out;
  }

  function hashFile(file, done) {
    var reader = new FileReader();
    reader.onerror = function () {
      done(null, (reader.error && reader.error.name) || "ReadError");
    };
    reader.onload = function () {
      crypto.subtle.digest("SHA-256", reader.result).then(
        function (d) {
          done(hex(d), null);
        },
        function (e) {
          done(null, (e && e.name) || "DigestError");
        },
      );
    };
    try {
      reader.readAsArrayBuffer(file);
    } catch (e) {
      done(null, (e && e.name) || "ReadError");
    }
  }

  function onChange(input, e) {
    var r = rec(input.id);
    r.changeEvents++;
    r.trusted.push(e.isTrusted === true);
    var list = Array.prototype.slice.call(input.files || []);
    r.gen++;
    var gen = r.gen;
    r.names = list.map(function (f) {
      return f.name;
    });
    r.sizes = list.map(function (f) {
      return f.size;
    });
    r.sha256 = list.map(function () {
      return null;
    });
    r.errors = list.map(function () {
      return null;
    });
    list.forEach(function (f, i) {
      S.pending++;
      hashFile(f, function (sha, err) {
        S.pending--;
        if (r.gen !== gen) return; // a later change replaced this list
        r.sha256[i] = sha;
        r.errors[i] = err;
        paint();
      });
    });
    paint();
  }

  function attachInput(input) {
    if (!input || !input.id || rec(input.id).input === input) return;
    rec(input.id).input = input;
    input.addEventListener("change", function (e) {
      onChange(input, e);
    });
    input.addEventListener("input", function () {
      rec(input.id).inputEvents++;
    });
  }

  function onMarks(records) {
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.attributeName !== MARK) continue;
      var now = hasAttr.call(r.target, MARK);
      var op = r.oldValue === null && now ? "added" : r.oldValue !== null && !now ? "removed" : "changed";
      S.events.push({ op: op, on: r.target.id || String(r.target.localName) });
      if (op === "added" && navOnMark) {
        // UP-NAV: the page leaves the moment the bridge marks its input (the sweep must not follow it).
        setTimeout(function () {
          location.replace(location.pathname + "?s11=nav-after");
        }, 0);
      }
    }
  }

  function observe(root) {
    if (observed.indexOf(root) >= 0) return;
    observed.push(root);
    new MutationObserver(onMarks).observe(root, { attributes: true, attributeFilter: [MARK], attributeOldValue: true, subtree: true });
  }

  function walk(root, fn) {
    var all = root.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      fn(el);
      if (el.shadowRoot) walk(el.shadowRoot, fn);
      if (String(el.localName) === "iframe") {
        var doc = null;
        try {
          doc = el.contentDocument;
        } catch (e) {
          doc = null;
        }
        if (doc) walk(doc, fn);
      }
    }
  }

  function markCount() {
    var n = 0;
    walk(document, function (el) {
      if (hasAttr.call(el, MARK)) n++;
    });
    return n;
  }

  function state() {
    var inputs = {};
    var totals = { files: 0, changeEvents: 0, inputEvents: 0 };
    Object.keys(S.inputs).forEach(function (id) {
      var r = S.inputs[id];
      var files = r.input && r.input.files ? r.input.files.length : 0;
      inputs[id] = { files: files, names: r.names.slice(), sizes: r.sizes.slice(), sha256: r.sha256.slice(), errors: r.errors.slice(), changeEvents: r.changeEvents, inputEvents: r.inputEvents, trusted: r.trusted.slice() };
      totals.files += files;
      totals.changeEvents += r.changeEvents;
      totals.inputEvents += r.inputEvents;
    });
    return {
      version: "s11-1",
      inputs: inputs,
      pending: S.pending,
      marks: { events: S.events.slice(), final: markCount() },
      totals: totals,
      patchedCalls: typeof window.__s11PatchedCalls === "number" ? window.__s11PatchedCalls : null,
      arrivedAfterNav: S.arrivedAfterNav,
    };
  }

  function paint() {
    var el = document.getElementById("s11-report");
    if (!el) return;
    var s = state();
    var lines = [];
    Object.keys(s.inputs).forEach(function (id) {
      var i = s.inputs[id];
      lines.push(id + ": files " + i.files + ", change " + i.changeEvents + (i.names.length ? ", " + i.names.join(" ") : ""));
    });
    lines.push("pending " + s.pending + ", marks now " + s.marks.final);
    el.textContent = lines.join("\n");
  }

  function reset() {
    S.events = [];
    S.gen++;
    Object.keys(S.inputs).forEach(function (id) {
      var r = S.inputs[id];
      r.names = [];
      r.sizes = [];
      r.sha256 = [];
      r.errors = [];
      r.changeEvents = 0;
      r.inputEvents = 0;
      r.trusted = [];
      r.gen++;
      if (r.input) r.input.value = "";
    });
    paint();
  }

  function buildShadow() {
    var host = document.getElementById("up-shadow-host");
    if (!host || host.shadowRoot) return;
    var root = host.attachShadow({ mode: "open" });
    var label = document.createElement("label");
    label.textContent = "Shadow file ";
    var input = document.createElement("input");
    input.type = "file";
    input.id = "up-shadow-input";
    label.appendChild(input);
    root.appendChild(label);
    observe(root);
    attachInput(input);
  }

  function wireFrame() {
    var frame = document.getElementById("up-frame");
    if (!frame) return;
    function go() {
      var doc = frame.contentDocument;
      if (!doc) return;
      observe(doc);
      attachInput(doc.getElementById("up-frame-input"));
    }
    if (frame.contentDocument && frame.contentDocument.readyState === "complete" && frame.contentDocument.getElementById("up-frame-input")) go();
    frame.addEventListener("load", go);
  }

  function boot() {
    observe(document);
    var inputs = document.querySelectorAll('input[type="file"]');
    for (var i = 0; i < inputs.length; i++) attachInput(inputs[i]);
    attachInput(document.getElementById("up-text")); // UP-6B: the text step has its own change/input record (no files)
    buildShadow();
    wireFrame();
    paint();
  }

  window.__s11 = { version: "s11-1", state: state, markCount: markCount, reset: reset };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
