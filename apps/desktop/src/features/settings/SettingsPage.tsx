import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import styles from "../../App.module.css";
import { loadRuntimeSettings, listCustomTargets, addCustomTarget, removeCustomTarget, saveRegistryUrl } from "../../api";
import { agentLabel, copy, scopeLabel, friendlyErrorMessage, type Language } from "../../i18n";
import type { CustomInstallTarget, IndexStatus, RuntimeSettingsSnapshot } from "../../types";
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

  const [customTargets, setCustomTargets] = useState<CustomInstallTarget[]>([]);
  const [customTargetsLoading, setCustomTargetsLoading] = useState(false);
  const [customTargetsError, setCustomTargetsError] = useState<string | null>(null);
  const [addingTarget, setAddingTarget] = useState(false);
  const [newTargetPath, setNewTargetPath] = useState("");
  const [newTargetAgent, setNewTargetAgent] = useState<"codex" | "claude_code">("codex");
  const [newTargetScope, setNewTargetScope] = useState<"global" | "project">("global");
  const [newTargetLabel, setNewTargetLabel] = useState("");
  const [addTargetBusy, setAddTargetBusy] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    setCustomTargetsLoading(true);
    setCustomTargetsError(null);

    void listCustomTargets()
      .then((targets) => {
        if (!cancelled) {
          setCustomTargets(targets);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCustomTargetsError(friendlyErrorMessage(error, language));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCustomTargetsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [language, text.defaultScanError]);

  async function handleSelectFolder() {
    const selected = await openDialog({
      directory: true,
      multiple: false,
    });
    if (selected && typeof selected === "string") {
      setNewTargetPath(selected);
    }
  }

  async function handleAddTarget() {
    if (!newTargetPath.trim()) {
      return;
    }
    setAddTargetBusy(true);
    setCustomTargetsError(null);
    try {
      const added = await addCustomTarget(
        newTargetPath.trim(),
        newTargetAgent,
        newTargetScope,
        newTargetLabel.trim() || null,
      );
      setCustomTargets((current) => [added, ...current]);
      setNewTargetPath("");
      setNewTargetLabel("");
      setAddingTarget(false);
    } catch (error: unknown) {
      setCustomTargetsError(friendlyErrorMessage(error, language));
    } finally {
      setAddTargetBusy(false);
    }
  }

  async function handleRemoveTarget(id: number) {
    if (!window.confirm(text.customTargetDeleteConfirm)) {
      return;
    }
    setCustomTargetsError(null);
    try {
      await removeCustomTarget(id);
      setCustomTargets((current) => current.filter((t) => t.id !== id));
    } catch (error: unknown) {
      setCustomTargetsError(friendlyErrorMessage(error, language));
    }
  }

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

        <article className={styles.settingsCard}>
          <p className={styles.sectionLabel}>{text.registryUrlTitle}</p>
          <p className={styles.helperText}>{text.registryUrlBody}</p>
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              className={styles.searchField}
              value={runtimeSettings?.registry_url ?? ""}
              onChange={(e) =>
                setRuntimeSettings((prev) =>
                  prev ? { ...prev, registry_url: e.target.value } : null
                )
              }
              onBlur={() => {
                const url = runtimeSettings?.registry_url ?? "";
                void saveRegistryUrl(url).catch((error: unknown) => {
                  setCustomTargetsError(friendlyErrorMessage(error, language));
                });
              }}
              placeholder="https://skills.sh/api/search"
              style={{ flex: 1 }}
            />
          </div>
        </article>

        <article className={styles.settingsCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <p className={styles.sectionLabel}>{text.manageCustomTargetsTitle}</p>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setAddingTarget((v) => !v)}
            >
              {addingTarget ? text.cancelVariantLabel : text.addCustomTarget}
            </button>
          </div>
          <p className={styles.helperText}>{text.manageCustomTargetsBody}</p>

          {addingTarget ? (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  className={styles.searchField}
                  value={newTargetPath}
                  onChange={(e) => setNewTargetPath(e.target.value)}
                  placeholder={text.customTargetPath}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => void handleSelectFolder()}
                >
                  {text.selectFolder}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  className={styles.searchField}
                  value={newTargetAgent}
                  onChange={(e) => setNewTargetAgent(e.target.value as "codex" | "claude_code")}
                  style={{ flex: 1 }}
                >
                  <option value="codex">{agentLabel("codex")}</option>
                  <option value="claude_code">{agentLabel("claude_code")}</option>
                </select>
                <select
                  className={styles.searchField}
                  value={newTargetScope}
                  onChange={(e) => setNewTargetScope(e.target.value as "global" | "project")}
                  style={{ flex: 1 }}
                >
                  <option value="global">{scopeLabel("global", language)}</option>
                  <option value="project">{scopeLabel("project", language)}</option>
                </select>
              </div>
              <input
                type="text"
                className={styles.searchField}
                value={newTargetLabel}
                onChange={(e) => setNewTargetLabel(e.target.value)}
                placeholder={text.customTargetLabel}
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setAddingTarget(false);
                    setNewTargetPath("");
                    setNewTargetLabel("");
                    setCustomTargetsError(null);
                  }}
                >
                  {text.cancelVariantLabel}
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={!newTargetPath.trim() || addTargetBusy}
                  onClick={() => void handleAddTarget()}
                >
                  {addTargetBusy ? text.refreshingIndex : text.addCustomTarget}
                </button>
              </div>
            </div>
          ) : null}

          {customTargetsError ? (
            <div className={styles.emptyPanel} style={{ marginTop: 12 }}>
              {customTargetsError}
            </div>
          ) : null}

          <div style={{ marginTop: 16 }}>
            {customTargetsLoading ? (
              <div className={styles.emptyPanel}>{text.loadingPreview}</div>
            ) : customTargets.length === 0 ? (
              <div className={styles.emptyPanel}>{text.noCustomTargets}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {customTargets.map((target) => (
                  <div
                    key={target.id}
                    className={styles.targetItemCard}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {target.label || target.path}
                      </strong>
                      <div className={styles.groupMetaRow}>
                        <span className={styles.inlineTag}>{agentLabel(target.agent)}</span>
                        <span className={styles.inlineTag}>{scopeLabel(target.scope, language)}</span>
                        {target.label ? (
                          <span className={styles.inlineTag} style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {target.path}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => void handleRemoveTarget(target.id)}
                    >
                      {text.removeCustomTarget}
                    </button>
                  </div>
                ))}
              </div>
            )}
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
