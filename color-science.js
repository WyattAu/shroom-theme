"use strict";

/**
 * Color science utilities for theme analysis and validation.
 *
 * Every formula here is validated against `colour-science` 0.4.7 and the
 * published APCA reference values; see `docs/color-science.md` for the
 * reference table and provenance.
 *
 * Contents:
 *   - WCAG 2.1 relative luminance and contrast ratio, alpha-composited.
 *   - APCA (APCA-W3-0.1.9) signed Lc contrast.
 *   - CIELAB (D65), CIELCh, and CIEDE2000.
 *   - Dichromat / achromat simulation (Vienot, Brettel & Mollon 1999).
 *
 * Deliberately excluded: CAM16-UCS. Its advantage over CIEDE2000 here is
 * marginal, and a hand-transcribed CAM16 forward model is easy to get subtly
 * wrong. Use `colour-science` directly if CAM16-UCS is needed.
 */

// ---------------------------------------------------------------- sRGB ----

/**
 * sRGB electro-optical transfer function (gamma-encoded -> linear-light).
 * @param {number} c channel value in [0,1]
 * @returns {number} linear-light value
 */
function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Inverse sRGB transfer function (linear-light -> gamma-encoded).
 * @param {number} c linear-light value
 * @returns {number} gamma-encoded channel value in [0,1]
 */
function linearToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

// ------------------------------------------------------------ parse/hex ----

/**
 * Parse a hex color into normalized channels.
 * @param {string} hex `#RGB`, `#RGBA`, `#RRGGBB` or `#RRGGBBAA`
 * @returns {{r:number,g:number,b:number,a:number}} channels in [0,1]
 */
function parseHex(hex) {
  let h = String(hex).trim().replace(/^#/, "");
  if (h.length === 3 || h.length === 4) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
    a: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
  };
}

/**
 * Format normalized channels back to hex.
 * @param {{r:number,g:number,b:number,a?:number}} c channels in [0,1]
 * @returns {string} uppercase `#RRGGBB`, or `#RRGGBBAA` when alpha < 1
 */
function toHex(c) {
  const p = (v) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  const alpha = c.a ?? 1;
  return "#" + p(c.r) + p(c.g) + p(c.b) + (alpha < 1 ? p(alpha) : "");
}

/**
 * Alpha-composite `fg` over `bg`, returning an opaque color.
 *
 * This is what a user actually perceives on screen, and therefore the only
 * correct basis for measuring the contrast of a translucent token. Treating a
 * `#RRGGBBAA` token as if the alpha were absent over-reports its contrast:
 * `#726D89` measures 3.20:1 opaque but only 1.77:1 composited onto `#24212E`.
 *
 * @param {string|{r:number,g:number,b:number,a?:number}} fg
 * @param {string|{r:number,g:number,b:number,a?:number}} bg
 * @returns {{r:number,g:number,b:number,a:1}} opaque composite
 */
function over(fg, bg) {
  const f = typeof fg === "string" ? parseHex(fg) : fg;
  const b = typeof bg === "string" ? parseHex(bg) : bg;
  const a = f.a ?? 1;
  return {
    r: f.r * a + b.r * (1 - a),
    g: f.g * a + b.g * (1 - a),
    b: f.b * a + b.b * (1 - a),
    a: 1,
  };
}

// ------------------------------------------------------------- WCAG 2.1 ----

/**
 * WCAG 2.1 relative luminance of an opaque color.
 * @param {{r:number,g:number,b:number}} c
 * @returns {number} relative luminance in [0,1]
 */
function relLum(c) {
  return (
    0.2126 * srgbToLinear(c.r) + 0.7152 * srgbToLinear(c.g) + 0.0722 * srgbToLinear(c.b)
  );
}

/**
 * WCAG 2.1 contrast ratio in [1,21].
 *
 * Alpha in `fgHex` is composited over `bgHex` before measuring.
 *
 * @param {string} fgHex foreground, may carry alpha
 * @param {string} bgHex background, treated as opaque
 * @returns {number} contrast ratio
 */
/**
 * WCAG 2.1 contrast ratio in [1,21].
 *
 * Alpha in `fgHex` is composited over the resolved background before measuring.
 * Ignoring alpha over-reports contrast for translucent tokens: `#726D89` at 50%
 * alpha measures 3.20:1 opaque but only 1.77:1 as actually rendered on
 * `#24212E`.
 *
 * A translucent *background* is composited over `backdropHex`. That matters
 * because a translucent background does not render against black -- a banner at
 * 50% alpha renders over whatever the editor background is. Compositing it over
 * black instead reports dark-on-dark and produces false failures: the light
 * theme's banner measured 1.68:1 that way and is actually 7.07:1.
 *
 * The default backdrop of white is a deliberate choice. It is the least
 * misleading assumption when the real parent is unknown, and it is the value
 * WCAG's own examples use. Callers that know the parent should pass it.
 *
 * @param {string} fgHex foreground, may carry alpha
 * @param {string} bgHex background, may carry alpha
 * @param {string} [backdropHex] what a translucent bgHex renders over
 * @returns {number} contrast ratio
 */
function wcag21(fgHex, bgHex, backdropHex = "#FFFFFF") {
  const resolved = over(bgHex, backdropHex);
  const l1 = relLum(over(fgHex, resolved));
  const l2 = relLum(resolved);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// ----------------------------------------------------------------- APCA ----

/** Constants from the APCA-W3-0.1.9 reference implementation. */
const APCA = Object.freeze({
  blkThrs: 0.022,
  blkClmp: 1.414,
  scaleBoW: 1.14,
  scaleWoB: 1.14,
  loBoWoffset: 0.027,
  loWoBoffset: 0.027,
  deltaYmin: 0.0005,
  loClip: 0.1,
  normBG: 0.56,
  normTXT: 0.57,
  revTXT: 0.62,
  revBG: 0.65,
});

/**
 * APCA screen luminance Y. Note this sums 2.4-power channels directly; it is
 * intentionally not a linear-light luminance.
 * @param {{r:number,g:number,b:number}} c
 * @returns {number} Y value
 */
function apcaY(c) {
  return (
    0.2126729 * Math.pow(c.r, 2.4) +
    0.7151522 * Math.pow(c.g, 2.4) +
    0.072175 * Math.pow(c.b, 2.4)
  );
}

/**
 * APCA Lc contrast. Alpha in `textHex` is composited over `bgHex` first.
 *
 * The sign is meaningful: positive Lc is dark text on a light background,
 * negative Lc is light text on a dark background. APCA is deliberately
 * asymmetric between the two polarities, so comparing signed values across a
 * dark and a light theme is invalid. Use `apcaAbs` for polarity-agnostic
 * thresholds.
 *
 * @param {string} textHex text color, may carry alpha
 * @param {string} bgHex background color, may carry alpha
 * @param {string} [backdropHex] what a translucent bgHex renders over.
 *   Defaults to white.
 * @returns {number} signed Lc
 */
function apcaLc(textHex, bgHex, backdropHex = "#FFFFFF") {
  const bg = over(bgHex, backdropHex);
  const txt = over(textHex, bg);
  let txtY = apcaY(txt);
  let bgY = apcaY(bg);
  txtY = txtY > APCA.blkThrs ? txtY : txtY + Math.pow(APCA.blkThrs - txtY, APCA.blkClmp);
  bgY = bgY > APCA.blkThrs ? bgY : bgY + Math.pow(APCA.blkThrs - bgY, APCA.blkClmp);
  if (Math.abs(bgY - txtY) < APCA.deltaYmin) {
    return 0;
  }
  let out;
  if (bgY > txtY) {
    const sapc = (Math.pow(bgY, APCA.normBG) - Math.pow(txtY, APCA.normTXT)) * APCA.scaleBoW;
    out = sapc < APCA.loClip ? 0 : sapc - APCA.loBoWoffset;
  } else {
    const sapc = (Math.pow(bgY, APCA.revBG) - Math.pow(txtY, APCA.revTXT)) * APCA.scaleWoB;
    out = sapc > -APCA.loClip ? 0 : sapc + APCA.loWoBoffset;
  }
  return out * 100;
}

/**
 * Absolute APCA Lc, for polarity-agnostic thresholds and reporting.
 * @param {string} fg
 * @param {string} bg
 * @returns {number} |Lc|
 */
const apcaAbs = (fg, bg) => Math.abs(apcaLc(fg, bg));

/**
 * Minimum |Lc| recommended for a text run, from APCA's font size / weight
 * lookup (Lc_min table).
 *
 * @param {number} weight 400 normal, 500 medium, 700 bold
 * @param {number} px font size in CSS px
 * @returns {number} minimum |Lc|
 */
function apcaMinLc(weight, px) {
  // Upper bound of each font-size band, paired with the minimum |Lc| at weight 400.
  const bands = [
    [14, 90],
    [18, 75],
    [24, 60],
    [36, 45],
    [48, 30],
    [Infinity, 15],
  ];
  const bonus = weight >= 700 ? 10 : weight >= 500 ? 5 : 0;
  for (const [maxPx, min] of bands) {
    if (px <= maxPx) {return min + bonus;}
  }
  return 15 + bonus;
}

// ------------------------------------------------------- CIELAB/CIEDE2000 --

const LAB_EPS = 216 / 24389;
const LAB_KAPPA = 24389 / 27;
// D65 white point (CIE xy = 0.3127, 0.3290), 2-degree observer.
const WHITE_X = 0.9504559270516716;
const WHITE_Y = 1.0;
const WHITE_Z = 1.0890577507598784;

/**
 * Convert sRGB to CIE XYZ (D65).
 * @param {{r:number,g:number,b:number}} c
 * @returns {{X:number,Y:number,Z:number}}
 */
function rgbToXyz(c) {
  const R = srgbToLinear(c.r);
  const G = srgbToLinear(c.g);
  const B = srgbToLinear(c.b);
  return {
    X: 0.4123907992659595 * R + 0.35758433938387796 * G + 0.18048078840183429 * B,
    Y: 0.21263900587151036 * R + 0.71516867876775593 * G + 0.07219231536073371 * B,
    Z: 0.019330818715591851 * R + 0.11919477979462599 * G + 0.95053215224966058 * B,
  };
}

function fLab(t) {
  return t > LAB_EPS ? Math.cbrt(t) : (LAB_KAPPA * t + 16) / 116;
}

/**
 * Convert to CIELAB (D65).
 * @param {{r:number,g:number,b:number}} rgb
 * @returns {{L:number,a:number,b:number}}
 */
function rgbToLab(rgb) {
  const { X, Y, Z } = rgbToXyz(rgb);
  const fx = fLab(X / WHITE_X);
  const fy = fLab(Y / WHITE_Y);
  const fz = fLab(Z / WHITE_Z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/**
 * Chroma below which hue is treated as undefined. Near the achromatic axis
 * the hue angle is numerical noise, so callers must test `C` before using `h`.
 */
const HUE_CHROMA_EPSILON = 0.0015;

/**
 * Convert to CIELCh (D65).
 *
 * Below `HUE_CHROMA_EPSILON` chroma, hue is reported as 0 rather than a random
 * direction, so callers can detect "no meaningful hue" by testing `C`.
 *
 * @param {{r:number,g:number,b:number}} rgb
 * @returns {{L:number,C:number,h:number}} L in [0,100], h in [0,360)
 */
function rgbToLch(rgb) {
  const { L, a, b } = rgbToLab(rgb);
  const C = Math.hypot(a, b);
  if (C < HUE_CHROMA_EPSILON) {
    return { L, C, h: 0 };
  }
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) {h += 360;}
  return { L, C, h };
}

/**
 * CIEDE2000 color difference between two CIELAB values (kL = kC = kH = 1).
 * @param {{L:number,a:number,b:number}} l1
 * @param {{L:number,a:number,b:number}} l2
 * @returns {number} CIEDE2000 difference
 */
function ciede2000(l1, l2) {
  const C1 = Math.hypot(l1.a, l1.b);
  const C2 = Math.hypot(l2.a, l2.b);
  const Cbar = (C1 + C2) / 2;
  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));
  const a1p = (1 + G) * l1.a;
  const a2p = (1 + G) * l2.a;
  const C1p = Math.hypot(a1p, l1.b);
  const C2p = Math.hypot(a2p, l2.b);

  const hueOf = (b, ap) => {
    if (b === 0 && ap === 0) {return 0;}
    const h = (Math.atan2(b, ap) * 180) / Math.PI;
    return h < 0 ? h + 360 : h;
  };
  const h1p = hueOf(l1.b, a1p);
  const h2p = hueOf(l2.b, a2p);

  const dLp = l2.L - l1.L;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) {dhp -= 360;}
    else if (dhp < -180) {dhp += 360;}
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 360);

  const Lbarp = (l1.L + l2.L) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp;
  if (C1p * C2p === 0) {
    hbarp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hbarp = (h1p + h2p) / 2;
  } else {
    const sum = h1p + h2p;
    hbarp = sum < 360 ? (sum + 360) / 2 : (sum - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(((hbarp - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * hbarp * Math.PI) / 180) +
    0.32 * Math.cos(((3 * hbarp + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * hbarp - 63) * Math.PI) / 180);
  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const Cbarp7 = Math.pow(Cbarp, 7);
  const Rc = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lbarp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin((2 * dTheta * Math.PI) / 180) * Rc;

  return Math.sqrt(
    Math.pow(dLp / Sl, 2) +
      Math.pow(dCp / Sc, 2) +
      Math.pow(dHp / Sh, 2) +
      Rt * (dCp / Sc) * (dHp / Sh)
  );
}

/**
 * CIEDE2000 between two hex colors.
 * @param {string} hex1
 * @param {string} hex2
 * @returns {number} CIEDE2000 difference
 */
const deltaE00 = (hex1, hex2) =>
  ciede2000(rgbToLab(parseHex(hex1)), rgbToLab(parseHex(hex2)));

// ------------------------------------------------------------------ CAM16 ----

/**
 * CAM16 colour appearance model (Li et al. 2017), forward direction.
 *
 * CAM16 is used here for three things CIELAB cannot do well:
 *
 * - **Hue architecture.** CIELAB hue is compressed at high chroma and
 *   non-uniform around the circle. CAM16's hue angle is perceptually
 *   uniform, so angular gaps between token hues mean something.
 * - **Chroma budget.** CAM16 `M` is designed to be roughly perceptually
 *   uniform across lightness, so summing `M` across the palette approximates
 *   total colourfulness in a way that CIELAB `C` does not.
 * - **Helmholtz-Kohlrausch brightness.** The H-K correction is defined over
 *   CIECAM16's `J` and `C`, so predicting perceived brightness distortion
 *   requires CAM16 rather than a lightness stand-in.
 *
 * Viewing conditions are fixed to the sRGB defaults used by
 * `colour-science` (L_A = 4.074 cd/m^2, average surround), so the output is
 * comparable against that reference implementation. See
 * `tests/color-science-reference.json`, pinned from colour-science 0.4.7.
 *
 * Reference: Li, C. et al. (2017) "The CAM16 color appearance model for
 * related color materials", Color and Imaging Conference.
 */
const CAM16 = Object.freeze({
  /** CMCCAT2000 sharpened RGB matrix, rows are the transform basis. */
  matrix16: [
    [0.401288, 0.650173, -0.051461],
    [-0.250268, 1.204414, 0.045854],
    [-0.002079, 0.048952, 0.953127],
  ],
  /** sRGB / IEC 61966-2-1 D65 white point, Y normalised to 100. */
  whitePoint: [95.04559270516715, 100.0, 108.90577507598785],
  /** Adapting field luminance, cd/m^2. */
  adaptingLuminance: 4.074366543152521,
  /** Luminance of the background, as a fraction of the white point. */
  backgroundLuminance: 20.0,
  /** Surround: maximum degree of adaptation, non-linearity, chroma induction. */
  surround: Object.freeze({ F: 1, c: 0.69, N_c: 1 }),
});

/** Signed power, matching `colour.algebra.spow`: sign(a) * |a|^p. */
function spow(a, p) {
  return Math.sign(a) * Math.pow(Math.abs(a), p);
}

/** Multiply a column vector by a 3x3 matrix. */
function mat3mul(m, v) {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

/**
 * CAM16 viewing-condition parameters: n, F_L, N_bb, N_cb, z.
 * @param {number} Y_b background luminance, 0-100
 * @param {number} Y_w white point luminance, 0-100
 * @param {number} L_A adapting luminance, cd/m^2
 */
function cam16Conditions(Y_b, Y_w, L_A) {
  const n = Y_b / Y_w;
  const k = 1 / (5 * L_A + 1);
  const k4 = k ** 4;
  const F_L =
    0.2 * k4 * (5 * L_A) + 0.1 * (1 - k4) ** 2 * spow(5 * L_A, 1 / 3);
  const N_bb = 0.725 * spow(1 / n, 0.2);
  return { n, F_L, N_bb, N_cb: N_bb, z: 1.48 + Math.sqrt(n) };
}

/**
 * CAM16 post-adaptation non-linear response compression, the piecewise form
 * introduced by Li et al. (2017). The CIECAM02 form diverges outside
 * [q_L, q_U] = [0.26, 150]; the piecewise form stays monotonic, which matters
 * because near-black token colours fall below q_L.
 *
 * @param {number[]} RGB_c adapted cone responses
 * @param {number} F_L
 * @returns {number[]}
 */
function cam16Compress(RGB_c, F_L) {
  const q_L = 0.26;
  const q_U = 150;
  const f = (q) => {
    const t = spow((F_L * q) / 100, 0.42);
    return (400 * t) / (27.13 + t);
  };
  const df = (q) => {
    const t = (F_L * q) / 100;
    return (1.68 * 27.13 * F_L * spow(t, -0.58)) / Math.pow(27.13 + spow(t, 0.42), 2);
  };
  return RGB_c.map((v) => {
    if (v > q_U) { return f(q_U) + df(q_U) * (v - q_U); }
    if (v < q_L) { return f(q_L) * (v / q_L); }
    return f(v);
  });
}

/**
 * CIECAM02 post-adaptation non-linear response compression, signed and with
 * the +0.1 offset folded in. Used for the white point only.
 * @param {number[]} RGB
 * @param {number} F_L
 * @returns {number[]}
 */
function cam16Palc(RGB, F_L) {
  return RGB.map((v) => {
    const t = spow((F_L * Math.abs(v)) / 100, 0.42);
    return (400 * Math.sign(v) * t) / (27.13 + t) + 0.1;
  });
}

/** Hue quadrature data: reference hue, eccentricity factor, quadrature value. */
const CAM16_HUE_DATA = Object.freeze([
  [20.14, 0.8, 0.0],
  [90.0, 0.7, 100.0],
  [164.25, 1.0, 200.0],
  [237.53, 1.2, 300.0],
  [380.14, 0.8, 400.0],
]);

/** Hue quadrature H from hue angle h, by linear interpolation of the data. */
function cam16HueQuadrature(h) {
  const rows = CAM16_HUE_DATA;
  for (let i = 0; i < rows.length - 1; i++) {
    const [h0, e0, H0] = rows[i];
    const [h1, e1] = rows[i + 1];
    if (h >= h0 && h <= h1) {
      const num = (100 * (h - h0)) / e0;
      const den = (h - h0) / e0 + (h1 - h) / e1;
      return den === 0 ? H0 : H0 + num / den;
    }
  }
  return h < CAM16_HUE_DATA[0][0] ? 0.0 : 400.0;
}

/**
 * Forward CAM16. Accepts XYZ in [0,1] and returns the correlates on the
 * 0-100 scale, which is the domain colour-science reports them in.
 *
 * @param {{X:number,Y:number,Z:number}} xyz
 * @returns {{J:number,a:number,b:number,M:number,C:number,h:number,Q:number,s:number,H:number}}
 */
function xyzToCam16(xyz) {
  const cfg = CAM16;
  const XYZ = [xyz.X * 100, xyz.Y * 100, xyz.Z * 100];
  const XYZ_w = cfg.whitePoint;
  const { F, c, N_c } = cfg.surround;
  const L_A = cfg.adaptingLuminance;
  const Y_w = XYZ_w[1];

  const { n, F_L, N_bb, N_cb, z } = cam16Conditions(
    cfg.backgroundLuminance, Y_w, L_A
  );

  // Degree of adaptation (CIECAM02 formula, F = 1 here).
  const D = F * (1 - (1 / 3.6) * Math.exp((-L_A - 42) / 92));

  const RGB_w = mat3mul(cfg.matrix16, XYZ_w);
  const D_RGB = RGB_w.map((w) => (D * 100) / w + 1 - D);

  const RGB_wc = D_RGB.map((d, i) => d * RGB_w[i]);
  // The white point uses the CIECAM02 compression, the stimulus uses CAM16's
  // piecewise one. This asymmetry is in the published model.
  const A_w = cam16Achromatic(cam16Palc(RGB_wc, F_L), N_bb);

  const RGB = mat3mul(cfg.matrix16, XYZ);
  const RGB_c = D_RGB.map((d, i) => d * RGB[i]);
  const RGB_a = cam16Compress(RGB_c, F_L).map((v) => v + 0.1);

  const a = RGB_a[0] - (12 * RGB_a[1]) / 11 + RGB_a[2] / 11;
  const b = (RGB_a[0] + RGB_a[1] - 2 * RGB_a[2]) / 9;

  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) { h += 360; }

  const e_t = (Math.cos(2 + (h * Math.PI) / 180) + 3.8) / 4;
  const H = cam16HueQuadrature(h);
  const A = cam16Achromatic(RGB_a, N_bb);

  const J = 100 * spow(A / A_w, c * z);
  const Q = ((4 / c) * Math.sqrt(J / 100) * (A_w + 4)) * spow(F_L, 0.25);

  const t =
    ((50000 / 13) * N_c * N_cb * e_t * Math.sqrt(a * a + b * b)) /
    (RGB_a[0] + RGB_a[1] + (21 * RGB_a[2]) / 20);

  const C =
    spow(t, 0.9) * spow(J / 100, 0.5) * spow(1.64 - Math.pow(0.29, n), 0.73);
  const M = C * spow(F_L, 0.25);
  const s = 100 * spow(M / Q, 0.5);

  return { J, a, b, M, C, h, Q, s, H };
}

/** CAM16 achromatic response A from compressed cone responses. */
function cam16Achromatic(RGB_aw, N_bb) {
  return (2 * RGB_aw[0] + RGB_aw[1] + RGB_aw[2] / 20 - 0.305) * N_bb;
}

/**
 * sRGB hex to CAM16 correlates.
 * @param {string} hex
 * @returns {{J:number,M:number,C:number,h:number,Q:number}} J and Q 0-100, M and
 *   C 0-100, h in [0,360)
 */
function hexToCam16(hex) {
  return xyzToCam16(rgbToXyz(parseHex(hex)));
}

/**
 * Chroma below which CAM16 hue is treated as undefined.
 *
 * CAM16 is not perfectly achromatic on neutrals: white measures C = 3.09, mid
 * grey 2.03, #AAAAAA 2.41. That residual is a documented property of the model,
 * so a threshold below it would classify every grey as chromatic and report hue
 * angles that are quantisation noise.
 *
 * 8 sits in the gap between the residual and anything with a real hue. The
 * highest value measured on a true neutral is 3.09; the lowest on a colour
 * whose hue is visually meaningful is the dark theme's comment at 19.4. The
 * grey palettes of the monochrome variant land at 2.4-2.8, so they are
 * correctly excluded from hue analysis, while the deliberately tinted dark
 * backgrounds at 4.6-11.8 stay in -- their hue is stable and is the reference
 * the cross-variant metric would otherwise need.
 */
const CAM16_HUE_CHROMA_EPSILON = 8;

/**
 * Helmholtz-Kohlrausch perceived lightness, following High, Green and
 * Nussbaum (2023): J_HK = sqrt(J^2 + 66 C).
 *
 * The H-K effect is that a saturated colour *looks* brighter than an
 * equiluminant grey. A theme that assigns high chroma to a de-emphasised role
 * therefore makes that role visually prominent in a way its lightness does not
 * admit, and the lightness ladder overstates how quiet the quiet roles are.
 *
 * J_HK quantifies that: it is the lightness an observer would need to match the
 * perceived brightness. The gap between J_HK and J is the chroma-driven
 * promotion, in the same 0-100 units.
 *
 * The model as published is defined over *revised* CIECAM16. This uses plain
 * CAM16, which is an approximation: the revisions improve J and C accuracy in
 * specific lightness regions but CAM16 captures the bulk of the effect. Treated
 * as a diagnostic, not a prediction of a specific observer's response.
 *
 * Reference: High, J. S., Green, P. and Nussbaum, P. D. (2023) "A new approach
 * to modeling the Helmholtz-Kohlrausch effect", Color and Imaging Conference.
 *
 * @param {string} hex
 * @returns {{J:number,C:number,Jhk:number,promotion:number}}
 */
function helmholtzKohlrausch(hex) {
  const { J, C } = hexToCam16(hex);
  const Jhk = Math.sqrt(J * J + 66 * C);
  return { J, C, Jhk, promotion: Jhk - J };
}

// ------------------------------------------------------- CVD simulation ----

/**
 * Brettel, Vienot & Mollon (1997) two-half-plane projection, adapted to sRGB.
 *
 * `m1` is used when dot(linearRGB, normal) >= 0, otherwise `m2`. The two wings
 * correspond to the yellow/blue anchor planes; choosing between them matters
 * because they are NOT coplanar. This is the only valid choice for tritanopia:
 * Vienot et al. (1999) published no tritan matrix, and reusing the protan/deutan
 * plane for it is wrong rather than approximate.
 *
 * Provenance: parameters from libDaltonLens (Nicolás Krause, public domain),
 * which regenerates Brettel's LMS anchors for sRGB and uses sRGB white as the
 * neutral axis so that projections stay inside the gamut.
 */
const BRETTEL = Object.freeze({
  protan: {
    m1: [0.1498, 1.19548, -0.34528, 0.10764, 0.84864, 0.04372, 0.00384, -0.0054, 1.00156],
    m2: [0.1457, 1.16172, -0.30742, 0.10816, 0.85291, 0.03892, 0.00386, -0.00524, 1.00139],
    normal: [0.00048, 0.00393, -0.00441],
  },
  deutan: {
    m1: [0.36477, 0.86381, -0.22858, 0.26294, 0.64245, 0.09462, -0.02006, 0.02728, 0.99278],
    m2: [0.37298, 0.88166, -0.25464, 0.25954, 0.63506, 0.1054, -0.0198, 0.02784, 0.99196],
    normal: [-0.00281, -0.00611, 0.00892],
  },
  tritan: {
    m1: [1.01277, 0.13548, -0.14826, -0.01243, 0.86812, 0.14431, 0.07589, 0.805, 0.11911],
    m2: [0.93678, 0.18979, -0.12657, 0.06154, 0.81526, 0.1232, -0.37562, 1.12767, 0.24796],
    normal: [0.03901, -0.02788, -0.01113],
  },
});

/**
 * Default algorithm per vision type.
 *
 * Dispatch follows DaltonLens: Brettel for tritanopia, Machado severity 1.0
 * for protanopia and deuteranopia (its matrices agree with Brettel to within
 * 1e-6 at full dichromacy but are a single plane, which is faster and has no
 * in-gamut clipping step).
 *
 * The flat protan/deutan/tritan matrices exposed as `CVD_MATRICES` are
 * **Machado, Oliveira & Fernandes (2009) at severity 1.0**, not Vienot 1999.
 * These two are frequently mislabelled: the widely-copied
 * `[[0.152286, 1.052583, -0.204868], ...]` "Vienot" matrix is bit-identical to
 * Machado 1.0. Both papers' methods are documented here so the distinction is
 * not lost again.
 *
 * Machado disclaims tritanopia modelling outright ("we restrain our model from
 * trying to model tritanopia"), which is why tritan is dispatched to Brettel
 * even though a Machado tritan matrix is available.
 */
const CVD_MATRICES = Object.freeze({
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
});

/**
 * Machado 2009 severity 1.0, the only severity used here.
 *
 * Severity for intermediate values is intentionally NOT exposed: Machado's
 * severity maps to a cone spectral shift (delta-lambda = 20 * (1 - s) nm) and
 * is therefore physiological, whereas Brettel's is a plain interpolation that
 * was never validated. Conflating the two would misrepresent what a user with
 * mild anomalous trichromacy sees.
 *
 * Context worth stating plainly: only about a quarter of people with colour
 * vision deficiency are dichromats. The rest are anomalous trichromats, whose
 * impairment is milder. Full-severity simulation is a conservative worst case,
 * not a depiction of a typical user's experience.
 */
const CVD_DICHROMACY_SEVERITY = 1.0;

/**
 * Simulate dichromat or achromat vision for a single color.
 *
 * All projections run in LINEAR RGB. Applying a linear operator to
 * gamma-encoded sRGB applies it to a quantity that is not proportional to
 * light, and for mid-lightness pastels of the kind syntax themes use the
 * resulting error is large: measured median CIEDE2000 15.03, with 76% of the
 * sRGB cube off by more than 10. Pure primaries agree under both paths, so a
 * naive spot-check on saturated colours will not catch this.
 *
 * @param {string} hex source color; alpha is preserved
 * @param {"protan"|"deutan"|"tritan"|"monochrome"|null} kind vision type
 * @param {number} [severity] 0 (trichromat) to 1 (full dichromat)
 * @returns {string} simulated hex color
 */
function simulate(hex, kind, severity = CVD_DICHROMACY_SEVERITY) {
  const c = parseHex(hex);
  if (!kind || severity <= 0) {return toHex(c);}

  const lin = [srgbToLinear(c.r), srgbToLinear(c.g), srgbToLinear(c.b)];
  let out;

  if (kind === "monochrome") {
    // Achromatopsia: CIE Y-preserving grayscale in linear light. Machado
    // explicitly declines to model monochromacy, so no matrix is used.
    const Y = 0.2126729 * lin[0] + 0.7151522 * lin[1] + 0.072175 * lin[2];
    out = [Y, Y, Y];
  } else if (kind === "tritan") {
    // Brettel: two non-coplanar half-planes, selected by the separation plane.
    const p = BRETTEL.tritan;
    const t = p.normal[0] * lin[0] + p.normal[1] * lin[1] + p.normal[2] * lin[2];
    const m = t >= 0 ? p.m1 : p.m2;
    out = [0, 1, 2].map((i) => m[i * 3] * lin[0] + m[i * 3 + 1] * lin[1] + m[i * 3 + 2] * lin[2]);
  } else {
    const M = CVD_MATRICES[kind];
    if (!M) {return toHex(c);}
    out = [0, 1, 2].map((i) => M[i][0] * lin[0] + M[i][1] * lin[1] + M[i][2] * lin[2]);
  }

  const blended = out.map((v, i) => {
    const clamped = Math.max(0, Math.min(1, v));
    return lin[i] * (1 - severity) + clamped * severity;
  });
  return toHex({
    r: linearToSrgb(blended[0]),
    g: linearToSrgb(blended[1]),
    b: linearToSrgb(blended[2]),
    a: c.a,
  });
}

/**
 * Simulate an array of colors under one vision type.
 * @param {string[]} colors
 * @param {"protan"|"deutan"|"tritan"|"monochrome"|null} kind
 * @param {number} [severity]
 * @returns {string[]}
 */
const simulateAll = (colors, kind, severity = CVD_DICHROMACY_SEVERITY) =>
  colors.map((c) => simulate(c, kind, severity));

/**
 * Minimum pairwise CIEDE2000 separation for categorical colors that must be
 * identified, not merely detected.
 *
 * ~2.3 is a bare JND for large adjacent patches, which is the wrong regime for
 * glyph-sized marks: at that size the observer must recognise a token class
 * rather than notice that something changed. For calibration, Okabe & Ito's
 * 8-colour CUD set measures 11.13 at worst under tritanopia, and Paul Tol's
 * muted scheme measures 11.65, so ~10 is roughly the practical ceiling that
 * published CVD-safe palettes achieve. 20 is comfortable and is what this
 * project enforces between normal-vision token colours.
 */
const DELTA_E_CATEGORICAL_MIN = 20;

/**
 * Minimum pairwise CIEDE2000 separation under simulated vision deficiency.
 *
 * Set at 10 rather than 20 because a dichromat palette is solving a harder
 * problem inside a two-dimensional gamut slice. This is the gate that catches
 * isoluminant token pairs, which is the dominant failure mode: two colours at
 * identical lightness differ only by hue, so when hue collapses under a
 * deficiency they become the same colour. That failure is invisible to any
 * contrast-against-background check.
 */
const DELTA_E_CVD_MIN = 10;

/**
 * Maximum CIELAB lightness difference permitted between two token colours that
 * may appear adjacent on a line.
 *
 * Derived from ColorMaker (IEEE VIS 2024), whose cost function explicitly
 * penalises *equally luminant* color pairs under simulated CVD. An isoluminant
 * pair is the single most reliable way to ship a palette that passes normal
 * vision and collapses for a dichromat, so it is worth a structural rule
 * rather than only an emergent one.
 */
const MAX_ISOLUMINANT_L_DIFF = 4;

module.exports = {
  srgbToLinear,
  linearToSrgb,
  parseHex,
  toHex,
  over,
  relLum,
  wcag21,
  APCA,
  apcaY,
  apcaLc,
  apcaAbs,
  apcaMinLc,
  rgbToLab,
  rgbToLch,
  HUE_CHROMA_EPSILON,
  ciede2000,
  deltaE00,
  spow,
  CAM16,
  CAM16_HUE_DATA,
  cam16Conditions,
  cam16Compress,
  cam16HueQuadrature,
  xyzToCam16,
  hexToCam16,
  CAM16_HUE_CHROMA_EPSILON,
  helmholtzKohlrausch,
  BRETTEL,
  CVD_MATRICES,
  CVD_DICHROMACY_SEVERITY,
  simulate,
  simulateAll,
  DELTA_E_CATEGORICAL_MIN,
  DELTA_E_CVD_MIN,
  MAX_ISOLUMINANT_L_DIFF,
};
