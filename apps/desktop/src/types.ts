export type AgentKind = "claude_code" | "codex";
export type SkillScope = "global" | "project";
export type AppTab = "skills" | "directories" | "settings";
export type AgentFilter = "all" | AgentKind;
export type ScopeFilter = "all" | SkillScope;

export interface SkillMetadata {
  name?: string | null;
  description?: string | null;
  user_invocable?: boolean | null;
}

export interface InstalledSkill {
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

export interface SkillContentPayload {
  content: string;
}
