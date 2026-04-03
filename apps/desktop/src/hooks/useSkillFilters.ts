import { useDeferredValue, useMemo } from "react";
import type {
  AgentFilter,
  ScopeFilter,
  SkillItem,
  SourceFilter,
} from "../types";

type UseSkillFiltersArgs = {
  skills: SkillItem[];
  searchQuery: string;
  agentFilter: AgentFilter;
  scopeFilter: ScopeFilter;
  sourceFilter: SourceFilter;
};

export function useSkillFilters({
  skills,
  searchQuery,
  agentFilter,
  scopeFilter,
  sourceFilter,
}: UseSkillFiltersArgs) {
  const deferredQuery = useDeferredValue(searchQuery);

  return useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return skills.filter((skill) => {
      const matchesAgent = agentFilter === "all" || skill.agent === agentFilter;
      const matchesScope = scopeFilter === "all" || skill.scope === scopeFilter;
      const matchesSource =
        sourceFilter === "all" || skill.source_type === sourceFilter;
      const haystack =
        `${skill.display_name} ${skill.description ?? ""} ${skill.slug} ${skill.source_type}`
        .toLowerCase()
        .trim();
      const matchesQuery =
        normalizedQuery.length === 0 || haystack.includes(normalizedQuery);

      return matchesAgent && matchesScope && matchesSource && matchesQuery;
    });
  }, [agentFilter, deferredQuery, scopeFilter, skills, sourceFilter]);
}
