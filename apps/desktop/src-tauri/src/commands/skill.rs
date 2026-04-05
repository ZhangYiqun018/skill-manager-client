use std::path::PathBuf;

use skill_manager_core::{
    AppError, IndexOptions, IndexedScanSummary, InstallMethod, ManagedGitSource,
    ManagedSkillHistory, ManagedSkillOrigin, RemoteUpdateCheck, SkillComparison,
    SkillDirectoryDiff, SkillFileNode, SkillInstallStatus,
    check_managed_skill_updates as check_managed_skill_updates_core,
    compare_skills as compare_skills_core, diff_skill_directories as diff_skill_directories_core,
    export_skills_by_tags as export_skills_by_tags_core,
    install_managed_skill as install_managed_skill_core,
    load_managed_git_source as load_managed_git_source_core,
    load_managed_skill_history as load_managed_skill_history_core,
    load_managed_skill_origins as load_managed_skill_origins_core,
    load_skill_file_tree as load_skill_file_tree_core, load_skill_index as load_skill_index_core,
    load_skill_install_statuses as load_skill_install_statuses_core,
    promote_managed_skill_variant as promote_managed_skill_variant_core,
    read_skill_text_file as read_skill_text_file_core,
    remove_managed_skill_install as remove_managed_skill_install_core,
    repair_managed_skill_install as repair_managed_skill_install_core,
    set_skill_tags as set_skill_tags_core,
    update_managed_skill_from_git as update_managed_skill_from_git_core,
    update_managed_skill_variant_label as update_managed_skill_variant_label_core,
};

use crate::SkillContentPayload;
use crate::utils::{
    build_scan_options, collect_allowed_roots, log_err, parse_agent, run_blocking,
    validate_allowed_path_with_roots,
};

#[tauri::command]
#[tracing::instrument]
pub async fn check_skill_updates() -> Result<Vec<RemoteUpdateCheck>, AppError> {
    run_blocking(move || {
        let index_options = IndexOptions::default();
        Ok(check_managed_skill_updates_core(&index_options)?)
    })
    .await
    .map_err(log_err("check_skill_updates"))
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
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        update_managed_skill_from_git_core(allowed_path, &scan_options, &index_options)?;
        Ok(load_skill_index_core(&scan_options, &index_options)?)
    })
    .await
    .map_err(log_err("update_managed_skill"))
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
        let left = validate_allowed_path_with_roots(&left_path, &allowed_roots)?;
        let right = validate_allowed_path_with_roots(&right_path, &allowed_roots)?;
        Ok(compare_skills_core(
            left,
            right,
            &scan_options,
            &index_options,
        )?)
    })
    .await
    .map_err(log_err("compare_skills"))
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
        let left = validate_allowed_path_with_roots(&left_path, &allowed_roots)?;
        let right = validate_allowed_path_with_roots(&right_path, &allowed_roots)?;
        Ok(diff_skill_directories_core(left, right)?)
    })
    .await
    .map_err(log_err("diff_skills"))
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
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        let content = read_skill_text_file_core(allowed_path)?;

        Ok(SkillContentPayload { content })
    })
    .await
    .map_err(log_err("read_skill_content"))
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
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        let content = read_skill_text_file_core(allowed_path)?;
        Ok(SkillContentPayload { content })
    })
    .await
    .map_err(log_err("read_skill_text_file"))
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
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        Ok(load_skill_file_tree_core(allowed_path)?)
    })
    .await
    .map_err(log_err("load_skill_file_tree"))
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
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        Ok(load_managed_git_source_core(allowed_path, &index_options)?)
    })
    .await
    .map_err(log_err("load_managed_git_source"))
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
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        Ok(load_managed_skill_origins_core(
            allowed_path,
            &index_options,
        )?)
    })
    .await
    .map_err(log_err("load_managed_skill_origins"))
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
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        Ok(load_managed_skill_history_core(
            allowed_path,
            &scan_options,
            &index_options,
        )?)
    })
    .await
    .map_err(log_err("load_managed_skill_history"))
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
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        Ok(load_skill_install_statuses_core(
            allowed_path,
            &scan_options,
            &index_options,
        )?)
    })
    .await
    .map_err(log_err("load_skill_install_statuses"))
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
    let agent_override = agent.as_deref().map(parse_agent).transpose()?;
    let method_override = method
        .as_deref()
        .map(|value| match value {
            "symlink" => Ok(InstallMethod::Symlink),
            "copy" => Ok(InstallMethod::Copy),
            _ => Err(AppError::validation(format!(
                "Unsupported install method: {value}"
            ))),
        })
        .transpose()?;
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        Ok(install_managed_skill_core(
            allowed_path,
            PathBuf::from(target_root),
            agent_override,
            method_override,
            &scan_options,
            &index_options,
        )?)
    })
    .await
    .map_err(log_err("install_managed_skill"))
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
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        Ok(remove_managed_skill_install_core(
            allowed_path,
            PathBuf::from(target_root),
            &scan_options,
            &index_options,
        )?)
    })
    .await
    .map_err(log_err("remove_managed_skill_install"))
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
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        Ok(repair_managed_skill_install_core(
            allowed_path,
            PathBuf::from(target_root),
            &scan_options,
            &index_options,
        )?)
    })
    .await
    .map_err(log_err("repair_managed_skill_install"))
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
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        update_managed_skill_variant_label_core(
            allowed_path,
            variant_label,
            &scan_options,
            &index_options,
        )?;
        Ok(load_skill_index_core(&scan_options, &index_options)?)
    })
    .await
    .map_err(log_err("update_managed_skill_variant_label"))
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
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        promote_managed_skill_variant_core(allowed_path, &scan_options, &index_options)?;
        Ok(load_skill_index_core(&scan_options, &index_options)?)
    })
    .await
    .map_err(log_err("promote_managed_skill_variant"))
}

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn set_skill_tags(
    skill_md: String,
    tags: Vec<String>,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, AppError> {
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        set_skill_tags_core(&skill_md, &tags, &index_options)?;
        Ok(load_skill_index_core(&scan_options, &index_options)?)
    })
    .await
    .map_err(log_err("set_skill_tags"))
}

#[tauri::command]
#[tracing::instrument(skip(_project_root))]
pub async fn export_skills_by_tags(
    destination: String,
    tags: Vec<String>,
    _project_root: Option<String>,
) -> Result<u32, AppError> {
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let destination_path = PathBuf::from(destination);
        Ok(export_skills_by_tags_core(
            &destination_path,
            &tags,
            &index_options,
        )?)
    })
    .await
    .map_err(log_err("export_skills_by_tags"))
}

#[tauri::command]
#[tracing::instrument]
pub async fn export_skills_by_tags_to_openclaw(tags: Vec<String>) -> Result<u32, AppError> {
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let destination = dirs::home_dir()
            .ok_or_else(|| AppError::io("Unable to determine home directory".to_string()))?
            .join(".openclaw/skills");
        Ok(export_skills_by_tags_core(
            &destination,
            &tags,
            &index_options,
        )?)
    })
    .await
    .map_err(log_err("export_skills_by_tags_to_openclaw"))
}
