use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[serde(rename_all = "snake_case")]
pub enum AgentKind {
    Agent,
    ClaudeCode,
    Codex,
}

impl AgentKind {
    pub fn label(&self) -> &'static str {
        match self {
            Self::Agent => "Agent",
            Self::ClaudeCode => "Claude Code",
            Self::Codex => "Codex",
        }
    }

    pub(crate) fn as_key(&self) -> &'static str {
        match self {
            Self::Agent => "agent",
            Self::ClaudeCode => "claude_code",
            Self::Codex => "codex",
        }
    }

    pub(crate) fn from_key(value: &str) -> Option<Self> {
        match value {
            "agent" => Some(Self::Agent),
            "claude_code" => Some(Self::ClaudeCode),
            "codex" => Some(Self::Codex),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[serde(rename_all = "snake_case")]
pub enum SkillScope {
    Global,
    Project,
}

impl SkillScope {
    pub fn label(&self) -> &'static str {
        match self {
            Self::Global => "Global",
            Self::Project => "Project",
        }
    }

    pub(crate) fn as_key(&self) -> &'static str {
        match self {
            Self::Global => "global",
            Self::Project => "project",
        }
    }

    pub(crate) fn from_key(value: &str) -> Option<Self> {
        match value {
            "global" => Some(Self::Global),
            "project" => Some(Self::Project),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[serde(rename_all = "snake_case")]
pub enum SkillSourceType {
    Disk,
    Import,
    Remote,
}

impl SkillSourceType {
    pub(crate) fn as_key(&self) -> &'static str {
        match self {
            Self::Disk => "disk",
            Self::Import => "import",
            Self::Remote => "remote",
        }
    }

    pub(crate) fn from_key(value: &str) -> Option<Self> {
        match value {
            "disk" => Some(Self::Disk),
            "import" => Some(Self::Import),
            "remote" => Some(Self::Remote),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SkillFileKind {
    Directory,
    File,
    Symlink,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SkillFileNode {
    pub name: String,
    pub path: PathBuf,
    pub relative_path: PathBuf,
    pub kind: SkillFileKind,
    pub children: Vec<SkillFileNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InstallMethod {
    Symlink,
    Copy,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AppErrorKind {
    Io,
    Network,
    NotFound,
    Validation,
    PermissionDenied,
    AlreadyExists,
    Cancelled,
    Unsupported,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AppError {
    pub kind: AppErrorKind,
    pub code: String,
    pub message: String,
}

impl AppError {
    pub fn io(message: impl Into<String>) -> Self {
        Self {
            kind: AppErrorKind::Io,
            code: "io_error".to_string(),
            message: message.into(),
        }
    }

    pub fn network(message: impl Into<String>) -> Self {
        Self {
            kind: AppErrorKind::Network,
            code: "network_error".to_string(),
            message: message.into(),
        }
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self {
            kind: AppErrorKind::NotFound,
            code: "not_found".to_string(),
            message: message.into(),
        }
    }

    pub fn validation(message: impl Into<String>) -> Self {
        Self {
            kind: AppErrorKind::Validation,
            code: "validation_error".to_string(),
            message: message.into(),
        }
    }

    pub fn permission_denied(message: impl Into<String>) -> Self {
        Self {
            kind: AppErrorKind::PermissionDenied,
            code: "permission_denied".to_string(),
            message: message.into(),
        }
    }

    pub fn already_exists(message: impl Into<String>) -> Self {
        Self {
            kind: AppErrorKind::AlreadyExists,
            code: "already_exists".to_string(),
            message: message.into(),
        }
    }

    pub fn cancelled(message: impl Into<String>) -> Self {
        Self {
            kind: AppErrorKind::Cancelled,
            code: "cancelled".to_string(),
            message: message.into(),
        }
    }

    pub fn unsupported(message: impl Into<String>) -> Self {
        Self {
            kind: AppErrorKind::Unsupported,
            code: "unsupported".to_string(),
            message: message.into(),
        }
    }

    pub fn unknown(message: impl Into<String>) -> Self {
        Self {
            kind: AppErrorKind::Unknown,
            code: "unknown_error".to_string(),
            message: message.into(),
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        match error.kind() {
            std::io::ErrorKind::NotFound => Self::not_found(error.to_string()),
            std::io::ErrorKind::PermissionDenied => Self::permission_denied(error.to_string()),
            std::io::ErrorKind::AlreadyExists => Self::already_exists(error.to_string()),
            _ => Self::io(error.to_string()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InstallHealthState {
    NotInstalled,
    Healthy,
    Copied,
    Broken,
    Conflict,
    MissingTarget,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InstallTargetHealthState {
    Healthy,
    Warning,
    Missing,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SkillInstallStatus {
    pub target_id: String,
    pub agent: AgentKind,
    pub scope: SkillScope,
    pub target_root: PathBuf,
    pub install_path: PathBuf,
    pub project_root: Option<PathBuf>,
    pub root_exists: bool,
    pub install_method: Option<InstallMethod>,
    pub health_state: InstallHealthState,
    pub recorded: bool,
    pub pinned: bool,
    pub variant_label: Option<String>,
    pub content_hash: String,
    pub is_family_default: bool,
    pub last_action_unix_ms: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct InstallTargetInventoryItem {
    pub managed_skill_path: PathBuf,
    pub managed_skill_md: PathBuf,
    pub display_name: String,
    pub family_key: String,
    pub variant_label: Option<String>,
    pub content_hash: String,
    pub slug: String,
    pub source_type: SkillSourceType,
    pub install_path: PathBuf,
    pub install_method: Option<InstallMethod>,
    pub health_state: InstallHealthState,
    pub recorded: bool,
    pub pinned: bool,
    pub is_family_default: bool,
    pub last_action_unix_ms: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct InstallTargetInventory {
    pub id: String,
    pub agent: AgentKind,
    pub scope: SkillScope,
    pub path: PathBuf,
    pub exists: bool,
    pub project_root: Option<PathBuf>,
    pub health_state: InstallTargetHealthState,
    pub discovered_skill_count: usize,
    pub managed_install_count: usize,
    pub needs_attention_count: usize,
    pub items: Vec<InstallTargetInventoryItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CustomInstallTarget {
    pub id: i64,
    pub path: PathBuf,
    pub agent: AgentKind,
    pub scope: SkillScope,
    pub label: Option<String>,
    pub created_unix_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ManagedSkillOrigin {
    pub origin: String,
    pub source_type: SkillSourceType,
    pub recorded_unix_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ManagedSkillRevision {
    pub managed_skill_path: PathBuf,
    pub revision_hash: String,
    pub display_name: String,
    pub variant_label: String,
    pub created_unix_ms: i64,
    pub is_promoted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ManagedVariantHistory {
    pub family_key: String,
    pub variant_label: String,
    pub revisions: Vec<ManagedSkillRevision>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ManagedSkillHistory {
    pub family_key: String,
    pub display_name: String,
    pub promoted_managed_skill_path: Option<PathBuf>,
    pub promoted_variant_label: Option<String>,
    pub variants: Vec<ManagedVariantHistory>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ManagedGitSource {
    pub managed_skill_path: PathBuf,
    pub git_url: String,
    pub git_commit: String,
    pub git_branch: Option<String>,
    pub repo_subpath: Option<String>,
    pub recorded_unix_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RemoteUpdateCheck {
    pub managed_skill_path: PathBuf,
    pub current_commit: String,
    pub latest_commit: String,
    pub has_update: bool,
    pub checked_unix_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DiscoveryGroupKind {
    Unique,
    ExactDuplicate,
    Variant,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DiscoveryReviewState {
    Ready,
    NeedsReview,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DiscoveryCandidate {
    pub id: String,
    pub content_hash: String,
    pub occurrence_count: usize,
    pub provenance_paths: Vec<PathBuf>,
    pub representative: InstalledSkill,
    pub suggested_version_label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DiscoveryGroup {
    pub family_key: String,
    pub display_name: String,
    pub kind: DiscoveryGroupKind,
    pub review_state: DiscoveryReviewState,
    pub occurrence_count: usize,
    pub duplicate_count: usize,
    pub variant_count: usize,
    pub candidates: Vec<DiscoveryCandidate>,
    pub recommended_paths: Vec<PathBuf>,
    pub existing_variants: Vec<InstalledSkill>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct DiscoverySummary {
    pub occurrence_count: usize,
    pub exact_duplicate_group_count: usize,
    pub family_count: usize,
    pub variant_family_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct DiscoveryReport {
    pub summary: DiscoverySummary,
    pub all_groups: Vec<DiscoveryGroup>,
    pub unique_groups: Vec<DiscoveryGroup>,
    pub exact_duplicate_groups: Vec<DiscoveryGroup>,
    pub variant_groups: Vec<DiscoveryGroup>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AdoptionResolutionAction {
    Merge,
    CreateVariant,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AdoptionResolution {
    pub source_path: PathBuf,
    pub action: AdoptionResolutionAction,
    pub merge_target_path: Option<PathBuf>,
    pub variant_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SkillComparison {
    pub left: InstalledSkill,
    pub right: InstalledSkill,
    pub left_content: String,
    pub right_content: String,
    pub common_files: Vec<PathBuf>,
    pub left_only_files: Vec<PathBuf>,
    pub right_only_files: Vec<PathBuf>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SkillFileDiffKind {
    Added,
    Removed,
    Modified,
    Unchanged,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SkillFileDiff {
    pub relative_path: PathBuf,
    pub kind: SkillFileDiffKind,
    pub left_hash: Option<String>,
    pub right_hash: Option<String>,
    pub unified_diff: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SkillDirectoryDiff {
    pub left_path: PathBuf,
    pub right_path: PathBuf,
    pub file_diffs: Vec<SkillFileDiff>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct SkillMetadata {
    pub name: Option<String>,
    pub description: Option<String>,
    pub user_invocable: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct InstalledSkill {
    pub source_type: SkillSourceType,
    pub family_key: String,
    pub variant_label: Option<String>,
    pub content_hash: String,
    pub agent: AgentKind,
    pub scope: SkillScope,
    pub slug: String,
    pub display_name: String,
    pub description: Option<String>,
    pub path: PathBuf,
    pub skill_md: PathBuf,
    pub source_root: PathBuf,
    pub project_root: Option<PathBuf>,
    pub metadata: SkillMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanRoot {
    pub agent: AgentKind,
    pub scope: SkillScope,
    pub base_dir: PathBuf,
    pub exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanWarning {
    pub path: Option<PathBuf>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ScanSummary {
    pub roots: Vec<ScanRoot>,
    pub skills: Vec<InstalledSkill>,
    pub warnings: Vec<ScanWarning>,
}

#[derive(Debug, Clone, Default)]
pub struct ScanOptions {
    pub project_root: Option<PathBuf>,
    pub home_dir: Option<PathBuf>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexStatus {
    pub index_path: PathBuf,
    pub exists: bool,
    pub stale: bool,
    pub last_refresh_unix_ms: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexedScanSummary {
    pub summary: ScanSummary,
    pub index: IndexStatus,
}

#[derive(Debug, Clone)]
pub struct IndexOptions {
    pub index_path: Option<PathBuf>,
    pub store_path: Option<PathBuf>,
    pub stale_after_secs: Option<u64>,
    pub discover_full_disk: bool,
}

impl Default for IndexOptions {
    fn default() -> Self {
        Self {
            index_path: None,
            store_path: None,
            stale_after_secs: None,
            discover_full_disk: true,
        }
    }
}

#[derive(Debug, Clone)]
pub(crate) struct RootSpec {
    pub agent: AgentKind,
    pub scope: SkillScope,
    pub base_dir: PathBuf,
}

impl From<&RootSpec> for ScanRoot {
    fn from(value: &RootSpec) -> Self {
        Self {
            agent: value.agent.clone(),
            scope: value.scope.clone(),
            exists: value.base_dir.exists(),
            base_dir: value.base_dir.clone(),
        }
    }
}

#[derive(Debug, Clone)]
pub(crate) struct SkillDescriptor {
    pub source_type: SkillSourceType,
    pub agent: AgentKind,
    pub scope: SkillScope,
    pub skill_dir: PathBuf,
    pub skill_md: PathBuf,
    pub source_root: PathBuf,
    pub project_root: Option<PathBuf>,
}
