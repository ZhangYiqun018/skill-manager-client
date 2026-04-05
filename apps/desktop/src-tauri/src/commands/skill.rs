use std::path::PathBuf;

use skill_manager_core::{
    AppError, IndexOptions, IndexedScanSummary, InstallMethod, ManagedGitSource, ManagedSkillHistory,
    ManagedSkillOrigin, RemoteUpdateCheck, SkillComparison, SkillDirectoryDiff, SkillFileNode,
    SkillInstallStatus, check_managed_skill_updates as check_managed_skill_updates_core,
    compare_skills as compare_skills_core, diff_skill_directories as diff_skill_directories_core,
    install_managed_skill as install_managed_skill_core,
    load_managed_git_source as load_managed_git_source_core,
    load_managed_skill_history as load_managed_skill_history_core,
    load_managed_skill_origins as load_managed_skill_origins_core,
    load_skill_file_tree as load_skill_file_tree_core,
    load_skill_index as load_skill_index_core,
    load_skill_install_statuses as load_skill_install_statuses_core,
    promote_managed_skill_variant as promote_managed_skill_variant_core,
    read_skill_text_file as read_skill_text_file_core,
    remove_managed_skill_install as remove_managed_skill_install_core,
    repair_managed_skill_install as repair_managed_skill_install_core,
    update_managed_skill_from_git as update_managed_skill_from_git_core,
    update_managed_skill_variant_label as update_managed_skill_variant_label_core,
};

use crate::utils::{build_scan_options, collect_allowed_roots, error_chain, parse_agent, run_blocking, validate_allowed_path_with_roots};
use crate::SkillContentPayload;

#[tauri::command]
#[tracing::instrument]
pub async fn check_skill_updates() -> Result<Vec<RemoteUpdateCheck>, AppError> {
    run_blocking(move || {
        let index_options = IndexOptions::default();
        check_managed_skill_updates_core(&index_options).map_err(error_chain)
    })
    .await
}

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn update_managed_skill(
    path: String,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, AppError> {
    tracing::info!("updating managed skill at {}", path);
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
#[tracing::instrument(skip(project_root))]
pub async fn compare_skills(
    left_path: String,
    right_path: String,
    project_root: Option<String>,
) -> Result<SkillComparison, AppError> {
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
#[tracing::instrument(skip(project_root))]
pub async fn diff_skills(
    left_path: String,
    right_path: String,
    project_root: Option<String>,
) -> Result<SkillDirectoryDiff, AppError> {
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

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn read_skill_content(
    path: String,
    project_root: Option<String>,
) -> Result<SkillContentPayload, AppError> {
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
#[tracing::instrument(skip(project_root))]
pub async fn read_skill_text_file(
    path: String,
    project_root: Option<String>,
) -> Result<SkillContentPayload, AppError> {
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
#[tracing::instrument(skip(project_root))]
pub async fn load_skill_file_tree(
    path: String,
    project_root: Option<String>,
) -> Result<SkillFileNode, AppError> {
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
#[tracing::instrument(skip(project_root))]
pub async fn load_managed_git_source(
    path: String,
    project_root: Option<String>,
) -> Result<Option<ManagedGitSource>, AppError> {
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
#[tracing::instrument(skip(project_root))]
pub async fn load_managed_skill_origins(
    path: String,
    project_root: Option<String>,
) -> Result<Vec<ManagedSkillOrigin>, AppError> {
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
#[tracing::instrument(skip(project_root))]
pub async fn load_managed_skill_history(
    path: String,
    project_root: Option<String>,
) -> Result<ManagedSkillHistory, AppError> {
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
#[tracing::instrument(skip(project_root))]
pub async fn load_skill_install_statuses(
    path: String,
    project_root: Option<String>,
) -> Result<Vec<SkillInstallStatus>, AppError> {
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
#[tracing::instrument(skip(project_root, agent, method))]
pub async fn install_managed_skill(
    path: String,
    target_root: String,
    agent: Option<String>,
    method: Option<String>,
    project_root: Option<String>,
) -> Result<Vec<SkillInstallStatus>, AppError> {
    tracing::info!("installing managed skill from {} to {}", path, target_root);
    let agent_override = agent.as_deref().map(parse_agent).transpose().map_err(error_chain)?;
    let method_override = method
        .as_deref()
        .map(|value| match value {
            "symlink" => Ok(InstallMethod::Symlink),
            "copy" => Ok(InstallMethod::Copy),
            _ => anyhow::bail!("Unsupported install method: {value}"),
        })
        .transpose()
        .map_err(error_chain)?;
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path =
            validate_allowed_path_with_roots(&path, &allowed_roots).map_err(error_chain)?;
        install_managed_skill_core(
            allowed_path,
            PathBuf::from(target_root),
            agent_override,
            method_override,
            &scan_options,
            &index_options,
        )
        .map_err(error_chain)
    })
    .await
}

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn remove_managed_skill_install(
    path: String,
    target_root: String,
    project_root: Option<String>,
) -> Result<Vec<SkillInstallStatus>, AppError> {
    tracing::info!("removing managed skill install from {}", target_root);
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
#[tracing::instrument(skip(project_root))]
pub async fn repair_managed_skill_install(
    path: String,
    target_root: String,
    project_root: Option<String>,
) -> Result<Vec<SkillInstallStatus>, AppError> {
    tracing::info!("repairing managed skill install at {}", target_root);
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
#[tracing::instrument(skip(project_root))]
pub async fn update_managed_skill_variant_label(
    path: String,
    variant_label: String,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, AppError> {
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
#[tracing::instrument(skip(project_root))]
pub async fn promote_managed_skill_variant(
    path: String,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, AppError> {
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
