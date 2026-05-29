-- Shroom Space Light for Neovim
-- Generated from VS Code theme. Do not edit manually.
-- Install: copy to ~/.config/nvim/colors/shroom-space-light.lua or use as plugin

local M = {}

M.palette = {
  bg         = "#F5F2E8",
  fg         = "#4A4555",
  bg_dark    = "#E1DECC",
  bg_darker  = "#E1DECC",
  bg_light   = "#EBE8DD",
  bg_highlight = "#EBE8DD",
  selection  = "#D9D4C3",
  cursor     = "#353140",
  line_number = "#4A455550",
  line_number_active = "#4A4555",
  whitespace = "#948E9E50",
  indent_guide = "#8B5F9E",
  error      = "#b05151",
  warning    = "#886a32",
  info       = "#007A7A",
  added      = "#5A785A",
  deleted    = "#B45353",
  modified   = "#8C6D34",
  find_match = "#8B5F9E30",
  accent     = "#948E9E",
  comment    = "#948E9E",
  keyword    = "#8B5F9E",
  string     = "#5A785A",
  number     = "#8C6D34",
  constant   = "#8C6D34",
  variable   = "#585FB5",
  func       = "#007A7A",
  type       = "#8C6D34",
  class      = "#8C6D34",
  namespace  = "#8C6D34",
  operator   = "#8B5F9E",
  punctuation = "#8A859A",
  regexp     = "#8C6D34",
  tag        = "#8B5F9E",
  attribute  = "#8C6D34",
  decorator  = "#8C6D34",
  purple     = "#BE9AF7",
  teal       = "#74D7C8",
  green      = "#A6C18B",
  amber      = "#E8C990",
  red        = "#E68484",
  blue       = "#82AAFF",
  muted      = "#726D89",
}

function M.setup()
  vim.cmd("highlight clear")
  if vim.fn.exists("syntax_on") then
    vim.cmd("syntax reset")
  end
  vim.o.background = "light"
  vim.o.termguicolors = true
  vim.g.colors_name = "shroom-space-light"

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
