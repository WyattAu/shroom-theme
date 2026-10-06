#!/usr/bin/env node

"use strict";

/**
 * Repair translucent foreground tokens that fail WCAG 2.1 AA once alpha is
 * correctly composited.
 *
 * These tokens are the direct cause of the audit's previous blind spot: the
 * theme ships `#RRGGBBAA` values for text that VS Code renders as text, and
 * the old audit discarded the alpha byte, reporting ratios up to 9.9:1 for
 * tokens that are actually 1.2:1 on screen.
 *
 * Strategy per token:
 *   1. Raise the alpha to full opacity. This is the largest single gain and
 *      keeps the authored hue and lightness exactly as designed.
 *   2. If the opaque color still fails AA, lighten it along its own Lab hue,
 *      preserving hue and saturation, until it clears the threshold. Only the
 *      4 text tokens that are too dark at full opacity take this path.
 *
 * Decorative tokens (whitespace, indent guides, fold placeholders, shadows) are
 * intentionally left alone: WCAG sets no minimum contrast for non-text, and
 * making indent guides more visible than code would be a regression.
 */

const fs = require("fs");
const path = require("path");
const color = require("../color-science.js");

const THEMES_DIR = path.resolve(__dirname, "..", "themes");

/** Minimum WCAG 2.1 ratio for normal-size text (SC 1.4.3). */
const AA_NORMAL = 4.5;

/** Minimum WCAG 2.1 ratio for non-text UI components (SC 1.4.11). */
const AA_NON_TEXT = 3.0;

/**
 * Text tokens that must meet AA, with the background they sit on.
 * Only tokens that are genuinely rendered as text are listed.
 */
const TEXT_TOKENS = [
  ["editorLineNumber.foreground", "editor.background"],
  ["editor.placeholderForeground", "editor.background"],
  ["editor.placeholder.foreground", "editor.background"],
  ["editorGhostText.foreground", "editorGhostText.background"],
  ["editor.inactiveValuesForeground", "editor.background"],
  ["editor.foldPlaceholderForeground", "editor.background"],
  ["breadcrumb.foreground", "breadcrumb.background"],
  ["sideBar.descriptionForeground", "sideBar.background"],
];

/**
 * Border and separator tokens.
 *
 * These are non-text, so WCAG 2.2 SC 1.4.11 applies rather than SC 1.4.3: 3:1
 * is the threshold, not 4.5:1. Applying the text threshold here would force
 * bracket-match guides to a prominence they should not have.
 *
 * Deliberately excluded from this list, because they are decoration rather
 * than meaning: `editorIndentGuide.*`, `editorWhitespace.foreground`, all
 * `*.shadow` keys, and selection/hover/find highlights. Making indent guides
 * more visible than the code they organise would be a regression.
 */
const BORDER_TOKENS = [
  ["editorBracketMatch.border", "editor.background"],
  // The editor's focus indicator. It carries the keyboard focus state, so it
  // is a meaningful non-text component under WCAG 2.2 SC 1.4.11, not decoration.
  ["focusBorder", "editor.background"],
];

/**
 * Move a colour along its own Lab hue until it reaches a target contrast
 * against `bg`. Hue and chroma intent are preserved; only lightness moves.
 *
 * @param {string} hex starting color
 * @param {string} bg background
 * @param {number} target minimum WCAG 2.1 ratio
 * @param {"higher"|"lower"} direction which way to walk lightness
 * @returns {string} adjusted hex, or null if the threshold is unreachable
 */
function moveLightnessToContrast(hex, bg, target, direction) {
  if (color.wcag21(hex, bg) >= target) {return hex;}

  const { L, a, b } = color.rgbToLab(color.parseHex(hex));
  const hue = Math.atan2(b, a);
  const chroma = Math.hypot(a, b);
  const step = direction === "higher" ? 0.5 : -0.5;

  for (let l = L + step; direction === "higher" ? l <= 100 : l >= 0; l += step) {
    const candidate = labToHex(l, chroma, hue);
    if (color.wcag21(candidate, bg) >= target) {return candidate;}
  }
  return null;
}

/**
 * Lighten along the hue until the target contrast is reached.
 * @param {string} hex
 * @param {string} bg
 * @param {number} target
 * @returns {string|null}
 */
const lightenToContrast = (hex, bg, target) =>
  moveLightnessToContrast(hex, bg, target, "higher");

/**
 * Darken along the hue until the target contrast is reached.
 *
 * Needed for light themes, where raising contrast means going darker. On a
 * light background a colour that is already near the dark end cannot be
 * lightened, so the only remaining direction is down.
 *
 * @param {string} hex
 * @param {string} bg
 * @param {number} target
 * @returns {string|null}
 */
const darkenToContrast = (hex, bg, target) =>
  moveLightnessToContrast(hex, bg, target, "lower");

/**
 * Convert CIELAB to hex via the D65-anchored sRGB gamut.
 * @param {number} L lightness 0-100
 * @param {number} C chroma
 * @param {number} hueRad hue in radians
 * @returns {string} hex, gamut-clipped
 */
function labToHex(L, C, hueRad) {
  const a = C * Math.cos(hueRad);
  const b = C * Math.sin(hueRad);
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;

  const eps = 216 / 24389;
  const kappa = 24389 / 27;
  const finv = (t) => (t ** 3 > eps ? t ** 3 : (116 * t - 16) / kappa);

  const X = 0.9504559270516716 * finv(fx);
  const Y = finv(fy);
  const Z = 1.0890577507598784 * finv(fz);

  // XYZ -> linear sRGB
  const R = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
  const G = -0.969266 * X + 1.8760108 * Y + 0.041556 * Z;
  const B = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;

  return color.toHex({
    r: color.linearToSrgb(Math.max(0, Math.min(1, R))),
    g: color.linearToSrgb(Math.max(0, Math.min(1, G))),
    b: color.linearToSrgb(Math.max(0, Math.min(1, B))),
    a: 1,
  });
}

/**
 * Repair one theme file in place.
 * @param {string} file
 * @returns {{changes: Array<{token:string,from:string,to:string,before:number,after:number}>}}
 */
function repairTheme(file) {
  const filePath = path.join(THEMES_DIR, file);
  const theme = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const colors = theme.colors;
  const changes = [];

  // Text tokens first: they carry meaning, so they get the stricter threshold.
  for (const [fgKey, bgKey] of TEXT_TOKENS) {
    const fgVal = colors[fgKey];
    const bgVal = colors[bgKey];
    if (!fgVal || !bgVal) {continue;}

    const before = color.wcag21(fgVal, bgVal);
    if (before >= AA_NORMAL) {continue;}

    // Step 1: strip alpha. This is the largest single gain and keeps the
    // authored hue and lightness exactly as designed.
    let candidate = fgVal.slice(0, 7).toUpperCase();
    let after = color.wcag21(candidate, bgVal);

    // Step 2: still short, so move lightness along the hue until it clears.
    if (after < AA_NORMAL) {
      const lighter = lightenToContrast(candidate, bgVal, AA_NORMAL);
      candidate = lighter || darkenToContrast(candidate, bgVal, AA_NORMAL) || candidate;
      after = color.wcag21(candidate, bgVal);
    }

    colors[fgKey] = candidate;
    changes.push({ token: fgKey, from: fgVal, to: candidate, before, after });
  }

  // Non-text borders use the SC 1.4.11 threshold of 3:1.
  for (const [fgKey, bgKey] of BORDER_TOKENS) {
    const fgVal = colors[fgKey];
    const bgVal = colors[bgKey];
    if (!fgVal || !bgVal) {continue;}

    const before = color.wcag21(fgVal, bgVal);
    if (before >= AA_NON_TEXT) {continue;}

    let candidate = fgVal.slice(0, 7).toUpperCase();
    let after = color.wcag21(candidate, bgVal);
    if (after < AA_NON_TEXT) {
      const lighter = lightenToContrast(candidate, bgVal, AA_NON_TEXT);
      candidate = lighter || darkenToContrast(candidate, bgVal, AA_NON_TEXT) || candidate;
      after = color.wcag21(candidate, bgVal);
    }

    colors[fgKey] = candidate;
    changes.push({ token: fgKey, from: fgVal, to: candidate, before, after });
  }

  if (changes.length > 0) {
    fs.writeFileSync(filePath, JSON.stringify(theme, null, 2) + "\n", "utf8");
  }
  return { changes };
}

function main() {
  const files = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith(".json"));
  let total = 0;

  for (const file of files) {
    const { changes } = repairTheme(file);
    if (changes.length === 0) {continue;}
    console.log(`\n${file}`);
    for (const c of changes) {
      console.log(
        `  ${c.token}\n    ${c.from} -> ${c.to}   ${c.before.toFixed(2)}:1 -> ${c.after.toFixed(2)}:1`
      );
      total++;
    }
  }

  console.log(`\n${total} token(s) repaired across ${files.length} theme(s).`);
}

if (require.main === module) {main();}

module.exports = { repairTheme, TEXT_TOKENS, BORDER_TOKENS, AA_NORMAL, AA_NON_TEXT };
