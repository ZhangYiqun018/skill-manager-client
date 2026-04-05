use skill_manager_core::{
    AppError, CustomInstallTarget, IndexOptions, add_custom_target as add_custom_target_core,
    load_custom_targets as load_custom_targets_core,
    remove_custom_target as remove_custom_target_core,
};

use crate::utils::{
    build_scan_options, collect_allowed_roots, log_err, open_in_file_manager, parse_agent,
    parse_scope, run_blocking, validate_allowed_path_with_roots,
};

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn open_in_finder(path: String, project_root: Option<String>) -> Result<(), AppError> {
    tracing::info!("opening path in finder: {}", path);
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        open_in_file_manager(&allowed_path)
    })
    .await
    .map_err(log_err("open_in_finder"))
}

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn list_custom_targets(
    project_root: Option<String>,
) -> Result<Vec<CustomInstallTarget>, AppError> {
    let _scan_options = build_scan_options(project_root);
    run_blocking(move || Ok(load_custom_targets_core(&IndexOptions::default())?))
        .await
        .map_err(log_err("list_custom_targets"))
}

#[tauri::command]
#[tracing::instrument(skip(project_root, label))]
pub async fn add_custom_target(
    path: String,
    agent: String,
    scope: String,
    label: Option<String>,
    project_root: Option<String>,
) -> Result<CustomInstallTarget, AppError> {
    tracing::info!("adding custom target at {}", path);
    let agent = parse_agent(&agent)?;
    let scope = parse_scope(&scope)?;
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        Ok(add_custom_target_core(
            allowed_path,
            agent,
            scope,
            label,
            &index_options,
        )?)
    })
    .await
    .map_err(log_err("add_custom_target"))
}

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn remove_custom_target(id: i64, project_root: Option<String>) -> Result<(), AppError> {
    tracing::info!("removing custom target {}", id);
    let _scan_options = build_scan_options(project_root);
    run_blocking(move || Ok(remove_custom_target_core(id, &IndexOptions::default())?))
        .await
        .map_err(log_err("remove_custom_target"))
}
