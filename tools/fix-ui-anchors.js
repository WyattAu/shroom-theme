#!/usr/bin/env node

"use strict";

/**
 * Point the semantic UI anchors at a sibling palette's own roles.
 *
 * Error, warning and info are semantic colours: the red, the amber and the
 * teal of the palette they belong to. Deriving them from the palette rather
 * than patching each one means they inherit contrast from roles that already
 * pass the audit -- a one-off hex patch fixes the token in front of you and
 * leaves the next one to fail.
 */

const fs = require("fs");
const path = require("path");
const color = require("../color-science.js");
const { labToHex, gamutFit } = require("./repair-isoluminance.js");

const THEMES_DIR = path.resolve(__dirname, "..", "themes");

const ANCHORS = {
  "editorError.foreground": "invalid",
  "editorWarning.foreground": "constant",
  "editorInfo.foreground": "function",
  "editorGutter.foreground": "comment",
  "problemsErrorIcon.foreground": "invalid",
  "problemsWarningIcon.foreground": "constant",
  "problemsInfoIcon.foreground": "function",
  "notificationsErrorIcon.foreground": "invalid",
  "notificationsWarningIcon.foreground": "constant",
  "notificationsInfoIcon.foreground": "function",
};

/** Role -> hex for a theme, from its own token colours. */
function roleColours(theme) {
  const q = require("./quality-profile.js");
  const out = {};
  for (const [role, entry] of q.canonicalRoleColours(theme)) { out[role] = entry.hex; }
  return out;
}

function fix(file) {
  const p = path.join(THEMES_DIR, file);
  const theme = JSON.parse(fs.readFileSync(p, "utf8"));
  const roles = roleColours(theme);
  const bg = theme.colors["editor.background"];
  let n = 0;
  const notes = [];
  for (const [key, role] of Object.entries(ANCHORS)) {
    const hex = roles[role];
    if (!hex) { continue; }
    let candidate = hex;
    // The monochrome variant differentiates roles by lightness, and its error
    // colour is pure white -- deliberately louder than the foreground. An
    // anchor that would end up identical to the editor foreground carries no
    // signal at all, so keep the existing value there rather than collapsing
    // the distinction.
    if (candidate.toUpperCase() === String(theme.colors["editor.foreground"]).toUpperCase()) {
      continue;
    }
    // Lift into AA if the role itself is de-emphasis (comment is exempt from
    // the text gate; the anchors are not, since they appear as text).
    if (color.wcag21(candidate, bg) < 4.5) {
      const { L, C } = color.rgbToLch(color.parseHex(candidate));
      const bgL = color.rgbToLch(color.parseHex(bg)).L;
      const dir = L > bgL ? 1 : -1;
      let lifted = candidate;
      // Step until the ratio clears 4.5 with margin. A binary search converges
      // on the boundary and its last probe can land at 4.49, which fails the
      // audit by a rounding step; stepping with margin is slower and exact.
      for (let step = 0; step < 60; step++) {
        const cur = color.rgbToLch(color.parseHex(lifted));
        const next = cur.L + dir * 0.5;
        lifted = labToHex(next, gamutFit(next, C, (cur.h * Math.PI) / 180), (cur.h * Math.PI) / 180);
        if (color.wcag21(lifted, bg) >= 4.55) { break; }
      }
      candidate = lifted;
    }
    if (theme.colors[key] !== candidate) { n++; }
    theme.colors[key] = candidate;
    notes.push(`${key}=${candidate}`);
  }
  const sorted = {};
  for (const k of Object.keys(theme.colors).sort()) { sorted[k] = theme.colors[k]; }
  theme.colors = sorted;
  fs.writeFileSync(p, JSON.stringify(theme, null, 2) + "\n", "utf8");
  console.log(`${file}: ${n} anchors -> ${notes.length}`);
}

// Derived and sibling themes only. The seven hand-tuned originals already have
// their anchors chosen -- the info blue in particular is identity, not an
// oversight -- and this tool must not silently repaint them.
const DERIVED = /^(shroom-space-(muted|vivid|dim|soft|minimal|no-italics)-theme\.json|shroom-space-light-(muted|soft|minimal|no-italics)-theme\.json|shroom-(ember|ember-light|night)-theme\.json)$/;
for (const f of fs.readdirSync(THEMES_DIR).filter((x) => DERIVED.test(x))) {
  fix(f);
}