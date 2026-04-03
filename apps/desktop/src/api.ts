import { invoke } from "@tauri-apps/api/core";
import type {
  IndexedScanSummary,
  ScanSummary,
  SkillContentPayload,
} from "./types";

export async function scanLocalSkills(projectRoot?: string): Promise<ScanSummary> {
  return invoke<ScanSummary>("scan_local_skills", {
    projectRoot: projectRoot ?? null,
  });
}

export async function loadSkillIndex(
  projectRoot?: string,
): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("load_skill_index", {
    projectRoot: projectRoot ?? null,
  });
}

export async function refreshSkillIndex(
  projectRoot?: string,
): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("refresh_skill_index", {
    projectRoot: projectRoot ?? null,
  });
}

export async function readSkillContent(
  path: string,
  projectRoot?: string,
): Promise<SkillContentPayload> {
  return invoke<SkillContentPayload>("read_skill_content", {
    path,
    projectRoot: projectRoot ?? null,
  });
}

export async function openInFinder(path: string, projectRoot?: string): Promise<void> {
  return invoke("open_in_finder", {
    path,
    projectRoot: projectRoot ?? null,
  });
}
