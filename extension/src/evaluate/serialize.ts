import type { EvalEnvelope } from "@bridge/shared";

/** Caps the serialiser applies. The handler passes these explicitly so page and tests agree. */
export interface SerializeLimits {
  /** Nesting levels below the root that are expanded; deeper values become `[Object]`/`[Array(N)]`. */
  maxDepth: number;
  /** Items kept per array / object / Map / Set before a `… N more` sentinel. */
  maxItems: number;
  /** Characters kept per string before a `…[+N chars]` suffix. */
  maxString: number;
}

export const DEFAULT_LIMITS: SerializeLimits = { maxDepth: 6, maxItems: 100, maxString: 5000 };

/**
 * The in-page serialiser. **Self-contained on purpose**: it is shipped to the page as
 * `String(serializerFn)` and run via CDP `Runtime.callFunctionOn` with `this` = the page object, so it
 * may not close over anything in this module (no imports, no shared helpers, no `chrome.*`). The
 * self-containment test in `extension/test/evaluate-serialize.test.ts` guards that.
 *
 * Why it exists: `Runtime.evaluate {returnByValue:true}` JSON-serialises in the page, which turns a
 * DOM node, a Map and a class instance all into `{}` and errors out on cycles. This walk keeps the
 * shape an agent can act on and never calls page-defined `toJSON`/`valueOf`.
 */
function serializerFn(this: unknown, limits: SerializeLimits): EvalEnvelope {
  const maxDepth = limits.maxDepth;
  const maxItems = limits.maxItems;
  const maxString = limits.maxString;
  let truncated = false;
  const seen: unknown[] = [];

  // Page code can redefine anything, so every probe is wrapped.
  function tagOf(x: unknown): string {
    try {
      return Object.prototype.toString.call(x);
    } catch {
      return "[object Unknown]";
    }
  }
  function str(x: unknown): string {
    try {
      return String(x);
    } catch {
      return "[unprintable]";
    }
  }
  function ctorName(x: unknown): string {
    try {
      const proto = Object.getPrototypeOf(x as object);
      const name = proto && proto.constructor && proto.constructor.name;
      return typeof name === "string" ? name : "";
    } catch {
      return "";
    }
  }
  function cutString(s: string): string {
    if (s.length <= maxString) return s;
    truncated = true;
    return s.slice(0, maxString) + "…[+" + (s.length - maxString) + " chars]";
  }
  function isNode(x: any): boolean {
    try {
      return !!x && typeof x.nodeType === "number" && typeof x.nodeName === "string";
    } catch {
      return false;
    }
  }
  function isWindow(x: any): boolean {
    try {
      return !!x && x.window === x && !!x.document;
    } catch {
      return false;
    }
  }
  function isErrorLike(x: any, tag: string): boolean {
    if (tag === "[object Error]" || tag === "[object DOMException]") return true;
    try {
      if (x instanceof Error) return true;
    } catch {
      /* cross-realm or poisoned prototype */
    }
    if (ctorName(x) === "DOMException") return true;
    try {
      return typeof x.name === "string" && typeof x.message === "string" && typeof x.stack === "string";
    } catch {
      return false;
    }
  }
  function isTypedArray(tag: string): boolean {
    return /^\[object (Int8|Uint8|Uint8Clamped|Int16|Uint16|Int32|Uint32|Float32|Float64|BigInt64|BigUint64)Array\]$/.test(tag);
  }
  function isArrayLike(x: any, tag: string): boolean {
    if (Array.isArray(x)) return true;
    if (!/^\[object (NodeList|HTMLCollection|Arguments|DOMTokenList|FileList|HTMLAllCollection|NamedNodeMap)\]$/.test(tag)) return false;
    try {
      return typeof x.length === "number";
    } catch {
      return false;
    }
  }

  function describeNode(n: any): string {
    let type = 0;
    try {
      type = n.nodeType;
    } catch {
      /* ignore */
    }
    if (type === 3 || type === 4 || type === 8) return cutString(str(n.nodeValue == null ? "" : n.nodeValue));
    if (type === 9) {
      let url = "";
      try {
        url = str(n.URL || (n.location && n.location.href) || "");
      } catch {
        /* ignore */
      }
      return "#document " + url;
    }
    if (type === 11) return "#document-fragment";
    let out = "<";
    try {
      out += str(n.tagName || n.nodeName).toLowerCase();
    } catch {
      out += "?";
    }
    try {
      if (typeof n.id === "string" && n.id) out += ' id="' + n.id + '"';
    } catch {
      /* ignore */
    }
    try {
      if (typeof n.className === "string" && n.className) out += ' class="' + n.className + '"';
    } catch {
      /* ignore */
    }
    out += ">";
    let text = "";
    try {
      text = str(n.textContent == null ? "" : n.textContent).replace(/\s+/g, " ").trim();
    } catch {
      /* ignore */
    }
    if (text) out += ' "' + (text.length > 80 ? text.slice(0, 80) + "…" : text) + '"';
    return out;
  }

  function describeError(e: any): string {
    let name = "Error";
    let message = "";
    let stack = "";
    try {
      if (typeof e.name === "string" && e.name) name = e.name;
    } catch {
      /* ignore */
    }
    try {
      message = str(e.message == null ? "" : e.message);
    } catch {
      /* ignore */
    }
    try {
      stack = typeof e.stack === "string" ? e.stack : "";
    } catch {
      /* ignore */
    }
    const head = message ? name + ": " + message : name;
    const frames = stack
      .split("\n")
      .filter(function (line) {
        return /^\s*at\s/.test(line);
      })
      .slice(0, 5);
    return frames.length ? head + "\n" + frames.join("\n") : head;
  }

  function walk(v: any, depth: number): unknown {
    if (v === null) return null;
    const t = typeof v;
    if (t === "undefined") return "undefined";
    if (t === "boolean") return v;
    if (t === "number") return isFinite(v) ? v : str(v);
    if (t === "string") return cutString(v);
    if (t === "bigint") return str(v) + "n";
    if (t === "symbol") return str(v);
    if (t === "function") {
      let name = "";
      try {
        name = typeof v.name === "string" ? v.name : "";
      } catch {
        /* ignore */
      }
      return "[Function: " + (name || "anonymous") + "]";
    }
    if (seen.indexOf(v) !== -1) {
      truncated = true;
      return "[Circular]";
    }
    const tag = tagOf(v);
    if (isNode(v)) return describeNode(v);
    if (isWindow(v)) {
      let url = "";
      try {
        url = str(v.location && v.location.href);
      } catch {
        /* ignore */
      }
      return "Window " + url;
    }
    if (isErrorLike(v, tag)) return describeError(v).split("\n")[0];
    if (tag === "[object Date]") {
      try {
        return v.toISOString();
      } catch {
        return "[Invalid Date]";
      }
    }
    if (tag === "[object RegExp]") return str(v);
    if (tag === "[object ArrayBuffer]" || tag === "[object SharedArrayBuffer]") {
      let n = 0;
      try {
        n = v.byteLength;
      } catch {
        /* ignore */
      }
      return (ctorName(v) || "ArrayBuffer") + "(" + n + ")";
    }
    if (isTypedArray(tag) || tag === "[object DataView]") {
      let n = 0;
      try {
        n = typeof v.length === "number" ? v.length : v.byteLength;
      } catch {
        /* ignore */
      }
      return (ctorName(v) || "TypedArray") + "(" + n + ")";
    }

    const arrayLike = isArrayLike(v, tag);
    if (depth > maxDepth) {
      truncated = true;
      if (arrayLike) {
        let n = 0;
        try {
          n = v.length;
        } catch {
          /* ignore */
        }
        return "[Array(" + n + ")]";
      }
      return "[Object]";
    }

    if (arrayLike) {
      let len = 0;
      try {
        len = v.length;
      } catch {
        /* ignore */
      }
      const out: unknown[] = [];
      seen.push(v);
      const keep = len < maxItems ? len : maxItems;
      for (let i = 0; i < keep; i++) {
        try {
          out.push(walk(v[i], depth + 1));
        } catch (err: any) {
          out.push("[Threw: " + str(err && err.message) + "]");
        }
      }
      seen.pop();
      if (len > keep) {
        truncated = true;
        out.push("… " + (len - keep) + " more");
      }
      return out;
    }

    if (tag === "[object Map]") {
      const entries: unknown[] = [];
      let total = 0;
      seen.push(v);
      try {
        v.forEach(function (val: unknown, key: unknown) {
          total++;
          if (entries.length < maxItems) entries.push([walk(key, depth + 1), walk(val, depth + 1)]);
        });
      } catch {
        /* a poisoned or exotic Map */
      }
      seen.pop();
      if (total > entries.length) {
        truncated = true;
        entries.push("… " + (total - entries.length) + " more");
      }
      return { __type: "Map", entries };
    }

    if (tag === "[object Set]") {
      const values: unknown[] = [];
      let total = 0;
      seen.push(v);
      try {
        v.forEach(function (val: unknown) {
          total++;
          if (values.length < maxItems) values.push(walk(val, depth + 1));
        });
      } catch {
        /* a poisoned or exotic Set */
      }
      seen.pop();
      if (total > values.length) {
        truncated = true;
        values.push("… " + (total - values.length) + " more");
      }
      return { __type: "Set", values };
    }

    let keys: string[] = [];
    try {
      keys = Object.keys(v);
    } catch {
      /* ignore */
    }
    const out: Record<string, unknown> = {};
    seen.push(v);
    const keep = keys.length < maxItems ? keys.length : maxItems;
    for (let i = 0; i < keep; i++) {
      const k = keys[i];
      // Only own enumerable props: a class's getters live on the prototype and are never invoked.
      // An own accessor that throws must not sink the whole walk.
      try {
        out[k] = walk(v[k], depth + 1);
      } catch (err: any) {
        out[k] = "[Threw: " + str(err && err.message) + "]";
      }
    }
    seen.pop();
    if (keys.length > keep) {
      truncated = true;
      out["…"] = "… " + (keys.length - keep) + " more";
    }
    return out;
  }

  const root: any = this;
  const rootTag = tagOf(root);

  if (typeof root === "function") {
    const src = str(root);
    return { kind: "function", description: src.length > 200 ? src.slice(0, 200) + "…" : src, truncated: src.length > 200 };
  }
  if (root !== null && typeof root === "object") {
    if (isErrorLike(root, rootTag)) return { kind: "error", description: describeError(root), truncated: false };
    if (isNode(root)) return { kind: "node", description: describeNode(root), truncated };
    if (isWindow(root)) {
      let url = "";
      try {
        url = str(root.location && root.location.href);
      } catch {
        /* ignore */
      }
      return { kind: "node", description: "Window " + url, truncated: false };
    }
  }

  const value = walk(root, 0);
  let description: string;
  try {
    description = value === undefined ? "undefined" : JSON.stringify(value, null, 2);
  } catch {
    description = str(value);
  }
  if (typeof description !== "string") description = str(description);
  const name = ctorName(root);
  if (
    root !== null &&
    typeof root === "object" &&
    !Array.isArray(root) &&
    name &&
    name !== "Object" &&
    value !== null &&
    typeof value === "object" &&
    !("__type" in (value as Record<string, unknown>))
  ) {
    description = name + " " + description;
  }
  return { kind: "json", value, description, truncated };
}

/** The exact source injected into the page via `Runtime.callFunctionOn`. */
export const SERIALIZER_SRC: string = String(serializerFn);

/** Node-side entry point (tests, and any future in-extension use). `this` is the value. */
export function serializeForAgent(value: unknown, limits: SerializeLimits = DEFAULT_LIMITS): EvalEnvelope {
  return serializerFn.call(value, limits);
}
