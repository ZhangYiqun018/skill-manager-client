use skill_manager_core::{
    AppError, IndexOptions, InstallTargetInventory,
    load_install_target_inventory as load_install_target_inventory_core,
    repair_install_target as repair_install_target_core,
    sync_install_target as sync_install_target_core,
};

use crate::utils::{
    build_scan_options, collect_allowed_roots, log_err, run_blocking,
    validate_allowed_path_with_roots,
};

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn load_install_target_inventory(
    project_root: Option<String>,
) -> Result<Vec<InstallTargetInventory>, AppError> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        Ok(load_install_target_inventory_core(
            &scan_options,
            &IndexOptions::default(),
        )?)
    })
    .await
    .map_err(log_err("load_install_target_inventory"))
}

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn sync_install_target(
    target_root: String,
    project_root: Option<String>,
) -> Result<Vec<InstallTargetInventory>, AppError> {
    tracing::info!("syncing install target {}", target_root);
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path = validate_allowed_path_with_roots(&target_root, &allowed_roots)?;
        Ok(sync_install_target_core(
            allowed_path,
            &scan_options,
            &index_options,
        )?)
    })
    .await
    .map_err(log_err("sync_install_target"))
}

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn repair_install_target(
    target_root: String,
    project_root: Option<String>,
) -> Result<Vec<InstallTargetInventory>, AppError> {
    tracing::info!("repairing install target {}", target_root);
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path = validate_allowed_path_with_roots(&target_root, &allowed_roots)?;
        Ok(repair_install_target_core(
            allowed_path,
            &scan_options,
            &index_options,
        )?)
    })
    .await
    .map_err(log_err("repair_install_target"))
}
