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
 * Verify that the generated visual-regression pages paint only colours the
 * theme actually declares.
 *
 * Scope of this test, stated precisely, because it is narrower than it looks:
 *
 * It catches the generator falling back to a hardcoded colour. The page
 * builder carries defaults such as
 * `c['editorLineNumber.activeForeground'] || '#c6c6c6'`, and a theme that
 * drops or renames a key gets the default silently. That is a real failure
 * mode — a theme shipping VS Code's blue status bar (#007acc) inside its own
 * palette would be unnoticed by eye and by the pixel diff.
 *
 * It does NOT catch a deliberate change to the theme. The page is generated
 * from the theme, so the two cannot disagree; comparing them is circular. A
 * mutation test confirmed this: changing a token colour in the JSON and
 * re-running passes, because the page is rebuilt to match. Detecting an
 * unintended theme change needs an independent expectation, which is what the
 * committed reference screenshots are for.
 *
 * The pixel-diff test, for its part, has the opposite blind spot. It tolerates
 * a 2% pixel difference to absorb cross-environment rendering variance, and in
 * this theme the comment colour occupies 0.137% of the reference frame, so it
 * could be set to any value at all without a visual regression. The two tests
 * are complementary rather than redundant.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

// Compiled to `out/tests/`, so the repo root is two levels up.
const repoRoot = path.resolve(__dirname, '..', '..');
const themesDir = path.join(repoRoot, 'themes');
const pagesDir = path.join(repoRoot, 'tests', 'visual', 'pages');

 
const { generateVisualPages } = require(path.join(repoRoot, 'tools', 'generate-theme-html.js')) as {
  generateVisualPages: (opts?: { quiet?: boolean }) => string[];
};

/**
 * Extract every colour used in an inline style from generated HTML.
 *
 * Scopes to the `style="..."` attributes the generator emits, rather than
 * scanning the whole document, so `<meta>` colours and the like do not
 * contribute false positives.
 *
 * @param {string} html generated page markup
 * @returns {Set<string>} uppercase hex colours found
 */
function coloursUsedInHtml(html: string): Set<string> {
  const found = new Set<string>();
  const styleRe = /style="([^"]*)"/g;
  const colourRe = /(?:^|[\s;])color:\s*(#[0-9a-fA-F]{6})/g;

  let styleMatch = styleRe.exec(html);
  while (styleMatch !== null) {
    let colourMatch = colourRe.exec(styleMatch[1]);
    while (colourMatch !== null) {
      found.add(colourMatch[1].toUpperCase());
      colourMatch = colourRe.exec(styleMatch[1]);
    }
    styleMatch = styleRe.exec(html);
  }
  return found;
}

/**
 * Every colour the theme declares anywhere a token or UI element could take.
 *
 * `tokenColors` covers syntax, `colors` covers chrome. Both are legitimate
 * sources for the generated page, and neither alone is sufficient: the mock
 * workbench paints with chrome colours while the code sample paints with token
 * colours.
 *
 * @param {Record<string, unknown>} theme parsed theme JSON
 * @returns {Set<string>} uppercase 6-digit hex colours
 */
function coloursDeclaredByTheme(theme: Record<string, unknown>): Set<string> {
  const declared = new Set<string>();
  const add = (value: unknown): void => {
    if (typeof value !== 'string') {return;}
    const upper = value.toUpperCase();
    // Accept both opaque and translucent forms; the generator may composite.
    declared.add(upper.slice(0, 7));
  };
  for (const value of Object.values(theme.colors ?? {})) {add(value);}
  const tokens = (theme.tokenColors ?? []) as Array<{
    settings?: { foreground?: string; background?: string };
  }>;
  for (const entry of tokens) {
    add(entry.settings?.foreground);
    add(entry.settings?.background);
  }
  return declared;
}

suite('Visual page colour provenance', () => {

  const themeFiles = fs.readdirSync(themesDir).filter((f) => f.endsWith('.json'));

  suiteSetup(() => {
    // Regenerate so the test asserts against the current themes rather than
    // against whatever was last built. Without this, editing a theme and
    // running only the unit suite would pass against a stale page.
    if (typeof generateVisualPages !== 'function') {
      throw new Error('generate-theme-html.js must export generateVisualPages()');
    }
    generateVisualPages();
  });

  for (const file of themeFiles) {
    test(`${file}: every colour in the generated page is declared by the theme`, () => {
      const theme = JSON.parse(fs.readFileSync(path.join(themesDir, file), 'utf8'));
      const htmlPath = path.join(pagesDir, file.replace('.json', '.html'));

      assert.ok(fs.existsSync(htmlPath), `generated page missing: ${htmlPath}`);
      const html = fs.readFileSync(htmlPath, 'utf8');
      const used = coloursUsedInHtml(html);
      const declared = coloursDeclaredByTheme(theme);

      const unknown = [...used].filter((colour) => !declared.has(colour));
      assert.strictEqual(
        unknown.length,
        0,
        `page paints colours the theme does not declare: ${unknown.join(', ')}. ` +
          'The generator has drifted from the theme JSON.'
      );
    });

    test(`${file}: the page is not empty`, () => {
      const htmlPath = path.join(pagesDir, file.replace('.json', '.html'));
      const html = fs.readFileSync(htmlPath, 'utf8');
      assert.ok(html.length > 1000, `generated page suspiciously small: ${html.length} bytes`);
      assert.ok(coloursUsedInHtml(html).size > 3, 'page paints fewer than 4 colours');
    });
  }
});
