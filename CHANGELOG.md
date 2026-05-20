# Changelog

All notable changes to the Shroom Space Theme extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
