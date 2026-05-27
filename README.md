# Shroom Space Theme

A cosmic dark theme for VS Code with 7 variants, including accessibility-focused CVD adaptations. 943 color tokens (100% of VS Code API), 32 semantic token rules, WCAG 2.1 AA compliant, and 9-format multi-editor export.

## Themes

| Theme | Type | Description |
|---|---|---|
| Shroom Space | Dark | Base dark theme. Purple/teal/green palette. |
| Shroom Space Light | Light | Light variant. Warm earth-tone backgrounds. |
| Shroom Space (Deuteranopia) | Dark | Adapted for deuteranopia (green-weak CVD). |
| Shroom Space (Protanopia) | Dark | Adapted for protanopia (red-blind CVD). |
| Shroom Space (Tritanopia) | Dark | Adapted for tritanopia (blue-yellow CVD). |
| Shroom Space (Monochrome) | Dark | Grayscale palette. Luminance-based contrast. |
| Shroom Space (High Contrast) | High Contrast | Maximum contrast. Pure black background. |

## Features

- **Accent color customization** -- 7 presets (purple, teal, green, amber, rose, sky, coral) + custom HSL via settings
- **Auto dark/light switching** -- follows OS appearance automatically
- **Semantic token support** -- 32 rules covering all VS Code standard types and modifiers
- **9 export formats** -- tmTheme, JetBrains (.icls), Vim, Windows Terminal, iTerm2, Warp, Alacritty, Kitty, CSS
- **Tailwind CSS plugin** -- `tools/tailwind-plugin.js` for use in Tailwind projects
- **WCAG 2.1 AA** -- all text-foreground pairs pass contrast requirements
- **i18n docs** -- English, Simplified Chinese, Japanese

## Installation

### VS Code Marketplace

```
code --install-extension wyattau.shroom-space-theme
```

Or search "Shroom Space" in the Extensions panel.

### Manual

Download the `.vsix` from [releases](https://github.com/WyattAu/shroom-theme/releases):

```bash
code --install-extension shroom-space-theme-*.vsix
```

## Accent Color

Use the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and search **Shroom: Set Accent Color**. Or configure in settings:

```jsonc
{
  "shroom-space.accentColor": "purple",     // purple | teal | green | amber | rose | sky | coral | custom
  "shroom-space.autoSwitch": true,          // auto dark/light on OS change
  "shroom-space.customAccentHsl": "280,70,80"  // only when accentColor is "custom"
}
```

## Preview

Interactive preview with all 7 variants: [wyattau.github.io/shroom-theme](https://wyattau.github.io/shroom-theme/)

WCAG contrast report: [wyattau.github.io/shroom-theme/wcag.html](https://wyattau.github.io/shroom-theme/wcag.html)

## Color Palette

| Role | Hex | Usage |
|---|---|---|
| Background | `#24212E` | Primary editor background |
| Foreground | `#CCC8D9` | Default text |
| Accent (purple) | `#BE9AF7` | Keywords, highlights |
| Accent (teal) | `#74D7C8` | Functions, info |
| Accent (green) | `#A6C18B` | Strings, git additions |
| Accent (amber) | `#E8C990` | Constants, types, warnings |
| Accent (red) | `#E68484` | Errors, deletions |
| Muted | `#726D89` | Comments, disabled |

## Development

### Prerequisites

- Node.js >= 24
- npm >= 10

### Commands

| Command | Description |
|---|---|
| `npm run compile` | TypeScript compilation |
| `npm run lint` | ESLint |
| `npm run validate` | Theme JSON validation |
| `npm test` | Full pipeline: compile + lint + validate + 134 tests |
| `npm run convert` | Generate 9-format exports |
| `npm run sbom` | SPDX 2.3 SBOM |
| `npm run test:ci` | Full CI pipeline (no VS Code host) |

## License

Apache License 2.0. See [LICENSE](./LICENSE).

## Links

- [Repository](https://github.com/WyattAu/shroom-theme)
- [Issues](https://github.com/WyattAu/shroom-theme/issues)
- [Changelog](./CHANGELOG.md)
- [Roadmap](./ROADMAP.md)
