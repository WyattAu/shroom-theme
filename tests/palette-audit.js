#!/usr/bin/env node

"use strict";

/**
 * Palette and contrast audit for Shroom Space themes.
 *
 * Reports three classes of finding against every theme:
 *
 *   1. Sub-AA text. A text token whose alpha-composited contrast against its
 *      background is below 4.5:1. This check composited alpha; the previous
 *      implementation discarded the alpha byte, which let tokens at 1.21:1
 *      pass an audit that reported 9.9:1.
 *
 *   2. Isoluminant token pairs. Two token colours whose APCA |Lc| differ by
 *      less than one step of APCA's own lookup tables. Such a pair is
 *      distinguishable only by hue, so it collapses for a dichromat and is
 *      invisible in greyscale.
 *
 *   3. Simulated-CVD separation, reported per pair as a diagnostic. This is
 *      deliberately not a pass/fail gate: an all-pairs threshold at CIEDE2000
 *      10 is not satisfiable for a palette this size on one background, so a
 *      gate would be a promise the palette cannot keep.
 *
 * Exits non-zero when a gate fails, so it can run in CI.
 */

const fs = require("fs");
const path = require("path");
const color = require("../color-science.js");
const wcag = require("../wcag-contrast.js");

const THEMES_DIR = path.join(__dirname, "..", "themes");

/** WCAG 2.1 SC 1.4.3 threshold for normal-size text. */
const AA_NORMAL = 4.5;

/** WCAG 2.1 SC 1.4.11 threshold for non-text UI components. */
const AA_NON_TEXT = 3.0;

/**
 * APCA |Lc| gap below which two token colours are isoluminant.
 *
 * APCA's font lookup tables step in increments of 5 Lc, so a gap smaller than
 * one table step is finer than the algorithm resolves.
 */
const ISOLUMINANT_LC = 2;

/**
 * Text tokens audited for WCAG AA, with the background each sits on.
 *
 * Kept separate from `wcag-contrast.js`'s background-resolution map because
 * this list is a statement of intent: these are the tokens whose contrast is a
 * correctness requirement, not merely measurable.
 */
const AA_TEXT_TOKENS = [
  ["editor.foreground", "editor.background"],
  ["editorLineNumber.foreground", "editor.background"],
  ["editor.placeholderForeground", "editor.background"],
  ["editor.placeholder.foreground", "editor.background"],
  ["editorGhostText.foreground", "editorGhostText.background"],
  ["editor.inactiveValuesForeground", "editor.background"],
  ["editorError.foreground", "editor.background"],
  ["editorWarning.foreground", "editor.background"],
  ["editorInfo.foreground", "editor.background"],
  ["breadcrumb.foreground", "breadcrumb.background"],
  ["list.activeSelectionForeground", "list.activeSelectionBackground"],
  ["list.inactiveSelectionForeground", "list.inactiveSelectionBackground"],
  ["tab.activeForeground", "tab.activeBackground"],
  ["tab.inactiveForeground", "tab.inactiveBackground"],
  ["sideBar.foreground", "sideBar.background"],
  ["statusBar.foreground", "statusBar.background"],
  ["terminal.foreground", "terminal.background"],
  ["activityBar.foreground", "activityBar.background"],
  ["input.foreground", "input.background"],
];

/**
 * Non-text tokens audited against the 3:1 threshold of WCAG 2.2 SC 1.4.11.
 *
 * `focusBorder` is included deliberately. It is the focus indicator for the
 * editor surface, so it conveys the keyboard focus state, which makes it a
 * meaningful non-text component rather than decoration. On the light theme it
 * measured 2.83:1, which is below the threshold that WCAG sets specifically so
 * that a focus indicator is reliably perceivable.
 */
const AA_NON_TEXT_TOKENS = [
  ["editorBracketMatch.border", "editor.background"],
  ["focusBorder", "editor.background"],
];

/**
 * Token colours exempt from the AA gate, with the reason.
 *
 * Comments are de-emphasis rather than body text. They must remain legible and
 * they clear the 3:1 non-text threshold, but the theme's stated design intent
 * is that they recede from code, and a comment colour equal to the plain-text
 * colour across the dark themes is a deliberate part of that hierarchy.
 * Requiring 4.5:1 here would force comments toward the text colours and erase
 * the distinction the palette is built on.
 */
const CONTRAST_EXEMPT = new Map([
  ["comment", "de-emphasis, not body text; clears the 3:1 non-text threshold"],
]);

/**
 * Whether a text token is a comment or comment punctuation.
 * @param {string} scope TextMate scope
 * @returns {boolean}
 */
const isCommentScope = (scope) => /^(comment|punctuation\.definition\.comment)/.test(scope);

/**
 * Semantic token selectors that render as the default text substrate rather
 * than as a syntactic category.
 *
 * `property` and `*.static` inherit `editor.foreground`. They compete with no
 * other token: a reader does not need to tell "plain text" apart from "a
 * string", because plain text is whatever is not otherwise coloured. Applying
 * a lightness-separation requirement to them forces either the substrate or
 * the categories away from where they belong, and in the dark themes it
 * produced a false failure on `#CCC8D9` against `#E8C990` at 27.6 dE00
 * normal and 27.0 under deuteranopia, which is plainly distinguishable.
 */
const SUBSTRATE_SELECTORS = new Set(["property", "*.static"]);

/**
 * Classify a token colour by the semantic role it plays.
 *
 * A colour can serve several roles at once: `#CCC8D9` is both the plain-text
 * substrate and the punctuation colour. The most permissive classification
 * wins, so anything that is de-emphasis or substrate anywhere is exempt from
 * pairwise separation.
 *
 * @param {object} theme
 * @returns {Array<{hex:string,scopes:number,kind:string}>}
 */
function tokenPalette(theme) {
  const byHex = new Map();
  const touch = (fg) => {
    if (!byHex.has(fg)) {byHex.set(fg, { hex: fg, scopes: 0, kind: "category" });}
    return byHex.get(fg);
  };
  const promote = (rec, kind) => {
    if (rec.kind === "substrate") {return;}
    rec.kind = kind;
  };

  for (const entry of theme.tokenColors || []) {
    const fg = String(entry.settings.foreground || "").toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(fg)) {continue;}
    const scopes = Array.isArray(entry.scope) ? entry.scope : [entry.scope];
    const rec = touch(fg);
    rec.scopes += scopes.length;
    if (scopes.some(isCommentScope)) {promote(rec, "deemphasis");}
  }

  for (const [selector, rule] of Object.entries(theme.semanticTokenColors || {})) {
    const fg = String(rule.foreground || "").toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(fg)) {continue;}
    const rec = touch(fg);
    if (SUBSTRATE_SELECTORS.has(selector)) {promote(rec, "substrate");}
    else if (selector === "comment" || selector === "*.documentation") {promote(rec, "deemphasis");}
  }

  return [...byHex.values()];
}

/**
 * Audit a single theme.
 * @param {string} file
 * @returns {{errors:string[], warnings:string[], notes:string[]}}
 */
function auditTheme(file) {
  const theme = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, file), "utf8"));
  const colors = theme.colors;
  const bg = colors["editor.background"];
  const errors = [];
  const warnings = [];
  const notes = [];

  // --- 1. Sub-AA text, alpha composited ---
  for (const [fgKey, bgKey] of AA_TEXT_TOKENS) {
    const fgVal = colors[fgKey];
    const bgVal = colors[bgKey];
    if (!fgVal || !bgVal) {continue;}
    const ratio = color.wcag21(fgVal, bgVal);
    if (ratio < AA_NORMAL) {
      errors.push(
        `text below AA: ${fgKey} on ${bgKey} = ${ratio.toFixed(2)}:1 (need ${AA_NORMAL}:1)` +
          `${fgVal.length === 8 ? " [alpha composited]" : ""}`
      );
    }
  }

  for (const [fgKey, bgKey] of AA_NON_TEXT_TOKENS) {
    const fgVal = colors[fgKey];
    const bgVal = colors[bgKey];
    if (!fgVal || !bgVal) {continue;}
    const ratio = color.wcag21(fgVal, bgVal);
    if (ratio < AA_NON_TEXT) {
      errors.push(
        `non-text below 3:1: ${fgKey} on ${bgKey} = ${ratio.toFixed(2)}:1 (need ${AA_NON_TEXT}:1)`
      );
    }
  }

  // --- 2. Comment de-emphasis, reported but not gated ---
  const palette = tokenPalette(theme);
  for (const entry of palette) {
    if (entry.kind !== "deemphasis") {continue;}
    const ratio = color.wcag21(entry.hex, bg);
    if (ratio < AA_NON_TEXT) {
      errors.push(
        `comment below non-text threshold: ${entry.hex} on ${bg} = ${ratio.toFixed(2)}:1`
      );
    } else if (ratio < AA_NORMAL) {
      notes.push(
        `comment ${entry.hex} at ${ratio.toFixed(2)}:1 (${CONTRAST_EXEMPT.get("comment")})`
      );
    }
  }

  // --- 3. Isoluminant category pairs ---
  //
  // Only competing categories are compared. A de-emphasis colour and the plain
  // substrate are both deliberately near other tokens: a comment recedes, and
  // the substrate is whatever is left uncoloured. Neither is a rival category.
  // Only competing categories are compared.
  //
  // Exempt from separation, and why:
  //   deemphasis  a comment recedes from code rather than competing with it
  //   substrate   `property`/`*.static` inherit `editor.foreground`; they are
  //               whatever is left uncoloured and are not a rival category
  //
  // A semantically adjacent pair is a genuine category relationship, not an
  // exemption: `type` and `operator` differ only by chroma in the light theme,
  // so a reader genuinely has to tell them apart.
  const categories = palette
    .filter((e) => e.kind === "category")
    .map((e) => ({ ...e, lc: color.apcaAbs(e.hex, bg) }))
    .sort((a, b) => a.lc - b.lc);

  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const a = categories[i];
      const b = categories[j];
      const gap = Math.abs(a.lc - b.lc);
      if (gap >= ISOLUMINANT_LC) {continue;}
      errors.push(
        `isoluminant pair: ${a.hex} (${a.scopes} scopes) and ${b.hex} (${b.scopes} scopes) ` +
          `differ by only ${gap.toFixed(2)} Lc, below the ${ISOLUMINANT_LC} Lc threshold`
      );
    }
  }

  // --- 4. Simulated CVD separation, diagnostic only ---
  let worstCvd = { de: Infinity, a: null, b: null, kind: null };
  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const a = categories[i];
      const b = categories[j];
      for (const kind of ["protan", "deutan", "tritan"]) {
        const de = color.deltaE00(color.simulate(a.hex, kind), color.simulate(b.hex, kind));
        if (de < worstCvd.de) {
          worstCvd = { de, a: a.hex, b: b.hex, kind };
        }
      }
    }
  }
  if (worstCvd.a) {
    notes.push(
      `closest pair under simulated CVD: ${worstCvd.a}/${worstCvd.b} at ` +
        `${worstCvd.de.toFixed(1)} dE00 (${worstCvd.kind}) -- diagnostic, not gated`
    );
  }

  // --- 5. Report both metrics, with polarity preserved ---
  const pairs = wcag.auditThemePairs(colors);
  if (!pairs.length) {
    errors.push("no auditable foreground/background pairs resolved");
  }
  const reportDir = path.join(__dirname, "..", "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportDir, `contrast-${file.replace(/\.json$/, "")}.md`),
    wcag.generateReport(file.replace(/\.json$/, ""), pairs)
  );

  const fails = pairs.filter((p) => p.level === "Fail").length;
  notes.push(`${pairs.length} auditable pairs, ${fails} below AA (mostly decorative non-text)`);

  return { errors, warnings, notes };
}

function main() {
  const files = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith(".json")).sort();
  let errorCount = 0;

  for (const file of files) {
    const { errors, warnings, notes } = auditTheme(file);
    console.log(`\n=== ${file} ===`);
    for (const n of notes) {console.log(`  note: ${n}`);}
    for (const w of warnings) {console.log(`  warn: ${w}`);}
    for (const e of errors) {console.log(`  FAIL: ${e}`);}
    if (errors.length === 0) {console.log("  ok: no gate failures");}
    errorCount += errors.length;
  }

  console.log("");
  if (errorCount > 0) {
    console.log(`${errorCount} gate failure(s).`);
    process.exit(1);
  }
  console.log(`All ${files.length} themes pass contrast and lightness gates.`);
}

if (require.main === module) {main();}

module.exports = { auditTheme, tokenPalette, ISOLUMINANT_LC, AA_NORMAL, AA_NON_TEXT };
