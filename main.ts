// news-image-20261119 v2 — "THE WORLD TODAY"
// A program that draws a newspaper front page summing up the world news of
// Thursday 19 November 2026, as a single 1024x1024 PNG.
//
// Node 22+, standard library only. No network, no clock, no randomness:
// two runs write byte-identical files.
//
// Usage: node main.ts
// Writes entry.png to $MAKEFUN_OUTPUT_DIR (default /output).

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER = [245, 239, 227];
const CARD = [255, 253, 247];
const INK = [25, 23, 19];
const DECK = [58, 53, 44];
const RED = [168, 30, 36];
const BLUE = [29, 58, 110];
const HAIR = [183, 173, 151];
const WHITE = [255, 255, 255];
const SOFT = [120, 112, 96];

// ---------------------------------------------------------------- pixels
const buf = new Uint8Array(W * H * 3);
function px(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}
function fillRect(x, y, w, h, c) {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) {
      buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
      i += 3;
    }
  }
}
function hline(x, y, len, c) { fillRect(x, y, len, 1, c); }
function vline(x, y, len, c) { fillRect(x, y, 1, len, c); }
function rect(x, y, w, h, c) {
  hline(x, y, w, c); hline(x, y + h - 1, w, c);
  vline(x, y, h, c); vline(x + w - 1, y, h, c);
}
function line(x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  for (;;) {
    px(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}
function thickLine(x0, y0, x1, y1, t, c) {
  for (let d = -Math.floor(t / 2); d <= Math.floor(t / 2); d++) {
    line(x0 + d, y0, x1 + d, y1, c);
    line(x0, y0 + d, x1, y1 + d, c);
  }
}
function fillCircle(cx, cy, r, c) {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    for (let x = -half; x <= half; x++) px(cx + x, cy + y, c);
  }
}
function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
function vgrad(x, y, w, h, stops) {
  for (let yy = 0; yy < h; yy++) {
    const t = h <= 1 ? 0 : yy / (h - 1);
    const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
    const lt = t * (stops.length - 1) - seg;
    fillRect(x, y + yy, w, 1, mix(stops[seg], stops[seg + 1], lt));
  }
}
// Deterministic pseudo-random (mulberry32), fixed seed: no Math.random.
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows of 5 bits, written as strings of 0/1.
const FONT = {
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
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
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
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
};

function textWidth(s, scale) {
  return s.length * 6 * scale - scale;
}
function drawText(s, x, y, scale, c) {
  s = s.toUpperCase();
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch] || FONT[" "];
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let col = 0; col < 5; col++) {
        if (row[col] === "1") fillRect(cx + col * scale, y + r * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
}
function drawCentered(s, cx, y, scale, c) {
  drawText(s, Math.round(cx - textWidth(s, scale) / 2), y, scale, c);
}
// Greedy word wrap to lines of at most maxChars characters.
function wrap(s, maxChars) {
  const words = s.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (cur === "") { cur = w; continue; }
    if (cur.length + 1 + w.length <= maxChars) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- masthead
function drawMasthead() {
  hline(28, 28, 968, INK);
  drawText("WORLD EDITION", 28, 34, 1, SOFT);
  const right = "THURSDAY EDITION";
  drawText(right, 996 - textWidth(right, 1), 34, 1, SOFT);
  drawCentered("THE WORLD TODAY", 512, 44, 7, INK);
  // Date band.
  fillRect(28, 100, 968, 36, INK);
  drawCentered("THURSDAY 19 NOVEMBER 2026", 512, 108, 3, WHITE);
  hline(28, 144, 968, INK);
}

// ---------------------------------------------------------------- hero
function drawHero() {
  const x0 = 28, y0 = 150, w = 968;
  // Sunset sky.
  vgrad(x0, y0, w, 250, [
    [43, 22, 80], [110, 42, 125], [198, 63, 102], [239, 111, 60], [249, 169, 78],
  ]);
  // Sun with glow.
  fillCircle(712, 348, 84, [255, 214, 130]);
  fillCircle(712, 348, 66, [255, 233, 168]);
  fillCircle(712, 348, 52, [255, 243, 196]);
  // Skyline silhouette (deterministic heights).
  const r = rng(19112026);
  let bx = x0;
  while (bx < x0 + w) {
    const bw = 26 + Math.floor(r() * 46);
    const bh = 40 + Math.floor(r() * 110);
    const top = 400 - bh;
    fillRect(bx, top, bw, bh, [34, 18, 46]);
    if (r() < 0.5) fillRect(bx + Math.floor(bw / 2) - 1, top - 14, 2, 14, [34, 18, 46]);
    // Lit windows.
    for (let wy = top + 8; wy < 392; wy += 14) {
      for (let wx = bx + 5; wx < bx + bw - 5; wx += 11) {
        if (r() < 0.22) fillRect(wx, wy, 3, 4, [255, 210, 122]);
      }
    }
    bx += bw + 4;
  }
  // Palm silhouettes at both edges.
  function palm(px, py, s) {
    const trunk = [26, 15, 46];
    thickLine(px, py, px + 6 * s, py - 46 * s, 3, trunk);
    for (let k = 0; k < 5; k++) {
      const a = (-0.3 - k * 0.45) * s;
      const ex = px + 6 * s + Math.round(Math.cos(a) * 26 * s);
      const ey = py - 46 * s + Math.round(Math.sin(a) * 14 * s) - 4 * s;
      thickLine(px + 6 * s, py - 46 * s, ex, ey, 2, trunk);
    }
  }
  palm(x0 + 8, 400, 1);
  palm(x0 + 46, 400, 1);
  palm(x0 + w - 60, 400, 1);
  palm(x0 + w - 22, 400, 1);
  // Water with sun reflection.
  vgrad(x0, 400, w, 70, [[18, 58, 77], [10, 36, 54]]);
  const r2 = rng(777);
  for (let i = 0; i < 26; i++) {
    const yy = 404 + Math.floor(r2() * 60);
    const ww = 20 + Math.floor(r2() * 90);
    const xx = x0 + Math.floor(r2() * (w - ww));
    fillRect(xx, yy, ww, 2, [255, 210, 122]);
  }
  // Sun reflection column.
  for (let yy = 402; yy < 468; yy += 6) {
    const ww = 30 + Math.floor(r2() * 60);
    fillRect(712 - Math.floor(ww / 2), yy, ww, 3, [255, 196, 110]);
  }
  // Kicker on the sky.
  drawText("HERO STORY - GAMING", x0 + 10, y0 + 10, 2, WHITE);
  // Headline block below the art, on paper.
  fillRect(x0, 470, w, 4, RED);
  drawCentered("GTA VI ARRIVES", 512, 482, 6, INK);
  drawCentered("THE GLOBAL ROLLOUT BEGINS - GAMERS RETURN TO VICE CITY,", 512, 528, 2, DECK);
  drawCentered("13 YEARS AFTER GTA V.", 512, 544, 2, DECK);
}

// ---------------------------------------------------------------- panels
const STORIES = [
  {
    kicker: "MIDDLE EAST", art: 0,
    head: ["US-IRAN", "STRIKES GROW"],
    deck: "US struck Qeshm 17 Nov. Iran hit US bases in Kuwait, Bahrain 18 Nov",
  },
  {
    kicker: "EUROPE", art: 1,
    head: ["EU 45BN EURO", "UKRAINE LOAN"],
    deck: "EU proposes 45bn euro loan for Ukraine 2027: 25bn arms, 20bn aid",
  },
  {
    kicker: "GAZA", art: 2,
    head: ["ISRAEL PUSHES", "INTO GAZA"],
    deck: "Israel pushes past the Yellow Line; Hamas calls it a ceasefire breach",
  },
  {
    kicker: "WASHINGTON", art: 3,
    head: ["JEFFRIES TO", "LEAD THE HOUSE"],
    deck: "Democrats nominate him; set to be the first Black Speaker",
  },
  {
    kicker: "INDIA", art: 4,
    head: ["CYCLONE AKVAN", "NEARS INDIA"],
    deck: "Cyclone nears the coast, tracking toward Machilipatnam-Puri",
  },
  {
    kicker: "SPACE", art: 5,
    head: ["VOYAGER 1:", "ONE LIGHT-DAY"],
    deck: "NASA probe reaches the mark at 05:16 EST on 19 Nov",
  },
];

function star(cx, cy, r, c) {
  // Small 4-point star (plus with diagonals).
  thickLine(cx - r, cy, cx + r, cy, 2, c);
  thickLine(cx, cy - r, cx, cy + r, 2, c);
  line(cx - r, cy - r, cx + r, cy + r, c);
  line(cx - r, cy + r, cx + r, cy - r, c);
}

function drawArt(kind, x, y, w, h) {
  if (kind === 0) {
    // US-IRAN: night sea, two missile arcs, Qeshm island.
    fillRect(x, y, w, h, [22, 35, 61]);
    const r = rng(1711);
    for (let i = 0; i < 22; i++) px(x + Math.floor(r() * w), y + Math.floor(r() * (h - 22)), [200, 210, 230]);
    // Island.
    fillRect(x + 96, y + h - 20, 130, 12, [138, 111, 77]);
    fillRect(x + 120, y + h - 26, 84, 8, [138, 111, 77]);
    drawText("QESHM", x + 132, y + h - 18, 1, [255, 255, 255]);
    // Missile arcs (quadratic bezier dots).
    function arc(xa, ya, xc, yc, xb, yb, c) {
      for (let t = 0; t <= 1.0001; t += 0.02) {
        const u = 1 - t;
        const px2 = Math.round(u * u * xa + 2 * u * t * xc + t * t * xb);
        const py2 = Math.round(u * u * ya + 2 * u * t * yc + t * t * yb);
        fillRect(px2 - 1, py2 - 1, 3, 3, c);
      }
    }
    arc(x + 10, y + h - 8, x + 90, y + 6, x + 170, y + h - 24, [255, 176, 92]);
    arc(x + w - 10, y + h - 8, x + w - 90, y + 2, x + w - 170, y + h - 24, [255, 176, 92]);
    fillCircle(x + 170, y + h - 24, 4, [255, 220, 140]);
    fillCircle(x + w - 170, y + h - 24, 4, [255, 220, 140]);
  } else if (kind === 1) {
    // EU: blue field, circle of gold stars, rising bars.
    fillRect(x, y, w, h, BLUE);
    const cx = x + Math.floor(w / 2), cy = y + 34;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 - Math.PI / 2;
      star(Math.round(cx + Math.cos(a) * 24), Math.round(cy + Math.sin(a) * 24), 3, [255, 205, 60]);
    }
    fillRect(x + 96, y + h - 26, 26, 10, [255, 205, 60]);
    fillRect(x + 132, y + h - 34, 26, 18, [255, 205, 60]);
    fillRect(x + 168, y + h - 44, 26, 28, [255, 205, 60]);
    fillRect(x + 204, y + h - 54, 26, 38, [255, 205, 60]);
  } else if (kind === 2) {
    // GAZA: sand strip, dashed Yellow Line, push arrow.
    fillRect(x, y, w, h, [216, 196, 154]);
    for (let i = 0; i < 8; i++) fillRect(x + 20 + i * 36, y + 52, 18, 10, [120, 96, 66]);
    // Yellow Line (dashed).
    for (let xx = x + 6; xx < x + w - 6; xx += 14) fillRect(xx, y + 34, 9, 3, [232, 200, 50]);
    // Arrow pushing right past the line.
    thickLine(x + 30, y + 22, x + w - 70, y + 22, 4, INK);
    fillRect(x + w - 78, y + 14, 10, 16, INK);
    line(x + w - 78, y + 14, x + w - 58, y + 22, INK);
    line(x + w - 78, y + 30, x + w - 58, y + 22, INK);
    drawText("YELLOW LINE", x + 8, y + 40, 1, [90, 70, 40]);
  } else if (kind === 3) {
    // JEFFRIES: Capitol dome on navy.
    fillRect(x, y, w, h, BLUE);
    const cx = x + Math.floor(w / 2);
    fillRect(cx - 62, y + 58, 124, 6, WHITE);
    for (let i = 0; i < 6; i++) fillRect(cx - 54 + i * 20, y + 34, 8, 24, WHITE);
    fillRect(cx - 62, y + 30, 124, 4, WHITE);
    // Dome.
    for (let yy = 0; yy < 18; yy++) {
      const half = Math.floor(Math.sqrt(18 * 18 - yy * yy) * 2.4);
      fillRect(cx - half, y + 12 + yy, half * 2, 1, WHITE);
    }
    vline(cx, y + 2, 12, WHITE);
    fillRect(cx + 2, y + 2, 12, 7, [200, 40, 48]);
    // Base steps.
    fillRect(cx - 78, y + 64, 156, 4, WHITE);
    fillRect(cx - 88, y + 68, 176, 4, [200, 205, 225]);
  } else if (kind === 4) {
    // AKVAN: teal sea, white cyclone spiral, coast.
    vgrad(x, y, w, h, [[14, 90, 107], [10, 64, 84]]);
    const cx = x + 130, cy = y + 38;
    for (let rr = 6; rr <= 30; rr += 6) {
      for (let a = 0; a < Math.PI * 2; a += 0.08) {
        if (a > Math.PI * 1.4 && rr > 18) continue;
        px(Math.round(cx + Math.cos(a) * rr * 1.5), Math.round(cy + Math.sin(a) * rr * 0.85), WHITE);
        px(Math.round(cx + Math.cos(a) * rr * 1.5) + 1, Math.round(cy + Math.sin(a) * rr * 0.85), WHITE);
      }
    }
    fillCircle(cx, cy, 3, WHITE);
    // Coast bottom-right.
    fillRect(x + w - 90, y + h - 16, 90, 16, [196, 172, 128]);
    fillRect(x + w - 70, y + h - 24, 70, 8, [196, 172, 128]);
    drawText("INDIA COAST", x + w - 88, y + h - 13, 1, [60, 48, 30]);
    // Rain streaks.
    for (let i = 0; i < 10; i++) line(x + 16 + i * 14, y + 8, x + 10 + i * 14, y + 22, [180, 220, 230]);
  } else {
    // VOYAGER: starfield, gold dish, trajectory.
    fillRect(x, y, w, h, [11, 14, 30]);
    const r = rng(1919);
    for (let i = 0; i < 40; i++) px(x + Math.floor(r() * w), y + Math.floor(r() * h), [220, 225, 240]);
    // Trajectory (dotted).
    for (let t = 0; t <= 1.0001; t += 0.04) {
      const px2 = Math.round(x + 16 + t * 150);
      const py2 = Math.round(y + h - 12 - t * 34);
      fillRect(px2, py2, 3, 3, [140, 170, 220]);
    }
    // Earth dot.
    fillCircle(x + 18, y + h - 12, 6, [70, 130, 200]);
    // Dish (parabola) + boom + body.
    const dx = x + w - 92, dy = y + 22;
    for (let a = -0.9; a <= 0.9; a += 0.05) {
      const px2 = Math.round(dx + Math.sin(a) * 26);
      const py2 = Math.round(dy + (1 - Math.cos(a)) * 26);
      fillRect(px2 - 2, py2 - 2, 5, 5, [255, 205, 60]);
    }
    thickLine(dx, dy + 26, dx - 22, dy + 46, 2, [255, 205, 60]);
    fillRect(dx - 34, dy + 42, 26, 12, [200, 205, 225]);
    drawText("1 LIGHT-DAY", x + w - 96, y + h - 14, 1, [255, 220, 140]);
  }
}

function drawPanel(s, x, y) {
  const w = 312, h = 206;
  fillRect(x, y, w, h, CARD);
  rect(x, y, w, h, HAIR);
  drawArt(s.art, x + 1, y + 1, w - 2, 76);
  drawText(s.kicker, x + 12, y + 86, 2, RED);
  drawText(s.head[0], x + 12, y + 104, 3, INK);
  drawText(s.head[1], x + 12, y + 126, 3, INK);
  const lines = wrap(s.deck, 24);
  lines.slice(0, 3).forEach((ln, i) => drawText(ln, x + 12, y + 152 + i * 15, 2, DECK));
}

// ---------------------------------------------------------------- footer
function drawFooter() {
  hline(28, 1000, 968, INK);
  drawCentered("THE WORLD TODAY - THURSDAY 19 NOVEMBER 2026 - SEVEN STORIES FROM THE DAY", 512, 1006, 1, SOFT);
}

// ---------------------------------------------------------------- PNG
function crc32(data) {
  let table = crc32.table;
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    crc32.table = table;
  }
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- main
function main() {
  fillRect(0, 0, W, H, PAPER);
  drawMasthead();
  drawHero();
  const cols = [28, 356, 684];
  const rows = [564, 786];
  STORIES.forEach((s, i) => {
    drawPanel(s, cols[i % 3], rows[Math.floor(i / 3)]);
  });
  drawFooter();
  const png = encodePNG();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
}

main();
