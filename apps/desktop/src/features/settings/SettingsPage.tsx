import { useEffect, useState } from "react";
import styles from "../../App.module.css";
import { loadRuntimeSettings } from "../../api";
import { copy, type Language } from "../../i18n";
import type { IndexStatus, RuntimeSettingsSnapshot } from "../../types";
import type { ThemeMode } from "../../hooks/useTheme";

type SettingsPageProps = {
  indexStatus: IndexStatus | null;
  language: Language;
  onLanguageChange: (language: Language) => void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
};

export function SettingsPage({
  indexStatus,
  language,
  onLanguageChange,
  themeMode,
  onThemeChange,
}: SettingsPageProps) {
  const text = copy[language];
  const [runtimeSettings, setRuntimeSettings] =
    useState<RuntimeSettingsSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadRuntimeSettings().then((settings) => {
      if (!cancelled) {
        setRuntimeSettings(settings);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={styles.pageSection}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.sectionLabel}>{text.settingsTitle}</p>
          <h1 className={styles.pageTitle}>{text.settingsBody}</h1>
        </div>
      </header>

      <div className={styles.settingsGrid}>
        <article className={styles.settingsCard}>
          <p className={styles.sectionLabel}>{text.activeLanguage}</p>
          <div className={styles.languageSwitchInline}>
            <button
              type="button"
              className={language === "en" ? styles.languageButtonActive : styles.languageButton}
              onClick={() => onLanguageChange("en")}
            >
              {text.english}
            </button>
            <button
              type="button"
              className={language === "zh" ? styles.languageButtonActive : styles.languageButton}
              onClick={() => onLanguageChange("zh")}
            >
              {text.chinese}
            </button>
          </div>
          <p className={styles.helperText}>{text.savedLanguageHint}</p>
        </article>

        <article className={styles.settingsCard}>
          <p className={styles.sectionLabel}>{text.appearanceTitle}</p>
          <div className={styles.languageSwitchInline}>
            <button
              type="button"
              className={themeMode === "system" ? styles.languageButtonActive : styles.languageButton}
              onClick={() => onThemeChange("system")}
            >
              {text.themeSystem}
            </button>
            <button
              type="button"
              className={themeMode === "light" ? styles.languageButtonActive : styles.languageButton}
              onClick={() => onThemeChange("light")}
            >
              {text.themeLight}
            </button>
            <button
              type="button"
              className={themeMode === "dark" ? styles.languageButtonActive : styles.languageButton}
              onClick={() => onThemeChange("dark")}
            >
              {text.themeDark}
            </button>
          </div>
          <p className={styles.helperText}>{text.savedThemeHint}</p>
        </article>

        <article className={styles.settingsCard}>
          <p className={styles.sectionLabel}>{text.cacheStatusTitle}</p>
          <p className={styles.helperText}>{text.cacheStatusBody}</p>
          <div className={styles.metaGrid}>
            <div>
              <span>{text.indexPathLabel}</span>
              <strong>{indexStatus?.index_path ?? "—"}</strong>
            </div>
            <div>
              <span>{text.storePathLabel}</span>
              <strong>{runtimeSettings?.store_path ?? "—"}</strong>
            </div>
            <div>
              <span>{text.lastUpdatedLabel}</span>
              <strong>{formatTimestamp(indexStatus?.last_refresh_unix_ms, language)}</strong>
            </div>
            <div>
              <span>{text.installStrategyTitle}</span>
              <strong>
                {runtimeSettings?.install_strategy === "symlink_first"
                  ? text.installStrategyValueSymlinkFirst
                  : "—"}
              </strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function formatTimestamp(value: number | null | undefined, language: Language) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
