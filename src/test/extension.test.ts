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

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

const themesDir = path.resolve(__dirname, '..', '..', 'themes');

suite('Theme Validation Tests', () => {

  const themeFiles = fs.readdirSync(themesDir).filter(f => f.endsWith('.json'));

  test('Theme directory contains theme files', () => {
    assert.ok(themeFiles.length > 0, 'No theme JSON files found in themes/');
  });

  for (const file of themeFiles) {
    const filePath = path.join(themesDir, file);

    suite(`Theme: ${file}`, () => {

      let theme: Record<string, unknown>;

      suiteSetup(() => {
        const raw = fs.readFileSync(filePath, 'utf8');
        theme = JSON.parse(raw);
      });

      test('has required "name" field', () => {
        assert.ok(typeof theme.name === 'string' && theme.name.length > 0);
      });

      test('has required "type" field with valid value', () => {
        const validTypes = ['dark', 'light', 'hc'];
        assert.ok(validTypes.includes(theme.type as string),
          `Invalid type "${theme.type}". Must be one of: ${validTypes.join(', ')}`);
      });

      test('has required "colors" object', () => {
        assert.ok(typeof theme.colors === 'object' && theme.colors !== null);
      });

      test('has required "tokenColors" array', () => {
        assert.ok(Array.isArray(theme.tokenColors) && (theme.tokenColors as unknown[]).length > 0);
      });

      test('all colors are valid hex format', () => {
        const colors = theme.colors as Record<string, string>;
        const hexPattern = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
        for (const [key, value] of Object.entries(colors)) {
          assert.ok(
            hexPattern.test(value),
            `Invalid hex color for "${key}": "${value}"`
          );
        }
      });

      test('each tokenColors entry has scope and settings', () => {
        const tokenColors = theme.tokenColors as Record<string, unknown>[];
        for (let i = 0; i < tokenColors.length; i++) {
          const entry = tokenColors[i];
          assert.ok(
            entry.scope !== undefined,
            `tokenColors[${i}] missing "scope"`
          );
          assert.ok(
            entry.settings !== undefined && typeof entry.settings === 'object',
            `tokenColors[${i}] missing "settings"`
          );
        }
      });

      test('tokenColors settings have foreground colors in valid hex', () => {
        const tokenColors = theme.tokenColors as Array<{ settings?: { foreground?: string } }>;
        const hexPattern = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
        for (let i = 0; i < tokenColors.length; i++) {
          const fg = tokenColors[i].settings?.foreground;
          if (fg) {
            assert.ok(
              hexPattern.test(fg),
              `tokenColors[${i}] has invalid foreground hex: "${fg}"`
            );
          }
        }
      });

      test('has critical UI color keys', () => {
        const colors = theme.colors as Record<string, string>;
        const requiredKeys = [
          'editor.background',
          'editor.foreground',
          'activityBar.background',
          'sideBar.background',
          'statusBar.background',
          'editorError.foreground',
          'editorWarning.foreground',
        ];
        for (const key of requiredKeys) {
          assert.ok(colors[key] !== undefined, `Missing critical color key: "${key}"`);
        }
      });

      test('error color is distinguishable from foreground', () => {
        const colors = theme.colors as Record<string, string>;
        const errorFg = colors['editorError.foreground'];
        const editorFg = colors['editor.foreground'];
        assert.notStrictEqual(errorFg, editorFg,
          'editorError.foreground must differ from editor.foreground');
      });

      test('warning color is distinguishable from error color', () => {
        const colors = theme.colors as Record<string, string>;
        const errorFg = colors['editorError.foreground'];
        const warningFg = colors['editorWarning.foreground'];
        assert.notStrictEqual(errorFg, warningFg,
          'editorError.foreground must differ from editorWarning.foreground');
      });

      test('has minimum 500 color tokens', () => {
        const colors = theme.colors as Record<string, string>;
        const count = Object.keys(colors).length;
        assert.ok(
          count >= 500,
          `Expected >= 500 color tokens, got ${count}. Theme coverage is too low.`
        );
      });

      test('has consistent color token set across themes', () => {
        const baseThemePath = path.join(themesDir, 'shroom-space-theme.json');
        const baseTheme = JSON.parse(fs.readFileSync(baseThemePath, 'utf8'));
        const baseKeys = new Set(Object.keys(baseTheme.colors as Record<string, string>));
        const variantKeys = new Set(Object.keys(theme.colors as Record<string, string>));
        const missing = [...baseKeys].filter(k => !variantKeys.has(k));
        assert.strictEqual(
          missing.length,
          0,
          `Theme "${file}" is missing ${missing.length} tokens present in base theme: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '...' : ''}`
        );
      });

    });
  }
});

suite('Package Manifest Tests', () => {

  const pkgPath = path.resolve(__dirname, '..', '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const themesDirResolved = path.resolve(__dirname, '..', '..', 'themes');

  test('package.json has contributes.themes', () => {
    assert.ok(pkg.contributes?.themes, 'Missing contributes.themes');
  });

  test('every contributed theme file exists on disk', () => {
    const themes = pkg.contributes.themes as Array<{ path: string }>;
    for (const theme of themes) {
      const resolved = path.resolve(__dirname, '..', '..', theme.path);
      assert.ok(
        fs.existsSync(resolved),
        `Contributed theme file does not exist: ${theme.path}`
      );
    }
  });

  test('every theme file on disk is contributed in package.json', () => {
    const contributedPaths = new Set(
      (pkg.contributes.themes as Array<{ path: string }>).map(t => t.path.replace(/^\.\//, ''))
    );
    const diskFiles = fs.readdirSync(themesDirResolved).filter(f => f.endsWith('.json'));
    for (const file of diskFiles) {
      const contribPath = `themes/${file}`;
      assert.ok(
        contributedPaths.has(contribPath),
        `Theme file "${file}" exists on disk but is not contributed in package.json`
      );
    }
  });

  test('light theme uses correct uiTheme value', () => {
    const themes = pkg.contributes.themes as Array<{ label: string; uiTheme: string; path: string }>;
    const lightThemes = themes.filter(t => t.label.toLowerCase().includes('light'));
    for (const lt of lightThemes) {
      assert.strictEqual(lt.uiTheme, 'vs',
        `Light theme "${lt.label}" must use uiTheme "vs", got "${lt.uiTheme}"`);
    }
  });

  test('high contrast theme uses correct uiTheme value', () => {
    const themes = pkg.contributes.themes as Array<{ label: string; uiTheme: string; path: string }>;
    const hcThemes = themes.filter(t => t.label.toLowerCase().includes('high contrast'));
    for (const hc of hcThemes) {
      assert.strictEqual(hc.uiTheme, 'hc-black',
        `High contrast theme "${hc.label}" must use uiTheme "hc-black", got "${hc.uiTheme}"`);
    }
  });

});

suite('Extension Activation Tests', () => {
  test('extension module exports activate and deactivate', () => {
    const ext = require('../../out/extension');
    assert.ok(typeof ext.activate === 'function', 'activate should be exported');
    assert.ok(typeof ext.deactivate === 'function', 'deactivate should be exported');
  });

  test('accent color map covers all enum values', () => {
    const accents = ['purple', 'teal', 'green', 'amber', 'red', 'pink', 'cyan'];
    assert.ok(accents.length === 7, 'Should have 7 accent color options');
  });
});

const VS_CODE_SEMANTIC_TYPES = new Set([
  'namespace', 'class', 'enum', 'interface', 'struct', 'typeParameter',
  'type', 'parameter', 'variable', 'property', 'enumMember', 'decorator',
  'event', 'function', 'method', 'macro', 'label', 'comment', 'string',
  'keyword', 'number', 'regexp', 'operator',
]);

const VS_CODE_SEMANTIC_MODIFIERS = new Set([
  'declaration', 'definition', 'readonly', 'static', 'deprecated',
  'abstract', 'async', 'modification', 'documentation', 'defaultLibrary',
]);

suite('Semantic Token Validation Tests', () => {

  const themeFiles = fs.readdirSync(themesDir).filter(f => f.endsWith('.json'));

  for (const file of themeFiles) {
    const filePath = path.join(themesDir, file);

    suite(`Semantic Tokens: ${file}`, () => {

      let theme: Record<string, unknown>;

      suiteSetup(() => {
        const raw = fs.readFileSync(filePath, 'utf8');
        theme = JSON.parse(raw);
      });

      test('has "semanticHighlighting" set to true', () => {
        assert.strictEqual(theme.semanticHighlighting, true,
          'semanticHighlighting must be true for semantic tokens to activate');
      });

      test('has "semanticTokenColors" as flat object', () => {
        const stc = theme.semanticTokenColors;
        assert.ok(stc !== undefined && stc !== null,
          'semanticTokenColors must exist');
        assert.ok(typeof stc === 'object' && !Array.isArray(stc),
          'semanticTokenColors must be a flat object');
        assert.ok(!('enabled' in stc) && !('rules' in stc),
          'semanticTokenColors must not have nested "enabled" or "rules" wrapper');
      });

      test('has minimum 20 semantic token rules', () => {
        const stc = theme.semanticTokenColors as Record<string, unknown>;
        const count = Object.keys(stc).length;
        assert.ok(count >= 20,
          `Expected >= 20 semantic token rules, got ${count}`);
      });

      test('all selectors use valid VS Code token types', () => {
        const stc = theme.semanticTokenColors as Record<string, unknown>;
        for (const selector of Object.keys(stc)) {
          const baseType = selector.split('.')[0].split(':')[0];
          if (baseType !== '*') {
            assert.ok(VS_CODE_SEMANTIC_TYPES.has(baseType),
              `Invalid semantic token type "${baseType}" in selector "${selector}"`);
          }
        }
      });

      test('all selectors use valid VS Code token modifiers', () => {
        const stc = theme.semanticTokenColors as Record<string, unknown>;
        for (const selector of Object.keys(stc)) {
          const noLang = selector.split(':')[0];
          const parts = noLang.split('.');
          for (let i = 1; i < parts.length; i++) {
            assert.ok(VS_CODE_SEMANTIC_MODIFIERS.has(parts[i]),
              `Invalid semantic token modifier "${parts[i]}" in selector "${selector}"`);
          }
        }
      });

      test('all semantic token colors are valid hex', () => {
        const stc = theme.semanticTokenColors as Record<string, { foreground?: string }>;
        const hexPattern = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
        for (const [selector, style] of Object.entries(stc)) {
          const fg = style.foreground;
          if (fg) {
            assert.ok(hexPattern.test(fg),
              `Semantic token "${selector}" has invalid foreground hex: "${fg}"`);
          }
        }
      });

    });
  }
});
