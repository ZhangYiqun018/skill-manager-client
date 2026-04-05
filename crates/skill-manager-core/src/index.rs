use std::collections::BTreeMap;
use std::fs;
use std::io::{ErrorKind, Read};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use dirs::{data_dir, data_local_dir, home_dir};
use rusqlite::{Connection, OptionalExtension, params};
use sha2::{Digest, Sha256};
use thiserror::Error;
use walkdir::{DirEntry, WalkDir};

use crate::models::{
    AdoptionResolution, AdoptionResolutionAction, AgentKind, CustomInstallTarget,
    DiscoveryCandidate, DiscoveryGroup, DiscoveryGroupKind, DiscoveryReport, DiscoveryReviewState,
    DiscoverySummary, IndexOptions, IndexStatus, IndexedScanSummary, InstallHealthState,
    InstallMethod, InstallTargetHealthState, InstallTargetInventory, InstallTargetInventoryItem,
    InstalledSkill, ManagedGitSource, ManagedSkillHistory, ManagedSkillOrigin,
    ManagedSkillRevision, ManagedVariantHistory, RemoteUpdateCheck, ScanOptions, ScanSummary,
    ScanWarning, SkillComparison, SkillDescriptor, SkillDirectoryDiff, SkillFileDiff,
    SkillFileDiffKind, SkillFileKind, SkillFileNode, SkillInstallStatus, SkillMetadata, SkillScope,
    SkillSourceType,
};
use crate::scan::{
    build_installed_skill, build_scan_roots, classify_discovered_skill_path, hash_skill_directory,
    scan_local_skills, sort_summary,
};

const DEFAULT_STALE_AFTER_SECS: u64 = 6 * 60 * 60;
const LAST_REFRESH_KEY: &str = "last_refresh_unix_ms";

#[derive(Debug, Clone)]
struct TargetRootDescriptor {
    agent: AgentKind,
    scope: SkillScope,
    target_root: PathBuf,
    project_root: Option<PathBuf>,
}

#[derive(Debug, Clone)]
struct InstallRecordRow {
    target_root: PathBuf,
    agent: AgentKind,
    scope: SkillScope,
    updated_unix_ms: i64,
}

#[derive(Debug, Clone)]
struct InstallRecordWithSkillRow {
    managed_skill_path: PathBuf,
    target_root: PathBuf,
    agent: AgentKind,
    scope: SkillScope,
    updated_unix_ms: i64,
}

#[derive(Debug, Error)]
pub enum IndexError {
    #[error("failed to read or write the skill index: {0}")]
    Sql(#[from] rusqlite::Error),
    #[error("failed to access the filesystem: {0}")]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Message(String),
}

impl From<IndexError> for crate::models::AppError {
    fn from(error: IndexError) -> Self {
        use std::io::ErrorKind;
        match error {
            IndexError::Sql(e) => Self::unknown(format!("Database error: {e}")),
            IndexError::Io(e) => match e.kind() {
                ErrorKind::NotFound => Self::not_found(e.to_string()),
                ErrorKind::PermissionDenied => Self::permission_denied(e.to_string()),
                ErrorKind::AlreadyExists => Self::already_exists(e.to_string()),
                _ => Self::io(e.to_string()),
            },
            IndexError::Message(msg) => Self::unknown(msg),
        }
    }
}

pub fn default_index_path() -> PathBuf {
    default_data_root().join("index.sqlite3")
}

pub fn default_store_path() -> PathBuf {
    default_data_root().join("store")
}

pub fn adopt_skill(
    skill_path: PathBuf,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<InstalledSkill, IndexError> {
    let mut adopted = adopt_skills(vec![skill_path], scan_options, index_options)?;
    adopted.pop().ok_or_else(|| {
        IndexError::Message("No disk skill was adopted from the requested path.".to_string())
    })
}

pub fn adopt_skills(
    skill_paths: Vec<PathBuf>,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<Vec<InstalledSkill>, IndexError> {
    let snapshot = load_skill_index(scan_options, index_options)?;
    if !snapshot.index.exists {
        return Err(IndexError::Message(
            "No local index exists yet. Run disk discovery first.".to_string(),
        ));
    }

    let mut adopted = Vec::new();
    let mut seen_destinations = BTreeMap::new();

    for skill_path in skill_paths {
        let candidate = snapshot
            .summary
            .skills
            .iter()
            .find(|skill| {
                skill.source_type == SkillSourceType::Disk && path_matches_skill(&skill_path, skill)
            })
            .cloned()
            .ok_or_else(|| {
                IndexError::Message(
                    "Could not find one of the selected disk skills in the current index."
                        .to_string(),
                )
            })?;

        let destination_key = managed_skill_dir(&candidate, &resolve_store_path(index_options))
            .to_string_lossy()
            .into_owned();

        if seen_destinations.insert(destination_key, true).is_none() {
            adopted.push(import_skill_from_candidate(
                &candidate,
                &candidate.path.to_string_lossy(),
                index_options,
            )?);
        } else {
            import_skill_from_candidate(
                &candidate,
                &candidate.path.to_string_lossy(),
                index_options,
            )?;
        }
    }

    Ok(adopted)
}

pub fn import_skill_directory(
    source_dir: PathBuf,
    source_type: SkillSourceType,
    agent: AgentKind,
    scope: SkillScope,
    origin: String,
    index_options: &IndexOptions,
) -> Result<InstalledSkill, IndexError> {
    let source_dir = fs::canonicalize(source_dir)?;
    let skill_md = source_dir.join("SKILL.md");
    if !skill_md.exists() {
        return Err(IndexError::Message(
            "Selected folder does not contain SKILL.md.".to_string(),
        ));
    }

    let mut warnings = Vec::new();
    let inspected = build_installed_skill(
        SkillDescriptor {
            source_type: source_type.clone(),
            agent,
            scope,
            skill_dir: source_dir.clone(),
            skill_md,
            source_root: source_dir
                .parent()
                .map(Path::to_path_buf)
                .unwrap_or_else(|| source_dir.clone()),
            project_root: None,
        },
        &mut warnings,
    );

    if let Some(warning) = warnings.into_iter().next() {
        return Err(IndexError::Message(warning.message));
    }

    import_skill_from_candidate(&inspected, &origin, index_options)
}

pub fn apply_adoption_resolutions(
    resolutions: Vec<AdoptionResolution>,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<IndexedScanSummary, IndexError> {
    let snapshot = load_skill_index(scan_options, index_options)?;
    if !snapshot.index.exists {
        return Err(IndexError::Message(
            "No local index exists yet. Run disk discovery first.".to_string(),
        ));
    }

    for resolution in resolutions {
        let candidate = find_disk_candidate(&snapshot.summary.skills, &resolution.source_path)?;

        match resolution.action {
            AdoptionResolutionAction::Merge => {
                let merge_target_path = resolution.merge_target_path.ok_or_else(|| {
                    IndexError::Message("Merge resolution requires a managed target.".to_string())
                })?;
                let target = find_managed_skill(&snapshot.summary.skills, &merge_target_path)?;

                if candidate.content_hash != target.content_hash {
                    return Err(IndexError::Message(
                        "Only exact duplicate skills can merge into an existing managed variant."
                            .to_string(),
                    ));
                }

                merge_candidate_into_existing(&candidate, &target, index_options)?;
            }
            AdoptionResolutionAction::CreateVariant => {
                let variant_label = resolution
                    .variant_label
                    .as_deref()
                    .and_then(normalize_variant_label);
                import_skill_from_candidate_with_variant(
                    &candidate,
                    &candidate.path.to_string_lossy(),
                    index_options,
                    variant_label.as_deref(),
                    None,
                )?;
            }
        }
    }

    load_skill_index(scan_options, index_options)
}

pub fn compare_skills(
    left_path: PathBuf,
    right_path: PathBuf,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<SkillComparison, IndexError> {
    let snapshot = load_skill_index(scan_options, index_options)?;
    let left = find_any_skill(&snapshot.summary.skills, &left_path)?;
    let right = find_any_skill(&snapshot.summary.skills, &right_path)?;

    let left_content = read_skill_text_file(left.skill_md.clone())?;
    let right_content = read_skill_text_file(right.skill_md.clone())?;
    let left_files = collect_relative_files(&left.path)?;
    let right_files = collect_relative_files(&right.path)?;

    let mut common_files = left_files
        .iter()
        .filter(|path| right_files.contains(*path))
        .cloned()
        .collect::<Vec<_>>();
    let mut left_only_files = left_files
        .iter()
        .filter(|path| !right_files.contains(*path))
        .cloned()
        .collect::<Vec<_>>();
    let mut right_only_files = right_files
        .iter()
        .filter(|path| !left_files.contains(*path))
        .cloned()
        .collect::<Vec<_>>();

    common_files.sort();
    left_only_files.sort();
    right_only_files.sort();

    Ok(SkillComparison {
        left,
        right,
        left_content,
        right_content,
        common_files,
        left_only_files,
        right_only_files,
    })
}

pub fn load_skill_file_tree(skill_path: PathBuf) -> Result<SkillFileNode, IndexError> {
    let root = fs::canonicalize(&skill_path)?;
    build_file_tree(&root, &root)
}

pub fn read_skill_text_file(file_path: PathBuf) -> Result<String, IndexError> {
    fs::read_to_string(file_path).map_err(IndexError::from)
}

pub fn load_managed_skill_origins(
    skill_path: PathBuf,
    index_options: &IndexOptions,
) -> Result<Vec<ManagedSkillOrigin>, IndexError> {
    let index_path = resolve_index_path(index_options);
    if !index_path.exists() {
        return Ok(Vec::new());
    }

    let connection = Connection::open(index_path)?;
    init_schema(&connection)?;
    read_origin_records(&connection, &skill_path)
}

pub fn load_managed_skill_history(
    skill_path: PathBuf,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<ManagedSkillHistory, IndexError> {
    let managed_skill = load_managed_skill_by_path(skill_path, scan_options, index_options)?;
    let snapshot = load_skill_index(scan_options, index_options)?;
    let family_skills = snapshot
        .summary
        .skills
        .into_iter()
        .filter(|skill| {
            skill.source_type != SkillSourceType::Disk
                && skill.family_key == managed_skill.family_key
        })
        .collect::<Vec<_>>();

    let index_path = resolve_index_path(index_options);
    let mut promoted_path = None;
    let mut variants = Vec::new();

    if index_path.exists() {
        let connection = Connection::open(index_path)?;
        init_schema(&connection)?;
        promoted_path = read_family_promotions(&connection)?
            .get(&managed_skill.family_key)
            .cloned()
            .map(PathBuf::from);
        variants = read_managed_revision_records(&connection, &managed_skill.family_key)?;
    }

    if variants.is_empty() {
        let mut grouped = BTreeMap::<String, Vec<ManagedSkillRevision>>::new();
        for skill in &family_skills {
            let variant_label = skill
                .variant_label
                .clone()
                .unwrap_or_else(|| build_suggested_version_label(skill));
            grouped
                .entry(variant_label.clone())
                .or_default()
                .push(ManagedSkillRevision {
                    managed_skill_path: skill.path.clone(),
                    revision_hash: skill.content_hash.clone(),
                    display_name: skill.display_name.clone(),
                    variant_label,
                    created_unix_ms: 0,
                    is_promoted: promoted_path
                        .as_ref()
                        .is_some_and(|path| path_equals(path, &skill.path)),
                });
        }

        variants = grouped
            .into_iter()
            .map(|(variant_label, revisions)| ManagedVariantHistory {
                family_key: managed_skill.family_key.clone(),
                variant_label,
                revisions,
            })
            .collect();
    }

    for variant in &mut variants {
        for revision in &mut variant.revisions {
            revision.is_promoted = promoted_path
                .as_ref()
                .is_some_and(|path| path_equals(path, &revision.managed_skill_path));
        }
    }

    variants.sort_by(|left, right| left.variant_label.cmp(&right.variant_label));
    for variant in &mut variants {
        variant.revisions.sort_by(|left, right| {
            right
                .created_unix_ms
                .cmp(&left.created_unix_ms)
                .then(left.managed_skill_path.cmp(&right.managed_skill_path))
        });
    }

    let promoted_variant_label = promoted_path.as_ref().and_then(|path| {
        family_skills
            .iter()
            .find(|skill| path_equals(path, &skill.path))
            .and_then(|skill| skill.variant_label.clone())
    });

    Ok(ManagedSkillHistory {
        family_key: managed_skill.family_key.clone(),
        display_name: managed_skill.display_name.clone(),
        promoted_managed_skill_path: promoted_path,
        promoted_variant_label,
        variants,
    })
}

pub fn promote_managed_skill_variant(
    skill_path: PathBuf,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<(), IndexError> {
    let managed_skill = load_managed_skill_by_path(skill_path, scan_options, index_options)?;
    let index_path = resolve_index_path(index_options);
    if let Some(parent) = index_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let mut connection = Connection::open(index_path)?;
    init_schema(&connection)?;
    let transaction = connection.transaction()?;
    upsert_family_promotion(
        &transaction,
        &managed_skill.family_key,
        &managed_skill.path,
        now_unix_ms(),
    )?;
    transaction.commit()?;
    Ok(())
}

pub fn load_skill_install_statuses(
    skill_path: PathBuf,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<Vec<SkillInstallStatus>, IndexError> {
    let managed_skill = load_managed_skill_by_path(skill_path, scan_options, index_options)?;
    let targets = derive_target_roots(&managed_skill, scan_options, index_options)?;
    let install_records = load_install_records_for_skill(&managed_skill.path, index_options)?;
    let family_promotions = load_family_promotions(index_options)?;

    Ok(targets
        .into_iter()
        .map(|target| {
            build_install_status(
                &managed_skill,
                &target,
                &install_records,
                &family_promotions,
            )
        })
        .collect())
}

pub fn load_install_target_inventory(
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<Vec<InstallTargetInventory>, IndexError> {
    let snapshot = load_skill_index(scan_options, index_options)?;
    let target_roots = derive_target_catalog(&snapshot.summary, scan_options, index_options)?;
    let managed_skills = snapshot
        .summary
        .skills
        .iter()
        .filter(|skill| skill.source_type != SkillSourceType::Disk)
        .cloned()
        .collect::<Vec<_>>();
    let discovered_counts = snapshot
        .summary
        .skills
        .iter()
        .filter(|skill| skill.source_type == SkillSourceType::Disk)
        .fold(BTreeMap::new(), |mut counts, skill| {
            *counts
                .entry(skill.source_root.to_string_lossy().into_owned())
                .or_insert(0usize) += 1;
            counts
        });
    let install_records = load_all_install_records(index_options)?;
    let family_promotions = load_family_promotions(index_options)?;

    let inventories = target_roots
        .into_iter()
        .map(|target| {
            let items = install_records
                .iter()
                .filter(|record| {
                    record.agent == target.agent
                        && path_equals(&record.target_root, &target.target_root)
                })
                .filter_map(|record| {
                    managed_skills
                        .iter()
                        .find(|skill| path_equals(&record.managed_skill_path, &skill.path))
                        .map(|skill| {
                            let skill_records =
                                install_records_for_path(&install_records, &skill.path);
                            let status = build_install_status(
                                skill,
                                &target,
                                &skill_records,
                                &family_promotions,
                            );
                            InstallTargetInventoryItem {
                                managed_skill_path: skill.path.clone(),
                                managed_skill_md: skill.skill_md.clone(),
                                display_name: skill.display_name.clone(),
                                family_key: skill.family_key.clone(),
                                variant_label: skill.variant_label.clone(),
                                content_hash: skill.content_hash.clone(),
                                slug: skill.slug.clone(),
                                source_type: skill.source_type.clone(),
                                install_path: status.install_path.clone(),
                                install_method: status.install_method.clone(),
                                health_state: status.health_state,
                                recorded: status.recorded,
                                pinned: status.pinned,
                                is_family_default: status.is_family_default,
                                last_action_unix_ms: status.last_action_unix_ms,
                            }
                        })
                })
                .collect::<Vec<_>>();

            let exists = target.target_root.exists();
            let needs_attention_count = items
                .iter()
                .filter(|item| item.health_state != InstallHealthState::Healthy)
                .count();
            let discovered_skill_count = discovered_counts
                .get(&target.target_root.to_string_lossy().into_owned())
                .copied()
                .unwrap_or_default();
            let health_state = if !exists {
                InstallTargetHealthState::Missing
            } else if needs_attention_count > 0 {
                InstallTargetHealthState::Warning
            } else {
                InstallTargetHealthState::Healthy
            };

            InstallTargetInventory {
                id: format!(
                    "{}::{}::{}",
                    target.agent.as_key(),
                    target.scope.as_key(),
                    target.target_root.to_string_lossy()
                ),
                agent: target.agent,
                scope: target.scope,
                path: target.target_root,
                exists,
                project_root: target.project_root,
                health_state,
                discovered_skill_count,
                managed_install_count: items.len(),
                needs_attention_count,
                items,
            }
        })
        .collect::<Vec<_>>();

    Ok(inventories)
}

pub fn sync_install_target(
    target_root: PathBuf,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<Vec<InstallTargetInventory>, IndexError> {
    let target = resolve_catalog_target(&target_root, scan_options, index_options)?;
    let install_records = load_all_install_records(index_options)?;

    for record in install_records.iter().filter(|record| {
        record.agent == target.agent && path_equals(&record.target_root, &target.target_root)
    }) {
        let status = load_skill_install_statuses(
            record.managed_skill_path.clone(),
            scan_options,
            index_options,
        )?
        .into_iter()
        .find(|status| path_equals(&status.target_root, &target.target_root));

        let Some(status) = status else {
            continue;
        };

        if matches!(
            status.health_state,
            InstallHealthState::Healthy
                | InstallHealthState::Conflict
                | InstallHealthState::MissingTarget
        ) {
            continue;
        }

        repair_managed_skill_install(
            record.managed_skill_path.clone(),
            target.target_root.clone(),
            scan_options,
            index_options,
        )?;
    }

    load_install_target_inventory(scan_options, index_options)
}

pub fn repair_install_target(
    target_root: PathBuf,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<Vec<InstallTargetInventory>, IndexError> {
    sync_install_target(target_root, scan_options, index_options)
}

pub fn install_managed_skill(
    skill_path: PathBuf,
    target_root: PathBuf,
    agent_override: Option<AgentKind>,
    method_override: Option<InstallMethod>,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<Vec<SkillInstallStatus>, IndexError> {
    let managed_skill = load_managed_skill_by_path(skill_path, scan_options, index_options)?;
    let target = resolve_target_root(
        &managed_skill,
        &target_root,
        agent_override,
        scan_options,
        index_options,
    )?;
    let prefix = agent_install_prefix(&target.agent, &target.scope);
    let destination = target.target_root.join(&prefix).join(&managed_skill.slug);
    let family_promotions = load_family_promotions(index_options)?;
    let current_status = build_install_status(
        &managed_skill,
        &target,
        &load_install_records_for_skill(&managed_skill.path, index_options)?,
        &family_promotions,
    );

    if matches!(current_status.health_state, InstallHealthState::Conflict) {
        return Err(IndexError::Message(format!(
            "Target already contains a different skill at {}.",
            destination.to_string_lossy()
        )));
    }

    let method = method_override.unwrap_or(InstallMethod::Symlink);

    if destination_symlink_points_to(&destination, &managed_skill.path) {
        record_install(&managed_skill.path, &target, method, index_options)?;
        return load_skill_install_statuses(managed_skill.path, scan_options, index_options);
    }

    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)?;
    }
    remove_existing_path(&destination)?;

    match method {
        InstallMethod::Symlink => create_directory_symlink(&managed_skill.path, &destination)?,
        InstallMethod::Copy => copy_dir_recursive(&managed_skill.path, &destination)?,
    }

    record_install(&managed_skill.path, &target, method, index_options)?;

    load_skill_install_statuses(managed_skill.path, scan_options, index_options)
}

pub fn remove_managed_skill_install(
    skill_path: PathBuf,
    target_root: PathBuf,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<Vec<SkillInstallStatus>, IndexError> {
    let managed_skill = load_managed_skill_by_path(skill_path, scan_options, index_options)?;
    let target = resolve_target_root(
        &managed_skill,
        &target_root,
        None,
        scan_options,
        index_options,
    )?;
    let prefix = agent_install_prefix(&target.agent, &target.scope);
    let destination = target.target_root.join(&prefix).join(&managed_skill.slug);
    let family_promotions = load_family_promotions(index_options)?;
    let current_status = build_install_status(
        &managed_skill,
        &target,
        &load_install_records_for_skill(&managed_skill.path, index_options)?,
        &family_promotions,
    );

    match current_status.health_state {
        InstallHealthState::Healthy | InstallHealthState::Copied | InstallHealthState::Broken => {
            remove_existing_path(&destination)?;
            delete_install_record(&managed_skill.path, &target.target_root, index_options)?;
        }
        InstallHealthState::NotInstalled | InstallHealthState::MissingTarget => {
            delete_install_record(&managed_skill.path, &target.target_root, index_options)?;
        }
        InstallHealthState::Conflict => {
            return Err(IndexError::Message(format!(
                "Refusing to remove unrelated content at {}.",
                destination.to_string_lossy()
            )));
        }
    }

    load_skill_install_statuses(managed_skill.path, scan_options, index_options)
}

pub fn repair_managed_skill_install(
    skill_path: PathBuf,
    target_root: PathBuf,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<Vec<SkillInstallStatus>, IndexError> {
    let managed_skill = load_managed_skill_by_path(skill_path, scan_options, index_options)?;
    let target = resolve_target_root(
        &managed_skill,
        &target_root,
        None,
        scan_options,
        index_options,
    )?;
    let prefix = agent_install_prefix(&target.agent, &target.scope);
    let destination = target.target_root.join(&prefix).join(&managed_skill.slug);
    let family_promotions = load_family_promotions(index_options)?;
    let current_status = build_install_status(
        &managed_skill,
        &target,
        &load_install_records_for_skill(&managed_skill.path, index_options)?,
        &family_promotions,
    );

    if matches!(current_status.health_state, InstallHealthState::Conflict) {
        return Err(IndexError::Message(format!(
            "Target contains a different skill at {}. Remove it manually before relinking.",
            destination.to_string_lossy()
        )));
    }

    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)?;
    }
    remove_existing_path(&destination)?;
    create_directory_symlink(&managed_skill.path, &destination)?;
    record_install(
        &managed_skill.path,
        &target,
        InstallMethod::Symlink,
        index_options,
    )?;

    load_skill_install_statuses(managed_skill.path, scan_options, index_options)
}

pub fn default_data_root() -> PathBuf {
    let base_dir = data_local_dir()
        .or_else(data_dir)
        .or_else(home_dir)
        .unwrap_or_else(|| PathBuf::from("."));

    base_dir.join("skill-manager")
}

pub fn load_skill_index(
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<IndexedScanSummary, IndexError> {
    let index_path = resolve_index_path(index_options);
    let roots = build_scan_roots(scan_options)
        .iter()
        .map(crate::models::ScanRoot::from)
        .collect();

    if !index_path.exists() {
        return Ok(IndexedScanSummary {
            summary: ScanSummary {
                roots,
                ..Default::default()
            },
            index: IndexStatus {
                index_path,
                exists: false,
                stale: true,
                last_refresh_unix_ms: None,
            },
        });
    }

    let connection = Connection::open(&index_path)?;
    init_schema(&connection)?;
    let last_refresh_unix_ms = read_last_refresh_unix_ms(&connection)?;
    let mut summary = read_summary_from_db(&connection, scan_options)?;
    hydrate_summary_variant_labels(&mut summary, &connection)?;
    sort_summary(&mut summary);

    Ok(IndexedScanSummary {
        summary,
        index: IndexStatus {
            index_path,
            exists: true,
            stale: is_stale(last_refresh_unix_ms, index_options),
            last_refresh_unix_ms,
        },
    })
}

pub fn load_discovery_report(
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<DiscoveryReport, IndexError> {
    let snapshot = load_skill_index(scan_options, index_options)?;
    let disk_skills = snapshot
        .summary
        .skills
        .iter()
        .filter(|skill| skill.source_type == SkillSourceType::Disk)
        .cloned()
        .collect::<Vec<_>>();
    let managed_skills = snapshot
        .summary
        .skills
        .into_iter()
        .filter(|skill| skill.source_type != SkillSourceType::Disk)
        .collect::<Vec<_>>();
    Ok(build_discovery_report(disk_skills, managed_skills))
}

pub fn refresh_skill_index(
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<IndexedScanSummary, IndexError> {
    let index_path = resolve_index_path(index_options);
    if let Some(parent) = index_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let mut summary = scan_local_skills(scan_options);
    let mut discovered_skills = discover_full_disk_skills(scan_options, index_options);
    let mut managed_skills = scan_managed_store(index_options);

    let mut merged_skills = BTreeMap::new();
    for skill in summary.skills.drain(..) {
        merged_skills.insert(skill.path.clone(), skill);
    }
    for skill in discovered_skills.skills.drain(..) {
        merged_skills.entry(skill.path.clone()).or_insert(skill);
    }
    for skill in managed_skills.skills.drain(..) {
        merged_skills.entry(skill.path.clone()).or_insert(skill);
    }

    summary.skills = merged_skills.into_values().collect();
    summary.warnings.extend(discovered_skills.warnings);
    summary.warnings.extend(managed_skills.warnings);
    sort_summary(&mut summary);

    let mut connection = Connection::open(&index_path)?;
    init_schema(&connection)?;

    let last_refresh_unix_ms = now_unix_ms();
    write_summary_to_db(&mut connection, &summary, last_refresh_unix_ms)?;
    hydrate_summary_variant_labels(&mut summary, &connection)?;

    Ok(IndexedScanSummary {
        summary,
        index: IndexStatus {
            index_path,
            exists: true,
            stale: false,
            last_refresh_unix_ms: Some(last_refresh_unix_ms),
        },
    })
}

pub fn update_managed_skill_variant_label(
    skill_path: PathBuf,
    variant_label: String,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<(), IndexError> {
    let managed_skill = load_managed_skill_by_path(skill_path, scan_options, index_options)?;
    let normalized = normalize_variant_label(&variant_label)
        .unwrap_or_else(|| build_suggested_version_label(&managed_skill));
    let index_path = resolve_index_path(index_options);
    if let Some(parent) = index_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let mut connection = Connection::open(index_path)?;
    init_schema(&connection)?;
    let transaction = connection.transaction()?;
    let now = now_unix_ms();
    upsert_variant_record(&transaction, &managed_skill.path, &normalized, now)?;
    rename_revision_variant_records(
        &transaction,
        &managed_skill.path,
        &managed_skill.family_key,
        &normalized,
        now,
    )?;
    transaction.commit()?;
    Ok(())
}

pub fn set_skill_tags(
    skill_md: &str,
    tags: &[String],
    index_options: &IndexOptions,
) -> Result<(), IndexError> {
    let index_path = resolve_index_path(index_options);
    if let Some(parent) = index_path.parent() {
        fs::create_dir_all(parent)?;
    }
    let connection = Connection::open(index_path)?;
    init_schema(&connection)?;
    let tags_json = serde_json::to_string(tags)
        .map_err(|error| IndexError::Message(format!("Failed to serialize tags: {error}")))?;
    connection.execute(
        "
        INSERT INTO skill_tags (skill_md, tags) VALUES (?1, ?2)
        ON CONFLICT(skill_md) DO UPDATE SET tags = excluded.tags
        ",
        params![skill_md, tags_json],
    )?;
    Ok(())
}

pub fn export_skills_by_tags(
    destination: &Path,
    tags: &[String],
    index_options: &IndexOptions,
) -> Result<u32, IndexError> {
    if tags.is_empty() {
        return Ok(0);
    }
    let index_path = resolve_index_path(index_options);
    if !index_path.exists() {
        return Ok(0);
    }
    let connection = Connection::open(index_path)?;
    init_schema(&connection)?;
    let mut skills = read_skills_from_db(&connection)?;
    let tag_set: std::collections::HashSet<&str> = tags.iter().map(|t| t.as_str()).collect();
    skills.retain(|skill| skill.tags.iter().any(|t| tag_set.contains(t.as_str())));

    fs::create_dir_all(destination)?;
    let mut exported = 0_u32;
    for skill in skills {
        let target_dir = destination.join(&skill.family_key).join(&skill.slug);
        if target_dir.exists() {
            fs::remove_dir_all(&target_dir)?;
        }
        copy_dir_recursive(&skill.path, &target_dir)?;
        exported += 1;
    }
    Ok(exported)
}

fn resolve_index_path(index_options: &IndexOptions) -> PathBuf {
    index_options
        .index_path
        .clone()
        .unwrap_or_else(default_index_path)
}

fn resolve_store_path(index_options: &IndexOptions) -> PathBuf {
    index_options
        .store_path
        .clone()
        .unwrap_or_else(default_store_path)
}

fn scan_managed_store(index_options: &IndexOptions) -> ScanSummary {
    let mut summary = ScanSummary::default();
    let store_root = resolve_store_path(index_options);
    if !store_root.exists() {
        return summary;
    }

    let walker = walkdir::WalkDir::new(&store_root)
        .follow_links(false)
        .max_depth(5)
        .into_iter();

    for entry in walker {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                summary.warnings.push(ScanWarning {
                    path: error.path().map(PathBuf::from),
                    message: error.to_string(),
                });
                continue;
            }
        };

        if !entry.file_type().is_file() || entry.file_name() != "SKILL.md" {
            continue;
        }

        let Ok(relative_path) = entry.path().strip_prefix(&store_root) else {
            continue;
        };

        let mut components = relative_path.components();
        let agent = components
            .next()
            .and_then(|value| AgentKind::from_key(&value.as_os_str().to_string_lossy()));
        let scope = components
            .next()
            .and_then(|value| SkillScope::from_key(&value.as_os_str().to_string_lossy()));

        let (Some(agent), Some(scope)) = (agent, scope) else {
            summary.warnings.push(ScanWarning {
                path: Some(entry.path().to_path_buf()),
                message: "Managed store entry is not in a supported agent/scope directory."
                    .to_string(),
            });
            continue;
        };

        let Some(skill_dir) = entry.path().parent() else {
            continue;
        };

        summary.skills.push(build_installed_skill(
            SkillDescriptor {
                source_type: SkillSourceType::Import,
                agent,
                scope,
                skill_dir: skill_dir.to_path_buf(),
                skill_md: entry.path().to_path_buf(),
                source_root: store_root.clone(),
                project_root: None,
            },
            &mut summary.warnings,
        ));
    }

    summary
}

fn discover_full_disk_skills(
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> ScanSummary {
    if !index_options.discover_full_disk {
        return ScanSummary::default();
    }

    let mut summary = discover_hidden_project_skills(scan_options, index_options);

    #[cfg(target_os = "macos")]
    {
        merge_discovery_summary(&mut summary, discover_spotlight_skills(scan_options));
    }

    summary
}

#[cfg(target_os = "macos")]
fn discover_spotlight_skills(scan_options: &ScanOptions) -> ScanSummary {
    let mut summary = ScanSummary::default();
    let output = match Command::new("mdfind")
        .arg("kMDItemFSName == 'SKILL.md'")
        .output()
    {
        Ok(output) => output,
        Err(error) => {
            summary.warnings.push(ScanWarning {
                path: None,
                message: format!("Spotlight discovery failed: {error}"),
            });
            return summary;
        }
    };

    if !output.status.success() {
        summary.warnings.push(ScanWarning {
            path: None,
            message: format!("Spotlight discovery exited with status {}", output.status),
        });
        return summary;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut seen_paths = BTreeMap::new();

    for line in stdout.lines() {
        let candidate = line.trim();
        if candidate.is_empty() {
            continue;
        }

        let path = PathBuf::from(candidate);
        if !path.exists() {
            continue;
        }

        let Some(descriptor) = classify_discovered_skill_path(&path, scan_options) else {
            continue;
        };

        seen_paths.entry(path).or_insert(descriptor);
    }

    for descriptor in seen_paths.into_values() {
        summary
            .skills
            .push(build_installed_skill(descriptor, &mut summary.warnings));
    }

    summary
}

fn discover_hidden_project_skills(
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> ScanSummary {
    let mut summary = ScanSummary::default();
    let mut seen_paths = BTreeMap::new();
    let store_root = resolve_store_path(index_options);

    for root in hidden_discovery_roots(scan_options) {
        if !root.exists() {
            continue;
        }

        for entry in WalkDir::new(&root)
            .follow_links(false)
            .max_depth(10)
            .into_iter()
            .filter_entry(|entry| should_visit_hidden_entry(entry, &store_root))
        {
            let entry = match entry {
                Ok(entry) => entry,
                Err(error) => {
                    if should_report_walk_error(&error) {
                        summary.warnings.push(ScanWarning {
                            path: error.path().map(PathBuf::from),
                            message: error.to_string(),
                        });
                    }
                    continue;
                }
            };

            if !entry.file_type().is_file() || entry.file_name() != "SKILL.md" {
                continue;
            }

            let Some(descriptor) = classify_discovered_skill_path(entry.path(), scan_options)
            else {
                continue;
            };

            if descriptor.scope != SkillScope::Project {
                continue;
            }

            seen_paths
                .entry(entry.path().to_path_buf())
                .or_insert(descriptor);
        }
    }

    for descriptor in seen_paths.into_values() {
        summary
            .skills
            .push(build_installed_skill(descriptor, &mut summary.warnings));
    }

    summary
}

fn merge_discovery_summary(target: &mut ScanSummary, mut source: ScanSummary) {
    let mut merged = BTreeMap::new();
    for skill in target.skills.drain(..) {
        merged.insert(skill.path.clone(), skill);
    }
    for skill in source.skills.drain(..) {
        merged.entry(skill.path.clone()).or_insert(skill);
    }
    target.skills = merged.into_values().collect();
    target.warnings.extend(source.warnings);
}

fn hidden_discovery_roots(scan_options: &ScanOptions) -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Some(home) = scan_options.home_dir.clone().or_else(home_dir) {
        roots.push(home);
    }

    #[cfg(target_os = "macos")]
    {
        let volumes = PathBuf::from("/Volumes");
        if volumes.exists() {
            roots.push(volumes);
        }
    }

    roots
}

fn should_visit_hidden_entry(entry: &DirEntry, store_root: &PathBuf) -> bool {
    let path = entry.path();
    if path.starts_with(store_root) {
        return false;
    }

    if !entry.file_type().is_dir() {
        return true;
    }

    let name = entry.file_name().to_string_lossy();
    if name == ".git"
        || name == "node_modules"
        || name == "target"
        || name == "dist"
        || name == "build"
        || name == ".next"
        || name == ".nuxt"
        || name == ".pnpm-store"
        || name == ".yarn"
        || name == "coverage"
        || name == "Pods"
        || name == "DerivedData"
        || name == ".Trash"
        || name == "Library"
    {
        return false;
    }

    true
}

fn should_report_walk_error(error: &walkdir::Error) -> bool {
    error
        .io_error()
        .map(|io_error| io_error.kind() != ErrorKind::PermissionDenied)
        .unwrap_or(true)
}

fn init_schema(connection: &Connection) -> Result<(), rusqlite::Error> {
    connection.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS skills (
          skill_md TEXT PRIMARY KEY,
          path TEXT NOT NULL,
          source_root TEXT NOT NULL,
          project_root TEXT,
          source_type TEXT NOT NULL DEFAULT 'disk',
          family_key TEXT NOT NULL DEFAULT '',
          content_hash TEXT NOT NULL DEFAULT '',
          agent TEXT NOT NULL,
          scope TEXT NOT NULL,
          slug TEXT NOT NULL,
          display_name TEXT NOT NULL,
          description TEXT,
          metadata_name TEXT,
          metadata_description TEXT,
          metadata_user_invocable INTEGER
        );

        CREATE TABLE IF NOT EXISTS warnings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT,
          message TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS managed_origins (
          managed_skill_path TEXT NOT NULL,
          origin TEXT NOT NULL,
          source_type TEXT NOT NULL,
          recorded_unix_ms INTEGER NOT NULL,
          PRIMARY KEY (managed_skill_path, origin)
        );

        CREATE TABLE IF NOT EXISTS managed_git_sources (
          managed_skill_path TEXT PRIMARY KEY,
          git_url TEXT NOT NULL,
          git_commit TEXT NOT NULL,
          git_branch TEXT,
          repo_subpath TEXT,
          recorded_unix_ms INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS managed_variants (
          managed_skill_path TEXT PRIMARY KEY,
          variant_label TEXT NOT NULL,
          updated_unix_ms INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS managed_revisions (
          family_key TEXT NOT NULL,
          variant_label TEXT NOT NULL,
          managed_skill_path TEXT NOT NULL,
          revision_hash TEXT NOT NULL,
          display_name TEXT NOT NULL,
          created_unix_ms INTEGER NOT NULL,
          PRIMARY KEY (family_key, variant_label, managed_skill_path)
        );

        CREATE TABLE IF NOT EXISTS family_promotions (
          family_key TEXT PRIMARY KEY,
          managed_skill_path TEXT NOT NULL,
          updated_unix_ms INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS install_records (
          managed_skill_path TEXT NOT NULL,
          target_root TEXT NOT NULL,
          agent TEXT NOT NULL,
          scope TEXT NOT NULL,
          method TEXT NOT NULL,
          updated_unix_ms INTEGER NOT NULL,
          PRIMARY KEY (managed_skill_path, target_root)
        );

        CREATE TABLE IF NOT EXISTS custom_targets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT NOT NULL UNIQUE,
          agent TEXT NOT NULL,
          scope TEXT NOT NULL,
          label TEXT,
          created_unix_ms INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS skill_tags (
          skill_md TEXT PRIMARY KEY,
          tags TEXT NOT NULL DEFAULT '[]'
        );
        ",
    )?;

    ensure_column_exists(
        connection,
        "skills",
        "source_type",
        "ALTER TABLE skills ADD COLUMN source_type TEXT NOT NULL DEFAULT 'disk'",
    )?;
    ensure_column_exists(
        connection,
        "skills",
        "family_key",
        "ALTER TABLE skills ADD COLUMN family_key TEXT NOT NULL DEFAULT ''",
    )?;
    ensure_column_exists(
        connection,
        "skills",
        "content_hash",
        "ALTER TABLE skills ADD COLUMN content_hash TEXT NOT NULL DEFAULT ''",
    )
}

fn ensure_column_exists(
    connection: &Connection,
    table_name: &str,
    column_name: &str,
    alter_sql: &str,
) -> Result<(), rusqlite::Error> {
    let pragma = format!("PRAGMA table_info({table_name})");
    let mut statement = connection.prepare(&pragma)?;
    let rows = statement.query_map([], |row| row.get::<_, String>(1))?;
    let mut has_column = false;
    for row in rows {
        if row? == column_name {
            has_column = true;
            break;
        }
    }

    if has_column {
        Ok(())
    } else {
        connection.execute_batch(alter_sql)
    }
}

fn read_summary_from_db(
    connection: &Connection,
    scan_options: &ScanOptions,
) -> Result<ScanSummary, rusqlite::Error> {
    let roots = build_scan_roots(scan_options)
        .iter()
        .map(crate::models::ScanRoot::from)
        .collect();
    let skills = read_skills_from_db(connection)?;
    let warnings = read_warnings_from_db(connection)?;

    Ok(ScanSummary {
        roots,
        skills,
        warnings,
    })
}

fn load_skill_tags_map(
    connection: &Connection,
) -> Result<BTreeMap<String, Vec<String>>, rusqlite::Error> {
    let mut statement = connection.prepare("SELECT skill_md, tags FROM skill_tags")?;
    let rows = statement.query_map([], |row| {
        let skill_md: String = row.get(0)?;
        let tags_json: String = row.get(1)?;
        let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
        Ok((skill_md, tags))
    })?;

    let mut map = BTreeMap::new();
    for row in rows {
        let (skill_md, tags) = row?;
        map.insert(skill_md, tags);
    }
    Ok(map)
}

fn read_skills_from_db(connection: &Connection) -> Result<Vec<InstalledSkill>, rusqlite::Error> {
    let tags_map = load_skill_tags_map(connection)?;
    let mut statement = connection.prepare(
        "
        SELECT
          skill_md,
          path,
          source_root,
          project_root,
          source_type,
          family_key,
          content_hash,
          agent,
          scope,
          slug,
          display_name,
          description,
          metadata_name,
          metadata_description,
          metadata_user_invocable
        FROM skills
        ORDER BY agent, scope, project_root, display_name, path
        ",
    )?;

    let rows = statement.query_map([], |row| {
        let source_type: String = row.get(4)?;
        let family_key: String = row.get(5)?;
        let content_hash: String = row.get(6)?;
        let agent: String = row.get(7)?;
        let scope: String = row.get(8)?;

        Ok(InstalledSkill {
            skill_md: PathBuf::from(row.get::<_, String>(0)?),
            path: PathBuf::from(row.get::<_, String>(1)?),
            source_root: PathBuf::from(row.get::<_, String>(2)?),
            project_root: row.get::<_, Option<String>>(3)?.map(PathBuf::from),
            source_type: SkillSourceType::from_key(&source_type).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    4,
                    rusqlite::types::Type::Text,
                    format!("unknown skill source type: {source_type}").into(),
                )
            })?,
            family_key,
            variant_label: None,
            content_hash,
            agent: AgentKind::from_key(&agent).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    7,
                    rusqlite::types::Type::Text,
                    format!("unknown agent kind: {agent}").into(),
                )
            })?,
            scope: SkillScope::from_key(&scope).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    8,
                    rusqlite::types::Type::Text,
                    format!("unknown skill scope: {scope}").into(),
                )
            })?,
            slug: row.get(9)?,
            display_name: row.get(10)?,
            description: row.get(11)?,
            metadata: SkillMetadata {
                name: row.get(12)?,
                description: row.get(13)?,
                user_invocable: row.get::<_, Option<i64>>(14)?.map(|value| value != 0),
            },
            tags: Vec::new(),
        })
    })?;

    let mut skills = Vec::new();
    for row in rows {
        let mut skill = row?;
        if let Some(tags) = tags_map.get(&skill.skill_md.to_string_lossy().to_string()) {
            skill.tags = tags.clone();
        }
        skills.push(skill);
    }
    Ok(skills)
}

fn read_warnings_from_db(connection: &Connection) -> Result<Vec<ScanWarning>, rusqlite::Error> {
    let mut statement = connection.prepare("SELECT path, message FROM warnings ORDER BY id ASC")?;
    let rows = statement.query_map([], |row| {
        Ok(ScanWarning {
            path: row.get::<_, Option<String>>(0)?.map(PathBuf::from),
            message: row.get(1)?,
        })
    })?;

    rows.collect()
}

fn write_summary_to_db(
    connection: &mut Connection,
    summary: &ScanSummary,
    last_refresh_unix_ms: i64,
) -> Result<(), rusqlite::Error> {
    let transaction = connection.transaction()?;

    transaction.execute("DELETE FROM skills", [])?;
    transaction.execute("DELETE FROM warnings", [])?;

    for skill in &summary.skills {
        transaction.execute(
            "
            INSERT INTO skills (
              skill_md,
              path,
              source_root,
              project_root,
              source_type,
              family_key,
              content_hash,
              agent,
              scope,
              slug,
              display_name,
              description,
              metadata_name,
              metadata_description,
              metadata_user_invocable
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
            ",
            params![
                skill.skill_md.to_string_lossy().into_owned(),
                skill.path.to_string_lossy().into_owned(),
                skill.source_root.to_string_lossy().into_owned(),
                skill
                    .project_root
                    .as_ref()
                    .map(|path| path.to_string_lossy().into_owned()),
                skill.source_type.as_key(),
                skill.family_key.clone(),
                skill.content_hash.clone(),
                skill.agent.as_key(),
                skill.scope.as_key(),
                skill.slug.clone(),
                skill.display_name.clone(),
                skill.description.clone(),
                skill.metadata.name.clone(),
                skill.metadata.description.clone(),
                skill
                    .metadata
                    .user_invocable
                    .map(|value| if value { 1_i64 } else { 0_i64 })
            ],
        )?;
    }

    for warning in &summary.warnings {
        transaction.execute(
            "INSERT INTO warnings (path, message) VALUES (?1, ?2)",
            params![
                warning
                    .path
                    .as_ref()
                    .map(|path| path.to_string_lossy().into_owned()),
                warning.message.clone()
            ],
        )?;
    }

    transaction.execute(
        "
        INSERT INTO metadata (key, value) VALUES (?1, ?2)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        ",
        params![LAST_REFRESH_KEY, last_refresh_unix_ms.to_string()],
    )?;

    transaction.commit()
}

fn upsert_skill_record(
    transaction: &rusqlite::Transaction<'_>,
    skill: &InstalledSkill,
) -> Result<(), rusqlite::Error> {
    transaction.execute(
        "
        INSERT INTO skills (
          skill_md,
          path,
          source_root,
          project_root,
          source_type,
          family_key,
          content_hash,
          agent,
          scope,
          slug,
          display_name,
          description,
          metadata_name,
          metadata_description,
          metadata_user_invocable
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
        ON CONFLICT(skill_md) DO UPDATE SET
          path = excluded.path,
          source_root = excluded.source_root,
          project_root = excluded.project_root,
          source_type = excluded.source_type,
          family_key = excluded.family_key,
          content_hash = excluded.content_hash,
          agent = excluded.agent,
          scope = excluded.scope,
          slug = excluded.slug,
          display_name = excluded.display_name,
          description = excluded.description,
          metadata_name = excluded.metadata_name,
          metadata_description = excluded.metadata_description,
          metadata_user_invocable = excluded.metadata_user_invocable
        ",
        params![
            skill.skill_md.to_string_lossy().into_owned(),
            skill.path.to_string_lossy().into_owned(),
            skill.source_root.to_string_lossy().into_owned(),
            skill
                .project_root
                .as_ref()
                .map(|path| path.to_string_lossy().into_owned()),
            skill.source_type.as_key(),
            skill.family_key.clone(),
            skill.content_hash.clone(),
            skill.agent.as_key(),
            skill.scope.as_key(),
            skill.slug.clone(),
            skill.display_name.clone(),
            skill.description.clone(),
            skill.metadata.name.clone(),
            skill.metadata.description.clone(),
            skill
                .metadata
                .user_invocable
                .map(|value| if value { 1_i64 } else { 0_i64 }),
        ],
    )?;

    Ok(())
}

fn build_file_tree(root: &Path, current: &Path) -> Result<SkillFileNode, IndexError> {
    let metadata = fs::symlink_metadata(current)?;
    let kind = if metadata.file_type().is_dir() {
        SkillFileKind::Directory
    } else if metadata.file_type().is_symlink() {
        SkillFileKind::Symlink
    } else {
        SkillFileKind::File
    };

    let mut children = Vec::new();
    if matches!(kind, SkillFileKind::Directory) {
        let mut entries = fs::read_dir(current)?.collect::<Result<Vec<_>, _>>()?;
        entries.sort_by_key(|entry| entry.path());
        for entry in entries {
            children.push(build_file_tree(root, &entry.path())?);
        }
    }

    Ok(SkillFileNode {
        name: current
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_else(|| current.to_string_lossy().into_owned()),
        path: current.to_path_buf(),
        relative_path: current.strip_prefix(root).unwrap_or(current).to_path_buf(),
        kind,
        children,
    })
}

fn load_managed_skill_by_path(
    skill_path: PathBuf,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<InstalledSkill, IndexError> {
    let snapshot = load_skill_index(scan_options, index_options)?;
    snapshot
        .summary
        .skills
        .into_iter()
        .find(|skill| {
            skill.source_type != SkillSourceType::Disk && path_matches_skill(&skill_path, skill)
        })
        .ok_or_else(|| {
            IndexError::Message(
                "Could not find the requested managed skill in the local index.".to_string(),
            )
        })
}

fn derive_target_roots(
    managed_skill: &InstalledSkill,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<Vec<TargetRootDescriptor>, IndexError> {
    let mut targets = BTreeMap::new();

    for root in build_scan_roots(scan_options) {
        if root.agent != managed_skill.agent {
            continue;
        }

        let project_root = if root.scope == SkillScope::Project {
            root.base_dir
                .parent()
                .and_then(Path::parent)
                .map(Path::to_path_buf)
        } else {
            None
        };

        targets.insert(
            root.base_dir.to_string_lossy().into_owned(),
            TargetRootDescriptor {
                agent: root.agent,
                scope: root.scope,
                target_root: root.base_dir,
                project_root,
            },
        );
    }

    for record in load_install_records_for_skill(&managed_skill.path, index_options)? {
        if record.agent != managed_skill.agent {
            continue;
        }

        targets
            .entry(record.target_root.to_string_lossy().into_owned())
            .or_insert(TargetRootDescriptor {
                agent: record.agent,
                scope: record.scope.clone(),
                target_root: record.target_root.clone(),
                project_root: if record.scope == SkillScope::Project {
                    record
                        .target_root
                        .parent()
                        .and_then(Path::parent)
                        .map(Path::to_path_buf)
                } else {
                    None
                },
            });
    }

    merge_custom_targets_into_derived(&mut targets, index_options)?;

    Ok(targets.into_values().collect())
}

fn derive_target_catalog(
    summary: &ScanSummary,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<Vec<TargetRootDescriptor>, IndexError> {
    let store_root = resolve_store_path(index_options);
    let mut targets = BTreeMap::new();

    for root in build_scan_roots(scan_options) {
        let project_root = if root.scope == SkillScope::Project {
            root.base_dir
                .parent()
                .and_then(Path::parent)
                .map(Path::to_path_buf)
        } else {
            None
        };

        targets.insert(
            root.base_dir.to_string_lossy().into_owned(),
            TargetRootDescriptor {
                agent: root.agent,
                scope: root.scope,
                target_root: root.base_dir,
                project_root,
            },
        );
    }

    for skill in summary
        .skills
        .iter()
        .filter(|skill| skill.source_type == SkillSourceType::Disk)
    {
        if skill.source_root.starts_with(&store_root) {
            continue;
        }

        targets
            .entry(skill.source_root.to_string_lossy().into_owned())
            .or_insert(TargetRootDescriptor {
                agent: skill.agent.clone(),
                scope: skill.scope.clone(),
                target_root: skill.source_root.clone(),
                project_root: skill.project_root.clone(),
            });
    }

    for record in load_all_install_records(index_options)? {
        let project_root = if record.scope == SkillScope::Project {
            record
                .target_root
                .parent()
                .and_then(Path::parent)
                .map(Path::to_path_buf)
        } else {
            None
        };
        targets
            .entry(record.target_root.to_string_lossy().into_owned())
            .or_insert(TargetRootDescriptor {
                agent: record.agent,
                scope: record.scope,
                target_root: record.target_root,
                project_root,
            });
    }

    merge_custom_targets_into_derived(&mut targets, index_options)?;

    Ok(targets.into_values().collect())
}

fn resolve_catalog_target(
    target_root: &Path,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<TargetRootDescriptor, IndexError> {
    let snapshot = load_skill_index(scan_options, index_options)?;
    if let Some(derived) = derive_target_catalog(&snapshot.summary, scan_options, index_options)?
        .into_iter()
        .find(|target| {
            path_equals(&target.target_root, &target_root.to_path_buf())
                || target.target_root == target_root
        })
    {
        return Ok(derived);
    }

    for custom in load_custom_targets(index_options)? {
        if path_equals(&custom.path, &target_root.to_path_buf()) || custom.path == target_root {
            let project_root = if custom.scope == SkillScope::Project {
                custom
                    .path
                    .parent()
                    .and_then(Path::parent)
                    .map(Path::to_path_buf)
            } else {
                None
            };
            return Ok(TargetRootDescriptor {
                agent: custom.agent,
                scope: custom.scope,
                target_root: custom.path,
                project_root,
            });
        }
    }

    Err(IndexError::Message(
        "Target root is outside the known install targets.".to_string(),
    ))
}

pub fn agent_install_prefix(agent: &AgentKind, scope: &SkillScope) -> PathBuf {
    match (agent, scope) {
        (AgentKind::Codex, SkillScope::Project) => PathBuf::from(".agents/skills"),
        (AgentKind::Codex, SkillScope::Global) => PathBuf::from(".codex/skills"),
        (AgentKind::ClaudeCode, _) => PathBuf::from(".claude/skills"),
        (AgentKind::Agent, _) => PathBuf::from(".agent/skills"),
        (AgentKind::OpenClaw, SkillScope::Project) => PathBuf::from(".openclaw/workspace/skills"),
        (AgentKind::OpenClaw, SkillScope::Global) => PathBuf::from(".openclaw/skills"),
    }
}

fn resolve_target_root(
    managed_skill: &InstalledSkill,
    target_root: &Path,
    agent_override: Option<AgentKind>,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<TargetRootDescriptor, IndexError> {
    if let Some(derived) = derive_target_roots(managed_skill, scan_options, index_options)?
        .into_iter()
        .find(|target| {
            path_equals(&target.target_root, &target_root.to_path_buf())
                || target.target_root == target_root
        })
    {
        return Ok(derived);
    }

    let canonical_path =
        fs::canonicalize(target_root).unwrap_or_else(|_| target_root.to_path_buf());
    let agent = agent_override.unwrap_or_else(|| managed_skill.agent.clone());
    add_custom_target(
        canonical_path.clone(),
        agent.clone(),
        managed_skill.scope.clone(),
        None,
        index_options,
    )?;

    let project_root = if managed_skill.scope == SkillScope::Project {
        // OpenClaw uses 3-level path (.openclaw/workspace/skills),
        // other agents use 2-level (.codex/skills, .claude/skills, etc.)
        let depth = match agent {
            AgentKind::OpenClaw => 3,
            _ => 2,
        };
        let mut path = canonical_path.as_path();
        for _ in 0..depth {
            match path.parent() {
                Some(p) => path = p,
                None => {
                    return Ok(TargetRootDescriptor {
                        agent,
                        scope: managed_skill.scope.clone(),
                        target_root: canonical_path,
                        project_root: None,
                    });
                }
            }
        }
        Some(path.to_path_buf())
    } else {
        None
    };

    Ok(TargetRootDescriptor {
        agent,
        scope: managed_skill.scope.clone(),
        target_root: canonical_path,
        project_root,
    })
}

fn install_records_for_path(
    install_records: &[InstallRecordWithSkillRow],
    managed_skill_path: &Path,
) -> Vec<InstallRecordRow> {
    install_records
        .iter()
        .filter(|record| {
            path_equals(
                &record.managed_skill_path,
                &managed_skill_path.to_path_buf(),
            )
        })
        .map(|record| InstallRecordRow {
            target_root: record.target_root.clone(),
            agent: record.agent.clone(),
            scope: record.scope.clone(),
            updated_unix_ms: record.updated_unix_ms,
        })
        .collect()
}

fn load_install_records_for_skill(
    managed_skill_path: &Path,
    index_options: &IndexOptions,
) -> Result<Vec<InstallRecordRow>, IndexError> {
    let index_path = resolve_index_path(index_options);
    if !index_path.exists() {
        return Ok(Vec::new());
    }

    let connection = Connection::open(index_path)?;
    init_schema(&connection)?;
    read_install_records(&connection, managed_skill_path)
}

fn load_all_install_records(
    index_options: &IndexOptions,
) -> Result<Vec<InstallRecordWithSkillRow>, IndexError> {
    let index_path = resolve_index_path(index_options);
    if !index_path.exists() {
        return Ok(Vec::new());
    }

    let connection = Connection::open(index_path)?;
    init_schema(&connection)?;
    read_all_install_records(&connection)
}

fn load_family_promotions(
    index_options: &IndexOptions,
) -> Result<BTreeMap<String, PathBuf>, IndexError> {
    let index_path = resolve_index_path(index_options);
    if !index_path.exists() {
        return Ok(BTreeMap::new());
    }

    let connection = Connection::open(index_path)?;
    init_schema(&connection)?;
    Ok(read_family_promotions(&connection)?
        .into_iter()
        .map(|(family_key, path)| (family_key, PathBuf::from(path)))
        .collect())
}

fn read_install_records(
    connection: &Connection,
    managed_skill_path: &Path,
) -> Result<Vec<InstallRecordRow>, IndexError> {
    let mut statement = connection.prepare(
        "
        SELECT target_root, agent, scope, updated_unix_ms
        FROM install_records
        WHERE managed_skill_path = ?1
        ORDER BY target_root ASC
        ",
    )?;

    let managed_key = managed_skill_path.to_string_lossy().into_owned();
    let rows = statement.query_map([managed_key], |row| {
        let agent: String = row.get(1)?;
        let scope: String = row.get(2)?;
        Ok(InstallRecordRow {
            target_root: PathBuf::from(row.get::<_, String>(0)?),
            agent: AgentKind::from_key(&agent).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    1,
                    rusqlite::types::Type::Text,
                    format!("unknown agent kind: {agent}").into(),
                )
            })?,
            scope: SkillScope::from_key(&scope).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    2,
                    rusqlite::types::Type::Text,
                    format!("unknown skill scope: {scope}").into(),
                )
            })?,
            updated_unix_ms: row.get(3)?,
        })
    })?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(IndexError::from)
}

fn read_all_install_records(
    connection: &Connection,
) -> Result<Vec<InstallRecordWithSkillRow>, IndexError> {
    let mut statement = connection.prepare(
        "
        SELECT managed_skill_path, target_root, agent, scope, updated_unix_ms
        FROM install_records
        ORDER BY target_root ASC, managed_skill_path ASC
        ",
    )?;

    let rows = statement.query_map([], |row| {
        let agent: String = row.get(2)?;
        let scope: String = row.get(3)?;
        Ok(InstallRecordWithSkillRow {
            managed_skill_path: PathBuf::from(row.get::<_, String>(0)?),
            target_root: PathBuf::from(row.get::<_, String>(1)?),
            agent: AgentKind::from_key(&agent).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    2,
                    rusqlite::types::Type::Text,
                    format!("unknown agent kind: {agent}").into(),
                )
            })?,
            scope: SkillScope::from_key(&scope).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    3,
                    rusqlite::types::Type::Text,
                    format!("unknown skill scope: {scope}").into(),
                )
            })?,
            updated_unix_ms: row.get(4)?,
        })
    })?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(IndexError::from)
}

fn read_custom_target_records(
    connection: &Connection,
) -> Result<Vec<CustomInstallTarget>, IndexError> {
    let mut statement = connection.prepare(
        "
        SELECT id, path, agent, scope, label, created_unix_ms
        FROM custom_targets
        ORDER BY created_unix_ms DESC
        ",
    )?;

    let rows = statement.query_map([], |row| {
        let agent: String = row.get(2)?;
        let scope: String = row.get(3)?;
        Ok(CustomInstallTarget {
            id: row.get(0)?,
            path: PathBuf::from(row.get::<_, String>(1)?),
            agent: AgentKind::from_key(&agent).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    2,
                    rusqlite::types::Type::Text,
                    format!("unknown agent kind: {agent}").into(),
                )
            })?,
            scope: SkillScope::from_key(&scope).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    3,
                    rusqlite::types::Type::Text,
                    format!("unknown skill scope: {scope}").into(),
                )
            })?,
            label: row.get(4)?,
            created_unix_ms: row.get(5)?,
        })
    })?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(IndexError::from)
}

pub fn load_custom_targets(
    index_options: &IndexOptions,
) -> Result<Vec<CustomInstallTarget>, IndexError> {
    let index_path = resolve_index_path(index_options);
    let connection = Connection::open(&index_path)?;
    read_custom_target_records(&connection)
}

pub fn add_custom_target(
    path: PathBuf,
    agent: AgentKind,
    scope: SkillScope,
    label: Option<String>,
    index_options: &IndexOptions,
) -> Result<CustomInstallTarget, IndexError> {
    let index_path = resolve_index_path(index_options);
    let connection = Connection::open(&index_path)?;
    let canonical_path = fs::canonicalize(&path).unwrap_or(path);
    let path_key = canonical_path.to_string_lossy().into_owned();
    let created_unix_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;

    connection.execute(
        "
        INSERT INTO custom_targets (path, agent, scope, label, created_unix_ms)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(path) DO UPDATE SET agent = excluded.agent, scope = excluded.scope, label = excluded.label
        ",
        rusqlite::params![
            path_key,
            agent.as_key(),
            scope.as_key(),
            label,
            created_unix_ms,
        ],
    )?;

    let id: i64 = connection.query_row(
        "SELECT id FROM custom_targets WHERE path = ?1",
        [path_key],
        |row| row.get(0),
    )?;

    Ok(CustomInstallTarget {
        id,
        path: canonical_path,
        agent,
        scope,
        label,
        created_unix_ms,
    })
}

pub fn remove_custom_target(id: i64, index_options: &IndexOptions) -> Result<(), IndexError> {
    let index_path = resolve_index_path(index_options);
    let connection = Connection::open(&index_path)?;
    connection.execute("DELETE FROM custom_targets WHERE id = ?1", [id])?;
    Ok(())
}

fn merge_custom_targets_into_derived(
    targets: &mut BTreeMap<String, TargetRootDescriptor>,
    index_options: &IndexOptions,
) -> Result<(), IndexError> {
    for target in load_custom_targets(index_options)? {
        let project_root = if target.scope == SkillScope::Project {
            target
                .path
                .parent()
                .and_then(Path::parent)
                .map(Path::to_path_buf)
        } else {
            None
        };
        targets.insert(
            target.path.to_string_lossy().into_owned(),
            TargetRootDescriptor {
                agent: target.agent,
                scope: target.scope,
                target_root: target.path,
                project_root,
            },
        );
    }
    Ok(())
}

fn read_origin_records(
    connection: &Connection,
    managed_skill_path: &Path,
) -> Result<Vec<ManagedSkillOrigin>, IndexError> {
    let mut statement = connection.prepare(
        "
        SELECT origin, source_type, recorded_unix_ms
        FROM managed_origins
        WHERE managed_skill_path = ?1
        ORDER BY recorded_unix_ms DESC, origin ASC
        ",
    )?;

    let managed_key = managed_skill_path.to_string_lossy().into_owned();
    let rows = statement.query_map([managed_key], |row| {
        let source_type: String = row.get(1)?;
        Ok(ManagedSkillOrigin {
            origin: row.get(0)?,
            source_type: SkillSourceType::from_key(&source_type).ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    1,
                    rusqlite::types::Type::Text,
                    format!("unknown skill source type: {source_type}").into(),
                )
            })?,
            recorded_unix_ms: row.get(2)?,
        })
    })?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(IndexError::from)
}

fn read_variant_records(connection: &Connection) -> Result<BTreeMap<String, String>, IndexError> {
    let mut statement = connection.prepare(
        "
        SELECT managed_skill_path, variant_label
        FROM managed_variants
        ORDER BY managed_skill_path ASC
        ",
    )?;

    let rows = statement.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;

    let mut variants = BTreeMap::new();
    for row in rows {
        let (managed_skill_path, variant_label) = row?;
        variants.insert(managed_skill_path, variant_label);
    }

    Ok(variants)
}

fn read_managed_revision_records(
    connection: &Connection,
    family_key: &str,
) -> Result<Vec<ManagedVariantHistory>, IndexError> {
    let mut statement = connection.prepare(
        "
        SELECT family_key, variant_label, managed_skill_path, revision_hash, display_name, created_unix_ms
        FROM managed_revisions
        WHERE family_key = ?1
        ORDER BY variant_label ASC, created_unix_ms DESC, managed_skill_path ASC
        ",
    )?;

    let rows = statement.query_map([family_key], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            ManagedSkillRevision {
                managed_skill_path: PathBuf::from(row.get::<_, String>(2)?),
                revision_hash: row.get(3)?,
                display_name: row.get(4)?,
                variant_label: row.get(1)?,
                created_unix_ms: row.get(5)?,
                is_promoted: false,
            },
        ))
    })?;

    let mut grouped = BTreeMap::<(String, String), Vec<ManagedSkillRevision>>::new();
    for row in rows {
        let (family_key, variant_label, revision) = row?;
        grouped
            .entry((family_key, variant_label))
            .or_default()
            .push(revision);
    }

    Ok(grouped
        .into_iter()
        .map(
            |((family_key, variant_label), revisions)| ManagedVariantHistory {
                family_key,
                variant_label,
                revisions,
            },
        )
        .collect())
}

fn read_family_promotions(connection: &Connection) -> Result<BTreeMap<String, String>, IndexError> {
    let mut statement = connection.prepare(
        "
        SELECT family_key, managed_skill_path
        FROM family_promotions
        ORDER BY family_key ASC
        ",
    )?;

    let rows = statement.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;

    let mut promotions = BTreeMap::new();
    for row in rows {
        let (family_key, managed_skill_path) = row?;
        promotions.insert(family_key, managed_skill_path);
    }

    Ok(promotions)
}

fn hydrate_summary_variant_labels(
    summary: &mut ScanSummary,
    connection: &Connection,
) -> Result<(), IndexError> {
    let variant_records = read_variant_records(connection)?;

    for skill in &mut summary.skills {
        if skill.source_type == SkillSourceType::Disk {
            skill.variant_label = None;
            continue;
        }

        let key = skill.path.to_string_lossy().into_owned();
        skill.variant_label = variant_records
            .get(&key)
            .cloned()
            .or_else(|| Some(build_suggested_version_label(skill)));
    }

    Ok(())
}

fn build_install_status(
    managed_skill: &InstalledSkill,
    target: &TargetRootDescriptor,
    install_records: &[InstallRecordRow],
    family_promotions: &BTreeMap<String, PathBuf>,
) -> SkillInstallStatus {
    let prefix = agent_install_prefix(&target.agent, &target.scope);
    let install_path = target.target_root.join(&prefix).join(&managed_skill.slug);
    let root_exists = target.target_root.exists();
    let record = install_records
        .iter()
        .find(|record| path_equals(&record.target_root, &target.target_root));
    let recorded = record.is_some();
    let last_action_unix_ms = record.map(|record| record.updated_unix_ms);
    let is_family_default = family_promotions
        .get(&managed_skill.family_key)
        .is_some_and(|path| path_equals(path, &managed_skill.path));

    let (install_method, health_state) = match fs::symlink_metadata(&install_path) {
        Err(error) if error.kind() == ErrorKind::NotFound => (
            None,
            if root_exists {
                InstallHealthState::NotInstalled
            } else {
                InstallHealthState::MissingTarget
            },
        ),
        Err(_) => (None, InstallHealthState::Conflict),
        Ok(metadata) if metadata.file_type().is_symlink() => {
            let resolved = fs::read_link(&install_path)
                .ok()
                .map(|target_path| resolve_symlink_target(&install_path, &target_path));
            match resolved {
                Some(target_path) if !target_path.exists() => {
                    (Some(InstallMethod::Symlink), InstallHealthState::Broken)
                }
                Some(target_path) if path_equals(&target_path, &managed_skill.path) => {
                    (Some(InstallMethod::Symlink), InstallHealthState::Healthy)
                }
                _ => (Some(InstallMethod::Symlink), InstallHealthState::Conflict),
            }
        }
        Ok(metadata) if metadata.is_dir() => match hash_skill_directory(&install_path) {
            Ok(hash) if hash == managed_skill.content_hash => {
                (Some(InstallMethod::Copy), InstallHealthState::Copied)
            }
            _ => (Some(InstallMethod::Copy), InstallHealthState::Conflict),
        },
        Ok(_) => (None, InstallHealthState::Conflict),
    };

    SkillInstallStatus {
        target_id: format!(
            "{}::{}::{}",
            target.agent.as_key(),
            target.scope.as_key(),
            target.target_root.to_string_lossy()
        ),
        agent: target.agent.clone(),
        scope: target.scope.clone(),
        target_root: target.target_root.clone(),
        install_path,
        project_root: target.project_root.clone(),
        root_exists,
        install_method,
        health_state,
        recorded,
        pinned: recorded,
        variant_label: managed_skill.variant_label.clone(),
        content_hash: managed_skill.content_hash.clone(),
        is_family_default,
        last_action_unix_ms,
    }
}

fn resolve_symlink_target(link_path: &Path, target_path: &Path) -> PathBuf {
    if target_path.is_absolute() {
        target_path.to_path_buf()
    } else {
        link_path
            .parent()
            .map(|parent| parent.join(target_path))
            .unwrap_or_else(|| target_path.to_path_buf())
    }
}

fn destination_symlink_points_to(destination: &Path, managed_skill_path: &Path) -> bool {
    let Ok(metadata) = fs::symlink_metadata(destination) else {
        return false;
    };

    if !metadata.file_type().is_symlink() {
        return false;
    }

    let Ok(target_path) = fs::read_link(destination) else {
        return false;
    };

    path_equals(
        &resolve_symlink_target(destination, &target_path),
        &managed_skill_path.to_path_buf(),
    )
}

fn remove_existing_path(path: &Path) -> Result<(), IndexError> {
    let Ok(metadata) = fs::symlink_metadata(path) else {
        return Ok(());
    };

    if metadata.file_type().is_symlink() || metadata.is_file() {
        fs::remove_file(path)?;
    } else if metadata.is_dir() {
        fs::remove_dir_all(path)?;
    }

    Ok(())
}

fn create_directory_symlink(source: &Path, destination: &Path) -> Result<(), IndexError> {
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(source, destination)?;
        Ok(())
    }

    #[cfg(windows)]
    {
        std::os::windows::fs::symlink_dir(source, destination)?;
        Ok(())
    }
}

fn record_install(
    managed_skill_path: &Path,
    target: &TargetRootDescriptor,
    method: InstallMethod,
    index_options: &IndexOptions,
) -> Result<(), IndexError> {
    let index_path = resolve_index_path(index_options);
    if let Some(parent) = index_path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut connection = Connection::open(index_path)?;
    init_schema(&connection)?;
    let transaction = connection.transaction()?;
    upsert_install_record(
        &transaction,
        managed_skill_path,
        target,
        method,
        now_unix_ms(),
    )?;
    transaction.commit()?;
    Ok(())
}

fn delete_install_record(
    managed_skill_path: &Path,
    target_root: &Path,
    index_options: &IndexOptions,
) -> Result<(), IndexError> {
    let index_path = resolve_index_path(index_options);
    if !index_path.exists() {
        return Ok(());
    }
    let connection = Connection::open(index_path)?;
    init_schema(&connection)?;
    connection.execute(
        "
        DELETE FROM install_records
        WHERE managed_skill_path = ?1 AND target_root = ?2
        ",
        params![
            managed_skill_path.to_string_lossy().into_owned(),
            target_root.to_string_lossy().into_owned(),
        ],
    )?;
    Ok(())
}

fn upsert_origin_record(
    connection: &Connection,
    managed_skill_path: &Path,
    origin: &str,
    source_type: &SkillSourceType,
    recorded_unix_ms: i64,
) -> Result<(), rusqlite::Error> {
    connection.execute(
        "
        INSERT INTO managed_origins (managed_skill_path, origin, source_type, recorded_unix_ms)
        VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(managed_skill_path, origin)
        DO UPDATE SET
          source_type = excluded.source_type,
          recorded_unix_ms = excluded.recorded_unix_ms
        ",
        params![
            managed_skill_path.to_string_lossy().into_owned(),
            origin,
            source_type.as_key(),
            recorded_unix_ms,
        ],
    )?;

    Ok(())
}

fn upsert_variant_record(
    connection: &Connection,
    managed_skill_path: &Path,
    variant_label: &str,
    updated_unix_ms: i64,
) -> Result<(), rusqlite::Error> {
    connection.execute(
        "
        INSERT INTO managed_variants (managed_skill_path, variant_label, updated_unix_ms)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(managed_skill_path)
        DO UPDATE SET
          variant_label = excluded.variant_label,
          updated_unix_ms = excluded.updated_unix_ms
        ",
        params![
            managed_skill_path.to_string_lossy().into_owned(),
            variant_label,
            updated_unix_ms,
        ],
    )?;

    Ok(())
}

fn upsert_revision_record(
    connection: &Connection,
    family_key: &str,
    variant_label: &str,
    managed_skill: &InstalledSkill,
    created_unix_ms: i64,
) -> Result<(), rusqlite::Error> {
    connection.execute(
        "
        INSERT INTO managed_revisions (
          family_key,
          variant_label,
          managed_skill_path,
          revision_hash,
          display_name,
          created_unix_ms
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(family_key, variant_label, managed_skill_path)
        DO UPDATE SET
          revision_hash = excluded.revision_hash,
          display_name = excluded.display_name,
          created_unix_ms = excluded.created_unix_ms
        ",
        params![
            family_key,
            variant_label,
            managed_skill.path.to_string_lossy().into_owned(),
            managed_skill.content_hash.clone(),
            managed_skill.display_name.clone(),
            created_unix_ms,
        ],
    )?;

    Ok(())
}

fn ensure_variant_record(
    connection: &Connection,
    managed_skill_path: &Path,
    variant_label: &str,
    updated_unix_ms: i64,
) -> Result<(), rusqlite::Error> {
    connection.execute(
        "
        INSERT OR IGNORE INTO managed_variants (managed_skill_path, variant_label, updated_unix_ms)
        VALUES (?1, ?2, ?3)
        ",
        params![
            managed_skill_path.to_string_lossy().into_owned(),
            variant_label,
            updated_unix_ms,
        ],
    )?;

    Ok(())
}

fn rename_revision_variant_records(
    connection: &Connection,
    managed_skill_path: &Path,
    family_key: &str,
    variant_label: &str,
    updated_unix_ms: i64,
) -> Result<(), rusqlite::Error> {
    connection.execute(
        "
        UPDATE managed_revisions
        SET variant_label = ?1, created_unix_ms = ?2
        WHERE managed_skill_path = ?3
        ",
        params![
            variant_label,
            updated_unix_ms,
            managed_skill_path.to_string_lossy().into_owned(),
        ],
    )?;

    connection.execute(
        "
        INSERT OR IGNORE INTO managed_revisions (
          family_key,
          variant_label,
          managed_skill_path,
          revision_hash,
          display_name,
          created_unix_ms
        )
        SELECT ?1, ?2, path, content_hash, display_name, ?3
        FROM skills
        WHERE path = ?4
        ",
        params![
            family_key,
            variant_label,
            updated_unix_ms,
            managed_skill_path.to_string_lossy().into_owned(),
        ],
    )?;

    Ok(())
}

fn upsert_family_promotion(
    connection: &Connection,
    family_key: &str,
    managed_skill_path: &Path,
    updated_unix_ms: i64,
) -> Result<(), rusqlite::Error> {
    connection.execute(
        "
        INSERT INTO family_promotions (family_key, managed_skill_path, updated_unix_ms)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(family_key)
        DO UPDATE SET
          managed_skill_path = excluded.managed_skill_path,
          updated_unix_ms = excluded.updated_unix_ms
        ",
        params![
            family_key,
            managed_skill_path.to_string_lossy().into_owned(),
            updated_unix_ms,
        ],
    )?;

    Ok(())
}

fn ensure_family_promotion(
    connection: &Connection,
    family_key: &str,
    managed_skill_path: &Path,
    updated_unix_ms: i64,
) -> Result<(), rusqlite::Error> {
    connection.execute(
        "
        INSERT OR IGNORE INTO family_promotions (family_key, managed_skill_path, updated_unix_ms)
        VALUES (?1, ?2, ?3)
        ",
        params![
            family_key,
            managed_skill_path.to_string_lossy().into_owned(),
            updated_unix_ms,
        ],
    )?;

    Ok(())
}

fn upsert_install_record(
    connection: &Connection,
    managed_skill_path: &Path,
    target: &TargetRootDescriptor,
    method: InstallMethod,
    updated_unix_ms: i64,
) -> Result<(), rusqlite::Error> {
    let method_key = match method {
        InstallMethod::Symlink => "symlink",
        InstallMethod::Copy => "copy",
    };
    connection.execute(
        "
        INSERT INTO install_records (
          managed_skill_path,
          target_root,
          agent,
          scope,
          method,
          updated_unix_ms
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(managed_skill_path, target_root)
        DO UPDATE SET
          agent = excluded.agent,
          scope = excluded.scope,
          method = excluded.method,
          updated_unix_ms = excluded.updated_unix_ms
        ",
        params![
            managed_skill_path.to_string_lossy().into_owned(),
            target.target_root.to_string_lossy().into_owned(),
            target.agent.as_key(),
            target.scope.as_key(),
            method_key,
            updated_unix_ms,
        ],
    )?;

    Ok(())
}

fn read_last_refresh_unix_ms(connection: &Connection) -> Result<Option<i64>, rusqlite::Error> {
    let mut statement = connection.prepare("SELECT value FROM metadata WHERE key = ?1")?;
    let value = statement
        .query_row([LAST_REFRESH_KEY], |row| row.get::<_, String>(0))
        .optional()?;

    Ok(value.and_then(|value| value.parse::<i64>().ok()))
}

fn is_stale(last_refresh_unix_ms: Option<i64>, index_options: &IndexOptions) -> bool {
    let Some(last_refresh_unix_ms) = last_refresh_unix_ms else {
        return true;
    };

    let now = now_unix_ms();
    let stale_after_ms = (index_options
        .stale_after_secs
        .unwrap_or(DEFAULT_STALE_AFTER_SECS) as i64)
        * 1000;

    now.saturating_sub(last_refresh_unix_ms) > stale_after_ms
}

fn now_unix_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn build_discovery_report(
    skills: Vec<InstalledSkill>,
    managed_skills: Vec<InstalledSkill>,
) -> DiscoveryReport {
    let mut family_groups = BTreeMap::<String, Vec<InstalledSkill>>::new();
    let mut managed_by_family = BTreeMap::<String, Vec<InstalledSkill>>::new();

    for skill in skills {
        family_groups
            .entry(skill.family_key.clone())
            .or_default()
            .push(skill);
    }

    for skill in managed_skills {
        managed_by_family
            .entry(skill.family_key.clone())
            .or_default()
            .push(skill);
    }

    let mut all_groups = family_groups
        .into_iter()
        .map(|(family_key, items)| {
            let existing_variants = managed_by_family.remove(&family_key).unwrap_or_default();
            build_family_group(family_key, items, existing_variants)
        })
        .collect::<Vec<_>>();
    all_groups.sort_by(|left, right| left.display_name.cmp(&right.display_name));

    let exact_duplicate_groups = all_groups
        .iter()
        .filter(|group| group.kind == DiscoveryGroupKind::ExactDuplicate)
        .cloned()
        .collect::<Vec<_>>();
    let unique_groups = all_groups
        .iter()
        .filter(|group| group.kind == DiscoveryGroupKind::Unique)
        .cloned()
        .collect::<Vec<_>>();
    let variant_groups = all_groups
        .iter()
        .filter(|group| group.kind == DiscoveryGroupKind::Variant)
        .cloned()
        .collect::<Vec<_>>();

    DiscoveryReport {
        summary: DiscoverySummary {
            occurrence_count: all_groups.iter().map(|group| group.occurrence_count).sum(),
            exact_duplicate_group_count: all_groups
                .iter()
                .map(|group| {
                    group
                        .candidates
                        .iter()
                        .filter(|candidate| candidate.occurrence_count > 1)
                        .count()
                })
                .sum(),
            family_count: all_groups.len(),
            variant_family_count: all_groups
                .iter()
                .filter(|group| group.kind == DiscoveryGroupKind::Variant)
                .count(),
        },
        all_groups,
        unique_groups,
        exact_duplicate_groups,
        variant_groups,
    }
}

fn build_family_group(
    family_key: String,
    items: Vec<InstalledSkill>,
    mut existing_variants: Vec<InstalledSkill>,
) -> DiscoveryGroup {
    let mut sorted_items = items;
    sorted_items.sort_by(|left, right| {
        left.display_name
            .cmp(&right.display_name)
            .then(left.content_hash.cmp(&right.content_hash))
            .then(left.path.cmp(&right.path))
    });
    existing_variants.sort_by(|left, right| {
        left.display_name
            .cmp(&right.display_name)
            .then(left.variant_label.cmp(&right.variant_label))
            .then(left.path.cmp(&right.path))
    });

    let mut content_groups = BTreeMap::<String, Vec<InstalledSkill>>::new();
    for item in sorted_items.iter().cloned() {
        content_groups
            .entry(item.content_hash.clone())
            .or_default()
            .push(item);
    }

    let mut candidates = content_groups
        .into_iter()
        .map(|(content_hash, occurrences)| build_discovery_candidate(content_hash, occurrences))
        .collect::<Vec<_>>();
    candidates.sort_by(|left, right| {
        left.suggested_version_label
            .cmp(&right.suggested_version_label)
            .then(left.representative.path.cmp(&right.representative.path))
    });

    let variant_count = candidates.len();
    let duplicate_count = sorted_items.len().saturating_sub(variant_count);
    let kind = if variant_count == 1 {
        if sorted_items.len() == 1 {
            DiscoveryGroupKind::Unique
        } else {
            DiscoveryGroupKind::ExactDuplicate
        }
    } else {
        DiscoveryGroupKind::Variant
    };

    DiscoveryGroup {
        family_key: family_key.clone(),
        display_name: sorted_items
            .first()
            .map(|item| item.display_name.clone())
            .unwrap_or(family_key),
        review_state: if kind == DiscoveryGroupKind::Variant {
            DiscoveryReviewState::NeedsReview
        } else {
            DiscoveryReviewState::Ready
        },
        kind,
        occurrence_count: sorted_items.len(),
        duplicate_count,
        variant_count,
        recommended_paths: candidates
            .iter()
            .map(|candidate| candidate.representative.path.clone())
            .collect(),
        candidates,
        existing_variants,
    }
}

fn build_discovery_candidate(
    content_hash: String,
    occurrences: Vec<InstalledSkill>,
) -> DiscoveryCandidate {
    let representative = select_preferred_occurrence(occurrences.clone());
    let family_key = representative.family_key.clone();

    DiscoveryCandidate {
        id: format!("{family_key}:{content_hash}"),
        content_hash,
        occurrence_count: occurrences.len(),
        provenance_paths: occurrences
            .into_iter()
            .map(|occurrence| occurrence.path)
            .collect(),
        suggested_version_label: build_suggested_version_label(&representative),
        representative,
    }
}

fn select_preferred_occurrence(mut occurrences: Vec<InstalledSkill>) -> InstalledSkill {
    occurrences.sort_by(|left, right| {
        score_occurrence(right)
            .cmp(&score_occurrence(left))
            .then(left.path.cmp(&right.path))
    });
    occurrences
        .into_iter()
        .next()
        .expect("at least one occurrence should exist")
}

fn score_occurrence(skill: &InstalledSkill) -> i32 {
    let mut score = 0;

    if skill.scope == SkillScope::Project {
        score += 20;
    }

    if skill.agent == AgentKind::Codex || skill.agent == AgentKind::OpenClaw {
        score += 10;
    }

    if skill.project_root.is_some() {
        score += 5;
    }

    score
}

fn build_suggested_version_label(skill: &InstalledSkill) -> String {
    if let Some(project_root) = &skill.project_root {
        if let Some(project_name) = project_root.file_name().and_then(|value| value.to_str()) {
            return format!(
                "{}-{}",
                project_name,
                if skill.agent == AgentKind::Codex {
                    "codex"
                } else if skill.agent == AgentKind::OpenClaw {
                    "openclaw"
                } else {
                    "claude"
                }
            );
        }
    }

    if skill.scope == SkillScope::Global {
        return if skill.agent == AgentKind::Codex {
            "global-codex".to_string()
        } else if skill.agent == AgentKind::OpenClaw {
            "global-openclaw".to_string()
        } else {
            "global-claude".to_string()
        };
    }

    skill.content_hash.chars().take(8).collect()
}

fn normalize_variant_label(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    Some(trimmed.to_string())
}

fn find_disk_candidate(
    skills: &[InstalledSkill],
    skill_path: &Path,
) -> Result<InstalledSkill, IndexError> {
    skills
        .iter()
        .find(|skill| {
            skill.source_type == SkillSourceType::Disk
                && path_matches_skill(&skill_path.to_path_buf(), skill)
        })
        .cloned()
        .ok_or_else(|| {
            IndexError::Message(
                "Could not find the selected disk skill in the current index.".to_string(),
            )
        })
}

fn find_managed_skill(
    skills: &[InstalledSkill],
    skill_path: &Path,
) -> Result<InstalledSkill, IndexError> {
    skills
        .iter()
        .find(|skill| {
            skill.source_type != SkillSourceType::Disk
                && path_matches_skill(&skill_path.to_path_buf(), skill)
        })
        .cloned()
        .ok_or_else(|| {
            IndexError::Message(
                "Could not find the selected managed skill in the current index.".to_string(),
            )
        })
}

fn find_any_skill(
    skills: &[InstalledSkill],
    skill_path: &Path,
) -> Result<InstalledSkill, IndexError> {
    skills
        .iter()
        .find(|skill| path_matches_skill(&skill_path.to_path_buf(), skill))
        .cloned()
        .ok_or_else(|| {
            IndexError::Message(
                "Could not find the requested skill in the current index.".to_string(),
            )
        })
}

fn import_skill_from_candidate(
    candidate: &InstalledSkill,
    origin: &str,
    index_options: &IndexOptions,
) -> Result<InstalledSkill, IndexError> {
    import_skill_from_candidate_with_variant(candidate, origin, index_options, None, None)
}

fn import_skill_from_candidate_with_variant(
    candidate: &InstalledSkill,
    origin: &str,
    index_options: &IndexOptions,
    variant_label_override: Option<&str>,
    git_source: Option<&crate::models::ManagedGitSource>,
) -> Result<InstalledSkill, IndexError> {
    let store_root = resolve_store_path(index_options);
    let destination = managed_skill_dir(candidate, &store_root);

    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)?;
    }

    if !destination.exists() {
        copy_dir_recursive(&candidate.path, &destination)?;
    }

    let adopted = InstalledSkill {
        source_type: match candidate.source_type {
            SkillSourceType::Disk => SkillSourceType::Import,
            _ => candidate.source_type.clone(),
        },
        path: destination.clone(),
        skill_md: destination.join("SKILL.md"),
        source_root: store_root.clone(),
        project_root: None,
        ..candidate.clone()
    };

    let index_path = resolve_index_path(index_options);
    if let Some(parent) = index_path.parent() {
        fs::create_dir_all(parent)?;
    }
    let mut connection = Connection::open(index_path)?;
    init_schema(&connection)?;
    let transaction = connection.transaction()?;
    let fallback_variant_label = build_suggested_version_label(candidate);
    let resolved_variant_label = variant_label_override.unwrap_or(&fallback_variant_label);
    let now = now_unix_ms();
    upsert_skill_record(&transaction, &adopted)?;
    upsert_origin_record(
        &transaction,
        &adopted.path,
        origin,
        &candidate.source_type,
        now,
    )?;
    ensure_variant_record(&transaction, &adopted.path, resolved_variant_label, now)?;
    upsert_revision_record(
        &transaction,
        &adopted.family_key,
        resolved_variant_label,
        &adopted,
        now,
    )?;
    if let Some(git) = git_source {
        upsert_git_source_record(&transaction, git)?;
    }
    ensure_family_promotion(&transaction, &adopted.family_key, &adopted.path, now)?;
    transaction.commit()?;

    Ok(adopted)
}

fn merge_candidate_into_existing(
    candidate: &InstalledSkill,
    target: &InstalledSkill,
    index_options: &IndexOptions,
) -> Result<(), IndexError> {
    let index_path = resolve_index_path(index_options);
    if let Some(parent) = index_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let mut connection = Connection::open(index_path)?;
    init_schema(&connection)?;
    let transaction = connection.transaction()?;
    upsert_skill_record(&transaction, target)?;
    upsert_origin_record(
        &transaction,
        &target.path,
        &candidate.path.to_string_lossy(),
        &candidate.source_type,
        now_unix_ms(),
    )?;
    if let Some(variant_label) = target.variant_label.as_deref() {
        ensure_variant_record(&transaction, &target.path, variant_label, now_unix_ms())?;
        upsert_revision_record(
            &transaction,
            &target.family_key,
            variant_label,
            target,
            now_unix_ms(),
        )?;
    }
    transaction.commit()?;
    Ok(())
}

fn collect_relative_files(root: &Path) -> Result<Vec<PathBuf>, IndexError> {
    let mut files = Vec::new();

    for entry in WalkDir::new(root).follow_links(false) {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                return Err(IndexError::Message(error.to_string()));
            }
        };

        if !entry.file_type().is_file() {
            continue;
        }

        if let Ok(relative_path) = entry.path().strip_prefix(root) {
            files.push(relative_path.to_path_buf());
        }
    }

    Ok(files)
}

fn path_matches_skill(skill_path: &PathBuf, skill: &InstalledSkill) -> bool {
    path_equals(skill_path, &skill.path) || path_equals(skill_path, &skill.skill_md)
}

fn path_equals(left: &PathBuf, right: &PathBuf) -> bool {
    if left == right {
        return true;
    }

    let left_canonical = fs::canonicalize(left).ok();
    let right_canonical = fs::canonicalize(right).ok();
    left_canonical
        .zip(right_canonical)
        .is_some_and(|(a, b)| a == b)
}

fn managed_skill_dir(skill: &InstalledSkill, store_root: &PathBuf) -> PathBuf {
    let hashed_suffix = skill.content_hash.chars().take(12).collect::<String>();
    store_root
        .join(skill.agent.as_key())
        .join(skill.scope.as_key())
        .join(format!("{}--{}", skill.family_key, hashed_suffix))
}

fn copy_dir_recursive(source: &PathBuf, destination: &PathBuf) -> Result<(), IndexError> {
    for entry in walkdir::WalkDir::new(source).follow_links(false) {
        let entry = entry.map_err(|error| {
            IndexError::Message(format!("Failed to walk source skill directory: {error}"))
        })?;
        let relative_path = entry
            .path()
            .strip_prefix(source)
            .map_err(|error| IndexError::Message(error.to_string()))?;
        let target_path = destination.join(relative_path);

        if entry.file_type().is_dir() {
            fs::create_dir_all(&target_path)?;
            continue;
        }

        #[cfg(unix)]
        if entry.file_type().is_symlink() {
            let target = fs::read_link(entry.path())?;
            std::os::unix::fs::symlink(target, &target_path)?;
            continue;
        }

        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(entry.path(), &target_path)?;
    }

    Ok(())
}

pub fn default_repo_cache_path() -> PathBuf {
    default_data_root().join("repos")
}

fn repo_cache_dir(git_url: &str) -> String {
    git_url
        .trim_start_matches("https://")
        .trim_start_matches("http://")
        .trim_start_matches("git@")
        .replace(':', "--")
        .replace('/', "--")
        .trim_end_matches(".git")
        .to_string()
}

fn run_git_command(mut command: Command) -> Result<(), IndexError> {
    let output = command
        .output()
        .map_err(|e| IndexError::Message(format!("Failed to run git command: {e}")))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(IndexError::Message(format!("Git command failed: {stderr}")));
    }
    Ok(())
}

fn clone_or_update_repo_cache(git_url: &str, branch: Option<&str>) -> Result<PathBuf, IndexError> {
    let cache_root = default_repo_cache_path();
    let cache_dir = repo_cache_dir(git_url);
    let target = cache_root.join(&cache_dir);
    fs::create_dir_all(&cache_root)?;

    if target.join(".git").exists() {
        let mut fetch_cmd = Command::new("git");
        fetch_cmd.arg("-C").arg(&target).arg("fetch").arg("origin");
        if let Some(b) = branch {
            fetch_cmd.arg(b);
        }
        if run_git_command(fetch_cmd).is_err() {
            let _ = fs::remove_dir_all(&target);
        }
    }

    if !target.join(".git").exists() {
        let mut clone_cmd = Command::new("git");
        clone_cmd.arg("clone");
        if let Some(b) = branch {
            clone_cmd.arg("--branch").arg(b);
        }
        clone_cmd.arg("--single-branch").arg(git_url).arg(&target);
        run_git_command(clone_cmd)?;
    }

    let checkout_ref = branch
        .map(|b| format!("origin/{b}"))
        .unwrap_or_else(|| "origin/HEAD".to_string());
    let mut reset_cmd = Command::new("git");
    reset_cmd
        .arg("-C")
        .arg(&target)
        .arg("reset")
        .arg("--hard")
        .arg(&checkout_ref);
    run_git_command(reset_cmd)?;

    Ok(target)
}

fn upsert_git_source_record(
    connection: &Connection,
    git_source: &ManagedGitSource,
) -> Result<(), rusqlite::Error> {
    connection.execute(
        "
        INSERT INTO managed_git_sources (
          managed_skill_path, git_url, git_commit, git_branch, repo_subpath, recorded_unix_ms
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(managed_skill_path)
        DO UPDATE SET
          git_url = excluded.git_url,
          git_commit = excluded.git_commit,
          git_branch = excluded.git_branch,
          repo_subpath = excluded.repo_subpath,
          recorded_unix_ms = excluded.recorded_unix_ms
        ",
        params![
            git_source.managed_skill_path.to_string_lossy().into_owned(),
            &git_source.git_url,
            &git_source.git_commit,
            git_source.git_branch.as_ref(),
            git_source.repo_subpath.as_ref(),
            git_source.recorded_unix_ms,
        ],
    )?;
    Ok(())
}

pub fn load_managed_git_source(
    managed_skill_path: PathBuf,
    index_options: &IndexOptions,
) -> Result<Option<ManagedGitSource>, IndexError> {
    let index_path = resolve_index_path(index_options);
    if !index_path.exists() {
        return Ok(None);
    }
    let connection = Connection::open(&index_path)?;
    init_schema(&connection)?;
    read_managed_git_source(&connection, &managed_skill_path).map_err(IndexError::Sql)
}

fn read_managed_git_source(
    connection: &Connection,
    managed_skill_path: &Path,
) -> Result<Option<ManagedGitSource>, rusqlite::Error> {
    let mut stmt = connection.prepare(
        "
        SELECT managed_skill_path, git_url, git_commit, git_branch, repo_subpath, recorded_unix_ms
        FROM managed_git_sources
        WHERE managed_skill_path = ?1
        ",
    )?;
    let result = stmt
        .query_row(
            params![managed_skill_path.to_string_lossy().into_owned()],
            |row| {
                Ok(ManagedGitSource {
                    managed_skill_path: PathBuf::from(row.get::<_, String>(0)?),
                    git_url: row.get(1)?,
                    git_commit: row.get(2)?,
                    git_branch: row.get(3)?,
                    repo_subpath: row.get(4)?,
                    recorded_unix_ms: row.get(5)?,
                })
            },
        )
        .optional()?;
    Ok(result)
}

fn find_skill_dir_in_repo(repo_root: &Path, skill_id: &str) -> Result<PathBuf, IndexError> {
    let mut matches = WalkDir::new(repo_root)
        .follow_links(false)
        .max_depth(8)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.file_type().is_file() && entry.file_name() == "SKILL.md")
        .filter_map(|entry| entry.path().parent().map(Path::to_path_buf))
        .filter(|path| {
            path.file_name()
                .map(|name| name.to_string_lossy() == skill_id)
                .unwrap_or(false)
        })
        .collect::<Vec<_>>();

    matches.sort();
    matches.dedup();

    matches.into_iter().next().ok_or_else(|| {
        IndexError::Message(format!(
            "Could not locate {skill_id}/SKILL.md in the downloaded repository."
        ))
    })
}

pub fn import_git_skill(
    git_url: String,
    repo_subpath: Option<String>,
    skill_id: Option<String>,
    agent: AgentKind,
    scope: SkillScope,
    branch: Option<String>,
    index_options: &IndexOptions,
) -> Result<InstalledSkill, IndexError> {
    let cache_dir = clone_or_update_repo_cache(&git_url, branch.as_deref())?;

    let source_dir = if let Some(sub) = &repo_subpath {
        cache_dir.join(sub)
    } else if let Some(id) = &skill_id {
        find_skill_dir_in_repo(&cache_dir, id)?
    } else {
        cache_dir.clone()
    };

    if !source_dir.join("SKILL.md").exists() {
        return Err(IndexError::Message(format!(
            "Cloned repository does not contain SKILL.md at {}",
            source_dir.display()
        )));
    }

    let mut warnings = Vec::new();
    let inspected = build_installed_skill(
        SkillDescriptor {
            source_type: SkillSourceType::Remote,
            agent,
            scope,
            skill_dir: source_dir.clone(),
            skill_md: source_dir.join("SKILL.md"),
            source_root: cache_dir.clone(),
            project_root: None,
        },
        &mut warnings,
    );

    if let Some(warning) = warnings.into_iter().next() {
        return Err(IndexError::Message(warning.message));
    }

    let repo = git2::Repository::open(&cache_dir)
        .map_err(|e| IndexError::Message(format!("Failed to open git repo: {e}")))?;
    let head = repo
        .head()
        .map_err(|e| IndexError::Message(format!("Failed to read HEAD: {e}")))?;
    let commit = head
        .peel_to_commit()
        .map_err(|e| IndexError::Message(format!("Failed to read commit: {e}")))?;
    let commit_oid = commit.id().to_string();

    let git_source = ManagedGitSource {
        managed_skill_path: managed_skill_dir(&inspected, &resolve_store_path(index_options)),
        git_url: git_url.clone(),
        git_commit: commit_oid,
        git_branch: branch.clone(),
        repo_subpath: repo_subpath.clone(),
        recorded_unix_ms: now_unix_ms(),
    };

    import_skill_from_candidate_with_variant(
        &inspected,
        &git_url,
        index_options,
        None,
        Some(&git_source),
    )
}

pub fn check_managed_skill_updates(
    index_options: &IndexOptions,
) -> Result<Vec<RemoteUpdateCheck>, IndexError> {
    let index_path = resolve_index_path(index_options);
    if !index_path.exists() {
        return Ok(Vec::new());
    }

    let connection = Connection::open(&index_path)?;
    init_schema(&connection)?;

    let mut stmt = connection.prepare(
        "
        SELECT managed_skill_path, git_url, git_commit, git_branch, repo_subpath
        FROM managed_git_sources
        ",
    )?;
    let sources = stmt
        .query_map([], |row| {
            Ok(ManagedGitSource {
                managed_skill_path: PathBuf::from(row.get::<_, String>(0)?),
                git_url: row.get(1)?,
                git_commit: row.get(2)?,
                git_branch: row.get(3)?,
                repo_subpath: row.get(4)?,
                recorded_unix_ms: 0,
            })
        })
        .and_then(|rows| rows.collect::<Result<Vec<_>, _>>())?;

    let mut checks = Vec::new();
    for source in sources {
        let cache_dir =
            match clone_or_update_repo_cache(&source.git_url, source.git_branch.as_deref()) {
                Ok(dir) => dir,
                Err(_) => continue,
            };

        let repo = match git2::Repository::open(&cache_dir) {
            Ok(r) => r,
            Err(_) => continue,
        };
        let head = match repo.head() {
            Ok(h) => h,
            Err(_) => continue,
        };
        let commit = match head.peel_to_commit() {
            Ok(c) => c,
            Err(_) => continue,
        };
        let latest_commit = commit.id().to_string();
        let has_update = latest_commit != source.git_commit;
        let checked_unix_ms = now_unix_ms();

        checks.push(RemoteUpdateCheck {
            managed_skill_path: source.managed_skill_path,
            current_commit: source.git_commit,
            latest_commit,
            has_update,
            checked_unix_ms,
        });
    }

    Ok(checks)
}

pub fn update_managed_skill_from_git(
    skill_path: PathBuf,
    scan_options: &ScanOptions,
    index_options: &IndexOptions,
) -> Result<InstalledSkill, IndexError> {
    let managed_skill =
        load_managed_skill_by_path(skill_path.clone(), scan_options, index_options)?;
    let index_path = resolve_index_path(index_options);
    let connection = Connection::open(&index_path)?;
    init_schema(&connection)?;

    let git_source = read_managed_git_source(&connection, &skill_path)?
        .ok_or_else(|| IndexError::Message("Skill does not have a Git source.".to_string()))?;

    let cache_dir =
        clone_or_update_repo_cache(&git_source.git_url, git_source.git_branch.as_deref())?;
    let source_dir = match &git_source.repo_subpath {
        Some(sub) => cache_dir.join(sub),
        None => cache_dir.clone(),
    };

    let mut warnings = Vec::new();
    let inspected = build_installed_skill(
        SkillDescriptor {
            source_type: SkillSourceType::Remote,
            agent: managed_skill.agent.clone(),
            scope: managed_skill.scope.clone(),
            skill_dir: source_dir.clone(),
            skill_md: source_dir.join("SKILL.md"),
            source_root: cache_dir.clone(),
            project_root: None,
        },
        &mut warnings,
    );

    if let Some(warning) = warnings.into_iter().next() {
        return Err(IndexError::Message(warning.message));
    }

    let repo = git2::Repository::open(&cache_dir)
        .map_err(|e| IndexError::Message(format!("Failed to open git repo: {e}")))?;
    let head = repo
        .head()
        .map_err(|e| IndexError::Message(format!("Failed to read HEAD: {e}")))?;
    let commit = head
        .peel_to_commit()
        .map_err(|e| IndexError::Message(format!("Failed to read commit: {e}")))?;
    let new_commit = commit.id().to_string();

    let new_managed_path = managed_skill_dir(&inspected, &resolve_store_path(index_options));

    if new_commit == git_source.git_commit && new_managed_path == skill_path {
        let updated_source = ManagedGitSource {
            git_commit: new_commit,
            recorded_unix_ms: now_unix_ms(),
            ..git_source
        };
        upsert_git_source_record(&connection, &updated_source)?;
        return Ok(managed_skill);
    }

    let variant_label = managed_skill
        .variant_label
        .clone()
        .unwrap_or_else(|| build_suggested_version_label(&inspected));
    let updated_source = ManagedGitSource {
        managed_skill_path: new_managed_path.clone(),
        git_commit: new_commit,
        recorded_unix_ms: now_unix_ms(),
        ..git_source
    };

    import_skill_from_candidate_with_variant(
        &inspected,
        &updated_source.git_url,
        index_options,
        Some(&variant_label),
        Some(&updated_source),
    )
}

fn hash_file(path: &Path) -> Result<String, IndexError> {
    let mut hasher = Sha256::new();
    let mut file = fs::File::open(path)?;
    let mut buffer = [0_u8; 8192];
    loop {
        let bytes_read = file
            .read(&mut buffer)
            .map_err(|e| IndexError::Message(e.to_string()))?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

fn compute_unified_diff(left_content: &str, right_content: &str) -> String {
    let left_lines: Vec<_> = left_content.lines().collect();
    let right_lines: Vec<_> = right_content.lines().collect();

    let mut output = String::new();
    let mut i = 0;
    let mut j = 0;

    while i < left_lines.len() || j < right_lines.len() {
        if i < left_lines.len() && j < right_lines.len() && left_lines[i] == right_lines[j] {
            output.push(' ');
            output.push_str(left_lines[i]);
            output.push('\n');
            i += 1;
            j += 1;
        } else if i < left_lines.len() {
            output.push('-');
            output.push_str(left_lines[i]);
            output.push('\n');
            i += 1;
        } else if j < right_lines.len() {
            output.push('+');
            output.push_str(right_lines[j]);
            output.push('\n');
            j += 1;
        }
    }

    output
}

pub fn diff_skill_directories(
    left_path: PathBuf,
    right_path: PathBuf,
) -> Result<SkillDirectoryDiff, IndexError> {
    let left_files = collect_relative_files(&left_path)?;
    let right_files = collect_relative_files(&right_path)?;

    let all_files: std::collections::BTreeSet<_> = left_files
        .iter()
        .chain(right_files.iter())
        .cloned()
        .collect();

    let mut file_diffs = Vec::new();

    for relative_path in all_files {
        let left_exists = left_files.contains(&relative_path);
        let right_exists = right_files.contains(&relative_path);

        let kind = if left_exists && right_exists {
            let left_hash = hash_file(&left_path.join(&relative_path))?;
            let right_hash = hash_file(&right_path.join(&relative_path))?;
            if left_hash == right_hash {
                SkillFileDiffKind::Unchanged
            } else {
                SkillFileDiffKind::Modified
            }
        } else if left_exists {
            SkillFileDiffKind::Removed
        } else {
            SkillFileDiffKind::Added
        };

        let left_hash = left_exists
            .then(|| hash_file(&left_path.join(&relative_path)).ok())
            .flatten();
        let right_hash = right_exists
            .then(|| hash_file(&right_path.join(&relative_path)).ok())
            .flatten();

        let unified_diff = if matches!(kind, SkillFileDiffKind::Modified) {
            let left_content = fs::read_to_string(left_path.join(&relative_path)).ok();
            let right_content = fs::read_to_string(right_path.join(&relative_path)).ok();
            if let (Some(l), Some(r)) = (left_content, right_content) {
                Some(compute_unified_diff(&l, &r))
            } else {
                None
            }
        } else {
            None
        };

        file_diffs.push(SkillFileDiff {
            relative_path,
            kind,
            left_hash,
            right_hash,
            unified_diff,
        });
    }

    Ok(SkillDirectoryDiff {
        left_path,
        right_path,
        file_diffs,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        adopt_skill, default_index_path, install_managed_skill, load_discovery_report,
        load_install_target_inventory, load_managed_skill_history, load_managed_skill_origins,
        load_skill_index, load_skill_install_statuses, promote_managed_skill_variant,
        refresh_skill_index, remove_managed_skill_install, sync_install_target,
        update_managed_skill_variant_label,
    };
    use crate::{
        IndexOptions, InstallHealthState, InstallMethod, InstallTargetHealthState, ScanOptions,
        SkillScope, SkillSourceType,
    };
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn missing_index_returns_empty_summary() {
        let temp = TempDir::new().expect("temp");
        let snapshot = load_skill_index(
            &ScanOptions::default(),
            &IndexOptions {
                index_path: Some(temp.path().join("missing.sqlite3")),
                discover_full_disk: false,
                ..Default::default()
            },
        )
        .expect("load cache");

        assert!(snapshot.summary.skills.is_empty());
        assert!(!snapshot.index.exists);
        assert!(snapshot.index.stale);
    }

    #[test]
    fn refresh_persists_summary_to_sqlite() {
        let home = TempDir::new().expect("home dir");
        let project = TempDir::new().expect("project dir");
        let index_dir = TempDir::new().expect("index dir");
        let store_dir = TempDir::new().expect("store dir");
        write_skill(
            &home.path().join(".codex/skills/doc"),
            "doc",
            "Word and document helpers",
        );
        write_skill(
            &project.path().join(".agents/skills/project-sync"),
            "project-sync",
            "Project scoped sync helper",
        );

        let snapshot = refresh_skill_index(
            &ScanOptions {
                project_root: Some(project.path().to_path_buf()),
                home_dir: Some(home.path().to_path_buf()),
            },
            &IndexOptions {
                index_path: Some(index_dir.path().join("index.sqlite3")),
                store_path: Some(store_dir.path().join("store")),
                discover_full_disk: false,
                ..Default::default()
            },
        )
        .expect("refresh cache");

        assert_eq!(snapshot.summary.skills.len(), 2);
        assert!(snapshot.index.exists);
        assert!(!snapshot.index.stale);

        let loaded = load_skill_index(
            &ScanOptions {
                project_root: Some(project.path().to_path_buf()),
                home_dir: Some(home.path().to_path_buf()),
            },
            &IndexOptions {
                index_path: Some(index_dir.path().join("index.sqlite3")),
                store_path: Some(store_dir.path().join("store")),
                discover_full_disk: false,
                ..Default::default()
            },
        )
        .expect("load cache");

        assert_eq!(loaded.summary.skills.len(), 2);
        assert!(loaded.index.exists);
    }

    #[test]
    fn full_disk_refresh_discovers_hidden_project_skill_without_project_root() {
        let home = TempDir::new().expect("home dir");
        let index_dir = TempDir::new().expect("index dir");
        let store_dir = TempDir::new().expect("store dir");
        write_skill(
            &home
                .path()
                .join("code/demo-project/.agents/skills/local-helper"),
            "local-helper",
            "Hidden project skill",
        );

        let snapshot = refresh_skill_index(
            &ScanOptions {
                project_root: None,
                home_dir: Some(home.path().to_path_buf()),
            },
            &IndexOptions {
                index_path: Some(index_dir.path().join("index.sqlite3")),
                store_path: Some(store_dir.path().join("store")),
                discover_full_disk: true,
                ..Default::default()
            },
        )
        .expect("refresh cache");

        assert!(snapshot.summary.skills.iter().any(|skill| {
            skill.scope == SkillScope::Project
                && skill.path.ends_with("local-helper")
                && skill.source_type == SkillSourceType::Disk
        }));
    }

    #[test]
    fn adopt_copies_disk_skill_into_managed_store() {
        let home = TempDir::new().expect("home dir");
        let index_dir = TempDir::new().expect("index dir");
        let store_dir = TempDir::new().expect("store dir");
        let skill_dir = home.path().join(".codex/skills/doc");
        write_skill(&skill_dir, "doc", "Word and document helpers");

        let scan_options = ScanOptions {
            project_root: None,
            home_dir: Some(home.path().to_path_buf()),
        };
        let index_options = IndexOptions {
            index_path: Some(index_dir.path().join("index.sqlite3")),
            store_path: Some(store_dir.path().join("store")),
            discover_full_disk: false,
            ..Default::default()
        };

        refresh_skill_index(&scan_options, &index_options).expect("refresh cache");
        let adopted = adopt_skill(skill_dir.clone(), &scan_options, &index_options)
            .expect("adopt disk skill");
        assert_eq!(adopted.source_type, SkillSourceType::Import);
        assert!(adopted.path.exists());
        assert!(adopted.skill_md.exists());

        let refreshed = refresh_skill_index(&scan_options, &index_options).expect("refresh");
        assert!(
            refreshed
                .summary
                .skills
                .iter()
                .any(|skill| skill.source_type == SkillSourceType::Import)
        );
    }

    #[test]
    fn default_index_path_uses_app_support_name() {
        let path = default_index_path();
        let path_string = path.to_string_lossy();
        assert!(path_string.contains("skill-manager"));
        assert!(path_string.ends_with("index.sqlite3"));
    }

    #[test]
    fn adopt_records_origin_for_managed_skill() {
        let home = TempDir::new().expect("home dir");
        let index_dir = TempDir::new().expect("index dir");
        let store_dir = TempDir::new().expect("store dir");
        let skill_dir = home.path().join(".claude/skills/reviewer");
        write_skill(&skill_dir, "reviewer", "Review helper");

        let scan_options = ScanOptions {
            project_root: None,
            home_dir: Some(home.path().to_path_buf()),
        };
        let index_options = IndexOptions {
            index_path: Some(index_dir.path().join("index.sqlite3")),
            store_path: Some(store_dir.path().join("store")),
            discover_full_disk: false,
            ..Default::default()
        };

        refresh_skill_index(&scan_options, &index_options).expect("refresh cache");
        let adopted =
            adopt_skill(skill_dir.clone(), &scan_options, &index_options).expect("adopt skill");
        let origins =
            load_managed_skill_origins(adopted.path.clone(), &index_options).expect("origins");

        assert_eq!(origins.len(), 1);
        assert_eq!(origins[0].origin, skill_dir.to_string_lossy());
        assert_eq!(origins[0].source_type, SkillSourceType::Disk);
    }

    #[test]
    fn install_and_remove_managed_skill_updates_live_status() {
        let home = TempDir::new().expect("home dir");
        let project = TempDir::new().expect("project dir");
        let index_dir = TempDir::new().expect("index dir");
        let store_dir = TempDir::new().expect("store dir");
        let skill_dir = home.path().join(".codex/skills/doc");
        write_skill(&skill_dir, "doc", "Word and document helpers");

        let scan_options = ScanOptions {
            project_root: Some(project.path().to_path_buf()),
            home_dir: Some(home.path().to_path_buf()),
        };
        let index_options = IndexOptions {
            index_path: Some(index_dir.path().join("index.sqlite3")),
            store_path: Some(store_dir.path().join("store")),
            discover_full_disk: false,
            ..Default::default()
        };

        refresh_skill_index(&scan_options, &index_options).expect("refresh");
        let adopted = adopt_skill(skill_dir, &scan_options, &index_options).expect("adopt");
        refresh_skill_index(&scan_options, &index_options).expect("refresh after adopt");

        let before =
            load_skill_install_statuses(adopted.path.clone(), &scan_options, &index_options)
                .expect("status before");
        let project_target = before
            .iter()
            .find(|status| status.scope == SkillScope::Project)
            .expect("project target");
        assert_eq!(
            project_target.health_state,
            InstallHealthState::MissingTarget
        );

        let after_install = install_managed_skill(
            adopted.path.clone(),
            project_target.target_root.clone(),
            None,
            None,
            &scan_options,
            &index_options,
        )
        .expect("install");
        let installed_status = after_install
            .iter()
            .find(|status| status.target_root == project_target.target_root)
            .expect("installed status");
        assert_eq!(installed_status.health_state, InstallHealthState::Healthy);
        assert_eq!(
            installed_status.install_method,
            Some(InstallMethod::Symlink)
        );
        assert!(installed_status.install_path.exists());

        let after_remove = remove_managed_skill_install(
            adopted.path.clone(),
            project_target.target_root.clone(),
            &scan_options,
            &index_options,
        )
        .expect("remove");
        let removed_status = after_remove
            .iter()
            .find(|status| status.target_root == project_target.target_root)
            .expect("removed status");
        assert_eq!(
            removed_status.health_state,
            InstallHealthState::NotInstalled
        );
        assert!(!removed_status.install_path.exists());
    }

    #[test]
    fn discovery_report_groups_exact_duplicates_and_variants() {
        let home = TempDir::new().expect("home dir");
        let index_dir = TempDir::new().expect("index dir");
        let store_dir = TempDir::new().expect("store dir");
        write_skill(
            &home
                .path()
                .join("code/app-one/.agents/skills/frontend-design"),
            "frontend-design",
            "UI system skill",
        );
        write_skill(
            &home
                .path()
                .join("code/app-two/.agents/skills/frontend-design"),
            "frontend-design",
            "UI system skill",
        );
        write_skill(
            &home
                .path()
                .join("code/app-three/.agents/skills/frontend-design-v2"),
            "frontend-design",
            "UI system skill variant",
        );

        let scan_options = ScanOptions {
            project_root: None,
            home_dir: Some(home.path().to_path_buf()),
        };
        let index_options = IndexOptions {
            index_path: Some(index_dir.path().join("index.sqlite3")),
            store_path: Some(store_dir.path().join("store")),
            discover_full_disk: true,
            ..Default::default()
        };

        refresh_skill_index(&scan_options, &index_options).expect("refresh");
        let report = load_discovery_report(&scan_options, &index_options).expect("report");

        assert_eq!(report.summary.family_count, 1);
        assert_eq!(report.summary.variant_family_count, 1);

        let family = report.all_groups.first().expect("family");
        assert_eq!(family.display_name, "frontend-design");
        assert_eq!(family.variant_count, 2);
        assert_eq!(family.occurrence_count, 3);
        assert!(
            family
                .candidates
                .iter()
                .any(|candidate| candidate.occurrence_count == 2)
        );
        assert!(
            family
                .candidates
                .iter()
                .any(|candidate| candidate.occurrence_count == 1)
        );
    }

    #[test]
    fn target_inventory_tracks_recorded_installs_and_syncs_missing_links() {
        let home = TempDir::new().expect("home dir");
        let project = TempDir::new().expect("project dir");
        let index_dir = TempDir::new().expect("index dir");
        let store_dir = TempDir::new().expect("store dir");
        let skill_dir = home.path().join(".codex/skills/doc");
        write_skill(&skill_dir, "doc", "Word and document helpers");

        let scan_options = ScanOptions {
            project_root: Some(project.path().to_path_buf()),
            home_dir: Some(home.path().to_path_buf()),
        };
        let index_options = IndexOptions {
            index_path: Some(index_dir.path().join("index.sqlite3")),
            store_path: Some(store_dir.path().join("store")),
            discover_full_disk: false,
            ..Default::default()
        };

        refresh_skill_index(&scan_options, &index_options).expect("refresh");
        let adopted = adopt_skill(skill_dir, &scan_options, &index_options).expect("adopt");
        refresh_skill_index(&scan_options, &index_options).expect("refresh after adopt");

        let statuses =
            load_skill_install_statuses(adopted.path.clone(), &scan_options, &index_options)
                .expect("statuses");
        let project_target = statuses
            .iter()
            .find(|status| status.scope == SkillScope::Project)
            .expect("project target");

        fs::create_dir_all(&project_target.target_root).expect("project target root");
        install_managed_skill(
            adopted.path.clone(),
            project_target.target_root.clone(),
            None,
            None,
            &scan_options,
            &index_options,
        )
        .expect("install");

        let inventories =
            load_install_target_inventory(&scan_options, &index_options).expect("inventories");
        let target = inventories
            .iter()
            .find(|inventory| inventory.path == project_target.target_root)
            .expect("target inventory");
        assert_eq!(target.managed_install_count, 1);
        assert_eq!(target.health_state, InstallTargetHealthState::Healthy);

        fs::remove_file(project_target.install_path.clone()).expect("remove symlink");

        let broken_inventories =
            load_install_target_inventory(&scan_options, &index_options).expect("broken");
        let broken_target = broken_inventories
            .iter()
            .find(|inventory| inventory.path == project_target.target_root)
            .expect("broken target");
        assert_eq!(broken_target.needs_attention_count, 1);
        assert_eq!(
            broken_target.health_state,
            InstallTargetHealthState::Warning
        );

        let repaired = sync_install_target(
            project_target.target_root.clone(),
            &scan_options,
            &index_options,
        )
        .expect("sync target");
        let repaired_target = repaired
            .iter()
            .find(|inventory| inventory.path == project_target.target_root)
            .expect("repaired target");
        assert_eq!(
            repaired_target.health_state,
            InstallTargetHealthState::Healthy
        );
        assert!(project_target.install_path.exists());
    }

    #[test]
    fn managed_variant_label_persists_and_round_trips_into_library_index() {
        let home = TempDir::new().expect("home dir");
        let index_dir = TempDir::new().expect("index dir");
        let store_dir = TempDir::new().expect("store dir");
        let skill_dir = home.path().join(".codex/skills/doc");
        write_skill(&skill_dir, "doc", "Word and document helpers");

        let scan_options = ScanOptions {
            project_root: None,
            home_dir: Some(home.path().to_path_buf()),
        };
        let index_options = IndexOptions {
            index_path: Some(index_dir.path().join("index.sqlite3")),
            store_path: Some(store_dir.path().join("store")),
            discover_full_disk: false,
            ..Default::default()
        };

        refresh_skill_index(&scan_options, &index_options).expect("refresh");
        let adopted = adopt_skill(skill_dir, &scan_options, &index_options).expect("adopt");
        refresh_skill_index(&scan_options, &index_options).expect("refresh after adopt");

        let loaded = load_skill_index(&scan_options, &index_options).expect("loaded");
        let managed = loaded
            .summary
            .skills
            .iter()
            .find(|skill| skill.path == adopted.path)
            .expect("managed skill");
        assert_eq!(managed.variant_label.as_deref(), Some("global-codex"));

        update_managed_skill_variant_label(
            adopted.path.clone(),
            "stable-v2".to_string(),
            &scan_options,
            &index_options,
        )
        .expect("update variant label");

        let updated = load_skill_index(&scan_options, &index_options).expect("updated");
        let managed = updated
            .summary
            .skills
            .iter()
            .find(|skill| skill.path == adopted.path)
            .expect("managed skill");
        assert_eq!(managed.variant_label.as_deref(), Some("stable-v2"));
    }

    #[test]
    fn first_adopt_becomes_family_default_and_history_is_recorded() {
        let home = TempDir::new().expect("home dir");
        let index_dir = TempDir::new().expect("index dir");
        let store_dir = TempDir::new().expect("store dir");
        let skill_dir = home.path().join(".codex/skills/doc");
        write_skill(&skill_dir, "doc", "Word and document helpers");

        let scan_options = ScanOptions {
            project_root: None,
            home_dir: Some(home.path().to_path_buf()),
        };
        let index_options = IndexOptions {
            index_path: Some(index_dir.path().join("index.sqlite3")),
            store_path: Some(store_dir.path().join("store")),
            discover_full_disk: false,
            ..Default::default()
        };

        refresh_skill_index(&scan_options, &index_options).expect("refresh");
        let adopted = adopt_skill(skill_dir, &scan_options, &index_options).expect("adopt");
        refresh_skill_index(&scan_options, &index_options).expect("refresh after adopt");

        let history =
            load_managed_skill_history(adopted.path.clone(), &scan_options, &index_options)
                .expect("history");
        assert_eq!(history.variants.len(), 1);
        assert_eq!(
            history.promoted_managed_skill_path.as_ref(),
            Some(&adopted.path)
        );
        assert_eq!(
            history.variants[0].revisions[0].managed_skill_path,
            adopted.path
        );
        assert!(history.variants[0].revisions[0].is_promoted);
    }

    #[test]
    fn promote_variant_marks_family_default_and_install_status() {
        let home = TempDir::new().expect("home dir");
        let index_dir = TempDir::new().expect("index dir");
        let store_dir = TempDir::new().expect("store dir");
        let skill_dir = home.path().join(".codex/skills/doc");
        write_skill(&skill_dir, "doc", "Word and document helpers");

        let scan_options = ScanOptions {
            project_root: None,
            home_dir: Some(home.path().to_path_buf()),
        };
        let index_options = IndexOptions {
            index_path: Some(index_dir.path().join("index.sqlite3")),
            store_path: Some(store_dir.path().join("store")),
            discover_full_disk: false,
            ..Default::default()
        };

        refresh_skill_index(&scan_options, &index_options).expect("refresh");
        let first = adopt_skill(skill_dir.clone(), &scan_options, &index_options).expect("first");
        update_managed_skill_variant_label(
            first.path.clone(),
            "stable".to_string(),
            &scan_options,
            &index_options,
        )
        .expect("rename first");

        fs::write(
            skill_dir.join("SKILL.md"),
            "---\nname: doc\ndescription: Updated doc helper\nuser-invocable: true\n---\n\n# doc\nupdated\n",
        )
        .expect("rewrite skill");
        refresh_skill_index(&scan_options, &index_options).expect("refresh again");
        let second = adopt_skill(skill_dir, &scan_options, &index_options).expect("second");
        update_managed_skill_variant_label(
            second.path.clone(),
            "next".to_string(),
            &scan_options,
            &index_options,
        )
        .expect("rename second");

        promote_managed_skill_variant(second.path.clone(), &scan_options, &index_options)
            .expect("promote");

        let history =
            load_managed_skill_history(second.path.clone(), &scan_options, &index_options)
                .expect("history");
        assert_eq!(
            history.promoted_managed_skill_path.as_ref(),
            Some(&second.path)
        );
        assert_eq!(history.promoted_variant_label.as_deref(), Some("next"));

        let statuses =
            load_skill_install_statuses(second.path.clone(), &scan_options, &index_options)
                .expect("statuses");
        assert!(statuses.iter().all(|status| status.is_family_default));
    }

    fn write_skill(skill_dir: &std::path::Path, name: &str, description: &str) {
        fs::create_dir_all(skill_dir).expect("skill dir");
        fs::write(
            skill_dir.join("SKILL.md"),
            format!(
                "---\nname: {name}\ndescription: {description}\nuser-invocable: true\n---\n\n# {name}\n"
            ),
        )
        .expect("skill file");
    }
}
