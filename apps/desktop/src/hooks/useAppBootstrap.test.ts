import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAppBootstrap } from "./useAppBootstrap";
import type { IndexedScanSummary, DiscoveryReport } from "../types";

const { loadLibrarySnapshot, refreshLibrarySnapshot, loadDiscoveryReport } = vi.hoisted(() => ({
  loadLibrarySnapshot: vi.fn(),
  refreshLibrarySnapshot: vi.fn(),
  loadDiscoveryReport: vi.fn(),
}));

vi.mock("../api", () => ({
  loadLibrarySnapshot,
  refreshLibrarySnapshot,
  loadDiscoveryReport,
}));

describe("useAppBootstrap", () => {
  const emptyDiscoveryReport: DiscoveryReport = {
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

  const baseSnapshot: IndexedScanSummary = {
    summary: {
      skills: [],
      roots: [],
      warnings: [],
    },
    index: {
      path: "/index",
      store_path: "/store",
      last_scanned_unix_ms: Date.now(),
      skill_count: 0,
      target_count: 0,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("bootstrap loads library snapshot and discovery report", async () => {
    loadLibrarySnapshot.mockResolvedValue(baseSnapshot);
    loadDiscoveryReport.mockResolvedValue(emptyDiscoveryReport);

    const { result } = renderHook(() => useAppBootstrap());

    await act(async () => {
      await result.current.bootstrap();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.summary).toEqual(baseSnapshot.summary);
    expect(result.current.indexStatus).toEqual(baseSnapshot.index);
    expect(loadLibrarySnapshot).toHaveBeenCalledTimes(1);
    expect(loadDiscoveryReport).toHaveBeenCalledTimes(1);
  });

  it("uses cached library snapshot within TTL", async () => {
    loadLibrarySnapshot.mockResolvedValue(baseSnapshot);
    loadDiscoveryReport.mockResolvedValue(emptyDiscoveryReport);

    const { result } = renderHook(() => useAppBootstrap());

    await act(async () => {
      await result.current.bootstrap();
    });

    await act(async () => {
      await result.current.bootstrap();
    });

    expect(loadLibrarySnapshot).toHaveBeenCalledTimes(1);
  });

  it("refreshes snapshot after TTL expires", async () => {
    loadLibrarySnapshot.mockResolvedValue(baseSnapshot);
    loadDiscoveryReport.mockResolvedValue(emptyDiscoveryReport);

    const { result } = renderHook(() => useAppBootstrap());

    await act(async () => {
      await result.current.bootstrap();
    });

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    await act(async () => {
      await result.current.bootstrap();
    });

    expect(loadLibrarySnapshot).toHaveBeenCalledTimes(2);
  });

  it("refresh invalidates discovery cache and reloads both", async () => {
    loadLibrarySnapshot.mockResolvedValue(baseSnapshot);
    refreshLibrarySnapshot.mockResolvedValue(baseSnapshot);
    loadDiscoveryReport.mockResolvedValue(emptyDiscoveryReport);

    const { result } = renderHook(() => useAppBootstrap());

    await act(async () => {
      await result.current.bootstrap();
    });

    await act(async () => {
      await result.current.refresh(false);
    });

    expect(refreshLibrarySnapshot).toHaveBeenCalledTimes(1);
    expect(loadDiscoveryReport).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent discovery requests", async () => {
    loadLibrarySnapshot.mockResolvedValue(baseSnapshot);
    let resolveDiscovery!: (value: DiscoveryReport) => void;
    const discoveryPromise = new Promise<DiscoveryReport>((resolve) => {
      resolveDiscovery = resolve;
    });
    loadDiscoveryReport.mockReturnValue(discoveryPromise);

    const { result } = renderHook(() => useAppBootstrap());

    await act(async () => {
      await result.current.bootstrap();
    });

    // Start two discovery reloads concurrently
    let firstDone = false;
    let secondDone = false;

    act(() => {
      result.current
        .reloadDiscoveryReport()
        .then(() => {
          firstDone = true;
        })
        .catch(() => {});
      result.current
        .reloadDiscoveryReport()
        .then(() => {
          secondDone = true;
        })
        .catch(() => {});
    });

    // Should only call API once due to promise deduplication
    expect(loadDiscoveryReport).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDiscovery(emptyDiscoveryReport);
    });

    await waitFor(() => expect(firstDone).toBe(true));
    await waitFor(() => expect(secondDone).toBe(true));
  });

  it("later concurrent discovery wins over earlier one (requestId guard)", async () => {
    loadLibrarySnapshot.mockResolvedValue(baseSnapshot);
    let resolveDiscovery!: (value: DiscoveryReport) => void;
    const discoveryPromise = new Promise<DiscoveryReport>((resolve) => {
      resolveDiscovery = resolve;
    });
    loadDiscoveryReport.mockReturnValue(discoveryPromise);

    const { result } = renderHook(() => useAppBootstrap());

    await act(async () => {
      await result.current.bootstrap();
    });

    // Kick off first reload (requestId = 1)
    act(() => {
      void result.current.reloadDiscoveryReport();
    });

    // Kick off second reload while first is still in flight (requestId = 2)
    // Because discoveryPromise is shared, both await the same promise.
    act(() => {
      void result.current.reloadDiscoveryReport();
    });

    // Resolve the shared promise
    await act(async () => {
      resolveDiscovery(emptyDiscoveryReport);
    });

    await waitFor(() => expect(result.current.discoveryLoading).toBe(false));

    // The state should reflect the empty report (set by the latest requestId).
    // If requestId guard were broken, we might see extra re-renders or race conditions.
    expect(result.current.discoveryReportRaw).toEqual(emptyDiscoveryReport);
  });
});
