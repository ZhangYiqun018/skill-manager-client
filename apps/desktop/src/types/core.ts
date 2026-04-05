export type AgentKind = "agent" | "claude_code" | "codex";
export type SkillScope = "global" | "project";
export type SkillSourceType = "disk" | "import" | "remote";

export type AppErrorKind =
  | "io"
  | "network"
  | "not_found"
  | "validation"
  | "permission_denied"
  | "already_exists"
  | "cancelled"
  | "unsupported"
  | "unknown";

export interface AppError {
  kind: AppErrorKind;
  code: string;
  message: string;
}
export type HealthState = "healthy" | "warning" | "missing";
export type SkillFileKind = "directory" | "file" | "symlink";
export type InstallMethod = "symlink" | "copy";
export type InstallHealthState =
  | "not_installed"
  | "healthy"
  | "copied"
  | "broken"
  | "conflict"
  | "missing_target";
export type InstallTargetHealthState = "healthy" | "warning" | "missing";

export interface SkillMetadata {
  name?: string | null;
  description?: string | null;
  user_invocable?: boolean | null;
}

export interface InstalledSkill {
  source_type: SkillSourceType;
  family_key: string;
  variant_label?: string | null;
  content_hash: string;
  agent: AgentKind;
  scope: SkillScope;
  slug: string;
  display_name: string;
  description?: string | null;
  path: string;
  skill_md: string;
  source_root: string;
  project_root?: string | null;
  metadata: SkillMetadata;
}

export interface SkillItem extends InstalledSkill {
  health_state: Exclude<HealthState, "missing">;
  warning_count: number;
}

export interface DiscoveryRecord extends InstalledSkill {
  discovered_at?: number | null;
}

export interface ScanRoot {
  agent: AgentKind;
  scope: SkillScope;
  base_dir: string;
  exists: boolean;
}

export interface ScanWarning {
  path?: string | null;
  message: string;
}

export interface ScanSummary {
  roots: ScanRoot[];
  skills: InstalledSkill[];
  warnings: ScanWarning[];
}

export interface IndexStatus {
  index_path: string;
  exists: boolean;
  stale: boolean;
  last_refresh_unix_ms?: number | null;
}

export interface IndexedScanSummary {
  summary: ScanSummary;
  index: IndexStatus;
}

export interface InstallTargetRecord {
  id: string;
  agent: AgentKind;
  scope: SkillScope;
  path: string;
  exists: boolean;
  health_state: HealthState;
  skill_count: number;
}

export interface SkillFileNode {
  name: string;
  path: string;
  relative_path: string;
  kind: SkillFileKind;
  children: SkillFileNode[];
}

export interface SkillInstallStatus {
  target_id: string;
  agent: AgentKind;
  scope: SkillScope;
  target_root: string;
  install_path: string;
  project_root?: string | null;
  root_exists: boolean;
  install_method?: InstallMethod | null;
  health_state: InstallHealthState;
  recorded: boolean;
  pinned: boolean;
  variant_label?: string | null;
  content_hash: string;
  is_family_default: boolean;
  last_action_unix_ms?: number | null;
}

export interface InstallTargetInventoryItem {
  managed_skill_path: string;
  managed_skill_md: string;
  display_name: string;
  family_key: string;
  variant_label?: string | null;
  content_hash: string;
  slug: string;
  source_type: SkillSourceType;
  install_path: string;
  install_method?: InstallMethod | null;
  health_state: InstallHealthState;
  recorded: boolean;
  pinned: boolean;
  is_family_default: boolean;
  last_action_unix_ms?: number | null;
}

export interface InstallTargetInventory {
  id: string;
  agent: AgentKind;
  scope: SkillScope;
  path: string;
  exists: boolean;
  project_root?: string | null;
  health_state: InstallTargetHealthState;
  discovered_skill_count: number;
  managed_install_count: number;
  needs_attention_count: number;
  items: InstallTargetInventoryItem[];
}

export interface CustomInstallTarget {
  id: number;
  path: string;
  agent: AgentKind;
  scope: SkillScope;
  label?: string | null;
  created_unix_ms: number;
}

export interface ManagedSkillOrigin {
  origin: string;
  source_type: SkillSourceType;
  recorded_unix_ms: number;
}

export interface ManagedSkillRevision {
  managed_skill_path: string;
  revision_hash: string;
  display_name: string;
  variant_label: string;
  created_unix_ms: number;
  is_promoted: boolean;
}

export interface ManagedVariantHistory {
  family_key: string;
  variant_label: string;
  revisions: ManagedSkillRevision[];
}

export interface ManagedSkillHistory {
  family_key: string;
  display_name: string;
  promoted_managed_skill_path?: string | null;
  promoted_variant_label?: string | null;
  variants: ManagedVariantHistory[];
}

export type AdoptionResolutionAction = "merge" | "create_variant";

export interface AdoptionResolution {
  source_path: string;
  action: AdoptionResolutionAction;
  merge_target_path?: string | null;
  variant_label?: string | null;
}

export interface SkillComparison {
  left: InstalledSkill;
  right: InstalledSkill;
  left_content: string;
  right_content: string;
  common_files: string[];
  left_only_files: string[];
  right_only_files: string[];
}

export type SkillFileDiffKind = "added" | "removed" | "modified" | "unchanged";

export interface SkillFileDiff {
  relative_path: string;
  kind: SkillFileDiffKind;
  left_hash?: string | null;
  right_hash?: string | null;
  unified_diff?: string | null;
}

export interface SkillDirectoryDiff {
  left_path: string;
  right_path: string;
  file_diffs: SkillFileDiff[];
}

export interface ManagedGitSource {
  managed_skill_path: string;
  git_url: string;
  git_commit: string;
  git_branch?: string | null;
  repo_subpath?: string | null;
  recorded_unix_ms: number;
}

export interface RemoteUpdateCheck {
  managed_skill_path: string;
  current_commit: string;
  latest_commit: string;
  has_update: boolean;
  checked_unix_ms: number;
}
