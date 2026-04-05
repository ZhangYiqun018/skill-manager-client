import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSkillFilters } from "./useSkillFilters";
import type { SkillItem } from "../types";

function makeSkill(overrides: Partial<SkillItem> = {}): SkillItem {
  return {
    path: "/skill/test",
    skill_md: "/skill/test/SKILL.md",
    display_name: "Test Skill",
    family_key: "test-family",
    slug: "test",
    agent: "codex",
    scope: "global",
    source_type: "import",
    content_hash: "abc123",
    source_root: "/store",
    tags: [],
    metadata: {},
    health_state: "healthy",
    warning_count: 0,
    ...overrides,
  };
}

describe("useSkillFilters", () => {
  const baseArgs = {
    skills: [],
    searchQuery: "",
    agentFilter: "all" as const,
    scopeFilter: "all" as const,
    sourceFilter: "all" as const,
    tagFilter: [] as string[],
  };

  it("returns empty results when no skills are provided", () => {
    const { result } = renderHook(() => useSkillFilters(baseArgs));
    expect(result.current.filteredSkills).toEqual([]);
    expect(result.current.allTags).toEqual([]);
  });

  it("derives allTags from skills", () => {
    const { result } = renderHook(() =>
      useSkillFilters({
        ...baseArgs,
        skills: [makeSkill({ tags: ["react", "ui"] }), makeSkill({ tags: ["react", "hooks"] })],
      })
    );
    expect(result.current.allTags).toEqual(["hooks", "react", "ui"]);
  });

  it("filters by tag with OR semantics", () => {
    const skillA = makeSkill({ display_name: "A", tags: ["react"] });
    const skillB = makeSkill({ display_name: "B", tags: ["vue"] });
    const skillC = makeSkill({ display_name: "C", tags: ["react", "vue"] });
    const skillD = makeSkill({ display_name: "D", tags: [] });

    const { result } = renderHook(() =>
      useSkillFilters({
        ...baseArgs,
        skills: [skillA, skillB, skillC, skillD],
        tagFilter: ["react"],
      })
    );

    expect(result.current.filteredSkills).toEqual([skillA, skillC]);
  });

  it("filters by multiple tags with OR semantics", () => {
    const skillA = makeSkill({ tags: ["react"] });
    const skillB = makeSkill({ tags: ["vue"] });
    const skillC = makeSkill({ tags: ["angular"] });

    const { result } = renderHook(() =>
      useSkillFilters({
        ...baseArgs,
        skills: [skillA, skillB, skillC],
        tagFilter: ["react", "vue"],
      })
    );

    expect(result.current.filteredSkills).toEqual([skillA, skillB]);
  });

  it("combines tag filter with other filters (AND)", () => {
    const skillA = makeSkill({ agent: "codex", tags: ["react"] });
    const skillB = makeSkill({ agent: "claude_code", tags: ["react"] });

    const { result } = renderHook(() =>
      useSkillFilters({
        ...baseArgs,
        skills: [skillA, skillB],
        agentFilter: "codex",
        tagFilter: ["react"],
      })
    );

    expect(result.current.filteredSkills).toEqual([skillA]);
  });

  it("includes tags in searchable haystack", () => {
    const skill = makeSkill({ display_name: "Unknown", tags: ["secret-tag"] });

    const { result } = renderHook(() =>
      useSkillFilters({
        ...baseArgs,
        skills: [skill],
        searchQuery: "secret-tag",
      })
    );

    expect(result.current.filteredSkills).toEqual([skill]);
  });

  it("returns empty filteredSkills when tagFilter does not match anything", () => {
    const skill = makeSkill({ tags: ["react"] });

    const { result } = renderHook(() =>
      useSkillFilters({
        ...baseArgs,
        skills: [skill],
        tagFilter: ["nonexistent"],
      })
    );

    expect(result.current.filteredSkills).toEqual([]);
    expect(result.current.allTags).toEqual(["react"]);
  });
});
