use leptos::prelude::*;
use leptos_meta::{provide_meta_context, Meta, Title};
use serde::Deserialize;
use std::collections::HashMap;

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

fn main() {
    console_log::init_with_level(log::Level::Debug).unwrap();
    leptos::mount::mount_to_body(|| view! { <App /> });
}
