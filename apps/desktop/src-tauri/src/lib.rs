use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Context, Result};
use serde::Serialize;
use skill_manager_core::{
    IndexOptions, IndexedScanSummary, ScanOptions, ScanSummary,
    adopt_skill as adopt_skill_core, adopt_skills as adopt_skills_core,
    load_skill_index as load_skill_index_core,
    refresh_skill_index as refresh_skill_index_core, scan_local_skills as scan_local_skills_core,
};

#[tauri::command]
fn scan_local_skills(project_root: Option<String>) -> ScanSummary {
    scan_local_skills_core(&build_scan_options(project_root))
}

#[tauri::command]
fn load_skill_index(project_root: Option<String>) -> Result<IndexedScanSummary, String> {
    load_skill_index_core(&build_scan_options(project_root), &IndexOptions::default())
        .map_err(error_chain)
}

#[tauri::command]
fn refresh_skill_index(project_root: Option<String>) -> Result<IndexedScanSummary, String> {
    refresh_skill_index_core(&build_scan_options(project_root), &IndexOptions::default())
        .map_err(error_chain)
}

#[tauri::command]
fn adopt_skill(path: String, project_root: Option<String>) -> Result<IndexedScanSummary, String> {
    let allowed_path = validate_allowed_path(&path, project_root.clone()).map_err(error_chain)?;
    let scan_options = build_scan_options(project_root);
    let index_options = IndexOptions::default();
    adopt_skill_core(allowed_path, &scan_options, &index_options).map_err(error_chain)?;
    refresh_skill_index_core(&scan_options, &index_options).map_err(error_chain)
}

#[tauri::command]
fn adopt_skills(
    paths: Vec<String>,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, String> {
    let validated_paths = paths
        .into_iter()
        .map(|path| validate_allowed_path(&path, project_root.clone()).map_err(error_chain))
        .collect::<Result<Vec<_>, _>>()?;
    let scan_options = build_scan_options(project_root);
    let index_options = IndexOptions::default();
    adopt_skills_core(validated_paths, &scan_options, &index_options).map_err(error_chain)?;
    refresh_skill_index_core(&scan_options, &index_options).map_err(error_chain)
}

#[derive(Debug, Serialize)]
struct SkillContentPayload {
    content: String,
}

#[tauri::command]
fn read_skill_content(
    path: String,
    project_root: Option<String>,
) -> Result<SkillContentPayload, String> {
    let allowed_path = validate_allowed_path(&path, project_root).map_err(error_chain)?;
    let content = fs::read_to_string(&allowed_path).map_err(error_chain)?;

    Ok(SkillContentPayload { content })
}

#[tauri::command]
fn open_in_finder(path: String, project_root: Option<String>) -> Result<(), String> {
    let allowed_path = validate_allowed_path(&path, project_root).map_err(error_chain)?;
    open_in_file_manager(&allowed_path).map_err(error_chain)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scan_local_skills,
            load_skill_index,
            refresh_skill_index,
            adopt_skill,
            adopt_skills,
            read_skill_content,
            open_in_finder
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

fn validate_allowed_path(path: &str, project_root: Option<String>) -> Result<PathBuf> {
    let candidate =
        fs::canonicalize(path).with_context(|| format!("Path does not exist: {path}"))?;
    let scan_options = build_scan_options(project_root);
    let mut allowed_roots = scan_local_skills_core(&scan_options)
        .roots
        .into_iter()
        .filter(|root| root.exists)
        .filter_map(|root| fs::canonicalize(root.base_dir).ok())
        .collect::<Vec<_>>();

    if let Ok(indexed) = load_skill_index_core(&scan_options, &IndexOptions::default()) {
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
