import { invoke } from "@tauri-apps/api/core";
import type { SkillContentPayload } from "../types";

export async function readSkillContent(
  path: string,
): Promise<SkillContentPayload> {
  return invoke<SkillContentPayload>("read_skill_content", { path });
}

export async function openInFinder(path: string): Promise<void> {
  return invoke("open_in_finder", { path });
}
