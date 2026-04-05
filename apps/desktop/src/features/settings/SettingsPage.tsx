import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import badges from "../../styles/_badges.module.css";
import buttons from "../../styles/_buttons.module.css";
import cards from "../../styles/_cards.module.css";
import forms from "../../styles/_forms.module.css";
import layout from "../../styles/_layout.module.css";
import lists from "../../styles/_lists.module.css";
import navigation from "../../styles/_navigation.module.css";
import panels from "../../styles/_panels.module.css";
import {
  loadRuntimeSettings,
  listCustomTargets,
  addCustomTarget,
  removeCustomTarget,
  saveRegistryUrl,
} from "../../api";
import { agentLabel, copy, scopeLabel, friendlyErrorMessage, type Language } from "../../i18n";
import type { CustomInstallTarget, IndexStatus, RuntimeSettingsSnapshot } from "../../types";
import type { ThemeMode } from "../../hooks/useTheme";
import { ConfirmModal } from "../../components/ConfirmModal";
import { useToast } from "../../components/ToastProvider";

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
  const { showToast } = useToast();
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsSnapshot | null>(null);

  const [customTargets, setCustomTargets] = useState<CustomInstallTarget[]>([]);
  const [customTargetsLoading, setCustomTargetsLoading] = useState(false);
  const [customTargetsError, setCustomTargetsError] = useState<string | null>(null);
  const [addingTarget, setAddingTarget] = useState(false);
  const [newTargetPath, setNewTargetPath] = useState("");
  const [newTargetAgent, setNewTargetAgent] = useState<"codex" | "claude_code">("codex");
  const [newTargetScope, setNewTargetScope] = useState<"global" | "project">("global");
  const [newTargetLabel, setNewTargetLabel] = useState("");
  const [addTargetBusy, setAddTargetBusy] = useState(false);
  const [confirmDeleteTargetId, setConfirmDeleteTargetId] = useState<number | null>(null);

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
  }, [language]);

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
        newTargetLabel.trim() || null
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
    setCustomTargetsError(null);
    try {
      await removeCustomTarget(id);
      setCustomTargets((current) => current.filter((t) => t.id !== id));
    } catch (error: unknown) {
      setCustomTargetsError(friendlyErrorMessage(error, language));
    }
  }

  return (
    <section className={layout.pageSection}>
      <header className={layout.pageHeader}>
        <div>
          <p className={layout.sectionLabel}>{text.settingsTitle}</p>
          <h1 className={layout.pageTitle}>{text.settingsBody}</h1>
        </div>
      </header>

      <div className={layout.settingsGrid}>
        {/* Appearance group */}
        <article className={cards.settingsCard}>
          <p className={layout.sectionLabel}>{text.activeLanguage}</p>
          <div className={navigation.languageSwitchInline}>
            <button
              type="button"
              className={language === "en" ? buttons.languageButtonActive : buttons.languageButton}
              onClick={() => onLanguageChange("en")}
            >
              {text.english}
            </button>
            <button
              type="button"
              className={language === "zh" ? buttons.languageButtonActive : buttons.languageButton}
              onClick={() => onLanguageChange("zh")}
            >
              {text.chinese}
            </button>
          </div>
          <p className={layout.helperText}>{text.savedLanguageHint}</p>
        </article>

        <article className={cards.settingsCard}>
          <p className={layout.sectionLabel}>{text.appearanceTitle}</p>
          <div className={navigation.languageSwitchInline}>
            <button
              type="button"
              className={
                themeMode === "system" ? buttons.languageButtonActive : buttons.languageButton
              }
              onClick={() => onThemeChange("system")}
            >
              {text.themeSystem}
            </button>
            <button
              type="button"
              className={
                themeMode === "light" ? buttons.languageButtonActive : buttons.languageButton
              }
              onClick={() => onThemeChange("light")}
            >
              {text.themeLight}
            </button>
            <button
              type="button"
              className={
                themeMode === "dark" ? buttons.languageButtonActive : buttons.languageButton
              }
              onClick={() => onThemeChange("dark")}
            >
              {text.themeDark}
            </button>
          </div>
          <p className={layout.helperText}>{text.savedThemeHint}</p>
        </article>

        {/* System group */}
        <article className={cards.settingsCard}>
          <p className={layout.sectionLabel}>{text.cacheStatusTitle}</p>
          <p className={layout.helperText}>{text.cacheStatusBody}</p>
          <div className={layout.metaGrid}>
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

        <article className={cards.settingsCard}>
          <p className={layout.sectionLabel}>{text.registryUrlTitle}</p>
          <p className={layout.helperText}>{text.registryUrlBody}</p>
          <div className={`${forms.formInputRow} ${layout.mt12}`}>
            <input
              type="text"
              value={runtimeSettings?.registry_url ?? ""}
              onChange={(e) =>
                setRuntimeSettings((prev) =>
                  prev ? { ...prev, registry_url: e.target.value } : null
                )
              }
              onBlur={() => {
                const url = runtimeSettings?.registry_url ?? "";
                void saveRegistryUrl(url)
                  .then(() => {
                    showToast(text.registryUrlSaved, "success");
                  })
                  .catch((error: unknown) => {
                    showToast(friendlyErrorMessage(error, language), "error");
                  });
              }}
              placeholder="https://skills.sh/api/search"
              className={`${forms.searchField} ${layout.flexGrow}`}
            />
          </div>
        </article>

        {/* Custom targets — full width */}
        <article className={`${cards.settingsCard} ${layout.fullWidthCard}`}>
          <div className={layout.cardHeaderRow}>
            <p className={layout.sectionLabel}>{text.manageCustomTargetsTitle}</p>
            <button
              type="button"
              className={buttons.secondaryButton}
              onClick={() => setAddingTarget((v) => !v)}
            >
              {addingTarget ? text.cancelVariantLabel : text.addCustomTarget}
            </button>
          </div>
          <p className={layout.helperText}>{text.manageCustomTargetsBody}</p>

          {addingTarget ? (
            <div className={forms.addTargetForm}>
              <div className={forms.formInputRow}>
                <input
                  type="text"
                  value={newTargetPath}
                  onChange={(e) => setNewTargetPath(e.target.value)}
                  placeholder={text.customTargetPath}
                  className={`${forms.searchField} ${layout.flexGrow}`}
                />
                <button
                  type="button"
                  className={buttons.secondaryButton}
                  onClick={() => void handleSelectFolder()}
                >
                  {text.selectFolder}
                </button>
              </div>
              <div className={forms.formSelectRow}>
                <select
                  value={newTargetAgent}
                  onChange={(e) => setNewTargetAgent(e.target.value as "codex" | "claude_code")}
                  className={`${forms.searchField} ${layout.flexGrow}`}
                >
                  <option value="codex">{agentLabel("codex")}</option>
                  <option value="claude_code">{agentLabel("claude_code")}</option>
                </select>
                <select
                  value={newTargetScope}
                  onChange={(e) => setNewTargetScope(e.target.value as "global" | "project")}
                  className={`${forms.searchField} ${layout.flexGrow}`}
                >
                  <option value="global">{scopeLabel("global", language)}</option>
                  <option value="project">{scopeLabel("project", language)}</option>
                </select>
              </div>
              <input
                type="text"
                className={forms.searchField}
                value={newTargetLabel}
                onChange={(e) => setNewTargetLabel(e.target.value)}
                placeholder={text.customTargetLabel}
              />
              <div className={forms.formActionRow}>
                <button
                  type="button"
                  className={buttons.secondaryButton}
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
                  className={buttons.primaryButton}
                  disabled={!newTargetPath.trim() || addTargetBusy}
                  onClick={() => void handleAddTarget()}
                >
                  {addTargetBusy ? text.refreshingIndex : text.addCustomTarget}
                </button>
              </div>
            </div>
          ) : null}

          {customTargetsError ? (
            <div className={`${panels.emptyPanel} ${layout.mt12}`}>{customTargetsError}</div>
          ) : null}

          <div className={layout.mt16}>
            {customTargetsLoading ? (
              <div className={panels.emptyPanel}>{text.loadingPreview}</div>
            ) : customTargets.length === 0 ? (
              <div className={panels.emptyPanel}>{text.noCustomTargets}</div>
            ) : (
              <div className={lists.targetsList}>
                {customTargets.map((target) => (
                  <div key={target.id} className={`${lists.targetItemCard} ${lists.targetItemRow}`}>
                    <div className={lists.targetInfoMin}>
                      <strong className={lists.targetLabelEllipsis}>
                        {target.label || target.path}
                      </strong>
                      <div className={layout.groupMetaRow}>
                        <span className={badges.inlineTag}>{agentLabel(target.agent)}</span>
                        <span className={badges.inlineTag}>
                          {scopeLabel(target.scope, language)}
                        </span>
                        {target.label ? (
                          <span className={`${badges.inlineTag} ${lists.targetPathEllipsis}`}>
                            {target.path}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={buttons.secondaryButton}
                      onClick={() => setConfirmDeleteTargetId(target.id)}
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

      <ConfirmModal
        open={confirmDeleteTargetId !== null}
        title={text.customTargetDeleteConfirm}
        body={text.customTargetDeleteConfirm}
        actionLabel={text.removeCustomTarget}
        cancelLabel={text.cancel}
        onCancel={() => setConfirmDeleteTargetId(null)}
        onConfirm={() => {
          if (confirmDeleteTargetId !== null) {
            void handleRemoveTarget(confirmDeleteTargetId);
          }
          setConfirmDeleteTargetId(null);
        }}
      />
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
