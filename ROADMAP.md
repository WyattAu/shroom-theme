# Shroom Space Theme - Production Roadmap

## Current Status (v2.1.0)

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
- CI matrix testing: Node.js 22 + 24
- Auto dark/light theme switching based on VS Code color theme
- Extension settings contribution (shroom-space.accentColor, shroom-space.autoSwitch)
- 92 automated tests (structural, hex format, accessibility, manifest, token coverage, cross-theme consistency, extension activation)
- 7 Playwright visual regression tests with reference screenshots and pixel-diff comparison (2% threshold)
- CI pipeline (lint + compile + validate + WCAG + test + convert + visual regression) on every push/PR
- Publish pipeline with pre-publish validation, idempotent version skip, and multi-editor exports
- Pre-commit hook enforcing quality gates (lint, compile, validate, convert)
- Comprehensive theme validation (hex format, distinguishability, manifest consistency)
- WCAG 2.1 AA contrast ratio compliance for all text-foreground pairs
- Automated WCAG contrast report generation as CI artifact
- GitHub Pages documentation site at https://wyattau.github.io/shroom-theme/
- Strict ESLint configuration (error-level rules, no-console, no-explicit-any, explicit-function-return-type)
- 630 color tokens per theme (69% of VS Code API)
- 81 tokenColors entries per theme (operators, punctuation, regex, markup, HTML/XML, CSS, JSON, YAML, shell, SQL, Rust, Go, Python, Java/Kotlin, C/C++)
- 57 semanticTokenColors rules per theme (types, functions, variables, operators, markup, Angular, React hooks)
- 9 export formats across 63 files (tmTheme, JetBrains, Vim, Windows Terminal, iTerm2, Warp, Alacritty, Kitty, CSS)
- Marketplace-ready: icon, screenshots, gallery banner, description, keywords
- SBOM generation (SPDX 2.3) as CI artifact
- GitHub Actions pinned to version tags (supply chain security)
- npm run test:ci script for full pipeline without VS Code host

### Known Technical Debt

- Visual regression references are only updated on first run or dimension change; deliberate edits require manual reference update.

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
| T-1103 | Add CI job matrix: test on Node.js 22 + latest, VS Code stable + insiders | Done |
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

**Status:** Completed. 630 tokens per theme (69% of VS Code API).

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

All phases COMPLETED.
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
