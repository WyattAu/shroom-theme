# Shroom Space Theme - Production Roadmap

## Current Status (v5.0.0)

### Completed Infrastructure

- 7 theme variants (dark, light, 3 CVD adaptations, monochrome, high contrast)
- Extension activation with user-configurable accent color (8 options: 7 presets + custom HSL)
- Programmatic theme generation from HSL base values (src/theme-generator.ts)
- Custom accent color via HSL values (shroom-space.customAccentHsl setting)
- Telemetry via VS Code TelemetryLogger API (GDPR-compliant, respects user settings)
- Tailwind CSS color palette plugin (tools/tailwind-plugin.js)
- Interactive theme previewer on documentation site (7 variants, accent switching)
- WCAG 2.1 contrast report page (docs/wcag.html)
- Internationalized documentation: Simplified Chinese (docs/index.zh.html) and Japanese (docs/index.ja.html)
- CodeQL static analysis in CI
- CI matrix testing: Node.js 24 + 26
- Auto dark/light theme switching based on VS Code color theme
- Extension settings contribution (shroom-space.accentColor, shroom-space.autoSwitch)
- 134 automated tests (structural, hex format, accessibility, manifest, token coverage, cross-theme consistency, extension activation, semantic token validation)
- 7 Playwright visual regression tests with reference screenshots and pixel-diff comparison (2% threshold)
- CI pipeline (lint + compile + validate + WCAG + test + convert + visual regression) on every push/PR
- Publish pipeline with pre-publish validation, idempotent version skip, and multi-editor exports
- Pre-commit hook enforcing quality gates (lint, compile, validate, convert)
- Comprehensive theme validation (hex format, distinguishability, manifest consistency)
- WCAG 2.1 AA contrast ratio compliance for all text-foreground pairs
- Automated WCAG contrast report generation as CI artifact
- GitHub Pages documentation site at https://wyattau.github.io/shroom-theme/
- Strict ESLint configuration (error-level rules, no-console, no-explicit-any, explicit-function-return-type)
- 943 color tokens per theme (100% of known VS Code API)
- 81 tokenColors entries per theme (operators, punctuation, regex, markup, HTML/XML, CSS, JSON, YAML, shell, SQL, Rust, Go, Python, Java/Kotlin, C/C++)
- 32 semanticTokenColors rules per theme (all VS Code standard types/modifiers, properly flattened)
- 9 export formats across 63 files (tmTheme, JetBrains, Vim, Windows Terminal, iTerm2, Warp, Alacritty, Kitty, CSS)
- Marketplace-ready: icon, screenshots, gallery banner, description, keywords
- SBOM generation (SPDX 2.3) as CI artifact
- GitHub Actions pinned to version tags (supply chain security)
- npm run test:ci script for full pipeline without VS Code host

### Known Technical Debt

- Visual regression references are only updated on first run or dimension change; deliberate edits require manual reference update.
- Non-standard semantic token types (component, directive, pipe, service, hook, tag, heading, punctuation, etc.) removed in v4.0.0. These were being silently ignored by VS Code. If language extensions define custom semantic token types in the future, re-addition may be needed.

---

## Completed Phases

### Phase 1: v0.2.0 - Contrast Ratio Compliance (DONE)

All 7 themes pass WCAG AA for text-foreground pairs. High contrast theme targets WCAG AAA for critical text.

### Phase 2: v0.3.0 - Theme Completeness (DONE)

620 color tokens per theme (68% coverage), 81 tokenColors, 57 semanticTokenColors rules.

### Phase 3: v0.4.0 - Multi-Editor Support (DONE)

Conversion tool produces 28 export files across 4 formats (tmTheme, JetBrains .icls, Vim, Windows Terminal JSON). CI validates all converted themes.

### Phase 4: v0.5.0 - Visual Regression Testing (DONE)

7 Playwright tests with pixelmatch comparison, 2% diff threshold, reference screenshots in version control.

### Phase 5: v1.0.0 - Production Release (DONE)

Published to VS Code Marketplace. All pre-release criteria met.

---

## Phase 6: v1.1.0 - Post-Production Hardening (COMPLETED)

**Goal:** Address technical debt, improve test coverage, and harden CI.

**Status:** Completed.

### Tasks

| ID | Task | Status |
|---|---|---|
| T-1101 | Resolve remaining transitive npm audit vulnerabilities (update mocha, sinon) | Done |
| T-1102 | Add visual regression test for dimension-change detection (assert on intentional layout change) | Done |
| T-1103 | Add CI job matrix: test on Node.js 24 + 26, VS Code stable + insiders | Done |
| T-1104 | Add CodeQL or Semgrep static analysis to CI | Done |
| T-1105 | Add SBOM generation (SPDX) as CI artifact | Done |
| T-1106 | Lock GitHub Actions versions with SHA pinning instead of tags | Done |
| T-1107 | Add `npm run test:ci` script that runs full pipeline without VS Code (lint + compile + validate + convert + visual) | Done |
| T-1108 | Generate converted themes as GitHub Release assets on tag push | Done |

### Acceptance Criteria

- Zero high/critical npm audit vulnerabilities
- CI tests on >= 2 Node.js versions
- Actions pinned to version tags
- SBOM generated on every CI run

---

## Phase 7: v1.2.0 - Token Coverage Expansion (COMPLETED)

**Goal:** Increase VS Code color token coverage from 68% to >= 80%.

**Status:** Completed. 732 tokens per theme (80% of VS Code API).

### Tasks

| ID | Task | Status |
|---|---|---|
| T-1201 | Audit VS Code 1.96+ color token changelog for new tokens added since 1.105 | Done |
| T-1202 | Add new tokens to base dark theme with appropriate colors | Done |
| T-1203 | Propagate new tokens to all 6 variant themes | Done |
| T-1204 | Update test minimum token count assertion (500 -> new target) | Done |
| T-1205 | Update ROADMAP and CHANGELOG with new coverage metrics | Done |
| T-1206 | Re-run WCAG contrast validation for all new token pairs | Done |

### Acceptance Criteria

- All 7 themes cover >= 80% of VS Code color token API (latest stable)
- All new token pairs pass WCAG AA
- CI test assertion updated to new minimum

---

## Phase 8: v1.3.0 - Extended Editor Support (COMPLETED)

**Goal:** Add additional editor formats and validate exports in real editors.

**Status:** Completed. 9 export formats across 63 files. Added iTerm2, Warp, Alacritty, Kitty, CSS.

### Tasks

| ID | Task | Status |
|---|---|---|
| T-1301 | Add iTerm2 color scheme export | Done |
| T-1302 | Add Warp terminal theme export | Done |
| T-1303 | Add Alacritty TOML theme export | Done |
| T-1304 | Add Kitty terminal theme export | Done |
| T-1305 | Manual validation of tmTheme in Sublime Text / TextMate | Done |
| T-1306 | Manual validation of JetBrains .icls in IntelliJ IDEA | Done |
| T-1307 | Manual validation of Vim scheme in Neovim 0.10+ | Done |
| T-1308 | Add download links for all export formats to landing page | Done |

### Acceptance Criteria

- >= 2 additional export formats
- At least 3 formats manually validated in target editors
- Landing page lists all available downloads

---

## Phase 9: v2.0.0 - Extension Activation (COMPLETED)

**Goal:** Transform from pure theme extension to an activated extension with runtime features.

**Status:** Completed. Extension activates with user-configurable accent color and auto dark/light switching.

### Tasks

| ID | Task | Status |
|---|---|---|
| T-2001 | Implement `activate()` with configuration change listener | Done |
| T-2002 | Add user-configurable accent color via `shroom-space.accentColor` setting | Done |
| T-2003 | Add auto dark/light switching based on `workbench.colorTheme` preference | Done |
| T-2004 | Programmatic theme generation from HSL base values | Done |
| T-2005 | Add settings UI in VS Code extension panel | Done |
| T-2006 | Add telemetry (VS Code TelemetryLogger API, GDPR-compliant) | Done |
| T-2007 | Update CI to test extension activation path | Done |
| T-2008 | Update pre-commit hook to include activation tests | Done |

### Acceptance Criteria

- Extension activates without errors on VS Code stable
- User can configure accent color from settings
- Theme auto-switches with OS dark/light mode
- CI tests activation path
- Zero increase in idle memory when theme-only mode is used

---

## Phase 10: v2.1.0 - Web Presence and Documentation (COMPLETED)

**Goal:** Establish professional documentation site and web export.

**Status:** Completed. CSS export, downloads section on landing page, extension settings documentation.

### Tasks

| ID | Task | Status |
|---|---|---|
| T-2101 | Add CSS custom properties export for web use | Done |
| T-2102 | Add Tailwind CSS color palette plugin | Done |
| T-2103 | Add interactive theme previewer to documentation site | Done |
| T-2104 | Add downloadable export cards to landing page | Done |
| T-2105 | Internationalize documentation (ZH, JA) | Done |
| T-2106 | Add WCAG contrast report to documentation site | Done |

### Acceptance Criteria

- CSS custom properties available for download
- Documentation site has interactive preview
- At least 1 additional language available

---

## Phase 11: v2.2.0 - Coverage Target Met (COMPLETED)

**Goal:** Reach 80%+ VS Code color token coverage and close quality gaps.

**Status:** Completed. 943 tokens per theme (100% of known VS Code API).

### Tasks

| ID | Task | Status |
|---|---|---|
| T-2201 | Audit VS Code API for all missing color tokens (910 total, 283 missing) | Done |
| T-2202 | Add 102 tokens: testing, notebook, inlineChat, merge, list, debug, diffEditor | Done |
| T-2203 | Propagate new tokens to all 6 variant themes with correct color derivation | Done |
| T-2204 | Update metrics across all docs, ROADMAP, CHANGELOG, package.json | Done |
| T-2205 | Fix pre-commit hook: add timeout and SKIP_HOOKS escape hatch | Done |
| T-2206 | Sync i18n pages (ZH, JA) with EN page including previewer and updated nav | Done |
| T-2207 | Add export format validation report (docs/validation.md) | Done |

### Acceptance Criteria

- Token coverage >= 80% (achieved: 80.4%)
- Pre-commit hook works in slow environments
- All documentation consistent across languages

---

## Phase 12: v3.0.0 - Complete API Coverage (COMPLETED)

**Goal:** Achieve 100% coverage of all known VS Code color tokens.

**Status:** Completed. 943 tokens per theme (100% of known VS Code API).

### Tasks

| ID | Task | Status |
|---|---|---|
| T-3001 | Audit VS Code API for all remaining color tokens (943 total, 211 missing) | Done |
| T-3002 | Add 211 tokens: activityBarTop, agentSession, chart, gauge, inlineEdit, scmGraph, terminalSymbolIcon, workspaceOverlay, radio, merge, markdownAlert, and more | Done |
| T-3003 | Propagate new tokens to all 6 variant themes with correct color derivation | Done |
| T-3004 | Update metrics across all docs (EN, ZH, JA), ROADMAP, CHANGELOG, package.json | Done |
| T-3005 | Re-run WCAG contrast validation for all new token pairs | Done |
| T-3006 | Update GitHub Actions: CodeQL v3 -> v4 | Done |

### Acceptance Criteria

- Token coverage = 100% of known VS Code API (achieved: 943 tokens)
- All new token pairs pass WCAG AA
- All documentation consistent across languages

---

## Phase 13: v4.0.0 - Semantic Token Fix & Marketplace Polish (COMPLETED)

**Goal:** Fix the critical semantic token format bug, improve marketplace discoverability, and refresh documentation.

### Tasks

| ID | Task | Status |
|---|---|---|
| T-4001 | Fix semanticTokenColors: flatten `{ enabled, rules }` to flat object, add `"semanticHighlighting": true` | Done |
| T-4002 | Audit 57 semantic rules against VS Code standard types/modifiers (26 types, 11 modifiers), remove non-standard, add missing | Done |
| T-4003 | Propagate fixed semantic tokens to all 7 variant themes | Done |
| T-4004 | Add semantic token tests to test suite | Done |
| T-4005 | Rewrite README: update stale info (92 tests, not 90; Node >= 24; accent color docs; semantic tokens; export formats) | Done |
| T-4006 | Add marketplace keywords for discoverability (cosmic, purple, teal, pastel, comfortable, minimal, modern, retina, retina-theme) | Done |
| T-4007 | Add CHANGELOG entry for v4.0.0 | Done |
| T-4008 | Bump package.json version, publish v4.0.0 to marketplace | Done |

### Acceptance Criteria

- `semanticHighlighting: true` present in all 7 theme JSON files
- `semanticTokenColors` is a flat object (no wrapper)
- Only VS Code standard token types/modifiers used (26 types + 11 modifiers)
- README reflects current state accurately
- Marketplace listing updated

---

## Phase 14: v4.1.0 - Neovim & Helix Native Themes (COMPLETED)

**Goal:** Ship proper native theme plugins for Neovim and Helix, not just hex color exports.

### Tasks

| ID | Task | Status |
|---|---|---|
| T-4101 | Create Neovim colorscheme plugin: Lua files with proper highlight groups | Done |
| T-4102 | Map all VS Code semantic token types to Neovim @syntax and @lsp highlight groups | Done |
| T-4103 | Support light/dark variants in both editors | Done |
| T-4104 | Create Helix theme TOML files mapping VS Code tokens to Helix palette keys | Done |
| T-4105 | Add editor theme generator tooling (tools/generate-editors.js) | Done |
| T-4106 | Document Neovim/Helix installation in README | Done |
| T-4107 | Create lazy.nvim-compatible plugin structure (editors/neovim/lua/shroom/) | Done |

### Acceptance Criteria

- `use 'wyattau/shroom-theme'` works in Neovim lazy.nvim / packer
- `theme = "shroom"` works in Helix config.toml
- Light/dark variants available in both editors
- CVD variants available as separate sub-themes

---

## Phase 15: v4.1.0 - Icon Theme Pairing (COMPLETED)

**Goal:** Ship a matching file icon theme or recommend a compatible one.

### Tasks

| ID | Task | Status |
|---|---|---|
| T-4201 | Evaluate existing icon themes for palette compatibility | Done |
| T-4202 | Document recommendation: Catppuccin Icons (Mocha) -- near-identical palette, zero config | Done |
| T-4203 | Document Material Icon Theme fallback config for pixel-perfect matching | Done |
| T-4204 | Add icon theme recommendations to README | Done |

### Decision

Creating a custom icon theme would require 500+ SVG icons and months of work for marginal benefit over Catppuccin Icons, whose palette is within 10-15 hex of Shroom Space's accents. Recommendation documented instead.

### Acceptance Criteria

- Matching icon theme available (documented: Catppuccin Icons)
- Material Icon Theme fallback config documented
- README updated

---

## Phase 16: v5.0.0 - WASM Theme Previewer (Rust/Leptos) (COMPLETED)

**Goal:** Build an interactive, client-side theme previewer using Rust compiled to WASM via Leptos.

### Tasks

| ID | Task | Status |
|---|---|---|
| T-5001 | Scaffold Leptos project (Cargo.toml, index.html, build.rs) | Done |
| T-5002 | Load all 7 theme JSON files at compile time via include_str! | Done |
| T-5003 | Implement VS Code workbench mock (activity bar, sidebar, editor, terminal, status bar) | Done |
| T-5004 | Implement theme switcher UI (7 variants) | Done |
| T-5005 | Implement Rust syntax highlighting (keywords, strings, numbers, types, comments) | Done |
| T-5006 | Implement i18n support (EN, ZH, JA) | Done |
| T-5007 | Implement color palette display section | Done |
| T-5008 | Compile to WASM via trunk (128KB dist, 100KB WASM binary) | Done |
| T-5009 | Deploy to GitHub Pages (docs/previewer/) | Done |
| T-5010 | Document build/deploy instructions | Done |

### Technical Details

- Framework: Leptos 0.7 (CSR mode, compiled to WASM)
- Binary size: 100KB WASM + 20KB JS + 1KB HTML = **128KB total dist** (well under 500KB target)
- Build: `trunk build --release` (wasm-opt level 0)
- Dev: `trunk serve --open`
- Themes embedded at compile time via `include_str!()`
- Deployed at: https://wyattau.github.io/shroom-theme/previewer/

### Acceptance Criteria

- Previewer loads in < 2s on 3G connection
- All 7 themes previewable with live accent color switching
- Code samples render with proper syntax highlighting
- Workbench mock shows realistic VS Code layout
- Deployed at https://wyattau.github.io/shroom-theme/

---

## Phase 17: v5.1.0 - AI Color Variants (COMPLETED)

**Goal:** Let users generate accent color variants from wallpaper images.

### Tasks

| ID | Task | Status |
|---|---|---|
| T-5101 | Implement k-means color extraction in pure Rust (no deps) | Done |
| T-5102 | Map extracted colors to accent presets using HSL distance | Done |
| T-5103 | Add image upload UI to WASM previewer | Done |
| T-5104 | Expose extract_colors() as wasm_bindgen JS API | Done |
| T-5105 | ColorExtractor Leptos component with live preview | Done |

### Technical Details

- K-means++ initialization with deterministic centroid selection
- 20 iterations, sample every 4th pixel for performance
- Maps to 7 Shroom Space accent presets via HSL circular distance
- JS-callable: `extract_colors(rgba_data, width, height, k)`
- Leptos ColorExtractor component in previewer UI

---

## Recurring Maintenance

| Frequency | Task |
|---|---|
| Monthly | Audit VS Code changelog for new color tokens |
| Monthly | Run npm audit and update dev dependencies |
| Monthly | Check GitHub Actions deprecation notices |
| Quarterly | Verify WCAG compliance after VS Code updates |
| Quarterly | Review CVD variant color mappings against latest accessibility research |
| On VS Code major release | Test all themes against new stable version |
| On VS Code major release | Update `engines.vscode` minimum version |
| On VS Code major release | Audit new semantic token types |
| Biannually | Review and update ROADMAP |

---

## Dependency Graph

```
v0.2.0 (WCAG) --> v0.3.0 (Completeness) --> v0.4.0 (Multi-Editor) --> v0.5.0 (Visual Regression)
                                                                             |
                                                                             v
                                                                      v1.0.0 (Production)
                                                                             |
                                                                     +-------+-------+
                                                                     |               |
                                                                     v               v
                                                               v1.1.0 (Harden)   v1.2.0 (Coverage)
                                                                     |               |
                                                                     +-------+-------+
                                                                             |
                                                                             v
                                                               v1.3.0 (Extended Editors)
                                                                             |
                                                                             v
                                                               v2.0.0 (Extension Activation)
                                                                             |
                                                                             v
                                                                v2.1.0 (Web & Docs)
                                                                              |
                                                                              v
                                                                 v2.2.0 (Coverage 80%)
                                                                               |
                                                                               v
                                                                 v3.0.0 (Coverage 100%)
                                                                               |
                                                                               v
                                                                    v3.1.0 (Node 24 LTS)
                                                                               |
                                                                               v
                                                                    v4.0.0 (Semantic Fix + Polish)
                                                                               |
                                                                     +---------+---------+
                                                                     |         |         |
                                                                     v         v         v
                                                              v4.1.0    v4.2.0    v5.0.0
                                                              (Neovim/   (Icons)   (WASM
                                                               Helix)              Previewer)
                                                                                  |
                                                                                  v
                                                                             v5.1.0 (AI)

Phases 1-17 ALL COMPLETED.
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| VS Code breaking color token API | Low | High | Pin `engines.vscode`, test on Insiders builds |
| WCAG compliance conflicts with aesthetic goals | Medium | Medium | Prioritize accessibility over aesthetics |
| CVD variant colors insufficient for some users | Medium | Medium | User feedback loop, iterative refinement |
| Marketplace rejection on extension activation change | Medium | High | Pre-validate with `vsce package`, test on Insiders |
| Visual regression false positives from font/rendering | Medium | Low | 2% threshold, manual review on CI failure |
| Extension activation increasing memory footprint | Medium | Medium | Lazy activation, deactivate when not needed |
| GitHub Actions Node.js 20 deprecation | High | Low | Update action versions to Node.js 24 compatible |
| npm transitive vulnerabilities | Medium | Low | Dev-only dependencies, not shipped |

---

## Versioning Policy

- **Patch (x.x.Z):** Bug fixes, documentation updates, CI improvements, dependency updates
- **Minor (x.Y.0):** New features, new export formats, new test types, token coverage increases
- **Major (X.0.0):** Breaking changes (extension activation, new required settings, API changes)
