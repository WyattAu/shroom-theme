#!/usr/bin/env node
/**
 * Generate native editor themes (Neovim Lua + Helix TOML) from VS Code theme JSON files.
 *
 * Usage: node tools/generate-editors.js
 *
 * Output:
 *   editors/neovim/colors/shroom-space.lua          (per variant)
 *   editors/helix/shroom_space.toml                 (per variant)
 */

const fs = require('fs');
const path = require('path');

const themesDir = path.join(__dirname, '..', 'themes');
const neovimDir = path.join(__dirname, '..', 'editors', 'neovim', 'colors');
const helixDir = path.join(__dirname, '..', 'editors', 'helix');

// --- Helpers ---

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function hexToAnsi(hex) {
  const { r, g, b } = hexToRgb(hex);
  // Approximate to ANSI 256-color
  if (r === g && g === b) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round((r - 8) / 247 * 24) + 232;
  }
  return 16 + 36 * Math.round(r / 51) + 6 * Math.round(g / 51) + Math.round(b / 51);
}

function extractPalette(theme) {
  const c = theme.colors || {};
  const tc = theme.tokenColors || [];

  // Build scope -> color map
  const scopeMap = {};
  for (const rule of tc) {
    const scopes = Array.isArray(rule.scope) ? rule.scope : [rule.scope];
    const fg = rule.settings?.foreground;
    if (fg) {
      for (const s of scopes) {
        if (!scopeMap[s]) scopeMap[s] = fg;
      }
    }
  }

  return {
    bg: c['editor.background'] || '#24212E',
    fg: c['editor.foreground'] || '#CCC8D9',
    bgDark: c['activityBar.background'] || '#1E1C29',
    bgDarker: c['titleBar.activeBackground'] || '#1E1C29',
    bgLight: c['sideBar.background'] || '#2A2739',
    bgHighlight: c['editor.lineHighlightBackground'] || '#2A2739',
    selection: c['editor.selectionBackground'] || '#393552',
    cursor: c['editorCursor.foreground'] || '#E0DEF4',
    lineNumber: c['editorLineNumber.foreground'] || '#726D8980',
    lineNumberActive: c['editorLineNumber.activeForeground'] || '#CCC8D9',
    whitespace: c['editorIndentGuide.background'] || '#726D8950',
    indentGuide: c['editorIndentGuide.activeBackground'] || '#BE9AF7',
    error: c['editorError.foreground'] || '#E68484',
    warning: c['editorWarning.foreground'] || '#FFCB6B',
    info: c['editorInfo.foreground'] || '#74D7C8',
    added: c['editorGutter.addedBackground'] || '#A6C18B',
    deleted: c['editorGutter.deletedBackground'] || '#E68484',
    modified: c['editorGutter.modifiedBackground'] || '#FFCB6B',
    findMatch: c['editor.findMatchBackground'] || '#BE9AF730',
    accent: c['focusBorder'] || '#726D89',
    inputBg: c['input.background'] || '#393552',
    inputFg: c['input.foreground'] || '#E0DEF4',
    inputBorder: c['input.border'] || '#726D89',
    tabActive: c['tab.activeBackground'] || '#24212E',
    tabInactive: c['tab.inactiveBackground'] || '#1E1C29',
    // Syntax colors (from tokenColors scope map)
    comment: scopeMap['comment'] || '#726D89',
    keyword: scopeMap['keyword'] || '#BE9AF7',
    string: scopeMap['string'] || '#A6C18B',
    number: scopeMap['constant.numeric'] || '#E8C990',
    constant: scopeMap['constant.language'] || '#E8C990',
    variable: scopeMap['variable'] || '#82AAFF',
    func: scopeMap['entity.name.function'] || '#74D7C8',
    type: scopeMap['entity.name.type'] || '#E8C990',
    class: scopeMap['entity.name.class'] || scopeMap['entity.name.type'] || '#E8C990',
    namespace: scopeMap['entity.name.namespace'] || '#E8C990',
    operator: scopeMap['keyword.operator'] || '#BE9AF7',
    punctuation: scopeMap['punctuation'] || scopeMap['punctuation.accessor'] || '#726D89',
    regexp: scopeMap['string.regexp'] || '#E8C990',
    tag: scopeMap['entity.name.tag'] || '#BE9AF7',
    attribute: scopeMap['entity.other.attribute-name'] || '#E8C990',
    decorator: scopeMap['meta.decorator'] || '#FFCB6B',
    // Palette accents
    purple: '#BE9AF7',
    teal: '#74D7C8',
    green: '#A6C18B',
    amber: '#E8C990',
    red: '#E68484',
    blue: '#82AAFF',
    muted: '#726D89',
  };
}

function neovimName(theme) {
  return theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function helixName(theme) {
  return theme.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
}

// --- Neovim Generator ---

function generateNeovim(theme, p) {
  const name = neovimName(theme);
  const isLight = theme.type === 'light';
  const isHc = theme.type === 'hc';
  const bgSetting = isLight ? 'light' : 'dark';

  return `-- ${theme.name} for Neovim
-- Generated from VS Code theme. Do not edit manually.
-- Install: copy to ~/.config/nvim/colors/${name}.lua or use as plugin

local M = {}

M.palette = {
  bg         = "${p.bg}",
  fg         = "${p.fg}",
  bg_dark    = "${p.bgDark}",
  bg_darker  = "${p.bgDarker}",
  bg_light   = "${p.bgLight}",
  bg_highlight = "${p.bgHighlight}",
  selection  = "${p.selection}",
  cursor     = "${p.cursor}",
  line_number = "${p.lineNumber}",
  line_number_active = "${p.lineNumberActive}",
  whitespace = "${p.whitespace}",
  indent_guide = "${p.indentGuide}",
  error      = "${p.error}",
  warning    = "${p.warning}",
  info       = "${p.info}",
  added      = "${p.added}",
  deleted    = "${p.deleted}",
  modified   = "${p.modified}",
  find_match = "${p.findMatch}",
  accent     = "${p.accent}",
  comment    = "${p.comment}",
  keyword    = "${p.keyword}",
  string     = "${p.string}",
  number     = "${p.number}",
  constant   = "${p.constant}",
  variable   = "${p.variable}",
  func       = "${p.func}",
  type       = "${p.type}",
  class      = "${p.class}",
  namespace  = "${p.namespace}",
  operator   = "${p.operator}",
  punctuation = "${p.punctuation}",
  regexp     = "${p.regexp}",
  tag        = "${p.tag}",
  attribute  = "${p.attribute}",
  decorator  = "${p.decorator}",
  purple     = "${p.purple}",
  teal       = "${p.teal}",
  green      = "${p.green}",
  amber      = "${p.amber}",
  red        = "${p.red}",
  blue       = "${p.blue}",
  muted      = "${p.muted}",
}

function M.setup()
  vim.cmd("highlight clear")
  if vim.fn.exists("syntax_on") then
    vim.cmd("syntax reset")
  end
  vim.o.background = "${bgSetting}"
  vim.o.termguicolors = true
  vim.g.colors_name = "${name}"

  local hl = vim.api.nvim_set_hl
  local p = M.palette

  -- Editor
  hl(0, "Normal",        { fg = p.fg, bg = p.bg })
  hl(0, "NormalFloat",   { fg = p.fg, bg = p.bg_light })
  hl(0, "FloatBorder",   { fg = p.accent, bg = p.bg_light })
  hl(0, "ColorColumn",   { bg = p.bg_light })
  hl(0, "CursorLine",    { bg = p.bg_highlight })
  hl(0, "CursorColumn",  { bg = p.bg_highlight })
  hl(0, "CursorLineNr",  { fg = p.line_number_active, bold = true })
  hl(0, "LineNr",        { fg = p.line_number })
  hl(0, "SignColumn",    { fg = p.line_number, bg = p.bg })
  hl(0, "VertSplit",     { fg = p.accent })
  hl(0, "WinSeparator",  { fg = p.accent })
  hl(0, "TabLine",       { fg = p.muted, bg = p.tab_inactive })
  hl(0, "TabLineFill",   { bg = p.bg_dark })
  hl(0, "TabLineSel",    { fg = p.fg, bg = p.tab_active })
  hl(0, "StatusLine",    { fg = p.fg, bg = p.bg_dark })
  hl(0, "StatusLineNC",  { fg = p.muted, bg = p.bg_darker })
  hl(0, "Pmenu",         { fg = p.fg, bg = p.bg_light })
  hl(0, "PmenuSel",      { fg = p.bg, bg = p.purple })
  hl(0, "PmenuSbar",     { bg = p.bg_light })
  hl(0, "PmenuThumb",    { bg = p.accent })
  hl(0, "Search",        { fg = p.fg, bg = p.find_match })
  hl(0, "IncSearch",     { fg = p.bg, bg = p.purple })
  hl(0, "CurSearch",     { fg = p.bg, bg = p.purple, bold = true })
  hl(0, "Visual",        { bg = p.selection })
  hl(0, "VisualNOS",     { bg = p.selection })
  hl(0, "MatchParen",    { fg = p.purple, bold = true })
  hl(0, "NonText",       { fg = p.whitespace })
  hl(0, "Whitespace",    { fg = p.whitespace })
  hl(0, "SpecialKey",    { fg = p.whitespace })
  hl(0, "Folded",        { fg = p.muted, bg = p.bg_light, italic = true })
  hl(0, "FoldColumn",    { fg = p.muted })
  hl(0, "Directory",     { fg = p.blue })
  hl(0, "Title",         { fg = p.purple, bold = true })
  hl(0, "MsgArea",       { fg = p.fg })
  hl(0, "ModeMsg",       { fg = p.teal })
  hl(0, "MoreMsg",       { fg = p.teal })
  hl(0, "Question",      { fg = p.teal })
  hl(0, "WarningMsg",    { fg = p.warning })
  hl(0, "ErrorMsg",      { fg = p.error })
  hl(0, "EndOfBuffer",   { fg = p.bg_light })
  hl(0, "Cursor",        { fg = p.bg, bg = p.cursor })
  hl(0, "lCursor",       { fg = p.bg, bg = p.cursor })
  hl(0, "TermCursor",    { fg = p.bg, bg = p.cursor })

  -- Syntax
  hl(0, "Comment",       { fg = p.comment, italic = true })
  hl(0, "Constant",      { fg = p.constant })
  hl(0, "String",        { fg = p.string })
  hl(0, "Character",     { fg = p.string })
  hl(0, "Number",        { fg = p.number })
  hl(0, "Boolean",       { fg = p.constant })
  hl(0, "Float",         { fg = p.number })
  hl(0, "Identifier",    { fg = p.variable })
  hl(0, "Function",      { fg = p.func })
  hl(0, "Statement",     { fg = p.keyword })
  hl(0, "Conditional",   { fg = p.keyword })
  hl(0, "Repeat",        { fg = p.keyword })
  hl(0, "Label",         { fg = p.keyword })
  hl(0, "Operator",      { fg = p.operator })
  hl(0, "Keyword",       { fg = p.keyword })
  hl(0, "Exception",     { fg = p.keyword })
  hl(0, "Include",       { fg = p.keyword })
  hl(0, "Define",        { fg = p.keyword })
  hl(0, "Macro",         { fg = p.keyword })
  hl(0, "PreProc",       { fg = p.keyword })
  hl(0, "PreCondit",     { fg = p.keyword })
  hl(0, "Type",          { fg = p.type, italic = true })
  hl(0, "StorageClass",  { fg = p.keyword })
  hl(0, "Structure",     { fg = p.type, italic = true })
  hl(0, "Typedef",       { fg = p.type, italic = true })
  hl(0, "Special",       { fg = p.amber })
  hl(0, "SpecialChar",   { fg = p.amber })
  hl(0, "Tag",           { fg = p.tag })
  hl(0, "Delimiter",     { fg = p.punctuation })
  hl(0, "SpecialComment",{ fg = p.comment })
  hl(0, "Debug",         { fg = p.red })
  hl(0, "Underlined",    { fg = p.blue, underline = true })
  hl(0, "Ignore",        { fg = p.muted })
  hl(0, "Error",         { fg = p.error })
  hl(0, "Todo",          { fg = p.warning, bold = true })

  -- Diagnostics
  hl(0, "DiagnosticError", { fg = p.error })
  hl(0, "DiagnosticWarn",  { fg = p.warning })
  hl(0, "DiagnosticInfo",  { fg = p.info })
  hl(0, "DiagnosticHint",  { fg = p.teal })
  hl(0, "DiagnosticOk",    { fg = p.green })
  hl(0, "DiagnosticUnderlineError", { undercurl = true, sp = p.error })
  hl(0, "DiagnosticUnderlineWarn",  { undercurl = true, sp = p.warning })
  hl(0, "DiagnosticUnderlineInfo",  { undercurl = true, sp = p.info })
  hl(0, "DiagnosticUnderlineHint",  { undercurl = true, sp = p.teal })

  -- Git signs
  hl(0, "GitSignsAdd",    { fg = p.added })
  hl(0, "GitSignsChange", { fg = p.modified })
  hl(0, "GitSignsDelete", { fg = p.deleted })
  hl(0, "GitSignsAddLn",  { fg = p.added, bg = p.bg_highlight })
  hl(0, "GitSignsChangeLn",{ fg = p.modified, bg = p.bg_highlight })
  hl(0, "GitSignsDeleteLn",{ fg = p.deleted, bg = p.bg_highlight })

  -- Diff
  hl(0, "DiffAdd",    { fg = p.added, bg = p.bg })
  hl(0, "DiffChange", { fg = p.modified, bg = p.bg })
  hl(0, "DiffDelete", { fg = p.deleted, bg = p.bg })
  hl(0, "DiffText",   { fg = p.fg, bg = p.selection })

  -- TreeSitter highlights
  hl(0, "@variable",           { fg = p.variable })
  hl(0, "@variable.builtin",   { fg = p.constant, italic = true })
  hl(0, "@variable.parameter", { fg = p.blue, italic = true })
  hl(0, "@variable.member",    { fg = p.fg })
  hl(0, "@constant",           { fg = p.constant })
  hl(0, "@constant.builtin",   { fg = p.amber })
  hl(0, "@constant.macro",     { fg = p.keyword })
  hl(0, "@module",             { fg = p.namespace })
  hl(0, "@module.builtin",     { fg = p.amber })
  hl(0, "@label",              { fg = p.blue })
  hl(0, "@string",             { fg = p.string })
  hl(0, "@string.documentation",{ fg = p.comment })
  hl(0, "@string.regexp",      { fg = p.regexp })
  hl(0, "@string.escape",      { fg = p.amber })
  hl(0, "@string.special",     { fg = p.amber })
  hl(0, "@character",          { fg = p.string })
  hl(0, "@character.special",  { fg = p.amber })
  hl(0, "@boolean",            { fg = p.constant })
  hl(0, "@number",             { fg = p.number })
  hl(0, "@number.float",       { fg = p.number })
  hl(0, "@float",              { fg = p.number })
  hl(0, "@function",           { fg = p.func })
  hl(0, "@function.builtin",   { fg = p.teal })
  hl(0, "@function.call",      { fg = p.func })
  hl(0, "@function.macro",     { fg = p.keyword })
  hl(0, "@function.method",    { fg = p.func })
  hl(0, "@function.method.call",{ fg = p.func })
  hl(0, "@constructor",        { fg = p.amber })
  hl(0, "@operator",           { fg = p.operator })
  hl(0, "@keyword",            { fg = p.keyword })
  hl(0, "@keyword.coroutine",  { fg = p.keyword })
  hl(0, "@keyword.function",   { fg = p.keyword })
  hl(0, "@keyword.operator",   { fg = p.operator })
  hl(0, "@keyword.import",     { fg = p.keyword })
  hl(0, "@keyword.type",       { fg = p.keyword })
  hl(0, "@keyword.debug",      { fg = p.red })
  hl(0, "@keyword.exception",  { fg = p.keyword })
  hl(0, "@keyword.conditional",{ fg = p.keyword })
  hl(0, "@keyword.repeat",     { fg = p.keyword })
  hl(0, "@keyword.return",     { fg = p.keyword })
  hl(0, "@keyword.directive",  { fg = p.keyword })
  hl(0, "@conditional",        { fg = p.keyword })
  hl(0, "@repeat",             { fg = p.keyword })
  hl(0, "@debug",              { fg = p.red })
  hl(0, "@exception",          { fg = p.keyword })
  hl(0, "@type",               { fg = p.type, italic = true })
  hl(0, "@type.builtin",       { fg = p.amber })
  hl(0, "@type.definition",    { fg = p.type })
  hl(0, "@type.qualifier",     { fg = p.keyword })
  hl(0, "@storageclass",       { fg = p.keyword })
  hl(0, "@attribute",          { fg = p.decorator })
  hl(0, "@field",              { fg = p.fg })
  hl(0, "@property",           { fg = p.fg })
  hl(0, "@parameter",          { fg = p.blue, italic = true })
  hl(0, "@parameter.reference",{ fg = p.blue })
  hl(0, "@namespace",          { fg = p.namespace })
  hl(0, "@symbol",             { fg = p.amber })
  hl(0, "@text",               { fg = p.fg })
  hl(0, "@text.title",         { fg = p.purple, bold = true })
  hl(0, "@text.literal",       { fg = p.green })
  hl(0, "@text.uri",           { fg = p.blue, underline = true })
  hl(0, "@text.math",          { fg = p.amber })
  hl(0, "@text.note",          { fg = p.info })
  hl(0, "@text.warning",       { fg = p.warning })
  hl(0, "@text.danger",        { fg = p.error })
  hl(0, "@text.strong",        { bold = true })
  hl(0, "@text.emphasis",      { italic = true })
  hl(0, "@text.strike",        { strikethrough = true })
  hl(0, "@text.underline",     { underline = true })
  hl(0, "@comment",            { fg = p.comment, italic = true })
  hl(0, "@comment.documentation",{ fg = p.comment, italic = true })
  hl(0, "@punctuation",        { fg = p.punctuation })
  hl(0, "@punctuation.bracket",{ fg = p.punctuation })
  hl(0, "@punctuation.delimiter",{ fg = p.punctuation })
  hl(0, "@punctuation.special",{ fg = p.amber })
  hl(0, "@tag",                { fg = p.tag })
  hl(0, "@tag.attribute",      { fg = p.attribute })
  hl(0, "@tag.delimiter",      { fg = p.punctuation })
  hl(0, "@markup",             { fg = p.fg })
  hl(0, "@markup.heading",     { fg = p.purple, bold = true })
  hl(0, "@markup.list",        { fg = p.amber })
  hl(0, "@markup.link",        { fg = p.blue })
  hl(0, "@markup.link.label",  { fg = p.blue })
  hl(0, "@markup.link.url",    { fg = p.blue, underline = true })
  hl(0, "@markup.raw",         { fg = p.green })
  hl(0, "@markup.strong",      { bold = true })
  hl(0, "@markup.italic",      { italic = true })
  hl(0, "@markup.strikethrough",{ strikethrough = true })
  hl(0, "@markup.underline",   { underline = true })
  hl(0, "@markup.quote",       { fg = p.comment, italic = true })
  hl(0, "@diff.plus",          { fg = p.added })
  hl(0, "@diff.minus",         { fg = p.deleted })
  hl(0, "@diff.delta",         { fg = p.modified })

  -- LSP semantic tokens (Neovim 0.9+)
  hl(0, "@lsp.type.class",         { fg = p.type, italic = true })
  hl(0, "@lsp.type.enum",          { fg = p.type, italic = true })
  hl(0, "@lsp.type.enumMember",    { fg = p.amber })
  hl(0, "@lsp.type.function",      { fg = p.func })
  hl(0, "@lsp.type.interface",     { fg = p.type, italic = true })
  hl(0, "@lsp.type.macro",         { fg = p.keyword })
  hl(0, "@lsp.type.method",        { fg = p.func })
  hl(0, "@lsp.type.namespace",     { fg = p.namespace })
  hl(0, "@lsp.type.parameter",     { fg = p.blue, italic = true })
  hl(0, "@lsp.type.property",      { fg = p.fg })
  hl(0, "@lsp.type.struct",        { fg = p.type, italic = true })
  hl(0, "@lsp.type.type",          { fg = p.type, italic = true })
  hl(0, "@lsp.type.typeParameter", { fg = p.purple, italic = true })
  hl(0, "@lsp.type.variable",      { fg = p.variable })
  hl(0, "@lsp.type.decorator",     { fg = p.decorator })
  hl(0, "@lsp.type.event",         { fg = p.amber })
  hl(0, "@lsp.mod.declaration",    { bold = true })
  hl(0, "@lsp.mod.deprecated",     { strikethrough = true })
  hl(0, "@lsp.mod.readonly",       { fg = p.constant })
  hl(0, "@lsp.mod.static",         { fg = p.fg })
  hl(0, "@lsp.mod.abstract",       { italic = true })
  hl(0, "@lsp.mod.async",          { fg = p.teal })
  hl(0, "@lsp.mod.documentation",  { fg = p.comment })

  -- Plugins
  hl(0, "NvimTreeNormal",       { fg = p.fg, bg = p.bg_light })
  hl(0, "NvimTreeRootFolder",   { fg = p.purple })
  hl(0, "NvimTreeFolderIcon",   { fg = p.blue })
  hl(0, "NvimTreeOpenedFolderName",{ fg = p.teal })
  hl(0, "NeoTreeNormal",        { fg = p.fg, bg = p.bg_light })
  hl(0, "TelescopeNormal",      { fg = p.fg, bg = p.bg })
  hl(0, "TelescopeBorder",      { fg = p.accent })
  hl(0, "TelescopePromptPrefix",{ fg = p.purple })
  hl(0, "TelescopeMatching",    { fg = p.purple, bold = true })
  hl(0, "WhichKey",             { fg = p.purple })
  hl(0, "WhichKeyGroup",        { fg = p.teal })
  hl(0, "WhichKeyDesc",         { fg = p.fg })
  hl(0, "IndentBlanklineChar",  { fg = p.whitespace })
  hl(0, "IndentBlanklineContextChar",{ fg = p.indent_guide })

  -- Terminal colors
  vim.g.terminal_color_0  = p.bg
  vim.g.terminal_color_1  = p.red
  vim.g.terminal_color_2  = p.green
  vim.g.terminal_color_3  = p.amber
  vim.g.terminal_color_4  = p.blue
  vim.g.terminal_color_5  = p.purple
  vim.g.terminal_color_6  = p.teal
  vim.g.terminal_color_7  = p.fg
  vim.g.terminal_color_8  = p.muted
  vim.g.terminal_color_9  = p.red
  vim.g.terminal_color_10 = p.green
  vim.g.terminal_color_11 = p.amber
  vim.g.terminal_color_12 = p.blue
  vim.g.terminal_color_13 = p.purple
  vim.g.terminal_color_14 = p.teal
  vim.g.terminal_color_15 = p.fg
end

M.setup()

return M
`;
}

// --- Helix Generator ---

function generateHelix(theme, p) {
  const isLight = theme.type === 'light';
  const name = helixName(theme);

  return `# ${theme.name} for Helix
# Generated from VS Code theme. Do not edit manually.
# Install: copy to ~/.config/helix/themes/${name}.toml

[palette]
bg = "${p.bg}"
fg = "${p.fg}"
bg_dark = "${p.bgDark}"
bg_light = "${p.bgLight}"
bg_highlight = "${p.bgHighlight}"
selection = "${p.selection}"
cursor_line = "${p.bgHighlight}"
line_number = "${p.lineNumber}"
line_number_active = "${p.lineNumberActive}"
accent = "${p.accent}"
comment = "${p.comment}"
keyword = "${p.keyword}"
string = "${p.string}"
number = "${p.number}"
constant = "${p.constant}"
variable = "${p.variable}"
func = "${p.func}"
type = "${p.type}"
class = "${p.class}"
namespace = "${p.namespace}"
operator = "${p.operator}"
punctuation = "${p.punctuation}"
regexp = "${p.regexp}"
tag = "${p.tag}"
attribute = "${p.attribute}"
decorator = "${p.decorator}"
purple = "${p.purple}"
teal = "${p.teal}"
green = "${p.green}"
amber = "${p.amber}"
red = "${p.red}"
blue = "${p.blue}"
muted = "${p.muted}"
error = "${p.error}"
warning = "${p.warning}"
info = "${p.info}"

[ui]
background = "bg"
foreground = "fg"
cursorline = "cursor_line"
color-columns = "bg_light"

[ui.cursor]
foreground = "bg"
background = "fg"

[ui.cursor.primary]
foreground = "bg"
background = "cursor"

[ui.cursor.match]
foreground = "purple"

[ui.linenr]
foreground = "line_number"

[ui.linenr.selected]
foreground = "line_number_active"

[ui.statusline]
foreground = "fg"
background = "bg_dark"

[ui.statusline.inactive]
foreground = "muted"
background = "bg_darker"

[ui.statusline.normal]
foreground = "bg"
background = "purple"

[ui.statusline.insert]
foreground = "bg"
background = "teal"

[ui.statusline.select]
foreground = "bg"
background = "amber"

[ui.popup]
foreground = "fg"
background = "bg_light"

[ui.window]
foreground = "accent"

[ui.help]
foreground = "fg"
background = "bg_light"

[ui.text]
foreground = "fg"

[ui.text.focus]
foreground = "purple"

[ui.text.inactive]
foreground = "muted"

[ui.text.info]
foreground = "teal"

[ui.virtual]
foreground = "muted"

[ui.virtual.ruler]
foreground = "bg_highlight"

[ui.virtual.whitespace]
foreground = "muted"

[ui.virtual.indent-guide]
foreground = "muted"

[ui.virtual.inlay-hint]
foreground = "muted"
italic = true

[ui.selection]
background = "selection"

[ui.cursorline.primary]
background = "cursor_line"

[ui.bufferline]
foreground = "muted"
background = "bg_dark"

[ui.bufferline.active]
foreground = "fg"
background = "bg"

[syntax]
"type" = "type"
"type.builtin" = "amber"
"type.enum" = "type"
"type.enum.variant" = "amber"
"constructor" = "amber"
"constant" = "constant"
"constant.builtin" = "amber"
"constant.builtin.boolean" = "constant"
"constant.character" = "string"
"constant.character.escape" = "amber"
"constant.numeric" = "number"
"constant.numeric.integer" = "number"
"constant.numeric.float" = "number"
"string" = "string"
"string.regexp" = "regexp"
"string.special" = "amber"
"string.special.path" = "blue"
"string.special.url" = "blue"
"string.special.symbol" = "amber"
"comment" = "comment"
"comment.line" = "comment"
"comment.block" = "comment"
"comment.block.documentation" = "comment"
"variable" = "variable"
"variable.builtin" = "constant"
"variable.parameter" = "blue"
"variable.other" = "fg"
"variable.other.member" = "fg"
"label" = "blue"
"punctuation" = "punctuation"
"punctuation.delimiter" = "punctuation"
"punctuation.bracket" = "punctuation"
"punctuation.special" = "amber"
"keyword" = "keyword"
"keyword.control" = "keyword"
"keyword.control.conditional" = "keyword"
"keyword.control.repeat" = "keyword"
"keyword.control.import" = "keyword"
"keyword.control.return" = "keyword"
"keyword.control.exception" = "keyword"
"keyword.operator" = "operator"
"keyword.directive" = "keyword"
"keyword.storage" = "keyword"
"keyword.storage.type" = "keyword"
"keyword.storage.modifier" = "keyword"
"operator" = "operator"
"function" = "func"
"function.builtin" = "teal"
"function.method" = "func"
"function.macro" = "keyword"
"function.special" = "amber"
"tag" = "tag"
"tag.attribute" = "attribute"
"tag.delimiter" = "punctuation"
"namespace" = "namespace"
"module" = "namespace"
"special" = "amber"
"attribute" = "decorator"

[marker]
error = "error"
warning = "warning"
info = "info"
hint = "teal"

[diagnostic]
error = { fg = "error", underline-style = "curl" }
warning = { fg = "warning", underline-style = "curl" }
info = { fg = "info", underline-style = "curl" }
hint = { fg = "teal", underline-style = "curl" }
`;
}

// --- Main ---

const files = fs.readdirSync(themesDir).filter(f => f.endsWith('-theme.json'));
let neovimCount = 0;
let helixCount = 0;

for (const file of files) {
  const theme = JSON.parse(fs.readFileSync(path.join(themesDir, file), 'utf8'));
  const p = extractPalette(theme);
  const nvName = neovimName(theme);
  const hxName = helixName(theme);

  // Neovim
  const nvLua = generateNeovim(theme, p);
  fs.writeFileSync(path.join(neovimDir, `${nvName}.lua`), nvLua);
  neovimCount++;

  // Helix
  const hxToml = generateHelix(theme, p);
  fs.writeFileSync(path.join(helixDir, `${hxName}.toml`), hxToml);
  helixCount++;
}

console.log(`Generated ${neovimCount} Neovim colorschemes -> editors/neovim/colors/`);
console.log(`Generated ${helixCount} Helix themes -> editors/helix/`);
