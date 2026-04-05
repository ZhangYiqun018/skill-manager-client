import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLibraryDetailsState } from "./useLibraryDetailsState";
import type { SkillItem } from "../../../types";

const {
  loadManagedSkillHistory,
  loadSkillFileTree,
  loadSkillInstallStatuses,
  loadSkillOrigins,
  readSkillTextFile,
  diffSkills,
  loadManagedGitSource,
} = vi.hoisted(() => ({
  loadManagedSkillHistory: vi.fn(() =>
    Promise.resolve({
      promoted_managed_skill_path: null,
      promoted_variant_label: null,
      entries: [],
    })
  ),
  loadSkillFileTree: vi.fn(() =>
    Promise.resolve({ path: "/store/skill", name: "skill", kind: "directory", children: [] })
  ),
  loadSkillInstallStatuses: vi.fn(() => Promise.resolve([])),
  loadSkillOrigins: vi.fn(() => Promise.resolve([])),
  readSkillTextFile: vi.fn(() => Promise.resolve("")),
  diffSkills: vi.fn(() => Promise.resolve({ file_diffs: [], left_path: "", right_path: "" })),
  loadManagedGitSource: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("../../../api", () => ({
  loadManagedSkillHistory,
  loadSkillFileTree,
  loadSkillInstallStatuses,
  loadSkillOrigins,
  readSkillTextFile,
}));

vi.mock("../../../api/library", () => ({
  diffSkills,
  loadManagedGitSource,
}));

describe("useLibraryDetailsState hook", () => {
  const mockSkill: SkillItem = {
    path: "/store/skill",
    skill_md: "/store/skill/SKILL.md",
    display_name: "Skill",
    description: "desc",
    agent: "codex",
    scope: "global",
    source_type: "git",
    source_root: "/store/skill",
    family_key: "skill",
    slug: "skill",
    content_hash: "abc",
    variant_label: "",
    health_state: "healthy",
    warning_count: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads file tree when files tab becomes active", async () => {
    const { result } = renderHook(
      ({ activeTab }) =>
        useLibraryDetailsState({ activeTab, language: "en", selectedSkill: mockSkill }),
      { initialProps: { activeTab: "files" as const } }
    );

    await waitFor(() => {
      expect(loadSkillFileTree).toHaveBeenCalledWith("/store/skill");
      expect(result.current.fileTreeLoading).toBe(false);
    });
  });

  it("loads install statuses when installs tab becomes active", async () => {
    renderHook(
      ({ activeTab }) =>
        useLibraryDetailsState({ activeTab, language: "en", selectedSkill: mockSkill }),
      { initialProps: { activeTab: "installs" as const } }
    );

    await waitFor(() => expect(loadSkillInstallStatuses).toHaveBeenCalledWith("/store/skill"));
  });

  it("loads origins when origins tab becomes active", async () => {
    renderHook(
      ({ activeTab }) =>
        useLibraryDetailsState({ activeTab, language: "en", selectedSkill: mockSkill }),
      { initialProps: { activeTab: "origins" as const } }
    );

    await waitFor(() => expect(loadSkillOrigins).toHaveBeenCalledWith("/store/skill"));
  });

  it("does not restart load on harmless re-renders (stable setter refs)", async () => {
    const { rerender, result } = renderHook(
      ({ activeTab }) =>
        useLibraryDetailsState({ activeTab, language: "en", selectedSkill: mockSkill }),
      { initialProps: { activeTab: "files" as const } }
    );

    // Force a few re-renders before the promise resolves
    rerender({ activeTab: "files" });
    rerender({ activeTab: "files" });
    rerender({ activeTab: "files" });

    await waitFor(() => expect(result.current.fileTreeLoading).toBe(false));

    // The API should have been called exactly once despite multiple re-renders
    expect(loadSkillFileTree).toHaveBeenCalledTimes(1);
  });
});
