use reqwest::blocking::Client;
use skill_manager_core::{
    AppError, IndexOptions, IndexedScanSummary, SkillSourceType,
    import_git_skill as import_git_skill_core,
    import_skill_directory as import_skill_directory_core,
    load_skill_index as load_skill_index_core,
};
use std::io::Read as _;
use std::time::Duration;

use crate::RegistrySearchResponse;
use crate::utils::{
    build_scan_options, collect_allowed_roots, get_registry_url, load_app_config, log_err,
    parse_agent, parse_scope, run_blocking, save_app_config, validate_allowed_path_with_roots,
};

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn import_local_skill_folder(
    path: String,
    agent: String,
    scope: String,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, AppError> {
    tracing::info!("importing local skill folder from {}", path);
    let agent = parse_agent(&agent)?;
    let scope = parse_scope(&scope)?;
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        import_skill_directory_core(
            allowed_path.clone(),
            SkillSourceType::Import,
            agent,
            scope,
            allowed_path.to_string_lossy().to_string(),
            &index_options,
        )?;
        Ok(load_skill_index_core(&scan_options, &index_options)?)
    })
    .await
    .map_err(log_err("import_local_skill_folder"))
}

#[tauri::command]
#[tracing::instrument(skip(url))]
pub async fn save_registry_url(url: String) -> Result<(), AppError> {
    tracing::info!("saving registry url: {}", url);
    let trimmed = url.trim();
    if !trimmed.is_empty() {
        // Basic validation
        reqwest::Url::parse(trimmed).map_err(|e| AppError::validation(e.to_string()))?;
    }
    let mut config = load_app_config();
    config.registry_url = Some(trimmed.to_string());
    save_app_config(&config)?;
    Ok(())
}

#[tauri::command]
#[tracing::instrument(skip(query))]
pub async fn search_skills_registry(query: String) -> Result<RegistrySearchResponse, AppError> {
    run_blocking(move || {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return Ok(RegistrySearchResponse {
                query,
                skills: Vec::new(),
                count: 0,
            });
        }

        let registry_url = get_registry_url();
        let url =
            reqwest::Url::parse_with_params(&registry_url, &[("q", trimmed), ("limit", "12")])
                .map_err(|e| AppError::validation(e.to_string()))?;
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| AppError::network(e.to_string()))?;
        let response = client
            .get(url)
            .send()
            .map_err(|e| AppError::network(e.to_string()))?
            .error_for_status()
            .map_err(|e| AppError::network(e.to_string()))?;
        // Limit response size to 10MB
        const MAX_SIZE: u64 = 10 * 1024 * 1024;
        if let Some(len) = response.content_length() {
            if len > MAX_SIZE {
                return Err(AppError::validation(
                    "Registry response too large".to_string(),
                ));
            }
        }
        let payload = response
            .json::<RegistrySearchResponse>()
            .map_err(|e| AppError::validation(e.to_string()))?;
        Ok(payload)
    })
    .await
    .map_err(log_err("search_skills_registry"))
}

#[tauri::command]
pub async fn fetch_popular_skills() -> Result<RegistrySearchResponse, AppError> {
    run_blocking(move || {
        let registry_url = get_registry_url();
        let url =
            reqwest::Url::parse_with_params(&registry_url, &[("q", "skill"), ("limit", "24")])
                .map_err(|e| AppError::validation(e.to_string()))?;
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| AppError::network(e.to_string()))?;
        let response = client
            .get(url)
            .send()
            .map_err(|e| AppError::network(e.to_string()))?
            .error_for_status()
            .map_err(|e| AppError::network(e.to_string()))?;
        const MAX_SIZE: u64 = 10 * 1024 * 1024;
        if let Some(len) = response.content_length() {
            if len > MAX_SIZE {
                return Err(AppError::validation(
                    "Registry response too large".to_string(),
                ));
            }
        }
        let payload = response
            .json::<RegistrySearchResponse>()
            .map_err(|e| AppError::validation(e.to_string()))?;
        Ok(payload)
    })
    .await
    .map_err(log_err("fetch_popular_skills"))
}

#[tauri::command]
pub async fn fetch_skill_readme(source: String, skill_id: String) -> Result<String, AppError> {
    run_blocking(move || {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| AppError::network(e.to_string()))?;

        // Try multiple path patterns: skills.sh repos use `skills/{id}/SKILL.md`
        let candidates = [
            format!("https://raw.githubusercontent.com/{source}/main/skills/{skill_id}/SKILL.md"),
            format!("https://raw.githubusercontent.com/{source}/master/skills/{skill_id}/SKILL.md"),
            format!("https://raw.githubusercontent.com/{source}/main/{skill_id}/SKILL.md"),
            format!("https://raw.githubusercontent.com/{source}/master/{skill_id}/SKILL.md"),
        ];

        let mut last_err = None;
        for url in &candidates {
            match client.get(url).send() {
                Ok(resp) if resp.status().is_success() => {
                    const MAX_SIZE: u64 = 1024 * 1024;
                    if let Some(len) = resp.content_length() {
                        if len > MAX_SIZE {
                            return Err(AppError::validation("SKILL.md too large".to_string()));
                        }
                    }
                    let mut body = String::new();
                    resp.take(MAX_SIZE)
                        .read_to_string(&mut body)
                        .map_err(|e| AppError::io(e.to_string()))?;
                    return Ok(body);
                }
                Ok(_) => {
                    // Non-success status (404 etc.), try next candidate
                    last_err = Some("SKILL.md not found in repository".to_string());
                }
                Err(e) => {
                    last_err = Some(e.to_string());
                }
            }
        }

        Err(AppError::not_found(
            last_err.unwrap_or_else(|| "SKILL.md not found".to_string()),
        ))
    })
    .await
    .map_err(log_err("fetch_skill_readme"))
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistryStats {
    pub total_skills: u64,
}

#[tauri::command]
pub async fn fetch_registry_stats() -> Result<RegistryStats, AppError> {
    run_blocking(move || {
        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .build()
            .map_err(|e| AppError::network(e.to_string()))?;
        let response = client
            .get("https://skills.sh")
            .send()
            .map_err(|e| AppError::network(e.to_string()))?
            .error_for_status()
            .map_err(|e| AppError::network(e.to_string()))?;
        let body = response.text().map_err(|e| AppError::io(e.to_string()))?;

        // Parse "All Time (91,583)" from the page HTML
        let total = parse_all_time_count(&body).unwrap_or(0);
        Ok(RegistryStats {
            total_skills: total,
        })
    })
    .await
    .map_err(log_err("fetch_registry_stats"))
}

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn adopt_registry_skill(
    source: String,
    skill_id: String,
    _registry_id: String,
    agent: String,
    scope: String,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, AppError> {
    tracing::info!("adopting registry skill {}/{}", source, skill_id);
    let agent = parse_agent(&agent)?;
    let scope = parse_scope(&scope)?;
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
        )?;
        Ok(load_skill_index_core(&scan_options, &index_options)?)
    })
    .await
    .map_err(log_err("adopt_registry_skill"))
}

/// Extract the number from "All Time (91,583)" in skills.sh HTML.
fn parse_all_time_count(html: &str) -> Option<u64> {
    let marker = "All Time (";
    let start = html.find(marker)? + marker.len();
    let rest = &html[start..];
    let end = rest.find(')')?;
    let raw = &rest[..end];
    let cleaned: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    cleaned.parse().ok()
}
