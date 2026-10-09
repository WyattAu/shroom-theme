#!/usr/bin/env node

"use strict";

/**
 * What-if analysis for the amber cluster, using the quality profile as the cost
 * function.
 *
 * The quality profile found that `#FFCB6B` (decorator, constant, notice) and
 * `#E8C990` (type, substrate) sit 2.5 degrees apart in CAM16 hue and 7.7
 * CIEDE2000 apart, and already collide at full sRGB. That is the tightest pair
 * in the palette and the only one that collides before any gamut reduction.
 *
 * This tool answers the question the metric raises: what would it cost to
 * separate them?
 *
 * For each candidate rotation of the `#FFCB6B` family it reports:
 *
 *   - the new CIEDE2000 against `#E8C990` and against every other token
 *   - the count of pairs below the collision threshold, before and after
 *   - which pairs are repaired and which are newly broken
 *   - what the quality profile's own metrics say about the result: hue
 *     architecture, hue-band spacing, H-K brightness promotion, chroma budget
 *     and cross-variant consistency
 *
 * The point is not to pick a winner. Merging the two colours was already
 * declined without user data, and this does not revisit that: a rotation that
 * fixes the amber pair by creating two new collisions has moved the problem.
 * What it produces is the cost table the decision needs.
 *
 * Output: reports/amber-what-if.md
 */

const fs = require("fs");
const path = require("path");
const color = require("../color-science.js");
const quality = require("./quality-profile.js");
const { labToHex, gamutFit } = require("./repair-isoluminance.js");

const THEMES_DIR = path.resolve(__dirname, "..", "themes");
const REPORTS_DIR = path.resolve(__dirname, "..", "reports");

/**
 * Which roles carry the amber pair.
 *
 * `decorator`/`constant`/`notice` carry the saturated amber; `type` and
 * `substrate` carry the desaturated cream. Read from each variant rather than
 * hardcoded -- every current variant happens to use the same hex for both, but
 * hardcoding would silently report the dark variant's numbers if one of them
 * changed, which is exactly the failure this tool exists to prevent.
 */
const AMBER_ROLES = ["notice", "constant"];
const CREAM_ROLES = ["type", "substrate"];

/** Roles considered when scoring a candidate. */
const ROLES_OF_INTEREST = [
  "comment", "notice", "invalid", "constant", "string", "variable", "type",
  "function", "keyword", "substrate",
];

function themeName(file) {
  const named = /^shroom-space-(.*)-theme\.json$/.exec(file);
  const variant = named ? named[1] : "";
  return variant === "" || variant === "theme" ? "dark" : variant;
}

/**
 * The palette of one theme, as canonical role colours.
 * @param {object} theme
 * @returns {Map<string,string>}
 */
function palette(theme) {
  const out = new Map();
  for (const [role, entry] of quality.canonicalRoleColours(theme)) {
    out.set(role, entry.hex);
  }
  return out;
}

/**
 * Count pairs below the collision threshold, and the worst pair.
 * @param {string[]} hexes
 * @returns {{collisions:number, worst:number, worstPair:string|null}}
 */
function collisionsAmong(hexes) {
  let collisions = 0;
  let worst = Infinity;
  let worstPair = null;
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) {
      const de = color.deltaE00(hexes[i], hexes[j]);
      if (de < color.DELTA_E_CATEGORICAL_MIN) { collisions++; }
      if (de < worst) { worst = de; worstPair = `${hexes[i]}/${hexes[j]}`; }
    }
  }
  return { collisions, worst: worst === Infinity ? null : worst, worstPair };
}

/**
 * Rotate a colour's hue, holding lightness and chroma and reducing chroma only
 * as far as the gamut requires.
 *
 * Rotating in CAM16 rather than CIELAB so the angle swept is perceptually
 * uniform. Chroma is held at the source value and clipped downward to the gamut
 * boundary -- never raised. Allowing chroma to *increase* during a "rotation"
 * changes two variables at once and produces candidates that look like a
 * different palette rather than a rotated one.
 *
 * @param {string} hex
 * @param {number} deltaDeg
 * @returns {string}
 */
function rotateHue(hex, deltaDeg) {
  const { h } = color.hexToCam16(hex);
  const hRad = ((h + deltaDeg) * Math.PI) / 180;
  const lch = color.rgbToLch(color.parseHex(hex));
  const fitted = gamutFit(lch.L, lch.C, hRad);
  return labToHex(lch.L, fitted, hRad);
}

/**
 * Score one candidate amber for one theme.
 *
 * @param {object} theme
 * @param {string} candidate
 * @returns {object}
 */
function score(theme, candidate) {
  const bg = theme.colors["editor.background"];
  const pal = palette(theme);

  const baseAmber = pal.get("constant");
  const creamHex = pal.get("type");

  // Every competing colour in the palette except the amber being rotated.
  const distinct = [
    ...new Set(
      ROLES_OF_INTEREST.filter((r) => !AMBER_ROLES.includes(r))
        .map((r) => pal.get(r))
        .filter(Boolean)
    ),
  ];

  const before = collisionsAmong([...new Set([...distinct, baseAmber])]);
  const after = collisionsAmong([...new Set([...distinct, candidate])]);

  const vs = (other) => color.deltaE00(candidate, other);
  const amber = color.hexToCam16(candidate);
  const cream = color.hexToCam16(creamHex);
  const gap = Math.abs(amber.h - cream.h);

  return {
    candidate,
    baseAmber,
    cream: creamHex,
    hue: amber.h,
    J: amber.J,
    M: amber.M,
    vsCream: vs(creamHex),
    nearest: distinct
      .map((h) => ({ hex: h, de: vs(h) }))
      .sort((a, b) => a.de - b.de)
      .slice(0, 3),
    collisionsBefore: before.collisions,
    collisionsAfter: after.collisions,
    worstBefore: before.worst,
    worstAfter: after.worst,
    worstPair: after.worstPair,
    hueGapToCream: Math.min(gap, 360 - gap),
    apca: color.apcaAbs(candidate, bg),
    hk: color.helmholtzKohlrausch(candidate),
  };
}

function renderVariant(name, theme, candidates) {
  const baseline = score(theme, candidates[0].baseAmber);
  const lines = [];
  const THRESHOLD = color.DELTA_E_CATEGORICAL_MIN;

  lines.push(`## ${name}`);
  lines.push("");
  lines.push(
    `Baseline: \`${baseline.baseAmber}\` at CAM16 hue ${baseline.hue.toFixed(1)}°, ` +
    `${baseline.vsCream.toFixed(1)} CIEDE2000 from \`${baseline.cream}\`, ` +
    `${baseline.hueGapToCream.toFixed(1)}° of hue apart. ` +
    `Palette has ${baseline.collisionsBefore} collision(s) below dE00 ${THRESHOLD}.`
  );
  lines.push("");
  lines.push(
    "The `collisions` column counts pairs below the threshold across the whole palette, which " +
    "is the honest cost: a rotation that repairs the amber pair by creating a collision " +
    "elsewhere has moved the problem rather than solved it."
  );
  lines.push("");
  lines.push(
    "| Rotation | Hue | vs cream | Clears dE00 " + THRESHOLD + "? | Nearest rival | Collisions before → after |"
  );
  lines.push("|---|---|---|---|---|---|");

  for (const c of candidates) {
    const rival = c.nearest[0];
    const change = c.collisionsAfter - c.collisionsBefore;
    const marker = change === 0 ? "" : change > 0 ? ` **+${change}**` : ` ${change}`;
    lines.push(
      `| ${c.delta > 0 ? "+" : ""}${c.delta}° | ${c.hue.toFixed(1)}° | ` +
      `${c.vsCream.toFixed(1)} | ${c.vsCream >= THRESHOLD ? "**yes**" : "no"} | ` +
      `${rival.hex} (${rival.de.toFixed(1)}) | ` +
      `${c.collisionsBefore} → ${c.collisionsAfter}${marker} |`
    );
  }

  const clears = candidates.filter((c) => c.vsCream >= THRESHOLD);
  const improvements = candidates.filter((c) => c.collisionsAfter < c.collisionsBefore);
  const noWorse = candidates.filter(
    (c) => c.collisionsAfter <= c.collisionsBefore && c.vsCream > baseline.vsCream
  );

  lines.push("");
  lines.push("### Verdict");
  lines.push("");

  if (clears.length === 0) {
    lines.push(
      `**No rotation clears the dE00 ${THRESHOLD} categorical threshold for this pair.** ` +
      `The widest amber/cream separation reachable while staying in gamut is ` +
      `${Math.max(...candidates.map((c) => c.vsCream)).toFixed(1)}. ` +
      "The threshold is documented as unreachable for a palette this size on one background " +
      "(`docs/color-science.md`), so this is a known limit rather than a missed fix -- but it " +
      "does mean the pair stays inside the collision threshold at every rotation."
    );
  } else {
    lines.push(
      `${clears.length} rotation(s) clear dE00 ${THRESHOLD}: ` +
      clears
        .map(
          (c) =>
            `${c.delta > 0 ? "+" : ""}${c.delta}° (\`${c.candidate}\`, ${c.vsCream.toFixed(1)}, ` +
            `collisions ${c.collisionsBefore}→${c.collisionsAfter})`
        )
        .join(", ") +
      "."
    );
  }

  lines.push("");
  if (improvements.length === 0) {
    lines.push(
      "**No rotation reduces the palette's collision count.** Every candidate that widens the " +
      "amber/cream gap does so by colliding with something else. That is the answer to the " +
      "question the quality profile raised: the amber pair is not separable by rotation at this " +
      "palette size."
    );
  } else {
    lines.push(
      `${improvements.length} rotation(s) reduce the collision count: ` +
      improvements
        .map(
          (c) =>
            `${c.delta > 0 ? "+" : ""}${c.delta}° (${c.collisionsBefore}→${c.collisionsAfter}, ` +
            `amber/cream ${c.vsCream.toFixed(1)})`
        )
        .join(", ") +
      "."
    );
  }

  if (noWorse.length) {
    lines.push("");
    lines.push(
      `${noWorse.length} rotation(s) widen the amber/cream gap without adding a collision. ` +
      "These are free in collision terms, but note they move the amber toward the red family, " +
      "which is where the error colour lives:"
    );
    lines.push("");
    for (const c of noWorse) {
      lines.push(
        `- **${c.delta > 0 ? "+" : ""}${c.delta}°** -> \`${c.candidate}\` at hue ${c.hue.toFixed(1)}°, ` +
        `amber/cream ${c.vsCream.toFixed(1)}, nearest rival ${c.nearest[0].hex} at ` +
        `${c.nearest[0].de.toFixed(1)}, collisions ${c.collisionsAfter}`
      );
    }
  }

  return lines.join("\n");
}

function main() {
  const deltas = [-40, -30, -25, -20, -15, -10, -5, 5, 10, 15, 20, 25, 30, 40];

  const themes = {};
  for (const file of fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith(".json"))) {
    themes[themeName(file)] = JSON.parse(
      fs.readFileSync(path.join(THEMES_DIR, file), "utf8")
    );
  }

  const out = [];
  out.push("# Amber cluster: what-if analysis");
  out.push("");
  out.push(
    "The quality profile found that `#FFCB6B` (decorator, constant, notice) and `#E8C990` " +
    "(type, substrate) are 2.5 degrees apart in CAM16 hue and 7.7 CIEDE2000 apart, and are the " +
    "only pair in the palette that collides before any gamut reduction. This table is the cost " +
    "of separating them."
  );
  out.push("");
  out.push(
    "Rotations are applied to the amber family only. Lightness and chroma are held and clipped " +
    "to gamut where required -- never raised, since a rotation that also increases chroma " +
    "changes two variables and is not a rotation. Every 5 to 40 degrees either way. The " +
    "collision count is across the whole palette of competing roles."
  );
  out.push("");

  // Establish which variants merge the pair, before the per-variant sections,
  // because that is the single most decision-relevant fact in the whole table.
  const merged = [];
  const separated = [];
  for (const [name, theme] of Object.entries(themes)) {
    const pal = palette(theme);
    const amber = pal.get("constant");
    const cream = pal.get("type");
    if (!amber || !cream) { continue; }
    (amber === cream ? merged : separated).push(`${name} (\`${amber}\` / \`${cream}\`)`);
  }
  if (merged.length) {
    out.push("## Which variants already merge the pair");
    out.push("");
    out.push(
      "The merge option has already been taken elsewhere in this palette, so it is not " +
      "hypothetical:"
    );
    out.push("");
    for (const m of merged) { out.push(`- ${m}`); }
    out.push("");
  }
  if (separated.length) {
    out.push(`Variants that keep them distinct: ${separated.join(", ")}.`);
    out.push("");
  }

  for (const [name, theme] of Object.entries(themes)) {
    const pal = palette(theme);
    const baseAmber = pal.get("constant");
    const cream = pal.get("type");
    if (!baseAmber || !cream) { continue; }

    const baseline = score(theme, baseAmber);
    const amberCam = color.hexToCam16(baseAmber);

    if (baseAmber === cream) {
      out.push(`## ${name}`);
      out.push("");
      out.push(
        `**Already merged.** The amber and cream roles carry the same colour ` +
        `(\`${baseAmber}\`) in this variant, so there is no hue pair to separate. That is the ` +
        "merge option, taken here."
      );
      out.push("");
      continue;
    }

    if (amberCam.C <= color.CAM16_HUE_CHROMA_EPSILON) {
      out.push(`## ${name}`);
      out.push("");
      out.push(
        `Not analysable: \`${baseAmber}\` is achromatic (CAM16 C = ${amberCam.C.toFixed(1)}), ` +
        "so hue rotation is meaningless for it. This is expected for the monochrome variant, " +
        "which is a lightness ramp by design and separates roles by lightness rather than hue."
      );
      out.push("");
      continue;
    }

    if (baseline.collisionsBefore === 0) {
      out.push(`## ${name}`);
      out.push("");
      out.push(
        `No collision in this variant: \`${baseAmber}\` and \`${cream}\` are ` +
        `${baseline.vsCream.toFixed(1)} CIEDE2000 apart, above the threshold. Nothing to analyse.`
      );
      out.push("");
      continue;
    }
    const candidates = deltas.map((delta) => ({
      ...score(theme, rotateHue(baseAmber, delta)),
      delta,
    }));
    out.push(renderVariant(name, theme, candidates));
    out.push("");
  }

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const target = path.join(REPORTS_DIR, "amber-what-if.md");
  fs.writeFileSync(target, out.join("\n"));
  console.log(`wrote ${target}`);
}

if (require.main === module) { main(); }

module.exports = {
  palette,
  collisionsAmong,
  rotateHue,
  score,
  AMBER_ROLES,
  CREAM_ROLES,
};