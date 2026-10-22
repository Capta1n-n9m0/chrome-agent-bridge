// recipes/t5-png.ts: a minimal PNG reader for the T5 wave (Step 7): which colour is at a pixel of a
// screenshot, so SCREEN rows judge "the image is the target page" from the T5 colour bar
// (t5-lib.ts `barExpression`) instead of by eye. 8-bit RGB / RGBA, non-interlaced — what Chrome's
// `captureVisibleTab {format:"png"}` and CDP `Page.captureScreenshot {format:"png"}` produce. Anything
// else throws, and the row records the image as unreadable.
//
//   npx tsx recipes/t5-png.ts <file.png> [x y]          # size, pixel colour, colour name
//   npx tsx recipes/t5-png.ts --transcript <session.jsonl|actor out.jsonl> [x y]
//                                                         # every image in a transcript, in order
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { colourName } from "./t5-lib.js";

export interface Png {
  width: number;
  height: number;
  channels: 3 | 4;
  pixels: Buffer;
}

export function decodePng(buf: Buffer): Png {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(sig)) throw new Error("not a PNG");
  let pos = 8;
  let width = 0;
  let height = 0;
  let channels: 3 | 4 = 4;
  const idat: Buffer[] = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const depth = data[8];
      const colour = data[9];
      const interlace = data[12];
      if (depth !== 8 || (colour !== 2 && colour !== 6) || interlace !== 0) {
        throw new Error(`unsupported PNG (bit depth ${depth}, colour type ${colour}, interlace ${interlace})`);
      }
      channels = colour === 6 ? 4 : 3;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? out[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new Error(`bad PNG filter ${filter}`);
      out[i] = v & 255;
    }
    prev = out;
  }
  return { width, height, channels, pixels };
}

export function pixelHex(png: Png, x: number, y: number): string {
  const cx = Math.min(Math.max(0, Math.floor(x)), png.width - 1);
  const cy = Math.min(Math.max(0, Math.floor(y)), png.height - 1);
  const i = (cy * png.width + cx) * png.channels;
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(png.pixels[i])}${hex(png.pixels[i + 1])}${hex(png.pixels[i + 2])}`;
}

/** How many distinct colours a 16-pixel grid sample shows (1 = a blank image). */
export function sampleColours(png: Png): number {
  const seen = new Set<string>();
  for (let gy = 1; gy <= 8; gy++) for (let gx = 1; gx <= 8; gx++) seen.add(pixelHex(png, (png.width * gx) / 9, (png.height * gy) / 9));
  return seen.size;
}

/** `<w>x<h>, pixel(x,y) #rrggbb (<name>), <n> colours in an 8x8 grid`. */
export function describePng(buf: Buffer, x = 20, y = 20): string {
  const png = decodePng(buf);
  const hex = pixelHex(png, x, y);
  return `${png.width}x${png.height}, pixel(${x},${y}) ${hex} (${colourName(hex)}), ${sampleColours(png)} colours in an 8x8 grid`;
}

/** Every base64 PNG in a JSONL transcript (Claude Code session file or a t5-actor out.jsonl), in order. */
export function imagesInTranscript(text: string): Buffer[] {
  const found: Buffer[] = [];
  const re = /"data":"(iVBORw0KGgo[A-Za-z0-9+/=]+)"/g;
  for (const m of text.matchAll(re)) found.push(Buffer.from(m[1], "base64"));
  return found;
}

function main(): void {
  const args = process.argv.slice(2);
  if (args[0] === "--transcript") {
    const x = Number(args[2] ?? 20);
    const y = Number(args[3] ?? 20);
    const images = imagesInTranscript(readFileSync(args[1], "utf8"));
    console.log(`${images.length} image(s)`);
    images.forEach((img, k) => {
      let line: string;
      try {
        line = describePng(img, x, y);
      } catch (err) {
        line = `unreadable: ${err instanceof Error ? err.message : String(err)}`;
      }
      console.log(`image ${k + 1}: ${line}`);
    });
    return;
  }
  if (!args[0]) {
    console.log("usage: npx tsx recipes/t5-png.ts <file.png> [x y] | --transcript <file.jsonl> [x y]");
    process.exitCode = 2;
    return;
  }
  console.log(describePng(readFileSync(args[0]), Number(args[1] ?? 20), Number(args[2] ?? 20)));
}

if (process.argv[1] && /t5-png\.ts$/.test(process.argv[1])) main();
