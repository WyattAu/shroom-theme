/*
Copyright 2024-2026 Wyatt Au

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import * as vscode from "vscode";
import { generateFromHsl } from "./theme-generator";

const DARK_THEME_ID = "wyattau.shroom-space-theme";
const LIGHT_THEME_ID = "wyattau.shroom-space-light-theme";

const ACCENT_MAP: Record<string, Record<string, string>> = {
  purple: {
    "editor.findMatchBackground": "#393552",
    "editor.selectionBackground": "#393552",
  },
  teal: {
    "editor.findMatchBackground": "#1A3A38",
    "editor.selectionBackground": "#1A3A38",
  },
  green: {
    "editor.findMatchBackground": "#2A3520",
    "editor.selectionBackground": "#2A3520",
  },
  amber: {
    "editor.findMatchBackground": "#3A3220",
    "editor.selectionBackground": "#3A3220",
  },
  red: {
    "editor.findMatchBackground": "#3A2020",
    "editor.selectionBackground": "#3A2020",
  },
  pink: {
    "editor.findMatchBackground": "#3A2030",
    "editor.selectionBackground": "#3A2030",
  },
  cyan: {
    "editor.findMatchBackground": "#1A3540",
    "editor.selectionBackground": "#1A3540",
  },
};

export function activate(context: vscode.ExtensionContext): void {
  const telemetryLogger = vscode.env.createTelemetryLogger({
    sendEventData() { /* VS Code respects user telemetry opt-in */ },
    sendErrorData() { /* noop */ },
  });

  const config = vscode.workspace.getConfiguration("shroom-space");

  applyAccentColor(config.get<string>("accentColor") ?? "default", config);

  telemetryLogger.logUsage("activated");

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("shroom-space.accentColor")) {
        const accent = config.get<string>("accentColor") ?? "default";
        applyAccentColor(accent, config);
        telemetryLogger.logUsage("accentColorChanged", { color: accent });
      }
      if (event.affectsConfiguration("shroom-space.autoSwitch")) {
        const enabled = config.get<boolean>("autoSwitch") ?? false;
        applyAutoSwitch(enabled);
        telemetryLogger.logUsage("autoSwitchToggled", { enabled: String(enabled) });
      }
    })
  );

  applyAutoSwitch(config.get<boolean>("autoSwitch") ?? false);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveColorTheme((theme) => {
      const autoSwitch = config.get<boolean>("autoSwitch");
      if (autoSwitch) {
        handleColorThemeChange(theme.kind);
      }
    })
  );
}

function applyAccentColor(accent: string, config: vscode.WorkspaceConfiguration): void {
  if (accent === "default") {
    vscode.workspace.getConfiguration("workbench").update(
      "colorCustomizations",
      {},
      vscode.ConfigurationTarget.Global
    );
    return;
  }

  let overrides: Record<string, string> | undefined;

  if (accent === "custom") {
    const hslStr = config.get<string>("customAccentHsl") ?? "";
    const parts = hslStr.split(",").map(Number);
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      overrides = generateFromHsl(parts[0], parts[1], parts[2]);
    }
  } else {
    overrides = ACCENT_MAP[accent];
  }

  if (!overrides) {
    return;
  }

  vscode.workspace.getConfiguration("workbench").update(
    "colorCustomizations",
    {
      editor: overrides,
    },
    vscode.ConfigurationTarget.Global
  );
}

function applyAutoSwitch(enabled: boolean): void {
  if (!enabled) {
    return;
  }

  const kind = vscode.window.activeColorTheme.kind;
  handleColorThemeChange(kind);
}

function handleColorThemeChange(kind: vscode.ColorThemeKind): void {
  if (kind === vscode.ColorThemeKind.Light) {
    vscode.workspace.getConfiguration("workbench").update(
      "colorTheme",
      LIGHT_THEME_ID,
      vscode.ConfigurationTarget.Global
    );
  } else if (kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast) {
    vscode.workspace.getConfiguration("workbench").update(
      "colorTheme",
      DARK_THEME_ID,
      vscode.ConfigurationTarget.Global
    );
  }
}

export function deactivate(): void {
  // VS Code disposes context subscriptions automatically.
}
