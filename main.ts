// THE WORLD TODAY — front page for Thursday 19 November 2026.
// Draws a 1024x1024 PNG newspaper front page with Node stdlib only
// (zlib PNG encoder, hand-written 5x7 bitmap font). No network, no
// clock, no randomness: two runs write byte-identical files.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const W = 1024;
const H = 1024;

// ---------- palette ----------
const PAPER: RGB = [246, 241, 227];
const PANEL: RGB = [255, 253, 246];
const INK: RGB = [22, 19, 14];
const RED: RGB = [166, 30, 30];
const NAVY: RGB = [31, 58, 95];
const TEAL: RGB = [14, 116, 144];
const PURPLE: RGB = [88, 28, 135];
const WHITE: RGB = [255, 255, 255];
const SAND: RGB = [253, 186, 116];
const GOLD: RGB = [253, 230, 138];

type RGB = [number, number, number];

// ---------- canvas ----------
const px = new Uint8Array(W * H * 3);
function fill(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}
function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
    }
  }
}
function frame(x: number, y: number, w: number, h: number, t: number, c: RGB): void {
  rect(x, y, w, t, c);
  rect(x, y + h - t, w, t, c);
  rect(x, y, t, h, c);
  rect(x + w - t, y, t, h, c);
}
function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}
function mix(c1: RGB, c2: RGB, t: number): RGB {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}
function vgrad(x: number, y: number, w: number, h: number, stops: Array<[number, RGB]>): void {
  for (let yy = 0; yy < h; yy++) {
    const t = h <= 1 ? 0 : yy / (h - 1);
    let c: RGB = stops[stops.length - 1][1];
    for (let s = 0; s < stops.length - 1; s++) {
      const t0 = stops[s][0];
      const t1 = stops[s + 1][0];
      if (t >= t0 && t <= t1) {
        c = mix(stops[s][1], stops[s + 1][1], t1 === t0 ? 0 : (t - t0) / (t1 - t0));
        break;
      }
    }
    rect(x, y + yy, w, 1, c);
  }
}
function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let yy = -r; yy <= r; yy++) {
    for (let xx = -r; xx <= r; xx++) {
      if (xx * xx + yy * yy <= r * r) setPixel(cx + xx, cy + yy, c);
    }
  }
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const n = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= n; i++) {
    setPixel(Math.round(x0 + (dx * i) / n), Math.round(y0 + (dy * i) / n), c);
  }
}

// ---------- 5x7 bitmap font (uppercase; input is uppercased) ----------
// Each glyph: 7 rows of 5 bits, written as strings.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
};

function glyph(ch: string): string[] {
  const g = FONT[ch];
  if (g) return g;
  return FONT["?"];
}
function textWidth(s: string, scale: number): number {
  const t = s.toUpperCase();
  if (t.length === 0) return 0;
  return (t.length * 6 - 1) * scale;
}
function drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
  const t = s.toUpperCase();
  for (let ci = 0; ci < t.length; ci++) {
    const g = glyph(t[ci]);
    const gx = x + ci * 6 * scale;
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let col = 0; col < 5; col++) {
        if (row[col] === "1") {
          rect(gx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
  }
}
function drawTextCentered(s: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}
function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.toUpperCase().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur === "" ? w : cur + " " + w;
    if (textWidth(next, scale) <= maxW || cur === "") {
      cur = next;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ---------- PNG encoder (RGB8, filter 0) ----------
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- drawing ----------
function drawSkyline(x0: number, baseY: number, x1: number): void {
  const winColors: RGB[] = [
    [253, 230, 138],
    [103, 232, 249],
    [249, 168, 212],
    [255, 255, 255],
  ];
  const silhouettes: RGB[] = [
    [30, 27, 75],
    [46, 16, 78],
    [24, 24, 60],
  ];
  let i = 0;
  let x = x0;
  while (x < x1) {
    const bwFull = 40 + ((i * 29) % 3) * 8;
    const bw = Math.min(bwFull, x1 - x);
    const bh = 55 + ((i * 37 + 11) % 4) * 32 + ((i * 53) % 38);
    const top = baseY - bh;
    const col = silhouettes[i % 3];
    rect(x, top, bw, bh, col);
    // antenna on some towers
    if (i % 5 === 2) {
      rect(x + Math.floor(bw / 2) - 1, top - 22, 3, 22, col);
      setPixel(x + Math.floor(bw / 2), top - 24, RED);
      setPixel(x + Math.floor(bw / 2) + 1, top - 24, RED);
    }
    // lit windows: deterministic pattern
    for (let r = 0; r < Math.floor((bh - 14) / 14); r++) {
      for (let cIdx = 0; cIdx < Math.floor((bw - 10) / 12); cIdx++) {
        if ((i * 7 + r * 3 + cIdx * 5) % 4 === 0) {
          rect(
            x + 6 + cIdx * 12,
            top + 8 + r * 14,
            5,
            7,
            winColors[(i + r + cIdx) % winColors.length],
          );
        }
      }
    }
    x += bw + 5;
    i++;
  }
}
interface Panel {
  label: string;
  color: RGB;
  headline: string;
  sub: string;
}

const PANELS: Panel[] = [
  {
    label: "US - IRAN",
    color: RED,
    headline: "US STRIKES QESHM AS IRAN HITS US BASES",
    sub: "US HIT MISSILE SITES 17 NOV. IRAN HIT KUWAIT AND BAHRAIN 18 NOV.",
  },
  {
    label: "EU - UKRAINE",
    color: NAVY,
    headline: "EU PROPOSES 45BN EURO LOAN FOR UKRAINE",
    sub: "25BN FOR ARMS, 20BN CIVILIAN AID FOR 2027",
  },
  {
    label: "GAZA",
    color: RED,
    headline: "ISRAEL GROUND PUSH IN CENTRAL GAZA",
    sub: "PAST THE YELLOW LINE, COORDINATED WITH THE US. HAMAS CALLS IT A BREACH.",
  },
  {
    label: "WASHINGTON",
    color: NAVY,
    headline: "JEFFRIES TO LEAD THE US HOUSE",
    sub: "DEMOCRATS NOMINATE HIM FOR SPEAKER. FIRST BLACK SPEAKER.",
  },
  {
    label: "INDIA",
    color: TEAL,
    headline: "CYCLONE AKVAN NEARS INDIA",
    sub: "STORM TRACKS TOWARD MACHILIPATNAM TO PURI COAST",
  },
  {
    label: "SPACE",
    color: PURPLE,
    headline: "VOYAGER 1 ONE LIGHT-DAY FROM EARTH",
    sub: "NASA PROBE REACHES MILESTONE 05:16 EST 19 NOV",
  },
];

function drawPanel(p: Panel, x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, PANEL);
  frame(x, y, w, h, 2, INK);
  rect(x + 2, y + 2, w - 4, 6, p.color);
  // label tag
  const lw = textWidth(p.label, 2) + 16;
  rect(x + 14, y + 16, lw, 22, p.color);
  drawText(p.label, x + 22, y + 20, 2, WHITE);
  // headline, up to 2 lines at scale 3
  const inner = w - 28;
  const headLines = wrap(p.headline, inner, 3).slice(0, 2);
  let hy = y + 50;
  for (const ln of headLines) {
    drawText(ln, x + 14, hy, 3, INK);
    hy += 24;
  }
  // sub, up to 2 lines at scale 2
  const subLines = wrap(p.sub, inner, 2).slice(0, 2);
  let sy = y + 50 + headLines.length * 24 + 6;
  for (const ln of subLines) {
    drawText(ln, x + 14, sy, 2, [74, 68, 58]);
    sy += 17;
  }
}

function main(): void {
  fill(PAPER);

  // ---- masthead ----
  rect(28, 16, 968, 6, RED);
  drawTextCentered("THE WORLD TODAY", 512, 32, 9, INK);
  rect(28, 106, 968, 3, INK);
  drawTextCentered("THURSDAY 19 NOVEMBER 2026", 512, 118, 3, RED);
  rect(28, 148, 968, 3, INK);
  rect(28, 154, 968, 1, INK);

  // ---- hero: GTA VI, Vice City sunset ----
  const hx = 28;
  const hy = 166;
  const hw = 968;
  const hh = 372;
  const skyH = 254; // sky portion
  const waterY = hy + 3 + skyH; // 423
  const bandY = waterY + 40; // 463
  frame(hx, hy, hw, hh, 3, INK);
  vgrad(hx + 3, hy + 3, hw - 6, skyH, [
    [0, [30, 16, 64]],
    [0.35, [109, 40, 168]],
    [0.6, [190, 24, 93]],
    [0.82, [234, 88, 12]],
    [1, [253, 186, 116]],
  ]);
  // sun with glow rings
  disc(730, 300, 62, [249, 115, 22]);
  disc(730, 300, 52, [253, 186, 116]);
  disc(730, 300, 44, [254, 215, 130]);
  disc(730, 300, 38, [253, 230, 138]);
  // skyline
  drawSkyline(hx + 3, waterY, hx + hw - 3);
  // water with sun reflection
  rect(hx + 3, waterY, hw - 6, 40, [14, 80, 100]);
  for (let r = 0; r < 5; r++) {
    const yy = waterY + 4 + r * 7;
    const rw = 150 - r * 18;
    rect(730 - Math.floor(rw / 2), yy, rw, 3, [245, 158, 11]);
    rect(hx + 40 + ((r * 97) % 300), yy + 3, 60, 2, [103, 160, 180]);
    rect(hx + hw - 260 + ((r * 61) % 120), yy, 50, 2, [103, 160, 180]);
  }
  // kicker tag over the sky
  const kick = "GLOBAL ROLLOUT BEGINS";
  const kw = textWidth(kick, 2) + 20;
  rect(hx + 14, hy + 14, kw, 26, RED);
  drawText(kick, hx + 24, hy + 19, 2, WHITE);
  // headline band
  rect(hx + 3, bandY, hw - 6, hy + hh - 3 - bandY, [18, 8, 31]);
  drawText("GTA VI ARRIVES", hx + 18, bandY + 8, 6, WHITE);
  drawText("VICE CITY OPENS AFTER A 13-YEAR WAIT", hx + 18, bandY + 50, 3, SAND);

  // ---- story grid: 2 cols x 3 rows ----
  const gx = 28;
  const gy = 556;
  const gw = 476;
  const gh = 140;
  const gapX = 16;
  const gapY = 12;
  for (let i = 0; i < PANELS.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    drawPanel(PANELS[i], gx + col * (gw + gapX), gy + row * (gh + gapY), gw, gh);
  }

  // ---- footer ----
  drawTextCentered("SEVEN STORIES FROM AROUND THE WORLD", 512, 1006, 2, [74, 68, 58]);

  const png = encodePNG();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.png"), png);
}

main();
