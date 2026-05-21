/**
 * Generates static HTML pages styled with theme colors for visual regression testing.
 * Each theme gets an HTML page that renders code samples with the theme's color tokens.
 */
const fs = require('fs');
const path = require('path');

const themesDir = path.resolve(__dirname, '..', 'themes');
const outputDir = path.resolve(__dirname, '..', 'tests', 'visual', 'pages');

const JS_SAMPLE = fs.readFileSync(path.resolve(__dirname, '..', 'showcase', 'test-samples.js'), 'utf8');
const PY_SAMPLE = fs.readFileSync(path.resolve(__dirname, '..', 'showcase', 'test-samples.py'), 'utf8');
const HTML_SAMPLE = fs.readFileSync(path.resolve(__dirname, '..', 'showcase', 'test-samples.html'), 'utf8');
const CSS_SAMPLE = fs.readFileSync(path.resolve(__dirname, '..', 'showcase', 'test-samples.css'), 'utf8');
const MD_SAMPLE = fs.readFileSync(path.resolve(__dirname, '..', 'showcase', 'test-samples.md'), 'utf8');

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function generateThemePage(theme) {
  const c = theme.colors;
  const name = theme.name;

  // Escape values for CSS
  const bg = c['editor.background'] || '#1e1e1e';
  const fg = c['editor.foreground'] || '#d4d4d4';
  const lineNum = c['editorLineNumber.foreground'] || '#858585';
  const lineNumActive = c['editorLineNumber.activeForeground'] || '#c6c6c6';
  const selectionBg = c['editor.selectionBackground'] || '#264f78';
  const cursorColor = c['editorCursor.foreground'] || '#aeafad';
  const findMatchBg = c['editor.findMatchBackground'] || '#515c6a';
  const gutterBg = c['editorGutter.background'] || bg;
  const sideBg = c['sideBar.background'] || '#252526';
  const sideFg = c['sideBar.foreground'] || '#cccccc';
  const activityBg = c['activityBar.background'] || '#333333';
  const activityFg = c['activityBar.foreground'] || '#ffffff';
  const statusBg = c['statusBar.background'] || '#007acc';
  const statusFg = c['statusBar.foreground'] || '#ffffff';
  const tabActiveBg = c['tab.activeBackground'] || '#1e1e1e';
  const tabActiveFg = c['tab.activeForeground'] || '#ffffff';
  const tabInactiveBg = c['tab.inactiveBackground'] || '#2d2d2d';
  const tabInactiveFg = c['tab.inactiveForeground'] || '#ffffff66';
  const tabBorder = c['tab.border'] || '#252526';
  const titleBg = c['titleBar.activeBackground'] || '#323233';
  const titleFg = c['titleBar.activeForeground'] || '#cccccc';
  const badgeBg = c['activityBarBadge.background'] || '#007acc';
  const badgeFg = c['activityBarBadge.foreground'] || '#ffffff';
  const errorFg = c['editorError.foreground'] || '#f14c4c';
  const warningFg = c['editorWarning.foreground'] || '#cca700';
  const scrollbarThumb = c['scrollbarSlider.background'] || '#79797966';
  const hoverBg = c['editor.hoverHighlightBackground'] || '#264f7840';
  const currentLine = c['editor.lineHighlightBackground'] || '#ffffff0a';
  const addedBg = c['editorGutter.addedBackground'] || '#587c0c';
  const modifiedBg = c['editorGutter.modifiedBackground'] || '#0c7d9d';
  const deletedBg = c['editorGutter.deletedBackground'] || '#94151b';
  const inputBg = c['input.background'] || '#3c3c3c';
  const inputFg = c['input.foreground'] || '#cccccc';
  const inputBorder = c['input.border'] || '#3c3c3c';
  const panelBg = c['panel.background'] || '#1e1e1e';
  const panelFg = c['panel.foreground'] || '#cccccc';
  const listHoverBg = c['list.hoverBackground'] || '#2a2d2e';
  const menuBg = c['menu.background'] || '#252526';
  const menuFg = c['menu.foreground'] || '#cccccc';
  const purple = c['terminal.ansiMagenta'] || '#be9af7';
  const green = c['terminal.ansiGreen'] || '#a6c18b';
  const yellow = c['terminal.ansiYellow'] || '#ffcb6b';
  const red = c['terminal.ansiRed'] || '#e68484';
  const blue = c['terminal.ansiBlue'] || '#74d7c8';
  const amber = c['terminal.ansiYellow'] || '#ffcb6b';
  const muted = c['disabledForeground'] || '#726d89';

  // Token colors for syntax highlighting
  const tc = {};
  for (const entry of theme.tokenColors) {
    const scopes = Array.isArray(entry.scope) ? entry.scope : [entry.scope];
    for (const scope of scopes) {
      tc[scope] = entry.settings;
    }
  }

  function colorForScope(scope) {
    const settings = tc[scope];
    if (settings && settings.foreground) return settings.foreground;
    return fg;
  }

  // Simple syntax highlighting for JS
  function highlightJS(code) {
    let html = escapeHtml(code);
    // Order matters: comments first, then strings, then keywords, etc.
    // Comments
    html = html.replace(/(\/\/.*$)/gm, `<span style="color:${colorForScope('comment')}">$1</span>`);
    // Strings (template literals, double-quoted, single-quoted)
    html = html.replace(/(&quot;[^&]*&quot;|`[^`]*`|'[^']*')/g, `<span style="color:${colorForScope('string')}">$1</span>`);
    // Keywords
    html = html.replace(/\b(function|const|let|var|class|return|new|this|if|else|for|while|import|export|from|default|async|await|try|catch|throw|typeof|instanceof)\b/g, `<span style="color:${colorForScope('keyword')}">$1</span>`);
    // Numbers
    html = html.replace(/\b(\d+)\b/g, `<span style="color:${colorForScope('constant.numeric')}">$1</span>`);
    // Function calls
    html = html.replace(/\b([a-zA-Z_]\w*)\s*\(/g, `<span style="color:${colorForScope('entity.name.function')}">$1</span>(`);
    return html;
  }

  function highlightPython(code) {
    let html = escapeHtml(code);
    html = html.replace(/(#.*$)/gm, `<span style="color:${colorForScope('comment')}">$1</span>`);
    html = html.replace(/(&quot;[^&]*&quot;|'[^']*'|"""[^"']*""")/g, `<span style="color:${colorForScope('string')}">$1</span>`);
    html = html.replace(/\b(def|class|return|import|from|as|if|else|elif|for|while|try|except|finally|with|lambda|yield|pass|break|continue|raise|and|or|not|in|is|None|True|False)\b/g, `<span style="color:${colorForScope('keyword')}">$1</span>`);
    html = html.replace(/\b(\d+)\b/g, `<span style="color:${colorForScope('constant.numeric')}">$1</span>`);
    html = html.replace(/\b([a-zA-Z_]\w*)\s*\(/g, `<span style="color:${colorForScope('entity.name.function')}">$1</span>(`);
    return html;
  }

  function lineNumbers(code) {
    const lines = code.split('\n');
    return lines.map((_, i) =>
      `<div class="line-num" style="color:${i === 4 ? lineNumActive : lineNum}">${i + 1}</div>`
    ).join('');
  }

  function codeLines(highlightedCode) {
    const lines = highlightedCode.split('\n');
    return lines.map((line, i) =>
      `<div class="code-line${i === 4 ? ' active-line' : ''}">${line || ' '}</div>`
    ).join('');
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 13px;
    background: ${titleBg};
    color: ${titleFg};
    width: 1280px;
    height: 720px;
    overflow: hidden;
  }

  /* Title Bar */
  .titlebar {
    height: 30px;
    background: ${titleBg};
    display: flex;
    align-items: center;
    padding: 0 12px;
    font-size: 12px;
    border-bottom: 1px solid ${tabBorder};
  }
  .titlebar-dots { display: flex; gap: 6px; margin-right: 12px; }
  .titlebar-dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot-red { background: #ff5f57; }
  .dot-yellow { background: #febc2e; }
  .dot-green { background: #28c840; }

  /* Activity Bar */
  .main { display: flex; height: calc(100% - 30px - 22px); }
  .activity-bar {
    width: 48px;
    background: ${activityBg};
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 8px;
    gap: 8px;
  }
  .activity-icon {
    width: 24px; height: 24px;
    border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    color: ${activityFg};
    opacity: 0.6;
    font-size: 14px;
  }
  .activity-icon.active { opacity: 1; border-left: 2px solid ${purple}; }
  .badge {
    position: relative;
    top: -8px; left: 8px;
    background: ${badgeBg};
    color: ${badgeFg};
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 8px;
  }

  /* Sidebar */
  .sidebar {
    width: 220px;
    background: ${sideBg};
    color: ${sideFg};
    padding: 8px 0;
    font-size: 12px;
    border-right: 1px solid ${tabBorder};
  }
  .sidebar-title {
    padding: 4px 16px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${muted};
    margin-bottom: 4px;
  }
  .sidebar-item {
    padding: 3px 16px 3px 24px;
    cursor: pointer;
  }
  .sidebar-item:hover { background: ${listHoverBg}; }
  .sidebar-item.active { background: ${selectionBg}; }
  .sidebar-item.folder { padding-left: 16px; font-weight: 500; }
  .sidebar-item.file { padding-left: 32px; color: ${fg}; }

  /* Editor Area */
  .editor-area { flex: 1; display: flex; flex-direction: column; }

  /* Tabs */
  .tabs {
    display: flex;
    background: ${tabInactiveBg};
    height: 35px;
    border-bottom: 1px solid ${tabBorder};
  }
  .tab {
    padding: 6px 16px;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    border-right: 1px solid ${tabBorder};
    color: ${tabInactiveFg};
    cursor: pointer;
  }
  .tab.active {
    background: ${tabActiveBg};
    color: ${tabActiveFg};
    border-top: 1px solid ${purple};
  }
  .tab .close-btn { opacity: 0; font-size: 14px; }
  .tab:hover .close-btn { opacity: 0.5; }

  /* Editor Content */
  .editor-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  .gutter {
    width: 60px;
    background: ${gutterBg};
    padding: 4px 8px 4px 0;
    text-align: right;
    font-size: 12px;
    line-height: 20px;
    user-select: none;
  }
  .gutter .git-gutter {
    display: inline-block;
    width: 4px;
    height: 12px;
    border-radius: 1px;
    vertical-align: middle;
    margin-right: 4px;
  }
  .gutter .added { background: ${addedBg}; }
  .gutter .modified { background: ${modifiedBg}; }
  .gutter .deleted { background: ${deletedBg}; }

  .code-area {
    flex: 1;
    padding: 4px 16px;
    line-height: 20px;
    overflow-x: auto;
    white-space: pre;
  }

  .line-num {
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 8px;
  }
  .code-line {
    height: 20px;
    position: relative;
  }
  .code-line.active-line {
    background: ${currentLine};
  }
  .code-line.active-line::before {
    content: '';
    position: absolute;
    left: -16px;
    top: 0;
    width: 2px;
    height: 100%;
    background: ${cursorColor};
  }

  /* Minimap */
  .minimap {
    width: 60px;
    background: ${bg};
    opacity: 0.6;
    padding: 4px;
  }
  .minimap-line {
    height: 3px;
    margin-bottom: 1px;
    border-radius: 1px;
    background: ${fg}33;
  }
  .minimap-line.highlight { background: ${purple}66; }

  /* Panel / Terminal */
  .panel {
    height: 120px;
    background: ${panelBg};
    color: ${panelFg};
    border-top: 1px solid ${tabBorder};
    display: flex;
    flex-direction: column;
  }
  .panel-tabs {
    display: flex;
    height: 30px;
    align-items: center;
    padding-left: 8px;
    gap: 4px;
    font-size: 11px;
    text-transform: uppercase;
  }
  .panel-tab {
    padding: 4px 12px;
    border-bottom: 1px solid transparent;
  }
  .panel-tab.active {
    color: ${fg};
    border-bottom-color: ${purple};
  }
  .terminal-content {
    flex: 1;
    padding: 4px 16px;
    font-size: 12px;
    line-height: 18px;
    overflow: hidden;
  }
  .term-prompt { color: ${green}; }
  .term-cmd { color: ${fg}; }
  .term-output { color: ${muted}; }
  .term-path { color: ${blue}; }
  .term-error { color: ${red}; }

  /* Status Bar */
  .statusbar {
    height: 22px;
    background: ${statusBg};
    color: ${statusFg};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    font-size: 11px;
  }
  .statusbar-left, .statusbar-right { display: flex; align-items: center; gap: 12px; }
  .statusbar-item { display: flex; align-items: center; gap: 4px; }

  /* Breadcrumbs */
  .breadcrumbs {
    height: 22px;
    background: ${bg};
    padding: 0 16px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: ${muted};
  }
  .breadcrumb-sep { opacity: 0.5; }
  .breadcrumb-active { color: ${fg}; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 10px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${scrollbarThumb}; border-radius: 5px; }

  /* Palette Swatch */
  .palette {
    display: flex;
    gap: 2px;
    padding: 8px 16px;
    background: ${bg};
    border-top: 1px solid ${tabBorder};
  }
  .swatch {
    flex: 1;
    height: 8px;
    border-radius: 2px;
  }
</style>
</head>
<body>
  <!-- Title Bar -->
  <div class="titlebar">
    <div class="titlebar-dots">
      <div class="titlebar-dot dot-red"></div>
      <div class="titlebar-dot dot-yellow"></div>
      <div class="titlebar-dot dot-green"></div>
    </div>
    <span>${name} - Visual Studio Code</span>
  </div>

  <div class="main">
    <!-- Activity Bar -->
    <div class="activity-bar">
      <div class="activity-icon active">&#9776;</div>
      <div class="activity-icon">&#128269;</div>
      <div class="activity-icon">&#128196;<span class="badge">3</span></div>
      <div class="activity-icon">&#9881;</div>
    </div>

    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-title">Explorer</div>
      <div class="sidebar-item folder">src</div>
      <div class="sidebar-item file active" style="color:${fg}; background:${selectionBg};">test-samples.js</div>
      <div class="sidebar-item file">test-samples.py</div>
      <div class="sidebar-item file">test-samples.html</div>
      <div class="sidebar-item folder">showcase</div>
      <div class="sidebar-item file">test-samples.css</div>
      <div class="sidebar-item file">test-samples.md</div>
      <div class="sidebar-title" style="margin-top:12px;">Search</div>
      <div class="sidebar-title" style="margin-top:8px;">Source Control</div>
      <div class="sidebar-item" style="color:${blue};">3 changes</div>
    </div>

    <!-- Editor Area -->
    <div class="editor-area">
      <!-- Tabs -->
      <div class="tabs">
        <div class="tab active">
          <span style="color:${yellow};">&#9679;</span> test-samples.js
          <span class="close-btn">&times;</span>
        </div>
        <div class="tab">
          <span style="color:${green};">&#9679;</span> test-samples.py
          <span class="close-btn">&times;</span>
        </div>
      </div>

      <!-- Breadcrumbs -->
      <div class="breadcrumbs">
        <span>src</span>
        <span class="breadcrumb-sep">&gt;</span>
        <span class="breadcrumb-active">test-samples.js</span>
      </div>

      <!-- Editor -->
      <div class="editor-content">
        <div class="gutter">
          <div class="line-num"><span class="git-gutter modified"></span>1</div>
          <div class="line-num">2</div>
          <div class="line-num">3</div>
          <div class="line-num">4</div>
          <div class="line-num" style="color:${lineNumActive}">5</div>
          <div class="line-num"><span class="git-gutter added"></span>6</div>
          <div class="line-num">7</div>
          <div class="line-num">8</div>
          <div class="line-num">9</div>
          <div class="line-num">10</div>
          <div class="line-num">11</div>
          <div class="line-num">12</div>
          <div class="line-num">13</div>
          <div class="line-num">14</div>
          <div class="line-num">15</div>
          <div class="line-num">16</div>
          <div class="line-num"><span class="git-gutter deleted"></span>17</div>
          <div class="line-num">18</div>
          <div class="line-num">19</div>
          <div class="line-num">20</div>
          <div class="line-num">21</div>
          <div class="line-num">22</div>
          <div class="line-num">23</div>
          <div class="line-num">24</div>
          <div class="line-num">25</div>
          <div class="line-num">26</div>
          <div class="line-num">27</div>
          <div class="line-num">28</div>
          <div class="line-num">29</div>
          <div class="line-num">30</div>
        </div>
        <div class="code-area">${codeLines(highlightJS(JS_SAMPLE))}</div>
        <div class="minimap">
          ${Array.from({length: 30}, (_, i) =>
            `<div class="minimap-line${i === 4 ? ' highlight' : ''}"></div>`
          ).join('')}
        </div>
      </div>

      <!-- Panel / Terminal -->
      <div class="panel">
        <div class="panel-tabs">
          <div class="panel-tab active">Terminal</div>
          <div class="panel-tab">Output</div>
          <div class="panel-tab">Problems <span style="color:${errorFg}">1</span> <span style="color:${warningFg}">2</span></div>
          <div class="panel-tab">Debug Console</div>
        </div>
        <div class="terminal-content">
          <div><span class="term-prompt">~/project $</span> <span class="term-cmd">npm test</span></div>
          <div class="term-output">Running 90 tests...</div>
          <div><span style="color:${green};">90 passing</span> <span style="color:${muted};">(526ms)</span></div>
          <div></div>
          <div><span class="term-prompt">~/project $</span> <span class="term-cmd">npm run validate</span></div>
          <div><span style="color:${green};">[PASS]</span> <span class="term-path">shroom-space-theme.json</span></div>
          <div><span style="color:${green};">[PASS]</span> <span class="term-path">shroom-space-light-theme.json</span></div>
          <div>All 7 theme(s) valid. <span style="color:${green};">0 errors.</span></div>
        </div>
      </div>

      <!-- Color Palette -->
      <div class="palette">
        <div class="swatch" style="background:${purple}"></div>
        <div class="swatch" style="background:${blue}"></div>
        <div class="swatch" style="background:${green}"></div>
        <div class="swatch" style="background:${yellow}"></div>
        <div class="swatch" style="background:${amber}"></div>
        <div class="swatch" style="background:${red}"></div>
        <div class="swatch" style="background:${muted}"></div>
        <div class="swatch" style="background:${fg}"></div>
      </div>
    </div>
  </div>

  <!-- Status Bar -->
  <div class="statusbar">
    <div class="statusbar-left">
      <div class="statusbar-item">&#9776; main</div>
      <div class="statusbar-item" style="color:${errorFg}">&#10007; 1</div>
      <div class="statusbar-item" style="color:${warningFg}">&#9888; 2</div>
    </div>
    <div class="statusbar-right">
      <div class="statusbar-item">Ln 5, Col 1</div>
      <div class="statusbar-item">UTF-8</div>
      <div class="statusbar-item">JavaScript</div>
      <div class="statusbar-item">Prettier</div>
    </div>
  </div>
</body>
</html>`;

  return html;
}

// Generate pages for all themes
const themeFiles = fs.readdirSync(themesDir).filter(f => f.endsWith('.json'));

fs.mkdirSync(outputDir, { recursive: true });

for (const file of themeFiles) {
  const theme = JSON.parse(fs.readFileSync(path.join(themesDir, file), 'utf8'));
  const html = generateThemePage(theme);
  const slug = file.replace('.json', '');
  const outputPath = path.join(outputDir, `${slug}.html`);
  fs.writeFileSync(outputPath, html);
  console.log(`Generated: ${slug}.html`);
}

console.log(`\nGenerated ${themeFiles.length} visual test pages in ${outputDir}`);
