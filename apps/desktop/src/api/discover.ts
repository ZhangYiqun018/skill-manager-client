import { invoke } from "@tauri-apps/api/core";
import type {
  AdoptionResolution,
  AgentKind,
  DiscoveryReport,
  IndexedScanSummary,
  RegistrySearchResponse,
  SkillScope,
} from "../types";
import { refreshLibrarySnapshot } from "./library";

export async function scanDisk() {
  return refreshLibrarySnapshot();
}

export async function loadDiscoveryReport(): Promise<DiscoveryReport> {
  return invoke<DiscoveryReport>("load_discovery_report");
}

export async function adoptSkill(path: string): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("adopt_skill", { path });
}

export async function adoptSkills(paths: string[]): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("adopt_skills", { paths });
}

export async function applyAdoptionResolutions(
  resolutions: AdoptionResolution[],
): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("apply_adoption_resolutions", { resolutions });
}

export async function importLocalSkillFolder(
  path: string,
  agent: AgentKind,
  scope: SkillScope,
): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("import_local_skill_folder", {
    path,
    agent,
    scope,
  });
}

export async function searchSkillsRegistry(
  query: string,
): Promise<RegistrySearchResponse> {
  return invoke<RegistrySearchResponse>("search_skills_registry", { query });
}

export async function adoptRegistrySkill(
  source: string,
  skillId: string,
  registryId: string,
  agent: AgentKind,
  scope: SkillScope,
): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("adopt_registry_skill", {
    source,
    skill_id: skillId,
    registry_id: registryId,
    agent,
    scope,
  });
}


