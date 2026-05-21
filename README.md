# Shroom Space Theme

A dark VS Code color theme extension with accessibility-focused variants. Provides 7 theme configurations covering standard dark, light, and color-vision-deficiency (CVD) adapted palettes.

## Themes

| Theme | Type | Description |
|---|---|---|
| Shroom Space | Dark | Base dark theme. Purple/teal/green palette. |
| Shroom Space Light | Light | Light variant. Warm earth-tone backgrounds. |
| Shroom Space (Deuteranopia) | Dark | Adapted for deuteranopia (green-weak CVD). Blue-shifted additions. |
| Shroom Space (Protanopia) | Dark | Adapted for protanopia (red-blind CVD). Coral-shifted errors. |
| Shroom Space (Tritanopia) | Dark | Adapted for tritanopia (blue-yellow CVD). Pink/cyan-shifted accents. |
| Shroom Space (Monochrome) | Dark | Grayscale palette. Error indicators use luminance contrast. |
| Shroom Space (High Contrast) | High Contrast | Maximum contrast ratios. Pure black background. |

## Installation

### VS Code Marketplace

Search for "Shroom Space" in the VS Code Extensions panel, or install via CLI:

```bash
code --install-extension wyattau.shroom-space-theme
```

### Manual

1. Download the latest `.vsix` from [releases](https://github.com/WyattAu/shroom-theme/releases).
2. Run: `code --install-extension shroom-space-theme-*.vsix`

## Activation

Select a theme via `Ctrl+K Ctrl+T` (or `Cmd+K Cmd+T` on macOS) and choose a Shroom Space variant.

## Architecture

```
shroom-theme/
  themes/             # 7 JSON theme definitions (VS Code tmTheme schema)
  src/
    extension.ts      # Minimal activation stub (theme extensions need no logic)
    test/
      extension.test.ts  # 90 tests: hex format, structural, accessibility, manifest
  validate-themes.js  # CI-integrated validation (structure, hex, accessibility, manifest)
  showcase/           # Sample files for visual theme testing across 8 languages
```

### Theme Validation

`validate-themes.js` enforces:
- Required fields (`name`, `type`, `colors`, `tokenColors`)
- Valid hex color format (`#RRGGBB` or `#RRGGBBAA`)
- Error/warning color distinguishability
- Package manifest and disk file consistency
- Correct `uiTheme` values (`vs` for light, `hc-black` for high contrast)

### Test Pipeline

```
npm test  =>  compile  ->  lint  ->  validate  ->  vscode-test (90 tests)
```

## Development

### Prerequisites

- Node.js >= 22
- npm >= 10
- VS Code >= 1.105.0

### Commands

| Command | Description |
|---|---|
| `npm run compile` | TypeScript compilation |
| `npm run lint` | ESLint with strict rules |
| `npm run validate` | Theme JSON validation |
| `npm test` | Full pipeline: compile + lint + validate + VS Code tests |
| `npm run watch` | TypeScript watch mode |

## Color Palette Reference

### Base Dark Theme

| Role | Hex | Usage |
|---|---|---|
| Background (editor) | `#24212E` | Primary editor background |
| Foreground (editor) | `#CCC8D9` | Default text color |
| Accent (purple) | `#BE9AF7` | Keywords, highlights, badges |
| Accent (teal) | `#74D7C8` | Functions, info indicators |
| Accent (green) | `#A6C18B` | Strings, git additions |
| Accent (amber) | `#E8C990` | Constants, types, warnings |
| Accent (red) | `#E68484` | Errors, deletions |
| Muted | `#726D89` | Comments, disabled states |

## License

Apache License 2.0. See [LICENSE](./LICENSE).

## Links

- [Repository](https://github.com/WyattAu/shroom-theme)
- [Issues](https://github.com/WyattAu/shroom-theme/issues)
- [Changelog](./CHANGELOG.md)
