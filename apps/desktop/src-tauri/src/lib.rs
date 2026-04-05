mod commands;
mod utils;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RegistrySkillResult {
    id: String,
    skill_id: String,
    name: String,
    installs: u64,
    source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RegistrySearchResponse {
    query: String,
    skills: Vec<RegistrySkillResult>,
    count: usize,
}

#[derive(Debug, Serialize)]
pub(crate) struct SkillContentPayload {
    content: String,
}

#[derive(Debug, Serialize)]
pub(crate) struct RuntimeSettingsSnapshot {
    index_path: String,
    store_path: String,
    install_strategy: String,
    registry_url: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::scan::scan_local_skills,
            commands::scan::load_skill_index,
            commands::scan::refresh_skill_index,
            commands::scan::load_discovery_report,
            commands::adopt::adopt_skill,
            commands::adopt::adopt_skills,
            commands::adopt::apply_adoption_resolutions,
            commands::import::import_local_skill_folder,
            commands::import::search_skills_registry,
            commands::import::adopt_registry_skill,
            commands::import::save_registry_url,
            commands::import::fetch_popular_skills,
            commands::import::fetch_skill_readme,
            commands::import::fetch_registry_stats,
            commands::skill::check_skill_updates,
            commands::skill::update_managed_skill,
            commands::skill::compare_skills,
            commands::skill::diff_skills,
            commands::skill::read_skill_content,
            commands::skill::read_skill_text_file,
            commands::skill::load_skill_file_tree,
            commands::skill::load_managed_skill_origins,
            commands::skill::load_managed_git_source,
            commands::skill::load_managed_skill_history,
            commands::skill::load_skill_install_statuses,
            commands::target::load_install_target_inventory,
            commands::target::sync_install_target,
            commands::target::repair_install_target,
            commands::skill::install_managed_skill,
            commands::skill::remove_managed_skill_install,
            commands::skill::repair_managed_skill_install,
            commands::skill::update_managed_skill_variant_label,
            commands::skill::promote_managed_skill_variant,
            commands::custom_target::open_in_finder,
            commands::scan::load_runtime_settings,
            commands::custom_target::list_custom_targets,
            commands::custom_target::add_custom_target,
            commands::custom_target::remove_custom_target,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
