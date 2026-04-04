import { useCallback, useState } from "react";
import { checkSkillUpdates, updateManagedSkill } from "../api/library";
import type { RemoteUpdateCheck } from "../types";

export function useRemoteUpdates() {
  const [updateChecks, setUpdateChecks] = useState<RemoteUpdateCheck[]>([]);
  const [checking, setChecking] = useState(false);
  const [updatingPath, setUpdatingPath] = useState<string | null>(null);

  const checkUpdates = useCallback(async () => {
    setChecking(true);
    try {
      const checks = await checkSkillUpdates();
      setUpdateChecks(checks);
      return checks;
    } finally {
      setChecking(false);
    }
  }, []);

  const updateSkill = useCallback(async (path: string) => {
    setUpdatingPath(path);
    try {
      await updateManagedSkill(path);
      setUpdateChecks((current) =>
        current.map((check) =>
          check.managed_skill_path === path
            ? { ...check, has_update: false }
            : check,
        ),
      );
    } finally {
      setUpdatingPath(null);
    }
  }, []);

  const hasUpdateFor = useCallback(
    (path: string) => {
      return updateChecks.some(
        (check) => check.managed_skill_path === path && check.has_update,
      );
    },
    [updateChecks],
  );

  return {
    updateChecks,
    checking,
    updatingPath,
    checkUpdates,
    updateSkill,
    hasUpdateFor,
  };
}
