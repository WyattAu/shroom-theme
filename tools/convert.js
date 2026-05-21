#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const THEMES_DIR = path.resolve(__dirname, "..", "themes");
const EXPORTS_DIR = path.resolve(__dirname, "..", "exports");

const DIRS = {
  tmTheme: path.join(EXPORTS_DIR, "tmTheme"),
  jetbrains: path.join(EXPORTS_DIR, "jetbrains"),
  vim: path.join(EXPORTS_DIR, "vim"),
  wt: path.join(EXPORTS_DIR, "windows-terminal"),
  iterm2: path.join(EXPORTS_DIR, "iterm2"),
  warp: path.join(EXPORTS_DIR, "warp"),
  alacritty: path.join(EXPORTS_DIR, "alacritty"),
  kitty: path.join(EXPORTS_DIR, "kitty"),
};

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function simpleYamlStringify(obj, indent = 0) {
  const pad = "  ".repeat(indent);
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      lines.push(`${pad}${key}:`);
      for (const item of value) {
        lines.push(`${pad}  - '${item}'`);
      }
    } else if (typeof value === "string") {
      lines.push(`${pad}${key}: '${value}'`);
    } else if (typeof value === "number" || typeof value === "boolean") {
      lines.push(`${pad}${key}: ${value}`);
    } else if (typeof value === "object" && value !== null) {
      lines.push(`${pad}${key}:`);
      lines.push(simpleYamlStringify(value, indent + 1));
    }
  }
  return lines.join("\n");
}

function getColor(colors, key, fallback) {
  if (colors[key]) return colors[key];
  return fallback || "";
}

function findTokenColor(tokenColors, scopes) {
  const scopeSet = new Set(scopes);
  for (const tc of tokenColors) {
    const tcScopes = Array.isArray(tc.scope) ? tc.scope : [tc.scope];
    for (const s of tcScopes) {
      if (scopeSet.has(s)) return tc.settings;
    }
  }
  return null;
}

function getAnsiColors(colors) {
  const bg = getColor(colors, "editor.background", "#000000");
  const fg = getColor(colors, "editor.foreground", "#cccccc");

  const ansiBlack = getColor(colors, "terminal.ansiBlack", bg);
  const ansiRed = getColor(colors, "terminal.ansiRed", "#e68484");
  const ansiGreen = getColor(colors, "terminal.ansiGreen", "#a6c18b");
  const ansiYellow = getColor(colors, "terminal.ansiYellow", "#ffcb6b");
  const ansiBlue = getColor(colors, "terminal.ansiBlue", "#74d7c8");
  const ansiMagenta = getColor(colors, "terminal.ansiMagenta", "#be9af7");
  const ansiCyan = getColor(colors, "terminal.ansiCyan", "#85e0d2");
  const ansiWhite = getColor(colors, "terminal.ansiWhite", fg);

  const ansiBrightBlack = getColor(colors, "terminal.ansiBrightBlack", "#726d89");
  const ansiBrightRed = getColor(colors, "terminal.ansiBrightRed", ansiRed);
  const ansiBrightGreen = getColor(colors, "terminal.ansiBrightGreen", ansiGreen);
  const ansiBrightYellow = getColor(colors, "terminal.ansiBrightYellow", ansiYellow);
  const ansiBrightBlue = getColor(colors, "terminal.ansiBrightBlue", ansiBlue);
  const ansiBrightMagenta = getColor(colors, "terminal.ansiBrightMagenta", ansiMagenta);
  const ansiBrightCyan = getColor(colors, "terminal.ansiBrightCyan", ansiCyan);
  const ansiBrightWhite = getColor(colors, "terminal.ansiBrightWhite", fg);

  return {
    ansiBlack, ansiRed, ansiGreen, ansiYellow, ansiBlue, ansiMagenta, ansiCyan, ansiWhite,
    ansiBrightBlack, ansiBrightRed, ansiBrightGreen, ansiBrightYellow, ansiBrightBlue,
    ansiBrightMagenta, ansiBrightCyan, ansiBrightWhite,
  };
}

function convertToTmTheme(theme) {
  const colors = theme.colors || {};
  const tokenColors = theme.tokenColors || [];
  const name = escapeXml(theme.name);

  const bg = getColor(colors, "editor.background", "#000000");
  const fg = getColor(colors, "editor.foreground", "#cccccc");
  const caret = getColor(colors, "editorCursor.foreground", fg);
  const selection = getColor(colors, "editor.selectionBackground", "#393552");
  const lineHighlight = getColor(colors, "editor.lineHighlightBackground", "");
  const inactiveSelection = getColor(colors, "editor.inactiveSelectionBackground", "");

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>name</key>
\t<string>${name}</string>
\t<key>settings</key>
\t<dict>
\t\t<key>background</key>
\t\t<string>${bg}</string>
\t\t<key>foreground</key>
\t\t<string>${fg}</string>
\t\t<key>caret</key>
\t\t<string>${caret}</string>
\t\t<key>selection</key>
\t\t<string>${selection}</string>`;

  if (lineHighlight) {
    xml += `\n\t\t<key>lineHighlight</key>
\t\t<string>${lineHighlight}</string>`;
  }
  if (inactiveSelection) {
    xml += `\n\t\t<key>inactiveSelection</key>
\t\t<string>${inactiveSelection}</string>`;
  }

  xml += `\n\t</dict>
\t<key>uuid</key>
\t<string>${crypto.randomUUID ? crypto.randomUUID() : slugify(theme.name) + "-uuid"}</string>
\t<key>colorSpaceName</key>
\t<string>sRGB</string>
\t<key>semanticClass</key>
\t<string>${theme.type}.${slugify(theme.name)}</string>
\t<key>author</key>
\t<string>Shroom Space</string>
\t<key>comment</key>
\t<string>Converted from ${escapeXml(theme.name)} VS Code theme</string>
</dict>
\t<key>settings</key>
\t<array>`;

  for (const tc of tokenColors) {
    const scopes = Array.isArray(tc.scope) ? tc.scope : tc.scope ? [tc.scope] : [];
    if (scopes.length === 0) continue;

    const scopeStr = escapeXml(scopes.join(", "));
    const s = tc.settings || {};
    const tcName = escapeXml(tc.name || scopes[0]);

    xml += `\n\t\t<dict>
\t\t\t<key>name</key>
\t\t\t<string>${tcName}</string>
\t\t\t<key>scope</key>
\t\t\t<string>${scopeStr}</string>
\t\t\t<key>settings</key>
\t\t\t<dict>`;
    if (s.foreground) xml += `\n\t\t\t\t<key>foreground</key>\n\t\t\t\t<string>${escapeXml(s.foreground)}</string>`;
    if (s.background) xml += `\n\t\t\t\t<key>background</key>\n\t\t\t\t<string>${escapeXml(s.background)}</string>`;
    if (s.fontStyle) xml += `\n\t\t\t\t<key>fontStyle</key>\n\t\t\t\t<string>${escapeXml(s.fontStyle)}</string>`;
    xml += `\n\t\t\t</dict>
\t\t</dict>`;
  }

  xml += `\n\t</array>
</dict>
</plist>`;

  return xml;
}

function convertToJetBrains(theme) {
  const colors = theme.colors || {};
  const tokenColors = theme.tokenColors || [];
  const name = escapeXml(theme.name);
  const isDark = theme.type === "dark";

  const bg = getColor(colors, "editor.background", "#000000");
  const fg = getColor(colors, "editor.foreground", "#cccccc");
  const caret = getColor(colors, "editorCursor.foreground", fg);
  const selection = getColor(colors, "editor.selectionBackground", "#393552");
  const gutterBg = getColor(colors, "editorGutter.background", bg);
  const lineNum = getColor(colors, "editorLineNumber.foreground", fg);
  const lineNumActive = getColor(colors, "editorLineNumber.activeForeground", fg);
  const whitespace = getColor(colors, "editorWhitespace.foreground", fg);

  const comment = findTokenColor(tokenColors, ["comment", "punctuation.definition.comment"]);
  const string = findTokenColor(tokenColors, ["string", "punctuation.definition.string"]);
  const keyword = findTokenColor(tokenColors, ["keyword", "storage.type"]);
  const number = findTokenColor(tokenColors, ["constant.numeric"]);
  const func = findTokenColor(tokenColors, ["entity.name.function", "support.function"]);
  const type = findTokenColor(tokenColors, ["entity.name.type", "entity.name.class", "support.type"]);
  const variable = findTokenColor(tokenColors, ["variable", "variable.parameter"]);
  const invalid = findTokenColor(tokenColors, ["invalid"]);
  const decorator = findTokenColor(tokenColors, ["meta.decorator", "entity.name.decorator"]);

  function opt(val, key) {
    if (!val) return "";
    return `\n      <option name="${key}" value="${val}" />`;
  }

  const c = (v) => v?.foreground ? v.foreground : "";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<scheme name="${name}" version="142" parent_scheme="${isDark ? "Darcula" : "Default"}">
  <colors>
    <option name="ADDITIONAL_TEXT_ALIGNMENT" value="" />
    <option name="ANNOTATIONS_COLOR" value="" />
    <option name="CARET_COLOR" value="${caret}" />
    <option name="CARET_ROW_COLOR" value="${getColor(colors, "editor.lineHighlightBackground", "")}" />
    <option name="CONSOLE_BACKGROUND_KEY" value="${bg}" />
    <option name="GUTTER_BACKGROUND" value="${gutterBg}" />
    <option name="LINE_NUMBERS_COLOR" value="${lineNum}" />
    <option name="LINE_NUMBER_ON_CARET_ROW_COLOR" value="${lineNumActive}" />
    <option name="SELECTION_BACKGROUND" value="${selection}" />
    <option name="WHITESPACES" value="${whitespace}" />
    <option name="RIGHT_MARGIN_COLOR" value="${getColor(colors, "editorRuler.foreground", "")}" />
  </colors>
  <attributes>
    <option name="TEXT">
      <value>
        <option name="FOREGROUND" value="${fg}" />
        <option name="BACKGROUND" value="${bg}" />
      </value>
    </option>
    <option name="COMMENT">
      <value>${opt(c(comment), "FOREGROUND")}${comment?.fontStyle?.includes("italic") ? '\n        <option name="FONT_TYPE" value="2" />' : ""}</value>
    </option>
    <option name="LINE_COMMENT">
      <value>${opt(c(comment), "FOREGROUND")}</value>
    </option>
    <option name="BLOCK_COMMENT">
      <value>${opt(c(comment), "FOREGROUND")}</value>
    </option>
    <option name="DOC_COMMENT">
      <value>${opt(c(comment), "FOREGROUND")}</value>
    </option>
    <option name="STRING">
      <value>${opt(c(string), "FOREGROUND")}</value>
    </option>
    <option name="TEXT_BLOCK">
      <value>${opt(c(string), "FOREGROUND")}</value>
    </option>
    <option name="KEYWORD">
      <value>${opt(c(keyword), "FOREGROUND")}${keyword?.fontStyle?.includes("bold") ? '\n        <option name="FONT_TYPE" value="1" />' : ""}</value>
    </option>
    <option name="NUMBER">
      <value>${opt(c(number), "FOREGROUND")}</value>
    </option>
    <option name="FUNCTION_DECLARATION">
      <value>${opt(c(func), "FOREGROUND")}</value>
    </option>
    <option name="METHOD_DECLARATION">
      <value>${opt(c(func), "FOREGROUND")}</value>
    </option>
    <option name="DEFAULT_FUNCTION_CALL">
      <value>${opt(c(func), "FOREGROUND")}</value>
    </option>
    <option name="FUNCTION_CALL">
      <value>${opt(c(func), "FOREGROUND")}</value>
    </option>
    <option name="CLASS_NAME">
      <value>${opt(c(type), "FOREGROUND")}${type?.fontStyle?.includes("italic") ? '\n        <option name="FONT_TYPE" value="2" />' : ""}</value>
    </option>
    <option name="TYPE_NAME">
      <value>${opt(c(type), "FOREGROUND")}</value>
    </option>
    <option name="DEFAULT_IDENTIFIER">
      <value>${opt(c(variable), "FOREGROUND")}</value>
    </option>
    <option name="LOCAL_VARIABLE">
      <value>${opt(c(variable), "FOREGROUND")}</value>
    </option>
    <option name="PARAMETER">
      <value>${opt(c(variable), "FOREGROUND")}</value>
    </option>
    <option name="INVALID_TOKEN">
      <value>${opt(c(invalid), "FOREGROUND")}</value>
    </option>
    <option name="ERROR_TOKEN">
      <value>${opt(c(invalid), "FOREGROUND")}</value>
    </option>
    <option name="DECORATOR">
      <value>${opt(c(decorator), "FOREGROUND")}</value>
    </option>
    <option name="ANNOTATION_NAME">
      <value>${opt(c(decorator), "FOREGROUND")}</value>
    </option>
    <option name="TAG_NAME">
      <value>${opt(c(keyword), "FOREGROUND")}</value>
    </option>
    <option name="HTML_TAG_NAME">
      <value>${opt(c(keyword), "FOREGROUND")}</value>
    </option>
    <option name="CSS.PROPERTY_NAME">
      <value>${opt(c(variable), "FOREGROUND")}</value>
    </option>
    <option name="CSS.COLOR">
      <value>${opt(c(number), "FOREGROUND")}</value>
    </option>
    <option name="REGEXP">
      <value>${opt(c(string), "FOREGROUND")}</value>
    </option>
  </attributes>
</scheme>`;

  return xml;
}

function convertToVim(theme) {
  const colors = theme.colors || {};
  const tokenColors = theme.tokenColors || [];
  const isDark = theme.type === "dark";
  const name = theme.name;
  const slug = slugify(name);

  const bg = getColor(colors, "editor.background", "#000000");
  const fg = getColor(colors, "editor.foreground", "#cccccc");
  const cursor = getColor(colors, "editorCursor.foreground", fg);
  const selection = getColor(colors, "editor.selectionBackground", "#393552");

  const ansi = getAnsiColors(colors);

  const comment = findTokenColor(tokenColors, ["comment", "punctuation.definition.comment"]);
  const string = findTokenColor(tokenColors, ["string", "punctuation.definition.string"]);
  const keyword = findTokenColor(tokenColors, ["keyword", "storage.type"]);
  const number = findTokenColor(tokenColors, ["constant.numeric"]);
  const func = findTokenColor(tokenColors, ["entity.name.function", "support.function"]);
  const type = findTokenColor(tokenColors, ["entity.name.type", "entity.name.class", "support.type"]);
  const variable = findTokenColor(tokenColors, ["variable", "variable.parameter"]);
  const constant = findTokenColor(tokenColors, ["constant.language"]);
  const invalid = findTokenColor(tokenColors, ["invalid"]);
  const decorator = findTokenColor(tokenColors, ["meta.decorator", "entity.name.decorator"]);
  const storageMod = findTokenColor(tokenColors, ["storage.modifier"]);
  const property = findTokenColor(tokenColors, ["variable.other.property", "support.type.property-name"]);

  const c = (v) => v?.foreground || "";
  const bold = (v) => (v?.fontStyle?.includes("bold") ? " cterm=bold gui=bold" : "");
  const italic = (v) => (v?.fontStyle?.includes("italic") ? " cterm=italic gui=italic" : "");

  let vim = `" ${name} - Vim/Neovim color scheme
" Converted from ${name} VS Code theme

if exists("g:colors_name")
  finish
endif
if &t_Co < 256
  finish
endif

hi clear
syntax reset
let g:colors_name = "${slug}"
set ${isDark ? "background=dark" : "background=light"}

hi Normal guifg=${fg} guibg=${bg} gui=NONE cterm=NONE
hi Cursor guifg=${bg} guibg=${cursor} gui=NONE cterm=NONE
hi CursorLine guibg=${getColor(colors, "editor.lineHighlightBackground", "NONE")} gui=NONE cterm=NONE
hi CursorColumn guibg=${getColor(colors, "editor.lineHighlightBackground", "NONE")} gui=NONE cterm=NONE
hi Visual guibg=${selection} gui=NONE cterm=NONE
hi VisualNOS guibg=${selection} gui=NONE cterm=NONE
hi Search guibg=${selection} gui=NONE cterm=NONE
hi IncSearch guibg=${selection} gui=NONE cterm=NONE
hi LineNr guifg=${getColor(colors, "editorLineNumber.foreground", fg)} guibg=NONE gui=NONE cterm=NONE
hi CursorLineNr guifg=${getColor(colors, "editorLineNumber.activeForeground", fg)} guibg=NONE gui=bold cterm=bold
hi SignColumn guifg=${fg} guibg=${getColor(colors, "editorGutter.background", bg)} gui=NONE cterm=NONE
hi Folded guifg=${getColor(colors, "editor.foreground", fg)} guibg=${bg} gui=italic cterm=italic
hi FoldColumn guifg=${fg} guibg=${bg} gui=NONE cterm=NONE
hi StatusLine guifg=${getColor(colors, "statusBar.foreground", fg)} guibg=${getColor(colors, "statusBar.background", bg)} gui=NONE cterm=NONE
hi StatusLineNC guifg=${getColor(colors, "titleBar.inactiveForeground", fg)} guibg=${getColor(colors, "titleBar.inactiveBackground", bg)} gui=NONE cterm=NONE
hi VertSplit guifg=${getColor(colors, "editorGroup.border", fg)} guibg=NONE gui=NONE cterm=NONE
hi TabLine guifg=${getColor(colors, "tab.inactiveForeground", fg)} guibg=${getColor(colors, "tab.inactiveBackground", bg)} gui=NONE cterm=NONE
hi TabLineFill guibg=${getColor(colors, "tab.border", bg)} gui=NONE cterm=NONE
hi TabLineSel guifg=${getColor(colors, "tab.activeForeground", fg)} guibg=${getColor(colors, "tab.activeBackground", bg)} gui=bold cterm=bold
hi Title guifg=${fg} gui=bold cterm=bold
hi NonText guifg=${getColor(colors, "editorWhitespace.foreground", fg)} gui=NONE cterm=NONE
hi SpecialKey guifg=${getColor(colors, "editorWhitespace.foreground", fg)} gui=NONE cterm=NONE
hi Whitespace guifg=${getColor(colors, "editorWhitespace.foreground", fg)} gui=NONE cterm=NONE
hi Directory guifg=${c(func) || fg} gui=bold cterm=bold
hi ErrorMsg guifg=${c(invalid) || fg} guibg=NONE gui=bold cterm=bold
hi WarningMsg guifg=${getColor(colors, "editorWarning.foreground", fg)} guibg=NONE gui=NONE cterm=NONE
hi MoreMsg guifg=${c(func) || fg} gui=bold cterm=bold
hi ModeMsg guifg=${fg} gui=NONE cterm=NONE
hi MatchParen guibg=${selection} gui=bold cterm=bold
hi Pmenu guifg=${fg} guibg=${getColor(colors, "dropdown.background", bg)} gui=NONE cterm=NONE
hi PmenuSel guifg=${getColor(colors, "list.activeSelectionForeground", fg)} guibg=${selection} gui=NONE cterm=NONE
hi PmenuSbar guibg=${bg} gui=NONE cterm=NONE
hi PmenuThumb guibg=${selection} gui=NONE cterm=NONE
hi WildMenu guifg=${bg} guibg=${c(func) || fg} gui=NONE cterm=NONE
hi Conceal guifg=${fg} guibg=NONE gui=NONE cterm=NONE
hi EndOfBuffer guifg=${getColor(colors, "editorWhitespace.foreground", bg)} gui=NONE cterm=NONE
hi QuickFixLine guibg=${selection} gui=NONE cterm=NONE
hi DiffAdd guifg=${getColor(colors, "editorGutter.addedBackground", "#a6c18b")} guibg=NONE gui=NONE cterm=NONE
hi DiffChange guifg=${getColor(colors, "editorGutter.modifiedBackground", "#ffcb6b")} guibg=NONE gui=NONE cterm=NONE
hi DiffDelete guifg=${getColor(colors, "editorGutter.deletedBackground", "#e68484")} guibg=NONE gui=NONE cterm=NONE
hi DiffText guifg=${fg} guibg=NONE gui=NONE cterm=NONE
hi SpellBad guifg=${c(invalid) || fg} gui=undercurl cterm=undercurl
hi SpellCap guifg=${getColor(colors, "editorInfo.foreground", fg)} gui=undercurl cterm=undercurl
hi SpellRare guifg=${getColor(colors, "editorWarning.foreground", fg)} gui=undercurl cterm=undercurl
hi SpellLocal guifg=${c(keyword) || fg} gui=undercurl cterm=undercurl

hi Comment guifg=${c(comment) || fg} gui=italic cterm=italic
hi Constant guifg=${c(constant) || c(number) || fg} gui=NONE cterm=NONE
hi String guifg=${c(string) || fg} gui=NONE cterm=NONE
hi Character guifg=${c(string) || fg} gui=NONE cterm=NONE
hi Number guifg=${c(number) || fg} gui=NONE cterm=NONE
hi Boolean guifg=${c(constant) || c(number) || fg} gui=NONE cterm=NONE
hi Float guifg=${c(number) || fg} gui=NONE cterm=NONE
hi Identifier guifg=${c(variable) || fg} gui=NONE cterm=NONE
hi Function guifg=${c(func) || fg} gui=NONE cterm=NONE
hi Statement guifg=${c(keyword) || fg}${bold(keyword)} gui=NONE cterm=NONE
hi Conditional guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi Repeat guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi Label guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi Operator guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi Keyword guifg=${c(keyword) || fg}${bold(keyword)} cterm=NONE
hi Exception guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi PreProc guifg=${c(decorator) || c(keyword) || fg} gui=NONE cterm=NONE
hi Include guifg=${c(decorator) || c(keyword) || fg} gui=NONE cterm=NONE
hi Define guifg=${c(decorator) || c(keyword) || fg} gui=NONE cterm=NONE
hi Macro guifg=${c(decorator) || c(keyword) || fg} gui=NONE cterm=NONE
hi PreCondit guifg=${c(decorator) || c(keyword) || fg} gui=NONE cterm=NONE
hi Type guifg=${c(type) || fg}${italic(type)} cterm=NONE
hi StorageClass guifg=${c(storageMod) || c(keyword) || fg}${italic(storageMod)} cterm=NONE
hi Structure guifg=${c(type) || fg}${italic(type)} cterm=NONE
hi Typedef guifg=${c(type) || fg}${italic(type)} cterm=NONE
hi Special guifg=${c(decorator) || fg} gui=NONE cterm=NONE
hi SpecialChar guifg=${c(string) || fg} gui=NONE cterm=NONE
hi Tag guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi Delimiter guifg=${fg} gui=NONE cterm=NONE
hi SpecialComment guifg=${c(comment) || fg} gui=italic cterm=italic
hi Debug guifg=${c(invalid) || fg} gui=NONE cterm=NONE
hi Underlined guifg=${fg} gui=underline cterm=underline
hi Ignore guifg=${fg} gui=NONE cterm=NONE
hi Error guifg=${c(invalid) || fg} guibg=NONE gui=bold cterm=bold
hi Todo guifg=${c(keyword) || fg} guibg=NONE gui=bold,italic cterm=bold,italic
hi htmlTag guifg=${fg} gui=NONE cterm=NONE
hi htmlEndTag guifg=${fg} gui=NONE cterm=NONE
hi htmlTagName guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi htmlArg guifg=${c(variable) || fg} gui=NONE cterm=NONE
hi xmlTag guifg=${fg} gui=NONE cterm=NONE
hi xmlTagName guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi xmlAttrib guifg=${c(variable) || fg} gui=NONE cterm=NONE
hi cssTagName guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi cssClassName guifg=${c(type) || fg}${italic(type)} cterm=NONE
hi cssIdentifier guifg=${c(func) || fg} gui=NONE cterm=NONE
hi cssProp guifg=${c(property) || fg} gui=NONE cterm=NONE
hi cssValueLength guifg=${c(number) || fg} gui=NONE cterm=NONE
hi javaScript guifg=${fg} gui=NONE cterm=NONE
hi javaScriptFunction guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi javaScriptIdentifier guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi javaScriptStringS guifg=${c(string) || fg} gui=NONE cterm=NONE
hi javaScriptStringD guifg=${c(string) || fg} gui=NONE cterm=NONE
hi javaScriptNumber guifg=${c(number) || fg} gui=NONE cterm=NONE
hi javaScriptMember guifg=${c(func) || fg} gui=NONE cterm=NONE
hi typescriptReserved guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi typescriptIdentifier guifg=${c(variable) || fg} gui=NONE cterm=NONE
hi typescriptProp guifg=${c(property) || fg} gui=NONE cterm=NONE
hi typescriptMember guifg=${c(func) || fg} gui=NONE cterm=NONE
hi typescriptAbstract guifg=${c(keyword) || fg} gui=italic cterm=italic
hi pythonBuiltin guifg=${c(func) || fg} gui=NONE cterm=NONE
hi pythonStatement guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi pythonDecorator guifg=${c(decorator) || fg} gui=NONE cterm=NONE
hi rubyControl guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi rubyClass guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi rubyDefine guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi goDeclaration guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi goBuiltins guifg=${c(func) || fg} gui=NONE cterm=NONE
hi rustKeyword guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi rustType guifg=${c(type) || fg} gui=NONE cterm=NONE
hi rustFuncCall guifg=${c(func) || fg} gui=NONE cterm=NONE
hi cType guifg=${c(type) || fg} gui=NONE cterm=NONE
hi cStorageClass guifg=${c(storageMod) || c(keyword) || fg} gui=NONE cterm=NONE
hi markdownHeading guifg=${c(keyword) || fg} gui=bold cterm=bold
hi markdownCode guifg=${c(string) || fg} gui=NONE cterm=NONE
hi markdownCodeBlock guifg=${c(string) || fg} gui=NONE cterm=NONE
hi markdownLinkText guifg=${c(func) || fg} gui=NONE cterm=NONE
hi jsonKeyword guifg=${c(property) || c(keyword) || fg} gui=NONE cterm=NONE
hi jsonString guifg=${c(string) || fg} gui=NONE cterm=NONE
hi jsonNumber guifg=${c(number) || fg} gui=NONE cterm=NONE
hi yamlKey guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi yamlString guifg=${c(string) || fg} gui=NONE cterm=NONE
hi tomlKey guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi tomlString guifg=${c(string) || fg} gui=NONE cterm=NONE
hi gitcommitSummary guifg=${fg} gui=NONE cterm=NONE
hi gitcommitBranch guifg=${c(func) || fg} gui=bold cterm=bold
hi diffAdded guifg=${getColor(colors, "editorGutter.addedBackground", "#a6c18b")} gui=NONE cterm=NONE
hi diffRemoved guifg=${getColor(colors, "editorGutter.deletedBackground", "#e68484")} gui=NONE cterm=NONE
hi diffChanged guifg=${getColor(colors, "editorGutter.modifiedBackground", "#ffcb6b")} gui=NONE cterm=NONE
hi diffFile guifg=${c(keyword) || fg} gui=bold cterm=bold
hi diffNewFile guifg=${c(func) || fg} gui=NONE cterm=NONE
hi nvimTreeNormal guifg=${fg} guibg=${getColor(colors, "sideBar.background", bg)} gui=NONE cterm=NONE
hi nvimTreeFolderIcon guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi nvimTreeFolderName guifg=${c(func) || fg} gui=NONE cterm=NONE
hi nvimTreeOpenedFolderName guifg=${c(func) || fg} gui=NONE cterm=NONE
hi nvimTreeSpecialFile guifg=${c(string) || fg} gui=NONE cterm=NONE
hi NvimTreeExecFile guifg=${c(string) || fg} gui=NONE cterm=NONE
hi TelescopeNormal guifg=${fg} guibg=${bg} gui=NONE cterm=NONE
hi TelescopeBorder guifg=${getColor(colors, "focusBorder", fg)} guibg=${bg} gui=NONE cterm=NONE
hi TelescopeSelection guibg=${selection} gui=NONE cterm=NONE
hi TelescopeMatching guifg=${c(keyword) || fg} gui=bold cterm=bold
hi TelescopePromptNormal guifg=${fg} guibg=${bg} gui=NONE cterm=NONE
hi TelescopePromptBorder guifg=${getColor(colors, "focusBorder", fg)} guibg=${bg} gui=NONE cterm=NONE
hi WhichKey guifg=${c(func) || fg} gui=NONE cterm=NONE
hi WhichKeyGroup guifg=${c(keyword) || fg} gui=NONE cterm=NONE
hi WhichKeyDesc guifg=${fg} gui=NONE cterm=NONE
hi WhichKeySeparator guifg=${c(comment) || fg} gui=NONE cterm=NONE
hi NotifyERROR guifg=${c(invalid) || fg} gui=NONE cterm=NONE
hi NotifyWARN guifg=${getColor(colors, "editorWarning.foreground", fg)} gui=NONE cterm=NONE
hi NotifyINFO guifg=${getColor(colors, "editorInfo.foreground", fg)} gui=NONE cterm=NONE
hi NotifyDEBUG guifg=${c(comment) || fg} gui=NONE cterm=NONE
hi NotifyTRACE guifg=${c(comment) || fg} gui=NONE cterm=NONE
hi IndentBlanklineChar guifg=${getColor(colors, "editorIndentGuide.background", fg)} gui=NONE cterm=NONE
hi IndentBlanklineContextChar guifg=${getColor(colors, "editorIndentGuide.activeBackground", fg)} gui=NONE cterm=NONE
hi DiagnosticError guifg=${getColor(colors, "editorError.foreground", fg)} gui=NONE cterm=NONE
hi DiagnosticWarn guifg=${getColor(colors, "editorWarning.foreground", fg)} gui=NONE cterm=NONE
hi DiagnosticInfo guifg=${getColor(colors, "editorInfo.foreground", fg)} gui=NONE cterm=NONE
hi DiagnosticHint guifg=${getColor(colors, "editorInfo.foreground", fg)} gui=NONE cterm=NONE
hi DiagnosticSignError guifg=${getColor(colors, "editorError.foreground", fg)} gui=NONE cterm=NONE
hi DiagnosticSignWarn guifg=${getColor(colors, "editorWarning.foreground", fg)} gui=NONE cterm=NONE
hi DiagnosticSignInfo guifg=${getColor(colors, "editorInfo.foreground", fg)} gui=NONE cterm=NONE
hi DiagnosticSignHint guifg=${getColor(colors, "editorInfo.foreground", fg)} gui=NONE cterm=NONE
hi LspReferenceText guibg=${selection} gui=NONE cterm=NONE
hi LspReferenceRead guibg=${selection} gui=NONE cterm=NONE
hi LspReferenceWrite guibg=${selection} gui=NONE cterm=NONE

if has("termguicolors")
  let g:terminal_color_0 = "${ansi.ansiBlack}"
  let g:terminal_color_1 = "${ansi.ansiRed}"
  let g:terminal_color_2 = "${ansi.ansiGreen}"
  let g:terminal_color_3 = "${ansi.ansiYellow}"
  let g:terminal_color_4 = "${ansi.ansiBlue}"
  let g:terminal_color_5 = "${ansi.ansiMagenta}"
  let g:terminal_color_6 = "${ansi.ansiCyan}"
  let g:terminal_color_7 = "${ansi.ansiWhite}"
  let g:terminal_color_8 = "${ansi.ansiBrightBlack}"
  let g:terminal_color_9 = "${ansi.ansiBrightRed}"
  let g:terminal_color_10 = "${ansi.ansiBrightGreen}"
  let g:terminal_color_11 = "${ansi.ansiBrightYellow}"
  let g:terminal_color_12 = "${ansi.ansiBrightBlue}"
  let g:terminal_color_13 = "${ansi.ansiBrightMagenta}"
  let g:terminal_color_14 = "${ansi.ansiBrightCyan}"
  let g:terminal_color_15 = "${ansi.ansiBrightWhite}"
endif
`;

  return vim;
}

function convertToWindowsTerminal(theme) {
  const colors = theme.colors || {};
  const ansi = getAnsiColors(colors);

  const bg = getColor(colors, "terminal.background", getColor(colors, "editor.background", "#000000"));
  const fg = getColor(colors, "terminal.foreground", getColor(colors, "editor.foreground", "#cccccc"));
  const cursor = getColor(colors, "editorCursor.foreground", fg);
  const selection = getColor(colors, "terminal.selectionBackground", getColor(colors, "editor.selectionBackground", "#393552"));
  const cursorStyle = "bar";

  const scheme = {
    name: theme.name,
    background: bg,
    foreground: fg,
    cursorColor: cursor,
    cursorShape: cursorStyle,
    selectionBackground: selection,
    black: ansi.ansiBlack,
    red: ansi.ansiRed,
    green: ansi.ansiGreen,
    yellow: ansi.ansiYellow,
    blue: ansi.ansiBlue,
    purple: ansi.ansiMagenta,
    cyan: ansi.ansiCyan,
    white: ansi.ansiWhite,
    brightBlack: ansi.ansiBrightBlack,
    brightRed: ansi.ansiBrightRed,
    brightGreen: ansi.ansiBrightGreen,
    brightYellow: ansi.ansiBrightYellow,
    brightBlue: ansi.ansiBrightBlue,
    brightPurple: ansi.ansiBrightMagenta,
    brightCyan: ansi.ansiBrightCyan,
    brightWhite: ansi.ansiBrightWhite,
  };

  return JSON.stringify({ schemes: [scheme] }, null, 2) + "\n";
}

function convertToITerm2(theme) {
  const colors = theme.colors || {};
  const ansi = getAnsiColors(colors);
  const name = theme.name;

  const plist = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">`,
    `<plist version="1.0">`,
    `<dict>`,
    `  <key>Ansi 0 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiBlack.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiBlack.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiBlack.slice(5,7),16)/255}</real></dict>`,
    `  <key>Ansi 1 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiRed.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiRed.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiRed.slice(5,7),16)/255}</real></dict>`,
    `  <key>Ansi 2 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiGreen.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiGreen.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiGreen.slice(5,7),16)/255}</real></dict>`,
    `  <key>Ansi 3 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiYellow.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiYellow.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiYellow.slice(5,7),16)/255}</real></dict>`,
    `  <key>Ansi 4 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiBlue.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiBlue.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiBlue.slice(5,7),16)/255}</real></dict>`,
    `  <key>Ansi 5 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiMagenta.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiMagenta.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiMagenta.slice(5,7),16)/255}</real></dict>`,
    `  <key>Ansi 6 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiCyan.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiCyan.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiCyan.slice(5,7),16)/255}</real></dict>`,
    `  <key>Ansi 7 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiWhite.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiWhite.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiWhite.slice(5,7),16)/255}</real></dict>`,
    `  <key>Ansi 8 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiBrightBlack.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiBrightBlack.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiBrightBlack.slice(5,7),16)/255}</real></dict>`,
    `  <key>Ansi 9 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiBrightRed.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiBrightRed.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiBrightRed.slice(5,7),16)/255}</real></dict>`,
    `  <key>Ansi 10 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiBrightGreen.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiBrightGreen.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiBrightGreen.slice(5,7),16)/255}</real></dict>`,
    `  <key>Ansi 11 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiBrightYellow.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiBrightYellow.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiBrightYellow.slice(5,7),16)/255}</real></dict>`,
    `  <key>Ansi 12 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiBrightBlue.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiBrightBlue.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiBrightBlue.slice(5,7),16)/255}</real></dict>`,
    `  <key>Ansi 13 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiBrightMagenta.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiBrightMagenta.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiBrightMagenta.slice(5,7),16)/255}</real></dict>`,
    `  <key>Ansi 14 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiBrightCyan.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiBrightCyan.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiBrightCyan.slice(5,7),16)/255}</real></dict>`,
    `  <key>Ansi 15 Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(ansi.ansiBrightWhite.slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(ansi.ansiBrightWhite.slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(ansi.ansiBrightWhite.slice(5,7),16)/255}</real></dict>`,
    `  <key>Background Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(getColor(colors, "terminal.background", getColor(colors, "editor.background", "#000000")).slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(getColor(colors, "terminal.background", getColor(colors, "editor.background", "#000000")).slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(getColor(colors, "terminal.background", getColor(colors, "editor.background", "#000000")).slice(5,7),16)/255}</real></dict>`,
    `  <key>Foreground Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(getColor(colors, "terminal.foreground", getColor(colors, "editor.foreground", "#cccccc")).slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(getColor(colors, "terminal.foreground", getColor(colors, "editor.foreground", "#cccccc")).slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(getColor(colors, "terminal.foreground", getColor(colors, "editor.foreground", "#cccccc")).slice(5,7),16)/255}</real></dict>`,
    `  <key>Cursor Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(getColor(colors, "editorCursor.foreground", "#ffffff").slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(getColor(colors, "editorCursor.foreground", "#ffffff").slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(getColor(colors, "editorCursor.foreground", "#ffffff").slice(5,7),16)/255}</real></dict>`,
    `  <key>Bold Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(getColor(colors, "editor.foreground", "#cccccc").slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(getColor(colors, "editor.foreground", "#cccccc").slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(getColor(colors, "editor.foreground", "#cccccc").slice(5,7),16)/255}</real></dict>`,
    `  <key>Cursor Text Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(getColor(colors, "editor.background", "#000000").slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(getColor(colors, "editor.background", "#000000").slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(getColor(colors, "editor.background", "#000000").slice(5,7),16)/255}</real></dict>`,
    `  <key>Selected Text Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(getColor(colors, "editor.foreground", "#cccccc").slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(getColor(colors, "editor.foreground", "#cccccc").slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(getColor(colors, "editor.foreground", "#cccccc").slice(5,7),16)/255}</real></dict>`,
    `  <key>Selection Color</key>`,
    `  <dict><key>Color Space</key><data>sRGB</data><key>Red Component</key><real>${parseInt(getColor(colors, "editor.selectionBackground", "#393552").slice(1,3),16)/255}</real><key>Green Component</key><real>${parseInt(getColor(colors, "editor.selectionBackground", "#393552").slice(3,5),16)/255}</real><key>Blue Component</key><real>${parseInt(getColor(colors, "editor.selectionBackground", "#393552").slice(5,7),16)/255}</real></dict>`,
    `</dict>`,
    `</plist>`,
  ].join("\n");
  return plist;
}

function convertToWarp(theme) {
  const colors = theme.colors || {};
  const ansi = getAnsiColors(colors);
  const bg = getColor(colors, "terminal.background", getColor(colors, "editor.background", "#000000"));
  const fg = getColor(colors, "terminal.foreground", getColor(colors, "editor.foreground", "#cccccc"));
  const cursor = getColor(colors, "editorCursor.foreground", fg);
  const selection = getColor(colors, "terminal.selectionBackground", getColor(colors, "editor.selectionBackground", "#393552"));

  const warpTheme = {
    background: bg,
    foreground: fg,
    cursor: cursor,
    cursor_text_color: bg,
    selection: selection,
    ansi: [
      ansi.ansiBlack, ansi.ansiRed, ansi.ansiGreen, ansi.ansiYellow,
      ansi.ansiBlue, ansi.ansiMagenta, ansi.ansiCyan, ansi.ansiWhite,
    ],
    brights: [
      ansi.ansiBrightBlack, ansi.ansiBrightRed, ansi.ansiBrightGreen, ansi.ansiBrightYellow,
      ansi.ansiBrightBlue, ansi.ansiBrightMagenta, ansi.ansiBrightCyan, ansi.ansiBrightWhite,
    ],
  };

  return simpleYamlStringify({ name: theme.name, ...warpTheme }) + "\n";
}

function convertToAlacritty(theme) {
  const colors = theme.colors || {};
  const ansi = getAnsiColors(colors);
  const bg = getColor(colors, "terminal.background", getColor(colors, "editor.background", "#000000"));
  const fg = getColor(colors, "terminal.foreground", getColor(colors, "editor.foreground", "#cccccc"));

  const toml = `# ${theme.name} - Alacritty color scheme
# Converted from ${theme.name} VS Code theme

[colors.primary]
background = "${bg}"
foreground = "${fg}"

[colors.normal]
black = "${ansi.ansiBlack}"
red = "${ansi.ansiRed}"
green = "${ansi.ansiGreen}"
yellow = "${ansi.ansiYellow}"
blue = "${ansi.ansiBlue}"
magenta = "${ansi.ansiMagenta}"
cyan = "${ansi.ansiCyan}"
white = "${ansi.ansiWhite}"

[colors.bright]
black = "${ansi.ansiBrightBlack}"
red = "${ansi.ansiBrightRed}"
green = "${ansi.ansiBrightGreen}"
yellow = "${ansi.ansiBrightYellow}"
blue = "${ansi.ansiBrightBlue}"
magenta = "${ansi.ansiBrightMagenta}"
cyan = "${ansi.ansiBrightCyan}"
white = "${ansi.ansiBrightWhite}"
`;
  return toml;
}

function convertToKitty(theme) {
  const colors = theme.colors || {};
  const ansi = getAnsiColors(colors);
  const bg = getColor(colors, "terminal.background", getColor(colors, "editor.background", "#000000"));
  const fg = getColor(colors, "terminal.foreground", getColor(colors, "editor.foreground", "#cccccc"));
  const cursor = getColor(colors, "editorCursor.foreground", fg);
  const selection = getColor(colors, "editor.selectionBackground", getColor(colors, "editor.selectionBackground", "#393552"));
  const slug = slugify(theme.name);

  return `# ${theme.name} - Kitty color scheme
# Converted from ${theme.name} VS Code theme

color0 ${ansi.ansiBlack}
color1 ${ansi.ansiRed}
color2 ${ansi.ansiGreen}
color3 ${ansi.ansiYellow}
color4 ${ansi.ansiBlue}
color5 ${ansi.ansiMagenta}
color6 ${ansi.ansiCyan}
color7 ${ansi.ansiWhite}
color8 ${ansi.ansiBrightBlack}
color9 ${ansi.ansiBrightRed}
color10 ${ansi.ansiBrightGreen}
color11 ${ansi.ansiBrightYellow}
color12 ${ansi.ansiBrightBlue}
color13 ${ansi.ansiBrightMagenta}
color14 ${ansi.ansiBrightCyan}
color15 ${ansi.ansiBrightWhite}
background ${bg}
foreground ${fg}
cursor ${cursor}
selection_background ${selection}
selection_foreground ${fg}
`;
}

async function main() {
  for (const dir of Object.values(DIRS)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const themeFiles = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith(".json"));
  if (themeFiles.length === 0) {
    console.error("No theme files found in", THEMES_DIR);
    process.exit(1);
  }

  console.log(`Found ${themeFiles.length} theme(s)\n`);

  for (const file of themeFiles) {
    const filePath = path.join(THEMES_DIR, file);
    const theme = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const slug = slugify(theme.name);

    console.log(`Converting: ${theme.name}`);

    const tmTheme = convertToTmTheme(theme);
    fs.writeFileSync(path.join(DIRS.tmTheme, `${slug}.tmTheme`), tmTheme);
    console.log(`  -> tmTheme/${slug}.tmTheme`);

    const icls = convertToJetBrains(theme);
    fs.writeFileSync(path.join(DIRS.jetbrains, `${slug}.icls`), icls);
    console.log(`  -> jetbrains/${slug}.icls`);

    const vim = convertToVim(theme);
    fs.writeFileSync(path.join(DIRS.vim, `${slug}.vim`), vim);
    console.log(`  -> vim/${slug}.vim`);

    const wt = convertToWindowsTerminal(theme);
    fs.writeFileSync(path.join(DIRS.wt, `${slug}.json`), wt);
    console.log(`  -> windows-terminal/${slug}.json`);

    const iterm2 = convertToITerm2(theme);
    fs.writeFileSync(path.join(DIRS.iterm2, `${slug}.itermcolors`), iterm2);
    console.log(`  -> iterm2/${slug}.itermcolors`);

    const warp = convertToWarp(theme);
    fs.writeFileSync(path.join(DIRS.warp, `${slug}.yaml`), warp);
    console.log(`  -> warp/${slug}.yaml`);

    const alacritty = convertToAlacritty(theme);
    fs.writeFileSync(path.join(DIRS.alacritty, `${slug}.toml`), alacritty);
    console.log(`  -> alacritty/${slug}.toml`);

    const kitty = convertToKitty(theme);
    fs.writeFileSync(path.join(DIRS.kitty, `${slug}.conf`), kitty);
    console.log(`  -> kitty/${slug}.conf`);

    console.log();
  }

  console.log("Done! All exports written to", EXPORTS_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

module.exports = { main };
