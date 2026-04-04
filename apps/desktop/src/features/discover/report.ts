import type {
  DiscoveryGroup,
  DiscoveryGroupKind,
  DiscoveryPreset,
  DiscoveryRecord,
  DiscoveryReport,
  DiscoveryReviewState,
} from "../../types";

export function filterDiscoveryReport(
  report: DiscoveryReport,
  searchQuery: string,
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
      occurrence_count: allGroups.reduce(
        (count, group) => count + group.occurrence_count,
        0,
      ),
      exact_duplicate_group_count: allGroups.reduce(
        (count, group) =>
          count +
          group.candidates.filter((candidate) => candidate.occurrence_count > 1).length,
        0,
      ),
      family_count: allGroups.length,
      variant_family_count: allGroups.filter((group) => group.kind === "variant").length,
    },
    all_groups: allGroups,
    unique_groups: allGroups.filter((group) => group.kind === "unique"),
    exact_duplicate_groups: allGroups.filter(
      (group) => group.kind === "exact_duplicate",
    ),
    variant_groups: allGroups.filter((group) => group.kind === "variant"),
  };
}

export function buildPresetSelection(
  groups: DiscoveryGroup[],
  preset: DiscoveryPreset,
): string[] {
  const selected = new Set<string>();

  for (const group of groups) {
    for (const candidate of group.candidates) {
      if (matchesPreset(candidate.representative, preset)) {
        selected.add(candidate.representative.path);
      }
    }
  }

  return Array.from(selected);
}

function filterGroup(
  group: DiscoveryGroup,
  normalizedQuery: string,
): DiscoveryGroup | null {
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
    0,
  );
  const variantCount = candidates.length;
  const duplicateCount = occurrenceCount - variantCount;
  const kind: DiscoveryGroupKind =
    variantCount === 1
      ? occurrenceCount === 1
        ? "unique"
        : "exact_duplicate"
      : "variant";
  const reviewState: DiscoveryReviewState =
    kind === "variant" ? "needs_review" : "ready";

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

function matchesPreset(skill: DiscoveryRecord, preset: DiscoveryPreset): boolean {
  if (preset === "recommended") {
    return true;
  }

  if (preset === "project") {
    return skill.scope === "project";
  }

  if (preset === "codex") {
    return skill.agent === "codex";
  }

  return skill.agent === "claude_code";
}
