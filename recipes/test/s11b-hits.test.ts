// The Step 11b hit counter (recipes/s11b-rules.ts, section "H1"): per-query-tag counts over the fixture servers' logs.
import { describe, expect, it } from "vitest";
import { countHits, flipCounts, hitsLine, parseLogLine, queryTag } from "../s11b-rules";

const REDIRECT = [
  "s9 redirect on 127.0.0.1:8083 -> 302 to http://localhost:8085<same path> (threaded)",
  "2026-10-27T01:00:00.100Z GET /e2e-playground.html?s11b=rd1",
  "2026-10-27T01:00:00.200Z GET /favicon.ico",
  "2026-10-27T01:00:01.000Z GET /e2e-playground.html?s11b=rd10",
  "2026-10-27T01:00:02.000Z HEAD /dl/hello.txt?x=1&s11b=rd1",
];
const BLOCKED = [
  '127.0.0.1 - - [27/Oct/2026 01:00:00] "GET /e2e-playground.html?s11b=rd6 HTTP/1.1" 200 -',
  '127.0.0.1 - - [27/Oct/2026 01:00:00] "GET /favicon.ico HTTP/1.1" 404 -',
  '127.0.0.1 - - [27/Oct/2026 01:00:01] "GET /e2e-playground.html?s11b=rd6 HTTP/1.1" 304 -',
  '127.0.0.1 - - [27/Oct/2026 01:00:01] code 404, message File not found',
  '127.0.0.1 - - [27/Oct/2026 01:00:02] "GET /x?s11b=ctl HTTP/1.1" 200 -',
];

describe("parseLogLine", () => {
  it("reads the redirector and delay form (no status)", () => {
    expect(parseLogLine(REDIRECT[1]!)).toEqual({ method: "GET", path: "/e2e-playground.html?s11b=rd1", status: undefined });
  });
  it("reads the flip/slow form (with status)", () => {
    expect(parseLogLine("2026-10-27T01:00:00.100Z GET /h/back?s11b=bk 302")).toEqual({ method: "GET", path: "/h/back?s11b=bk", status: 302 });
  });
  it("reads python -m http.server's stderr form", () => {
    expect(parseLogLine(BLOCKED[0]!)).toEqual({ method: "GET", path: "/e2e-playground.html?s11b=rd6", status: 200 });
  });
  it("ignores banners, error notes and blank lines", () => {
    expect(parseLogLine(REDIRECT[0]!)).toBeNull();
    expect(parseLogLine(BLOCKED[3]!)).toBeNull();
    expect(parseLogLine("")).toBeNull();
  });
});

describe("queryTag", () => {
  it("takes the s11b value of the query, wherever it stands", () => {
    expect(queryTag("/a?s11b=rd1")).toBe("rd1");
    expect(queryTag("/a?x=1&s11b=rd1&y=2")).toBe("rd1");
  });
  it("is undefined without a tag (a favicon, a bare path, a lookalike key)", () => {
    expect(queryTag("/favicon.ico")).toBeUndefined();
    expect(queryTag("/a?xs11b=rd1")).toBeUndefined();
    expect(queryTag("/a#s11b=rd1")).toBeUndefined();
  });
});

describe("countHits", () => {
  it("matches the tag exactly, never a prefix, never the total", () => {
    expect(countHits(REDIRECT, "rd1")).toBe(2);
    expect(countHits(REDIRECT, "rd10")).toBe(1);
    expect(countHits(REDIRECT, "rd")).toBe(0);
    expect(countHits(BLOCKED, "rd6")).toBe(2);
  });
  it("never counts a favicon, however it is asked", () => {
    expect(countHits(REDIRECT, "")).toBe(0);
    expect(countHits(BLOCKED, "")).toBe(0);
  });
  it("counts nothing from an empty log", () => {
    expect(countHits([], "rd1")).toBe(0);
  });
});

describe("hitsLine", () => {
  it("prints the sheet's line, redirect from the redirector log, blocked from 8085's", () => {
    expect(hitsLine("rd6", REDIRECT, BLOCKED)).toBe("HITS rd6 redirect=0 blocked=2");
    expect(hitsLine("rd1", REDIRECT, BLOCKED)).toBe("HITS rd1 redirect=2 blocked=0");
    expect(hitsLine("ctl", [], BLOCKED)).toBe("HITS ctl redirect=0 blocked=1");
  });
});

describe("flipCounts", () => {
  const FLIP = [
    "s11b flip on 127.0.0.1:8091 -> 200 once per path, then 302 to http://localhost:8085<same path> (threaded)",
    "2026-10-27T01:00:00.000Z GET /h/back?s11b=bk 200",
    "2026-10-27T01:00:05.000Z GET /h/back?s11b=bk 302",
    "2026-10-27T01:00:06.000Z GET /h/fwd?s11b=fw 200",
    "2026-10-27T01:00:07.000Z GET /h/back?s11b=bk2 200",
  ];
  it("counts 200 and 302 per exact tag", () => {
    expect(flipCounts(FLIP, "bk")).toEqual({ n200: 1, n302: 1, total: 2 });
    expect(flipCounts(FLIP, "fw")).toEqual({ n200: 1, n302: 0, total: 1 });
    expect(flipCounts(FLIP, "bk2")).toEqual({ n200: 1, n302: 0, total: 1 });
    expect(flipCounts(FLIP, "none")).toEqual({ n200: 0, n302: 0, total: 0 });
  });
  it("counts a line without a status in total only", () => {
    expect(flipCounts(["2026-10-27T01:00:00.000Z GET /a?s11b=t"], "t")).toEqual({ n200: 0, n302: 0, total: 1 });
  });
});
