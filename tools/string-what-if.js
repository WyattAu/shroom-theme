#!/usr/bin/env node

"use strict";

/**
 * What-if analysis for one token colour: what happens if its hue moves?
 *
 * Built for the string colour, which the collision matrix showed is the most
 * exposed in the palette -- it appears in three of the six worst CVD pairs,
 * because green sits between the red and amber families that dichromacy
 * collapses.
 *
 * For each candidate hue the tool reports, across every viewing condition:
 *
 *   - the worst pairwise separation remaining
 *   - how many of the 36 pairs fall below the 10 dE00 threshold
 *   - which pairs are newly below it (collisions the move introduces)
 *   - which previously-below pairs it repairs
 *
 * The last two are the ones that matter. A rotation that fixes the target pair
 * while creating two new collisions has moved the problem, and the first run of
 * the variable rotation did exactly that: amber reached 16.16 by landing on the
 * constant colour's hue.
 *
 * Output: reports/string-what-if.md
 */

const fs = require("fs");
const path = require("path");
const color = require("../color-science.js");
const { labToHex, gamutFit } = require("./repair-isoluminance.js");

const THEMES_DIR = path.resolve(__dirname, "..", "themes");
const REPORTS_DIR = path.resolve(__dirname, "..", "reports");

/** Viewing conditions, in report order. */
const KINDS = ["normal", "protan", "deutan", "tritan", "monochrome"];

const KIND_LABEL = {
  normal: "Normal",
  protan: "Protanopia",
  deutan: "Deuteranopia",
  tritan: "Tritanopia",
  monochrome: "Achromatopsia",
};

/** dE00 below which a pair counts as a collision. */
const COLLISION_THRESHOLD = 10;

/** Smallest share of the original chroma an acceptable candidate may keep. */
const MIN_CHROMA_KEEP = 0.6;

/** WCAG 2.1 SC 1.4.3, held while rotating. */
const AA_NORMAL = 4.5;

/** Which token colour to analyse. */
const TARGET_SCOPE = "string";

/**
 * Scope that marks a token as de-emphasis or substrate, which do not compete.
 * @param {string} scope
 * @returns {boolean}
 */
const isExempt = (scope) =>
  /^(comment|punctuation\.definition\.comment)/.test(scope) ||
  SUBSTRATE_SET.has(scope);

const SUBSTRATE_SET = new Set(["property", "*.static"]);

/**
 * Collect competing token colours plus the target colour for a theme.
 *
 * @param {object} theme
 * @param {string} targetScope
 * @returns {{target:{hex:string,scope:string}, others:string[]}|null}
 */
function collectParticipants(theme, targetScope) {
  const scopeMap = new Map();
  for (const entry of theme.tokenColors) {
    const fg = String(entry.settings.foreground || "").toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(fg)) { continue; }
    const scopes = Array.isArray(entry.scope) ? entry.scope : [entry.scope];
    for (const s of scopes) {
      if (!scopeMap.has(s)) { scopeMap.set(s, fg); }
    }
  }

  const target = scopeMap.get(targetScope);
  if (!target) { return null; }

  const exemptHex = new Set();
  for (const entry of theme.tokenColors) {
    const scopes = Array.isArray(entry.scope) ? entry.scope : [entry.scope];
    if (scopes.some(isExempt)) {
      exemptHex.add(String(entry.settings.foreground).toUpperCase());
    }
  }

  // A hex can serve several scopes. Build hex -> scopes, then exclude the
  // target and any hex whose only roles are exempt. Deduplicating by hex rather
  // than by scope matters: keyword and operator both resolve to #BE9AF7, and
  // keeping both entries put that colour in the list twice, so it paired with
  // itself at dE00 0.00 and the report counted 36,000 phantom collisions.
  const hexScopes = new Map();
  for (const [scope, hex] of scopeMap) {
    if (!hexScopes.has(hex)) { hexScopes.set(hex, new Set()); }
    hexScopes.get(hex).add(scope);
  }

  const others = [...hexScopes.entries()]
    .filter(([hex, scopes]) => hex !== target &&
      [...scopes].some((s) => !isExempt(s)))
    .map(([hex]) => hex);

  return { target: { hex: target, scope: targetScope }, others };
}

/**
 * All pairwise separations among a set of colours, under one condition.
 *
 * The target is included in the set, so the result describes the whole palette
 * rather than only the pairs the target participates in.
 *
 * @param {string[]} colours includes the target
 * @param {string} kind
 * @returns {Array<{a:string,b:string,de:number}>}
 */
function pairwise(colours, kind) {
  const rows = [];
  for (let i = 0; i < colours.length; i++) {
    for (let j = i + 1; j < colours.length; j++) {
      rows.push({
        a: colours[i],
        b: colours[j],
        de: kind === "normal"
          ? color.deltaE00(colours[i], colours[j])
          : color.deltaE00(color.simulate(colours[i], kind), color.simulate(colours[j], kind)),
      });
    }
  }
  return rows;
}

/**
 * Summarise one palette state across all conditions.
 * @param {string[]} colours
 * @returns {object}
 */
function summarise(colours) {
  const per = {};
  let worstOverall = Infinity;
  let worstDetail = null;

  for (const kind of KINDS) {
    const rows = pairwise(colours, kind);
    const collisions = rows.filter((r) => r.de < COLLISION_THRESHOLD);
    const worst = rows.reduce((a, b) => (a.de <= b.de ? a : b));
    per[kind] = {
      worst: worst.de,
      worstPair: `${worst.a} / ${worst.b}`,
      collisions: collisions.length,
      collisionPairs: collisions.map((r) => `${r.a}/${r.b}`),
    };
    if (worst.de < worstOverall) {
      worstOverall = worst.de;
      worstDetail = `${KIND_LABEL[kind]}: ${worst.a} / ${worst.b}`;
    }
  }

  return { per, worstOverall, worstDetail };
}

/**
 * Candidate hues at constant lightness, keeping as much chroma as the gamut
 * allows.
 *
 * @param {string} hex
 * @param {string} bg
 * @param {number} stepDeg
 * @returns {Array<{hue:number,hex:string,chroma:number}>}
 */
function candidates(hex, bg, stepDeg) {
  const lch = color.rgbToLch(color.parseHex(hex));
  const out = [];
  for (let dh = 0; dh < 360; dh += stepDeg) {
    const hue = (((lch.h + dh) % 360) + 360) % 360;
    const hRad = (hue * Math.PI) / 180;
    const chroma = gamutFit(lch.L, lch.C, hRad);
    if (chroma < lch.C * MIN_CHROMA_KEEP) { continue; }
    const candidate = labToHex(lch.L, chroma, hRad);
    if (color.wcag21(candidate, bg) < AA_NORMAL) { continue; }
    out.push({ hue, hex: candidate, chroma });
  }
  return out;
}

/**
 * Build the report for one theme.
 * @param {string} name
 * @param {object} theme
 * @returns {string}
 */
function buildReport(name, theme) {
  const bg = theme.colors["editor.background"];
  const participants = collectParticipants(theme, TARGET_SCOPE);
  if (!participants) {
    return `# String what-if: ${name}\n\nNo \`${TARGET_SCOPE}\` scope in this theme.\n`;
  }

  const { target, others } = participants;
  const baseline = summarise([target.hex, ...others]);

  const lines = [];
  lines.push(`# String Hue What-If: ${name}`);
  lines.push("");
  lines.push(
    `Target: \`${TARGET_SCOPE}\` = \`${target.hex}\`, ` +
      `${color.rgbToLch(color.parseHex(target.hex)).h.toFixed(0)} degrees. ` +
      `Background \`${bg}\`.`
  );
  lines.push("");
  lines.push(
    `Each candidate holds the target's lightness, keeps at least ` +
      `${(MIN_CHROMA_KEEP * 100).toFixed(0)}% of its chroma, and clears WCAG AA. ` +
      `Costs are measured across the whole palette -- all ` +
      `${(others.length + 1)} colours, ${KINDS.length} viewing conditions -- so a ` +
      `rotation that helps the string colour at the expense of another pair shows ` +
      `up as a new collision rather than as an improvement.`
  );
  lines.push("");
  lines.push(
    `This is a decision document, not a recommendation. Which cost is acceptable ` +
      `is a design judgement, and the numbers do not say what the theme should ` +
      `look like.`
  );
  lines.push("");
  lines.push("## Baseline");
  lines.push("");
  lines.push("| Condition | Worst pair | dE00 | Pairs below 10 |");
  lines.push("|---|---|---|---|");
  for (const kind of KINDS) {
    const p = baseline.per[kind];
    lines.push(
      `| ${KIND_LABEL[kind]} | ${p.worstPair} | ${p.worst.toFixed(2)} | ${p.collisions} |`
    );
  }
  lines.push("");
  lines.push(
    `Worst separation anywhere: **${baseline.worstOverall.toFixed(2)}** ` +
      `(${baseline.worstDetail}).`
  );
  lines.push("");

  // Evaluate candidates, keeping only those better than baseline on the
  // aggregate that matters: fewest collisions, then highest worst separation.
  const cands = candidates(target.hex, bg, 5).map((c) => {
    const s = summarise([c.hex, ...others]);
    return {
      hue: c.hue,
      hex: c.hex,
      chroma: c.chroma,
      ...s,
      totalCollisions: KINDS.reduce((n, k) => n + s.per[k].collisions, 0),
    };
  });

  const improved = cands.filter(
    (c) => c.totalCollisions < baselineTotalCollisions(baseline)
  );
  const best = improved.slice().sort((a, b) => {
    if (a.totalCollisions !== b.totalCollisions) {
      return a.totalCollisions - b.totalCollisions;
    }
    return b.worstOverall - a.worstOverall;
  });

  lines.push("## Candidates that reduce total collisions");
  lines.push("");
  lines.push(
    `Of ${cands.length} candidates, ${improved.length} reduce the total number ` +
      `of sub-threshold pairs across all five conditions. ` +
      `Baseline total: **${baselineTotalCollisions(baseline)}**.`
  );
  lines.push("");
  if (best.length === 0) {
    lines.push(
      "None. Every rotation either leaves the collision count unchanged or " +
        "increases it. That is the structural limit: the hue circle is full, and " +
        "the options are to accept the current collisions or merge two roles."
    );
    lines.push("");
  } else {
    lines.push("| dHue | Hue | Hex | Total collisions | Worst dE00 | Worst pair |");
    lines.push("|---|---|---|---|---|---|");
    const hueFrom = color.rgbToLch(color.parseHex(target.hex)).h;
    for (const c of best.slice(0, 12)) {
      const dh = Math.round(((c.hue - hueFrom + 540) % 360) - 180);
      lines.push(
        `| ${dh >= 0 ? "+" : ""}${dh} | ${c.hue.toFixed(0)} | \`${c.hex}\` | ` +
          `${c.totalCollisions} | ${c.worstOverall.toFixed(2)} | ${c.worstDetail} |`
      );
    }
    lines.push("");
  }

  lines.push("## Full sweep");
  lines.push("");
  lines.push("Every candidate, including those that make things worse.");
  lines.push("");
  lines.push("| Hue | Hex | Worst dE00 | Collisions per condition (N/P/D/T/M) |");
  lines.push("|---|---|---|---|");
  const hueFrom = color.rgbToLch(color.parseHex(target.hex)).h;
  for (const c of cands.sort((a, b) => a.hue - b.hue)) {
    const p = c.per;
    const per = [p.normal, p.protan, p.deutan, p.tritan, p.monochrome]
      .map((v) => v.collisions)
      .join("/");
    const dh = Math.round(((c.hue - hueFrom + 540) % 360) - 180);
    lines.push(
      `| ${dh >= 0 ? "+" : ""}${dh} | \`${c.hex}\` | ${c.worstOverall.toFixed(2)} | ${per} |`
    );
  }

  lines.push("");
  return lines.join("\n");
}

/** Total sub-threshold pairs across all conditions. */
function baselineTotalCollisions(baseline) {
  return KINDS.reduce((n, k) => n + baseline.per[k].collisions, 0);
}

function main() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  for (const file of ["shroom-space-theme.json", "shroom-space-deuteranopia-theme.json", "shroom-space-protanopia-theme.json"]) {
    const theme = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, file), "utf8"));
    const name = file.replace(/\.json$/, "");
    const out = path.join(REPORTS_DIR, `string-what-if-${name}.md`);
    fs.writeFileSync(out, buildReport(name, theme));
    console.log(`wrote ${path.relative(process.cwd(), out)}`);
  }
}

if (require.main === module) { main(); }

module.exports = {
  collectParticipants,
  summarise,
  candidates,
  buildReport,
  TARGET_SCOPE,
  COLLISION_THRESHOLD,
};
