import { build } from "esbuild";

await build({
  entryPoints: {
    sw: "src/sw.ts",
    options: "src/options.ts",
  },
  bundle: true,
  format: "esm",
  target: "chrome116",
  outdir: "dist",
});
console.error("built extension → dist/");
