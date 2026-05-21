#!/usr/bin/env node

/**
 * Comprehensive theme validation for Shroom Space Theme.
 *
 * Validates all theme JSON files against structural, format, and
 * semantic correctness criteria. Exits with code 0 on success, 1
 * on any validation failure.
 */

const fs = require('fs');
const path = require('path');
const wcag = require('./wcag-contrast.js');

const themesDir = path.join(__dirname, 'themes');

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
const VALID_TYPES = new Set(['dark', 'light', 'hc']);

const REQUIRED_COLOR_KEYS = [
  'editor.background',
  'editor.foreground',
  'activityBar.background',
  'sideBar.background',
  'statusBar.background',
  'editorError.foreground',
  'editorWarning.foreground',
];

/** @type {Array<{file: string, message: string}>} */
const errors = [];

/** @type {Array<{file: string, message: string}>} */
const warnings = [];

/**
 * @param {string} file
 * @param {Record<string, unknown>} theme
 */
function validateStructure(file, theme) {
  if (!theme.name || typeof theme.name !== 'string') {
    errors.push({ file, message: 'Missing or invalid "name" field (must be non-empty string)' });
  }
  if (!VALID_TYPES.has(theme.type)) {
    errors.push({ file, message: `Invalid "type" field: "${theme.type}". Must be one of: ${[...VALID_TYPES].join(', ')}` });
  }
  if (!theme.colors || typeof theme.colors !== 'object') {
    errors.push({ file, message: 'Missing or invalid "colors" object' });
  }
  if (!Array.isArray(theme.tokenColors)) {
    errors.push({ file, message: 'Missing or invalid "tokenColors" array' });
  }
}

/**
 * @param {string} file
 * @param {Record<string, string>} colors
 */
function validateColorHex(file, colors) {
  for (const [key, value] of Object.entries(colors)) {
    if (typeof value !== 'string') {
      errors.push({ file, message: `Color key "${key}" has non-string value: ${JSON.stringify(value)}` });
      continue;
    }
    if (!HEX_COLOR_RE.test(value)) {
      errors.push({ file, message: `Invalid hex color for "${key}": "${value}"` });
    }
  }
}

/**
 * @param {string} file
 * @param {Record<string, string>} colors
 */
function validateCriticalColors(file, colors) {
  for (const key of REQUIRED_COLOR_KEYS) {
    if (!(key in colors)) {
      warnings.push({ file, message: `Missing recommended color key: "${key}"` });
    }
  }

  if (colors['editorError.foreground'] && colors['editor.foreground']) {
    if (colors['editorError.foreground'] === colors['editor.foreground']) {
      errors.push({ file, message: 'editorError.foreground must differ from editor.foreground' });
    }
  }
  if (colors['editorError.foreground'] && colors['editorWarning.foreground']) {
    if (colors['editorError.foreground'] === colors['editorWarning.foreground']) {
      errors.push({ file, message: 'editorError.foreground must differ from editorWarning.foreground' });
    }
  }
}

/**
 * @param {string} file
 * @param {unknown[]} tokenColors
 */
function validateTokenColors(file, tokenColors) {
  if (!Array.isArray(tokenColors)) { return; }
  for (let i = 0; i < tokenColors.length; i++) {
    const entry = tokenColors[i];
    if (!entry.scope) {
      errors.push({ file, message: `tokenColors[${i}] missing "scope"` });
    }
    if (!entry.settings || typeof entry.settings !== 'object') {
      errors.push({ file, message: `tokenColors[${i}] missing or invalid "settings"` });
    }
    if (entry.settings?.foreground) {
      if (!HEX_COLOR_RE.test(entry.settings.foreground)) {
        errors.push({ file, message: `tokenColors[${i}] has invalid foreground hex: "${entry.settings.foreground}"` });
      }
    }
    if (entry.settings?.background) {
      if (!HEX_COLOR_RE.test(entry.settings.background)) {
        errors.push({ file, message: `tokenColors[${i}] has invalid background hex: "${entry.settings.background}"` });
      }
    }
  }
}

/**
 * @param {string} file
 * @param {Record<string, unknown>} theme
 */
function validateSemanticTokens(file, theme) {
  if (!theme.semanticTokenColors) { return; }
  const stc = theme.semanticTokenColors;
  if (stc.enabled !== undefined && typeof stc.enabled !== 'boolean') {
    errors.push({ file, message: 'semanticTokenColors.enabled must be a boolean' });
  }
  if (stc.rules && typeof stc.rules === 'object') {
    for (const [token, rule] of Object.entries(stc.rules)) {
      if (rule && typeof rule === 'object') {
        if (rule.foreground && !HEX_COLOR_RE.test(rule.foreground)) {
          errors.push({ file, message: `semanticTokenColors.rules.${token} has invalid foreground: "${rule.foreground}"` });
        }
      }
    }
  }
}

/**
 * Validate that every theme file on disk is listed in package.json contributes.
 */
function validatePackageContribution() {
  const pkgPath = path.join(__dirname, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  const contributedPaths = new Set(
    (pkg.contributes?.themes || []).map(t => t.path.replace(/^\.\//, ''))
  );

  const diskFiles = fs.readdirSync(themesDir).filter(f => f.endsWith('.json'));
  for (const file of diskFiles) {
    const contribPath = `themes/${file}`;
    if (!contributedPaths.has(contribPath)) {
      errors.push({ file: 'package.json', message: `Theme file "${file}" exists on disk but is not contributed in package.json` });
    }
  }

  for (const contrib of pkg.contributes?.themes || []) {
    const resolved = path.join(__dirname, contrib.path);
    if (!fs.existsSync(resolved)) {
      errors.push({ file: 'package.json', message: `Contributed theme "${contrib.path}" does not exist on disk` });
    }
  }

  const lightThemes = (pkg.contributes?.themes || []).filter(t =>
    t.label.toLowerCase().includes('light')
  );
  for (const lt of lightThemes) {
    if (lt.uiTheme !== 'vs') {
      errors.push({ file: 'package.json', message: `Light theme "${lt.label}" must use uiTheme "vs", got "${lt.uiTheme}"` });
    }
  }

  const hcThemes = (pkg.contributes?.themes || []).filter(t =>
    t.label.toLowerCase().includes('high contrast')
  );
  for (const hc of hcThemes) {
    if (hc.uiTheme !== 'hc-black') {
      errors.push({ file: 'package.json', message: `High contrast theme "${hc.label}" must use uiTheme "hc-black", got "${hc.uiTheme}"` });
    }
  }
}

/**
 * Text-foreground color keys that MUST meet WCAG AA (4.5:1) against their background.
 * Selection backgrounds, hover states, and line highlights are excluded because
 * they are decorative/non-text and WCAG does not require 4.5:1 for them.
 */
const TEXT_FG_KEYS = [
  'editor.foreground',
  'editorError.foreground',
  'editorWarning.foreground',
  'editorInfo.foreground',
  'input.foreground',
  'input.placeholderForeground',
  'button.foreground',
  'dropdown.foreground',
  'list.activeSelectionForeground',
  'list.inactiveSelectionForeground',
  'list.highlightForeground',
  'activityBar.foreground',
  'activityBar.inactiveForeground',
  'sideBar.foreground',
  'sideBarTitle.foreground',
  'statusBar.foreground',
  'terminal.foreground',
  'terminal.ansiBrightBlack',
  'tab.activeForeground',
  'tab.inactiveForeground',
  'titleBar.activeForeground',
  'titleBar.inactiveForeground',
  'badge.foreground',
  'activityBarBadge.foreground',
];

/**
 * For high-contrast themes, require AAA (7:1) for critical text.
 */
const HC_TEXT_KEYS = [
  'editor.foreground',
  'terminal.foreground',
  'activityBar.foreground',
  'sideBar.foreground',
  'statusBar.foreground',
  'tab.activeForeground',
];

/**
 * @param {string} file
 * @param {Record<string, string>} colors
 * @param {string} themeType
 */
function validateWCAGContrast(file, colors, themeType) {
  const isHC = themeType === 'hc';
  const pairs = wcag.auditThemePairs(colors);
  const pairMap = new Map(pairs.map(p => [p.foreground, p]));

  for (const fgKey of TEXT_FG_KEYS) {
    if (!colors[fgKey]) { continue; }
    const pair = pairMap.get(fgKey);
    if (!pair) { continue; }

    const requireAAA = isHC && HC_TEXT_KEYS.includes(fgKey);
    if (requireAAA && !pair.passesAAA) {
      errors.push({
        file,
        message: `WCAG AAA FAIL: ${fgKey} on ${pair.background} = ${pair.ratio}:1 (need 7:1)`
      });
    } else if (!pair.passesAA) {
      errors.push({
        file,
        message: `WCAG AA FAIL: ${fgKey} on ${pair.background} = ${pair.ratio}:1 (need 4.5:1)`
      });
    }
  }

  // Generate report
  const reportDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportDir)) { fs.mkdirSync(reportDir, { recursive: true }); }
  const themeName = file.replace('.json', '');
  const reportPath = path.join(reportDir, `wcag-${themeName}.md`);
  const report = wcag.generateReport(themeName, pairs);
  fs.writeFileSync(reportPath, report);
}

function main() {
  if (!fs.existsSync(themesDir)) {
    console.error(`Themes directory '${themesDir}' does not exist`);
    process.exit(1);
  }

  const files = fs.readdirSync(themesDir).filter(file => file.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(themesDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const theme = JSON.parse(content);

      validateStructure(file, theme);
      if (theme.colors) {
        validateColorHex(file, theme.colors);
        validateCriticalColors(file, theme.colors);
        validateWCAGContrast(file, theme.colors, theme.type);
      }
      validateTokenColors(file, theme.tokenColors);
      validateSemanticTokens(file, theme);

      if (errors.filter(e => e.file === file).length === 0) {
        console.log(`[PASS] ${file}`);
      }
    } catch (error) {
      errors.push({ file, message: `JSON parse error: ${error.message}` });
    }
  }

  validatePackageContribution();

  if (warnings.length > 0) {
    console.log('\nWarnings:');
    for (const w of warnings) {
      console.log(`  [WARN] ${w.file}: ${w.message}`);
    }
  }

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const e of errors) {
      console.log(`  [FAIL] ${e.file}: ${e.message}`);
    }
    console.error(`\nValidation failed: ${errors.length} error(s)`);
    process.exit(1);
  }

  console.log(`\nAll ${files.length} theme(s) valid. 0 errors.`);
  process.exit(0);
}

main();
