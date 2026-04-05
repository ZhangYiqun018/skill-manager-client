use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::{Deserialize, Serialize};
use skill_manager_core::{
    AgentKind, AppError, IndexOptions, ScanOptions, SkillScope,
    load_skill_index as load_skill_index_core, scan_local_skills as scan_local_skills_core,
};

const DEFAULT_REGISTRY_URL: &str = "https://skills.sh/api/search";

#[derive(Debug, Default, Serialize, Deserialize)]
pub(crate) struct AppConfig {
    #[serde(default)]
    pub registry_url: Option<String>,
}

fn config_path() -> PathBuf {
    skill_manager_core::default_data_root().join("config.json")
}

pub(crate) fn load_app_config() -> AppConfig {
    let path = config_path();
    if let Ok(contents) = fs::read_to_string(&path) {
        serde_json::from_str(&contents).unwrap_or_default()
    } else {
        AppConfig::default()
    }
}

pub(crate) fn save_app_config(config: &AppConfig) -> Result<(), AppError> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let contents =
        serde_json::to_string_pretty(config).map_err(|e| AppError::validation(e.to_string()))?;
    fs::write(&path, contents)?;
    Ok(())
}

pub(crate) fn get_registry_url() -> String {
    let config = load_app_config();
    config
        .registry_url
        .filter(|u| !u.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_REGISTRY_URL.to_string())
}

pub(crate) fn build_scan_options(project_root: Option<String>) -> ScanOptions {
    ScanOptions {
        project_root: project_root
            .filter(|value| !value.trim().is_empty())
            .map(PathBuf::from),
        ..Default::default()
    }
}

pub(crate) async fn run_blocking<T, F>(task: F) -> Result<T, AppError>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, AppError> + Send + 'static,
{
    match tauri::async_runtime::spawn_blocking(task).await {
        Ok(result) => result,
        Err(join_error) => Err(AppError::unknown(format!(
            "Background task failed: {join_error}"
        ))),
    }
}

pub(crate) fn log_err(context: &str) -> impl Fn(AppError) -> AppError + '_ {
    move |err| {
        tracing::error!(kind = ?err.kind, "{context}: {}", err.message);
        err
    }
}

pub(crate) fn collect_allowed_roots(
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Vec<PathBuf> {
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
                skill
                    .project_root
                    .and_then(|path| fs::canonicalize(path).ok()),
            ]
            .into_iter()
            .flatten()
            .collect::<Vec<_>>()
        }));
    }

    allowed_roots
}

pub(crate) fn validate_allowed_path_with_roots(
    path: &str,
    allowed_roots: &[PathBuf],
) -> Result<PathBuf, AppError> {
    let candidate = fs::canonicalize(path)
        .map_err(|e| AppError::not_found(format!("Path does not exist: {path} ({e})")))?;

    if allowed_roots.iter().any(|root| candidate.starts_with(root)) {
        Ok(candidate)
    } else {
        Err(AppError::validation(
            "Path is outside configured skill roots".to_string(),
        ))
    }
}

pub(crate) fn open_in_file_manager(path: &Path) -> Result<(), AppError> {
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

fn run_command(mut command: Command) -> Result<(), AppError> {
    let status = command
        .status()
        .map_err(|e| AppError::io(format!("Failed to launch file manager: {e}")))?;
    if status.success() {
        Ok(())
    } else {
        Err(AppError::unknown(format!(
            "File manager command exited with status {status}"
        )))
    }
}

pub(crate) fn parse_agent(value: &str) -> Result<AgentKind, AppError> {
    match value {
        "agent" => Ok(AgentKind::Agent),
        "codex" => Ok(AgentKind::Codex),
        "claude_code" => Ok(AgentKind::ClaudeCode),
        "open_claw" => Ok(AgentKind::OpenClaw),
        _ => Err(AppError::validation(format!("Unsupported agent: {value}"))),
    }
}

pub(crate) fn parse_scope(value: &str) -> Result<SkillScope, AppError> {
    match value {
        "global" => Ok(SkillScope::Global),
        "project" => Ok(SkillScope::Project),
        _ => Err(AppError::validation(format!("Unsupported scope: {value}"))),
    }
}

#[allow(dead_code)]
pub(crate) fn chrono_like_now_seed() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}
