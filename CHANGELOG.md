# Changelog

All notable changes to the Shroom Space Theme extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-21

### Added

- Playwright visual regression testing framework with 7 tests (one per theme)
- `tools/generate-theme-html.js`: generates styled HTML pages from theme colors for screenshot capture
- `tests/visual/visual-regression.spec.ts`: pixel-diff comparison with 1% threshold
- `tests/visual/playwright.config.ts`: Playwright configuration
- 7 reference screenshots in `tests/visual/references/`
- `npm run test:visual`: runs visual regression tests
- `npm run test:visual:update`: regenerates reference screenshots from scratch
- `npm run generate-visual-pages`: generates HTML test pages
- CI: Playwright visual regression tests run on every push
- CI: Visual regression diffs uploaded as artifacts on failure
- Extension icon (`icon.png`) - mushroom and stars on dark cosmic background
- 7 marketplace screenshots in `screenshots/` directory
- Marketplace metadata: description, keywords (cvd, accessibility, wcag, color-blind), gallery banner, screenshots
- Homepage URL updated to GitHub Pages site

### Changed

- Version bumped to 1.0.0
- `package.json` description updated with full feature summary
- Keywords expanded from 4 to 16 (added: dark, light, cvd, color-blind, deuteranopia, protanopia, tritanopia, high-contrast, monochrome, accessibility, wcag)
- `.gitignore` updated to exclude generated visual test artifacts (pages/, diffs/, test-results/)
- ROADMAP updated: Phases 4 and 5 marked completed

## [0.3.0] - 2026-05-21

### Added

- 509 new color tokens added to base dark theme (111 -> 620 total, 68% of VS Code API)
- All 509 tokens propagated to all 6 variant themes with proper color derivation:
  - Light theme: background inversion, accent color adaptation for light surfaces
  - Deuteranopia: green -> amber substitution
  - Protanopia: red -> coral, green -> amber substitution
  - Tritanopia: blue/teal -> pink/cyan, green -> lime substitution
  - Monochrome: all accents -> differentiated grayscale
  - High contrast: maximum brightness on pure black
- 70 new tokenColors entries per theme (11 -> 81 total) covering:
  - Operators (arithmetic, bitwise, assignment, comparison, logical, type)
  - Punctuation (separators, terminators, brackets, delimiters)
  - Regular expressions
  - Markdown/markup (headings, bold, italic, strikethrough, lists, links, code blocks, quotes)
  - HTML/XML/JSX/TSX tags and attributes
  - Decorators/annotations
  - CSS/SCSS/Less property names, selectors, units, pseudo-classes
  - JSON, YAML, TOML keys
  - Shell operators and builtins
  - SQL keywords
  - GraphQL operations
  - Rust lifetimes, types, operators
  - Go types and packages
  - Python operators, types, decorators
  - Java/Kotlin types
  - C/C++ types, structs, enums
  - Environment variable definitions
  - Diff markup (inserted, deleted)
  - Invalid/deprecated tokens
- 51 new semanticTokenColors rules per theme (6 -> 57 total) covering:
  - Type system: enum, struct, typeParameter, interface, namespace, module
  - Functions: function, decorator, defaultLibrary variants
  - Variables: constant, readonly, static, global, defaultLibrary
  - Keywords: controlKeyword, operator modifiers
  - Markup: heading, bold, italic, strikethrough, link
  - Operators: arithmetic, bitwise, comparison, logical, assignment
  - Modifiers: readonly, global, defaultLibrary, declaration
  - Framework-specific: Angular (component, directive, pipe, service), React (hook, component.tag)
- Test: minimum 500 color token count assertion per theme
- Test: cross-theme color token consistency check (all variants match base theme key set)

### Changed

- Light theme `activityBarBadge.foreground` changed from `#F5F2E8` to `#FFFFFF` for WCAG AA compliance (4.43:1 -> 4.97:1)
- Version bumped to 0.3.0
- ROADMAP.md updated: Phase 2 marked completed
- 90 total tests (up from 76)

## [0.2.0] - 2026-05-21

### Added

- WCAG 2.1 contrast ratio validation integrated into `validate-themes.js`
- `wcag-contrast.js` module: relative luminance, contrast ratio, AA/AAA checks, theme pair auditing
- Automated WCAG contrast report generation (`.reports/wcag-*.md`) on every validation run
- `tools/convert.js`: multi-editor theme conversion tool generating 4 formats per theme:
  - TextMate `.tmTheme` (Sublime Text, Atom, TextMate)
  - JetBrains `.icls` (IntelliJ, WebStorm, PyCharm, GoLand)
  - Vim/Neovim `.vim` color scheme
  - Windows Terminal JSON fragment
- 28 total export files across 4 formats for all 7 themes
- `npm run convert` script for on-demand theme conversion
- CI: WCAG reports uploaded as artifacts on every run
- CI: Converted themes validated for parse correctness (XML, Vim syntax, JSON)
- CI: Converted themes uploaded as artifacts
- CI: GitHub Release includes multi-editor exports alongside `.vsix`
- Repository description updated from outdated "Monaspace font based Theme"

### Changed

- All 7 theme text-foreground colors now pass WCAG AA (4.5:1 minimum contrast ratio)
- Version bumped from 0.1.0 to 0.2.0

### Fixed

- Dark theme variants (base, deuteranopia, protanopia, tritanopia): `input.placeholderForeground` lightened from `#726D89` to `#a29fb1` (2.36:1 -> 4.50:1)
- Dark theme variants: `activityBar.inactiveForeground`, `tab.inactiveForeground`, `titleBar.inactiveForeground` lightened from `#726D89` to `#87839b` (3.40:1 -> 4.59:1)
- Dark theme variants: `terminal.ansiBrightBlack` lightened from `#726D89` to `#8b879e` (3.20:1 -> 4.55:1)
- Light theme: `editorError.foreground` adjusted from `#B45353` to `#b05151` (4.36:1 -> 4.53:1)
- Light theme: `editorWarning.foreground` adjusted from `#8C6D34` to `#886a32` (4.31:1 -> 4.51:1)
- Light theme: `input.placeholderForeground` darkened from `#948E9E` to `#6b6672` (2.59:1 -> 4.54:1)
- Light theme: `list.highlightForeground` darkened from `#8B5F9E` to `#724e82` (3.35:1 -> 4.53:1)
- Light theme: `activityBar.inactiveForeground`, `tab.inactiveForeground`, `titleBar.inactiveForeground` darkened from `#948E9E` to `#635f6a` (2.34:1 -> 4.60:1)
- Light theme: `terminal.ansiBrightBlack` darkened from `#948E9E` to `#706c78` (2.83:1 -> 4.57:1)
- Light theme: `badge.foreground` adjusted from `#F5F2E8` to `#f7f4ea` (4.43:1 -> 4.51:1)
- Monochrome: `input.placeholderForeground` lightened from `#777777` to `#b1b1b1` (2.17:1 -> 4.54:1)
- Monochrome: `activityBar.inactiveForeground`, `tab.inactiveForeground`, `titleBar.inactiveForeground` lightened from `#777777` to `#7a7a7a` (4.42:1 -> 4.61:1)
- Monochrome: `terminal.ansiBrightBlack` lightened from `#777777` to `#858585` (3.81:1 -> 4.62:1)
- High Contrast: `list.highlightForeground` lightened from `#AD58FF` to `#bf7dff` (3.38:1 -> 4.57:1)

## [0.1.0] - 2026-05-20

### Added

- Shroom Space Light theme (light variant with warm earth-tone palette)
- Shroom Space theme to package.json contributes (was present on disk but unlisted)
- Missing `property` semantic token rule to deuteranopia, protanopia, tritanopia, monochrome, and high-contrast themes
- Missing `name` field on tokenColors entry "Preprocessor, Annotations, Decorators, Attributes" in 5 variant themes
- Comprehensive theme validation script (`validate-themes.js`) with hex format, structure, accessibility, and manifest checks
- 76-test suite covering theme structure, hex format validity, accessibility color distinguishability, and package manifest consistency
- Strict ESLint configuration with error-level rules: `no-console`, `no-debugger`, `prefer-const`, `no-unused-vars`, `no-explicit-any`, `explicit-function-return-type`
- Theme validation integrated into `npm test` pipeline via `pretest` script
- Git pre-commit hook enforcing lint, compile, and validation before commits
- Showcase sample files for 8 programming languages

### Changed

- High Contrast theme type changed from `dark`/`vs-dark` to `hc`/`hc-black` for proper VS Code high-contrast integration
- `extension.ts`: removed scaffold stub code (unused helloWorld command, vscode import), replaced with minimal activation stub
- `extension.test.ts`: replaced placeholder `Array.indexOf` test with 76 structural and semantic theme validation tests
- `eslint.config.mjs`: all rules upgraded from `warn` to `error`; added `no-console`, `no-debugger`, `prefer-const`, `@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-explicit-any`, `@typescript-eslint/explicit-function-return-type`, `no-empty-function`
- `.vscode/tasks.json`: replaced Windows CMD syntax with cross-platform `node` command; added Validate Themes task
- CI workflow: upgraded Node.js from 18 to 22; added separate lint and validation steps
- Publish workflow: upgraded Node.js from 20 to 22; added lint, validation, and test steps before packaging
- `LICENSE`: replaced placeholder copyright with "Copyright 2024-2026 Wyatt Au"
- Copyright headers in source files updated to "Copyright 2024-2026 Wyatt Au"

### Fixed

- Deuteranopia: `editorBracketHighlight.foreground2` and `foreground4` were identical (`#FFCB6B`), now differentiated (`#74D7C8` and `#82AAFF`)
- Deuteranopia: `terminal.ansiCyan` and `terminal.ansiYellow` were identical (`#FFCB6B`), now `#74D7C8` and `#FFCB6B`
- Protanopia: same bracket and terminal color collisions as deuteranopia, fixed with identical adjustments
- Tritanopia: `editorError.foreground` and `editorWarning.foreground` were identical (`#E68484`), now `#E68484` and `#89DDFF`
- Tritanopia: `notificationsWarningIcon.foreground` changed from `#E68484` to `#C3E88D` to distinguish from error icon
- Tritanopia: `editorBracketHighlight.foreground2` and `foreground3` were identical (`#FF79C6`), now `#FF79C6` and `#C3E88D`
- Tritanopia: `terminal.ansiBlue` and `terminal.ansiMagenta` were identical (`#FF79C6`), now `#89DDFF` and `#FF79C6`
- Monochrome: `editorError.foreground` and `editor.foreground` were identical (`#CCCCCC`), now `#FFFFFF`
- Monochrome: `errorForeground` and `foreground` were identical (`#CCCCCC`), now `#FFFFFF`
- Monochrome: bracket highlight levels 1 and 2 were identical (`#FFFFFF`), now `#FFFFFF` and `#DDDDDD`
- Monochrome: `terminal.ansiBlue` and `terminal.ansiMagenta` were identical (`#FFFFFF`), now `#DDDDDD` and `#999999`
- Monochrome: `terminal.ansiRed` and `terminal.ansiYellow` were identical (`#AAAAAA`), now `#CCCCCC` and `#AAAAAA`
- High Contrast: bracket highlight levels 1 and 4 were identical (`#FFD978`), now `#FFD978` and `#FF9C6B`
- High Contrast: `terminal.ansiBlue` and `terminal.ansiCyan` were identical (`#4AF8E1`), now `#AD58FF` and `#4AF8E1`

## [0.0.5] - 2025-05-14

### Added

- Initial release with 6 dark theme variants (base, deuteranopia, protanopia, tritanopia, monochrome, high contrast)
- Showcase sample files for visual testing
- Basic ESLint and TypeScript configuration
- CI workflow via GitHub Actions
- Publish workflow for VS Code Marketplace
