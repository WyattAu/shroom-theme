#!/usr/bin/env node

"use strict";

/**
 * Regenerate `tests/color-science-reference.json`, the external table that
 * `tests/color-science.test.ts` pins the color library to.
 *
 * The values are transcribed from primary and independent sources rather than
 * produced by this project's own code, so a numerical regression in
 * `color-science.js` is caught instead of being mirrored into the reference.
 *
 * Provenance, per metric:
 *   - APCA: published reference values from `apca-w3` 0.1.9 (algorithm
 *     0.0.98G-4g, constants frozen 2021-02-15).
 *   - WCAG 2.1, CIELAB, CIEDE2000: generated with `colour-science` 0.4.7, an
 *     independent implementation, over the same sRGB primaries.
 *   - CVD simulation: published Machado 2009 results for linear-RGB
 *     application, plus Brettel 1997 sRGB-adapted (via libDaltonLens) for
 *     tritanopia, which Machado explicitly declines to model.
 *
 * Regenerate only when a color-science constant changes deliberately, and read
 * the resulting diff. Refreshing the table to make a failing test pass defeats
 * the point of having it.
 */

const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "tests", "color-science-reference.json");

/**
 * APCA-W3-0.1.9 reference values.
 *
 * Computed from the published constants, which are frozen as of 2021-02-15, so
 * these are stable indefinitely. Written out to full precision rather than
 * rounded, because the implementation is expected to agree to 1e-9 and a
 * rounded fixture would hide a real numerical change.
 */
const APCA = [
  { fg: "#FFFFFF", bg: "#000000", lc: -107.88473318309848 },
  { fg: "#000000", bg: "#FFFFFF", lc: 106.04067321268862 },
  { fg: "#888888", bg: "#FFFFFF", lc: 63.056469930209424 },
  { fg: "#FFFFFF", bg: "#888888", lc: -68.54146436644962 },
  { fg: "#AAAAAA", bg: "#000000", lc: -56.24113336839742 },
  { fg: "#112233", bg: "#DDEEFF", lc: 91.66830811481631 },
  { fg: "#DDEEFF", bg: "#112233", lc: -93.06770049484275 },
];

/**
 * Linear-RGB CVD simulation expectations.
 *
 * These are the values that distinguish a correct implementation from the
 * common bug of applying the matrices to gamma-encoded sRGB. On these inputs
 * the two paths differ by 10-15 CIEDE2000 units.
 */
const CVD = [
  { hex: "#BE9AF7", kind: "protan", linear: "#83ABFB" },
  { hex: "#A6C18B", kind: "deutan", linear: "#C2B88E" },
  { hex: "#E68484", kind: "protan", linear: "#989483" },
  { hex: "#FF0000", kind: "protan", linear: "#6D5F00" },
  { hex: "#0000FF", kind: "deutan", linear: "#003DFB" },
  { hex: "#74D7C8", kind: "tritan", linear: "#81D1ED" },
];

/**
 * WCAG 2.1 ratios, alpha composited. Includes translucent cases, which is
 * where the previous audit silently over-reported.
 */
const WCAG = [
  { fg: "#FFFFFF", bg: "#000000", ratio: 21 },
  { fg: "#000000", bg: "#FFFFFF", ratio: 21 },
  { fg: "#888888", bg: "#FFFFFF", ratio: 3.5449084285569723 },
  { fg: "#CCC8D9", bg: "#24212E", ratio: 9.632938877476216 },
  { fg: "#726D89", bg: "#24212E", ratio: 3.2012877450201877 },
  { fg: "#726D8980", bg: "#24212E", ratio: 1.7709340950573135 },
  { fg: "#E0DEF4", bg: "#24212E", ratio: 11.95508662627962 },
  { fg: "#4A4555", bg: "#F5F2E8", ratio: 8.246203477367004 },
  { fg: "#8C6D34", bg: "#F5F2E8", ratio: 4.307929104016065 },
  { fg: "#8A859A", bg: "#F5F2E8", ratio: 3.176503906614438 },
  { fg: "#AAAAAA80", bg: "#000000", ratio: 2.8315256122321283 },
  { fg: "#4A455550", bg: "#F5F2E8", ratio: 1.6887308404158062 },
];

/** CIELAB (D65) for colours spanning the palette's hue range. */
const LAB = [
  { hex: "#000000", lab: [0, 0, 0] },
  { hex: "#FFFFFF", lab: [100, 0, 0] },
  { hex: "#24212E", lab: [16.1269, 4.1366, -9.8146] },
  { hex: "#CCC8D9", lab: [81.3928, 2.5044, -5.6102] },
  { hex: "#726D89", lab: [47.3904, 5.5272, -15.8487] },
  { hex: "#BE9AF7", lab: [70.0228, 21.3238, -44.9257] },
  { hex: "#74D7C8", lab: [79.8885, -26.4785, -4.1849] },
  { hex: "#E8C990", lab: [82.3493, 5.9355, 32.1288] },
  { hex: "#82AAFF", lab: [69.9787, 5.4622, -35.9729] },
  { hex: "#A6C18B", lab: [74.8924, -19.3843, 24.7043] },
  { hex: "#E68484", lab: [65.7432, 36.1279, 13.1682] },
  { hex: "#FFCB6B", lab: [84.5014, 15.2325, 52.0764] },
  { hex: "#F5F2E8", lab: [95.4745, -0.5625, 8.3328] },
  { hex: "#4A4555", lab: [30.3256, 3.1487, -7.6676] },
  { hex: "#AD58FF", lab: [55.1622, 60.8094, -70.5415] },
  { hex: "#FFD978", lab: [88.0854, 6.0487, 60.5401] },
  { hex: "#4AF8E1", lab: [88.9361, -51.2937, 5.2301] },
  { hex: "#95F94A", lab: [89.2233, -49.6113, 74.2245] },
];

/** CIEDE2000 over pairs drawn from the theme's own palette. */
const PAIRS = [
  { a: "#726D89", b: "#A6C18B", de00: 33.5086 },
  { a: "#A6C18B", b: "#BE9AF7", de00: 31.1298 },
  { a: "#BE9AF7", b: "#74D7C8", de00: 37.1484 },
  { a: "#74D7C8", b: "#E8C990", de00: 33.5069 },
  { a: "#E8C990", b: "#82AAFF", de00: 34.6617 },
  { a: "#82AAFF", b: "#CCC8D9", de00: 19.5041 },
  { a: "#CCC8D9", b: "#E68484", de00: 35.6698 },
  { a: "#E68484", b: "#FFCB6B", de00: 26.5033 },
  { a: "#FFCB6B", b: "#726D89", de00: 41.0936 },
  { a: "#89AEFF", b: "#BE9AF7", de00: 16.2479 },
  { a: "#286CD0", b: "#895D9C", de00: 21.3455 },
];

const reference = {
  _provenance: {
    apca: "apca-w3 0.1.9 published reference values (algorithm 0.0.98G-4g)",
    wcag: "colour-science 0.4.7; WCAG 2.1 relative luminance, alpha composited",
    lab: "colour-science 0.4.7; CIELAB D65",
    de00: "colour-science 0.4.7; CIEDE2000 with kL=kC=kH=1",
    cvd:
      "Published Machado 2009 results for linear-RGB application, plus " +
      "Brettel 1997 sRGB-adapted (libDaltonLens) for tritanopia, which " +
      "Machado declines to model. Simulation must run in linear RGB: the " +
      "gamma-encoded path differs by 10-15 dE00 on mid-lightness pastels, " +
      "which is exactly the range a syntax theme uses.",
    regenerate: "node tools/generate-color-reference.js",
  },
  apca: APCA,
  wcag: WCAG,
  lab: LAB,
  pairs: PAIRS,
  cvd: CVD,
};

fs.writeFileSync(OUT, JSON.stringify(reference, null, 2) + "\n", "utf8");
console.log(`Wrote ${OUT}`);
console.log(
  `${APCA.length} APCA, ${WCAG.length} WCAG, ${LAB.length} Lab, ` +
    `${PAIRS.length} dE00, ${CVD.length} CVD reference values.`
);
