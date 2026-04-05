use skill_manager_core::{
    AdoptionResolution, AppError, IndexOptions, IndexedScanSummary,
    adopt_skill as adopt_skill_core, adopt_skills as adopt_skills_core,
    apply_adoption_resolutions as apply_adoption_resolutions_core,
    load_skill_index as load_skill_index_core,
};

use crate::utils::{
    build_scan_options, collect_allowed_roots, log_err, run_blocking,
    validate_allowed_path_with_roots,
};

#[tauri::command]
#[tracing::instrument(skip(project_root))]
pub async fn adopt_skill(
    path: String,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, AppError> {
    tracing::info!("adopting skill at {}", path);
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let allowed_path = validate_allowed_path_with_roots(&path, &allowed_roots)?;
        adopt_skill_core(allowed_path, &scan_options, &index_options)?;
        Ok(load_skill_index_core(&scan_options, &index_options)?)
    })
    .await
    .map_err(log_err("adopt_skill"))
}

#[tauri::command]
#[tracing::instrument(skip(project_root, paths))]
pub async fn adopt_skills(
    paths: Vec<String>,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, AppError> {
    tracing::info!("adopting {} skills", paths.len());
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);
        let validated_paths = paths
            .into_iter()
            .map(|path| validate_allowed_path_with_roots(&path, &allowed_roots))
            .collect::<Result<Vec<_>, _>>()?;
        adopt_skills_core(validated_paths, &scan_options, &index_options)?;
        Ok(load_skill_index_core(&scan_options, &index_options)?)
    })
    .await
    .map_err(log_err("adopt_skills"))
}

#[tauri::command]
#[tracing::instrument(skip(project_root, resolutions))]
pub async fn apply_adoption_resolutions(
    resolutions: Vec<AdoptionResolution>,
    project_root: Option<String>,
) -> Result<IndexedScanSummary, AppError> {
    tracing::info!("applying {} adoption resolutions", resolutions.len());
    let scan_options = build_scan_options(project_root);
    run_blocking(move || {
        let index_options = IndexOptions::default();
        let allowed_roots = collect_allowed_roots(&scan_options, &index_options);

        let validated = resolutions
            .into_iter()
            .map(|resolution| {
                let source_path = validate_allowed_path_with_roots(
                    &resolution.source_path.to_string_lossy(),
                    &allowed_roots,
                )?;
                let merge_target_path = resolution
                    .merge_target_path
                    .map(|path| {
                        validate_allowed_path_with_roots(&path.to_string_lossy(), &allowed_roots)
                    })
                    .transpose()?;

                Ok(AdoptionResolution {
                    source_path,
                    action: resolution.action,
                    merge_target_path,
                    variant_label: resolution.variant_label,
                })
            })
            .collect::<Result<Vec<_>, AppError>>()?;

        Ok(apply_adoption_resolutions_core(
            validated,
            &scan_options,
            &index_options,
        )?)
    })
    .await
    .map_err(log_err("apply_adoption_resolutions"))
}
