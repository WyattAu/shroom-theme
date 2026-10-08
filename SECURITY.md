# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 5.2.x   | Yes       |
| < 5.2   | No        |

## Reporting a Vulnerability

Report vulnerabilities via [GitHub Security Advisories](https://github.com/WyattAu/shroom-theme/security/advisories/new).

Do not open a public issue for security reports.

## Scope

This is a VS Code colour theme. It ships JSON files and a small extension that
reads and writes VS Code configuration. It makes no network requests, stores no
data, and executes no external code. The attack surface is limited to:

- The extension's activation and configuration change handlers in `src/extension.ts`
- The build pipeline in `.github/workflows/`

## Supply Chain

All GitHub Actions are pinned to major version tags. Dependencies are audited on
every push via `npm audit`. An SBOM (SPDX 2.3) is generated as a CI artifact.
