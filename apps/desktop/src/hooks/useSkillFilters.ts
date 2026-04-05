import { useDeferredValue, useMemo } from "react";
import type { AgentFilter, ScopeFilter, SkillItem, SourceFilter } from "../types";

type UseSkillFiltersArgs = {
  skills: SkillItem[];
  searchQuery: string;
  agentFilter: AgentFilter;
  scopeFilter: ScopeFilter;
  sourceFilter: SourceFilter;
  tagFilter: string[];
};

export function useSkillFilters({
  skills,
  searchQuery,
  agentFilter,
  scopeFilter,
  sourceFilter,
  tagFilter,
}: UseSkillFiltersArgs) {
  const deferredQuery = useDeferredValue(searchQuery);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const skill of skills) {
      for (const tag of skill.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [skills]);

  const filteredSkills = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return skills.filter((skill) => {
      const matchesAgent = agentFilter === "all" || skill.agent === agentFilter;
      const matchesScope = scopeFilter === "all" || skill.scope === scopeFilter;
      const matchesSource = sourceFilter === "all" || skill.source_type === sourceFilter;
      const haystack =
        `${skill.display_name} ${skill.description ?? ""} ${skill.slug} ${skill.source_type} ${skill.tags.join(" ")}`
          .toLowerCase()
          .trim();
      const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery);
      const matchesTags =
        tagFilter.length === 0 || skill.tags.some((tag) => tagFilter.includes(tag));

      return matchesAgent && matchesScope && matchesSource && matchesQuery && matchesTags;
    });
  }, [agentFilter, deferredQuery, scopeFilter, skills, sourceFilter, tagFilter]);

  return { filteredSkills, allTags };
}
