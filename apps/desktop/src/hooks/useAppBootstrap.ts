import { useCallback, useRef, useState } from "react";
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

const CACHE_TTL_MS = 5000;

export function useAppBootstrap() {
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [discoveryReportRaw, setDiscoveryReportRaw] = useState<DiscoveryReport>(EMPTY_DISCOVERY_REPORT);
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingIndex, setRefreshingIndex] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const discoveryRequestId = useRef(0);

  const cache = useRef({
    librarySnapshot: null as IndexedScanSummary | null,
    librarySnapshotAt: 0,
    libraryPromise: null as Promise<IndexedScanSummary> | null,
    discoveryReport: null as DiscoveryReport | null,
    discoveryReportAt: 0,
    discoveryPromise: null as Promise<DiscoveryReport> | null,
  });

  function applySnapshot(result: IndexedScanSummary) {
    setSummary(result.summary);
    setIndexStatus(result.index);
  }

  const reloadDiscoveryReport = useCallback(async () => {
    const requestId = discoveryRequestId.current + 1;
    discoveryRequestId.current = requestId;
    setDiscoveryLoading(true);

    try {
      const cached = cache.current.discoveryReport;
      const cachedAt = cache.current.discoveryReportAt;
      const now = Date.now();

      let nextDiscoveryReport: DiscoveryReport;
      if (cached && now - cachedAt < CACHE_TTL_MS) {
        nextDiscoveryReport = cached;
      } else if (cache.current.discoveryPromise) {
        nextDiscoveryReport = await cache.current.discoveryPromise;
      } else {
        const promise = loadDiscoveryReport();
        cache.current.discoveryPromise = promise;
        try {
          nextDiscoveryReport = await promise;
          cache.current.discoveryReport = nextDiscoveryReport;
          cache.current.discoveryReportAt = Date.now();
        } finally {
          cache.current.discoveryPromise = null;
        }
      }

      if (discoveryRequestId.current === requestId) {
        setDiscoveryReportRaw(nextDiscoveryReport);
      }
    } catch (reportFailure) {
      if (discoveryRequestId.current === requestId) {
        setError(reportFailure);
      }
    } finally {
      if (discoveryRequestId.current === requestId) {
        setDiscoveryLoading(false);
      }
    }
  }, []);

  const applySnapshotWithDerived = useCallback(async (result: IndexedScanSummary) => {
    applySnapshot(result);
    void reloadDiscoveryReport();
  }, [reloadDiscoveryReport]);

  const refresh = useCallback(async (background = false) => {
    if (background) {
      setRefreshingIndex(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      cache.current.libraryPromise = refreshLibrarySnapshot();
      const result = await cache.current.libraryPromise;
      cache.current.librarySnapshot = result;
      cache.current.librarySnapshotAt = Date.now();
      // Invalidate discovery cache so the report is refreshed alongside the library
      cache.current.discoveryReport = null;
      cache.current.discoveryReportAt = 0;
      await applySnapshotWithDerived(result);
    } catch (refreshFailure) {
      setError(refreshFailure);
    } finally {
      cache.current.libraryPromise = null;
      if (background) {
        setRefreshingIndex(false);
      } else {
        setLoading(false);
      }
    }
  }, [applySnapshotWithDerived]);

  const bootstrap = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const cached = cache.current.librarySnapshot;
      const cachedAt = cache.current.librarySnapshotAt;
      const now = Date.now();

      let snapshot: IndexedScanSummary;
      if (cached && now - cachedAt < CACHE_TTL_MS) {
        snapshot = cached;
      } else if (cache.current.libraryPromise) {
        snapshot = await cache.current.libraryPromise;
      } else {
        const promise = loadLibrarySnapshot();
        cache.current.libraryPromise = promise;
        try {
          snapshot = await promise;
          cache.current.librarySnapshot = snapshot;
          cache.current.librarySnapshotAt = Date.now();
        } finally {
          cache.current.libraryPromise = null;
        }
      }

      await applySnapshotWithDerived(snapshot);
    } catch (loadFailure) {
      setError(loadFailure);
    } finally {
      setLoading(false);
    }
  }, [applySnapshotWithDerived]);

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
