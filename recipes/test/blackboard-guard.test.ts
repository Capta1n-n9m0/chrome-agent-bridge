// Tests for recipes/blackboard/guard.ts — the course argument, the origin guard and the flags of the
// Blackboard recipes (Step 8 S6, phase doc 0.7). Pure: nothing here connects to anything.
import { describe, expect, it } from "vitest";
import {
  ADA_ORIGIN,
  checkLoadedTab,
  checkResolverTab,
  isAdaCoursePage,
  COURSE_KEY_RE,
  courseIdFromSkillTable,
  parseCourseArg,
  refuseKeyDryRun,
  RESOLVER_PAGE,
  checkTargetUrl,
  courseUrl,
  declaredVersion,
  dryRunUrl,
  isStubSource,
  parseBbArgs,
  parseCourse,
  Refusal,
} from "../blackboard/guard.js";

describe("parseCourse", () => {
  it("accepts a course id", () => {
    expect(parseCourse("_12345_1")).toBe("_12345_1");
  });
  it("accepts an ada course URL and takes its id", () => {
    expect(parseCourse("https://ada.blackboard.com/ultra/courses/_777_1/outline")).toBe("_777_1");
    expect(parseCourse("https://ada.blackboard.com/ultra/courses/_777_1")).toBe("_777_1");
  });
  it("refuses no argument", () => {
    expect(() => parseCourse(undefined)).toThrow(Refusal);
    expect(() => parseCourse("")).toThrow(/no course/);
  });
  it("refuses a course URL on another host", () => {
    expect(() => parseCourse("https://evil.example.com/ultra/courses/_777_1/outline")).toThrow(Refusal);
    expect(() => parseCourse("http://ada.blackboard.com/ultra/courses/_777_1/outline")).toThrow(Refusal);
  });
  it("refuses anything that is not a course id", () => {
    for (const bad of ["12345", "_1_", "_a_1", "../_1_1", "_1_1/../x", "_1_1?x=1", " _1_1"]) {
      expect(() => parseCourse(bad), bad).toThrow(Refusal);
    }
  });
});

describe("target URLs", () => {
  it("builds the course outline URL on ada only", () => {
    expect(courseUrl("_9_1")).toBe(`${ADA_ORIGIN}/ultra/courses/_9_1/outline`);
  });
  it("builds a dry-run URL on the localhost fixture", () => {
    expect(dryRunUrl("_9_1", "http://localhost:8080")).toBe("http://localhost:8080/e2e-playground.html?s6=bb-dry-_9_1");
  });
  it("refuses a dry-run origin that is not localhost", () => {
    expect(() => dryRunUrl("_9_1", "https://ada.blackboard.com")).toThrow(Refusal);
    expect(() => dryRunUrl("_9_1", "http://example.com:8080")).toThrow(Refusal);
  });
});

describe("checkTargetUrl (before connecting)", () => {
  it("real mode: only https://ada.blackboard.com", () => {
    expect(() => checkTargetUrl(courseUrl("_1_1"), false)).not.toThrow();
    expect(() => checkTargetUrl("http://localhost:8080/e2e-playground.html", false)).toThrow(/ada\.blackboard\.com/);
    expect(() => checkTargetUrl("https://ada.blackboard.com.evil.com/ultra/courses/_1_1/outline", false)).toThrow(Refusal);
    expect(() => checkTargetUrl("https://other.blackboard.com/ultra/courses/_1_1/outline", false)).toThrow(Refusal);
  });
  it("dry run: only http://localhost:<port> or 127.0.0.1:<port>, never ada", () => {
    expect(() => checkTargetUrl("http://localhost:8080/e2e-playground.html?s6=bb-dry-_1_1", true)).not.toThrow();
    expect(() => checkTargetUrl("http://127.0.0.1:8081/x", true)).not.toThrow();
    expect(() => checkTargetUrl(courseUrl("_1_1"), true)).toThrow(/dry run/);
    expect(() => checkTargetUrl("http://localhost/x", true)).toThrow(Refusal); // no port
    expect(() => checkTargetUrl("https://localhost:8080/x", true)).toThrow(Refusal);
  });
  it("refuses a malformed URL", () => {
    expect(() => checkTargetUrl("not a url", false)).toThrow(Refusal);
  });
});

describe("checkLoadedTab (after the page loaded: redirects, login pages)", () => {
  it("real mode: the page must be the course on ada", () => {
    expect(() => checkLoadedTab(`${ADA_ORIGIN}/ultra/courses/_5_1/outline`, false, "_5_1")).not.toThrow();
    expect(() => checkLoadedTab(`${ADA_ORIGIN}/ultra/courses/_5_1`, false, "_5_1")).not.toThrow();
  });
  it("real mode: a login redirect or another course is refused", () => {
    expect(() => checkLoadedTab("https://login.ada.edu.az/sso?x=1", false, "_5_1")).toThrow(Refusal);
    expect(() => checkLoadedTab(`${ADA_ORIGIN}/ultra/courses/_6_1/outline`, false, "_5_1")).toThrow(/not on course/);
    expect(() => checkLoadedTab(`${ADA_ORIGIN}/ultra/courses/_5_10/outline`, false, "_5_1")).toThrow(Refusal);
    expect(() => checkLoadedTab(`${ADA_ORIGIN}/`, false, "_5_1")).toThrow(Refusal);
  });
  it("dry run: the page must be the localhost fixture opened for this course", () => {
    expect(() => checkLoadedTab("http://localhost:8080/e2e-playground.html?s6=bb-dry-_5_1", true, "_5_1")).not.toThrow();
    expect(() => checkLoadedTab("http://localhost:8080/e2e-playground.html?s6=bb-dry-_6_1", true, "_5_1")).toThrow(Refusal);
    expect(() => checkLoadedTab(`${ADA_ORIGIN}/ultra/courses/_5_1/outline`, true, "_5_1")).toThrow(Refusal);
  });
  it("refuses a non-string href (the evaluate failed)", () => {
    expect(() => checkLoadedTab(undefined, false, "_5_1")).toThrow(Refusal);
  });
  it("never puts the URL into the refusal message", () => {
    try {
      checkLoadedTab("https://login.ada.edu.az/sso?ticket=SECRET", false, "_5_1");
    } catch (err) {
      expect(String(err)).not.toContain("SECRET");
      expect(String(err)).not.toContain("login.ada.edu.az");
    }
  });
});

describe("parseBbArgs", () => {
  it("reads the course and the flags", () => {
    const a = parseBbArgs(["_1_1", "--dry-run", "--bbjs", "x.js", "--keep-open", "--overwrite", "--timeout", "90"]);
    expect(a).toMatchObject({ course: "_1_1", dryRun: true, bbjs: "x.js", keepOpen: true, overwrite: true, timeoutS: 90 });
  });
  it("defaults", () => {
    const a = parseBbArgs([]);
    expect(a.course).toBeUndefined();
    expect(a).toMatchObject({ dryRun: false, keepOpen: false, overwrite: false, mcpPlan: false, help: false });
    expect(a.fixtureOrigin).toBe("http://localhost:8080");
    expect(a.timeoutS).toBe(300);
  });
  it("refuses an unknown flag and a second positional argument", () => {
    expect(() => parseBbArgs(["--force"])).toThrow(Refusal);
    expect(() => parseBbArgs(["_1_1", "_2_1"])).toThrow(Refusal);
  });
  it("refuses a flag without its value and a bad timeout", () => {
    expect(() => parseBbArgs(["--bbjs"])).toThrow(Refusal);
    expect(() => parseBbArgs(["--timeout", "abc"])).toThrow(Refusal);
    expect(() => parseBbArgs(["--timeout", "0"])).toThrow(Refusal);
  });
  it("--help and --mcp-plan", () => {
    expect(parseBbArgs(["--help"]).help).toBe(true);
    expect(parseBbArgs(["_1_1", "--mcp-plan"]).mcpPlan).toBe(true);
  });
});

describe("bb.js source", () => {
  it("reads the declared VERSION", () => {
    expect(declaredVersion("(() => {\n  const VERSION = '2026-10-18';\n})();")).toBe("2026-10-18");
    expect(declaredVersion('const VERSION = "stub-0";')).toBe("stub-0");
    expect(declaredVersion("nothing here")).toBeNull();
  });
  it("recognises the stub", () => {
    expect(isStubSource("// BRIDGE-STUB-BB\n")).toBe(true);
    expect(isStubSource("// real\n")).toBe(false);
  });
});

// ── Added 2026-10-23 by the S6 fixer (round 1), decision #96: the user names the course by its short key
// "pp1"; the recipes resolve it on https://ada.blackboard.com by a read-only GET and never print the id.
describe("parseCourseArg (id, ada URL, or a short course key)", () => {
  it("an id or an ada URL is an id", () => {
    expect(parseCourseArg("_12345_1")).toEqual({ kind: "id", id: "_12345_1", label: "_12345_1" });
    expect(parseCourseArg("https://ada.blackboard.com/ultra/courses/_777_1/outline")).toEqual({ kind: "id", id: "_777_1", label: "_777_1" });
  });
  it("a short key (letters and digits, starting with a letter) is a key; its label is lower case", () => {
    expect(parseCourseArg("pp1")).toEqual({ kind: "key", key: "pp1", label: "pp1" });
    expect(parseCourseArg("PP1")).toEqual({ kind: "key", key: "PP1", label: "pp1" });
  });
  it("refuses every other form of a course id or key", () => {
    for (const bad of [
      "12345", "1pp", "_1_", "_a_1", "../_1_1", "_1_1?x=1", " _1_1", "pp1 ", " pp1", "pp 1", "pp1/x", "pp1?x=1",
      "courseId:pp1", "pp1.202610", "pp1-2026", "-pp1", "pp_1", "p".repeat(33), "pp1%2f", "pp1\n",
    ]) {
      expect(() => parseCourseArg(bad), JSON.stringify(bad)).toThrow(Refusal);
    }
    expect(() => parseCourseArg(undefined)).toThrow(/no course/);
    expect(() => parseCourseArg("https://evil.example.com/ultra/courses/_1_1/outline")).toThrow(Refusal);
  });
  it("COURSE_KEY_RE is the key rule", () => {
    expect(COURSE_KEY_RE.test("pp1")).toBe(true);
    expect(COURSE_KEY_RE.test("_1_1")).toBe(false);
  });
});

describe("the resolver page (a key is resolved only on ada)", () => {
  it("is a JSON API page on ada with no course in it", () => {
    expect(RESOLVER_PAGE).toBe("https://ada.blackboard.com/learn/api/public/v1/system/version");
    expect(() => checkTargetUrl(RESOLVER_PAGE, false)).not.toThrow();
    expect(() => checkTargetUrl(RESOLVER_PAGE, true)).toThrow(Refusal);
  });
  it("checkResolverTab accepts only that page on ada (a login redirect is refused, the URL never printed)", () => {
    expect(() => checkResolverTab(RESOLVER_PAGE)).not.toThrow();
    for (const bad of [
      "https://login.ada.edu.az/sso?ticket=SECRET",
      "https://ada.blackboard.com/webapps/login/?SECRET=1",
      "https://ada.blackboard.com.evil.example/learn/api/public/v1/system/version",
      "http://ada.blackboard.com/learn/api/public/v1/system/version",
      undefined,
    ]) {
      let msg = "";
      try {
        checkResolverTab(bad);
      } catch (err) {
        expect(err).toBeInstanceOf(Refusal);
        msg = String(err);
      }
      expect(msg, String(bad)).not.toBe("");
      expect(msg).not.toContain("SECRET");
      expect(msg).not.toContain("login.ada.edu.az");
    }
  });
});

describe("checkLoadedTab names the label, never the resolved id", () => {
  it("another course is refused with the label in the message", () => {
    let msg = "";
    try {
      checkLoadedTab(`${ADA_ORIGIN}/ultra/courses/_6_1/outline`, false, "_5_1", "pp1");
    } catch (err) {
      msg = String(err);
    }
    expect(msg).toMatch(/not on course pp1/);
    expect(msg).not.toContain("_5_1");
    expect(msg).not.toContain("_6_1");
  });
});

describe("courseIdFromSkillTable (the skill's ada-instance.md course table; invented rows here)", () => {
  const md = [
    "## Courses",
    "",
    "| Course | Course id | Other ids | Repo (state in `blackboard/STATE.md`) |",
    "|---|---|---|---|",
    "| ABCD 1000 Invented Course One | `_111_1` | courseId `1.2`; ROOT `_9_1` | `C:\\Users\\x\\Projects\\PP1-2026` |",
    "| ABCD 2000 Invented Course Two | `_222_1` | courseId `3.4` | `C:\\Users\\x\\Projects\\NLP-Bachelor` |",
    "",
  ].join("\n");
  it("finds the one row whose repo folder is <key>-…, case-insensitive", () => {
    expect(courseIdFromSkillTable(md, "pp1")).toBe("_111_1");
    expect(courseIdFromSkillTable(md, "PP1")).toBe("_111_1");
    expect(courseIdFromSkillTable(md, "nlp")).toBe("_222_1");
  });
  it("no row → null; a prefix of a key is not a match", () => {
    expect(courseIdFromSkillTable(md, "pp2")).toBeNull();
    expect(courseIdFromSkillTable(md, "pp")).toBeNull();
    expect(courseIdFromSkillTable("no table here", "pp1")).toBeNull();
  });
  it("two rows → refused (ambiguous), the ids not in the message", () => {
    const two = md + "| X | `_333_1` | | `D:\\pp1-old` |\n";
    let msg = "";
    try {
      courseIdFromSkillTable(two, "pp1");
    } catch (err) {
      expect(err).toBeInstanceOf(Refusal);
      msg = String(err);
    }
    expect(msg).toMatch(/2 rows/);
    expect(msg).not.toMatch(/_\d+_\d+/);
  });
  it("a row whose course id cell is not _N_N is ignored", () => {
    expect(courseIdFromSkillTable("| Course | Course id | Repo |\n|---|---|---|\n| X | `tbd` | `C:\\pp1-x` |\n", "pp1")).toBeNull();
  });
  it("refuses a key that is not a key", () => {
    expect(() => courseIdFromSkillTable(md, "_1_1")).toThrow(Refusal);
  });
});

describe("parseBbArgs + a key", () => {
  it("a key with --dry-run is refused by prepareCourseArg (a dry run takes an id)", () => {
    expect(() => refuseKeyDryRun(parseCourseArg("pp1"), true)).toThrow(/dry run takes a course id/);
    expect(() => refuseKeyDryRun(parseCourseArg("pp1"), false)).not.toThrow();
    expect(() => refuseKeyDryRun(parseCourseArg("_1_1"), true)).not.toThrow();
  });
});

describe("isAdaCoursePage (s6.ts close-bb-tab closes only a recipe's course tab)", () => {
  it("true only for an ada /ultra/courses/<id> page", () => {
    expect(isAdaCoursePage(`${ADA_ORIGIN}/ultra/courses/_5_1/outline`)).toBe(true);
    expect(isAdaCoursePage(`${ADA_ORIGIN}/ultra/courses/_5_1`)).toBe(true);
    for (const bad of [`${ADA_ORIGIN}/`, `${ADA_ORIGIN}/ultra/stream`, "https://mail.example.com/ultra/courses/_5_1", "http://localhost:8080/e2e-playground.html", undefined, 3]) {
      expect(isAdaCoursePage(bad), String(bad)).toBe(false);
    }
  });
});
