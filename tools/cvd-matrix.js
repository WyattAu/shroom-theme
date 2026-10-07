#!/usr/bin/env node

"use strict";

/**
 * Generate a per-variant CVD collision matrix as a markdown report.
 *
 * The palette audit gates on contrast and lightness separation and reports the
 * single worst CVD pair. That is enough to catch regressions, but it hides the
 * shape of the problem: which pairs are close, under which deficiency, and by
 * how much. This report lays all of it out, because the numbers that decide
 * whether the palette needs restructuring are the ones nearest the threshold,
 * not the single worst.
 *
 * Reported, not gated. An all-pairs CIEDE2000 threshold of 10 under simulated
 * dichromacy is not satisfiable for nine token colours on one background -- five
 * is the practical ceiling -- so a gate here would fail forever and be ignored.
 * What the matrix is for is making the cost of each potential change visible:
 * it shows which pairs a rotation would fix and which it would break.
 *
 * Output: reports/cvd-matrix-<variant>.md
 */

const fs = require("fs");
const path = require("path");
const color = require("../color-science.js");

const THEMES_DIR = path.resolve(__dirname, "..", "themes");
const REPORTS_DIR = path.resolve(__dirname, "..", "reports");

/** Simulated deficiencies, in report order. */
const KINDS = ["normal", "protan", "deutan", "tritan", "monochrome"];

const KIND_LABEL = {
  normal: "Normal vision",
  protan: "Protanopia",
  deutan: "Deuteranopia",
  tritan: "Tritanopia",
  monochrome: "Achromatopsia",
};

/**
 * Scope that marks a token as de-emphasis rather than a competing category.
 * @param {string} scope
 * @returns {boolean}
 */
const isCommentScope = (scope) =>
  /^(comment|punctuation\.definition\.comment)/.test(scope);

/**
 * Selectors that render as the default text substrate.
 */
const SUBSTRATE_SELECTORS = new Set(["property", "*.static"]);

/**
 * Collect the distinct token colours a theme paints, classified.
 *
 * @param {object} theme
 * @returns {Array<{hex:string,kind:string,scopes:number}>}
 */
function tokenPalette(theme) {
  const byHex = new Map();
  const promote = (hex, kind) => {
    const rec = byHex.get(hex);
    if (!rec) {
      byHex.set(hex, { hex, kind, scopes: 0 });
      return;
    }
    // Most permissive wins: de-emphasis and substrate do not compete.
    if (rec.kind === "category") { rec.kind = kind; }
  };

  for (const entry of theme.tokenColors) {
    const fg = String(entry.settings.foreground || "").toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(fg)) { continue; }
    const scopes = Array.isArray(entry.scope) ? entry.scope : [entry.scope];
    promote(fg, "category");
    byHex.get(fg).scopes += scopes.length;
    if (scopes.some(isCommentScope)) { byHex.get(fg).kind = "deemphasis"; }
  }
  for (const [selector, rule] of Object.entries(theme.semanticTokenColors ?? {})) {
    const fg = String(rule.foreground || "").toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(fg) || !byHex.has(fg)) { continue; }
    if (SUBSTRATE_SELECTORS.has(selector)) { byHex.get(fg).kind = "substrate"; }
    else if (selector === "comment" || selector === "*.documentation") {
      byHex.get(fg).kind = "deemphasis";
    }
  }
  return [...byHex.values()];
}

/**
 * CIEDE2000 between two colours under a given viewing condition.
 * @param {string} a
 * @param {string} b
 * @param {string} kind
 * @returns {number}
 */
function separation(a, b, kind) {
  if (kind === "normal") { return color.deltaE00(a, b); }
  return color.deltaE00(color.simulate(a, kind), color.simulate(b, kind));
}

/**
 * Build the matrix rows for one theme.
 * @param {object} theme
 * @returns {{categories:object[], rows:object[]}}
 */
function buildMatrix(theme) {
  const palette = tokenPalette(theme);
  const categories = palette.filter((c) => c.kind === "category");

  const rows = [];
  for (const kind of KINDS) {
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const a = categories[i];
        const b = categories[j];
        const de = separation(a.hex, b.hex, kind);
        rows.push({ kind, a: a.hex, b: b.hex, aScopes: a.scopes, bScopes: b.scopes, de });
      }
    }
  }
  rows.sort((x, y) => x.de - y.de);
  return { categories, rows };
}

/**
 * Render one variant's report.
 * @param {string} name
 * @param {object} theme
 * @returns {string}
 */
function renderVariant(name, theme) {
  const bg = theme.colors["editor.background"];
  const { categories, rows } = buildMatrix(theme);
  const lines = [];

  lines.push(`# CVD Collision Matrix: ${name}`);
  lines.push("");
  lines.push(
    `Background \`${bg}\`, ${categories.length} competing token colours. ` +
      `CIEDE2000, lower is worse. De-emphasis and substrate colours are excluded ` +
      `-- a comment recedes rather than competing.`
  );
  lines.push("");
  lines.push(
    "Simulated dichromacy is a worst-case collision detector, not a depiction " +
      "of what anyone sees. See `docs/color-science.md`."
  );
  lines.push("");
  lines.push("## Ten closest pairs per viewing condition");
  lines.push("");

  for (const kind of KINDS) {
    const kindRows = rows.filter((r) => r.kind === kind);
    lines.push(`### ${KIND_LABEL[kind]}`);
    lines.push("");
    lines.push("| dE00 | Pair | Scopes |");
    lines.push("|---|---|---|");
    for (const r of kindRows.slice(0, 10)) {
      const marker = r.de < 10 ? " **< 10**" : "";
      lines.push(
        `| ${r.de.toFixed(2)} | \`${r.a}\` / \`${r.b}\` | ` +
          `${r.aScopes} + ${r.bScopes} |${marker}`
      );
    }
    lines.push("");
  }

  // Per-colour summary: how exposed each colour is, so a change can be priced.
  lines.push("## Exposure by colour");
  lines.push("");
  lines.push(
    "The smallest separation between this colour and any other, per condition. " +
      "A colour that is close to something under every condition is the one a " +
      "rotation would help; one that is only close under dichromacy is "
      + "separated by hue alone."
  );
  lines.push("");
  lines.push("| Colour | Scopes | " + KINDS.map((k) => KIND_LABEL[k]).join(" | ") + " |");
  lines.push("|---|---|" + KINDS.map(() => "---").join("|") + "|");

  for (const c of categories) {
    const per = KINDS.map((kind) => {
      let min = Infinity;
      for (const other of categories) {
        if (other.hex === c.hex) { continue; }
        min = Math.min(min, separation(c.hex, other.hex, kind));
      }
      return min === Infinity ? "--" : min.toFixed(1);
    });
    lines.push(
      `| \`${c.hex}\` | ${c.scopes} | ${per.map((v) => v.padStart(5)).join(" | ")} |`
    );
  }

  lines.push("");
  lines.push(
    `**Note:** the monochrome column cannot reach 10 for a palette this size. ` +
      `Achromatopsia is about 0.6% of CVD cases; the variant preserves semantic ` +
      `rank rather than token identity.`
  );
  lines.push("");

  return lines.join("\n");
}

function main() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const files = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const theme = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, file), "utf8"));
    const name = file.replace(/\.json$/, "");
    const md = renderVariant(name, theme);
    const out = path.join(REPORTS_DIR, `cvd-matrix-${name}.md`);
    fs.writeFileSync(out, md);
    console.log(`wrote ${path.relative(process.cwd(), out)}`);
  }
}

if (require.main === module) { main(); }

module.exports = { buildMatrix, tokenPalette, renderVariant, KINDS };
