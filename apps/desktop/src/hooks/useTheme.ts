import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "skill-manager.theme";

function getSystemIsDark() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const isDark = mode === "dark" || (mode === "system" && getSystemIsDark());
  if (isDark) {
    root.classList.remove("light");
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    return saved ?? "light";
  });

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    applyTheme(themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== "system") return;
    const listener = () => {
      applyTheme(themeMode);
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [themeMode]);

  // Apply once on mount and when themeMode changes explicitly
  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  return { themeMode, setThemeMode };
}
