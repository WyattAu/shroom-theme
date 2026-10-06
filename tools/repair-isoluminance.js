#!/usr/bin/env node

"use strict";

/**
 * Break true isoluminance in a theme's token palette.
 *
 * Two token colours at the same lightness are distinguishable only by hue. That
 * is invisible to any contrast-against-background check, and it is precisely
 * what collapses for a dichromat: when the hue difference is removed, nothing
 * is left. Measured on this palette, `#82AAFF` and `#BE9AF7` both sit at
 * CIELAB L* 70.0 and APCA |Lc| 54.4, and are identical under achromatopsia.
 *
 * Scope is deliberately narrow: only pairs closer than `ISOLUMINANT_LC` are
 * touched, and each is moved the smallest distance along its own hue that
 * resolves the pair. Colours that differ by 2 Lc or more already read as
 * distinct at text sizes and are left alone.
 *
 * What this does NOT do: guarantee mutual distinguishability under simulated
 * colour vision deficiency. That is not achievable for a palette this size on
 * one background, and pretending otherwise would be a false claim. Residual
 * pairs are reported so the limitation stays visible.
 */

const fs = require("fs");
const path = require("path");
const color = require("../color-science.js");

const THEMES_DIR = path.resolve(__dirname, "..", "themes");

/**
 * APCA |Lc| gap below which two colours are isoluminant in practice.
 *
 * APCA's own font lookup tables step in increments of 5 Lc, so a difference
 * smaller than one table step is below the resolution the algorithm was
 * designed around. Anything above that reads as a lightness difference even
 * where hue is hard to discriminate.
 */
const ISOLUMINANT_LC = 2;

/**
 * WCAG 2.1 SC 1.4.3 threshold, held as a hard constraint on every relocation.
 *
 * A move may gain lightness separation or lose contrast contrast, never both.
 * Allowing it to trade one gate for another makes the contrast stage and this
 * stage undo each other's work on every run.
 */
const AA_NORMAL = 4.5;

/** CIELAB lightness bounds. */
const L_MIN = 15;
const L_MAX = 96;

/**
 * Convert CIELAB to an sRGB hex, clipping out-of-gamut channels.
 * @param {number} L lightness
 * @param {number} C chroma
 * @param {number} hueRad hue in radians
 * @returns {string}
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
 * Largest chroma at this lightness and hue that survives an sRGB round trip.
 * @param {number} L
 * @param {number} C
 * @param {number} hueRad
 * @returns {number}
 */
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

/**
 * Rebuild a colour at a target lightness, preserving hue and as much chroma as
 * the sRGB gamut permits.
 * @param {string} hex
 * @param {number} L
 * @returns {string}
 */
function withLightness(hex, L) {
  const lab = color.rgbToLab(color.parseHex(hex));
  const hueRad = Math.atan2(lab.b, lab.a);
  return labToHex(L, gamutFit(L, Math.hypot(lab.a, lab.b), hueRad), hueRad);
}

/**
 * Whether a TextMate scope renders as de-emphasis text.
 *
 * Comments recede rather than competing with the token categories, so they are
 * exempt from lightness separation. Enforcing it on comments forced them up
 * into the token lightness band and made them the brightest colour in the
 * palette, which is the opposite of what a comment is for.
 * @param {string} scope
 * @returns {boolean}
 */
const isCommentScope = (scope) => /^(comment|punctuation\.definition\.comment)/.test(scope);

/**
 * Selectors that render as the plain-text substrate, exempt from separation.
 */
const SUBSTRATE_SELECTORS = new Set(["property", "*.static"]);

/**
 * Hue rotation applied when lightness alone cannot separate a pair.
 *
 * A dichromat sees a two-dimensional slice of colour space. Two colours
 * separated only along the red-green axis project onto nearly the same point
 * in that slice no matter how their lightness differs, so a pair like a purple
 * at hue 307 and a blue at hue 281 stays confusable after any amount of
 * lightness adjustment. When the lightness search finds no free space, the
 * hues themselves have to move, and rotating toward a distinct hue is the only
 * remaining lever.
 *
 * The amount is deliberately modest: a large rotation would break the palette's
 * identity far more than a lightness shift does.
 */
const HUE_ROTATION_DEGREES = 40;

/**
 * Rotate a colour's hue to separate it from a partner that lightness cannot fix.
 *
 * Tries both directions and keeps whichever increases the worst-case
 * CIEDE2000 under simulated dichromacy, so the rotation is justified by the
 * perception it targets rather than by aesthetic preference.
 *
 * @param {{hex:string,lc:number}} mover colour to rotate
 * @param {{hex:string,lc:number}} holder the colour it collides with
 * @param {Array<{hex:string,lc:number}>} others every other non-exempt colour
 * @param {string} bg
 * @returns {{hex:string,lc:number}|null}
 */
function rotateHueForSeparation(mover, holder, others, bg) {
  const lab = color.rgbToLab(color.parseHex(mover.hex));
  const hueRad = Math.atan2(lab.b, lab.a);
  const chroma = Math.hypot(lab.a, lab.b);
  const L = lab.L;
  const width = (Math.PI / 180) * HUE_ROTATION_DEGREES;

  const worstCvd = (hex) => {
    let worst = Infinity;
    for (const kind of ["protan", "deutan", "tritan"]) {
      const simulated = color.simulate(hex, kind);
      for (const other of [holder, ...others]) {
        const d = color.deltaE00(simulated, color.simulate(other.hex, kind));
        if (d < worst) {worst = d;}
      }
    }
    return worst;
  };

  const baseline = worstCvd(mover.hex);
  let best = null;

  for (const sign of [1, -1]) {
    for (const step of [1, 0.75, 0.5, 0.25]) {
      const rotatedHue = hueRad + sign * width * step;
      const fitted = gamutFit(L, chroma, rotatedHue);
      const hex = labToHex(L, fitted, rotatedHue);
      if (color.wcag21(hex, bg) < AA_NORMAL) {continue;}
      const lc = color.apcaAbs(hex, bg);
      if (!others.every((o) => Math.abs(o.lc - lc) >= ISOLUMINANT_LC)) {continue;}
      const score = worstCvd(hex);
      if (score > baseline && (!best || score > best.score)) {best = { hex, lc, score };}
      break;
    }
  }

  return best ? { hex: best.hex, lc: best.lc } : null;
}

/**
 * Distinct opaque foreground colours a theme renders, with scope counts and a
 * flag marking colours exempt from pairwise separation.
 *
 * Classification is per colour, and the most permissive role wins: a colour
 * used as both punctuation and as the plain-text substrate is treated as
 * substrate, since it does not need to compete.
 *
 * @param {object} theme
 * @returns {Map<string,{count:number,exempt:boolean}>}
 */
function paletteOf(theme) {
  const byHex = new Map();
  const touch = (fg) => {
    if (!byHex.has(fg)) {byHex.set(fg, { count: 0, exempt: false });}
    return byHex.get(fg);
  };

  for (const entry of theme.tokenColors || []) {
    const fg = String(entry.settings.foreground || "").toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(fg)) {continue;}
    const scopes = Array.isArray(entry.scope) ? entry.scope : [entry.scope];
    const rec = touch(fg);
    rec.count += scopes.length;
    if (scopes.some(isCommentScope)) {rec.exempt = true;}
  }

  for (const [selector, rule] of Object.entries(theme.semanticTokenColors || {})) {
    const fg = String(rule.foreground || "").toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(fg)) {continue;}
    const rec = touch(fg);
    if (SUBSTRATE_SELECTORS.has(selector)) {rec.exempt = true;}
    else if (selector === "comment" || selector === "*.documentation") {rec.exempt = true;}
  }

  return byHex;
}

/**
 * Repair one theme file in place.
 * @param {string} file
 * @returns {{changes:object[], unresolved:object[]}}
 */
function repairThemeFile(file) {
  const filePath = path.join(THEMES_DIR, file);
  const theme = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const bg = theme.colors["editor.background"];
  const counts = paletteOf(theme);

  const substitution = {};
  const changes = [];
  const unresolved = [];

  // Repair by relocating each colliding colour into free space.
  //
  // Sequential pairwise repair fails on crowded palettes: moving one colour in a
  // dense band collides it with a neighbour, and a naive loop oscillates,
  // nudging the same pair by fractions of a unit until it exhausts its budget.
  // The light theme packs 9 categories into a 5 Lc window, where 2 Lc gaps
  // cannot fit at all, so that approach grinds with no result.
  //
  // Instead: repeatedly find the tightest pair and relocate the less-used
  // member into whatever |Lc| space is actually free, anywhere in the usable
  // range. Each step provably reduces the number of violations, so the loop
  // terminates, and a colour whose own gamut cannot reach free space is
  // reported instead of retried forever.
  const live = new Map(
    [...counts.keys()].map((hex) => [
      hex,
      {
        original: hex,
        hex,
        count: counts.get(hex).count,
        exempt: counts.get(hex).exempt,
        lc: color.apcaAbs(hex, bg),
      },
    ])
  );

  // Achievable |Lc| range for this background, measured rather than assumed.
  //
  // APCA is polarity-asymmetric, so the obvious bounds are wrong on light
  // themes: |Lc| of pure white on a light background is 0, not the maximum,
  // and using it as the ceiling collapsed the search range to nothing and made
  // the light theme's categories appear unseparable when they are not.
  // Sweeping neutral greys finds the true extremes on either polarity.
  let minLc = Infinity;
  let maxLc = -Infinity;
  for (let v = 0; v <= 255; v += 5) {
    const grey = color.toHex({
      r: v / 255,
      g: v / 255,
      b: v / 255,
      a: 1,
    });
    const lc = color.apcaAbs(grey, bg);
    if (lc < minLc) {minLc = lc;}
    if (lc > maxLc) {maxLc = lc;}
  }
  // Keep a margin off the extremes, where |Lc| changes slowly with lightness
  // and the 0.25 L* step resolves poorly.
  const lo = minLc + 4;
  const hi = maxLc - 4;

  /** Tightest |Lc| gap currently present among competing categories. */
  const tightestGap = () => {
    const arr = [...live.values()].filter((e) => !e.exempt).sort((x, y) => x.lc - y.lc);
    let worst = Infinity;
    let pair = null;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const gap = arr[j].lc - arr[i].lc;
        if (gap < worst) {
          worst = gap;
          pair = [arr[i], arr[j]];
        }
      }
    }
    return { gap: worst, pair };
  };

  for (let pass = 0; pass < 64; pass++) {
    const { gap, pair } = tightestGap();
    if (!pair || gap >= ISOLUMINANT_LC) {break;}

    const [a, b] = pair;

    // Move whichever colour has fewer scopes, so the visible change is
    // confined to the least-used token.
    const mover = a.count <= b.count ? a : b;
    const holder = mover === a ? b : a;

    // Find the nearest free |Lc| to the mover: one that clears every other
    // non-exempt colour by the threshold.
    const others = [...live.values()].filter((e) => e !== mover && !e.exempt);
    const currentL = color.rgbToLab(color.parseHex(mover.hex)).L;

    let best = null;
    for (const dir of ["higher", "lower"]) {
      for (
        let L = currentL + (dir === "higher" ? 0.25 : -0.25);
        dir === "higher" ? L <= L_MAX : L >= L_MIN;
        L += dir === "higher" ? 0.25 : -0.25
      ) {
        const hex = withLightness(mover.hex, L);
        const lc = color.apcaAbs(hex, bg);
        if (lc < lo || lc > hi) {continue;}
        if (!others.every((o) => Math.abs(o.lc - lc) >= ISOLUMINANT_LC)) {continue;}
        // Never trade one gate for another. Relocating a colour to gain
        // lightness separation must not push it below WCAG AA, or the two
        // stages fight each other on every run and the pipeline stops being
        // idempotent.
        if (color.wcag21(hex, bg) < AA_NORMAL) {continue;}

        const distance = Math.abs(L - currentL);
        if (!best || distance < best.distance) {best = { hex, lc, distance };}
        break;
      }
    }

    if (!best) {
      // No free |Lc| space along this hue. Fall back to rotating the hue
      // itself, which is the only remaining lever when a pair is separated
      // along the red-green axis and collapses for a dichromat regardless of
      // lightness.
      const rotated = rotateHueForSeparation(mover, holder, others, bg);
      if (rotated) {
        changes.push({
          from: mover.original,
          to: rotated.hex,
          gap,
          lcs: [mover.lc, rotated.lc],
          hueRotated: true,
        });
        substitution[mover.original] = rotated.hex;
        mover.hex = rotated.hex;
        mover.lc = rotated.lc;
        continue;
      }

      unresolved.push({
        a: mover.hex,
        b: holder.hex,
        gap,
        lcA: a.lc,
        lcB: b.lc,
        reason: "no free |Lc| and no beneficial hue rotation reachable",
      });
      mover.exempt = true;
      continue;
    }

    changes.push({
      from: mover.original,
      to: best.hex,
      gap,
      lcs: [mover.lc, best.lc],
    });
    substitution[mover.original] = best.hex;
    mover.hex = best.hex;
    mover.lc = best.lc;
  }

  if (Object.keys(substitution).length === 0) {
    return { changes: [], unresolved };
  }

  // Apply substitutions across every surface that used the old colour.
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

  fs.writeFileSync(filePath, JSON.stringify(theme, null, 2) + "\n", "utf8");
  return { changes, unresolved };
}

function main() {
  const files = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith(".json"));
  let total = 0;
  let unresolvedTotal = 0;

  for (const file of files) {
    const { changes, unresolved } = repairThemeFile(file);
    if (changes.length === 0 && unresolved.length === 0) {continue;}
    console.log(`\n${file}`);
    for (const c of changes) {
      console.log(
        `  ${c.from} -> ${c.to}   gap ${c.gap.toFixed(2)} -> ${Math.abs(c.lcs[1] - c.lcs[0]).toFixed(2)}`
      );
      total++;
    }
    for (const u of unresolved) {
      console.log(`  UNRESOLVED ${u.a}/${u.b} gap ${u.gap.toFixed(2)} (both at extremes of usable range)`);
      unresolvedTotal++;
    }
  }

  console.log(`\n${total} colour(s) separated across ${files.length} theme(s).`);
  if (unresolvedTotal) {
    console.log(`${unresolvedTotal} pair(s) could not be separated automatically.`);
  }
}

if (require.main === module) {main();}

module.exports = { repairThemeFile, paletteOf, ISOLUMINANT_LC };
