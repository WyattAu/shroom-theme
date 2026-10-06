/*
Copyright 2024-2026 Wyatt Au

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * Verification tests for the color science utilities.
 *
 * Every expected value here comes from a primary source rather than from this
 * implementation's own output:
 *
 * - APCA values are the published reference values from `apca-w3` 0.1.9.
 * - CIEDE2000 and CIELAB values were generated with `colour-science` 0.4.7,
 *   an independent implementation.
 * - CVD simulation values were cross-checked against published Machado 2009
 *   results for linear-RGB application.
 *
 * These tests exist to catch a silent numerical regression. A colour library
 * that is subtly wrong still produces plausible output, so the numbers have to
 * be pinned to something external.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

// Compiled to `out/tests/`, so the repo root is two levels up. The color
// library and the reference table are plain CommonJS at the repo root and are
// loaded from there rather than compiled, which keeps them usable from the
// standalone Node tools in `tools/` without a build step.
const repoRoot = path.resolve(__dirname, '..', '..');

const themesDir = path.join(repoRoot, 'themes');

 
const color = require(path.join(repoRoot, 'color-science.js'));
 
const ref = require(path.join(repoRoot, 'tests', 'color-science-reference.json'));

suite('Color science: APCA', () => {

  test('reproduces published reference values', () => {
    for (const c of ref.apca) {
      assert.ok(
        Math.abs(color.apcaLc(c.fg, c.bg) - c.lc) < 1e-9,
        `APCA ${c.fg} on ${c.bg}: got ${color.apcaLc(c.fg, c.bg)}, want ${c.lc}`
      );
    }
  });

  test('sign encodes polarity', () => {
    // Dark text on light background is positive; light on dark is negative.
    // APCA is deliberately asymmetric between the two, so taking an absolute
    // value across a polarity boundary would be a category error.
    assert.ok(color.apcaLc('#000000', '#FFFFFF') > 0, 'black on white must be positive');
    assert.ok(color.apcaLc('#FFFFFF', '#000000') < 0, 'white on black must be negative');
  });

  test('is asymmetric between polarities', () => {
    // The same grey is worth far more on a light background than on black.
    // An implementation that treated the two polarities as mirror images would
    // fail this, and any palette tuned in one polarity would then be mistuned
    // in the other.
    const onLight = color.apcaAbs('#666666', '#FFFFFF');
    const onDark = color.apcaAbs('#666666', '#000000');
    assert.ok(
      onLight > onDark + 30,
      `expected polarity asymmetry, got ${onLight.toFixed(1)} vs ${onDark.toFixed(1)}`
    );
  });

  test('alpha is composited before measuring', () => {
    const opaque = color.apcaAbs('#726D89', '#24212E');
    const translucent = color.apcaAbs('#726D8980', '#24212E');
    assert.ok(
      translucent < opaque,
      `translucent token measured ${translucent} vs opaque ${opaque}; alpha was ignored`
    );
  });

  test('apcaAbs is the magnitude of apcaLc', () => {
    for (const pair of [['#CCC8D9', '#24212E'], ['#4A4555', '#F5F2E8']]) {
      assert.ok(
        Math.abs(color.apcaAbs(pair[0], pair[1]) - Math.abs(color.apcaLc(pair[0], pair[1]))) < 1e-9
      );
    }
  });
});

suite('Color science: WCAG 2.1', () => {

  test('matches independent implementation', () => {
    for (const c of ref.wcag) {
      assert.ok(
        Math.abs(color.wcag21(c.fg, c.bg) - c.ratio) < 1e-9,
        `WCAG ${c.fg} on ${c.bg}: got ${color.wcag21(c.fg, c.bg)}, want ${c.ratio}`
      );
    }
  });

  test('black on white is the maximum ratio', () => {
    assert.ok(Math.abs(color.wcag21('#000000', '#FFFFFF') - 21) < 1e-6);
  });

  test('a color against itself has no contrast', () => {
    assert.ok(Math.abs(color.wcag21('#ABCDEF', '#ABCDEF') - 1) < 1e-9);
  });

  test('alpha compositing lowers the measured ratio', () => {
    const bg = '#24212E';
    const opaque = color.wcag21('#726D89', bg);
    const half = color.wcag21('#726D8950', bg);
    const quarter = color.wcag21('#726D8920', bg);
    assert.ok(quarter < half && half < opaque, 'ratio must increase with opacity');
  });
});

suite('Color science: CIELAB and CIEDE2000', () => {

  test('CIELAB matches an independent implementation', () => {
    for (const entry of ref.lab) {
      const lab = color.rgbToLab(color.parseHex(entry.hex));
      // colour-science rounds its sRGB matrix to 4 decimals, which shifts
      // L* by up to about 0.016. That difference is far below a JND, so it is
      // asserted as a tolerance rather than as exact equality.
      assert.ok(Math.abs(lab.L - entry.lab[0]) < 0.02, `${entry.hex} L* ${lab.L} vs ${entry.lab[0]}`);
      assert.ok(Math.abs(lab.a - entry.lab[1]) < 0.02, `${entry.hex} a* ${lab.a} vs ${entry.lab[1]}`);
      assert.ok(Math.abs(lab.b - entry.lab[2]) < 0.02, `${entry.hex} b* ${lab.b} vs ${entry.lab[2]}`);
    }
  });

  test('CIEDE2000 matches an independent implementation', () => {
    for (const p of ref.pairs) {
      assert.ok(
        Math.abs(color.deltaE00(p.a, p.b) - p.de00) < 0.05,
        `dE00 ${p.a}/${p.b}: got ${color.deltaE00(p.a, p.b)}, want ${p.de00}`
      );
    }
  });

  test('white to black is the known maximum difference', () => {
    assert.ok(Math.abs(color.deltaE00('#FFFFFF', '#000000') - 100) < 0.5);
  });

  test('identical colors have zero difference', () => {
    assert.ok(color.deltaE00('#ABCDEF', '#ABCDEF') < 1e-9);
  });

  test('hue is not reported near the achromatic axis', () => {
    // Near-neutral colours have numerically unstable hue angles, so the library
    // reports 0 and lets callers test chroma instead. Returning a random angle
    // here would make any hue-based logic unreliable on greys.
    const grey = color.rgbToLch(color.parseHex('#808080'));
    assert.ok(grey.C < color.HUE_CHROMA_EPSILON, 'grey should be below the chroma threshold');
    assert.strictEqual(grey.h, 0, 'hue must be 0 below the chroma threshold');
  });
});

suite('Color science: CVD simulation', () => {

  test('neutral axis is preserved exactly', () => {
    // A dichromat still sees grey as grey. Any implementation that does not
    // preserve this has the transform fundamentally wrong, and the failure
    // would be invisible if only chromatic colours were tested.
    for (const kind of ['protan', 'deutan', 'tritan', 'monochrome'] as const) {
      for (const neutral of ['#FFFFFF', '#808080', '#000000']) {
        assert.strictEqual(
          color.simulate(neutral, kind),
          color.toHex(color.parseHex(neutral)),
          `${kind} must leave ${neutral} unchanged`
        );
      }
    }
  });

  test('severity 0 is the identity', () => {
    for (const kind of ['protan', 'deutan', 'tritan', 'monochrome'] as const) {
      assert.strictEqual(color.simulate('#E68484', kind, 0), '#E68484', `${kind} at severity 0`);
    }
  });

  test('applies the projection in linear RGB, not gamma-encoded sRGB', () => {
    // Machado's matrices are linear operators on light. Applying them to
    // gamma-encoded values gives a materially different answer on mid-lightness
    // pastels, which is exactly the range a syntax theme uses. These expected
    // values are the linear-RGB results; the gamma-space results for the same
    // inputs differ by 10-15 dE00.
    for (const c of ref.cvd) {
      assert.strictEqual(color.simulate(c.hex, c.kind as 'protan'), c.linear, `${c.hex} ${c.kind}`);
    }
  });

  test('achromatopsia produces neutral grey', () => {
    const simulated = color.parseHex(color.simulate('#BE9AF7', 'monochrome'));
    assert.ok(Math.abs(simulated.r - simulated.g) < 1e-9, 'r and g must match');
    assert.ok(Math.abs(simulated.g - simulated.b) < 1e-9, 'g and b must match');
  });

  test('chromatic colors are not left unchanged', () => {
    // Guards against a simulator that silently does nothing for chromatic input
    // while still passing the neutral-axis tests above.
    assert.notStrictEqual(color.simulate('#E68484', 'deutan'), '#E68484');
    assert.notStrictEqual(color.simulate('#74D7C8', 'protan'), '#74D7C8');
  });

  test('alpha is preserved through simulation', () => {
    assert.ok(color.simulate('#726D8980', 'deutan').endsWith('80'));
  });
});

suite('Color science: theme audit', () => {

  const files = fs.readdirSync(themesDir).filter((f) => f.endsWith('.json'));

  test('themes directory is not empty', () => {
    assert.ok(files.length > 0);
  });

  for (const file of files) {
    suite(`${file}`, () => {
      const theme = JSON.parse(fs.readFileSync(path.join(themesDir, file), 'utf8'));
      const bg = theme.colors['editor.background'];

      test('every text token meets WCAG AA on its own background', () => {
        const audited: Array<[string, string]> = [
          ['editor.foreground', 'editor.background'],
          ['editorLineNumber.foreground', 'editor.background'],
          ['editor.placeholderForeground', 'editor.background'],
          ['editorGhostText.foreground', 'editorGhostText.background'],
          ['editorError.foreground', 'editor.background'],
          ['editorWarning.foreground', 'editor.background'],
          ['editorInfo.foreground', 'editor.background'],
        ];
        for (const [fg, bgKey] of audited) {
          if (!theme.colors[fg] || !theme.colors[bgKey]) {continue;}
          const ratio = color.wcag21(theme.colors[fg], theme.colors[bgKey]);
          assert.ok(
            ratio >= 4.5,
            `${fg} on ${bgKey} = ${ratio.toFixed(2)}:1 (need 4.5:1), value ${theme.colors[fg]}`
          );
        }
      });

      test('no two competing token colors are isoluminant', () => {
        // Collect distinct token foreground colours, excluding comments and the
        // plain-text substrate, which are deliberately near other tokens.
        interface SemanticRule {
          foreground?: string;
          fontStyle?: string;
        }
        const isComment = (scope: string): boolean =>
          /^(comment|punctuation\.definition\.comment)/.test(scope);
        const substrate = new Set(['property', '*.static']);
        const byHex = new Map<string, { scopes: number; exempt: boolean }>();
        for (const entry of theme.tokenColors) {
          const fg = String(entry.settings.foreground || '').toUpperCase();
          if (!/^#[0-9A-F]{6}$/.test(fg)) {continue;}
          const scopes = Array.isArray(entry.scope) ? entry.scope : [entry.scope];
          if (!byHex.has(fg)) {byHex.set(fg, { scopes: 0, exempt: false });}
          const rec = byHex.get(fg)!;
          rec.scopes += scopes.length;
          if (scopes.some(isComment)) {rec.exempt = true;}
        }
        const semantic = (theme.semanticTokenColors ?? {}) as Record<string, SemanticRule>;
        for (const [selector, rule] of Object.entries(semantic)) {
          const fg = String(rule.foreground || '').toUpperCase();
          if (!/^#[0-9A-F]{6}$/.test(fg) || !byHex.has(fg)) {continue;}
          if (substrate.has(selector) || selector === 'comment' || selector === '*.documentation') {
            byHex.get(fg)!.exempt = true;
          }
        }

        const competing = [...byHex.entries()]
          .filter(([, v]) => !v.exempt)
          .map(([hex]) => color.apcaAbs(hex, bg));

        for (let i = 0; i < competing.length; i++) {
          for (let j = i + 1; j < competing.length; j++) {
            const gap = Math.abs(competing[i] - competing[j]);
            assert.ok(
              gap >= 2,
              `two token colors differ by only ${gap.toFixed(2)} Lc; ` +
                `they are isoluminant and indistinguishable without hue`
            );
          }
        }
      });

      test('every distinct token color meets AA or is an exempt de-emphasis color', () => {
        const exempt = new Set(['#726D89', '#777777']);
        const seen = new Set<string>();
        for (const entry of theme.tokenColors) {
          const fg = String(entry.settings.foreground || '').toUpperCase();
          if (/^#[0-9A-F]{6}$/.test(fg)) {seen.add(fg);}
        }
        for (const fg of seen) {
          if (exempt.has(fg)) {continue;}
          const ratio = color.wcag21(fg, bg);
          assert.ok(ratio >= 4.5, `${fg} on ${bg} = ${ratio.toFixed(2)}:1`);
        }
      });
    });
  }
});
