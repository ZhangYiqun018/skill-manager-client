import { useState } from "react";
import {
  adoptRegistrySkill,
  adoptSkills,
  applyAdoptionResolutions,
  importLocalSkillFolder,
  searchSkillsRegistry,
} from "../api";
import type {
  AdoptionResolution,
  AgentKind,
  DiscoveryRecord,
  IndexedScanSummary,
  SkillItem,
} from "../types";

export function useDiscoveryState({
  applySnapshotWithDerived,
  selectLibrarySkillFromSnapshot,
  discoveryRepresentativeSkills,
}: {
  applySnapshotWithDerived: (result: IndexedScanSummary) => void | Promise<void>;
  selectLibrarySkillFromSnapshot: (
    result: IndexedScanSummary,
    predicate: (skill: SkillItem) => boolean
  ) => void;
  discoveryRepresentativeSkills: DiscoveryRecord[];
}) {
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [adoptingSkillPaths, setAdoptingSkillPaths] = useState<string[]>([]);

  function toggleSelection(path: string) {
    setSelectedPaths((current) =>
      current.includes(path) ? current.filter((value) => value !== path) : [...current, path]
    );
  }

  function clearSelection() {
    setSelectedPaths([]);
  }

  async function handleAdoptPaths(paths: string[]) {
    if (paths.length === 0) {
      return;
    }

    setAdoptingSkillPaths(paths);

    try {
      const selectedCandidates = discoveryRepresentativeSkills.filter((skill) =>
        paths.includes(skill.path)
      );
      const result = await adoptSkills(paths);
      await applySnapshotWithDerived(result);
      setSelectedPaths([]);

      const selectedFamilyKeys = new Set(selectedCandidates.map((skill) => skill.family_key));
      const selectedHashes = new Set(selectedCandidates.map((skill) => skill.content_hash));
      const adoptedSkill = result.summary.skills.find(
        (candidate) =>
          candidate.source_type !== "disk" &&
          selectedFamilyKeys.has(candidate.family_key) &&
          selectedHashes.has(candidate.content_hash)
      );

      if (adoptedSkill) {
        selectLibrarySkillFromSnapshot(result, () => true);
      }
    } finally {
      setAdoptingSkillPaths([]);
    }
  }

  async function handleApplyAdoptionResolutions(resolutions: AdoptionResolution[]) {
    if (resolutions.length === 0) {
      return;
    }

    setAdoptingSkillPaths(resolutions.map((r) => r.source_path));

    try {
      const result = await applyAdoptionResolutions(resolutions);
      await applySnapshotWithDerived(result);
      setSelectedPaths([]);

      const adoptedSkill = result.summary.skills.find(
        (candidate) =>
          candidate.source_type !== "disk" &&
          resolutions.some((resolution) =>
            resolution.action === "merge"
              ? resolution.merge_target_path === candidate.path
              : discoveryRepresentativeSkills.find((skill) => skill.path === resolution.source_path)
                  ?.content_hash === candidate.content_hash
          )
      );

      if (adoptedSkill) {
        selectLibrarySkillFromSnapshot(result, () => true);
      }
    } finally {
      setAdoptingSkillPaths([]);
    }
  }

  async function handleImportFolder(path: string, agent: AgentKind, scope: "global" | "project") {
    const result = await importLocalSkillFolder(path, agent, scope);
    await applySnapshotWithDerived(result);
    selectLibrarySkillFromSnapshot(result, (skill) => skill.source_type === "import");
  }

  async function handleSearchRegistry(query: string) {
    return searchSkillsRegistry(query);
  }

  async function handleAdoptRegistrySkill(
    skill: {
      id: string;
      skillId: string;
      name: string;
      source: string;
    },
    agent: AgentKind,
    scope: "global" | "project"
  ) {
    const result = await adoptRegistrySkill(skill.source, skill.skillId, skill.id, agent, scope);
    await applySnapshotWithDerived(result);
    selectLibrarySkillFromSnapshot(
      result,
      (candidate) =>
        candidate.source_type === "remote" &&
        candidate.display_name.toLowerCase() === skill.name.toLowerCase()
    );
  }

  return {
    selectedPaths,
    adoptingSkillPaths,
    toggleSelection,
    clearSelection,
    handleAdoptPaths,
    handleApplyAdoptionResolutions,
    handleImportFolder,
    handleSearchRegistry,
    handleAdoptRegistrySkill,
    setSelectedPaths,
    setAdoptingSkillPaths,
  };
}
