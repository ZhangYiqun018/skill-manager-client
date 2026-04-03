import type { AgentKind, DiscoveryRecord, SkillScope, SkillSourceType } from "./core";

export type AppTab = "library" | "discover" | "targets" | "settings";
export type AgentFilter = "all" | AgentKind;
export type ScopeFilter = "all" | SkillScope;
export type SourceFilter = "all" | SkillSourceType;
export type DiscoveryPreset =
  | "recommended"
  | "project"
  | "codex"
  | "claude_code";
export type DiscoveryGroupKind = "unique" | "exact_duplicate" | "variant";

export interface DiscoveryGroup {
  family_key: string;
  display_name: string;
  kind: DiscoveryGroupKind;
  duplicate_count: number;
  variant_count: number;
  items: DiscoveryRecord[];
  recommended_paths: string[];
}
