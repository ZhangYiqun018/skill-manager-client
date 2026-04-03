import { invoke } from "@tauri-apps/api/core";
import type { IndexedScanSummary } from "../types";

export async function loadLibrarySnapshot(): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("load_skill_index");
}

export async function refreshLibrarySnapshot(): Promise<IndexedScanSummary> {
  return invoke<IndexedScanSummary>("refresh_skill_index");
}
