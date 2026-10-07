#!/usr/bin/env node

"use strict";

/**
 * Sync the hand-written landing pages with the shipped theme JSON.
 *
 * The docs carry palette swatches per variant card and an inline JS `palettes`
 * object feeding the variant switcher. Both were authored when the variable
 * token was blue, so they still advertised `#82AAFF` after that colour moved.
 *
 * Values are read from `themes/*.json` rather than restated, so this stays
 * correct when the palette changes again.
 *
 * Reading the themes back exposes something worth knowing: the deuteranopia and
 * protanopia variants recolour function to gold and string to amber. That is
 * pre-existing, from a hand edit that predates the separation work, and this
 * tool reports it faithfully rather than papering over it.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const THEMES_DIR = path.join(ROOT, "themes");
const DOCS = ["index.html", "index.ja.html", "index.zh.html"];

/** Docs palette key -> the token scope whose colour fills it. */
const ROLE_TO_SCOPE = {
  accent: "keyword",
  teal: "entity.name.function",
  green: "string",
  amber: "constant.numeric",
  red: "invalid",
  muted: "comment",
};

/** Docs palette key -> a `colors` key, for roles that come from chrome. */
const ROLE_TO_COLORS = {
  bg: "editor.background",
  fg: "editor.foreground",
};

const ROLES = ["bg", "fg", "muted", "accent", "teal", "green", "amber", "red"];

/** Docs `palettes` key -> theme file, because the names do not line up. */
const KEY_TO_FILE = {
  "shroom-space": "shroom-space-theme.json",
  "shroom-space-light": "shroom-space-light-theme.json",
  deuteranopia: "shroom-space-deuteranopia-theme.json",
  protanopia: "shroom-space-protanopia-theme.json",
  tritanopia: "shroom-space-tritanopia-theme.json",
  monochrome: "shroom-space-monochrome-theme.json",
  "high-contrast": "shroom-space-high-contrast-theme.json",
};

const upper = (v) => (typeof v === "string" ? v.toUpperCase().slice(0, 7) : null);

/** Scope -> colour, from tokenColors. */
function scopeColours(theme) {
  const map = new Map();
  for (const entry of theme.tokenColors) {
    const scopes = Array.isArray(entry.scope) ? entry.scope : [entry.scope];
    const fg = upper(entry.settings.foreground);
    if (!fg) { continue; }
    for (const s of scopes) { if (!map.has(s)) { map.set(s, fg); } }
  }
  return map;
}

/** Resolve one docs palette role for a theme. */
function roleColour(theme, role, scopes) {
  if (ROLE_TO_COLORS[role]) {
    return upper(theme.colors[ROLE_TO_COLORS[role]]) || null;
  }
  const scope = ROLE_TO_SCOPE[role];
  return (scope && scopes.get(scope)) || null;
}

/** Current variable token colour for a theme. */
function variableColour(theme) {
  for (const [selector, rule] of Object.entries(theme.semanticTokenColors || {})) {
    if (selector === "variable") { return upper(rule.foreground); }
  }
  return scopes_get(theme, "variable");
}
function scopes_get(theme, scope) {
  return scopeColours(theme).get(scope) || null;
}

/** Build the replacement text for one palette entry. */
function paletteLiteral(theme, scopes) {
  const parts = ROLES.map(function (role) {
    return role + ": '" + (roleColour(theme, role, scopes) || "?") + "'";
  });
  // `border` was authored by hand and has no theme counterpart.
  parts.push("border: '#393552'");
  return parts.join(", ");
}

/** Update the `palettes` object in one docs page. */
function syncPalettes(file) {
  const filePath = path.join(ROOT, "docs", file);
  let html = fs.readFileSync(filePath, "utf8");
  let changed = 0;

  for (const key of Object.keys(KEY_TO_FILE)) {
    const themePath = path.join(THEMES_DIR, KEY_TO_FILE[key]);
    if (!fs.existsSync(themePath)) { continue; }
    const theme = JSON.parse(fs.readFileSync(themePath, "utf8"));
    const replacement = paletteLiteral(theme, scopeColours(theme));

    const entryRe = new RegExp("'" + key + "':\\s*\\{[^}]*\\}", "g");
    html = html.replace(entryRe, function (match) {
      if (match.indexOf(replacement) !== -1) { return match; }
      changed++;
      return "'" + key + "': {\n          " + replacement + "\n        }";
    });
  }

  if (changed > 0) { fs.writeFileSync(filePath, html); }
  return { changed: changed };
}

/**
 * Update the per-variant swatch spans on a theme card.
 *
 * Cards are matched to themes by their `<h4>` title, which is why
 * `KEY_TO_FILE` is keyed on readable names rather than file stems.
 */
function syncSwatches(file) {
  const filePath = path.join(ROOT, "docs", file);
  let html = fs.readFileSync(filePath, "utf8");
  let changed = 0;

  const cardRe = /(<h4>([^<]+)<\/h4>[\s\S]*?<div>\s*)((?:<span class="color-swatch"[^>]*><\/span>\s*){2,})(<\/div>)/g;

  html = html.replace(cardRe, function (match, head, title, swatches, tail) {
    const wanted = cardSwatches(title.trim());
    if (!wanted) { return match; }
    const replacement = wanted.map(function (hex) {
      return '<span class="color-swatch" style="background:' + hex + '"></span>';
    }).join("\n            ") + "\n          ";
    if (swatches.trim() === replacement.trim()) { return match; }
    changed++;
    return head + replacement + tail;
  });

  if (changed > 0) { fs.writeFileSync(filePath, html); }
  return { changed: changed };
}

/** The four swatches a variant card shows, from its theme. */
function cardSwatches(title) {
  const key = title.toLowerCase().replace(/\s+/g, "-");
  const themeFile = KEY_TO_FILE[key];
  if (!themeFile) { return null; }
  const theme = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, themeFile), "utf8"));
  const scopes = scopeColours(theme);
  return [
    theme.colors["editor.background"],
    variableColour(theme) || scopes.get("variable") || theme.colors["editor.foreground"],
    scopes.get("keyword"),
    scopes.get("constant.numeric"),
  ].filter(Boolean);
}

function main() {
  for (const file of DOCS) {
    if (!fs.existsSync(path.join(ROOT, "docs", file))) { continue; }
    const a = syncPalettes(file);
    const b = syncSwatches(file);
    console.log(
      file.padEnd(16) + " palettes updated " + a.changed +
      ", swatch cards updated " + b.changed
    );
  }
}

if (require.main === module) { main(); }

module.exports = {
  syncPalettes: syncPalettes,
  syncSwatches: syncSwatches,
  roleColour: roleColour,
  cardSwatches: cardSwatches,
  KEY_TO_FILE: KEY_TO_FILE,
};
