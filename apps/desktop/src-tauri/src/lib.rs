use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Context, Result};
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use skill_manager_core::{
    AdoptionResolution, AgentKind, CustomInstallTarget, DiscoveryReport, IndexOptions, IndexedScanSummary,
    InstallTargetInventory, ManagedGitSource, ManagedSkillHistory, ManagedSkillOrigin,
    RemoteUpdateCheck, ScanOptions, ScanSummary, SkillComparison, SkillDirectoryDiff,
    SkillFileNode, SkillInstallStatus, SkillScope, SkillSourceType,
    adopt_skill as adopt_skill_core, adopt_skills as adopt_skills_core,
    add_custom_target as add_custom_target_core,
    apply_adoption_resolutions as apply_adoption_resolutions_core, check_managed_skill_updates as check_managed_skill_updates_core,
    compare_skills as compare_skills_core, diff_skill_directories as diff_skill_directories_core,
    import_git_skill as import_git_skill_core,
    import_skill_directory as import_skill_directory_core, install_managed_skill as install_managed_skill_core,
    load_custom_targets as load_custom_targets_core,
    load_discovery_report as load_discovery_report_core, load_install_target_inventory as load_install_target_inventory_core,
    load_managed_skill_history as load_managed_skill_history_core, load_skill_index as load_skill_index_core,
    load_managed_git_source as load_managed_git_source_core,
    load_managed_skill_origins as load_managed_skill_origins_core, load_skill_file_tree as load_skill_file_tree_core,
    load_skill_install_statuses as load_skill_install_statuses_core,
    promote_managed_skill_variant as promote_managed_skill_variant_core,
    read_skill_text_file as read_skill_text_file_core, refresh_skill_index as refresh_skill_index_core,
    remove_custom_target as remove_custom_target_core,
    repair_install_target as repair_install_target_core, remove_managed_skill_install as remove_managed_skill_install_core,
    repair_managed_skill_install as repair_managed_skill_install_core, scan_local_skills as scan_local_skills_core,
    sync_install_target as sync_install_target_core, update_managed_skill_from_git as update_managed_skill_from_git_core,
    update_managed_skill_variant_label as update_managed_skill_variant_label_core,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RegistrySkillResult {
    id: String,
    skill_id: String,
    name: String,
    installs: u64,
    source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RegistrySearchResponse {
    query: String,
    skills: Vec<RegistrySkillResult>,
    count: usize,
}

#[tauri::command]
async fn scan_local_skills(project_root: Option<String>) -> Result<ScanSummary, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || Ok(scan_local_skills_core(&scan_options))).await
}

#[tauri::command]
async fn load_skill_index(project_root: Option<String>) -> Result<IndexedScanSummary, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        load_skill_index_core(&scan_options, &IndexOptions::default()).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn refresh_skill_index(project_root: Option<String>) -> Result<IndexedScanSummary, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        refresh_skill_index_core(&scan_options, &IndexOptions::default()).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn load_discovery_report(project_root: Option<String>) -> Result<DiscoveryReport, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        load_discovery_report_core(&scan_options, &IndexOptions::default()).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn adopt_skill(
    path: String,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path =
            validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain)?;
        adopt_skill_core(allowed_path, &scan_options, &index_options).map_err(error_chain)?;
        load_skill_index_core(&scan_options, &index_options).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn adopt_skills(
    paths: Vec<String>,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let validated_paths = paths
            .into_iter()
            .map(|path| validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain))
            .collect::<Result<Vec<_>, _>>()?;
        adopt_skills_core(validated_paths, &scan_options, &index_options).map_err(error_chain)?;
        load_skill_index_core(&scan_options, &index_options).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn apply_adoption_resolutions(
    resolutions: Vec<AdoptionResolution>,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);

        let validated = resolutions
            .into_iter()
            .map(|resolution| {
                let source_path =
                    validate_allowed_path_with_roots(&resolution.source_path.to_string_lossy(), &allowed_roots)
                        .map_err(error_chain)?;
                let merge_target_path = resolution
                    .merge_target_path
                    .map(|path| {
                        validate_allowed_path_with_roots(&path.to_string_lossy(), &allowed_roots)
                            .map_err(error_chain)
                    })
                    .transpose()?;

                Ok(AdoptionResolution {
                    source_path,
                    action: resolution.action,
                    merge_target_path,
                    variant_label: resolution.variant_label,
                })
            })
            .collect::<Result<Vec<_>, String>>()?;

        apply_adoption_resolutions_core(validated, &scan_options, &index_options).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn import_local_skill_folder(
    path: String,
    agent: String,
    scope: String,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, String> {
    let agent = parse_agent(&agent).map_err(error_chain)?;
    let scope = parse_scope(&scope).map_err(error_chain)?;
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        import_skill_directory_core(
            PathBuf::from(path.clone()),
            SkillSourceType::Import,
            agent,
            scope,
            path,
            &index_options,
        )
        .map_err(error_chain)?;
        load_skill_index_core(&scan_options, &index_options).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn search_skills_registry(query: String) -> Result<RegistrySearchResponse, String> {
    run_blocking(move || {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return Ok(RegistrySearchResponse {
                query,
                skills: Vec::new(),
                count: 0,
            });
        }

        let url = reqwest::Url::parse_with_params(
            "https://skills.sh/api/search",
            &[("q", trimmed), ("limit", "12")],
        )
        .map_err(error_chain)?;
        let response = Client::new()
            .get(url)
            .send()
            .map_err(error_chain)?
            .error_for_status()
            .map_err(error_chain)?;
        let payload = response
            .json::<RegistrySearchResponse>()
            .map_err(error_chain)?;
        Ok(payload)
    })
    .await
}

#[tauri::command]
async fn adopt_registry_skill(
    source: String,
    skill_id: String,
    _registry_id: String,
    agent: String,
    scope: String,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, String> {
    let agent = parse_agent(&agent).map_err(error_chain)?;
    let scope = parse_scope(&scope).map_err(error_chain)?;
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let git_url = format!("https://github.com/{source}.git");
        import_git_skill_core(
            git_url,
            None,
            Some(skill_id),
            agent,
            scope,
            None,
            &index_options,
        )
        .map_err(error_chain)?;
        load_skill_index_core(&scan_options, &index_options).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn check_skill_updates() -> Result<Vec<RemoteUpdateCheck>, String> {
    run_blocking(move || {
        let index_options = IndexOptions::default();
        check_managed_skill_updates_core(&index_options).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn update_managed_skill(
    path: String,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        update_managed_skill_from_git_core(PathBuf::from(path), &scan_options, &index_options)
            .map_err(error_chain)?;
        load_skill_index_core(&scan_options, &index_options).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn compare_skills(
    left_path: String,
    right_path: String,
    project_root: Option<String>,
) -> Result<SkillComparison, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let left =
            validate_allowed_path_with_roots(&left_path, &allowed_roots).map_err(error_chain)?;
        let right =
            validate_allowed_path_with_roots(&right_path, &allowed_roots).map_err(error_chain)?;
        compare_skills_core(left, right, &scan_options, &index_options).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn diff_skills(
    left_path: String,
    right_path: String,
    project_root: Option<String>,
) -> Result<SkillDirectoryDiff, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let left =
            validate_allowed_path_with_roots(&left_path, &allowed_roots).map_err(error_chain)?;
        let right =
            validate_allowed_path_with_roots(&right_path, &allowed_roots).map_err(error_chain)?;
        diff_skill_directories_core(left, right).map_err(error_chain)
    })
    .await
}

#[derive(Debug, Serialize)]
struct SkillContentPayload {
    content: String,
}

#[derive(Debug, Serialize)]
struct RuntimeSettingsSnapshot {
    index_path: String,
    store_path: String,
    install_strategy: String,
}

#[tauri::command]
async fn read_skill_content(
    path: String,
    project_root: Option<String>,
) -> Result<SkillContentPayload, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path =
            validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain)?;
        let content = read_skill_text_file_core(allowed_path).map_err(error_chain)?;

        Ok(SkillContentPayload { content })
    })
    .await
}

#[tauri::command]
async fn read_skill_text_file(
    path: String,
    project_root: Option<String>,
) -> Result<SkillContentPayload, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path =
            validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain)?;
        let content = read_skill_text_file_core(allowed_path).map_err(error_chain)?;
        Ok(SkillContentPayload { content })
    })
    .await
}

#[tauri::command]
async fn load_skill_file_tree(
    path: String,
    project_root: Option<String>,
) -> Result<SkillFileNode, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path =
            validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain)?;
        load_skill_file_tree_core(allowed_path).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn load_managed_git_source(
    path: String,
    project_root: Option<String>,
) -> Result<Option<ManagedGitSource>, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path =
            validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain)?;
        load_managed_git_source_core(allowed_path, &index_options).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn load_managed_skill_origins(
    path: String,
    project_root: Option<String>,
) -> Result<Vec<ManagedSkillOrigin>, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path =
            validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain)?;
        load_managed_skill_origins_core(allowed_path, &index_options).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn load_managed_skill_history(
    path: String,
    project_root: Option<String>,
) -> Result<ManagedSkillHistory, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path =
            validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain)?;
        load_managed_skill_history_core(allowed_path, &scan_options, &index_options)
            .map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn load_skill_install_statuses(
    path: String,
    project_root: Option<String>,
) -> Result<Vec<SkillInstallStatus>, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path =
            validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain)?;
        load_skill_install_statuses_core(allowed_path, &scan_options, &index_options)
            .map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn load_install_target_inventory(
    project_root: Option<String>,
) -> Result<Vec<InstallTargetInventory>, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        load_install_target_inventory_core(&scan_options, &IndexOptions::default())
            .map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn sync_install_target(
    target_root: String,
    project_root: Option<String>,
) -> Result<Vec<InstallTargetInventory>, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        sync_install_target_core(
            PathBuf::from(target_root),
            &scan_options,
            &IndexOptions::default(),
        )
        .map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn repair_install_target(
    target_root: String,
    project_root: Option<String>,
) -> Result<Vec<InstallTargetInventory>, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        repair_install_target_core(
            PathBuf::from(target_root),
            &scan_options,
            &IndexOptions::default(),
        )
        .map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn install_managed_skill(
    path: String,
    target_root: String,
    project_root: Option<String>,
) -> Result<Vec<SkillInstallStatus>, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path =
            validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain)?;
        install_managed_skill_core(
            allowed_path,
            PathBuf::from(target_root),
            &scan_options,
            &index_options,
        )
        .map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn remove_managed_skill_install(
    path: String,
    target_root: String,
    project_root: Option<String>,
) -> Result<Vec<SkillInstallStatus>, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path =
            validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain)?;
        remove_managed_skill_install_core(
            allowed_path,
            PathBuf::from(target_root),
            &scan_options,
            &index_options,
        )
        .map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn repair_managed_skill_install(
    path: String,
    target_root: String,
    project_root: Option<String>,
) -> Result<Vec<SkillInstallStatus>, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path =
            validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain)?;
        repair_managed_skill_install_core(
            allowed_path,
            PathBuf::from(target_root),
            &scan_options,
            &index_options,
        )
        .map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn update_managed_skill_variant_label(
    path: String,
    variant_label: String,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path =
            validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain)?;
        update_managed_skill_variant_label_core(
            allowed_path,
            variant_label,
            &scan_options,
            &index_options,
        )
        .map_err(error_chain)?;
        load_skill_index_core(&scan_options, &index_options).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn promote_managed_skill_variant(
    path: String,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path =
            validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain)?;
        promote_managed_skill_variant_core(allowed_path, &scan_options, &index_options)
            .map_err(error_chain)?;
        load_skill_index_core(&scan_options, &index_options).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn open_in_finder(path: String, project_root: Option<String>) -> Result<(), String> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path =
            validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain)?;
        open_in_file_manager(&allowed_path).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn list_custom_targets(project_root: Option<String>) -> Result<Vec<CustomInstallTarget>, String> {
    let _scan_options = build_scan_options(project_root);
    run_blocking(move || {
        load_custom_targets_core(&IndexOptions::default()).map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn add_custom_target(
    path: String,
    agent: String,
    scope: String,
    label: Option<String>,
    project_root: Option<String>,
) -> Result<CustomInstallTarget, String> {
    let agent = parse_agent(&agent).map_err(error_chain)?;
    let scope = parse_scope(&scope).map_err(error_chain)?;
    let _scan_options = build_scan_options(project_root);
    run_blocking(move || {
        add_custom_target_core(PathBuf::from(path), agent, scope, label, &IndexOptions::default())
            .map_err(error_chain)
    })
    .await
}

#[tauri::command]
async fn remove_custom_target(
    id: i64,
    project_root: Option<String>,
) -> Result<(), String> {
    let _scan_options = build_scan_options(project_root);
    run_blocking(move || {
        remove_custom_target_core(id, &IndexOptions::default()).map_err(error_chain)
    })
    .await
}

#[tauri::command]
fn load_runtime_settings() -> RuntimeSettingsSnapshot {
    RuntimeSettingsSnapshot {
        index_path: skill_manager_core::default_index_path()
            .to_string_lossy()
            .into_owned(),
        store_path: skill_manager_core::default_store_path()
            .to_string_lossy()
            .into_owned(),
        install_strategy: "symlink_first".to_string(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_local_skills,
            load_skill_index,
            refresh_skill_index,
            load_discovery_report,
            adopt_skill,
            adopt_skills,
            apply_adoption_resolutions,
            import_local_skill_folder,
            search_skills_registry,
            adopt_registry_skill,
            check_skill_updates,
            update_managed_skill,
            compare_skills,
            diff_skills,
            read_skill_content,
            read_skill_text_file,
            load_skill_file_tree,
            load_managed_skill_origins,
            load_managed_git_source,
            load_managed_skill_history,
            load_skill_install_statuses,
            load_install_target_inventory,
            sync_install_target,
            repair_install_target,
            install_managed_skill,
            remove_managed_skill_install,
            repair_managed_skill_install,
            update_managed_skill_variant_label,
            promote_managed_skill_variant,
            open_in_finder,
            load_runtime_settings,
            list_custom_targets,
            add_custom_target,
            remove_custom_target,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn build_scan_options(project_root: Option<String>) -> ScanOptions {
    ScanOptions {
        project_root: project_root
            .filter(|value| !value.trim().is_empty())
            .map(PathBuf::from),
        ..Default::default()
    }
}

async fn run_blocking<T, F>(task: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|join_error| format!("Background task failed: {join_error}"))?
}

fn collect_allowed_roots(scan_options: &ScanOptions, index_options: &IndexOptions) -> Vec<PathBuf> {
    let mut allowed_roots = scan_local_skills_core(scan_options)
        .roots
        .into_iter()
        .filter(|root| root.exists)
        .filter_map(|root| fs::canonicalize(root.base_dir).ok())
        .collect::<Vec<_>>();

    if let Ok(indexed) = load_skill_index_core(scan_options, index_options) {
        allowed_roots.extend(
            indexed
                .summary
                .roots
                .into_iter()
                .filter(|root| root.exists)
                .filter_map(|root| fs::canonicalize(root.base_dir).ok()),
        );
        allowed_roots.extend(indexed.summary.skills.into_iter().flat_map(|skill| {
            [
                fs::canonicalize(&skill.path).ok(),
                fs::canonicalize(&skill.skill_md).ok(),
                fs::canonicalize(&skill.source_root).ok(),
                skill.project_root.and_then(|path| fs::canonicalize(path).ok()),
            ]
            .into_iter()
            .flatten()
            .collect::<Vec<_>>()
        }));
    }

    allowed_roots
}

fn validate_allowed_path_with_roots(path: &str, allowed_roots: &[PathBuf]) -> Result<PathBuf> {
    let candidate =
        fs::canonicalize(path).with_context(|| format!("Path does not exist: {path}"))?;

    if allowed_roots.iter().any(|root| candidate.starts_with(root)) {
        Ok(candidate)
    } else {
        anyhow::bail!("Path is outside configured skill roots");
    }
}

fn open_in_file_manager(path: &Path) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        let mut command = Command::new("open");
        if path.is_file() {
            command.arg("-R");
        }
        command.arg(path);
        run_command(command)
    }

    #[cfg(target_os = "windows")]
    {
        let mut command = Command::new("explorer");
        if path.is_file() {
            command.arg("/select,").arg(path);
        } else {
            command.arg(path);
        }
        run_command(command)
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let target = if path.is_dir() {
            path.to_path_buf()
        } else {
            path.parent()
                .map(Path::to_path_buf)
                .unwrap_or_else(|| path.to_path_buf())
        };

        run_command({
            let mut command = Command::new("xdg-open");
            command.arg(target);
            command
        })
    }
}

fn run_command(mut command: Command) -> Result<()> {
    let status = command.status().context("Failed to launch file manager")?;
    if status.success() {
        Ok(())
    } else {
        anyhow::bail!("File manager command exited with status {status}");
    }
}

fn error_chain(error: impl std::fmt::Display) -> String {
    error.to_string()
}

fn parse_agent(value: &str) -> Result<AgentKind> {
    match value {
        "codex" => Ok(AgentKind::Codex),
        "claude_code" => Ok(AgentKind::ClaudeCode),
        _ => anyhow::bail!("Unsupported agent: {value}"),
    }
}

fn parse_scope(value: &str) -> Result<SkillScope> {
    match value {
        "global" => Ok(SkillScope::Global),
        "project" => Ok(SkillScope::Project),
        _ => anyhow::bail!("Unsupported scope: {value}"),
    }
}

#[allow(dead_code)]
fn chrono_like_now_seed() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}
