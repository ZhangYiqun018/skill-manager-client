import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RegistryBrowser } from "./RegistryBrowser";
import type { RegistrySkillResult } from "../../types";

const fetchPopularSkills = vi.fn();
const fetchRegistryStats = vi.fn();
const fetchSkillReadme = vi.fn();
const searchSkillsRegistry = vi.fn();
const adoptRegistrySkill = vi.fn();
const open = vi.fn();

vi.mock("../../api/discover", () => ({
  fetchPopularSkills: (...args: unknown[]) => fetchPopularSkills(...args),
  fetchRegistryStats: (...args: unknown[]) => fetchRegistryStats(...args),
  fetchSkillReadme: (...args: unknown[]) => fetchSkillReadme(...args),
  searchSkillsRegistry: (...args: unknown[]) => searchSkillsRegistry(...args),
  adoptRegistrySkill: (...args: unknown[]) => adoptRegistrySkill(...args),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: (...args: unknown[]) => open(...args),
}));

const mockSkill: RegistrySkillResult = {
  id: "r1",
  skillId: "skill-1",
  name: "Tiananmen Report",
  installs: 1500,
  source: "owner/repo",
};

describe("RegistryBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPopularSkills.mockResolvedValue({ skills: [mockSkill], count: 1, query: "" });
    fetchRegistryStats.mockResolvedValue({ totalSkills: 1000 });
    fetchSkillReadme.mockResolvedValue("# README");
  });

  it("loads and displays popular skills", async () => {
    render(
      <RegistryBrowser
        language="zh"
        onAdoptedAndInstall={vi.fn()}
        onAdoptedLater={vi.fn()}
        onSnapshotUpdate={vi.fn()}
      />
    );
    await waitFor(() => expect(screen.getByText("Tiananmen Report")).toBeInTheDocument());
    expect(screen.getByText("1.5K 安装量")).toBeInTheDocument();
  });
});
