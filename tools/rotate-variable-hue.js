#!/usr/bin/env node

"use strict";

/**
 * Rotate the variable/parameter token colour by a fixed offset, per theme.
 *
 * Fixed offset rather than search, and the reason is measured rather than
 * aesthetic. An unconstrained search over the hue circle picks the rotation
 * that maximises keyword/variable separation under simulated dichromacy, and on
 * this palette that is amber at +85, which lifts the pair from 1.55 to 16.16
 * CIEDE2000. It does so by landing the variable on the constant colour's hue,
 * dropping their normal-vision separation to 9.02. The problem is moved, not
 * solved: with nine token colours the hue circle is already full, so every
 * rotation collides with something.
 *
 * Pink at +54 is the one rotation that improves the target pair while leaving
 * every other pairwise distance healthy. It takes keyword/variable from 1.55 to
 * 7.39 under dichromacy and leaves the nearest other token at 19.55.
 *
 * The offset is applied from each theme's own variable hue, so the resulting
 * hue differs between variants.
 */

const fs = require("fs");
const path = require("path");
const color = require("../color-science.js");
const { labToHex, gamutFit } = require("./repair-isoluminance.js");

const THEMES_DIR = path.resolve(__dirname, "..", "themes");

/** Hue offset applied to the variable colour, in degrees. */
const HUE_ROTATION = 54;

/** Semantic selectors that resolve to the variable/parameter role. */
const VARIABLE_SELECTORS = new Set([
  "variable",
  "parameter",
  "variable.declaration",
  "parameter.declaration",
]);

/** Smallest share of the original chroma an acceptable result may keep. */
const MIN_CHROMA_KEEP = 0.6;

/** WCAG 2.1 SC 1.4.3, held while rotating. */
const AA_NORMAL = 4.5;

/** Current variable/parameter colour for a theme. */
function variableColour(theme) {
  for (const [selector, rule] of Object.entries(theme.semanticTokenColors || {})) {
    if (!VARIABLE_SELECTORS.has(selector)) { continue; }
    const fg = String(rule.foreground || "").toUpperCase();
    if (/^#[0-9A-F]{6}$/.test(fg)) { return fg; }
  }
  return null;
}

/**
 * Rotate a colour by an offset, holding lightness and as much chroma as the
 * gamut allows. Returns null when the rotation cannot keep enough chroma or
 * enough contrast, so the caller skips the theme rather than shipping a
 * washed-out token.
 */
function rotate(hex, offsetDeg, bg) {
  const lch = color.rgbToLch(color.parseHex(hex));
  const hueTo = (((lch.h + offsetDeg) % 360) + 360) % 360;
  const hRad = (hueTo * Math.PI) / 180;
  const chroma = gamutFit(lch.L, lch.C, hRad);
  if (chroma < lch.C * MIN_CHROMA_KEEP) { return null; }
  const candidate = labToHex(lch.L, chroma, hRad);
  if (color.wcag21(candidate, bg) < AA_NORMAL) { return null; }
  return {
    hex: candidate,
    hueFrom: lch.h,
    hueTo: hueTo,
    chromaFrom: lch.C,
    chromaTo: chroma,
  };
}

/** Apply to one theme file in place. */
function rotateThemeVariable(file) {
  const filePath = path.join(THEMES_DIR, file);
  const theme = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const bg = theme.colors["editor.background"];

  const current = variableColour(theme);
  if (!current) { return { changed: false, detail: null }; }

  // Greyscale variants have no hue to rotate: their token colours are greys and
  // their design is a lightness ramp preserving semantic rank.
  const lch = color.rgbToLch(color.parseHex(current));
  if (lch.C < 1) { return { changed: false, detail: null }; }

  const rotated = rotate(current, HUE_ROTATION, bg);
  if (!rotated) { return { changed: false, detail: null }; }

  for (const entry of theme.tokenColors) {
    if (String(entry.settings.foreground || "").toUpperCase() === current) {
      entry.settings.foreground = rotated.hex;
    }
  }
  for (const rule of Object.values(theme.semanticTokenColors || {})) {
    if (String(rule.foreground || "").toUpperCase() === current) {
      rule.foreground = rotated.hex;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(theme, null, 2) + "\n", "utf8");
  return { changed: true, detail: Object.assign({ from: current }, rotated) };
}

function main() {
  const files = fs.readdirSync(THEMES_DIR).filter(function (f) { return f.endsWith(".json"); });
  for (const file of files) {
    const out = rotateThemeVariable(file);
    const name = file.replace("shroom-space-", "").replace("-theme.json", "") || "dark";
    if (!out.changed) {
      console.log(name.padEnd(14) + " unchanged (greyscale, or no viable rotation)");
      continue;
    }
    const d = out.detail;
    console.log(
      name.padEnd(14) + " " + d.from + " -> " + d.hex + "   hue " +
      d.hueFrom.toFixed(0) + " -> " + d.hueTo.toFixed(0) + "   chroma " +
      d.chromaFrom.toFixed(1) + " -> " + d.chromaTo.toFixed(1)
    );
  }
}

if (require.main === module) { main(); }

module.exports = { rotateThemeVariable, variableColour, rotate, HUE_ROTATION };
