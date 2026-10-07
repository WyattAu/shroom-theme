# Shroom Space WASM Previewer

Interactive theme previewer built with Rust/Leptos, compiled to WASM.

## Status: the deployed build is stale

`docs/previewer/` holds a WASM artifact built before the palette work in
October 2026. The previewer embeds theme JSON at compile time via
`include_str!`, so that artifact renders the old palette — the blue variable
token, the pre-fix comment and line-number colours.

`src/lib.rs` is current. Rebuild to see the shipped themes:

```bash
cd previewer && trunk build --release
```

Note that `cargo install trunk` currently fails on `libdeflate-sys`, which needs
a working C toolchain and `pkg-config`. There is no CI job that builds the
previewer, so nothing catches this drift automatically. Adding one would close
it; until then the artifact ages silently whenever the palette changes.

## Prerequisites

- Rust 1.75+ (`rustup target add wasm32-unknown-unknown`)
- trunk (`cargo install trunk`)
- A C toolchain and `pkg-config`, for trunk's own dependencies

## Build

```bash
cd previewer
trunk build --release
# Output: previewer/dist/
```

## Dev Server

```bash
cd previewer
trunk serve --open
# Opens http://localhost:8080
```

## Deploy

Copy `dist/` to GitHub Pages or any static host. All assets are self-contained WASM + JS + HTML.

## Features

- All 7 theme variants (dark, light, deuteranopia, protanopia, tritanopia, monochrome, high contrast)
- VS Code workbench mock (activity bar, sidebar, editor, terminal, status bar)
- Live theme switching
- Rust syntax highlighting
- i18n (EN, ZH, JA)
- Color palette display
- WASM binary < 500KB gzipped

## Architecture

```
previewer/
  src/lib.rs          # Leptos app (components, highlighting, theme data)
  public/style.css    # CSS styles
  public/             # Static assets
  index.html          # HTML entry point (trunk)
  Cargo.toml          # Rust dependencies
  build.rs            # Build script (theme embedding)
```

Themes are embedded at compile time via `include_str!()` from `../themes/*.json`.
