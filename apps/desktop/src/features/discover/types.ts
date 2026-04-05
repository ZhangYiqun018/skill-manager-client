import type { DiscoveryCandidate, DiscoveryGroup, DiscoveryRecord } from "../../types";

export type ResolutionDraft = {
  sourcePath: string;
  candidate: DiscoveryCandidate;
  action: "merge" | "create_variant";
  mergeTargetPath: string | null;
  variantLabel: string;
};

export type ResolutionState = {
  group: DiscoveryGroup;
  entries: ResolutionDraft[];
};

export type PatchedDiscoverySkill = DiscoveryRecord & {
  health_state: "warning";
  warning_count: 0;
};
