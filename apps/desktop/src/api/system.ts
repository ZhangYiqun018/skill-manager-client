import { invoke } from "@tauri-apps/api/core";
import type { RuntimeSettingsSnapshot, SkillContentPayload } from "../types";

export async function readSkillContent(
  path: string,
): Promise<SkillContentPayload> {
  return invoke<SkillContentPayload>("read_skill_content", { path });
}

export async function openInFinder(path: string): Promise<void> {
  return invoke("open_in_finder", { path });
}

export async function loadRuntimeSettings(): Promise<RuntimeSettingsSnapshot> {
  return invoke<RuntimeSettingsSnapshot>("load_runtime_settings");
}
