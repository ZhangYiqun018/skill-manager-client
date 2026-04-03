export type AgentKind = "claude_code" | "codex";
export type SkillScope = "global" | "project";
export type SkillSourceType = "disk" | "import" | "remote";
export type HealthState = "healthy" | "warning" | "missing";

export interface SkillMetadata {
  name?: string | null;
  description?: string | null;
  user_invocable?: boolean | null;
}

export interface InstalledSkill {
  source_type: SkillSourceType;
  family_key: string;
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
