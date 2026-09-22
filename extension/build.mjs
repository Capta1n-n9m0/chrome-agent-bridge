import { build } from "esbuild";
import { copyFile, mkdir, rm } from "node:fs/promises";

const common = { bundle: true, target: "chrome116", outdir: "dist" };

// Service worker + options page load as ES modules.
await build({
  ...common,
  entryPoints: { sw: "src/sw.ts", options: "src/options.ts", offscreen: "src/offscreen.ts" },
  format: "esm",
});

// Content script is injected as a classic script — emit IIFE (no import/export).
await build({
  ...common,
  entryPoints: { content: "src/content/index.ts" },
  format: "iife",
});

console.error("built extension → dist/");

// Safari uses a persistent background page because WebKit has no offscreen document API. Keep its
// distributable tree separate: it is also the input to Apple's Safari web extension packager.
const safariRoot = "dist/safari";
await rm(safariRoot, { recursive: true, force: true });
await mkdir(`${safariRoot}/dist`, { recursive: true });
await build({
  bundle: true,
  target: "safari17",
  outdir: `${safariRoot}/dist`,
  entryPoints: { options: "src/options.ts" },
  format: "esm",
});
await build({
  bundle: true,
  target: "safari17",
  outdir: `${safariRoot}/dist`,
  entryPoints: { background: "src/safari.ts", content: "src/content/index.ts" },
  format: "iife",
});
await copyFile("safari/manifest.json", `${safariRoot}/manifest.json`);
await copyFile("options.html", `${safariRoot}/options.html`);
await copyFile("safari/icon.svg", `${safariRoot}/icon.svg`);

console.error("built Safari extension → dist/safari/");
