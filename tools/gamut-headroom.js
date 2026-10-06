#!/usr/bin/env node

"use strict";

/**
 * Report how much of the sRGB gamut each token colour occupies, and why a
 * colour that looks moderately saturated can be at the edge.
 *
 * The chroma measurement must use a strict round-trip test. A lightness-only
 * test accepts colours that came back with much more chroma than requested,
 * because clipping one channel leaves the others saturated and the resulting
 * lightness still lands within tolerance. Measured on this palette, that test
 * reported `#AD58FF` at 95% of a claimed ceiling of 99.5, while the true
 * in-gamut chroma at that lightness and hue is 96.0, putting it at 99%.
 *
 * Chroma headroom matters for a specific reason: a colour pressed against the
 * gamut boundary cannot be moved much without clipping, and clipping shifts
 * hue. That is what the repair pipeline needs room for when it separates
 * isoluminant pairs, and a clipped colour behaves differently on a wide-gamut
 * display, where it is inside the panel's gamut but outside the values the
 * theme specified.
 *
 * A diagnostic, not a gate. Chroma percentage measures headroom, not quality.
 */

const fs = require("fs");
const path = require("path");
const color = require("../color-science.js");
const { labToHex } = require("./repair-isoluminance.js");

const THEMES_DIR = path.resolve(__dirname, "..", "themes");

/**
 * Largest chroma that survives a strict sRGB round trip.
 *
 * Acceptance requires the lightness to land within 0.5 and the chroma vector to
 * land within 1.0 of what was asked for. Both tests are needed: lightness alone
 * is too permissive, and chroma alone would reject hues that round-trip
 * acceptably at a shifted lightness.
 *
 * @param {number} L lightness
 * @param {number} hueRad hue in radians
 * @returns {number}
 */
function maxChroma(L, hueRad) {
  const cos = Math.cos(hueRad);
  const sin = Math.sin(hueRad);
  for (let C = 180; C > 0; C -= 0.25) {
    const want = { a: C * cos, b: C * sin };
    const back = color.rgbToLab(color.parseHex(labToHex(L, C, hueRad)));
    if (Math.abs(back.L - L) < 0.5 && Math.hypot(back.a - want.a, back.b - want.b) < 1.0) {
      return C;
    }
  }
  return 0;
}

/**
 * Fraction of the gamut above which a token is reported as tight.
 *
 * Set high deliberately. Chroma usage alone says little about whether a colour
 * has room to move, because the sRGB ceiling depends steeply on both lightness
 * and hue. A blue at L* 70 can hold only C=48, and at L* 80 only C=32, so most
 * usable blues are unavoidably above 90% and flagging them would be noise. The
 * useful signal is a colour at the ceiling *with little lightness headroom
 * above or below it*, which is where a repair has nowhere to go.
 */
const HEADROOM_WARN = 0.95;

function main() {
  const files = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith(".json")).sort();
  let warned = 0;

  for (const file of files) {
    const theme = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, file), "utf8"));
    const bg = theme.colors["editor.background"];
    const seen = new Set();
    for (const entry of theme.tokenColors) {
      const fg = String(entry.settings.foreground || "").toUpperCase();
      if (/^#[0-9A-F]{6}$/.test(fg) && fg !== bg.toUpperCase()) seen.add(fg);
    }

    const rows = [...seen]
      .map((hex) => {
        const lch = color.rgbToLch(color.parseHex(hex));
        const max = maxChroma(lch.L, (lch.h * Math.PI) / 180);
        return { hex, ...lch, max, used: max > 0 ? (100 * lch.C) / max : 0 };
      })
      .sort((a, b) => color.apcaAbs(a.hex, bg) - color.apcaAbs(b.hex, bg));

    console.log(`\n=== ${file} ===`);
    console.log("  hex      L*     C   hue   maxC  used  |Lc|");
    for (const r of rows) {
      const tight = r.used >= HEADROOM_WARN * 100;
      if (tight) warned++;
      const flag = tight ? `  <- tight, ${r.used.toFixed(0)}% of gamut` : "";
      console.log(
        `  ${r.hex} ${r.L.toFixed(1).padStart(5)} ${r.C.toFixed(1).padStart(6)} ` +
          `${r.h.toFixed(0).padStart(4)} ${r.max.toFixed(1).padStart(6)} ` +
          `${(r.used.toFixed(0) + "%").padStart(5)} ${color.apcaAbs(r.hex, bg).toFixed(1).padStart(6)}${flag}`
      );
    }
  }

  console.log("");
  console.log(
    warned === 0
      ? `No token colour is above ${(HEADROOM_WARN * 100).toFixed(0)}% of its gamut ceiling.`
      : `${warned} token colour(s) above ${(HEADROOM_WARN * 100).toFixed(0)}% of their gamut ceiling.`
  );
  console.log(
    "High chroma usage is expected in the blue and magenta regions: sRGB allows\n" +
      "less chroma as a blue lightens (C=48 at L* 70, C=32 at L* 80), so most\n" +
      "usable blues sit near the ceiling without anything being wrong with them."
  );
}

if (require.main === module) main();

module.exports = { maxChroma, HEADROOM_WARN };
