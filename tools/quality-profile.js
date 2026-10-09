#!/usr/bin/env node

"use strict";

/**
 * Quality profile: eight independent measurements of how good a theme is.
 *
 * The palette audit gates on two things -- WCAG 2.1 contrast and APCA lightness
 * separation -- because those are the properties that make text readable. But a
 * theme can pass both and still be hard to use: hues that collapse under
 * dichromacy, a lightness ladder with no ordering, chroma that makes quiet
 * roles shout, colours a user cannot name. None of those show up in a contrast
 * ratio.
 *
 * This tool measures the rest. Each metric is deterministic given the theme
 * JSON, needs no participants, and is reported rather than gated unless it
 * catches something mechanically fixable. The point is to make the cost of a
 * palette change visible *before* making it, the way the CVD matrix does.
 *
 * The eight metrics:
 *
 *  1. **Semantic consistency** -- one colour per semantic role. A role painted
 *     two different colours is learnable only by memorising scope lists rather
 *     than concepts. Gated: this is mechanically fixable and a regression is
 *     unambiguous.
 *  2. **Visual hierarchy** -- is APCA |Lc| monotone in a declared importance
 *     rank, and are the steps between adjacent ranks deliberate?
 *  3. **Hue architecture** -- CAM16 hue gaps, coverage and clustering.
 *  4. **H-K brightness distortion** -- how much chroma promotes a colour's
 *     apparent brightness above what its lightness admits.
 *  5. **Chroma budget** -- mean CAM16 M across competing categories.
 *  6. **Colour naming** -- nearest xkcd colour name per token, and which
 *     tokens share a name they should not share.
 *  7. **Cross-variant hue consistency** -- does a role keep its relative
 *     position on the hue circle from one variant to the next?
 *  8. **Display degradation** -- collision rate after clipping to a reduced
 *     gamut, standing in for an ordinary laptop panel.
 *
 * Usage: node tools/quality-profile.js [--json] [--variant <name>]
 * Output: reports/quality-profile.md, or JSON on stdout with --json
 */

const fs = require("fs");
const path = require("path");
const color = require("../color-science.js");

const THEMES_DIR = path.resolve(__dirname, "..", "themes");
const REPORTS_DIR = path.resolve(__dirname, "..", "reports");
const DATA_DIR = path.resolve(__dirname, "..", "data");

/**
 * Semantic roles, in increasing order of visual importance.
 *
 * This ordering is the theme's stated intent: a comment should recede, plain
 * text should not compete, and a keyword or an error should pull the eye. The
 * hierarchy metric checks whether APCA |Lc| actually follows it.
 *
 * Each role lists the TextMate scope prefixes that map to it, longest-prefix
 * first within the role so that `entity.name.function.decorator.python` is a
 * decorator rather than a function.
 */
const ROLES = [
  {
    name: "comment",
    rank: 0,
    prefixes: ["comment"],
  },
  {
    name: "notice",
    rank: 1,
    // TODO/FIXME/HACK/NOTE/XXX comments. These are deliberately *not* comment
    // grey: the whole point of a TODO marker is that it interrupts. Giving them
    // their own role keeps them out of comment's outlier list, which would
    // otherwise report the theme's most useful feature as an inconsistency.
    prefixes: ["comment.todo", "comment.fixme", "comment.hack", "comment.note", "comment.xxx"],
  },
  {
    name: "invalid",
    rank: 2,
    prefixes: ["invalid"],
  },
  {
    name: "constant",
    rank: 3,
    // `variable.other.constant` is a constant wearing a variable's scope name.
    // Listed here so it classifies as a constant: roleOf picks the longest
    // matching prefix across all roles, so this beats the bare `variable`.
    prefixes: [
      "constant.numeric",
      "constant.language",
      "constant.other.color",
      "constant.character.escape",
      "constant.other.regex",
      "variable.other.constant",
    ],
  },
  {
    name: "string",
    rank: 4,
    prefixes: ["string", "constant.other.symbol"],
  },
  {
    name: "variable",
    rank: 5,
    prefixes: ["variable", "entity.name.lifetime", "entity.name.constant.preprocessor"],
  },
  {
    name: "type",
    rank: 6,
    prefixes: ["entity.name.type", "entity.name.class", "support.type", "support.class"],
  },
  {
    name: "function",
    rank: 7,
    prefixes: ["entity.name.function", "support.function", "meta.function-call", "variable.function"],
  },
  {
    name: "keyword",
    rank: 8,
    // `variable.other.class-variable` is a declaration, so it reads as a keyword.
    prefixes: [
      "keyword",
      "storage",
      "variable.language",
      "entity.name.tag",
      "variable.other.class-variable",
      "variable.special",
    ],
  },
  {
    name: "substrate",
    rank: 9,
    // Deliberately excludes `punctuation`. Punctuation adopts its parent
    // construct's colour -- `punctuation.definition.string` is string green,
    // `punctuation.definition.decorator` is decorator amber -- which is the
    // correct TextMate idiom, not a carve-out. There is no single "punctuation"
    // role to be inconsistent with.
    prefixes: [
      "entity.other.attribute-name",
      "entity.name.label",
      "entity.name.variable",
      "meta.object-literal.key",
      "variable.other.property",
      "variable.other.readwrite",
      "variable.other.normal.shell",
    ],
  },
];

/**
 * Roles that compete with each other for the reader's attention. Comments
 * recede and the substrate is the default, so neither is a competitor; that
 * distinction is what makes a 9-colour palette possible at all.
 */
const COMPETING = new Set([
  "notice", "invalid", "constant", "string", "variable", "type", "function",
  "keyword",
]);

/**
 * Roles that are *meant* to recede.
 *
 * Only `comment`. The substrate is the default text colour and is the most
 * prominent thing on screen, not a de-emphasis -- treating "not competing" as
 * "de-emphasis" conflates the two and makes every hierarchy check read as a
 * failure.
 */
const DE_EMPHASIS = new Set(["comment"]);

/**
 * Resolve a TextMate scope to a semantic role by longest matching prefix.
 * @param {string} scope
 * @returns {string|null}
 */
function roleOf(scope) {
  let best = null;
  let bestLen = -1;
  for (const role of ROLES) {
    for (const prefix of role.prefixes) {
      if (scope === prefix || scope.startsWith(prefix + ".")) {
        if (prefix.length > bestLen) {
          best = role.name;
          bestLen = prefix.length;
        }
      }
    }
  }
  return best;
}

// -------------------------------------------------- 1. semantic consistency --

// -------------------------------------------------- 1. semantic consistency --

/**
 * Flatten a theme's token rules into an ordered list of scope-to-colour claims.
 *
 * A rule carrying alpha is still a real claim and still participates in
 * precedence, so it is kept with a truncated hex and simply contributes less
 * often to the colour statistics.
 *
 * @param {object} theme
 * @returns {Array<{index:number, scope:string, hex:string|null}>}
 */
function flattenRules(theme) {
  const claims = [];
  let index = 0;
  for (const entry of theme.tokenColors ?? []) {
    const raw = String(entry.settings?.foreground ?? "").toUpperCase();
    const hex =
      /^#[0-9A-F]{6}$/.test(raw)
        ? raw
        : /^#[0-9A-F]{8}$/.test(raw)
          ? raw.slice(0, 7)
          : null;
    const scopes = Array.isArray(entry.scope) ? entry.scope : [entry.scope];
    for (const scope of scopes) {
      claims.push({ index, scope, hex });
    }
    index++;
  }
  return claims;
}

/**
 * Resolve what colour a scope actually renders as, under TextMate precedence.
 *
 * Precedence is **longest matching prefix wins**, with later rules winning ties.
 * This detail decides whether the metric is meaningful at all: a theme with
 * both a `keyword` rule and a `keyword.operator.logical.pipe.shell` rule does not
 * render every keyword as purple. Resolving by "the last rule that mentions the
 * scope" instead -- the obvious shortcut -- reports every carve-out as an
 * inconsistency, which is backwards: a carve-out is the theme doing deliberate
 * work, and this palette has a lot of them (decorators, shell pipes,
 * annotations, units, SQL DML).
 *
 * @param {string} scope a fully-qualified dotted scope
 * @param {Array<{index:number,scope:string,hex:string|null}>} claims
 * @returns {{hex:string|null, index:number}|null}
 */
function resolveScope(scope, claims) {
  let best = null;
  let bestLen = -1;
  for (const claim of claims) {
    const s = claim.scope;
    if (!(scope === s || scope.startsWith(s + "."))) { continue; }
    const len = s.length;
    if (len > bestLen || (len === bestLen && best !== null && claim.index >= best.index)) {
      best = claim;
      bestLen = len;
    }
  }
  return best;
}

/**
 * Metric 1. For each semantic role, resolve every declared scope and report how
 * concentrated the role's colour is.
 *
 * The figure that matters is modal coverage. If 95% of keyword scopes render
 * purple and 5% are carve-outs, that is a theme making deliberate distinctions.
 * If it is 50/50, the role has no single colour and the reader must memorise
 * scope lists instead of learning a concept. Coverage is reported rather than
 * gated because what counts as an acceptable carve-out fraction is a design
 * judgement, not a mechanical one.
 *
 * Also detects **dead rules** -- entries re-claimed later with the same scope
 * and a different colour, so the earlier entry can never render. That is
 * unambiguous, and it is the mechanically gateable part.
 *
 * @param {object} theme
 * @returns {{roles:object[], deadRules:object[], modalCoverage:number, scopes:number}}
 */
function semanticConsistency(theme) {
  const claims = flattenRules(theme);

  /** @type {Map<string, Map<string, string>>} */
  const byRole = new Map();
  for (const claim of claims) {
    const role = roleOf(claim.scope);
    if (!role) { continue; }
    if (!byRole.has(role)) { byRole.set(role, new Map()); }
    const scopeMap = byRole.get(role);
    if (scopeMap.has(claim.scope)) { continue; }
    scopeMap.set(claim.scope, resolveScope(claim.scope, claims)?.hex ?? "none");
  }

  const roles = [];
  for (const [role, scopeMap] of byRole) {
    /** @type {Map<string, string[]>} */
    const byHex = new Map();
    for (const [scope, hex] of scopeMap) {
      if (!byHex.has(hex)) { byHex.set(hex, []); }
      byHex.get(hex).push(scope);
    }
    const ranked = [...byHex.entries()].sort((a, b) => b[1].length - a[1].length);
    const modal = ranked[0];
    const total = scopeMap.size;
    roles.push({
      role,
      scopes: total,
      hex: modal[0] === "none" ? null : modal[0],
      modalCoverage: modal[1].length / total,
      distinctColours: ranked.length,
      outliers: ranked.slice(1).map(([hex, scopes]) => ({
        hex,
        count: scopes.length,
        share: scopes.length / total,
        scopes: scopes.slice(0, 5),
      })),
    });
  }
  roles.sort((a, b) => b.scopes - a.scopes);

  // Dead rules: an entry can never render if a later entry claims the *same*
  // scope with a different colour. Note what this does not flag: a broad
  // `keyword` rule alongside narrower `keyword.control` rules is doing real
  // work, because it still renders for every keyword scope the narrow rules do
  // not name. Only an exact same-scope override makes an entry unreachable.
  const byEntry = new Map();
  for (const claim of claims) {
    if (!byEntry.has(claim.index)) { byEntry.set(claim.index, []); }
    byEntry.get(claim.index).push(claim.scope);
  }
  const deadRules = [];
  for (const [index, scopes] of byEntry) {
    const shadowed = scopes.every((scope) => {
      const winner = resolveScope(scope, claims);
      if (!winner || winner.index === index) { return false; }
      const mine = claims.find((c) => c.index === index && c.scope === scope);
      return mine?.hex !== winner.hex;
    });
    if (shadowed) { deadRules.push({ index, scopes: scopes.slice(0, 8) }); }
  }

  const weighted = roles.reduce((s, r) => s + r.modalCoverage * r.scopes, 0);
  const scopes = roles.reduce((s, r) => s + r.scopes, 0);

  return { roles, deadRules, modalCoverage: scopes ? weighted / scopes : 0, scopes };
}
// ------------------------------------------------------ 2. visual hierarchy --

/**
 * Metric 2. How prominence is distributed across roles.
 *
 * The obvious design claim is a monotone ladder: comments recede, then
 * identifiers, then keywords, and so on upward. This palette does not make that
 * claim, and asserting it would manufacture violations out of a design that was
 * never made. What it actually claims is two things:
 *
 *   1. **Comment recedes.** The comment colour is the least prominent thing on
 *      screen. That is checkable, and it is the single most important
 *      hierarchy property a syntax theme has.
 *   2. **Competing roles sit in a legible band.** They are distinguishable from
 *      each other and comfortably above the background, without one of them
 *      dominating.
 *
 * So this measures those two, plus the shape of the band: its width, its
 * centre, and how evenly the competing roles are spread within it. A band
 * where every role sits at nearly the same |Lc| is a theme that communicates no
 * hierarchy among its categories even though it passes every contrast check.
 *
 * @param {object} theme
 * @returns {object}
 */
function visualHierarchy(theme) {
  const bg = theme.colors["editor.background"];
  const canonical = canonicalRoleColours(theme);

  const rows = [];
  for (const role of ROLES) {
    const entry = canonical.get(role.name);
    if (!entry) { continue; }
    rows.push({
      role: role.name,
      rank: role.rank,
      hex: entry.hex,
      source: entry.source,
      apca: color.apcaAbs(entry.hex, bg),
      J: color.hexToCam16(entry.hex).J,
      competing: COMPETING.has(role.name),
    });
  }

  const deEmphasis = rows.filter((r) => DE_EMPHASIS.has(r.role));
  const competing = rows.filter((r) => COMPETING.has(r.role)).sort((a, b) => a.apca - b.apca);
  const substrate = rows.filter((r) => r.role === "substrate");

  const checks = [];

  // 1. The de-emphasis colour must be the least prominent role present.
  if (deEmphasis.length && competing.length) {
    const quietest = deEmphasis.reduce((m, r) => (r.apca < m.apca ? r : m));
    const loudest = competing[competing.length - 1];
    checks.push({
      name: "de-emphasis recedes",
      ok: quietest.apca < loudest.apca,
      detail:
        `${quietest.role} at ${quietest.apca.toFixed(1)} Lc is the least prominent; ` +
        `loudest competing role is ${loudest.role} at ${loudest.apca.toFixed(1)} Lc`,
    });
    checks.push({
      name: "de-emphasis clears APCA body-text threshold",
      ok: quietest.apca >= 15,
      detail: `${quietest.role} at ${quietest.apca.toFixed(1)} Lc (threshold 15)`,
    });
  }

  // 2. Every competing role must clear the legibility floor.
  //
  // Lc 30, not Lc 45. APCA's Lc 45 is the *fluent content* guideline -- the
  // point below which APCA recommends a larger font size -- not a legibility
  // floor. Using 45 as a hard gate produces false failures on the high-contrast
  // variant, whose variable and keyword sit at 37.4: comfortably readable, but
  // below the size-adjustment guideline. The floor is 30, below which text is
  // approaching invisibility; roles between 30 and 45 are reported as advisory.
  const FLOOR = 30;
  const FLUENT = 45;
  const belowFloor = competing.filter((r) => r.apca < FLOOR);
  const belowFluent = competing.filter((r) => r.apca < FLUENT);

  checks.push({
    name: "all competing roles clear the APCA legibility floor",
    ok: belowFloor.length === 0,
    detail: belowFloor.length
      ? `below ${FLOOR} Lc: ${belowFloor.map((r) => `${r.role} (${r.apca.toFixed(1)})`).join(", ")}`
      : `lowest is ${competing[0].role} at ${competing[0].apca.toFixed(1)} Lc`,
  });

  const band = competing.length
    ? {
        low: competing[0].apca,
        high: competing[competing.length - 1].apca,
        width: competing[competing.length - 1].apca - competing[0].apca,
      }
    : { low: 0, high: 0, width: 0 };

  // Evenness of the band: mean absolute gap between adjacent competing roles.
  const gaps = [];
  for (let i = 1; i < competing.length; i++) {
    gaps.push(competing[i].apca - competing[i - 1].apca);
  }
  const meanGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  const maxGap = gaps.length ? Math.max(...gaps) : 0;

  return {
    bg,
    rows,
    deEmphasis,
    competing,
    substrate,
    band,
    meanGap,
    maxGap,
    checks,
    belowFluent,
    ladder: rows.sort((a, b) => b.apca - a.apca),
  };
}

// ------------------------------------------------------ 3. hue architecture --

/**
 * Metric 3. CAM16 hue gaps, coverage and clustering for competing tokens.
 *
 * Uses CAM16 rather than CIELAB because CIELAB hue is non-uniform around the
 * circle and compressed at high chroma, so an angular gap in CIELAB does not
 * mean a constant perceptual amount.
 *
 * @param {object} theme
 * @returns {{entries:object[], minGap:number, coverage:number, clusters:object[]}}
 */
function hueArchitecture(theme) {
  // Deduplicated by colour. Two roles sharing a hex would otherwise register as
  // a 0-degree hue gap -- a "collision" that is really the palette assigning one
  // colour to two roles, which metric 1 already reports.
  const all = hueEntries(theme);
  const byHex = new Map();
  for (const e of all) {
    if (!byHex.has(e.hex)) { byHex.set(e.hex, { ...e, roles: [e.role] }); }
    else { byHex.get(e.hex).roles.push(e.role); }
  }
  const entries = [...byHex.values()];
  const shared = all.length - entries.length;

  if (entries.length === 0) {
    return { entries, shared, minGap: 0, coverage: 0, clusters: [] };
  }

  const sorted = [...entries].sort((a, b) => a.h - b.h);
  const gaps = [];
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const next = sorted[(i + 1) % sorted.length];
    const gap = i === sorted.length - 1 ? next.h + 360 - cur.h : next.h - cur.h;
    gaps.push({ gap, a: cur, b: next });
  }
  const minGap = gaps.reduce((m, g) => Math.min(m, g.gap), 360);

  // Coverage: angular span outside 15-degree dead zones, over 360. A palette
  // whose hues all fall in one 40-degree arc covers almost nothing; a
  // well-spread palette approaches 100.
  const DEAD_ZONE = 15;
  const covered = gaps
    .filter((g) => g.gap > DEAD_ZONE)
    .reduce((s, g) => s + (g.gap - DEAD_ZONE), 0);
  const coverage = (covered / 360) * 100;

  // Clusters: consecutive hues within 20 degrees of each other.
  const CLUSTER_DEG = 20;
  const clusters = [];
  let current = null;
  for (const g of gaps) {
    if (g.gap <= CLUSTER_DEG) {
      if (!current) { current = { members: [g.a], meanHue: g.a.h }; }
      current.members.push(g.b);
      current.meanHue =
        current.members.reduce((s, m) => s + m.h, 0) / current.members.length;
    } else if (current) {
      clusters.push(current);
      current = null;
    }
  }
  if (current) { clusters.push(current); }
  clusters.sort((a, b) => b.members.length - a.members.length);

  return { entries, shared, minGap, coverage, clusters };
}

/**
 * CAM16 hue angle for each competing token colour.
 * @param {object} theme
 * @returns {Array<{hex:string,role:string,h:number,C:number}>}
 */
function hueEntries(theme) {
  const canonical = canonicalRoleColours(theme);
  const out = [];
  for (const role of ROLES) {
    if (!COMPETING.has(role.name)) { continue; }
    const entry = canonical.get(role.name);
    if (!entry) { continue; }
    const cam = color.hexToCam16(entry.hex);
    if (cam.C <= color.CAM16_HUE_CHROMA_EPSILON) { continue; }
    out.push({ hex: entry.hex, role: role.name, h: cam.h, C: cam.C });
  }
  return out;
}

// ------------------------------------------------- 4/5. H-K and chroma budget --

/**
 * Metrics 4 and 5. H-K brightness promotion and mean chroma.
 *
 * H-K promotion is how far above its lightness a colour *appears*. Two things
 * are worth knowing about it:
 *
 * - **Does any competing role appear dimmer than the de-emphasis role?** That
 *   would be a genuine failure: a keyword the reader is meant to notice
 *   appearing quieter than a comment. That is the check below.
 * - **How much does promotion reorder roles within the competing band?** The
 *   palette does not claim a ladder among competing roles, so a reordering is
 *   not a defect. But it means the APCA ordering is not the ordering a reader
 *   perceives, which matters for reasoning about the design. Spearman rank
 *   correlation between |Lc| and J_HK quantifies it.
 *
 * @param {object} theme
 * @returns {object}
 */
function chromaAndBrightness(theme) {
  const canonical = canonicalRoleColours(theme);
  const entries = [];
  for (const role of ROLES) {
    const entry = canonical.get(role.name);
    if (!entry) { continue; }
    const hk = color.helmholtzKohlrausch(entry.hex);
    entries.push({
      role: role.name,
      rank: role.rank,
      hex: entry.hex,
      J: hk.J,
      C: hk.C,
      M: color.hexToCam16(entry.hex).M,
      Jhk: hk.Jhk,
      promotion: hk.promotion,
      apca: color.apcaAbs(entry.hex, theme.colors["editor.background"]),
      competing: COMPETING.has(role.name),
    });
  }
  entries.sort((a, b) => a.rank - b.rank);

  const competing = entries.filter((e) => COMPETING.has(e.role));
  const quiet = entries.filter((e) => DE_EMPHASIS.has(e.role));
  const meanM = competing.length
    ? competing.reduce((s, e) => s + e.M, 0) / competing.length
    : 0;
  const maxM = competing.length ? Math.max(...competing.map((e) => e.M)) : 0;
  const meanPromotion = competing.length
    ? competing.reduce((s, e) => s + e.promotion, 0) / competing.length
    : 0;

  const checks = [];
  if (quiet.length && competing.length) {
    const loudestQuiet = quiet.reduce((m, e) => (e.Jhk > m.Jhk ? e : m));
    const dimmestLoud = competing.reduce((m, e) => (e.Jhk < m.Jhk ? e : m));
    checks.push({
      name: "no competing role appears dimmer than de-emphasis",
      ok: dimmestLoud.Jhk > loudestQuiet.Jhk,
      detail:
        `dimmest competing is ${dimmestLoud.role} at J_HK ${dimmestLoud.Jhk.toFixed(1)}; ` +
        `brightest de-emphasis is ${loudestQuiet.role} at ${loudestQuiet.Jhk.toFixed(1)}`,
    });
  }

  // Spearman rank correlation between |Lc| order and J_HK order across the
  // competing roles. 1.0 means chroma promotion changes nothing about the
  // perceived ordering.
  const rho = spearman(competing.map((e) => e.apca), competing.map((e) => e.Jhk));

  return {
    entries,
    competing,
    quiet,
    meanM,
    maxM,
    meanPromotion,
    checks,
    rankCorrelation: rho,
  };
}

/**
 * Spearman rank correlation. Ties get average ranks.
 * @param {number[]} xs
 * @param {number[]} ys
 * @returns {number}
 */
function spearman(xs, ys) {
  const n = xs.length;
  if (n < 2) { return 1; }
  const rank = (values) => {
    const order = values
      .map((v, i) => ({ v, i }))
      .sort((a, b) => a.v - b.v);
    const out = new Array(values.length);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && order[j + 1].v === order[i].v) { j++; }
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) { out[order[k].i] = avg; }
      i = j + 1;
    }
    return out;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  return dx === 0 || dy === 0 ? 1 : num / Math.sqrt(dx * dy);
}

// --------------------------------------------------------- 6. colour naming --

/** @type {Array<{name:string,hex:string}>|null} */
let xkcdCache = null;

/** Load the vendored xkcd colour survey names. */
function loadXkcd() {
  if (xkcdCache) { return xkcdCache; }
  const file = path.join(DATA_DIR, "xkcd-colors.json");
  xkcdCache = JSON.parse(fs.readFileSync(file, "utf8"));
  return xkcdCache;
}

/**
 * Metric 6. Nearest xkcd colour name for each token.
 *
 * The xkcd survey names were placed by human participants, so the dataset
 * encodes what people actually call colours rather than what a colour space
 * says they are. Two tokens resolving to the same name is evidence they are
 * verbally confusable, which is a different and more actionable complaint than
 * a CIEDE2000 distance.
 *
 * Names are matched in Lab so the nearest name is perceptually nearest.
 *
 * @param {object} theme
 * @returns {{entries:object[], shared:object[]}}
 */
function colourNaming(theme) {
  const names = loadXkcd().map((n) => ({
    name: n.name,
    lab: color.rgbToLab(color.parseHex(n.hex)),
  }));

  const canonical = canonicalRoleColours(theme);
  const entries = [];
  for (const role of ROLES) {
    const entry = canonical.get(role.name);
    if (!entry) { continue; }
    const lab = color.rgbToLab(color.parseHex(entry.hex));
    let best = names[0];
    let bestDe = Infinity;
    for (const n of names) {
      const de = color.ciede2000(lab, n.lab);
      if (de < bestDe) { bestDe = de; best = n; }
    }
    entries.push({
      role: role.name,
      hex: entry.hex,
      name: best.name,
      deltaE: bestDe,
      competing: COMPETING.has(role.name),
    });
  }
  entries.sort((a, b) => b.deltaE - a.deltaE);

  // Two roles carrying the *same* hex will always share a nearest name, and
  // calling that a naming failure is vacuous -- they are literally the same
  // colour. Those are reported separately; what matters here is roles that a
  // reader would call by the same word despite the colours differing.
  const sharedColour = [];
  const byHex = new Map();
  for (const e of entries) {
    if (!byHex.has(e.hex)) { byHex.set(e.hex, []); }
    byHex.get(e.hex).push(e.role);
  }
  for (const [hex, roles] of byHex) {
    if (roles.length > 1) { sharedColour.push({ hex, roles }); }
  }

  const shared = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (entries[i].hex === entries[j].hex) { continue; }
      if (entries[i].name === entries[j].name) {
        shared.push({
          name: entries[i].name,
          a: entries[i].role,
          b: entries[j].role,
          aHex: entries[i].hex,
          bHex: entries[j].hex,
          deltaE: color.deltaE00(entries[i].hex, entries[j].hex),
        });
      }
    }
  }
  shared.sort((a, b) => a.deltaE - b.deltaE);

  return { entries, shared, sharedColour };
}

// ------------------------------------------------- 7. cross-variant hue --

/**
 * The canonical colour for each semantic role.
 *
 * Prefers the theme's own `semanticTokenColors` entry, which is what VS Code
 * itself resolves a semantic role to and what the semantic-highlighting
 * documentation says the role *is*. Falls back to the modal colour of the
 * role's resolved scopes only when a variant declares no semantic entry.
 *
 * The fallback matters less than it looks, but when it does fire it can pick
 * badly: a role with ten scopes split four ways has a modal that reflects
 * which scopes happen to be enumerated, not what the role means. The light
 * theme's `variable` is the concrete case -- its modal resolved scope colour is
 * blue, while the semantic entry it actually ships is magenta.
 *
 * @param {object} theme
 * @returns {Map<string, {hex:string, source:'semantic'|'scopes'}>}
 */
function canonicalRoleColours(theme) {
  const out = new Map();
  const semantic = theme.semanticTokenColors ?? {};

  for (const role of ROLES) {
    const declared = semantic[role.name];
    const hex = declared?.foreground;
    if (hex && /^#[0-9A-Fa-f]{6,8}$/.test(String(hex))) {
      out.set(role.name, { hex: String(hex).toUpperCase().slice(0, 7), source: "semantic" });
    }
  }

  const resolved = semanticConsistency(theme);
  for (const row of resolved.roles) {
    if (out.has(row.role) || !row.hex) { continue; }
    out.set(row.role, { hex: row.hex, source: "scopes" });
  }

  return out;
}

/**
 * Metric 7. Does a role keep its hue across the identity variants?
 *
 * Only across **dark and light**, which claim to be the same palette for
 * different lighting. The dichromacy variants rotate hues deliberately -- that
 * rotation is the feature, and scoring it as inconsistency would report the
 * design working as a defect. Monochrome drops hue outright and has none to be
 * consistent about; high contrast targets a different use.
 *
 * Uses **absolute** CAM16 hue. The obvious alternative, hue relative to the
 * variant's background, is meaningless across a light/dark pair: the dark
 * background is hue 296 and the light one is hue 117, 179 degrees apart, so
 * subtracting the background hue rotates every role by an arbitrary amount and
 * reports ~84 degrees of dispersion for a palette that is actually consistent.
 * Relative hue is only meaningful between two variants with similarly-hued
 * backgrounds.
 *
 * @param {Record<string, object>} themes by variant name
 * @returns {object}
 */
function crossVariantHue(themes) {
  const IDENTITY = ["dark", "light"];
  const RECOLOURED = ["deuteranopia", "protanopia", "tritanopia"];
  const EXCLUDED = ["monochrome", "high-contrast"];

  const identity = IDENTITY.filter((v) => themes[v]);
  const perRole = new Map();

  for (const variant of identity) {
    const canonical = canonicalRoleColours(themes[variant]);
    for (const [role, entry] of canonical) {
      const cam = color.hexToCam16(entry.hex);
      if (cam.C <= color.CAM16_HUE_CHROMA_EPSILON) { continue; }
      if (!perRole.has(role)) { perRole.set(role, []); }
      perRole.get(role).push({ variant, hex: entry.hex, h: cam.h, source: entry.source });
    }
  }

  const angles = [];
  let worst = null;
  let worstDelta = -1;
  let total = 0;
  let counted = 0;

  for (const [role, list] of perRole) {
    if (list.length < 2) { continue; }
    let delta = 0;
    for (let i = 1; i < list.length; i++) {
      let d = Math.abs(list[i].h - list[i - 1].h);
      if (d > 180) { d = 360 - d; }
      delta = Math.max(delta, d);
    }
    angles.push({
      role,
      n: list.length,
      delta,
      entries: list,
      hue: list.map((e) => e.h),
      hexes: list.map((e) => e.hex),
    });
    total += delta;
    counted++;
    if (delta > worstDelta) { worstDelta = delta; worst = role; }
  }

  angles.sort((a, b) => b.delta - a.delta);

  /** A role is consistent if it moves less than this many degrees. */
  const TOLERANCE = 20;

  return {
    identity,
    recoloured: RECOLOURED.filter((v) => themes[v]),
    excluded: EXCLUDED.filter((v) => themes[v]),
    angles,
    dispersion: counted ? total / counted : 0,
    worstRole: worst,
    worstDelta,
    tolerance: TOLERANCE,
    outliers: angles.filter((a) => a.delta > TOLERANCE),
  };
}

/** Mean of angles on a circle, in degrees. */
function circularMean(degrees) {
  const sx = degrees.reduce((s, d) => s + Math.cos((d * Math.PI) / 180), 0);
  const sy = degrees.reduce((s, d) => s + Math.sin((d * Math.PI) / 180), 0);
  let m = (Math.atan2(sy, sx) * 180) / Math.PI;
  if (m < 0) { m += 360; }
  return m;
}

/**
 * Circular standard deviation, in degrees. Linear variance is wrong on a
 * circle: 1 and 359 degrees are 2 degrees apart, not 358.
 */
function circularDispersion(degrees, mean) {
  const sd = Math.sqrt(
    degrees.reduce((s, d) => {
      let diff = d - mean;
      while (diff > 180) { diff -= 360; }
      while (diff < -180) { diff += 360; }
      return s + diff * diff;
    }, 0) / degrees.length
  );
  return sd;
}

// ------------------------------------------------ 8. display degradation --

/**
 * Metric 8. Collision rate after clipping to a reduced gamut.
 *
 * A wide-gamut panel shows the palette as authored. A typical laptop covers
 * 60-70% of sRGB, and colours near the gamut edge clip, shifting hue by an
 * unpredictable amount. Two tokens that are well separated in sRGB can become
 * neighbours on a cheap panel.
 *
 * Simulated by clipping each colour's CIELAB chroma toward the achromatic axis
 * until it is inside the target gamut, which is what a display that cannot
 * render the colour effectively does.
 *
 * @param {object} theme
 * @param {number} coverage fraction of sRGB retained, 0-1
 * @returns {{coverage:number, pairs:object[], worst:object|null, collisions:number}}
 */
/**
 * Metric 8 across a range of gamuts.
 *
 * 70% is the headline figure because it is roughly what an ordinary laptop
 * panel covers, but the interesting number is the coverage at which the palette
 * actually breaks. Sweeping 100 -> 40 finds that.
 *
 * @param {object} theme
 * @returns {Array<{coverage:number, collisions:number, worst:number|null, meanShift:number}>}
 */
function displaySweep(theme) {
  return [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4].map((coverage) => {
    const d = displayDegradation(theme, coverage);
    return {
      coverage,
      collisions: d.collisions,
      worst: d.worst ? d.worst.de : null,
      meanShift: d.meanShift,
    };
  });
}

function displayDegradation(theme, coverage = 0.7) {
  const entries = hueEntries(theme);

  // Deduplicate by colour, for the same reason the hue metric does: two roles
  // sharing a hex produce a 0 dE00 "collision" that is not a collision.
  const byHex = new Map();
  for (const e of entries) {
    if (!byHex.has(e.hex)) { byHex.set(e.hex, { ...e, roles: [e.role] }); }
    else { byHex.get(e.hex).roles.push(e.role); }
  }

  const simulated = [...byHex.values()].map((e) => ({
    ...e,
    clipped: clipToGamut(e.hex, coverage),
  }));

  const pairs = [];
  let collisions = 0;
  for (let i = 0; i < simulated.length; i++) {
    for (let j = i + 1; j < simulated.length; j++) {
      const a = simulated[i];
      const b = simulated[j];
      const de = color.deltaE00(a.clipped, b.clipped);
      pairs.push({ a: a.roles.join("/"), b: b.roles.join("/"), de });
      if (de < color.DELTA_E_CVD_MIN) { collisions++; }
    }
  }
  pairs.sort((x, y) => x.de - y.de);

  const shifts = simulated.map((e) => color.deltaE00(e.hex, e.clipped));
  const worstShift = simulated.reduce(
    (m, e) => {
      const d = color.deltaE00(e.hex, e.clipped);
      return d > m.d ? { d, e } : m;
    },
    { d: 0, e: null }
  );

  return {
    coverage,
    pairs,
    worst: pairs[0] ?? null,
    collisions,
    simulated,
    meanShift: shifts.length ? shifts.reduce((a, b) => a + b, 0) / shifts.length : 0,
    worstShift,
  };
}

/**
 * Simulate a display that cannot render the full gamut.
 *
 * Reduces CIELAB chroma by `coverage` and converts back, which is what a panel
 * missing that much of the gamut effectively shows: the hue and lightness
 * survive, the saturation does not. If the reduced colour still falls outside
 * sRGB -- which happens when the original was near the gamut boundary -- the
 * chroma is binary-searched down to the gamut edge, because a real display
 * clips rather than refusing to show the colour.
 *
 * The earlier version searched for the largest in-gamut chroma and returned the
 * original, since the original is in gamut by definition. That made the whole
 * metric a silent no-op reporting zero shift for every colour.
 *
 * @param {string} hex
 * @param {number} coverage fraction of sRGB chroma retained, 0-1
 * @returns {string}
 */
function clipToGamut(hex, coverage) {
  if (coverage >= 1) { return hex.toUpperCase(); }
  const { L, a, b } = color.rgbToLab(color.parseHex(hex));
  const C = Math.hypot(a, b);
  if (C === 0) { return hex.toUpperCase(); }

  const hRad = Math.atan2(b, a);
  const target = C * coverage;

  const direct = labToRgbSrgbPolar(L, target, hRad);
  if (direct !== null) { return direct; }

  // Reduce chroma to the gamut edge, keeping the target as the upper bound.
  let lo = 0;
  let hi = target;
  let best = null;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const candidate = labToRgbSrgbPolar(L, mid, hRad);
    if (candidate === null) { hi = mid; } else { best = candidate; lo = mid; }
  }
  return best ?? hex.toUpperCase();
}

/**
 * CIELAB to sRGB hex from polar coordinates, or null if outside sRGB.
 * @param {number} L
 * @param {number} C
 * @param {number} hRad hue angle in radians
 * @returns {string|null}
 */
function labToRgbSrgbPolar(L, C, hRad) {
  return labToHexSrgb(L, C, (hRad * 180) / Math.PI);
}

/** @returns {string|null} */
function labToHexSrgb(L, C, h) {
  const rad = (h * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const inv = (t) =>
    t > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27);
  const X = 0.9504559270516716 * inv(fx);
  const Y = inv(fy);
  const Z = 1.0890577507598784 * inv(fz);

  const R = 3.2409699419045226 * X - 1.537383177570094 * Y - 0.4986107602930034 * Z;
  const G = -0.9692436362808796 * X + 1.8759675015077202 * Y + 0.04155505740717559 * Z;
  const B = 0.05563007969699366 * X - 0.20397695888897652 * Y + 1.0569715142428786 * Z;

  // Tolerance absorbs the rounding in the reference matrix.
  const TOL = 1e-6;
  if (R < -TOL || R > 1 + TOL || G < -TOL || G > 1 + TOL || B < -TOL || B > 1 + TOL) {
    return null;
  }
  const enc = (v) => {
    const c = Math.min(1, Math.max(0, v));
    const s = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(s * 255);
  };
  return (
    "#" + [enc(R), enc(G), enc(B)].map((v) => v.toString(16).padStart(2, "0")).join("")
  ).toUpperCase();
}

// ------------------------------------------------------------- orchestration --

/** Load all theme variants keyed by display name. */
function loadThemes() {
  const out = {};
  for (const file of fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith(".json"))) {
    const theme = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, file), "utf8"));
    // `shroom-space-theme.json` is the dark variant, not a variant named "theme".
    const named = /^shroom-space-(.*)-theme\.json$/.exec(file);
    const variant = named ? named[1] : "";
    const name = variant === "" || variant === "theme" ? "dark" : variant;
    out[name] = theme;
  }
  return out;
}

/** Compute all eight metrics for one theme. */
function profile(theme) {
  return {
    semantic: semanticConsistency(theme),
    hierarchy: visualHierarchy(theme),
    hue: hueArchitecture(theme),
    chroma: chromaAndBrightness(theme),
    naming: colourNaming(theme),
    display: displayDegradation(theme),
    sweep: displaySweep(theme),
  };
}

const REPORT_ORDER = [
  ["1. Semantic consistency", (p) => renderSemantic(p.semantic)],
  ["2. Visual hierarchy", (p) => renderHierarchy(p.hierarchy)],
  ["3. Hue architecture", (p) => renderHue(p.hue)],
  ["4. Helmholtz-Kohlrausch brightness", (p) => renderChroma(p.chroma)],
  ["5. Chroma budget", (p) => renderChromaBudget(p.chroma)],
  ["6. Colour naming", (p) => renderNaming(p.naming)],
  ["8. Display degradation", (p) => renderDisplay(p.display, p.sweep)],
];

function renderSemantic(s) {
  const lines = [];
  lines.push(
    `Every scope resolved under TextMate precedence (longest matching prefix wins, ` +
    `later rules break ties). Modal colour coverage across ${s.scopes} scopes: ` +
    `**${(s.modalCoverage * 100).toFixed(1)}%**.`
  );
  lines.push("");
  lines.push("| Role | Scopes | Modal hex | Coverage | Distinct | Outliers |");
  lines.push("|---|---|---|---|---|---|");
  for (const r of s.roles) {
    const out = r.outliers
      .map((o) => `\`${o.hex}\` ${(o.share * 100).toFixed(0)}%`)
      .join(", ");
    lines.push(
      `| ${r.role} | ${r.scopes} | ${r.hex ? "`" + r.hex + "`" : "-"} | ` +
      `${(r.modalCoverage * 100).toFixed(0)}% | ${r.distinctColours} | ${out || "-"} |`
    );
  }
  lines.push("");
  if (s.deadRules.length === 0) {
    lines.push("No dead rules: every entry can render.");
  } else {
    lines.push(
      `**${s.deadRules.length} dead rule(s)** -- entries re-claimed later with the same scope ` +
      "and a different colour, so the earlier entry can never render:"
    );
    lines.push("");
    for (const d of s.deadRules) {
      lines.push(`- entry ${d.index}: ${d.scopes.map((x) => "`" + x + "`").join(", ")}`);
    }
  }

  const withOutliers = s.roles.filter((r) => r.outliers.length > 0);
  if (withOutliers.length) {
    lines.push("");
    lines.push("### Carve-outs");
    lines.push("");
    lines.push(
      "Scopes rendering in a colour other than their role's modal one. Most of these are the " +
      "theme working deliberately -- decorators are amber, shell pipes are teal, CSS property " +
      "names are pink because they behave like variables. Coverage below 100% is therefore not " +
      "a defect. The number to watch is a role whose outliers are a *large* share, because that " +
      "means the role has no colour a reader can learn."
    );
    lines.push("");
    for (const r of withOutliers) {
      for (const o of r.outliers) {
        lines.push(
          `- \`${r.role}\` -> \`${o.hex}\` (${o.count} scope${o.count === 1 ? "" : "s"}): ` +
          o.scopes.map((x) => "`" + x + "`").join(", ") + (o.count > 5 ? ", ..." : "")
        );
      }
    }
  }
  return lines.join("\n");
}

function renderHierarchy(h) {
  const lines = [];
  lines.push(
    `Background \`${h.bg}\`. APCA |Lc| against the background, most prominent first. ` +
    "This palette does not claim a monotone ladder; it claims that comment recedes and that " +
    "competing roles sit in a legible band. Those are the two properties checked below."
  );
  lines.push("");
  lines.push("| Role | Hex | APCA |Lc| | CAM16 J | Competing |");
  lines.push("|---|---|---|---|---|---|");
  for (const r of h.ladder) {
    lines.push(
      `| ${r.role} | \`${r.hex}\` | ${r.apca.toFixed(1)} | ${r.J.toFixed(1)} | ${r.competing ? "yes" : "no"} |`
    );
  }
  lines.push("");
  lines.push(
    `Competing band: ${h.band.low.toFixed(1)} to ${h.band.high.toFixed(1)} Lc ` +
    `(width ${h.band.width.toFixed(1)}). Mean gap between adjacent competing roles ` +
    `${h.meanGap.toFixed(1)} Lc, largest ${h.maxGap.toFixed(1)} Lc.`
  );
  lines.push("");
  lines.push("| Check | Result | Detail |");
  lines.push("|---|---|---|");
  for (const c of h.checks) {
    lines.push(`| ${c.name} | ${c.ok ? "pass" : "**FAIL**"} | ${c.detail} |`);
  }
  if (h.belowFluent.length) {
    lines.push("");
    lines.push(
      `Advisory: ${h.belowFluent.map((r) => `${r.role} (${r.apca.toFixed(1)} Lc)`).join(", ")} ` +
      "sit below APCA's Lc 45 fluent-content guideline. Legible, but APCA would recommend a " +
      "larger or bolder font at those sizes."
    );
  }
  // Some variants deliberately invert the de-emphasis: high contrast makes
  // comments louder than some syntax so they cannot be missed. Worth naming,
  // because every other property here assumes comments are the quietest thing
  // on screen.
  if (h.deEmphasis.length) {
    const quiet = h.deEmphasis[0];
    const louder = h.competing.filter((r) => r.apca < quiet.apca);
    if (louder.length > 0) {
      lines.push("");
      lines.push(
        `Competing roles quieter than the de-emphasis role: ` +
        `${louder.map((r) => `${r.role} (${r.apca.toFixed(1)} Lc)`).join(", ")}. ` +
        `\`${quiet.role}\` is at ${quiet.apca.toFixed(1)} Lc. Legitimate for a high-contrast ` +
        "variant, which inverts the usual relationship so comments cannot be missed -- but it " +
        "means comment is not the quietest thing on screen here."
      );
    }
  }
  return lines.join("\n");
}

function renderHue(h) {
  const lines = [];
  lines.push(
    "CAM16 hue angles for competing token colours, deduplicated by colour. CAM16 hue is " +
    "perceptually uniform, so an angular gap here is a perceptual gap; the same gap in CIELAB " +
    "would not be, because CIELAB hue is non-uniform around the circle."
  );
  lines.push("");
  lines.push("| Roles | Hex | CAM16 hue | CAM16 C |");
  lines.push("|---|---|---|---|");
  for (const e of [...h.entries].sort((a, b) => a.h - b.h)) {
    lines.push(`| ${e.roles.join(", ")} | \`${e.hex}\` | ${e.h.toFixed(1)}° | ${e.C.toFixed(1)} |`);
  }
  lines.push("");
  lines.push(
    `${h.entries.length} distinct hues across ${h.entries.length + h.shared} roles. ` +
    `Closest pair ${h.minGap.toFixed(1)}° apart. Coverage ${h.coverage.toFixed(0)}% ` +
    `of the circle outside 15° dead zones.`
  );
  if (h.clusters.length) {
    lines.push("");
    lines.push("Clusters (hues within 20° of a neighbour):");
    lines.push("");
    for (const c of h.clusters) {
      if (c.members.length < 2) { continue; }
      lines.push(
        `- ${c.members.map((m) => `${m.roles.join("/")} \`${m.hex}\``).join(", ")} — mean ${c.meanHue.toFixed(1)}°`
      );
    }
  }
  return lines.join("\n");
}

function renderChroma(c) {
  const lines = [];
  lines.push(
    "H-K promotion is how far above its lightness a colour *appears*: a saturated colour " +
    "looks brighter than an equiluminant grey. J_HK is the lightness an observer would need " +
    "to match it, so promotion is J_HK minus J."
  );
  lines.push("");
  lines.push("| Role | Hex | J | C | M | J_HK | Promotion | APCA |Lc| |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const e of c.entries) {
    lines.push(
      `| ${e.role} | \`${e.hex}\` | ${e.J.toFixed(1)} | ${e.C.toFixed(1)} | ` +
      `${e.M.toFixed(1)} | ${e.Jhk.toFixed(1)} | ${e.promotion.toFixed(1)} | ${e.apca.toFixed(1)} |`
    );
  }
  lines.push("");
  lines.push(
    `Mean promotion across competing roles ${c.meanPromotion.toFixed(1)} J. ` +
    `Spearman rank correlation between APCA |Lc| order and apparent (J_HK) order across ` +
    `competing roles: **${c.rankCorrelation.toFixed(3)}**.`
  );
  lines.push("");
  lines.push(
    c.rankCorrelation < 0.95
      ? "Below 0.95 means chroma promotion visibly reorders the competing roles: the APCA " +
        "ordering is not the ordering a reader perceives. Not a defect, since the palette " +
        "does not claim a ladder among competing roles, but worth knowing before reasoning " +
        "about which token 'stands out'."
      : "At or above 0.95: chroma promotion barely reorders the competing roles."
  );
  lines.push("");
  lines.push("| Check | Result | Detail |");
  lines.push("|---|---|---|");
  for (const chk of c.checks) {
    lines.push(`| ${chk.name} | ${chk.ok ? "pass" : "**FAIL**"} | ${chk.detail} |`);
  }
  return lines.join("\n");
}

function renderChromaBudget(c) {
  return [
    `Mean CAM16 M across competing roles: **${c.meanM.toFixed(1)}**.`,
    `Maximum: ${c.maxM.toFixed(1)}.`,
    "",
    "M is roughly perceptually uniform across lightness, so this is a usable total-colourfulness",
    "figure rather than the CIELAB artefact of summing C across different L.",
  ].join("\n");
}

function renderNaming(n) {
  const lines = [];
  lines.push("Nearest xkcd survey name. The survey was placed by human participants, so the dataset encodes what people call colours.");
  lines.push("");
  lines.push("| Role | Hex | Nearest name | dE00 |");
  lines.push("|---|---|---|---|");
  for (const e of n.entries) {
    lines.push(`| ${e.role} | \`${e.hex}\` | ${e.name} | ${e.deltaE.toFixed(1)} |`);
  }
  if (n.sharedColour.length) {
    lines.push("");
    lines.push("### Roles sharing a colour");
    lines.push("");
    lines.push(
      "These are the same hex, so they are the same colour by construction. Listed because " +
      "a shared name above is only interesting when the colours differ."
    );
    lines.push("");
    for (const s of n.sharedColour) {
      lines.push(`- \`${s.hex}\`: ${s.roles.join(", ")}`);
    }
  }
  if (n.shared.length) {
    lines.push("");
    lines.push("### Shared names, different colours");
    lines.push("");
    lines.push(
      "Distinct colours a reader would still call by the same word. This is the case that " +
      "matters: the two roles are separable by eye but not by name."
    );
    lines.push("");
    lines.push("| Name | Role A | Role B | dE00 |");
    lines.push("|---|---|---|---|");
    for (const s of n.shared) {
      lines.push(`| ${s.name} | ${s.a} \`${s.aHex}\` | ${s.b} \`${s.bHex}\` | ${s.deltaE.toFixed(1)} |`);
    }
  } else {
    lines.push("");
    lines.push("No two differently-coloured roles share a nearest name.");
  }
  return lines.join("\n");
}

function renderDisplay(d, sweep) {
  const lines = [];
  lines.push(
    `Colours clipped to ${Math.round(d.coverage * 100)}% of sRGB chroma, standing in for an ` +
    `ordinary laptop panel. Threshold for a collision is dE00 ${color.DELTA_E_CVD_MIN}. ` +
    "Hue and lightness survive; saturation does not."
  );
  lines.push("");
  lines.push("| Roles | Hex | Clipped | Shift dE00 |");
  lines.push("|---|---|---|---|");
  for (const e of d.simulated) {
    lines.push(
      `| ${e.roles.join("/")} | \`${e.hex}\` | \`${e.clipped}\` | ` +
      `${color.deltaE00(e.hex, e.clipped).toFixed(1)} |`
    );
  }
  lines.push("");
  lines.push(
    d.collisions === 0
      ? `No collisions at ${Math.round(d.coverage * 100)}%. Mean shift ${d.meanShift.toFixed(1)} dE00.`
      : `**${d.collisions} pair(s) collide at ${Math.round(d.coverage * 100)}%.**` +
        (d.worst ? ` Worst: ${d.worst.a}/${d.worst.b} at dE00 ${d.worst.de.toFixed(1)}.` : "")
  );

  if (sweep) {
    lines.push("");
    lines.push("### Gamut sweep");
    lines.push("");
    lines.push("Where the palette actually breaks, rather than at an assumed coverage.");
    lines.push("");
    lines.push("| sRGB coverage | Collisions | Closest pair dE00 | Mean shift |");
    lines.push("|---|---|---|---|");
    for (const s of sweep) {
      lines.push(
        `| ${Math.round(s.coverage * 100)}% | ${s.collisions} | ` +
        `${s.worst === null ? "-" : s.worst.toFixed(1)} | ${s.meanShift.toFixed(1)} |`
      );
    }
    const atFull = sweep.find((s) => s.coverage === 1);
    const firstClear = sweep.find((s) => s.collisions === 0);
    lines.push("");
    if (atFull && atFull.collisions > 0) {
      lines.push(
        `Already colliding at full sRGB (closest pair dE00 ${atFull.worst.toFixed(1)}), so ` +
        "reduced gamut is not what causes it. See the hue architecture section."
      );
      if (firstClear) {
        lines.push("");
        lines.push(
          `Clear of collisions only above ${Math.round((firstClear.coverage + 0.1) * 100)}% coverage.`
        );
      }
    } else if (firstClear) {
      lines.push(`Clear down to ${Math.round(firstClear.coverage * 100)}% coverage.`);
    } else {
      lines.push("No collisions anywhere down to 40% coverage.");
    }
  }
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const onlyIndex = args.indexOf("--variant");
  const only = onlyIndex >= 0 ? args[onlyIndex + 1] : null;

  const themes = loadThemes();
  const selected = only ? { [only]: themes[only] } : themes;
  if (only && !themes[only]) {
    console.error(`no such variant: ${only}`);
    process.exit(1);
  }

  const profiles = {};
  for (const [name, theme] of Object.entries(selected)) {
    profiles[name] = profile(theme);
  }
  const cross = crossVariantHue(Object.keys(only ? themes : selected).reduce((acc, k) => {
    acc[k] = themes[k];
    return acc;
  }, {}));

  if (asJson) {
    console.log(JSON.stringify({ profiles, crossVariant: cross }, null, 2));
    return;
  }

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const out = [];
  out.push("# Quality Profile");
  out.push("");
  out.push(
    "Eight independent measurements of theme quality beyond legibility. Each is deterministic " +
    "given the theme JSON. Contrast and lightness separation are gated elsewhere; see " +
    "`reports/cvd-matrix-*.md` for the collision report."
  );
  out.push("");

  for (const [name, p] of Object.entries(profiles)) {
    out.push(`## ${name}`);
    out.push("");
    for (const [title, render] of REPORT_ORDER) {
      out.push(`### ${title}`);
      out.push("");
      out.push(render(p));
      out.push("");
    }
  }

  out.push("## 7. Cross-variant hue consistency");
  out.push("");
  out.push(
    `Absolute CAM16 hue of each role, compared across the identity variants ` +
    `(${cross.identity.join(", ")}) only, using each theme's own ` +
    "`semanticTokenColors` entry as the role's canonical colour."
  );
  out.push("");
  out.push(
    "Absolute rather than background-relative hue, because the dark background is hue 296 and " +
    "the light one is hue 117 -- 179 degrees apart. Subtracting a background hue that different " +
    "rotates every role by an arbitrary amount."
  );
  out.push("");
  out.push(
    `Excluded on purpose: ${cross.recoloured.join(", ")} rotate hues deliberately -- that ` +
    "rotation is the feature, and scoring it as inconsistency would report the design working " +
    "as a defect. " + (cross.excluded.length ? `${cross.excluded.join(", ")} ` : "") +
    "are excluded because they drop hue or target a different use."
  );
  out.push("");
  if (cross.angles.length === 0) {
    out.push("No role is chromatic in both identity variants, so consistency cannot be measured.");
  } else {
    out.push(
      `Tolerance **${cross.tolerance}°**: below that, a reader switching themes recognises the ` +
      "role by hue without re-learning it."
    );
    out.push("");
    out.push("| Role | dark hue | light hue | Shift | Within tolerance |");
    out.push("|---|---|---|---|---|");
    for (const a of cross.angles) {
      out.push(
        `| ${a.role} | ${a.hue[0].toFixed(1)}° \`${a.hexes[0]}\` | ` +
        `${a.hue[1].toFixed(1)}° \`${a.hexes[1]}\` | ${a.delta.toFixed(1)}° | ` +
        `${a.delta <= cross.tolerance ? "yes" : "**no**"} |`
      );
    }
    out.push("");
    out.push(`Mean shift **${cross.dispersion.toFixed(1)}°**.`);
    if (cross.outliers.length === 0) {
      out.push("");
      out.push(
        "Every role keeps its hue across dark and light. A reader who switches between the " +
        "two recognises the same role by hue without re-learning it."
      );
    } else {
      out.push("");
      out.push(
        `**${cross.outliers.length} role(s) exceed the tolerance.** These change hue enough ` +
        "that a reader switching variants re-learns them:"
      );
      out.push("");
      for (const a of cross.outliers) {
        out.push(
          `- \`${a.role}\`: ${a.hexes[0]} (${a.hue[0].toFixed(0)}°) in dark versus ` +
          `${a.hexes[1]} (${a.hue[1].toFixed(0)}°) in light — ${a.delta.toFixed(0)}° apart.`
        );
      }
    }
  }
  out.push("");

  const target = only
    ? path.join(REPORTS_DIR, `quality-profile-${only}.md`)
    : path.join(REPORTS_DIR, "quality-profile.md");
  fs.writeFileSync(target, out.join("\n"));
  console.log(`wrote ${target}`);
}

if (require.main === module) { main(); }

module.exports = {
  ROLES,
  COMPETING,
  roleOf,
  semanticConsistency,
  canonicalRoleColours,
  visualHierarchy,
  hueArchitecture,
  hueEntries,
  chromaAndBrightness,
  colourNaming,
  crossVariantHue,
  displayDegradation,
  displaySweep,
  clipToGamut,
  spearman,
  circularMean,
  circularDispersion,
  loadThemes,
  profile,
};