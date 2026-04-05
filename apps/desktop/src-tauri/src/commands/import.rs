use std::path::PathBuf;

use reqwest::blocking::Client;
use skill_manager_core::{
    AppError, IndexOptions, IndexedScanSummary, SkillSourceType,
    import_git_skill as import_git_skill_core, import_skill_directory as import_skill_directory_core,
    load_skill_index as load_skill_index_core,
};

use crate::utils::{build_scan_options, error_chain, get_registry_url, load_app_config, parse_agent, parse_scope, run_blocking, save_app_config};
use crate::RegistrySearchResponse;

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn import_local_skill_folder(
    path: String,
    agent: String,
    scope: String,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, AppError> {
    tracing::info!("importing local skill folder from {}", path);
    let agent = parse_agent(&agent).map_err(error_chain)?;
    let scope = parse_scope(&scope).map_err(error_chain)?;
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        import_skill_directory_core(
            PathBuf::from(path.clone()),
            SkillSourceType::Import,
            agent,
            scope,
            path,
            &index_options,
        )
        .map_err(error_chain)?;
        load_skill_index_core(&scan_options, &index_options).map_err(error_chain)
    })
    .await
}

#[tauri::command]
#[tracing::instrument(skip(url))]
pub async fn save_registry_url(url: String) -> Result<(), AppError> {
    tracing::info!("saving registry url: {}", url);
    let trimmed = url.trim();
    if !trimmed.is_empty() {
        // Basic validation
        reqwest::Url::parse(trimmed).map_err(error_chain)?;
    }
    let mut config = load_app_config();
    config.registry_url = Some(trimmed.to_string());
    save_app_config(&config).map_err(error_chain)?;
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
        let url = reqwest::Url::parse_with_params(
            &registry_url,
            &[("q", trimmed), ("limit", "12")],
        )
        .map_err(error_chain)?;
        let response = Client::new()
            .get(url)
            .send()
            .map_err(error_chain)?
            .error_for_status()
            .map_err(error_chain)?;
        let payload = response
            .json::<RegistrySearchResponse>()
            .map_err(error_chain)?;
        Ok(payload)
    })
    .await
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
    let agent = parse_agent(&agent).map_err(error_chain)?;
    let scope = parse_scope(&scope).map_err(error_chain)?;
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
        )
        .map_err(error_chain)?;
        load_skill_index_core(&scan_options, &index_options).map_err(error_chain)
    })
    .await
}
