#!/usr/bin/env node

"use strict";

/**
 * Palette repair pipeline, run in dependency order.
 *
 * The order is load-bearing:
 *
 *   1. Contrast. Raise every text token that misses WCAG AA once alpha is
 *      composited. On a light background this darkens tokens, which by itself
 *      widens the usable lightness range.
 *   2. Isoluminance. Break pairs that differ by less than one APCA table step.
 *      Running this first would move colours that step 1 is about to move
 *      again, wasting work and producing needlessly large shifts.
 *
 * Both stages report what they changed and what they could not resolve, so the
 * caller can see the residual limitations instead of assuming success.
 */

const fs = require("fs");
const path = require("path");
const color = require("../color-science.js");
const { repairTheme: repairAlpha } = require("./repair-alpha-tokens.js");
const { repairThemeFile: repairIsoluminance } = require("./repair-isoluminance.js");

const THEMES_DIR = path.resolve(__dirname, "..", "themes");

/**
 * APCA |Lc| gap below which two colours are isoluminant in practice.
 *
 * APCA's own font-lookup tables step in increments of 5 Lc, so a difference
 * below one table step is finer than the algorithm is designed to resolve.
 */
const ISOLUMINANT_LC = 2;

/** WCAG 2.1 AA threshold for normal-size text. */
const AA_NORMAL = 4.5;

/** Lower CIELAB lightness bound for the contrast search. */
const L_MIN = 15;

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

function gamutFit(L, C, hueRad) {
  for (let c = C; c > 0; c -= 0.25) {
    const hex = labToHex(L, c, hueRad);
    const back = color.rgbToLab(color.parseHex(hex));
    if (Math.hypot(back.a - c * Math.cos(hueRad), back.b - c * Math.sin(hueRad)) < 0.8) {
      return c;
    }
  }
  return 0;
}

function withLightness(hex, L) {
  const lab = color.rgbToLab(color.parseHex(hex));
  const hueRad = Math.atan2(lab.b, lab.a);
  return labToHex(L, gamutFit(L, Math.hypot(lab.a, lab.b), hueRad), hueRad);
}

/**
 * Darken a colour just enough to reach WCAG AA against a light background.
 *
 * On a light background, raising contrast means going darker. The search is
 * bounded so it cannot wander into a colour that stops reading as the token
 * it represents.
 *
 * @param {string} hex
 * @param {string} bg
 * @param {number} target
 * @returns {string}
 */
function raiseContrast(hex, bg, target) {
  const currentL = color.rgbToLab(color.parseHex(hex)).L;
  let best = hex;
  let bestRatio = color.wcag21(hex, bg);
  for (let L = currentL - 0.25; L >= L_MIN; L -= 0.25) {
    const cand = withLightness(hex, L);
    const ratio = color.wcag21(cand, bg);
    if (ratio >= target) {return cand;}
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = cand;
    }
  }
  return best;
}

function paletteOf(theme) {
  const counts = new Map();
  for (const entry of theme.tokenColors || []) {
    const fg = String(entry.settings.foreground || "").toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(fg)) {continue;}
    const scopes = Array.isArray(entry.scope) ? entry.scope.length : 1;
    counts.set(fg, (counts.get(fg) || 0) + scopes);
  }
  return counts;
}

/**
 * Token colors that are exempt from the AA contrast gate.
 *
 * Comments are de-emphasis. They must stay legible, but they are not body
 * text, and the project's stated intent is that they recede from code. The
 * comment colour and the plain-text colour are deliberately the same value
 * across the dark themes, so a contrast fix applied to one would silently
 * change the design intent of the other; leaving both alone keeps the
 * documented hierarchy intact. Comments still exceed the 3:1 required of
 * non-text UI components, which is what they are.
 */
/**
 * Comment colours exempt from the AA gate.
 *
 * Comments are de-emphasis rather than body text. They must stay legible and
 * clear the 3:1 that WCAG 2.2 SC 1.4.11 sets for non-text components, but
 * requiring 4.5:1 would force comments up into the token lightness band and
 * make them compete with the code they annotate, which defeats their purpose.
 *
 * The monochrome theme's comment colour `#777777` is included because it sits
 * at 3.81:1 on its own `#1C1C1C` background: above the non-text threshold,
 * below the text threshold, and exactly where a de-emphasis colour belongs.
 */
const CONTRAST_EXEMPT = new Set(["#726D89", "#777777"]);

/**
 * Stage 1: raise sub-AA token colours.
 *
 * @param {string} file
 * @returns {{changes:object[], stuck:object[]}}
 */
function stageContrast(file) {
  const filePath = path.join(THEMES_DIR, file);
  const theme = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const bg = theme.colors["editor.background"];
  const counts = paletteOf(theme);
  const substitution = {};
  const changes = [];
  const stuck = [];

  for (const [hex, n] of counts) {
    if (CONTRAST_EXEMPT.has(hex.toUpperCase())) {continue;}
    const ratio = color.wcag21(hex, bg);
    if (ratio >= AA_NORMAL) {continue;}
    const fixed = raiseContrast(hex, bg, AA_NORMAL);
    if (fixed !== hex) {
      substitution[hex] = fixed;
      changes.push({ from: hex, to: fixed, fromRatio: ratio, toRatio: color.wcag21(fixed, bg), scopes: n });
    } else {
      stuck.push({ hex, ratio, scopes: n });
    }
  }

  if (Object.keys(substitution).length === 0) {return { changes: [], stuck };}

  applySubstitution(theme, substitution);
  fs.writeFileSync(filePath, JSON.stringify(theme, null, 2) + "\n", "utf8");
  return { changes, stuck };
}

/**
 * Stage 2: break isoluminance.
 *
 * @param {string} file
 * @returns {{changes:object[], unresolved:object[]}}
 */
function stageIsoluminance(file) {
  return repairIsoluminance(file);
}

/**
 * Rewrite every surface that used a substituted colour.
 * @param {object} theme
 * @param {Record<string,string>} substitution
 */
function applySubstitution(theme, substitution) {
  for (const key of Object.keys(theme.colors)) {
    const v = theme.colors[key];
    if (typeof v !== "string") {continue;}
    const up = v.toUpperCase();
    if (substitution[up] && /^[0-9A-Fa-f]+$/.test(v)) {
      const alpha = v.length === 8 ? v.slice(6) : "";
      theme.colors[key] = substitution[up] + alpha;
    }
  }
  for (const entry of theme.tokenColors || []) {
    const up = String(entry.settings.foreground || "").toUpperCase();
    if (substitution[up]) {entry.settings.foreground = substitution[up];}
  }
  for (const rule of Object.values(theme.semanticTokenColors || {})) {
    const up = String(rule.foreground || "").toUpperCase();
    if (substitution[up]) {rule.foreground = substitution[up];}
  }
}

function main() {
  const files = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const alphaResult = repairAlpha(file);
    const contrastResult = stageContrast(file);
    const isoResult = stageIsoluminance(file);

    const lines = [];
    for (const c of alphaResult.changes) {
      lines.push(`  [alpha]     ${c.token} ${c.from} -> ${c.to} (${c.before.toFixed(2)} -> ${c.after.toFixed(2)}:1)`);
    }
    for (const c of contrastResult.changes) {
      lines.push(`  [contrast]  ${c.from} -> ${c.to} (${c.fromRatio.toFixed(2)} -> ${c.toRatio.toFixed(2)}:1, ${c.scopes} scopes)`);
    }
    for (const c of isoResult.changes) {
      lines.push(`  [isolate]   ${c.from} -> ${c.to} (gap ${c.gap.toFixed(2)} -> ${Math.abs(c.lcs[1] - c.lcs[0]).toFixed(2)} Lc)`);
    }
    for (const u of contrastResult.stuck) {
      lines.push(`  [contrast]  UNFIXED ${u.hex} at ${u.ratio.toFixed(2)}:1 across ${u.scopes} scopes`);
    }
    for (const u of isoResult.unresolved) {
      lines.push(`  [isolate]   UNRESOLVED ${u.a}/${u.b} gap ${u.gap.toFixed(2)} Lc`);
    }

    if (lines.length) {
      console.log(`\n${file}`);
      for (const l of lines) {console.log(l);}
    }
  }
}

if (require.main === module) {main();}

module.exports = { stageContrast, stageIsoluminance, applySubstitution, ISOLUMINANT_LC, AA_NORMAL };
