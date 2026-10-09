# Shroom Space Theme

A cosmic dark theme for VS Code with 7 variants, including accessibility-focused CVD adaptations. 1049 colour tokens covering the current VS Code API, 32 semantic token rules, WCAG 2.1 AA, and 9-format multi-editor export.

## Themes

| Theme | Type | Description |
|---|---|---|
| Shroom Space | Dark | Base dark theme. Purple/teal/green palette. |
| Shroom Space Light | Light | Light variant. Warm earth-tone backgrounds. |
| Shroom Space (Deuteranopia) | Dark | Adapted for deuteranopia (green-weak CVD). |
| Shroom Space (Protanopia) | Dark | Adapted for protanopia (red-blind CVD). |
| Shroom Space (Tritanopia) | Dark | Adapted for tritanopia (blue-yellow CVD). |
| Shroom Space (Monochrome) | Dark | Grayscale ramp preserving semantic rank. Individual token identity is not preserved in greyscale. |
| Shroom Space (High Contrast) | High Contrast | Maximum contrast against pure black. Contrast against a background and CVD separation are different properties; this variant optimises the former. |

The CVD variants render the theme as it would appear to a **dichromat**, the most
severely affected case. Dichromats are roughly a quarter of people with colour
vision deficiency; the other three quarters are anomalous trichromats, whose
impairment is milder. So these variants are a conservative worst-case collision
detector rather than a picture of what any individual sees. Full caveats,
including what is explicitly *not* guaranteed, are in
[docs/color-science.md](docs/color-science.md).

### On dark mode and eye strain

Dark-on-light text does read measurably faster in some conditions. The size of
the effect, and the fact that it is a *luminance* effect rather than a polarity
effect, are worth stating plainly rather than leaving as folklore:

- Follow-up work that equated display luminance between polarities found the
  proofreading advantage of light mode **disappeared** (η² < 0.01) while
  display luminance kept its effect (η² = 0.12). The mechanism is pupil size:
  positive polarity gives 2.09 mm against 3.65 mm, d = 2.96.
- In bright ambient light the penalty is not detectable at all (p = 0.665). It
  concentrates in evening and dim-room use.
- It grows as text gets smaller.

The background is not pure black. `#24212E` sits inside APCA's black soft-clamp
regime, which exists because WCAG 2.x overstates contrast for near-blacks.
Perceptually, pure black is not achievable anyway: the eye perceives black as
about 0.0044 cd/m² even in a dim room. If you want the last few percent of
reading speed, the light theme is there, and the accurate reason is above.

## Features

- **Accent color customization** -- 7 presets (purple, teal, green, amber, rose, sky, coral) + custom HSL via settings
- **Auto dark/light switching** -- follows OS appearance automatically
- **Semantic token support** -- 32 rules covering all VS Code standard types and modifiers
- **9 export formats** -- tmTheme, JetBrains (.icls), Vim, Windows Terminal, iTerm2, Warp, Alacritty, Kitty, CSS
- **Tailwind CSS plugin** -- `tools/tailwind-plugin.js` for use in Tailwind projects
- **WCAG 2.1 AA** -- enforced in CI on the alpha-composited pair, so translucent
  tokens are measured as rendered rather than as authored
- **Perceptual separation** -- token colours are kept apart by APCA |Lc| so no
  two competing categories differ by hue alone. See
  [docs/color-science.md](docs/color-science.md)
- **Colour vision deficiency variants** -- simulated in linear RGB using
  Machado 2009 and Brettel 1997. These are worst-case collision detectors,
  not depictions of any user's experience
- **Eight-metric quality profile** -- `npm run audit:quality` measures semantic
  consistency, visual hierarchy, hue architecture, Helmholtz-Kohlrausch
  brightness, chroma budget, colour naming, cross-variant hue and reduced-gamut
  display degradation. Report-only, because a threshold on a design judgement
  produces false failures that get ignored. What it cannot tell you is spelled
  out in [docs/color-science.md](docs/color-science.md)
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

## Accessibility

Contrast and colour separation are measured, not judged by eye, and enforced in
CI. What that does and does not cover, how the CVD variants should be
interpreted, and what to test with real users is in
[ACCESSIBILITY.md](ACCESSIBILITY.md) and
[docs/color-science.md](docs/color-science.md).

Short version: the CVD variants are a worst-case collision detector, not a
depiction of what anyone sees. A pair that is distinguishable in them is
distinguishable for the milder anomalous trichromacies that make up most colour
vision deficiency.

Variables are pink rather than the more conventional blue for this reason: a
blue variable sat 1.55 CIEDE2000 from the purple keyword under deuteranopia,
which is functionally the same colour. The full measurement is in the
documentation.

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

**WASM Previewer** (Rust/Leptos, 128KB): [wyattau.github.io/shroom-theme/previewer](https://wyattau.github.io/shroom-theme/previewer/)

Static preview with all 7 variants: [wyattau.github.io/shroom-theme](https://wyattau.github.io/shroom-theme/)

WCAG contrast report: [wyattau.github.io/shroom-theme/wcag.html](https://wyattau.github.io/shroom-theme/wcag.html)

## Color Palette

| Role | Hex | Usage | APCA \|Lc\| |
|---|---|---|---|
| Background | `#24212E` | Primary editor background | -- |
| Muted | `#726D89` | Comments, disabled | 25.0 |
| Accent (red) | `#E68484` | Errors, deletions | 48.5 |
| Accent (purple) | `#BE9AF7` | Keywords, operators | 54.4 |
| Accent (pink) | `#E794D2` | Variables, parameters | 56.6 |
| Accent (green) | `#A6C18B` | Strings, git additions | 61.7 |
| Accent (teal) | `#74D7C8` | Functions, info | 69.8 |
| Foreground | `#CCC8D9` | Default text | 72.0 |
| Accent (amber) | `#E8C990` | Constants, types | 73.7 |
| Accent (gold) | `#FFCB6B` | Decorators, numbers | 77.4 |

Token colours are kept apart by APCA lightness contrast, not by hue alone. Every
adjacent pair differs by at least 2 |Lc|, which is finer than one step of APCA's
own lookup tables, so no two categories collapse when hue is hard to
discriminate. The muted comment colour is deliberately lower: it is de-emphasis,
held to the 3:1 that WCAG sets for non-text components rather than to 4.5:1.

## Development

### Prerequisites

- Node.js >= 24
- npm >= 10

### Commands

| Command | Description |
|---|---|
| `npm run compile` | TypeScript compilation |
| `npm run lint` | ESLint, whole repository |
| `npm run validate` | Theme JSON structure, palette audit, CVD matrix, quality profile |
| `npm run audit:palette` | Contrast and lightness gates. Fails the build on a violation |
| `npm run audit:cvd` | CVD collision matrix report per variant |
| `npm run audit:quality` | Eight-metric quality profile per variant. See [docs/color-science.md](docs/color-science.md) |
| `npm run palette` | Palette tooling: `repair [--dry-run]`, `gamut`, `matrix` |
| `npm run test:unit` | Colour science, palette and quality-profile tests. No display server needed |
| `npm test` | VS Code host tests |
| `npm run convert` | Generate 9-format exports |
| `npm run sbom` | SPDX 2.3 SBOM |
| `npm run test:ci` | Full CI pipeline, no VS Code host |

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
