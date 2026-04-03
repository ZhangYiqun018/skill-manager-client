import { invoke } from "@tauri-apps/api/core";
import type { IndexedScanSummary } from "../types";
import { refreshLibrarySnapshot } from "./library";

export async function scanDisk() {
  return refreshLibrarySnapshot();
}

export async function adoptSkill(path: string): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("adopt_skill", { path });
}

export async function adoptSkills(paths: string[]): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("adopt_skills", { paths });
}
