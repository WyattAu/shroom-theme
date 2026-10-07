#!/usr/bin/env node

"use strict";

/**
 * Single entry point for the palette repair and diagnostic tools.
 *
 * Subcommands:
 *   repair [--dry-run]   Contrast, then lightness separation. Idempotent.
 *   gamut                Report chroma headroom per token colour.
 *   matrix               CVD collision matrix report.
 *
 * `rotate-variable-hue` was removed. It applied a fixed +54 degree offset
 * unconditionally, so a second run rotated the variable another 54 degrees: the
 * palette went pink, then salmon. The rotation is a one-shot decision that is
 * now baked into the themes and recorded in the CHANGELOG, not a repeatable
 * step, and leaving a non-idempotent tool next to idempotent ones is how the
 * wrong one gets run.
 *
 * Everything here is safe to run repeatedly. `repair` writes only when a value
 * actually changes; `gamut` and `matrix` are read-only.
 */

const path = require("path");

const SUBCOMMANDS = {
  repair: "./repair-pipeline.js",
  gamut: "./gamut-headroom.js",
  matrix: "./cvd-matrix.js",
};

function usage() {
  console.log("usage: node tools/repair-palette.js <subcommand> [args]");
  console.log("");
  console.log("  repair [--dry-run]   Lift sub-AA tokens, then break isoluminance.");
  console.log("                       Idempotent. --dry-run reports without writing.");
  console.log("  gamut                Chroma headroom per token colour (read-only).");
  console.log("  matrix               CVD collision matrix report (read-only).");
  process.exit(1);
}

function main() {
  const sub = process.argv[2];
  if (!sub || !SUBCOMMANDS[sub]) { usage(); }

  if (sub === "repair" && process.argv.includes("--dry-run")) {
    // Run in a throwaway directory tree so the writes land somewhere harmless.
    // The repair tools resolve themes/ relative to their own location, so the
    // cheapest correct dry-run is to copy the repo state, run, and diff.
    const fs = require("fs");
    const os = require("os");
    const { execFileSync } = require("child_process");

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "shroom-dryrun-"));
    for (const entry of ["color-science.js", "themes", "tools"]) {
      fs.cpSync(path.resolve(__dirname, "..", entry), path.join(tmp, entry), {
        recursive: true,
      });
    }

    const before = JSON.stringify(
      fs.readdirSync(path.join(tmp, "themes")).sort().map((f) => [
        f,
        fs.readFileSync(path.join(tmp, "themes", f), "utf8"),
      ])
    );

    execFileSync(
      process.execPath,
      [path.join(tmp, "tools", "repair-pipeline.js")],
      { stdio: "inherit" }
    );

    const after = JSON.stringify(
      fs.readdirSync(path.join(tmp, "themes")).sort().map((f) => [
        f,
        fs.readFileSync(path.join(tmp, "themes", f), "utf8"),
      ])
    );

    fs.rmSync(tmp, { recursive: true, force: true });

    if (before === after) {
      console.log("\ndry-run: no changes. The palette is already repaired.");
      return;
    }
    console.log(
      "\ndry-run: changes WOULD be applied. Re-run without --dry-run to apply."
    );
    return;
  }

  // Read-only diagnostics are run as child processes. They already have
  // `require.main` guards, and re-exporting their `main()` would mean every
  // tool carrying a main export for one caller's benefit.
  const { execFileSync } = require("child_process");
  execFileSync(process.execPath, [path.resolve(__dirname, SUBCOMMANDS[sub])], {
    stdio: "inherit",
  });
}

main();
