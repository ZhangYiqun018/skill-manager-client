import { useDeferredValue, useMemo } from "react";
import type {
  AgentFilter,
  InstalledSkill,
  ScopeFilter,
} from "../types";

type UseSkillFiltersArgs = {
  skills: InstalledSkill[];
  searchQuery: string;
  agentFilter: AgentFilter;
  scopeFilter: ScopeFilter;
};

export function useSkillFilters({
  skills,
  searchQuery,
  agentFilter,
  scopeFilter,
}: UseSkillFiltersArgs) {
  const deferredQuery = useDeferredValue(searchQuery);

  return useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return skills.filter((skill) => {
      const matchesAgent = agentFilter === "all" || skill.agent === agentFilter;
      const matchesScope = scopeFilter === "all" || skill.scope === scopeFilter;
      const haystack = `${skill.display_name} ${skill.description ?? ""} ${skill.slug}`
        .toLowerCase()
        .trim();
      const matchesQuery =
        normalizedQuery.length === 0 || haystack.includes(normalizedQuery);

      return matchesAgent && matchesScope && matchesQuery;
    });
  }, [agentFilter, deferredQuery, scopeFilter, skills]);
}
