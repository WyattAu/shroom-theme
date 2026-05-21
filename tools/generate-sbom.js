#!/usr/bin/env node

/**
 * Generates a Software Bill of Materials (SBOM) in SPDX JSON format.
 * Uses npm list to extract dependency information.
 *
 * Output: reports/sbom.spdx.json
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.resolve(__dirname, '..', 'reports');

function getNpmList() {
  const output = execSync('npm ls --all --json', { encoding: 'utf8', timeout: 30000 });
  return JSON.parse(output);
}

function extractPackages(npmTree, depth) {
  const packages = [];
  if (npmTree.dependencies) {
    for (const [name, info] of Object.entries(npmTree.dependencies)) {
      packages.push({
        name,
        version: info.version || 'unknown',
        isDev: info.dev === true || depth === 0,
      });
      if (info.dependencies) {
        packages.push(...extractPackagesPackages(info, depth + 1));
      }
    }
  }
  return packages;
}

function extractPackagesPackages(node, depth) {
  const packages = [];
  if (node.dependencies) {
    for (const [name, info] of Object.entries(node.dependencies)) {
      packages.push({
        name,
        version: info.version || 'unknown',
        isDev: info.dev === true,
      });
      if (info.dependencies) {
        packages.push(...extractPackagesPackages(info, depth + 1));
      }
    }
  }
  return packages;
}

function generateSpdx(packages) {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const pkg = require(path.resolve(__dirname, '..', 'package.json'));

  const spdxPackages = packages.map((p, i) => ({
    SPDXID: `SPDXRef-${i}`,
    name: p.name,
    versionInfo: p.version,
    downloadedLocation: `NOASSERTION`,
    filesAnalyzed: false,
    primaryPackagePurpose: p.isDev ? 'DEVELOPMENT' : 'OTHER',
  }));

  return {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name: `${pkg.name}-${pkg.version}`,
    documentNamespace: `https://wyattau.github.io/shroom-theme/sbom/${pkg.version}`,
    creationInfo: {
      created: now,
      creators: ['Tool: shroom-theme-generate-sbom'],
    },
    packages: spdxPackages,
    relationships: spdxPackages.map((p) => ({
      spdxElementId: 'SPDXRef-DOCUMENT',
      relationshipType: 'DEPENDS_ON',
      relatedSpdxElement: p.SPDXID,
    })),
  };
}

function main() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const npmTree = getNpmList();
  const packages = extractPackages(npmTree, 0);
  const sbom = generateSpdx(packages);

  const outputPath = path.join(REPORTS_DIR, 'sbom.spdx.json');
  fs.writeFileSync(outputPath, JSON.stringify(sbom, null, 2) + '\n');
  console.log(`SBOM generated: ${outputPath} (${packages.length} packages)`);
}

main();
