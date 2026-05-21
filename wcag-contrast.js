"use strict";

/**
 * @typedef {Object} ParsedColor
 * @property {number} r - Red channel (0-1)
 * @property {number} g - Green channel (0-1)
 * @property {number} b - Blue channel (0-1)
 * @property {number} a - Alpha channel (0-1), defaults to 1
 */

/**
 * @typedef {Object} AuditPair
 * @property {string} foreground - Foreground color key name
 * @property {string} background - Background color key name
 * @property {number} ratio - Contrast ratio
 * @property {boolean} passesAA - Whether it passes WCAG AA
 * @property {boolean} passesAAA - Whether it passes WCAG AAA
 * @property {string} level - "AAA", "AA", or "Fail"
 */

/**
 * Parses a hex color string to an object with r, g, b, a values in 0-1 range.
 * @param {string} hex - Color in #RRGGBB or #RRGGBBAA format
 * @returns {ParsedColor} Parsed color object
 */
function parseHex(hex) {
  const h = hex.replace(/^#/, "");
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
    a: h.length >= 8 ? parseInt(h.substring(6, 8), 16) / 255 : 1,
  };
}

/**
 * Linearizes a single sRGB channel value.
 * @param {number} c - Channel value in 0-1 range
 * @returns {number} Linearized value
 */
function linearize(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Calculates the relative luminance of a color per WCAG 2.1.
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * @param {number} r - Red channel (0-1)
 * @param {number} g - Green channel (0-1)
 * @param {number} b - Blue channel (0-1)
 * @returns {number} Relative luminance (0-1)
 */
function relativeLuminance(r, g, b) {
  return (
    0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
  );
}

/**
 * Computes the WCAG 2.1 contrast ratio between two hex colors.
 * @param {string} hex1 - First color in #RRGGBB or #RRGGBBAA format
 * @param {string} hex2 - Second color in #RRGGBB or #RRGGBBAA format
 * @returns {number} Contrast ratio (1-21)
 */
function contrastRatio(hex1, hex2) {
  const c1 = parseHex(hex1);
  const c2 = parseHex(hex2);
  const l1 = relativeLuminance(c1.r, c1.g, c1.b);
  const l2 = relativeLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks whether a contrast ratio meets WCAG AA requirements.
 * @param {number} ratio - Contrast ratio
 * @param {boolean} [isLargeText=false] - Whether the text is considered large (>=18pt or >=14pt bold)
 * @returns {boolean} True if the ratio passes AA
 */
function meetsAA(ratio, isLargeText = false) {
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

/**
 * Checks whether a contrast ratio meets WCAG AAA requirements.
 * @param {number} ratio - Contrast ratio
 * @param {boolean} [isLargeText=false] - Whether the text is considered large
 * @returns {boolean} True if the ratio passes AAA
 */
function meetsAAA(ratio, isLargeText = false) {
  return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
}

const BACKGROUND_MAP = [
  { pattern: /^editor\.(?!background).*foreground$/, bg: "editor.background" },
  { pattern: /^editorLineNumber\.foreground$/, bg: "editor.background" },
  { pattern: /^editorCursor\.foreground$/, bg: "editor.background" },
  { pattern: /^editor.selectionForeground$/, bg: "editor.background" },
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
  { pattern: /^breadcrumb\.foreground$/, bg: "editor.background" },
  { pattern: /^editorGroupHeader\.tabsForeground$/, bg: "editorGroupHeader.tabsBackground" },
];

/**
 * Resolves the background color key for a given foreground color key.
 * @param {string} fgKey - The foreground color key
 * @param {Object} colors - The theme colors object
 * @returns {string|null} The background color key, or null if no match
 */
function resolveBackground(fgKey, colors) {
  if (/\.(?:background|border)$/i.test(fgKey)) return null;
  for (const { pattern, bg } of BACKGROUND_MAP) {
    if (pattern.test(fgKey)) return colors[bg] ? bg : null;
  }
  const parts = fgKey.split(".");
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = parts.slice(0, i).join(".") + ".background";
    if (colors[candidate]) return candidate;
  }
  return null;
}

/**
 * Audits all foreground/background pairs in a theme colors object.
 * @param {Object<string, string>} colors - Theme colors keyed by VS Code color ID
 * @returns {AuditPair[]} Array of audit results
 */
function auditThemePairs(colors) {
  const results = [];
  const seen = new Set();

  for (const key of Object.keys(colors)) {
    if (seen.has(key)) continue;
    if (/\.(?:background|border)$/i.test(key)) continue;

    const bgKey = resolveBackground(key, colors);
    if (!bgKey) continue;

    const fgVal = colors[key];
    const bgVal = colors[bgKey];
    if (!fgVal || !bgVal) continue;
    if (!/^#[0-9a-fA-F]{6,8}$/.test(fgVal)) continue;
    if (!/^#[0-9a-fA-F]{6,8}$/.test(bgVal)) continue;

    seen.add(key);
    const ratio = contrastRatio(fgVal, bgVal);
    const passesAA = meetsAA(ratio);
    const passesAAA = meetsAAA(ratio);
    const level = passesAAA ? "AAA" : passesAA ? "AA" : "Fail";

    results.push({
      foreground: key,
      background: bgKey,
      ratio: Math.round(ratio * 100) / 100,
      passesAA,
      passesAAA,
      level,
    });
  }

  return results.sort((a, b) => a.ratio - b.ratio);
}

/**
 * Generates a markdown report table for audited theme pairs.
 * @param {string} themeName - Name of the theme
 * @param {AuditPair[]} pairs - Array of audit results
 * @returns {string} Markdown-formatted table string
 */
function generateReport(themeName, pairs) {
  const lines = [];
  lines.push(`# WCAG Contrast Report: ${themeName}`);
  lines.push("");
  lines.push(
    "| Foreground | Background | Ratio | AA | AAA | Level |"
  );
  lines.push(
    "|---|---|---|---|---|---|"
  );

  for (const p of pairs) {
    lines.push(
      `| ${p.foreground} | ${p.background} | ${p.ratio.toFixed(2)} | ${p.passesAA ? "Pass" : "Fail"} | ${p.passesAAA ? "Pass" : "Fail"} | ${p.level} |`
    );
  }

  const failCount = pairs.filter((p) => p.level === "Fail").length;
  const aaOnlyCount = pairs.filter((p) => p.level === "AA").length;
  const aaaCount = pairs.filter((p) => p.level === "AAA").length;

  lines.push("");
  lines.push(
    `**Summary:** ${pairs.length} pairs — ${aaaCount} AAA, ${aaOnlyCount} AA, ${failCount} Fail`
  );

  return lines.join("\n");
}

module.exports = {
  parseHex,
  relativeLuminance,
  contrastRatio,
  meetsAA,
  meetsAAA,
  auditThemePairs,
  generateReport,
};
