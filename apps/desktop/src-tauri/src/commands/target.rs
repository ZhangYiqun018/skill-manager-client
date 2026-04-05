use std::path::PathBuf;

use skill_manager_core::{
    AppError, IndexOptions, InstallTargetInventory,
    load_install_target_inventory as load_install_target_inventory_core,
    repair_install_target as repair_install_target_core,
    sync_install_target as sync_install_target_core,
};

use crate::utils::{build_scan_options, error_chain, run_blocking};

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn load_install_target_inventory(
    project_root: Option<String>,
) -> Result<Vec<InstallTargetInventory>, AppError> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        load_install_target_inventory_core(&scan_options, &IndexOptions::default())
            .map_err(error_chain)
    })
    .await
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
#[tracing::instrument(skip(project_root))]
pub async fn repair_install_target(
    target_root: String,
    project_root: Option<String>,
) -> Result<Vec<InstallTargetInventory>, AppError> {
    tracing::info!("repairing install target {}", target_root);
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
