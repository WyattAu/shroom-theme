# Shroom Space WASM Previewer

Interactive theme previewer built with Rust/Leptos, compiled to WASM.

## Prerequisites

- Rust 1.75+ (`rustup target add wasm32-unknown-unknown`)
- trunk (`cargo install trunk`)

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
