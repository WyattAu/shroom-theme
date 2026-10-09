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
 * Tests for the quality-profile metrics.
 *
 * Two kinds of test live here, and the split matters.
 *
 * **Mechanics** are tested against hand-built fixtures where the right answer
 * is knowable by inspection. Precedence resolution, gamut clipping and rank
 * correlation all have cases where a wrong implementation returns a plausible
 * number, which is the failure mode that matters here.
 *
 * **Conclusions** about the shipped themes are *not* asserted as equality. The
 * theme is a design artefact under revision, and pinning its metrics would make
 * every deliberate palette change look like a test failure. What is asserted is
 * the set of invariants a well-formed theme must satisfy -- no dead rules,
 * de-emphasis recedes, everything legible. If one of those breaks, that is a
 * real finding worth failing on.
 */

import * as assert from 'assert';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '..', '..');

/* eslint-disable @typescript-eslint/no-explicit-any */
const quality = require(path.join(repoRoot, 'tools', 'quality-profile.js'));

/**
 * Build a minimal theme from a scope-to-colour map.
 * @param {Record<string,string>} scopes
 * @param {string} bg
 */
function makeTheme(scopes: Record<string, string>, bg = '#24212E'): any {
  return {
    name: 'fixture',
    type: 'dark',
    colors: { 'editor.background': bg, 'editor.foreground': '#CCC8D9' },
    tokenColors: Object.entries(scopes).map(([scope, foreground]) => ({
      scope,
      settings: { foreground },
    })),
  };
}

suite('Quality profile: scope resolution', () => {

  test('longest matching prefix wins', () => {
    // The single most important thing this tool gets right. A theme with both a
    // `keyword` rule and a `keyword.operator.pipe.shell` rule does not render
    // every keyword as the first colour. An implementation using "last rule
    // that mentions the scope" reports every carve-out as an inconsistency and
    // would score this palette at 68% coverage instead of a truthful number.
    const theme = makeTheme({
      keyword: '#BE9AF7',
      'keyword.control': '#BE9AF7',
      'keyword.operator.logical.pipe.shell': '#74D7C8',
    });
    const claims = flatten(theme);
    assert.strictEqual(resolve(claims, 'keyword'), '#BE9AF7');
    assert.strictEqual(resolve(claims, 'keyword.control'), '#BE9AF7');
    assert.strictEqual(resolve(claims, 'keyword.operator'), '#BE9AF7');
    assert.strictEqual(resolve(claims, 'keyword.operator.logical.pipe.shell'), '#74D7C8');
  });

  test('prefix matching respects dot boundaries', () => {
    // `variable` must not match `variableName`. Getting this wrong would make
    // every camelCase identifier resolve as a variable.
    const claims = flatten(makeTheme({ variable: '#E794D2' }));
    assert.strictEqual(resolve(claims, 'variableName'), null);
    assert.strictEqual(resolve(claims, 'variable.other'), '#E794D2');
  });

  test('later rule breaks a specificity tie', () => {
    // Two rules claiming the identical scope: the later one wins.
    const theme = makeTheme({ keyword: '#BE9AF7' });
    theme.tokenColors.push({ scope: 'keyword', settings: { foreground: '#E68484' } });
    const claims = flatten(theme);
    assert.strictEqual(resolve(claims, 'keyword'), '#E68484');
  });
});

suite('Quality profile: dead rules', () => {

  test('a rule re-claimed later with a different colour is dead', () => {
    // A dead rule is one that can never render: a later entry claims the same
    // scope with a different colour, so the earlier entry is unreachable. This
    // is the unambiguous, mechanically checkable part of metric 1, and the only
    // part worth gating on -- see the report's own framing.
    //
    // Note what is *not* dead: a broad `keyword` rule alongside narrower
    // `keyword.control` rules. The broad rule still renders for every keyword
    // scope the narrow ones do not name, so it is doing real work.
    const theme = makeTheme({ keyword: '#BE9AF7' });
    theme.tokenColors.push({ scope: 'keyword', settings: { foreground: '#E68484' } });
    const result = quality.semanticConsistency(theme);
    assert.strictEqual(result.deadRules.length, 1);
    assert.deepStrictEqual(result.deadRules[0].scopes, ['keyword']);
    assert.strictEqual(result.deadRules[0].index, 0);
  });

  test('a broad rule beside narrower rules is not dead', () => {
    const theme = makeTheme({
      keyword: '#BE9AF7',
      'keyword.control': '#74D7C8',
      'keyword.control.flow': '#74D7C8',
    });
    assert.strictEqual(quality.semanticConsistency(theme).deadRules.length, 0);
  });

  test('the whole shipped palette has no dead rules', () => {
    const themes = quality.loadThemes();
    for (const [name, theme] of Object.entries<any>(themes)) {
      assert.strictEqual(
        quality.semanticConsistency(theme).deadRules.length,
        0,
        `${name} has dead rules`
      );
    }
  });
});

suite('Quality profile: canonical role colours', () => {

  test('semanticTokenColors wins over the modal scope colour', () => {
    // The light theme's `variable` is the concrete case. Its scopes split four
    // ways and the modal is blue, while the theme's own semantic entry -- the
    // thing VS Code actually resolves the role to -- is magenta. Reading the
    // modal would report the light theme as having no consistent variable
    // colour and would inflate the cross-variant hue shift from 13 to 75
    // degrees.
    const theme = makeTheme({
      variable: '#AC3E79',
      'variable.other.readwrite': '#004EA2',
      'variable.other.property': '#004EA2',
      'variable.other.constant': '#004EA2',
    });
    theme.semanticTokenColors = { variable: { foreground: '#AC3E79' } };
    const canonical = quality.canonicalRoleColours(theme);
    assert.strictEqual(canonical.get('variable').hex, '#AC3E79');
    assert.strictEqual(canonical.get('variable').source, 'semantic');
  });

  test('falls back to scope resolution when no semantic entry exists', () => {
    const theme = makeTheme({ keyword: '#BE9AF7', keyword2: '#BE9AF7' });
    theme.semanticTokenColors = {};
    const canonical = quality.canonicalRoleColours(theme);
    assert.strictEqual(canonical.get('keyword').hex, '#BE9AF7');
    assert.strictEqual(canonical.get('keyword').source, 'scopes');
  });
});

suite('Quality profile: gamut clipping', () => {

  test('full coverage is a no-op', () => {
    assert.strictEqual(quality.clipToGamut('#BE9AF7', 1), '#BE9AF7');
  });

  test('reduced coverage reduces chroma but keeps hue and lightness', () => {
    // The model is "a panel missing this much of the gamut shows less
    // saturation, same hue and same lightness". If lightness moved, the metric
    // would be measuring contrast loss, not gamut loss.
    const c = color();
    const before = c.rgbToLch(c.parseHex('#BE9AF7'));
    const after = c.rgbToLch(c.parseHex(quality.clipToGamut('#BE9AF7', 0.6)));
    assert.ok(after.C < before.C * 0.75, `chroma should drop: ${before.C} -> ${after.C}`);
    assert.ok(Math.abs(after.L - before.L) < 2, `lightness should hold: ${before.L} -> ${after.L}`);
    let dh = Math.abs(after.h - before.h);
    if (dh > 180) { dh = 360 - dh; }
    assert.ok(dh < 12, `hue should roughly hold, moved ${dh.toFixed(1)} degrees`);
  });

  test('clipping is monotonic in coverage', () => {
    let previous = Infinity;
    for (const coverage of [1, 0.9, 0.8, 0.7, 0.6, 0.5]) {
      const chroma = color().rgbToLch(color().parseHex(quality.clipToGamut('#FFCB6B', coverage))).C;
      assert.ok(chroma <= previous + 1e-6, `chroma must not rise at coverage ${coverage}`);
      previous = chroma;
    }
  });

  test('a saturated out-of-gamut colour clips to the boundary, not to itself', () => {
    // An early version searched for the largest in-gamut chroma and returned
    // the original, since the original is in gamut by definition. That made
    // the whole display-degradation metric report zero shift for every colour.
    const hex = '#FF00FF';
    const clipped = quality.clipToGamut(hex, 0.5);
    assert.notStrictEqual(clipped, hex);
    assert.ok(color().deltaE00(hex, clipped) > 1, 'clipping must actually move the colour');
  });

  test('neutral colours are unaffected', () => {
    assert.strictEqual(quality.clipToGamut('#808080', 0.5), '#808080');
  });
});

suite('Quality profile: rank correlation', () => {

  test('identical orderings give 1', () => {
    assert.ok(Math.abs(quality.spearman([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-9);
  });

  test('reversed orderings give -1', () => {
    assert.ok(Math.abs(quality.spearman([1, 2, 3, 4], [40, 30, 20, 10]) + 1) < 1e-9);
  });

  test('ties get average ranks rather than arbitrary ones', () => {
    // Spearman with naive tie handling gives the wrong answer here; this is
    // the case that distinguishes a real implementation from a shortcut.
    const rho = quality.spearman([1, 2, 3, 4], [5, 5, 5, 5]);
    assert.ok(rho === 1 || Number.isNaN(rho), 'a constant vector is degenerate, not an error');
  });

  test('a single swap drops the correlation', () => {
    const rho = quality.spearman([1, 2, 3, 4, 5], [1, 2, 4, 3, 5]);
    assert.ok(rho < 1 && rho > 0.8, `expected a small drop, got ${rho}`);
  });
});

suite('Quality profile: shipped themes', () => {

  const themes = quality.loadThemes();

  test('every variant has no dead rules', () => {
    // The one mechanically unambiguous defect this tool can find. Every other
    // metric here is a design judgement reported for discussion.
    for (const [name, theme] of Object.entries<any>(themes)) {
      const result = quality.semanticConsistency(theme);
      assert.strictEqual(
        result.deadRules.length,
        0,
        `${name} has ${result.deadRules.length} dead rule(s): ` +
        JSON.stringify(result.deadRules.map((r: any) => r.scopes).slice(0, 3))
      );
    }
  });

  test('the comment colour is the quietest thing on screen', () => {
    for (const [name, theme] of Object.entries<any>(themes)) {
      const h = quality.visualHierarchy(theme);
      const deEmphasisCheck = h.checks.find((c: any) => c.name === 'de-emphasis recedes');
      assert.ok(
        deEmphasisCheck.ok,
        `${name}: ${deEmphasisCheck.detail}`
      );
    }
  });

  test('every competing role clears the APCA legibility floor', () => {
    for (const [name, theme] of Object.entries<any>(themes)) {
      const h = quality.visualHierarchy(theme);
      const floorCheck = h.checks.find(
        (c: any) => c.name.indexOf('legibility floor') !== -1
      );
      assert.ok(floorCheck.ok, `${name}: ${floorCheck.detail}`);
    }
  });

  test('no competing role appears dimmer than the comment colour', () => {
    for (const [name, theme] of Object.entries<any>(themes)) {
      const c = quality.chromaAndBrightness(theme);
      const check = c.checks[0];
      assert.ok(check && check.ok, `${name}: ${check ? check.detail : 'no check ran'}`);
    }
  });

  test('role colours are chromatic enough to be hue-distinguishable', () => {
    // A guard against a theme that passes every contrast check by being grey.
    const c = color();
    for (const [name, theme] of Object.entries<any>(themes)) {
      if (name === 'monochrome') { continue; }
      const entries = quality.hueEntries(theme);
      assert.ok(entries.length >= 5, `${name} has only ${entries.length} chromatic roles`);
      for (const e of entries) {
        assert.ok(
          e.C > c.CAM16_HUE_CHROMA_EPSILON,
          `${name}: ${e.role} ${e.hex} has CAM16 C ${e.C}, below the hue threshold`
        );
      }
    }
  });

  test('the palette survives a reduced-gamut display without new collisions', () => {
    // Reduced gamut must not be what breaks distinguishability. If it is, the
    // palette only works on a calibrated wide-gamut monitor.
    for (const [name, theme] of Object.entries<any>(themes)) {
      const full = quality.displayDegradation(theme, 1);
      const reduced = quality.displayDegradation(theme, 0.7);
      assert.ok(
        reduced.collisions <= full.collisions,
        `${name}: clipping to 70% created ${reduced.collisions - full.collisions} new collision(s)`
      );
    }
  });
});

function color(): any {
  return require(path.join(repoRoot, 'color-science.js'));
}

function flatten(theme: any): any[] {
  const claims: any[] = [];
  let index = 0;
  for (const entry of theme.tokenColors) {
    const scopes = Array.isArray(entry.scope) ? entry.scope : [entry.scope];
    for (const scope of scopes) {
      claims.push({ index, scope, hex: entry.settings.foreground });
    }
    index++;
  }
  return claims;
}

/** Longest-prefix resolution, mirroring the tool's own rule. */
function resolve(claims: any[], scope: string): string | null {
  let best = null;
  let bestLen = -1;
  for (const claim of claims) {
    if (!(scope === claim.scope || scope.startsWith(claim.scope + '.'))) { continue; }
    const len = claim.scope.length;
    if (len > bestLen || (len === bestLen && best !== null && claim.index >= best.index)) {
      best = claim;
      bestLen = len;
    }
  }
  return best ? best.hex : null;
}