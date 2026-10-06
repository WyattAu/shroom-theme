"use strict";

/**
 * Contrast auditing for Shroom Space themes.
 *
 * Wraps `color-science.js` to produce the per-theme audit consumed by
 * `validate-themes.js` and the CI artifact.
 *
 * Two corrections relative to a naive implementation, both of which previously
 * caused this project to over-report compliance:
 *
 *  1. Alpha is composited before measuring. Treating `#RRGGBBAA` as if the
 *     alpha byte were absent inflates the measured ratio, because the reported
 *     color is brighter than anything the user sees. For this theme that meant
 *     70-87 token pairs per theme "passed" AA at a measured ratio above 9:1
 *     while their true rendered contrast was as low as 1.21:1.
 *
 *  2. APCA Lc is reported alongside WCAG 2.1. WCAG 2.1 ratios are not
 *     perceptual and are symmetric between polarities; APCA models lightness
 *     difference directly and, crucially, treats light-on-dark differently from
 *     dark-on-light. A dark theme and its light counterpart with equal WCAG
 *     ratios are not equally legible.
 */

const color = require("./color-science.js");

/**
 * @typedef {Object} ParsedColor
 * @property {number} r Red channel (0-1)
 * @property {number} g Green channel (0-1)
 * @property {number} b Blue channel (0-1)
 * @property {number} a Alpha channel (0-1)
 */

/**
 * @typedef {Object} AuditPair
 * @property {string} foreground Foreground color key
 * @property {string} background Background color key
 * @property {number} ratio WCAG 2.1 contrast ratio, alpha-composited
 * @property {number} apcaLc APCA Lc, signed
 * @property {number} apcaAbs Absolute APCA Lc
 * @property {boolean} opaque Whether the foreground color carries no alpha
 * @property {boolean} passesAA Whether it passes WCAG 2.1 AA
 * @property {boolean} passesAAA Whether it passes WCAG 2.1 AAA
 * @property {string} level "AAA", "AA", or "Fail"
 */

/**
 * Parse a hex color into normalized channels.
 * @param {string} hex `#RGB`, `#RGBA`, `#RRGGBB` or `#RRGGBBAA`
 * @returns {ParsedColor}
 */
function parseHex(hex) {
  return color.parseHex(hex);
}

/**
 * WCAG 2.1 relative luminance.
 * @param {number} r Red channel (0-1)
 * @param {number} g Green channel (0-1)
 * @param {number} b Blue channel (0-1)
 * @returns {number} Relative luminance (0-1)
 */
function relativeLuminance(r, g, b) {
  return color.relLum({ r, g, b });
}

/**
 * WCAG 2.1 contrast ratio with alpha correctly composited.
 * @param {string} hex1
 * @param {string} hex2
 * @returns {number} Contrast ratio (1-21)
 */
function contrastRatio(hex1, hex2) {
  return color.wcag21(hex1, hex2);
}

/**
 * APCA Lc contrast. Signed: positive is dark-on-light, negative is
 * light-on-dark. Alpha is composited.
 * @param {string} textHex
 * @param {string} bgHex
 * @returns {number} Signed Lc
 */
function apcaContrast(textHex, bgHex) {
  return color.apcaLc(textHex, bgHex);
}

/**
 * WCAG 2.1 AA threshold.
 * @param {number} ratio
 * @param {boolean} [isLargeText] >=18pt, or >=14pt bold
 * @returns {boolean}
 */
function meetsAA(ratio, isLargeText = false) {
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

/**
 * WCAG 2.1 AAA threshold.
 * @param {number} ratio
 * @param {boolean} [isLargeText]
 * @returns {boolean}
 */
function meetsAAA(ratio, isLargeText = false) {
  return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
}

/**
 * Whether a color string carries an explicit alpha channel.
 * @param {string} value
 * @returns {boolean}
 */
function hasAlpha(value) {
  return /^#[0-9a-fA-F]{8}$/.test(String(value).trim());
}

/** Foreground/background pairings to audit, in priority order. */
const BACKGROUND_MAP = [
  { pattern: /^editor\.(?!background).*foreground$/, bg: "editor.background" },
  { pattern: /^editorLineNumber\.foreground$/, bg: "editor.background" },
  { pattern: /^editorCursor\.foreground$/, bg: "editor.background" },
  { pattern: /^editor\.selectionForeground$/, bg: "editor.background" },
  { pattern: /^editorError\.foreground$/, bg: "editor.background" },
  { pattern: /^editorWarning\.foreground$/, bg: "editor.background" },
  { pattern: /^editorInfo\.foreground$/, bg: "editor.background" },
  { pattern: /^sideBar\.(?!background).*foreground$/, bg: "sideBar.background" },
  { pattern: /^sideBarTitle\.foreground$/, bg: "sideBar.background" },
  { pattern: /^sideBarSectionHeader\.(?:foreground|border)$/, bg: "sideBar.background" },
  { pattern: /^activityBar\.(?!background).*foreground$/, bg: "activityBar.background" },
  { pattern: /^activityBarBadge\.foreground$/, bg: "activityBarBadge.background" },
  { pattern: /^statusBar\.(?!background).*foreground$/, bg: "statusBar.background" },
  { pattern: /^statusBarButton\.foreground$/, bg: "statusBar.background" },
  { pattern: /^terminal\.foreground$/, bg: "terminal.background" },
  { pattern: /^list\.foreground$/, bg: "list.activeSelectionBackground" },
  { pattern: /^list\.inactiveSelectionForeground$/, bg: "list.inactiveSelectionBackground" },
  { pattern: /^list\.activeSelectionForeground$/, bg: "list.activeSelectionBackground" },
  { pattern: /^list\.highlightForeground$/, bg: "list.activeSelectionBackground" },
  { pattern: /^list\.focusHighlightForeground$/, bg: "list.activeSelectionBackground" },
  { pattern: /^tab\.(?!background).*foreground$/, bg: "tab.activeBackground" },
  { pattern: /^tab\.inactiveForeground$/, bg: "tab.inactiveBackground" },
  { pattern: /^tab\.activeForeground$/, bg: "tab.activeBackground" },
  { pattern: /^button\.foreground$/, bg: "button.background" },
  { pattern: /^input\.foreground$/, bg: "input.background" },
  { pattern: /^inputOption\.foreground$/, bg: "input.background" },
  { pattern: /^inputPlaceholder\.foreground$/, bg: "input.background" },
  { pattern: /^dropdown\.foreground$/, bg: "dropdown.background" },
  { pattern: /^dropdown\.listForeground$/, bg: "dropdown.background" },
  { pattern: /^badge\.foreground$/, bg: "badge.background" },
  { pattern: /^titleBar\.activeForeground$/, bg: "titleBar.activeBackground" },
  { pattern: /^titleBar\.inactiveForeground$/, bg: "titleBar.inactiveBackground" },
  { pattern: /^notification(?:Center|Toast)?\.foreground$/, bg: "notificationCenter.background" },
  { pattern: /^progressBar\.foreground$/, bg: "editor.background" },
  { pattern: /^scrollbarSlider\.activeForeground$/, bg: "editor.background" },
  { pattern: /^scrollbarSlider\.hoverForeground$/, bg: "editor.background" },
  { pattern: /^scrollbarSlider\.foreground$/, bg: "editor.background" },
  { pattern: /^minimap\.foreground$/, bg: "editor.background" },
  { pattern: /^breadcrumb\.foreground$/, bg: "breadcrumb.background" },
  { pattern: /^editorGroupHeader\.tabsForeground$/, bg: "editorGroupHeader.tabsBackground" },
  { pattern: /^editorGhostText\.foreground$/, bg: "editorGhostText.background" },
];

/**
 * Resolve the background color key for a given foreground key.
 * @param {string} fgKey
 * @param {Object<string,string>} colors
 * @returns {string|null} Background key, or null when unresolvable
 */
function resolveBackground(fgKey, colors) {
  if (/\.(?:background|border)$/i.test(fgKey)) {return null;}
  for (const { pattern, bg } of BACKGROUND_MAP) {
    if (pattern.test(fgKey)) {return colors[bg] ? bg : null;}
  }
  const parts = fgKey.split(".");
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = parts.slice(0, i).join(".") + ".background";
    if (colors[candidate]) {return candidate;}
  }
  return null;
}

/**
 * Audit all resolvable foreground/background pairs in a theme.
 *
 * Ratios are computed on the alpha-composited pair, so a translucent token is
 * measured as rendered rather than as authored.
 *
 * @param {Object<string,string>} colors Theme colors keyed by VS Code color ID
 * @returns {AuditPair[]} Audit results, ascending by ratio
 */
function auditThemePairs(colors) {
  const results = [];
  const seen = new Set();

  for (const key of Object.keys(colors)) {
    if (seen.has(key)) {continue;}
    if (/\.(?:background|border)$/i.test(key)) {continue;}

    const bgKey = resolveBackground(key, colors);
    if (!bgKey) {continue;}

    const fgVal = colors[key];
    const bgVal = colors[bgKey];
    if (!fgVal || !bgVal) {continue;}
    if (!/^#[0-9a-fA-F]{6,8}$/.test(fgVal)) {continue;}
    if (!/^#[0-9a-fA-F]{6,8}$/.test(bgVal)) {continue;}

    seen.add(key);
    const ratio = color.wcag21(fgVal, bgVal);
    const apcaLc = color.apcaLc(fgVal, bgVal);
    const passesAA = meetsAA(ratio);
    const passesAAA = meetsAAA(ratio);
    const level = passesAAA ? "AAA" : passesAA ? "AA" : "Fail";

    results.push({
      foreground: key,
      background: bgKey,
      ratio: Math.round(ratio * 100) / 100,
      apcaLc: Math.round(apcaLc * 10) / 10,
      apcaAbs: Math.abs(Math.round(apcaLc * 10) / 10),
      opaque: !hasAlpha(fgVal),
      passesAA,
      passesAAA,
      level,
    });
  }

  return results.sort((a, b) => a.ratio - b.ratio);
}

/**
 * Render a markdown audit report.
 *
 * APCA is reported because it is the more perceptual of the two measures, but
 * WCAG 2.1 remains the pass/fail criterion: APCA is not yet normative for
 * conformance.
 *
 * @param {string} themeName
 * @param {AuditPair[]} pairs
 * @returns {string} Markdown report
 */
function generateReport(themeName, pairs) {
  const lines = [];
  lines.push(`# Contrast Report: ${themeName}`);
  lines.push("");
  lines.push(
    "Ratios are computed on the alpha-composited pair, so translucent tokens " +
      "are measured as rendered. `Lc` is signed APCA (positive = dark on " +
      "light, negative = light on dark)."
  );
  lines.push("");
  lines.push("| Foreground | Background | WCAG 2.1 | APCA Lc | Alpha | Level |");
  lines.push("|---|---|---|---|---|---|");

  for (const p of pairs) {
    lines.push(
      `| ${p.foreground} | ${p.background} | ${p.ratio.toFixed(2)} | ${p.apcaLc.toFixed(1)} | ${
        p.opaque ? "no" : "yes"
      } | ${p.level} |`
    );
  }

  const failCount = pairs.filter((p) => p.level === "Fail").length;
  const aaOnlyCount = pairs.filter((p) => p.level === "AA").length;
  const aaaCount = pairs.filter((p) => p.level === "AAA").length;
  const translucent = pairs.filter((p) => !p.opaque).length;

  lines.push("");
  lines.push(
    `**Summary:** ${pairs.length} pairs — ${aaaCount} AAA, ${aaOnlyCount} AA, ${failCount} Fail, ${translucent} with alpha`
  );

  return lines.join("\n");
}

module.exports = {
  parseHex,
  relativeLuminance,
  contrastRatio,
  apcaContrast,
  meetsAA,
  meetsAAA,
  hasAlpha,
  resolveBackground,
  auditThemePairs,
  generateReport,
};
