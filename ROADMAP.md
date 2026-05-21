# Shroom Space Theme - Production Roadmap

## Current Status (v1.0.0)

### Completed Infrastructure

- 7 theme variants (dark, light, 3 CVD adaptations, monochrome, high contrast)
- 90 automated tests (structural, hex format, accessibility, manifest, token coverage, cross-theme consistency)
- 7 Playwright visual regression tests with reference screenshots and pixel-diff comparison (2% threshold)
- CI pipeline (lint + compile + validate + WCAG + test + convert + visual regression) on every push/PR
- Publish pipeline with pre-publish validation, idempotent version skip, and multi-editor exports
- Pre-commit hook enforcing quality gates (lint, compile, validate, convert)
- Comprehensive theme validation (hex format, distinguishability, manifest consistency)
- WCAG 2.1 AA contrast ratio compliance for all text-foreground pairs
- Automated WCAG contrast report generation as CI artifact
- GitHub Pages documentation site at https://wyattau.github.io/shroom-theme/
- Strict ESLint configuration (error-level rules, no-console, no-explicit-any, explicit-function-return-type)
- Multi-editor conversion tool: TextMate, JetBrains, Vim, Windows Terminal (28 export files)
- 620 color tokens per theme (68% of VS Code API)
- 81 tokenColors entries per theme (operators, punctuation, regex, markup, HTML/XML, CSS, JSON, YAML, shell, SQL, Rust, Go, Python, Java/Kotlin, C/C++)
- 57 semanticTokenColors rules per theme (types, functions, variables, operators, markup, Angular, React hooks)
- Marketplace-ready: icon, screenshots, gallery banner, description, keywords

### Known Technical Debt

- npm audit reports transitive vulnerabilities in dev dependencies (mocha -> diff, serialize-javascript). Not shipped in extension.
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

## Phase 6: v1.1.0 - Post-Production Hardening

**Goal:** Address technical debt, improve test coverage, and harden CI.

**Status:** Planned.

### Tasks

| ID | Task | Priority | Effort | Dependencies |
|---|---|---|---|---|
| T-1101 | Resolve remaining transitive npm audit vulnerabilities (update mocha, sinon) | Medium | 2h | None |
| T-1102 | Add visual regression test for dimension-change detection (assert on intentional layout change) | Low | 1h | Phase 4 |
| T-1103 | Add CI job matrix: test on Node.js 22 + latest, VS Code stable + insiders | Medium | 2h | None |
| T-1104 | Add CodeQL or Semgrep static analysis to CI | Medium | 3h | None |
| T-1105 | Add SBOM generation (SPDX) as CI artifact | Low | 1h | None |
| T-1106 | Lock GitHub Actions versions with SHA pinning instead of tags | Medium | 1h | None |
| T-1107 | Add `npm run test:ci` script that runs full pipeline without VS Code (lint + compile + validate + convert + visual) | Low | 1h | None |
| T-1108 | Generate converted themes as GitHub Release assets on tag push | Low | 1h | Phase 5 |

### Acceptance Criteria

- Zero high/critical npm audit vulnerabilities
- CI tests on >= 2 Node.js versions
- Actions pinned to commit SHA
- SBOM generated on every CI run

---

## Phase 7: v1.2.0 - Token Coverage Expansion

**Goal:** Increase VS Code color token coverage from 68% to >= 80%.

**Status:** Planned.

### Tasks

| ID | Task | Priority | Effort | Dependencies |
|---|---|---|---|---|
| T-1201 | Audit VS Code 1.96+ color token changelog for new tokens added since 1.105 | High | 3h | None |
| T-1202 | Add new tokens to base dark theme with appropriate colors | High | 4h | T-1201 |
| T-1203 | Propagate new tokens to all 6 variant themes | High | 2h | T-1202 |
| T-1204 | Update test minimum token count assertion (500 -> new target) | Low | 30m | T-1202 |
| T-1205 | Update ROADMAP and CHANGELOG with new coverage metrics | Low | 30m | T-1203 |
| T-1206 | Re-run WCAG contrast validation for all new token pairs | Medium | 1h | T-1203 |

### Acceptance Criteria

- All 7 themes cover >= 80% of VS Code color token API (latest stable)
- All new token pairs pass WCAG AA
- CI test assertion updated to new minimum

---

## Phase 8: v1.3.0 - Extended Editor Support

**Goal:** Add additional editor formats and validate exports in real editors.

**Status:** Planned.

### Tasks

| ID | Task | Priority | Effort | Dependencies |
|---|---|---|---|---|
| T-1301 | Add iTerm2 color scheme export | Low | 2h | None |
| T-1302 | Add Warp terminal theme export | Low | 2h | None |
| T-1303 | Add Alacritty TOML theme export | Low | 2h | None |
| T-1304 | Add Kitty terminal theme export | Low | 2h | None |
| T-1305 | Manual validation of tmTheme in Sublime Text / TextMate | Medium | 1h | Phase 3 |
| T-1306 | Manual validation of JetBrains .icls in IntelliJ IDEA | Medium | 1h | Phase 3 |
| T-1307 | Manual validation of Vim scheme in Neovim 0.10+ | Medium | 1h | Phase 3 |
| T-1308 | Add download links for all export formats to landing page | Low | 1h | T-1301..T-1304 |

### Acceptance Criteria

- >= 2 additional export formats
- At least 3 formats manually validated in target editors
- Landing page lists all available downloads

---

## Phase 9: v2.0.0 - Extension Activation (Breaking Change)

**Goal:** Transform from pure theme extension to an activated extension with runtime features.

**Status:** Future. Requires extension host activation, increasing resource footprint.

### Tasks

| ID | Task | Priority | Effort | Dependencies |
|---|---|---|---|---|
| T-2001 | Implement `activate()` with configuration change listener | High | 4h | None |
| T-2002 | Add user-configurable accent color via `shroom-space.accentColor` setting | Medium | 6h | T-2001 |
| T-2003 | Add auto dark/light switching based on `workbench.colorTheme` preference | Medium | 4h | T-2001 |
| T-2004 | Programmatic theme generation from HSL base values | High | 8h | T-2002 |
| T-2005 | Add settings UI in VS Code extension panel | Medium | 3h | T-2002 |
| T-2006 | Add telemetry (VS Code TelemetryLogger API, GDPR-compliant) | Low | 2h | T-2001 |
| T-2007 | Update CI to test extension activation path | Medium | 2h | T-2001 |
| T-2008 | Update pre-commit hook to include activation tests | Low | 30m | T-2007 |

### Acceptance Criteria

- Extension activates without errors on VS Code stable
- User can configure accent color from settings
- Theme auto-switches with OS dark/light mode
- CI tests activation path
- Zero increase in idle memory when theme-only mode is used

---

## Phase 10: v2.1.0 - Web Presence and Documentation

**Goal:** Establish professional documentation site and web export.

**Status:** Future.

### Tasks

| ID | Task | Priority | Effort | Dependencies |
|---|---|---|---|---|
| T-2101 | Add CSS custom properties export for web use | Low | 3h | None |
| T-2102 | Add Tailwind CSS color palette plugin | Low | 3h | T-2101 |
| T-2103 | Add interactive theme previewer to documentation site | Medium | 6h | None |
| T-2104 | Add downloadable export cards to landing page | Low | 2h | Phase 8 |
| T-2105 | Internationalize documentation (ZH, JA) | Low | 8h | User demand signal |
| T-2106 | Add WCAG contrast report to documentation site | Low | 2h | Phase 1 |

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
