import { invoke } from "@tauri-apps/api/core";
import type {
  AgentKind,
  IndexedScanSummary,
  ManagedGitSource,
  ManagedSkillHistory,
  ManagedSkillOrigin,
  RemoteUpdateCheck,
  SkillComparison,
  SkillDirectoryDiff,
  SkillFileNode,
  SkillInstallStatus,
} from "../types";

export async function loadLibrarySnapshot(): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("load_skill_index");
}

export async function refreshLibrarySnapshot(): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("refresh_skill_index");
}

export async function loadSkillFileTree(path: string): Promise<SkillFileNode> {
  return invoke<SkillFileNode>("load_skill_file_tree", { path });
}

export async function loadSkillInstallStatuses(path: string): Promise<SkillInstallStatus[]> {
  return invoke<SkillInstallStatus[]>("load_skill_install_statuses", { path });
}

export async function installSkillToTarget(
  path: string,
  targetRoot: string,
  agent?: AgentKind,
  method?: "symlink" | "copy"
): Promise<SkillInstallStatus[]> {
  return invoke<SkillInstallStatus[]>("install_managed_skill", {
    path,
    targetRoot,
    agent: agent ?? null,
    method: method ?? null,
  });
}

export async function removeSkillFromTarget(
  path: string,
  targetRoot: string
): Promise<SkillInstallStatus[]> {
  return invoke<SkillInstallStatus[]>("remove_managed_skill_install", {
    path,
    targetRoot,
  });
}

export async function repairSkillTarget(
  path: string,
  targetRoot: string
): Promise<SkillInstallStatus[]> {
  return invoke<SkillInstallStatus[]>("repair_managed_skill_install", {
    path,
    targetRoot,
  });
}

export async function loadSkillOrigins(path: string): Promise<ManagedSkillOrigin[]> {
  return invoke<ManagedSkillOrigin[]>("load_managed_skill_origins", { path });
}

export async function readSkillTextFile(path: string): Promise<string> {
  const payload = await invoke<{ content: string }>("read_skill_text_file", {
    path,
  });
  return payload.content;
}

export async function compareSkills(leftPath: string, rightPath: string): Promise<SkillComparison> {
  return invoke<SkillComparison>("compare_skills", {
    leftPath,
    rightPath,
  });
}

export async function diffSkills(leftPath: string, rightPath: string): Promise<SkillDirectoryDiff> {
  return invoke<SkillDirectoryDiff>("diff_skills", {
    leftPath,
    rightPath,
  });
}

export async function loadManagedSkillHistory(path: string): Promise<ManagedSkillHistory> {
  return invoke<ManagedSkillHistory>("load_managed_skill_history", { path });
}

export async function promoteManagedSkillVariant(path: string): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("promote_managed_skill_variant", { path });
}

export async function updateManagedSkillVariantLabel(
  path: string,
  variantLabel: string
): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("update_managed_skill_variant_label", {
    path,
    variantLabel,
  });
}

export async function loadInstallTargetInventory(): Promise<
  import("../types").InstallTargetInventory[]
> {
  return invoke<import("../types").InstallTargetInventory[]>("load_install_target_inventory");
}

export async function syncInstallTarget(
  targetRoot: string
): Promise<import("../types").InstallTargetInventory[]> {
  return invoke<import("../types").InstallTargetInventory[]>("sync_install_target", { targetRoot });
}

export async function repairInstallTarget(
  targetRoot: string
): Promise<import("../types").InstallTargetInventory[]> {
  return invoke<import("../types").InstallTargetInventory[]>("repair_install_target", {
    targetRoot,
  });
}

export async function checkSkillUpdates(): Promise<RemoteUpdateCheck[]> {
  return invoke<RemoteUpdateCheck[]>("check_skill_updates");
}

export async function updateManagedSkill(path: string): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("update_managed_skill", { path });
}

export async function loadManagedGitSource(path: string): Promise<ManagedGitSource | null> {
  return invoke<ManagedGitSource | null>("load_managed_git_source", { path });
}

export async function setSkillTags(skillMd: string, tags: string[]): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("set_skill_tags", { skillMd, tags });
}

export async function exportSkillsByTags(destination: string, tags: string[]): Promise<number> {
  return invoke<number>("export_skills_by_tags", { destination, tags });
}

export async function exportSkillsByTagsToOpenclaw(tags: string[]): Promise<number> {
  return invoke<number>("export_skills_by_tags_to_openclaw", { tags });
}
