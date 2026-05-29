-- Shroom Space Theme loader
-- Usage:
--   lazy.nvim: { "wyattau/shroom-theme", name = "shroom-theme", config = function() vim.cmd.colorscheme("shroom-space") end }
--   manual:   copy editors/neovim/colors/*.lua to ~/.config/nvim/colors/
--             then :colorscheme shroom-space

local M = {}

M.variants = {
  "shroom-space",
  "shroom-space-light",
  "shroom-space-deuteranopia",
  "shroom-space-protanopia",
  "shroom-space-tritanopia",
  "shroom-space-monochrome",
  "shroom-space-high-contrast",
}

function M.setup(opts)
  opts = opts or {}
  local variant = opts.variant or "shroom-space"
  vim.cmd.colorscheme(variant)
end

return M
