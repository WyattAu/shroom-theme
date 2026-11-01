#!/usr/bin/env node

"use strict";

/**
 * Derive theme variants from parameter transforms.
 *
 * The seven shipped themes were hand-tuned, which is why extending the family
 * used to be expensive. The repair pipeline and the gated invariants changed
 * that: a derived theme that breaks a rule fails a gate, so derivation is safe
 * to iterate. The model is derive -> repair -> gates -> hand-tune -> gates, and
 * craft lives at the hand-tune step.
 *
 * Two kinds of extension, with different gates:
 *
 * - **Variants** claim to be the same palette seen differently. Muted, vivid,
 *   dim, soft and minimal keep the dark theme's lightness ladder and hue
 *   relationships and move one axis each.
 * - **Siblings** are different palettes in the same house style. Ember and
 *   Night have their own syntax hues; what they share with the family is the
 *   hierarchy shape and the chroma budget, not the colours.
 *
 * Transforms hold CIELAB lightness unless they are explicitly a lightness
 * transform, because WCAG and APCA are both functions of luminance: scaling
 * chroma at fixed L* leaves every contrast number untouched, which keeps the
 * gated invariants true by construction rather than by luck.
 *
 * Usage: node tools/derive-theme.js [--only <slug>] [--dry-run]
 */

const fs = require("fs");
const path = require("path");
const color = require("../color-science.js");
const { labToHex, gamutFit } = require("./repair-isoluminance.js");

const THEMES_DIR = path.resolve(__dirname, "..", "themes");

/** L* below this is a surface (background, panel, border) rather than content. */
const SURFACE_L_STAR = 35;

/**
 * The role collapse for the minimal variants.
 *
 * Minimal is not "fewer tokens" -- every one of the 1049 tokens is still
 * present and still passes the audit. It is fewer *colours*: five roles carry
 * the syntax layer and the rest resolve onto them.
 *
 * Kept: comment (recedes), invalid (error red), string (green), and one accent.
 * Collapsed onto the accent: keyword, type, constant, notice. Collapsed onto
 * plain text: function, variable, substrate. Anything not listed keeps its own
 * colour, so a scope the map does not name is never silently dropped.
 */
const MINIMAL_COLLAPSE = {
  notice: "accent",
  constant: "accent",
  type: "accent",
  keyword: "accent",
  function: "substrate",
  variable: "substrate",
};

// ---------------------------------------------------------------- helpers --

/** CIELAB LCh of a hex. */
function lch(hex) {
  return color.rgbToLch(color.parseHex(hex));
}

/** Convert LCh to hex, clamping chroma into the gamut. */
function toHex(L, C, hRad) {
  return labToHex(L, C, hRad);
}

/**
 * Scale chroma by `factor`, holding L* and hue, clamped to the gamut.
 *
 * Fixed L* means fixed luminance, which means WCAG and APCA are unchanged --
 * this transform moves the chroma axis and nothing else.
 *
 * @param {string} hex
 * @param {number} factor
 * @returns {string}
 */
function scaleChroma(hex, factor) {
  const { L, C, h } = lch(hex);
  if (C === 0) { return hex.toUpperCase(); }
  const hRad = (h * Math.PI) / 180;
  return toHex(L, gamutFit(L, C * factor, hRad), hRad);
}

/**
 * Compress L* toward the background by `factor`, holding hue, re-fitting
 * chroma to the gamut at the new lightness.
 *
 * This is the one transform that moves contrast, so it is the one that can
 * break a gate. The repair pipeline lifts anything that ends up sub-AA, and
 * the palette audit proves it.
 *
 * @param {string} hex
 * @param {string} bgHex
 * @param {number} factor
 * @param {number} [chromaFactor=1]
 * @returns {string}
 */
function compressToward(hex, bgHex, factor, chromaFactor = 1) {
  const c = lch(hex);
  const bg = lch(bgHex);
  const L = bg.L + (c.L - bg.L) * factor;
  const hRad = (c.h * Math.PI) / 180;
  const chroma = chromaFactor === 1 ? c.C : c.C * chromaFactor;
  return toHex(L, gamutFit(L, chroma, hRad), hRad);
}

/**
 * Strip italics from a theme.
 *
 * `markup.italic` is kept: italic there is *content* -- markdown emphasis
 * saying "this text is italic" -- not styling. Stripping it would change what
 * the document says rather than how the theme renders it.
 *
 * @param {object} theme
 * @returns {number} number of rules changed
 */
function stripItalics(theme) {
  let changed = 0;
  const isContentItalic = (scopes) => {
    const list = Array.isArray(scopes) ? scopes : [scopes];
    return list.some((s) => typeof s === "string" && s.startsWith("markup.italic"));
  };
  for (const entry of theme.tokenColors ?? []) {
    const style = String(entry.settings?.fontStyle ?? "");
    if (!style.includes("italic")) { continue; }
    if (isContentItalic(entry.scope)) { continue; }
    const rest = style
      .split(/\s+/)
      .filter((w) => w && w !== "italic")
      .join(" ");
    if (rest) { entry.settings.fontStyle = rest; }
    else { delete entry.settings.fontStyle; }
    changed++;
  }
  for (const rule of Object.values(theme.semanticTokenColors ?? {})) {
    if (typeof rule !== "object" || rule === null) { continue; }
    const style = String(rule.fontStyle ?? "");
    if (!style.includes("italic")) { continue; }
    const rest = style.split(/\s+/).filter((w) => w && w !== "italic").join(" ");
    if (rest) { rule.fontStyle = rest; }
    else { delete rule.fontStyle; }
    changed++;
  }
  return changed;
}

/**
 * Collapse syntax roles onto fewer colours for the minimal variants.
 *
 * The accent and substrate targets come from the base theme's own canonical
 * roles, not from constants. Hardcoding the dark theme's purple was a real
 * bug: the light minimal variant inherited a 2.05:1 accent and the repair
 * pipeline had to rescue it. Each family's accent is whatever that family
 * already uses for keyword, so the collapse is onto the family's own colours.
 *
 * @param {object} theme
 * @param {(scope:string)=>string|null} roleOf
 * @param {string} accentHex the base theme's keyword colour
 * @param {string} substrateHex the base theme's substrate colour
 * @returns {{accent:number, substrate:number}}
 */
function collapseRoles(theme, roleOf, accentHex, substrateHex) {
  let accent = 0;
  let substrate = 0;
  for (const entry of theme.tokenColors ?? []) {
    const scopes = Array.isArray(entry.scope) ? entry.scope : [entry.scope];
    const roles = scopes.map((s) => roleOf(s)).filter(Boolean);
    if (roles.length === 0) { continue; }
    // A rule wins only if every scope it names agrees, so a mixed rule such as
    // ["variable", "keyword.other"] is left alone rather than half-collapsed.
    const unique = [...new Set(roles)];
    if (unique.length !== 1) { continue; }
    const target = MINIMAL_COLLAPSE[unique[0]];
    if (target === "accent") { entry.settings.foreground = accentHex; accent++; }
    else if (target === "substrate") { entry.settings.foreground = substrateHex; substrate++; }
  }
  for (const [selector, rule] of Object.entries(theme.semanticTokenColors ?? {})) {
    if (typeof rule !== "object" || rule === null) { continue; }
    const target = MINIMAL_COLLAPSE[selector];
    if (target === "accent") { rule.foreground = accentHex; accent++; }
    else if (target === "substrate") { rule.foreground = substrateHex; substrate++; }
  }
  return { accent, substrate };
}

/**
 * Darken and de-saturate the surface colours for the dim variants.
 *
 * Surfaces are everything with L* below the threshold: the editor background,
 * the panels, the borders, the selection. Shifting them together keeps their
 * relationships, which is what stops a dim theme from becoming a patchwork.
 * Content lightness is handled separately by the syntax transform.
 *
 * @param {object} colors
 * @param {number} bgFromL
 * @param {number} bgToL
 * @param {number} chromaFactor
 * @returns {number}
 */
function dimSurfaces(colors, bgFromL, bgToL, chromaFactor) {
  const deltaL = bgFromL - bgToL;
  let n = 0;
  for (const [key, value] of Object.entries(colors)) {
    if (typeof value !== "string" || !/^#[0-9A-Fa-f]{6,8}$/.test(value)) { continue; }
    const c = lch(value.slice(0, 7));
    if (c.L >= SURFACE_L_STAR) { continue; }
    const hRad = (c.h * Math.PI) / 180;
    colors[key] = toHex(Math.max(2, c.L - deltaL), gamutFit(Math.max(2, c.L - deltaL), c.C * chromaFactor, hRad), hRad);
    n++;
  }
  return n;
}

/** Map over every syntax foreground. */
function mapSyntax(theme, fn) {
  for (const entry of theme.tokenColors ?? []) {
    const fg = entry.settings?.foreground;
    if (typeof fg === "string" && /^#[0-9A-Fa-f]{6,8}$/.test(fg)) {
      entry.settings.foreground = fn(fg.slice(0, 7), entry);
    }
  }
  for (const [selector, rule] of Object.entries(theme.semanticTokenColors ?? {})) {
    if (typeof rule !== "object" || rule === null) { continue; }
    const fg = rule.foreground;
    if (typeof fg === "string" && /^#[0-9A-Fa-f]{6,8}$/.test(fg)) {
      rule.foreground = fn(fg.slice(0, 7), { semantic: selector, ...rule });
    }
  }
}

/** TextMate scopes and semantic selectors that mark a rule as de-emphasis. */
const COMMENT_SCOPES = /^(comment|punctuation\.definition\.comment)/;

/**
 * Is this syntax rule de-emphasis -- a comment -- rather than a competing role?
 *
 * The transforms that narrow the prominence band must not touch comments: they
 * are not part of the band, and compressing them only pushes them under the
 * 3:1 de-emphasis floor.
 *
 * @param {object} entry a tokenColors entry, or a semantic rule with the
 *   selector attached as `semantic`
 * @returns {boolean}
 */
function isDeEmphasis(entry) {
  if (!entry) { return false; }
  if (typeof entry.semantic === "string") {
    return entry.semantic === "comment" || entry.semantic === "*.documentation";
  }
  const scopes = Array.isArray(entry.scope) ? entry.scope : [entry.scope];
  return scopes.some((s) => typeof s === "string" && COMMENT_SCOPES.test(s));
}

/** Mean CAM16 M across the theme's competing roles, via the quality profile. */
function meanChroma(theme) {
  const q = require("./quality-profile.js");
  const { entries } = q.chromaAndBrightness(theme);
  const competing = entries.filter((e) => e.competing);
  return competing.length ? competing.reduce((s, e) => s + e.M, 0) / competing.length : 0;
}

// ------------------------------------------------------------- transforms --

const TRANSFORMS = {
  /**
   * Chroma toward the muted target. Uniform scale keeps the hierarchy: every
   * role moves the same proportion, so the ordering and the gaps survive.
   */
  muted(theme) {
    const before = meanChroma(theme);
    mapSyntax(theme, (hex) => scaleChroma(hex, 0.62));
    // UI accents follow so the chrome does not out-shout the syntax.
    for (const key of ["activityBarBadge.background", "statusBar.debuggingBackground", "progressBar.background"]) {
      const v = theme.colors[key];
      if (typeof v === "string" && /^#[0-9A-Fa-f]{6}/.test(v)) {
        theme.colors[key] = scaleChroma(v.slice(0, 7), 0.62);
      }
    }
    return `mean M ${before.toFixed(1)} -> ${meanChroma(theme).toFixed(1)}`;
  },

  /**
   * Chroma up, capped by the gamut per colour. The cap is the honest part: the
   * loud colours are already near the boundary (#FFCB6B at 92%), so a vivid
   * variant lifts the quiet colours much more than the loud ones. That is
   * compression, and it is why vivid cannot be a uniform scale.
   */
  vivid(theme) {
    const before = meanChroma(theme);
    mapSyntax(theme, (hex) => scaleChroma(hex, 1.3));
    return `mean M ${before.toFixed(1)} -> ${meanChroma(theme).toFixed(1)} (gamut-capped)`;
  },

  /**
   * Night polarity. Darker surfaces, calmer syntax: chroma down, lightness
   * pulled slightly toward the background. Contrast stays inside AA by
   * construction -- the repair pipeline lifts anything that is not.
   */
  dim(theme) {
    const bg = lch(theme.colors["editor.background"]);
    const q = require("./quality-profile.js");
    mapSyntax(theme, (hex, entry) => {
      if (isDeEmphasis(entry)) { return hex; }
      let base = hex;
      // Keyword keeps its separation from variable under reduced gamut. Dim
      // compresses chroma, and the keyword/variable pair is separated by
      // chroma more than lightness -- at 70% gamut they measured 9.2 dE00,
      // under the 10 threshold. -12 degrees of hue restores 13.9 at equal
      // APCA, the same instrument the base palette used when it rotated
      // variable +54 for the CVD variants.
      const scopes = Array.isArray(entry.scope) ? entry.scope : [entry.scope];
      if (scopes.some((s) => typeof s === "string" && q.roleOf(s) === "keyword")) {
        const c = lch(hex);
        base = toHex(c.L, c.C, ((c.h - 12) * Math.PI) / 180);
      }
      return compressToward(base, theme.colors["editor.background"], 0.92, 0.8);
    });
    const n = dimSurfaces(theme.colors, bg.L, 8, 0.8);
    return `${n} surfaces dimmed, competing chroma x0.8, L compressed x0.92, keyword hue -12 (de-emphasis untouched)`;
  },

  /**
   * Narrow the prominence band by pulling syntax lightness toward the
   * background.
   *
   * De-emphasis is excluded. Comment is not part of the competing band, so
   * compressing it does not narrow the band -- it just pushes the comment below
   * the 3:1 de-emphasis floor, which the first run proved at 1.83:1.
   *
   * The factor is found by search, not hardcoded. The APCA legibility floor of
   * 30 binds: at 0.55 the dark theme's invalid landed at 19.8 Lc, which is the
   * floor working as designed rather than a bug. So the transform takes the
   * strongest compression that keeps every competing role at or above the
   * floor -- "as soft as legality allows" is the definition, and it differs
   * per family, which is why it is measured rather than assumed.
   */
  soft(theme) {
    const bg = theme.colors["editor.background"];
    const q = require("./quality-profile.js");
    const FLOOR = 30;

    // Record every original foreground with how to write it back, so each
    // trial factor applies from the same starting point. Applying successive
    // compressions on top of each other compounds, and compounding is how a
    // "rotation" drifts -- the same lesson as the pink-to-salmon bug.
    const targets = [];
    for (const entry of theme.tokenColors ?? []) {
      const fg = entry.settings?.foreground;
      if (typeof fg === "string" && /^#[0-9A-Fa-f]{6,8}$/.test(fg)) {
        targets.push({ obj: entry.settings, original: fg, entry });
      }
    }
    for (const [selector, rule] of Object.entries(theme.semanticTokenColors ?? {})) {
      if (typeof rule !== "object" || rule === null) { continue; }
      const fg = rule.foreground;
      if (typeof fg === "string" && /^#[0-9A-Fa-f]{6,8}$/.test(fg)) {
        // The selector travels with the rule: the de-emphasis exemption keys
        // off it. The first run hardcoded this tag, which silently compressed
        // the comment colour to 2.13:1 on light.
        targets.push({ obj: rule, original: fg, entry: { semantic: selector, ...rule } });
      }
    }

    const apply = (f) => {
      for (const t of targets) {
        if (t.quiet) { continue; }
        t.obj.foreground = compressToward(t.original.slice(0, 7), bg, f, 0.85);
      }
    };
    const restore = () => {
      for (const t of targets) { t.obj.foreground = t.original; }
    };

    // Two floors bind, and both are measured per trial:
    //
    // - Every non-quiet token keeps WCAG AA. Compression moves L*, and the
    //   first factor that satisfied the APCA floor put soft's keyword at
    //   4.33:1 -- below AA, which the audit's pair list does not gate but the
    //   licence does.
    // - Every competing role keeps APCA >= 30.
    //
    // The quiet layer is skipped outright. Punctuation, markup quotes and
    // deprecated markers sit at 3.20:1 in the shipped dark theme -- already
    // below AA, deliberately, as part of the de-emphasis layer. They are not
    // part of the competing band, so compressing them does not narrow it; it
    // only erodes what legibility they have. Skipping anything whose base WCAG
    // is below 4.5 generalises the old hardcoded exempt list, which named the
    // two original muted hexes and would have flagged every new family's.
    for (const t of targets) {
      t.quiet = isDeEmphasis(t.entry) ||
        color.wcag21(t.original.slice(0, 7), bg) < 4.5;
    }

    const competingMin = () => {
      const canonical = q.canonicalRoleColours(theme);
      const values = [];
      for (const role of q.ROLES) {
        if (!q.COMPETING.has(role.name)) { continue; }
        const e = canonical.get(role.name);
        if (e) { values.push(color.apcaAbs(e.hex, bg)); }
      }
      return values.length ? Math.min(...values) : Infinity;
    };

    // AA is part of the acceptance, not a post-check. Compression moves L*, and
    // the first factor that satisfied the APCA floor put soft's keyword at
    // 4.33:1 -- below AA, which the audit's pair list does not gate but the
    // licence does. Both floors must hold at the chosen factor.
    const aaMin = () => {
      let worst = Infinity;
      for (const t of targets) {
        if (t.quiet) { continue; }
        worst = Math.min(worst, color.wcag21(String(t.obj.foreground).slice(0, 7), bg));
      }
      return worst;
    };

    let chosen = null;
    let min = Infinity;
    for (let f = 0.55; f <= 0.951; f += 0.05) {
      apply(f);
      min = competingMin();
      if (min >= FLOOR && aaMin() >= 4.5) { chosen = f; break; }
    }
    if (chosen === null) {
      restore();
      return "no compression satisfies the legibility floor; left unchanged";
    }
    return (
      `competing L compressed x${chosen.toFixed(2)} toward bg ` +
      `(floor-limited, min ${min.toFixed(1)} Lc), chroma x0.85 ` +
      "(de-emphasis untouched)"
    );
  },

  /** Collapse to five colours, onto this family's own accent and text. */
  minimal(theme, base) {
    const q = require("./quality-profile.js");
    const canonical = q.canonicalRoleColours(base);
    const accent = (canonical.get("keyword") ?? canonical.get("substrate")).hex;
    const substrate = (canonical.get("substrate") ?? canonical.get("keyword")).hex;
    const { accent: a, substrate: s } = collapseRoles(theme, q.roleOf, accent, substrate);
    return `accent ${a} rules, substrate ${s} rules (accent ${accent}), 5 colours remain`;
  },


  /** Remove italics except where italic is content. */
  "no-italics"(theme) {
    return `${stripItalics(theme)} italic declarations removed`;
  },
};

// ---------------------------------------------------------------- siblings --

/**
 * Ember: the warm sibling.
 *
 * Hand-authored syntax hues over the dark theme's lightness ladder and chroma
 * budget. Error stays red and string stays green -- those conventions carry
 * meaning a rotation would destroy -- so this is not a hue rotation of the
 * dark palette but a re-anchoring of each role to a warm neighbour at the same
 * prominence.
 */
const EMBER_DARK = {
  "editor.background": "#241D16",
  palette: {
    comment: "#8A7F72",
    invalid: "#E0654F",
    constant: "#E5A53C",
    string: "#A3A857",
    variable: "#D98A66",
    type: "#C9AE5E",
    function: "#83A37F",
    keyword: "#D27DA8",
  },
};

const EMBER_LIGHT = {
  "editor.background": "#F4EEE4",
  // Lightness ladder is the constraint on a light theme: AA caps text at
  // L* <= ~45 on this background, comment may sit at ~51 (3:1 de-emphasis),
  // and the isoluminance gate needs >= 2 APCA between every competing pair.
  // The first hand-pick put seven colours inside a 4-point L* window, which no
  // spacing satisfies; this one spans the window and measures clean.
  palette: {
    comment: "#86776C",
    constant: "#8F5F1E",
    invalid: "#A14647",
    variable: "#97433E",
    keyword: "#8E395E",
    type: "#794324",
    string: "#4E4F18",
    function: "#2B4D2F",
  },
};

/**
 * Night: the short-wavelength-minimised sibling.
 *
 * The honest framing is in the docs: this minimises CIE Z, which is the
 * standard short-wavelength tristimulus indicator, subject to the roles staying
 * distinguishable. Z is not melanopic lux -- claiming that would need the
 * display's spectral power distribution, which no theme author has. What the
 * metric supports is the ranking claim: this palette has less short-wavelength
 * content than the one it replaces, at equal contrast.
 *
 * The cost is real and shows in the hue architecture metric: with blues and
 * violets gone, the remaining hues cluster, so function carries a desaturated
 * teal as the one concession and differentiation leans more on lightness.
 */
const NIGHT = {
  "editor.background": "#1B1713",
  palette: {
    comment: "#7E7365",
    invalid: "#D9604B",
    constant: "#DFA23A",
    string: "#97A054",
    variable: "#D28B66",
    type: "#C0A64F",
    function: "#83A695",
    keyword: "#B8736B",
  },
};

/**
 * Apply a sibling palette: swap the syntax colours, then re-hue the UI
 * surfaces toward the new background so the chrome does not stay cool while
 * the syntax went warm.
 *
 * @param {object} base the theme to start from
 * @param {object} spec EMBER_DARK | EMBER_LIGHT | NIGHT
 */
function applySibling(base, spec) {
  const theme = JSON.parse(JSON.stringify(base));
  const pal = spec.palette;

  // Invert the role palette so a scope -> colour lookup is direct.
  const byRole = {};
  for (const [role, hex] of Object.entries(pal)) { byRole[role] = hex; }
  // notice and substrate are not in the sibling palette; they follow constant
  // and the default text, matching how the standard palette uses them.
  byRole.notice = pal.constant;
  byRole.substrate = base.colors["editor.foreground"];

  theme.colors["editor.background"] = spec["editor.background"];

  const bgOld = lch(base.colors["editor.background"]);
  const bgNew = lch(spec["editor.background"]);
  const deltaH = bgNew.h - bgOld.h;

  // TextMate rules: classify by scope and swap.
  //
  // The default matters. A scope resolving to no role used to keep its colour
  // from the base theme, which leaked the cool space palette into a warm
  // sibling and produced isoluminance failures between the two sets. Opaque
  // rules with no role are plain text and become substrate; rules carrying
  // alpha are translucency variants and are left alone.
  for (const entry of theme.tokenColors ?? []) {
    const fg = String(entry.settings?.foreground ?? "");
    if (!/^#[0-9A-Fa-f]{6}($|[0-9A-Fa-f]{2}$)/.test(fg)) { continue; }
    const opaque = /^#[0-9A-Fa-f]{6}$/.test(fg);
    const scopes = Array.isArray(entry.scope) ? entry.scope : [entry.scope];
    let role = null;
    for (const s of scopes) {
      const r = ROLE_LOOKUP(s);
      if (r) { role = r; break; }
    }
    if (role && byRole[role]) {
      entry.settings.foreground = byRole[role];
    } else if (!role && opaque) {
      entry.settings.foreground = byRole.substrate;
    }
  }
  // Semantic selectors are role names by construction. One that resolves to no
  // role is plain text.
  for (const [selector, rule] of Object.entries(theme.semanticTokenColors ?? {})) {
    if (typeof rule !== "object" || rule === null) { continue; }
    const role = selector === "*.documentation" ? "comment" : selector;
    rule.foreground = byRole[role] ?? byRole.substrate;
  }

  // Re-hue surfaces toward the new background, holding L* and C*.
  for (const [key, value] of Object.entries(theme.colors)) {
    if (typeof value !== "string" || !/^#[0-9A-Fa-f]{6,8}$/.test(value)) { continue; }
    const c = lch(value.slice(0, 7));
    if (c.C < 1 || c.L >= SURFACE_L_STAR) { continue; }
    const hRad = (((c.h + deltaH) % 360) * Math.PI) / 180;
    theme.colors[key] = toHex(c.L, gamutFit(c.L, c.C, hRad), hRad);
  }

  return theme;
}

/** Scope -> role, using the quality profile's taxonomy. */
function ROLE_LOOKUP(scope) {
  const q = require("./quality-profile.js");
  return q.roleOf(scope);
}

// -------------------------------------------------------------- definitions --

/**
 * Every derivation, in output order.
 *
 * `light` matters: validate-themes keys off the label containing "Light" and
 * the theme JSON's type field must agree, or the wrong contrast policy is
 * applied.
 */
const DERIVATIONS = [
  { from: "shroom-space-theme.json", out: "shroom-space-muted-theme.json", label: "Shroom Space Muted", type: "dark", transform: "muted" },
  { from: "shroom-space-theme.json", out: "shroom-space-vivid-theme.json", label: "Shroom Space Vivid", type: "dark", transform: "vivid" },
  { from: "shroom-space-theme.json", out: "shroom-space-dim-theme.json", label: "Shroom Space Dim", type: "dark", transform: "dim" },
  { from: "shroom-space-theme.json", out: "shroom-space-soft-theme.json", label: "Shroom Space Soft", type: "dark", transform: "soft" },
  { from: "shroom-space-theme.json", out: "shroom-space-minimal-theme.json", label: "Shroom Space Minimal", type: "dark", transform: "minimal" },
  { from: "shroom-space-theme.json", out: "shroom-space-no-italics-theme.json", label: "Shroom Space (No Italics)", type: "dark", transform: "no-italics" },
  { from: "shroom-space-light-theme.json", out: "shroom-space-light-muted-theme.json", label: "Shroom Space Light Muted", type: "light", transform: "muted" },
  { from: "shroom-space-light-theme.json", out: "shroom-space-light-soft-theme.json", label: "Shroom Space Light Soft", type: "light", transform: "soft" },
  { from: "shroom-space-light-theme.json", out: "shroom-space-light-minimal-theme.json", label: "Shroom Space Light Minimal", type: "light", transform: "minimal" },
  { from: "shroom-space-light-theme.json", out: "shroom-space-light-no-italics-theme.json", label: "Shroom Space Light (No Italics)", type: "light", transform: "no-italics" },
];

const SIBLINGS = [
  { from: "shroom-space-theme.json", out: "shroom-ember-theme.json", label: "Shroom Ember", type: "dark", spec: EMBER_DARK },
  { from: "shroom-space-light-theme.json", out: "shroom-ember-light-theme.json", label: "Shroom Ember Light", type: "light", spec: EMBER_LIGHT },
  { from: "shroom-space-theme.json", out: "shroom-night-theme.json", label: "Shroom Night", type: "dark", spec: NIGHT },
];

// -------------------------------------------------------------------- main --

function derive(config) {
  const base = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, config.from), "utf8"));
  const theme = JSON.parse(JSON.stringify(base));
  const note = TRANSFORMS[config.transform](theme, base);
  theme.name = config.label;
  theme.type = config.type;
  return { theme, note };
}

function deriveSibling(config) {
  const base = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, config.from), "utf8"));
  const theme = applySibling(base, config.spec);
  theme.name = config.label;
  theme.type = config.type;
  return { theme, note: `sibling palette, bg ${config.spec["editor.background"]}` };
}

function main() {
  const args = process.argv.slice(2);
  const onlyIndex = args.indexOf("--only");
  const only = onlyIndex >= 0 ? args[onlyIndex + 1] : null;
  const dryRun = args.includes("--dry-run");

  const all = [
    ...DERIVATIONS.map((c) => ({ ...c, kind: "variant" })),
    ...SIBLINGS.map((c) => ({ ...c, kind: "sibling" })),
  ];

  for (const config of all) {
    if (only && config.out !== only) { continue; }
    if (fs.existsSync(path.join(THEMES_DIR, config.out)) && !dryRun) {
      // Idempotent by construction: derivations always start from the base
      // theme, never from a previous derivation, so re-running converges.
      // Deriving from a derived theme is how a second run took pink to salmon
      // last time, and that mistake is not worth repeating.
    }
    const { theme, note } = config.kind === "sibling" ? deriveSibling(config) : derive(config);
    if (dryRun) {
      console.log(`${config.out.padEnd(44)} ${note}`);
      continue;
    }
    const sorted = {};
    for (const k of Object.keys(theme.colors).sort()) { sorted[k] = theme.colors[k]; }
    theme.colors = sorted;
    fs.writeFileSync(
      path.join(THEMES_DIR, config.out),
      JSON.stringify(theme, null, 2) + "\n",
      "utf8"
    );
    console.log(`${config.out.padEnd(44)} ${note}`);
  }
}

if (require.main === module) { main(); }

module.exports = {
  TRANSFORMS,
  DERIVATIONS,
  SIBLINGS,
  MINIMAL_COLLAPSE,
  scaleChroma,
  compressToward,
  stripItalics,
  dimSurfaces,
  applySibling,
  SURFACE_L_STAR,
};