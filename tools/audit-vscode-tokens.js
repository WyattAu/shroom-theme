#!/usr/bin/env node

"use strict";

/**
 * Audit the theme against the VS Code colour registry.
 *
 * Fetches every `registerColor` call on the VS Code main branch and compares
 * the resulting set of colour IDs against the theme's `colors` object. Reports
 * tokens VS Code defines that the theme is missing.
 *
 * This exists because the 943-token "100% coverage" claim predated the agent,
 * chat and modern UI surfaces, and coverage had quietly fallen to about 90%
 * while the docs still said 100%. The ROADMAP schedules this audit monthly;
 * before this tool it was a manual crawl that lived in a temp directory, which
 * is why it had not been run.
 *
 * Two caveats, both inherent to the approach:
 *
 *   - The registry is extracted by regex from TypeScript source. Some colour
 *     IDs may be registered through helpers rather than a direct
 *     `registerColor('...')` call, so the extracted set is a floor.
 *   - main moves. Running this tomorrow can give a different answer than
 *     today, which is the point -- but it also means a diff against a stored
 *     registry is not meaningful. Compare against the live registry each time.
 *
 * Requires network access to github.com.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const THEMES_DIR = path.join(ROOT, "themes");
const REPO = "microsoft/vscode";

/**
 * Fetch a file from the VS Code repository at a ref.
 * @param {string} ref
 * @param {string} filePath
 * @returns {string|null} file contents, or null when it does not exist
 */
function fetchFile(ref, filePath) {
  const url = `https://raw.githubusercontent.com/${REPO}/${ref}/${filePath}`;
  try {
    return execFileSync("curl", ["-sL", "--max-time", "30", url], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

/**
 * List the repository paths that plausibly contain colour registrations.
 *
 * Enumerated rather than hardcoded, because the set of files changes as VS Code
 * adds features: the agent and chat colour files did not exist when this theme
 * last claimed full coverage.
 *
 * Two patterns are needed. Most colours live in `*Colors.ts` files under
 * `platform/theme/common/colors/`, but the workbench registers the larger share
 * of its tokens from `workbench/common/theme.ts`, which the first pattern does
 * not match. Missing that file cost 197 IDs on the first run and made coverage
 * look complete when it was merely unmeasured.
 *
 * @param {string} ref
 * @returns {string[]}
 */
function listColourFiles(ref) {
  const tree = execFileSync(
    "gh",
    ["api", `repos/${REPO}/git/trees/${ref}?recursive=1`, "--jq", ".tree[].path"],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }
  );
  return tree
    .split("\n")
    .filter((p) => /\.ts$/.test(p) && (/Colors?\.ts$/.test(p) || /\/theme\.ts$/.test(p)));
}

/**
 * Extract colour IDs from TypeScript source.
 *
 * Whitespace is normalised first so a call split across lines still matches;
 * `registerColor(\n  'foo'` is common in the VS Code source.
 *
 * @param {string} source
 * @param {Set<string>} into
 */
function extractIds(source, into) {
  const flat = source.replace(/\s+/g, " ");
  const re = /registerColor\(\s*'([^']+)'/g;
  let m = re.exec(flat);
  while (m !== null) {
    into.add(m[1]);
    m = re.exec(flat);
  }
}

/**
 * Fetch the registry from VS Code main.
 * @returns {Set<string>}
 */
function fetchRegistry() {
  const ref = "main";
  const files = listColourFiles(ref);
  console.error(`fetching ${files.length} colour file(s) from ${REPO}@${ref}...`);

  const ids = new Set();
  let fetched = 0;
  for (const filePath of files) {
    const source = fetchFile(ref, filePath);
    fetched++;
    if (source === null || source.length === 0) { continue; }
    extractIds(source, ids);
  }
  console.error(`  read ${fetched} file(s), ${ids.size} unique colour IDs`);
  return ids;
}

/**
 * Read the theme's colour IDs.
 * @param {object} theme
 * @returns {Set<string>}
 */
function themeIds(theme) {
  return new Set(Object.keys(theme.colors ?? {}));
}

function main() {
  const registry = fetchRegistry();

  const files = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith(".json")).sort();
  let worst = 0;
  const perTheme = [];

  for (const file of files) {
    const theme = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, file), "utf8"));
    const have = themeIds(theme);
    const missing = [...registry].filter((id) => !have.has(id)).sort();
    const pct = (((registry.size - missing.length) / registry.size) * 100).toFixed(1);
    perTheme.push({ file, total: registry.size, missing, pct });
    if (Number(pct) < Number(worst) || worst === 0) { worst = Number(pct); }
  }

  for (const { file, total, missing, pct } of perTheme) {
    const name = file.replace("shroom-space-", "").replace("-theme.json", "") || "dark";
    console.log(`\n=== ${name} ===`);
    console.log(`  registry ${total}, theme ${total - missing.length}, coverage ${pct}%`);
    if (missing.length === 0) {
      console.log("  no missing tokens");
      continue;
    }
    console.log(`  missing ${missing.length}:`);
    for (const id of missing) { console.log(`    ${id}`); }
    worst = Math.max(worst, 0);
  }

  const outPath = path.join(REPORTS_DIR(), "vscode-token-gap.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        registrySize: registry.size,
        themes: perTheme.map(({ file, missing, pct }) => ({
          theme: file,
          coverage: `${pct}%`,
          missing,
        })),
      },
      null,
      2
    ) + "\n"
  );
  console.error(`\nwrote ${path.relative(process.cwd(), outPath)}`);

  // Also write the registry itself, so tools/fill-missing-tokens.js can consume
  // it without duplicating the fetch. The two tools are a pair: the audit finds
  // the gap, the fill closes it.
  const registryPath = path.join(REPORTS_DIR(), "vscode-registry.txt");
  fs.writeFileSync(registryPath, [...registry].sort().join("\n") + "\n");
  console.error(`wrote ${path.relative(process.cwd(), registryPath)}`);
}

/** Reports directory, resolved lazily so tests can redirect it. */
function REPORTS_DIR() {
  return path.join(ROOT, "reports");
}

main();
