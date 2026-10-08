#!/usr/bin/env node

"use strict";

/**
 * Add VS Code colour tokens the theme is missing, derived from the palette.
 *
 * Found by comparing the theme against the `registerColor` calls on the VS Code
 * main branch. All 104 missing tokens are new VS Code features -- the agent and
 * chat surfaces, the modern UI family, and a few misc -- rather than
 * regressions in existing coverage.
 *
 * Derivation rules are explicit and ordered, because a token named
 * `modernEditorTab.activeHoverActionBackground` needs a rule that says which
 * existing colour it mirrors. Unmatched tokens are reported rather than guessed.
 *
 * Writes all 7 variants, deriving each from that variant's own palette so the
 * relationships hold for light and high contrast too.
 */

const fs = require("fs");
const path = require("path");

const THEMES_DIR = path.resolve(__dirname, "..", "themes");

/**
 * Ordered derivation rules. First match wins.
 *
 * `from` is either a literal colour key, or a template whose `*` is replaced
 * with the segment(s) of the missing key. `to` is a palette key resolved in the
 * theme being written, so each variant derives from its own colours.
 */
const RULES = [
  // Modern UI family: each mirrors its non-modern counterpart. Where the
  // non-modern key is absent from this theme -- activityBar.hoverBackground,
  // sash.gripForeground -- the rule falls through to a colour that fills the
  // same role, so the derived token is not simply missing.
  { match: /^modernActivityBar\.activeBackground$/, from: "activityBar.activeBackground" },
  { match: /^modernActivityBar\.activeForeground$/, from: "activityBar.foreground" },
  { match: /^modernActivityBar\.background$/, from: "activityBar.background" },
  { match: /^modernActivityBar\.border$/, from: "activityBar.border" },
  { match: /^modernActivityBar\.hoverBackground$/, from: "tab.hoverBackground" },
  { match: /^modernActivityBar\.hoverForeground$/, from: "activityBar.foreground" },
  { match: /^modernActivityBar\.inactiveBackground$/, from: "activityBar.background" },
  { match: /^modernActivityBarItem\.activeBackground$/, from: "activityBar.activeBackground" },
  { match: /^modernActivityBarItem\.activeForeground$/, from: "activityBar.foreground" },
  { match: /^modernActivityBarItem\.hoverBackground$/, from: "tab.hoverBackground" },
  { match: /^modernActivityBarItem\.hoverForeground$/, from: "activityBar.foreground" },
  { match: /^modernEditorTab\.activeActionBackground$/, from: "tab.activeBackground" },
  { match: /^modernEditorTab\.activeBackground$/, from: "tab.activeBackground" },
  { match: /^modernEditorTab\.activeForeground$/, from: "tab.activeForeground" },
  { match: /^modernEditorTab\.activeHoverActionBackground$/, from: "tab.hoverBackground" },
  { match: /^modernEditorTab\.activeHoverBackground$/, from: "tab.hoverBackground" },
  { match: /^modernEditorTab\.hoverActionBackground$/, from: "tab.hoverBackground" },
  { match: /^modernEditorTab\.hoverBackground$/, from: "tab.hoverBackground" },
  { match: /^modernEditorTab\.hoverForeground$/, from: "tab.activeForeground" },
  { match: /^modernEditorTab\.inactiveBackground$/, from: "tab.inactiveBackground" },
  { match: /^modernEditorTab\.selectedActionBackground$/, from: "tab.activeBackground" },
  { match: /^modernPanel\.border$/, from: "panel.border" },
  { match: /^modernSash\.gripForeground$/, from: "foreground" },
  { match: /^modernTab\.activeBackground$/, from: "tab.activeBackground" },
  { match: /^modernTab\.activeForeground$/, from: "tab.activeForeground" },
  { match: /^modernTab\.hoverBackground$/, from: "tab.hoverBackground" },
  { match: /^modernTab\.hoverForeground$/, from: "tab.activeForeground" },
  { match: /^modernUI\.inactiveShellBackground$/, from: "terminal.background" },
  { match: /^modernUI\.shellBackground$/, from: "terminal.background" },

  // Surfaces and borders.
  { match: /^surface\.background$/, from: "editor.background" },
  { match: /^surface\.border$/, from: "editorGroup.border" },
  { match: /^surface\.foreground$/, from: "editor.foreground" },
  { match: /^browser\.border$/, from: "panel.border" },
  { match: /^editor\.border$/, from: "editorGroup.border" },
  { match: /^tab\.divider$/, from: "tab.border" },

  // Misc new tokens.
  { match: /^strongForeground$/, from: "editorCursor.foreground" },
  { match: /^statusBar\.inactiveBackground$/, from: "statusBar.background" },
  { match: /^quickInput\.list\.focusBackground$/, from: "list.activeSelectionBackground" },
  { match: /^quickInputList\.focusHighlightForeground$/, from: "list.highlightForeground" },
  { match: /^commentsView\.resolvedIcon$/, from: "gitDecoration.addedResourceForeground" },
  { match: /^commentsView\.unresolvedIcon$/, from: "testing.iconUnset" },
  { match: /^editorInlayHint\.paramForeground$/, from: "editorInlayHint.parameterForeground" },
  { match: /^editorGroupHeader\.connectedTabsBackground$/, from: "editorGroupHeader.tabsBackground" },

  // Agent and chat surfaces: follow the inline-chat convention of a slightly
  // lifted background over the editor, with the accent for emphasis.
  { match: /^agentFeedbackEditorWidget\.background$/, from: "inlineChat.background" },
  { match: /^agentFeedbackEditorWidget\.border$/, from: "inlineChat.border" },
  { match: /^agentFeedbackInputWidget\.border$/, from: "input.border" },
  { match: /^agents.*\.background$/, from: "inlineChat.background" },
  { match: /^agents.*\.border$/, from: "inlineChat.border" },
  { match: /^agents.*\.foreground$/, from: "editor.foreground" },
  { match: /^agentsBadge\.background$/, from: "activityBarBadge.background" },
  { match: /^agentsBadge\.foreground$/, from: "activityBarBadge.foreground" },
  { match: /^agentsBottomPanel\.border$/, from: "panel.border" },
  { match: /^agentsCard\.border$/, from: "panel.border" },
  { match: /^agentsChatInput\.background$/, from: "input.background" },
  { match: /^agentsChatInput\.border$/, from: "input.border" },
  { match: /^agentsChatInput\.focusBorder$/, from: "focusBorder" },
  { match: /^agentsChatInput\.placeholderForeground$/, from: "input.placeholderForeground" },
  { match: /^agentsGradient\.tintColor$/, from: "activityBarBadge.background" },
  { match: /^agentsMobileDiff\.addedForeground$/, from: "gitDecoration.addedResourceForeground" },
  { match: /^agentsMobileDiff\.deletedForeground$/, from: "gitDecoration.deletedResourceForeground" },
  { match: /^agentsMobileDiff\.modifiedForeground$/, from: "gitDecoration.modifiedResourceForeground" },
  { match: /^agentsNewSessionButton\.hoverBackground$/, from: "button.hoverBackground" },
  { match: /^agentsUpdateButton\.downloadedBackground$/, from: "button.background" },
  { match: /^agentsUpdateButton\.downloadingBackground$/, from: "button.hoverBackground" },
  { match: /^agentsVoice\.speakingBackground$/, from: "inlineChat.background" },
  { match: /^agentsVoice\.speakingForeground$/, from: "editor.foreground" },

  { match: /^chat\.avatarBackground$/, from: "inlineChat.background" },
  { match: /^chat\.avatarForeground$/, from: "editor.foreground" },
  { match: /^chat\.checkpointSeparator$/, from: "panel.border" },
  { match: /^chat\.dictationActiveMicGlow$/, from: "focusBorder" },
  { match: /^chat\.findMatchBackground$/, from: "editor.findMatchBackground" },
  { match: /^chat\.findMatchHighlightBackground$/, from: "editor.findMatchHighlightBackground" },
  { match: /^chat\.inputWorkingBorderColor1$/, from: "focusBorder" },
  { match: /^chat\.inputWorkingBorderColor2$/, from: "activityBarBadge.background" },
  { match: /^chat\.inputWorkingBorderColor3$/, from: "editorInfo.foreground" },
  { match: /^chat\.linesAddedForeground$/, from: "gitDecoration.addedResourceForeground" },
  { match: /^chat\.linesRemovedForeground$/, from: "gitDecoration.deletedResourceForeground" },
  { match: /^chat\.mcpCompatibilityWarningForeground$/, from: "editorWarning.foreground" },
  { match: /^chat\.requestBackground$/, from: "inlineChat.background" },
  { match: /^chat\.requestBorder$/, from: "inlineChat.border" },
  { match: /^chat\.requestBubbleBackground$/, from: "inlineChat.background" },
  { match: /^chat\.requestBubbleHoverBackground$/, from: "inlineChat.background" },
  { match: /^chat\.requestCodeBorder$/, from: "panel.border" },
  { match: /^chat\.sessionStateIndicator\.inProgressBorder$/, from: "focusBorder" },
  { match: /^chat\.sessionStateIndicator\.needsInputBorder$/, from: "editorWarning.foreground" },
  { match: /^chat\.sessionStateIndicator\.unvisitedBorder$/, from: "panel.border" },
  { match: /^chat\.statusBackground$/, from: "inlineChat.background" },
  { match: /^chat\.thinkingShimmer$/, from: "editorGhostText.foreground" },
  { match: /^chat\.voiceGlowBaseColor$/, from: "focusBorder" },
  { match: /^chat\.voiceListeningGlow$/, from: "focusBorder" },
  { match: /^chat\.voiceSpeakingGlow$/, from: "activityBarBadge.background" },
  { match: /^chat\.workingProgressInsidersIconForeground$/, from: "editorInfo.foreground" },
  { match: /^chat\.workingProgressStableIconForeground$/, from: "editorInfo.foreground" },

  { match: /^activeSessionView\.background$/, from: "inlineChat.background" },
  { match: /^activeSessionView\.border$/, from: "inlineChat.border" },
  { match: /^activeSessionView\.foreground$/, from: "editor.foreground" },
  { match: /^inactiveSessionView\.background$/, from: "inlineChat.background" },
  { match: /^inactiveSessionView\.foreground$/, from: "editor.foreground" },
];

/**
 * Derive a colour for a missing token from a theme's own palette.
 *
 * @param {string} key the missing VS Code colour ID
 * @param {Record<string,string>} colors the theme's existing colours
 * @returns {string|null} hex, or null when no rule matches or the source
 *   colour is absent from this theme
 */
function derive(key, colors) {
  for (const rule of RULES) {
    if (!rule.match.test(key)) { continue; }
    const value = colors[rule.from];
    if (typeof value === "string" && /^#[0-9A-Fa-f]{6,8}$/.test(value)) {
      return value;
    }
  }
  return null;
}

/**
 * Add missing tokens to one theme in place.
 * @param {string} file
 * @param {Set<string>} registry every VS Code colour ID
 * @returns {{added:string[], unmatched:string[]}}
 */
function fillTheme(file, registry) {
  const filePath = path.join(THEMES_DIR, file);
  const theme = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const added = [];
  const unmatched = [];

  for (const key of registry) {
    if (theme.colors[key]) { continue; }
    const value = derive(key, theme.colors);
    if (value === null) {
      unmatched.push(key);
      continue;
    }
    theme.colors[key] = value;
    added.push(key);
  }

  if (added.length > 0) {
    // Keys are written in insertion order; sorting keeps diffs stable across runs.
    const sorted = {};
    for (const k of Object.keys(theme.colors).sort()) { sorted[k] = theme.colors[k]; }
    theme.colors = sorted;
    fs.writeFileSync(filePath, JSON.stringify(theme, null, 2) + "\n", "utf8");
  }
  return { added, unmatched };
}

function main() {
  const registryPath = path.resolve(__dirname, "..", "reports", "vscode-registry.txt");
  if (!fs.existsSync(registryPath)) {
    console.error(`missing ${registryPath}. Run the VS Code registry fetch first.`);
    process.exit(1);
  }
  const registry = new Set(
    fs.readFileSync(registryPath, "utf8").split("\n").map((s) => s.trim()).filter(Boolean)
  );
  console.log(`VS Code registry: ${registry.size} colour IDs`);

  const files = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const { added, unmatched } = fillTheme(file, registry);
    const name = file.replace("shroom-space-", "").replace("-theme.json", "") || "dark";
    console.log(
      `${name.padEnd(14)} added ${added.length}` +
        (unmatched.length ? `, unmatched ${unmatched.length}: ${unmatched.join(", ")}` : "")
    );
  }
}

if (require.main === module) { main(); }

module.exports = { derive, fillTheme, RULES };
