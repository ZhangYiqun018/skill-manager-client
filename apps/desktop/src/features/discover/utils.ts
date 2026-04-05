import { copy, type Language } from "../../i18n";
import type { DiscoveryGroup } from "../../types";

export function groupActionLabel(group: DiscoveryGroup, language: Language): string {
  const text = copy[language];
  if (group.kind === "variant" || group.existing_variants.length > 0) {
    return text.discoveryGroupNeedsReview;
  }
  if (group.kind === "exact_duplicate") {
    return text.discoveryGroupDuplicates;
  }
  return text.discoveryGroupReady;
}

export function groupNeedsResolution(group: DiscoveryGroup): boolean {
  return group.kind === "variant" || group.existing_variants.length > 0;
}

export function truncatePath(path: string, maxSegments = 3): string {
  const segments = path.split("/").filter(Boolean);
  if (segments.length <= maxSegments) {
    return path;
  }
  return "\u2026/" + segments.slice(-maxSegments).join("/");
}

export function formatTimestamp(
  value: number | null | undefined,
  language: Language,
  fallback: string
) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
