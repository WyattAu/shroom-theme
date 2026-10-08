# Contributing

## Setup

```bash
npm install
npm run compile
npm test
```

Requires Node.js 24+, npm 10+, and VS Code 1.120+.

## Before Opening a PR

```bash
npm run lint          # ESLint, whole repository
npm run validate      # Theme structure + palette audit + CVD matrix
npm run test:unit     # Colour science tests
npm run test:ci       # Full CI pipeline without VS Code host
```

All gates must pass. CI runs the same commands plus the VS Code host tests and
visual regression.

## Palette Changes

If you change any colour in `themes/*.json`:

1. Run `npm run audit:palette` and fix any gate failures.
2. Run `npm run palette repair --dry-run` to confirm the repair pipeline is
   satisfied.
3. Rebuild the previewer: `(cd previewer && trunk build --release)` then copy
   `dist/index.html`, `dist/*.js` and `dist/*_bg.wasm` to `docs/previewer/`.
4. Refresh the digest: `npm run palette digest --write`
5. Regenerate the visual references if the change is visible:
   `rm -f tests/visual/references/*.png && npm run test:visual`
6. Update `CHANGELOG.md`.

## Documentation

- `docs/color-science.md` documents every formula and its provenance.
- `ACCESSIBILITY.md` has the CVD testing protocol.
- The CHANGELOG follows [Keep a Changelog](https://keepachangelog.com/).
