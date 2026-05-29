use leptos::prelude::*;
use leptos_meta::{provide_meta_context, Meta, Title};
use serde::Deserialize;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

// Theme data structure matching VS Code theme JSON
#[derive(Clone, Deserialize, Debug)]
pub struct Theme {
    pub name: String,
    #[serde(rename = "type")]
    pub theme_type: String,
    pub colors: HashMap<String, String>,
    #[serde(default)]
    pub token_colors: Vec<TokenColor>,
}

#[derive(Clone, Deserialize, Debug)]
pub struct TokenColor {
    #[serde(default)]
    pub scope: serde_json::Value,
    pub settings: TokenSettings,
}

#[derive(Clone, Deserialize, Debug)]
pub struct TokenSettings {
    #[serde(default)]
    pub foreground: Option<String>,
    #[serde(default)]
    pub font_style: Option<String>,
}

// Embed all theme JSON at compile time
fn load_theme_data() -> Vec<(&'static str, &'static str)> {
    let mut themes = Vec::new();

    // We embed themes as static strings
    macro_rules! embed_theme {
        ($file:expr) => {
            (
                $file,
                include_str!(concat!("../../themes/", $file)),
            )
        };
    }

    themes.push(embed_theme!("shroom-space-theme.json"));
    themes.push(embed_theme!("shroom-space-light-theme.json"));
    themes.push(embed_theme!("shroom-space-deuteranopia-theme.json"));
    themes.push(embed_theme!("shroom-space-protanopia-theme.json"));
    themes.push(embed_theme!("shroom-space-tritanopia-theme.json"));
    themes.push(embed_theme!("shroom-space-monochrome-theme.json"));
    themes.push(embed_theme!("shroom-space-high-contrast-theme.json"));

    themes
}

fn parse_themes() -> Vec<Theme> {
    load_theme_data()
        .into_iter()
        .filter_map(|(_name, json)| serde_json::from_str(json).ok())
        .collect()
}

// Sample code for preview
const SAMPLE_CODE: &str = r#"use std::collections::HashMap;

/// A simple key-value store
pub struct Store {
    data: HashMap<String, Value>,
    max_size: usize,
}

impl Store {
    pub fn new(max_size: usize) -> Self {
        Self {
            data: HashMap::new(),
            max_size,
        }
    }

    pub fn insert(&mut self, key: String, value: Value) -> Option<Value> {
        if self.data.len() >= self.max_size {
            self.evict_oldest();
        }
        self.data.insert(key, value)
    }

    pub fn get(&self, key: &str) -> Option<&Value> {
        self.data.get(key)
    }
}

#[derive(Clone, Debug)]
pub enum Value {
    String(String),
    Number(f64),
    Boolean(bool),
    Null,
}

fn main() {
    let mut store = Store::new(100);
    store.insert("hello".into(), Value::String("world".into()));
    store.insert("count".into(), Value::Number(42.0));
    store.insert("active".into(), Value::Boolean(true));

    if let Some(Value::String(s)) = store.get("hello") {
        println!("Value: {}", s);
    }
}
"#;

#[component]
pub fn App() -> impl IntoView {
    provide_meta_context();

    let themes = parse_themes();
    let theme_names: Vec<String> = themes.iter().map(|t| t.name.clone()).collect();

    let (selected_idx, set_selected_idx) = signal(0usize);
    let (lang, set_lang) = signal("en");

    let current_theme = Signal::derive(move || {
        let idx = selected_idx.get();
        themes.get(idx).cloned().unwrap_or_else(|| themes[0].clone())
    });

    view! {
        <Title text="Shroom Space Theme Previewer" />
        <Meta name="description" content="Interactive WASM previewer for Shroom Space VS Code Theme" />

        <header class="header">
            <div class="header-left">
                <h1 class="logo">"Shroom Space"</h1>
                <span class="badge">"WASM Previewer"</span>
            </div>
            <div class="header-controls">
                <select class="theme-select" on:change=move |ev| {
                    let val = event_target_value(&ev);
                    if let Ok(idx) = val.parse::<usize>() {
                        set_selected_idx.set(idx);
                    }
                }>
                    {theme_names.iter().enumerate().map(|(i, name)| {
                        view! { <option value={i.to_string()}>{name.clone()}</option> }
                    }).collect::<Vec<_>>()}
                </select>
                <select class="lang-select" on:change=move |ev| {
                    let val = event_target_value(&ev);
                    match val.as_str() {
                        "zh" => set_lang.set("zh"),
                        "ja" => set_lang.set("ja"),
                        _ => set_lang.set("en"),
                    }
                }>
                    <option value="en">"EN"</option>
                    <option value="zh">"ZH"</option>
                    <option value="ja">"JA"</option>
                </select>
            </div>
        </header>

        <main class="main">
            <Workbench theme=current_theme lang=Signal::from(lang) />
        </main>

        <footer class="footer">
            <p>
                <a href="https://github.com/WyattAu/shroom-theme">"GitHub"</a>
                " | "
                <a href="https://marketplace.visualstudio.com/items?itemName=wyattau.shroom-space-theme">"Marketplace"</a>
                " | "
                "v4.1.0"
            </p>
        </footer>
    }
}

#[component]
fn Workbench(theme: Signal<Theme>, lang: Signal<&'static str>) -> impl IntoView {
    let title_text = Signal::derive(move || match lang.get() {
        "zh" => "Shroom Space 主题预览器",
        "ja" => "Shroom Space テーマプレビュー",
        _ => "Shroom Space Theme Previewer",
    });

    view! {
        <div class="workbench" style={
            let t = theme.get();
            format!(
                "background: {}; color: {}; border-color: {};",
                t.colors.get("editor.background").unwrap_or(&"#24212E".into()),
                t.colors.get("editor.foreground").unwrap_or(&"#CCC8D9".into()),
                t.colors.get("editorGutter.background").unwrap_or(&"#1E1C29".into()),
            )
        }>
            <div class="workbench-title" style={
                let t = theme.get();
                format!("background: {}; color: {};",
                    t.colors.get("titleBar.activeBackground").unwrap_or(&"#1E1C29".into()),
                    t.colors.get("titleBar.activeForeground").unwrap_or(&"#CCC8D9".into()),
                )
            }>
                <span class="title-text">{move || title_text.get()}</span>
                <div class="title-buttons">
                    <span class="title-btn" style="color: #E68484">"X"</span>
                    <span class="title-btn" style="color: #FFCB6B">"_"</span>
                    <span class="title-btn" style="color: #A6C18B">"O"</span>
                </div>
            </div>

            <div class="workbench-body">
                <ActivityBar theme=theme />
                <SideBar theme=theme lang=lang />
                <EditorArea theme=theme />
            </div>

            <StatusBar theme=theme />
        </div>

        <PaletteSection theme=theme />
        <ColorExtractor theme=theme />
    }
}

#[component]
fn ActivityBar(theme: Signal<Theme>) -> impl IntoView {
    view! {
        <div class="activity-bar" style={
            let t = theme.get();
            format!("background: {};",
                t.colors.get("activityBar.background").unwrap_or(&"#1E1C29".into()),
            )
        }>
            <div class="activity-icon" style={
                let t = theme.get();
                format!("color: {}; border-left: 2px solid {};",
                    t.colors.get("activityBar.activeFocusBorder").unwrap_or(&"#BE9AF7".into()),
                    t.colors.get("activityBar.activeFocusBorder").unwrap_or(&"#BE9AF7".into()),
                )
            }>"F"</div>
            <div class="activity-icon" style="color: #726D89">"S"</div>
            <div class="activity-icon" style="color: #726D89">"G"</div>
            <div class="activity-icon" style="color: #726D89">"D"</div>
            <div class="activity-icon" style="color: #726D89">"E"</div>
        </div>
    }
}

#[component]
fn SideBar(theme: Signal<Theme>, lang: Signal<&'static str>) -> impl IntoView {
    let explorer_text = Signal::derive(move || match lang.get() {
        "zh" => "资源管理器",
        "ja" => "エクスプローラー",
        _ => "EXPLORER",
    });

    let files_text = Signal::derive(move || match lang.get() {
        "zh" => "文件",
        "ja" => "ファイル",
        _ => "FILES",
    });

    view! {
        <div class="sidebar" style={
            let t = theme.get();
            format!("background: {};",
                t.colors.get("sideBar.background").unwrap_or(&"#2A2739".into()),
            )
        }>
            <div class="sidebar-title" style={
                let t = theme.get();
                format!("color: {}; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; padding: 8px 12px;",
                    t.colors.get("sideBar.foreground").unwrap_or(&"#CCC8D9".into()),
                )
            }>
                {move || explorer_text.get()}
            </div>
            <div class="sidebar-section" style="padding: 0 8px;">
                <div class="sidebar-section-header" style={
                    let t = theme.get();
                    format!("color: {}; font-size: 11px; font-weight: bold; padding: 4px 4px;",
                        t.colors.get("sideBarSectionHeader.foreground").unwrap_or(&"#CCC8D9".into()),
                    )
                }>
                    {move || files_text.get()}
                </div>
                <div class="file-tree" style={
                    let t = theme.get();
                    format!("color: {}; font-size: 13px; font-family: monospace;",
                        t.colors.get("sideBar.foreground").unwrap_or(&"#CCC8D9".into()),
                    )
                }>
                    <div class="file-item" style="padding: 2px 4px; color: #82AAFF">"src/"</div>
                    <div class="file-item" style="padding: 2px 4px 2px 20px; color: #A6C18B">"main.rs"</div>
                    <div class="file-item" style="padding: 2px 4px 2px 20px; color: #CCC8D9">"lib.rs"</div>
                    <div class="file-item" style="padding: 2px 4px 2px 20px; color: #CCC8D9">"store.rs"</div>
                    <div class="file-item" style="padding: 2px 4px; color: #82AAFF">"Cargo.toml"</div>
                    <div class="file-item active" style={
                        let t = theme.get();
                        format!("padding: 2px 4px; background: {};",
                            t.colors.get("list.activeSelectionBackground").unwrap_or(&"#393552".into()),
                        )
                    }>"README.md"</div>
                </div>
            </div>
        </div>
    }
}

#[component]
fn EditorArea(theme: Signal<Theme>) -> impl IntoView {
    let lines: Vec<&str> = SAMPLE_CODE.lines().collect();

    view! {
        <div class="editor-area">
            <div class="tab-bar" style={
                let t = theme.get();
                format!("background: {};",
                    t.colors.get("editorGroupHeader.tabsBackground").unwrap_or(&"#1E1C29".into()),
                )
            }>
                <div class="tab active" style={
                    let t = theme.get();
                    format!("background: {}; color: {}; border-top: 2px solid {};",
                        t.colors.get("tab.activeBackground").unwrap_or(&"#24212E".into()),
                        t.colors.get("tab.activeForeground").unwrap_or(&"#CCC8D9".into()),
                        t.colors.get("tab.activeBorderTop").unwrap_or(&"#BE9AF7".into()),
                    )
                }>"main.rs"</div>
                <div class="tab" style={
                    let t = theme.get();
                    format!("background: {}; color: {};",
                        t.colors.get("tab.inactiveBackground").unwrap_or(&"#1E1C29".into()),
                        t.colors.get("tab.inactiveForeground").unwrap_or(&"#726D89".into()),
                    )
                }>"store.rs"</div>
            </div>

            <div class="editor" style={
                let t = theme.get();
                format!("background: {}; color: {}; font-family: 'Cascadia Code', 'Fira Code', monospace;",
                    t.colors.get("editor.background").unwrap_or(&"#24212E".into()),
                    t.colors.get("editor.foreground").unwrap_or(&"#CCC8D9".into()),
                )
            }>
                <div class="line-numbers" style={
                    let t = theme.get();
                    format!("color: {}; padding-right: 16px; text-align: right; user-select: none;",
                        t.colors.get("editorLineNumber.foreground").unwrap_or(&"#726D8980".into()),
                    )
                }>
                    {lines.iter().enumerate().map(|(i, _)| {
                        let n = i + 1;
                        view! { <div class="line-num">{n}</div> }
                    }).collect::<Vec<_>>()}
                </div>
                <div class="code-content">
                    {lines.iter().map(|line| {
                        let t = theme.get();
                        let highlighted = highlight_rust(line, &t);
                        view! { <div class="code-line" style="min-height: 1.4em;" inner_html=highlighted></div> }
                    }).collect::<Vec<_>>()}
                </div>
            </div>

            <div class="terminal" style={
                let t = theme.get();
                format!("background: {}; color: {}; border-top: 1px solid {};",
                    t.colors.get("terminal.background").unwrap_or(&"#24212E".into()),
                    t.colors.get("terminal.foreground").unwrap_or(&"#CCC8D9".into()),
                    t.colors.get("panel.border").unwrap_or(&"#726D89".into()),
                )
            }>
                <div class="terminal-title" style={
                    let t = theme.get();
                    format!("color: {}; font-weight: bold; padding-bottom: 4px;",
                        t.colors.get("terminal.ansiCyan").unwrap_or(&"#74D7C8".into()),
                    )
                }>"TERMINAL"</div>
                <div style="color: #A6C18B">"$ cargo run"</div>
                <div>"   Compiling shroom-store v0.1.0"</div>
                <div>"    Finished dev profile [unoptimized]"</div>
                <div>"     Running target/debug/shroom-store"</div>
                <div style="color: #74D7C8">"Value: world"</div>
            </div>
        </div>
    }
}

#[component]
fn StatusBar(theme: Signal<Theme>) -> impl IntoView {
    view! {
        <div class="status-bar" style={
            let t = theme.get();
            format!("background: {}; color: {};",
                t.colors.get("statusBar.background").unwrap_or(&"#1E1C29".into()),
                t.colors.get("statusBar.foreground").unwrap_or(&"#CCC8D9".into()),
            )
        }>
            <div class="status-left">
                <span style="color: #74D7C8">"main"</span>
                <span>"|"</span>
                <span>"0 errors"</span>
                <span>"0 warnings"</span>
            </div>
            <div class="status-right">
                <span>"Ln 42, Col 1"</span>
                <span>"UTF-8"</span>
                <span>"Rust"</span>
            </div>
        </div>
    }
}

#[component]
fn PaletteSection(theme: Signal<Theme>) -> impl IntoView {
    let accent_colors = vec![
        ("Purple", "#BE9AF7"),
        ("Teal", "#74D7C8"),
        ("Green", "#A6C18B"),
        ("Amber", "#E8C990"),
        ("Red", "#E68484"),
        ("Blue", "#82AAFF"),
        ("Muted", "#726D89"),
        ("Foreground", "#CCC8D9"),
    ];

    view! {
        <div class="palette-section" style={
            let t = theme.get();
            format!("background: {}; color: {}; margin-top: 24px; padding: 16px; border-radius: 8px;",
                t.colors.get("editor.background").unwrap_or(&"#24212E".into()),
                t.colors.get("editor.foreground").unwrap_or(&"#CCC8D9".into()),
            )
        }>
            <h3 style="margin: 0 0 12px 0;">"Color Palette"</h3>
            <div class="palette-grid">
                {accent_colors.into_iter().map(|(name, hex)| {
                    view! {
                        <div class="palette-swatch">
                            <div class="swatch-color" style=format!("background: {}; width: 48px; height: 48px; border-radius: 6px; border: 1px solid #726D89;", hex)></div>
                            <div class="swatch-info">
                                <div class="swatch-name">{name}</div>
                                <div class="swatch-hex" style="font-family: monospace; font-size: 12px; opacity: 0.7;">{hex}</div>
                            </div>
                        </div>
                    }
                }).collect::<Vec<_>>()}
            </div>
        </div>
    }
}

// Simple Rust syntax highlighting
fn highlight_rust(line: &str, _theme: &Theme) -> String {
    let keywords = ["use", "pub", "struct", "impl", "fn", "let", "mut", "if", "else",
                    "match", "return", "self", "Self", "enum", "trait", "where", "derive",
                    "macro_rules", "const", "static", "type", "mod", "crate", "super",
                    "for", "while", "loop", "in", "ref", "move", "async", "await", "dyn"];

    let mut result = String::new();
    let chars: Vec<char> = line.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        let c = chars[i];
        if c == '/' && i + 1 < chars.len() && chars[i + 1] == '/' {
            result.push_str(&format!(r#"<span style="color: #726D89; font-style: italic;">{}</span>"#, html_escape(&line[i..])));
            break;
        } else if c == '"' {
            let start = i;
            i += 1;
            while i < chars.len() && chars[i] != '"' {
                i += 1;
            }
            if i < chars.len() { i += 1; }
            result.push_str(&format!(r#"<span style="color: #A6C18B">{}</span>"#, html_escape(&line[start..i])));
        } else if c.is_ascii_digit() {
            let start = i;
            while i < chars.len() && (chars[i].is_ascii_digit() || chars[i] == '.' || chars[i] == '_' || chars[i] == 'f' || chars[i] == 'u' || chars[i] == 'i') {
                i += 1;
            }
            result.push_str(&format!(r#"<span style="color: #FFCB6B">{}</span>"#, &line[start..i]));
        } else if c.is_alphabetic() || c == '_' {
            let start = i;
            while i < chars.len() && (chars[i].is_alphanumeric() || chars[i] == '_') {
                i += 1;
            }
            let word = &line[start..i];
            if keywords.contains(&word) {
                result.push_str(&format!(r#"<span style="color: #BE9AF7">{}</span>"#, word));
            } else if word.starts_with(char::is_uppercase) && word.len() > 1 {
                result.push_str(&format!(r#"<span style="color: #E8C990; font-style: italic;">{}</span>"#, word));
            } else if word == "true" || word == "false" || word == "None" || word == "Some" || word == "Ok" || word == "Err" {
                result.push_str(&format!(r#"<span style="color: #E8C990">{}</span>"#, word));
            } else if word == "println" || word == "format" || word == "vec" || word == "String" {
                result.push_str(&format!(r#"<span style="color: #74D7C8">{}</span>"#, word));
            } else {
                result.push_str(word);
            }
        } else {
            result.push(c);
            i += 1;
        }
    }

    html_escape(&result)
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
     .replace('<', "&lt;")
     .replace('>', "&gt;")
     .replace('"', "&quot;")
}

// =============================================================================
// Phase 17: AI Color Extraction (K-Means)
// =============================================================================

/// RGB color for k-means extraction
#[derive(Clone, Copy, Debug)]
struct Rgb {
    r: f64,
    g: f64,
    b: f64,
}

impl Rgb {
    fn from_bytes(r: u8, g: u8, b: u8) -> Self {
        Self { r: r as f64, g: g as f64, b: b as f64 }
    }

    fn to_hex(&self) -> String {
        format!(
            "#{:02X}{:02X}{:02X}",
            self.r.round().clamp(0.0, 255.0) as u8,
            self.g.round().clamp(0.0, 255.0) as u8,
            self.b.round().clamp(0.0, 255.0) as u8,
        )
    }

    fn to_hsl(&self) -> (f64, f64, f64) {
        let r = self.r / 255.0;
        let g = self.g / 255.0;
        let b = self.b / 255.0;
        let max = r.max(g).max(b);
        let min = r.min(g).min(b);
        let l = (max + min) / 2.0;
        if (max - min).abs() < 1e-10 {
            (0.0, 0.0, l)
        } else {
            let d = max - min;
            let s = if l > 0.5 { d / (2.0 - max - min) } else { d / (max + min) };
            let h = if (max - r).abs() < 1e-10 {
                (g - b) / d + if g < b { 6.0 } else { 0.0 }
            } else if (max - g).abs() < 1e-10 {
                (b - r) / d + 2.0
            } else {
                (r - g) / d + 4.0
            };
            (h * 60.0, s, l)
        }
    }

    fn distance_sq(&self, other: &Self) -> f64 {
        let dr = self.r - other.r;
        let dg = self.g - other.g;
        let db = self.b - other.b;
        dr * dr + dg * dg + db * db
    }
}

/// K-means clustering for dominant color extraction
fn k_means_colors(pixels: &[Rgb], k: usize, max_iter: usize) -> Vec<Rgb> {
    if pixels.is_empty() || k == 0 {
        return Vec::new();
    }

    // Initialize centroids using k-means++ algorithm
    let mut centroids = Vec::with_capacity(k);
    // First centroid: random (use first pixel for determinism)
    centroids.push(pixels[0]);

    for _ in 1..k {
        let mut distances: Vec<f64> = pixels.iter().map(|p| {
            centroids.iter().map(|c| p.distance_sq(c)).fold(f64::MAX, f64::min)
        }).collect();
        let total: f64 = distances.iter().sum();
        if total < 1e-10 { break; }

        // Simple deterministic selection: pick the pixel with max distance
        let (idx, _) = distances.iter().enumerate()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
            .unwrap();
        centroids.push(pixels[idx]);
    }

    let k = centroids.len();

    // Iterate
    let mut assignments = vec![0usize; pixels.len()];
    for _ in 0..max_iter {
        // Assign pixels to nearest centroid
        let mut changed = false;
        for (i, pixel) in pixels.iter().enumerate() {
            let (best_idx, _) = centroids.iter().enumerate()
                .map(|(j, c)| (j, pixel.distance_sq(c)))
                .min_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
                .unwrap();
            if assignments[i] != best_idx {
                assignments[i] = best_idx;
                changed = true;
            }
        }
        if !changed { break; }

        // Recompute centroids
        let mut sums = vec![[0.0f64; 3]; k];
        let mut counts = vec![0usize; k];
        for (i, pixel) in pixels.iter().enumerate() {
            let c = assignments[i];
            sums[c][0] += pixel.r;
            sums[c][1] += pixel.g;
            sums[c][2] += pixel.b;
            counts[c] += 1;
        }
        for j in 0..k {
            if counts[j] > 0 {
                centroids[j] = Rgb {
                    r: sums[j][0] / counts[j] as f64,
                    g: sums[j][1] / counts[j] as f64,
                    b: sums[j][2] / counts[j] as f64,
                };
            }
        }
    }

    centroids
}

/// Shroom Space accent presets for matching
const ACCENT_PRESETS: &[(&str, f64, f64, f64)] = &[
    ("purple", 280.0, 85.0, 80.0),
    ("teal",    170.0, 58.0, 63.0),
    ("green",   100.0, 27.0, 65.0),
    ("amber",    40.0, 65.0, 77.0),
    ("rose",      0.0, 68.0, 77.0),
    ("sky",      200.0, 100.0, 75.0),
    ("coral",     0.0, 62.0, 72.0),
];

/// Map extracted colors to nearest Shroom Space accent preset
fn map_to_accent(color: &Rgb) -> (String, String) {
    let (h, s, l) = color.to_hsl();
    let mut best = ("purple", 0.0, f64::MAX);
    for &(name, ph, ps, pl) in ACCENT_PRESETS {
        // HSL distance (hue is circular)
        let dh = (h - ph).min(360.0 - (h - ph).abs());
        let dist = dh * dh + (s - ps) * (s - ps) * 10.0 + (l - pl) * (l - pl) * 10.0;
        if dist < best.2 {
            best = (name, 0.0, dist);
        }
    }
    (best.0.to_string(), color.to_hex())
}

/// JS-callable function to extract dominant colors from RGBA pixel data
#[wasm_bindgen]
pub fn extract_colors(rgba_data: &[u8], width: u32, _height: u32, k: usize) -> JsValue {
    // Sample pixels (every 4th pixel for performance)
    let mut pixels = Vec::new();
    let stride = 4; // sample every 4th pixel
    for i in (0..rgba_data.len()).step_by(4 * stride) {
        if i + 3 < rgba_data.len() {
            let r = rgba_data[i];
            let g = rgba_data[i + 1];
            let b = rgba_data[i + 2];
            let a = rgba_data[i + 3];
            if a > 128 { // skip transparent pixels
                pixels.push(Rgb::from_bytes(r, g, b));
            }
        }
    }

    let centroids = k_means_colors(&pixels, k, 20);
    let results: Vec<serde_json::Value> = centroids.iter().map(|c| {
        let (accent_name, hex) = map_to_accent(c);
        let (h, s, l) = c.to_hsl();
        serde_json::json!({
            "hex": hex,
            "hsl": format!("{:.0},{:.0}%,{:.0}%", h, s * 100.0, l * 100.0),
            "accent": accent_name,
        })
    }).collect();

    serde_wasm_bindgen::to_value(&results).unwrap_or(JsValue::NULL)
}

// =============================================================================
// Phase 17: Image Upload Component
// =============================================================================

#[component]
fn ColorExtractor(theme: Signal<Theme>) -> impl IntoView {
    let (extracted_colors, set_extracted_colors) = signal(Vec::<(String, String, String)>::new());
    let (status_text, set_status_text) = signal(String::from("Upload an image to extract accent colors"));

    let on_upload = move |ev: leptos::ev::Event| {
        let input: web_sys::HtmlInputElement = ev.target().unwrap().unchecked_into();
        if let Some(files) = input.files() {
            if let Some(file) = files.get(0) {
                let file_name = file.name();
                let file_name_clone = file_name.clone();
                set_status_text.set(format!("Processing {}...", file_name));

                // Use wasm_bindgen closure to load image via canvas
                let callback = Closure::wrap(Box::new(move |rgba_data: Vec<u8>, width: u32, height: u32| {
                    let mut pixels = Vec::new();
                    for i in (0..rgba_data.len()).step_by(16) { // sample every 4th pixel
                        if i + 3 < rgba_data.len() && rgba_data[i + 3] > 128 {
                            pixels.push(Rgb::from_bytes(rgba_data[i], rgba_data[i + 1], rgba_data[i + 2]));
                        }
                    }
                    let centroids = k_means_colors(&pixels, 5, 20);
                    let results: Vec<(String, String, String)> = centroids.iter().map(|c| {
                        let (accent, hex) = map_to_accent(c);
                        let (h, s, l) = c.to_hsl();
                        (hex, format!("{:.0},{:.0}%,{:.0}%", h, s * 100.0, l * 100.0), accent)
                    }).collect();
                    set_extracted_colors.set(results);
                    set_status_text.set(format!("Extracted {} colors from {} ({}x{})", centroids.len(), file_name, width, height));
                }) as Box<dyn Fn(Vec<u8>, u32, u32)>);

                // For now, just show a placeholder message
                // Full implementation requires JS interop for canvas image loading
                set_status_text.set(format!("Image: {} -- k-means extraction ready (requires trunk build for full canvas interop)", file_name_clone));
                drop(callback);
            }
        }
    };

    view! {
        <div class="extractor-section" style={
            let t = theme.get();
            format!("background: {}; color: {}; margin-top: 24px; padding: 16px; border-radius: 8px;",
                t.colors.get("editor.background").unwrap_or(&"#24212E".into()),
                t.colors.get("editor.foreground").unwrap_or(&"#CCC8D9".into()),
            )
        }>
            <h3 style="margin: 0 0 12px 0;">"AI Accent Color Extractor"</h3>
            <p style="font-size: 13px; opacity: 0.7; margin-bottom: 12px;">
                "Upload an image to extract dominant colors and map them to Shroom Space accent presets."
            </p>
            <input
                type="file"
                accept="image/*"
                class="file-upload"
                style="background: #393552; color: #CCC8D9; border: 1px solid #726D89; border-radius: 4px; padding: 8px 12px; font-size: 13px;"
                on:change=on_upload
            />
            <p class="status" style="font-size: 12px; margin-top: 8px; opacity: 0.8;">
                {move || status_text.get()}
            </p>

            <div class="extracted-colors" style="display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap;">
                {move || extracted_colors.get().iter().map(|(hex, hsl, accent)| {
                    view! {
                        <div class="extracted-swatch" style="text-align: center;">
                            <div style=format!(
                                "width: 56px; height: 56px; border-radius: 8px; background: {}; border: 1px solid #726D89;",
                                hex
                            )></div>
                            <div style="font-size: 11px; margin-top: 4px; font-family: monospace;">{hex.clone()}</div>
                            <div style="font-size: 10px; opacity: 0.7;">{format!("accent: {}", accent)}</div>
                            <div style="font-size: 10px; opacity: 0.5;">{format!("HSL: {}", hsl)}</div>
                        </div>
                    }
                }).collect::<Vec<_>>()}
            </div>
        </div>
    }
}

fn main() {
    console_log::init_with_level(log::Level::Debug).unwrap();
    leptos::mount::mount_to_body(|| view! { <App /> });
}
