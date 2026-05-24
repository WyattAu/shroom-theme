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
  const config = vscode.workspace.getConfiguration("shroom-space");

  applyAccentColor(config.get<string>("accentColor") ?? "default");

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("shroom-space.accentColor")) {
        applyAccentColor(config.get<string>("accentColor") ?? "default");
      }
      if (event.affectsConfiguration("shroom-space.autoSwitch")) {
        applyAutoSwitch(config.get<boolean>("autoSwitch") ?? false);
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

function applyAccentColor(accent: string): void {
  if (accent === "default") {
    vscode.workspace.getConfiguration("workbench").update(
      "colorCustomizations",
      {},
      vscode.ConfigurationTarget.Global
    );
    return;
  }

  const overrides = ACCENT_MAP[accent];
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
