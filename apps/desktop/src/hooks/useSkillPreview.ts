import { useLayoutEffect, useState } from "react";
import { readSkillContent } from "../api";
import type { DiscoveryRecord, SkillItem } from "../types";

export function useSkillPreview(activePreviewSkill: SkillItem | DiscoveryRecord | null) {
  const [previewCache, setPreviewCache] = useState<Record<string, string>>({});
  const [previewLoadingPath, setPreviewLoadingPath] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useLayoutEffect(() => {
    // Reset error when skill changes; loading state is set immediately below
    setPreviewError(null);

    if (!activePreviewSkill) {
      return;
    }

    if (previewCache[activePreviewSkill.skill_md]) {
      return;
    }

    let cancelled = false;
    setPreviewLoadingPath(activePreviewSkill.skill_md);
    setPreviewError(null);

    void readSkillContent(activePreviewSkill.skill_md)
      .then((payload) => {
        if (cancelled) {
          return;
        }

        setPreviewCache((current) => ({
          ...current,
          [activePreviewSkill.skill_md]: payload.content,
        }));
      })
      .catch((previewFailure: unknown) => {
        if (cancelled) {
          return;
        }

        setPreviewError(
          previewFailure instanceof Error
            ? previewFailure.message
            : "Could not read SKILL.md content."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewLoadingPath(null);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePreviewSkill?.skill_md]);

  return {
    previewCache,
    previewLoadingPath,
    previewError,
  };
}
