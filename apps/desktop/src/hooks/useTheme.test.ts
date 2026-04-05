import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "./useTheme";

const THEME_STORAGE_KEY = "skill-manager.theme";

describe("useTheme", () => {
  let matchMediaListeners: Array<(e: { matches: boolean }) => void> = [];
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
    matchMediaListeners = [];

    const mockMedia = {
      matches: false,
      addEventListener: vi.fn((event: string, listener: (e: { matches: boolean }) => void) => {
        if (event === "change") matchMediaListeners.push(listener);
      }),
      removeEventListener: vi.fn((event: string, listener: (e: { matches: boolean }) => void) => {
        if (event === "change") {
          matchMediaListeners = matchMediaListeners.filter((l) => l !== listener);
        }
      }),
    } as const;

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue(mockMedia),
    });

    addEventListenerSpy = vi.spyOn(mockMedia, "addEventListener");
    removeEventListenerSpy = vi.spyOn(mockMedia, "removeEventListener");
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("defaults to light when nothing is saved", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.themeMode).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("reads saved theme from localStorage", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.themeMode).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("persists theme change to localStorage and DOM", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setThemeMode("dark");
    });

    expect(result.current.themeMode).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("adds system theme listener only in system mode", () => {
    const { result } = renderHook(() => useTheme());
    expect(addEventListenerSpy).not.toHaveBeenCalled();

    act(() => {
      result.current.setThemeMode("system");
    });

    expect(result.current.themeMode).toBe("system");
    expect(addEventListenerSpy).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
