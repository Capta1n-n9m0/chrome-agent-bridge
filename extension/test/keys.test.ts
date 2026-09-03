import { describe, it, expect } from "vitest";
import { keyEventParams } from "../src/keys.js";

describe("keyEventParams — named keys", () => {
  it("maps Enter to a real Enter with a carriage-return text payload", () => {
    expect(keyEventParams("Enter")).toEqual({
      key: "Enter",
      code: "Enter",
      windowsVirtualKeyCode: 13,
      text: "\r",
    });
  });

  it("maps Tab, Escape and Backspace to their virtual key codes", () => {
    expect(keyEventParams("Tab")).toMatchObject({ key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    expect(keyEventParams("Escape")).toMatchObject({ key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    expect(keyEventParams("Backspace")).toMatchObject({
      key: "Backspace",
      code: "Backspace",
      windowsVirtualKeyCode: 8,
    });
  });

  it("maps the arrow keys", () => {
    expect(keyEventParams("ArrowLeft")).toMatchObject({ code: "ArrowLeft", windowsVirtualKeyCode: 37 });
    expect(keyEventParams("ArrowUp")).toMatchObject({ code: "ArrowUp", windowsVirtualKeyCode: 38 });
    expect(keyEventParams("ArrowRight")).toMatchObject({ code: "ArrowRight", windowsVirtualKeyCode: 39 });
    expect(keyEventParams("ArrowDown")).toMatchObject({ code: "ArrowDown", windowsVirtualKeyCode: 40 });
  });

  it("does not give named navigation keys a text payload", () => {
    expect(keyEventParams("Tab").text).toBeUndefined();
    expect(keyEventParams("ArrowLeft").text).toBeUndefined();
  });

  it("throws for an unknown named key, listing the supported ones", () => {
    expect(() => keyEventParams("Meta")).toThrow(/unsupported key "Meta"/);
    expect(() => keyEventParams("Meta")).toThrow(/Enter/);
    expect(() => keyEventParams("Meta")).toThrow(/ArrowDown/);
  });
});

describe("keyEventParams — single characters", () => {
  it("maps a lowercase letter to its KeyX code and text", () => {
    expect(keyEventParams("a")).toEqual({ key: "a", code: "KeyA", windowsVirtualKeyCode: 65, text: "a" });
  });

  it("maps an uppercase letter with the shift modifier", () => {
    expect(keyEventParams("A")).toEqual({
      key: "A",
      code: "KeyA",
      windowsVirtualKeyCode: 65,
      text: "A",
      modifiers: 8,
    });
  });

  it("maps a digit", () => {
    expect(keyEventParams("7")).toEqual({ key: "7", code: "Digit7", windowsVirtualKeyCode: 55, text: "7" });
  });

  it("maps space to the Space code", () => {
    expect(keyEventParams(" ")).toEqual({ key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " });
  });

  it("maps a punctuation character with text but no code guess", () => {
    expect(keyEventParams("@")).toMatchObject({ key: "@", text: "@" });
  });

  // Regression: "." has ASCII 46, which is VK_DELETE. Sending it as windowsVirtualKeyCode made
  // Chrome act on the virtual key and drop the character ("x@y.com" typed as "x@ycom").
  // The ASCII/VK correspondence only holds for A-Z, 0-9 and space; punctuation uses OEM codes.
  it("omits windowsVirtualKeyCode for punctuation, where ASCII is not the virtual key code", () => {
    for (const ch of [".", "@", "-", "/", ",", "+", "="]) {
      expect(keyEventParams(ch).windowsVirtualKeyCode).toBeUndefined();
      expect(keyEventParams(ch).text).toBe(ch);
    }
  });

  it("maps a non-ASCII character as text", () => {
    expect(keyEventParams("é")).toMatchObject({ key: "é", text: "é" });
  });
});
