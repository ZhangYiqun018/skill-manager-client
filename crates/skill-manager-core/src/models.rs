use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[serde(rename_all = "snake_case")]
pub enum AgentKind {
    ClaudeCode,
    Codex,
}

impl AgentKind {
    pub fn label(&self) -> &'static str {
        match self {
            Self::ClaudeCode => "Claude Code",
            Self::Codex => "Codex",
        }
    }

    pub(crate) fn as_key(&self) -> &'static str {
        match self {
            Self::ClaudeCode => "claude_code",
            Self::Codex => "codex",
        }
    }

    pub(crate) fn from_key(value: &str) -> Option<Self> {
        match value {
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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SkillMetadata {
    pub name: Option<String>,
    pub description: Option<String>,
    pub user_invocable: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledSkill {
    pub source_type: SkillSourceType,
    pub family_key: String,
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
