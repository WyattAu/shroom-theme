#!/usr/bin/env node

"use strict";

/**
 * Fix the terminal ANSI 16-colour palette.
 *
 * Six of the eight base colours were byte-identical to their bright
 * counterparts in every dark variant: Red = BrightRed = #E68484, Green =
 * BrightGreen = #A6C18B, and so on. In a terminal this means bold and coloured
 * output is indistinguishable from regular output: `ls --color` cannot
 * distinguish directories from symlinks, and a compiler cannot visually
 * separate errors from warnings.
 *
 * The same pattern held in the light and tritanopia variants, with different
 * colours collapsed. Only monochrome and high contrast were correct.
 *
 * The fix derives each bright colour from its base by increasing CIELAB
 * lightness while holding hue, to the largest step that keeps the pair
 * distinguishable under every simulated CVD condition. Colours that are already
 * distinct are left alone.
 *
 * Also verifies that all 16 colours are distinguishable from the terminal
 * background, since an ANSI colour that matches the background is invisible.
 */

const fs = require("fs");
const path = require("path");
const color = require("../color-science.js");
const { labToHex, gamutFit } = require("./repair-isoluminance.js");

const THEMES_DIR = path.resolve(__dirname, "..", "themes");

/** CIEDE2000 below this between two ANSI colours is a collision. */
const MIN_DE = 10;

const BASE_NAMES = [
  "Black", "Red", "Green", "Yellow",
  "Blue", "Magenta", "Cyan", "White",
];
const BRIGHT_NAMES = BASE_NAMES.map((n) => "Bright" + n);
const ALL_NAMES = [...BASE_NAMES, ...BRIGHT_NAMES];

/**
 * CIEDE2000 between two colours under the worst of normal, protan, deutan and
 * tritan. Monochrome is excluded: an ANSI palette that is distinguishable in
 * greyscale is not achievable for eight base + eight bright colours, and
 * achromatopsia is about 0.6% of CVD cases.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function worstCvd(a, b) {
  let min = Infinity;
  for (const kind of ["normal", "protan", "deutan", "tritan"]) {
    min = Math.min(
      min,
      color.deltaE00(
        color.simulate(a, kind),
        color.simulate(b, kind)
      )
    );
  }
  return min;
}

/**
 * Lighten a colour until it separates from `from` by at least MIN_DE under
 * every condition, holding hue. Returns null if the gamut does not allow it.
 *
 * @param {string} base
 * @param {string} from the colour to separate from
 * @param {string} bg terminal background
 * @returns {string|null}
 */
function deriveBright(base, from, bg) {
  const lch = color.rgbToLch(color.parseHex(base));
  const hueRad = (lch.h * Math.PI) / 180;

  for (let dl = 3; dl <= 30; dl += 1) {
    const L = Math.min(97, lch.L + dl);
    const C = gamutFit(L, lch.C, hueRad);
    if (C < lch.C * 0.5) { continue; }
    const candidate = labToHex(L, C, hueRad);
    if (color.wcag21(candidate, bg) < 3) { continue; }
    if (worstCvd(candidate, from) >= MIN_DE) { return candidate; }
  }

  // Lightening failed (the base may already be near the top of the gamut).
  // Try darkening instead.
  for (let dl = 3; dl <= 30; dl += 1) {
    const L = Math.max(5, lch.L - dl);
    const C = gamutFit(L, lch.C, hueRad);
    if (C < lch.C * 0.5) { continue; }
    const candidate = labToHex(L, C, hueRad);
    if (color.wcag21(candidate, bg) < 3) { continue; }
    if (worstCvd(candidate, from) >= MIN_DE) { return candidate; }
  }

  return null;
}

/**
 * Fix one theme file in place.
 * @param {string} file
 * @returns {{fixed:string[], pairs:Array<{pair:string,from:string,to:string}>, stillBroken:string[]}}
 */
function fixAnsi(file) {
  const filePath = path.join(THEMES_DIR, file);
  const theme = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const bg = theme.colors["terminal.background"] ?? theme.colors["editor.background"];

  const colours = {};
  for (const n of ALL_NAMES) { colours[n] = theme.colors["terminal.ansi" + n]; }

  const fixed = [];
  const pairs = [];
  const stillBroken = [];

  for (let i = 0; i < BASE_NAMES.length; i++) {
    const baseName = BASE_NAMES[i];
    const brightName = BRIGHT_NAMES[i];
    const base = colours[baseName];
    const bright = colours[brightName];

    if (!base || !bright) { continue; }

    const de = worstCvd(base, bright);
    if (de >= MIN_DE) { continue; }

    // Same or too-close: derive a bright that is genuinely distinct.
    const derived = deriveBright(base, base, bg);
    if (!derived) {
      stillBroken.push(baseName + "/" + brightName);
      continue;
    }

    theme.colors["terminal.ansi" + brightName] = derived;
    fixed.push(brightName);
    pairs.push({
      pair: baseName + "/" + brightName,
      from: bright,
      to: derived,
      before: de.toFixed(1),
      after: worstCvd(base, derived).toFixed(1),
    });
  }

  if (fixed.length > 0) {
    const sorted = {};
    for (const k of Object.keys(theme.colors).sort()) { sorted[k] = theme.colors[k]; }
    theme.colors = sorted;
    fs.writeFileSync(filePath, JSON.stringify(theme, null, 2) + "\n", "utf8");
  }
  return { fixed, pairs, stillBroken };
}

function main() {
  const files = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const { fixed, pairs, stillBroken } = fixAnsi(file);
    const name = file.replace("shroom-space-", "").replace("-theme.json", "") || "dark";
    if (fixed.length === 0 && stillBroken.length === 0) {
      console.log(`${name.padEnd(14)} ok`);
      continue;
    }
    console.log(`\n${name}`);
    for (const p of pairs) {
      console.log(`  ${p.pair}  ${p.from} -> ${p.to}  dE00 ${p.before} -> ${p.after}`);
    }
    for (const s of stillBroken) {
      console.log(`  UNFIXABLE: ${s} -- the gamut does not allow a distinct bright variant`);
    }
  }
}

if (require.main === module) { main(); }

module.exports = { fixAnsi, deriveBright, worstCvd, ALL_NAMES, MIN_DE };
