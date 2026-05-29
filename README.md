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

## Recommended Icon Theme

**[Catppuccin Icons](https://marketplace.visualstudio.com/items?itemName=Catppuccin.catppuccin-vsc-icons)** (Mocha flavor) pairs naturally -- its palette (mauve `#cba6f7`, teal `#94e2d5`, blue `#89b4fa`) is within 10-15 hex of Shroom Space's accents. No configuration needed.

For pixel-perfect control, **[Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme)** with:
```jsonc
{ "material-icon-theme.folders.color": "#BE9AF7", "material-icon-theme.files.color": "#CCC8D9", "material-icon-theme.saturation": 0.75 }
```

## Neovim

```lua
-- lazy.nvim
{ "wyattau/shroom-theme", name = "shroom-theme", lazy = false, priority = 1000, config = function() vim.cmd.colorscheme("shroom-space") end }
```

Or copy `editors/neovim/colors/*.lua` to `~/.config/nvim/colors/` and `:colorscheme shroom-space`.

7 variants: `shroom-space`, `shroom-space-light`, `shroom-space-deuteranopia`, `shroom-space-protanopia`, `shroom-space-tritanopia`, `shroom-space-monochrome`, `shroom-space-high-contrast`.

## Helix

Copy `editors/helix/shroom_space.toml` to `~/.config/helix/themes/` and set in `config.toml`:

```toml
theme = "shroom_space"
```

7 variants available as `shroom_space`, `shroom_space_light`, `shroom_space_deuteranopia`, etc.

## License

Apache License 2.0. See [LICENSE](./LICENSE).

## Links

- [Repository](https://github.com/WyattAu/shroom-theme)
- [Issues](https://github.com/WyattAu/shroom-theme/issues)
- [Changelog](./CHANGELOG.md)
- [Roadmap](./ROADMAP.md)
