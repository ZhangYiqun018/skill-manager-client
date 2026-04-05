import type {
  AgentKind,
  DiscoveryGroup,
  DiscoveryGroupKind,
  DiscoveryReport,
  DiscoveryReviewState,
  SkillScope,
} from "../../types";

export function filterDiscoveryReport(
  report: DiscoveryReport,
  searchQuery: string
): DiscoveryReport {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return report;
  }

  const allGroups = report.all_groups
    .map((group) => filterGroup(group, normalizedQuery))
    .filter((group): group is DiscoveryGroup => group !== null);

  return {
    summary: {
      occurrence_count: allGroups.reduce((count, group) => count + group.occurrence_count, 0),
      exact_duplicate_group_count: allGroups.reduce(
        (count, group) =>
          count + group.candidates.filter((candidate) => candidate.occurrence_count > 1).length,
        0
      ),
      family_count: allGroups.length,
      variant_family_count: allGroups.filter((group) => group.kind === "variant").length,
    },
    all_groups: allGroups,
    unique_groups: allGroups.filter((group) => group.kind === "unique"),
    exact_duplicate_groups: allGroups.filter((group) => group.kind === "exact_duplicate"),
    variant_groups: allGroups.filter((group) => group.kind === "variant"),
  };
}

export function filterGroupsByAgentAndScope(
  groups: DiscoveryGroup[],
  agentFilter: AgentKind | "all",
  scopeFilter: SkillScope | "all"
): DiscoveryGroup[] {
  if (agentFilter === "all" && scopeFilter === "all") {
    return groups;
  }

  return groups
    .map((group) => {
      const candidates = group.candidates.filter((c) => {
        const agentMatch = agentFilter === "all" || c.representative.agent === agentFilter;
        const scopeMatch = scopeFilter === "all" || c.representative.scope === scopeFilter;
        return agentMatch && scopeMatch;
      });
      if (candidates.length === 0) return null;
      return { ...group, candidates };
    })
    .filter((group): group is DiscoveryGroup => group !== null);
}

const KIND_PRIORITY: Record<DiscoveryGroupKind, number> = {
  variant: 0,
  exact_duplicate: 1,
  unique: 2,
};

export function sortGroupsByPriority(groups: DiscoveryGroup[]): DiscoveryGroup[] {
  return [...groups].sort((a, b) => {
    const pa = KIND_PRIORITY[a.kind] ?? 3;
    const pb = KIND_PRIORITY[b.kind] ?? 3;
    return pa - pb;
  });
}

function filterGroup(group: DiscoveryGroup, normalizedQuery: string): DiscoveryGroup | null {
  const candidates = group.candidates.filter((candidate) => {
    const haystack = [
      candidate.representative.display_name,
      candidate.representative.description ?? "",
      candidate.representative.path,
      candidate.representative.family_key,
      ...candidate.provenance_paths,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  if (candidates.length === 0) {
    return null;
  }

  const occurrenceCount = candidates.reduce(
    (count, candidate) => count + candidate.occurrence_count,
    0
  );
  const variantCount = candidates.length;
  const duplicateCount = occurrenceCount - variantCount;
  const kind: DiscoveryGroupKind =
    variantCount === 1 ? (occurrenceCount === 1 ? "unique" : "exact_duplicate") : "variant";
  const reviewState: DiscoveryReviewState = kind === "variant" ? "needs_review" : "ready";

  return {
    ...group,
    kind,
    review_state: reviewState,
    occurrence_count: occurrenceCount,
    duplicate_count: duplicateCount,
    variant_count: variantCount,
    candidates,
    recommended_paths: candidates.map((candidate) => candidate.representative.path),
  };
}
