// build.rs - Embed theme JSON files at compile time
use std::env;
use std::fs;
use std::path::Path;

fn main() {
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("themes.rs");

    let themes_dir = Path::new("../themes");
    let mut theme_data = String::from("use serde::Deserialize;\n\n");
    theme_data.push_str("#[derive(Clone, Deserialize, Debug)]\n");
    theme_data.push_str("pub struct Theme {\n");
    theme_data.push_str("    pub name: String,\n");
    theme_data.push_str("    #[serde(rename = \"type\")]\n");
    theme_data.push_str("    pub theme_type: String,\n");
    theme_data.push_str("    pub colors: std::collections::HashMap<String, String>,\n");
    theme_data.push_str("}\n\n");

    theme_data.push_str("pub fn load_themes() -> Vec<(&'static str, &'static str)> {\n");
    theme_data.push_str("    vec![\n");

    if let Ok(entries) = fs::read_dir(themes_dir) {
        let mut entries: Vec<_> = entries
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().map_or(false, |ext| ext == "json"))
            .collect();
        entries.sort_by_key(|e| e.file_name());

        for entry in entries {
            let path = entry.path();
            let name = path.file_stem().unwrap().to_str().unwrap();
            let _content = fs::read_to_string(&path).unwrap();
            let var_name = name.replace('-', "_");

            theme_data.push_str(&format!(
                "        (\"{name}\", include_str!(\"{}\")),\n",
                path.display()
            ));

            // Also emit a static str constant
            theme_data.push_str(&format!(
                "pub static {}: &str = include_str!(\"{}\");\n",
                var_name.to_uppercase(),
                path.display()
            ));
        }
    }

    theme_data.push_str("    ]\n");
    theme_data.push_str("}\n");

    fs::write(&dest_path, theme_data).unwrap();
    println!("cargo:rerun-if-changed=../themes");
}
