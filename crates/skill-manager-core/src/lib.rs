mod index;
mod models;
mod scan;

pub use index::{
    IndexError, add_custom_target, adopt_skill, adopt_skills, agent_install_prefix,
    apply_adoption_resolutions, check_managed_skill_updates, compare_skills, default_data_root,
    default_index_path, default_repo_cache_path, default_store_path, diff_skill_directories,
    export_skills_by_tags, import_git_skill, import_skill_directory, install_managed_skill,
    load_custom_targets, load_discovery_report, load_install_target_inventory,
    load_managed_git_source, load_managed_skill_history, load_managed_skill_origins,
    load_skill_file_tree, load_skill_index, load_skill_install_statuses,
    promote_managed_skill_variant, read_skill_text_file, refresh_skill_index, remove_custom_target,
    remove_managed_skill_install, repair_install_target, repair_managed_skill_install,
    set_skill_tags, sync_install_target, update_managed_skill_from_git,
    update_managed_skill_variant_label,
};
pub use models::{
    AdoptionResolution, AdoptionResolutionAction, AgentKind, AppError, AppErrorKind,
    CustomInstallTarget, DiscoveryCandidate, DiscoveryGroup, DiscoveryGroupKind, DiscoveryReport,
    DiscoveryReviewState, DiscoverySummary, IndexOptions, IndexStatus, IndexedScanSummary,
    InstallHealthState, InstallMethod, InstallTargetHealthState, InstallTargetInventory,
    InstallTargetInventoryItem, InstalledSkill, ManagedGitSource, ManagedSkillHistory,
    ManagedSkillOrigin, ManagedSkillRevision, ManagedVariantHistory, RemoteUpdateCheck,
    ScanOptions, ScanRoot, ScanSummary, ScanWarning, SkillComparison, SkillDirectoryDiff,
    SkillFileDiff, SkillFileDiffKind, SkillFileKind, SkillFileNode, SkillInstallStatus,
    SkillMetadata, SkillScope, SkillSourceType,
};
pub use scan::scan_local_skills;
