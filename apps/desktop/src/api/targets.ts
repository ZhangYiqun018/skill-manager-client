import { invoke } from "@tauri-apps/api/core";
import type { CustomInstallTarget } from "../types";

export async function listCustomTargets(): Promise<CustomInstallTarget[]> {
  return invoke<CustomInstallTarget[]>("list_custom_targets");
}

export async function addCustomTarget(
  path: string,
  agent: "codex" | "claude_code",
  scope: "global" | "project",
  label?: string | null,
): Promise<CustomInstallTarget> {
  return invoke<CustomInstallTarget>("add_custom_target", {
    path,
    agent,
    scope,
    label: label ?? null,
  });
}

export async function removeCustomTarget(id: number): Promise<void> {
  return invoke("remove_custom_target", { id });
}
