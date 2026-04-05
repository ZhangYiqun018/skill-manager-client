use skill_manager_core::{
    AppError, DiscoveryReport, IndexOptions, IndexedScanSummary, ScanSummary,
    load_discovery_report as load_discovery_report_core, load_skill_index as load_skill_index_core,
    refresh_skill_index as refresh_skill_index_core, scan_local_skills as scan_local_skills_core,
};

use crate::utils::{build_scan_options, error_chain, get_registry_url, run_blocking};
use crate::RuntimeSettingsSnapshot;

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn scan_local_skills(project_root: Option<String>) -> Result<ScanSummary, AppError> {
    tracing::info!("scanning local skills");
    let scan_options = build_scan_options(project_root);
    run_blocking(move || Ok(scan_local_skills_core(&scan_options))).await
}

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn load_skill_index(project_root: Option<String>) -> Result<IndexedScanSummary, AppError> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        load_skill_index_core(&scan_options, &IndexOptions::default()).map_err(error_chain)
    })
    .await
}

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn refresh_skill_index(project_root: Option<String>) -> Result<IndexedScanSummary, AppError> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        refresh_skill_index_core(&scan_options, &IndexOptions::default()).map_err(error_chain)
    })
    .await
}

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn load_discovery_report(project_root: Option<String>) -> Result<DiscoveryReport, AppError> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        load_discovery_report_core(&scan_options, &IndexOptions::default()).map_err(error_chain)
    })
    .await
}

#[tauri::command]
pub fn load_runtime_settings() -> RuntimeSettingsSnapshot {
    RuntimeSettingsSnapshot {
        index_path: skill_manager_core::default_index_path()
            .to_string_lossy()
            .into_owned(),
        store_path: skill_manager_core::default_store_path()
            .to_string_lossy()
            .into_owned(),
        install_strategy: "symlink_first".to_string(),
        registry_url: get_registry_url(),
    }
}
