import { useRef, useState } from "react";
import { loadDiscoveryReport, loadLibrarySnapshot, refreshLibrarySnapshot } from "../api";
import type { DiscoveryReport, IndexedScanSummary, IndexStatus, ScanSummary } from "../types";

const EMPTY_DISCOVERY_REPORT: DiscoveryReport = {
  summary: {
    occurrence_count: 0,
    exact_duplicate_group_count: 0,
    family_count: 0,
    variant_family_count: 0,
  },
  all_groups: [],
  unique_groups: [],
  exact_duplicate_groups: [],
  variant_groups: [],
};

export function useAppBootstrap() {
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [discoveryReportRaw, setDiscoveryReportRaw] = useState<DiscoveryReport>(EMPTY_DISCOVERY_REPORT);
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingIndex, setRefreshingIndex] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const discoveryRequestId = useRef(0);

  function applySnapshot(result: IndexedScanSummary) {
    setSummary(result.summary);
    setIndexStatus(result.index);
  }

  async function reloadDiscoveryReport() {
    const requestId = discoveryRequestId.current + 1;
    discoveryRequestId.current = requestId;
    setDiscoveryLoading(true);

    try {
      const nextDiscoveryReport = await loadDiscoveryReport();
      if (discoveryRequestId.current === requestId) {
        setDiscoveryReportRaw(nextDiscoveryReport);
      }
    } catch (reportFailure) {
      if (discoveryRequestId.current === requestId) {
        setError(
          reportFailure instanceof Error
            ? reportFailure.message
            : "Could not refresh the skill inventory.",
        );
      }
    } finally {
      if (discoveryRequestId.current === requestId) {
        setDiscoveryLoading(false);
      }
    }
  }

  async function applySnapshotWithDerived(result: IndexedScanSummary) {
    applySnapshot(result);
    void reloadDiscoveryReport();
  }

  async function refresh(background = false) {
    if (background) {
      setRefreshingIndex(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const result = await refreshLibrarySnapshot();
      await applySnapshotWithDerived(result);
    } catch (refreshFailure) {
      setError(
        refreshFailure instanceof Error
          ? refreshFailure.message
          : "Could not refresh the skill inventory.",
      );
    } finally {
      if (background) {
        setRefreshingIndex(false);
      } else {
        setLoading(false);
      }
    }
  }

  async function bootstrap() {
    setError(null);
    setLoading(true);

    try {
      const snapshot = await loadLibrarySnapshot();
      await applySnapshotWithDerived(snapshot);
    } catch (loadFailure) {
      setError(
        loadFailure instanceof Error
          ? loadFailure.message
          : "Could not refresh the skill inventory.",
      );
    } finally {
      setLoading(false);
    }
  }

  return {
    summary,
    discoveryReportRaw,
    indexStatus,
    loading,
    refreshingIndex,
    discoveryLoading,
    error,
    setError,
    bootstrap,
    refresh,
    applySnapshotWithDerived,
    reloadDiscoveryReport,
  };
}
