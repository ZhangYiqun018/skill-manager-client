use skill_manager_core::{
    AppError, DiscoveryReport, IndexOptions, IndexedScanSummary, ScanSummary,
    load_discovery_report as load_discovery_report_core, load_skill_index as load_skill_index_core,
    refresh_skill_index as refresh_skill_index_core, scan_local_skills as scan_local_skills_core,
};

use crate::RuntimeSettingsSnapshot;
use crate::utils::{build_scan_options, get_registry_url, log_err, run_blocking};

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn scan_local_skills(project_root: Option<String>) -> Result<ScanSummary, AppError> {
    tracing::info!("scanning local skills");
    let scan_options = build_scan_options(project_root);
    run_blocking(move || Ok(scan_local_skills_core(&scan_options)))
        .await
        .map_err(log_err("scan_local_skills"))
}

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn load_skill_index(
    project_root: Option<String>,
) -> Result<IndexedScanSummary, AppError> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        Ok(load_skill_index_core(
            &scan_options,
            &IndexOptions::default(),
        )?)
    })
    .await
    .map_err(log_err("load_skill_index"))
}

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn refresh_skill_index(
    project_root: Option<String>,
) -> Result<IndexedScanSummary, AppError> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        Ok(refresh_skill_index_core(
            &scan_options,
            &IndexOptions::default(),
        )?)
    })
    .await
    .map_err(log_err("refresh_skill_index"))
}

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn load_discovery_report(
    project_root: Option<String>,
) -> Result<DiscoveryReport, AppError> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        Ok(load_discovery_report_core(
            &scan_options,
            &IndexOptions::default(),
        )?)
    })
    .await
    .map_err(log_err("load_discovery_report"))
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
