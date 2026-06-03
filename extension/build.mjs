import { build } from "esbuild";

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
