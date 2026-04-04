import type { AgentKind, DiscoveryRecord, SkillScope, SkillSourceType } from "./core";
import type { InstalledSkill } from "./core";

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
export type DiscoveryReviewState = "ready" | "needs_review";

export interface DiscoveryCandidate {
  id: string;
  content_hash: string;
  occurrence_count: number;
  provenance_paths: string[];
  representative: DiscoveryRecord;
  suggested_version_label: string;
}

export interface DiscoveryGroup {
  family_key: string;
  display_name: string;
  kind: DiscoveryGroupKind;
  review_state: DiscoveryReviewState;
  occurrence_count: number;
  duplicate_count: number;
  variant_count: number;
  candidates: DiscoveryCandidate[];
  recommended_paths: string[];
  existing_variants: InstalledSkill[];
}

export interface DiscoverySummary {
  occurrence_count: number;
  exact_duplicate_group_count: number;
  family_count: number;
  variant_family_count: number;
}

export interface DiscoveryReport {
  summary: DiscoverySummary;
  all_groups: DiscoveryGroup[];
  unique_groups: DiscoveryGroup[];
  exact_duplicate_groups: DiscoveryGroup[];
  variant_groups: DiscoveryGroup[];
}

export interface RegistrySkillResult {
  id: string;
  skillId: string;
  name: string;
  installs: number;
  source: string;
}

export interface RegistrySearchResponse {
  query: string;
  skills: RegistrySkillResult[];
  count: number;
}
