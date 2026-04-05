import { useEffect, useState } from "react";
import styles from "../../App.module.css";
import {
  installSkillToTarget,
  loadManagedSkillHistory,
  loadSkillFileTree,
  loadSkillInstallStatuses,
  loadSkillOrigins,
  readSkillTextFile,
  removeSkillFromTarget,
  repairSkillTarget,
} from "../../api";
import { diffSkills, loadManagedGitSource } from "../../api/library";
import { InstallModal } from "./InstallModal";
import {
  agentLabel,
  copy,
  installHealthLabel,
  installMethodLabel,
  scopeLabel,
  sourceLabel,
  type Language,
} from "../../i18n";
import type {
  ManagedGitSource,
  ManagedSkillHistory,
  ManagedSkillOrigin,
  SkillDirectoryDiff,
  SkillFileDiff,
  SkillFileNode,
  SkillInstallStatus,
  SkillItem,
} from "../../types";

type DetailTab =
  | "variants"
  | "content"
  | "files"
  | "installs"
  | "origins";

type LibraryDetailsPanelProps = {
  familySkills: SkillItem[];
  hasUpdateFor: (path: string) => boolean;
  language: Language;
  onBack?: () => void;
  onOpenPath: (path: string) => void;
  onPromoteVariant: (path: string) => void | Promise<void>;
  onSelectSkill: (path: string) => void;
  onUpdateSkill: (path: string) => void;
  onUpdateVariantLabel: (path: string, variantLabel: string) => void | Promise<void>;
  previewContent?: string;
  previewError?: string | null;
  previewLoading: boolean;
  selectedSkill: SkillItem | null;
  updatingPath: string | null;
};

export function LibraryDetailsPanel({
  familySkills,
  hasUpdateFor,
  language,
  onBack,
  onOpenPath,
  onPromoteVariant,
  onSelectSkill,
  onUpdateSkill,
  onUpdateVariantLabel,
  previewContent,
  previewError,
  previewLoading,
  selectedSkill,
  updatingPath,
}: LibraryDetailsPanelProps) {
  const text = copy[language];
  const [activeTab, setActiveTab] = useState<DetailTab>("variants");
  const [fileTree, setFileTree] = useState<SkillFileNode | null>(null);
  const [fileTreeLoading, setFileTreeLoading] = useState(false);
  const [fileTreeError, setFileTreeError] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [selectedFileLoading, setSelectedFileLoading] = useState(false);
  const [selectedFileError, setSelectedFileError] = useState<string | null>(null);
  const [installStatuses, setInstallStatuses] = useState<SkillInstallStatus[] | null>(null);
  const [installsLoading, setInstallsLoading] = useState(false);
  const [installsError, setInstallsError] = useState<string | null>(null);
  const [installActionTarget, setInstallActionTarget] = useState<string | null>(null);
  const [origins, setOrigins] = useState<ManagedSkillOrigin[] | null>(null);
  const [originsLoading, setOriginsLoading] = useState(false);
  const [originsError, setOriginsError] = useState<string | null>(null);
  const [editingVariantLabel, setEditingVariantLabel] = useState(false);
  const [variantLabelDraft, setVariantLabelDraft] = useState("");
  const [variantLabelSaving, setVariantLabelSaving] = useState(false);
  const [variantLabelError, setVariantLabelError] = useState<string | null>(null);
  const [directoryDiff, setDirectoryDiff] = useState<SkillDirectoryDiff | null>(null);
  const [directoryDiffLoading, setDirectoryDiffLoading] = useState(false);
  const [directoryDiffError, setDirectoryDiffError] = useState<string | null>(null);
  const [selectedDiffFile, setSelectedDiffFile] = useState<SkillFileDiff | null>(null);
  const [history, setHistory] = useState<ManagedSkillHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [promotingPath, setPromotingPath] = useState<string | null>(null);
  const [gitSource, setGitSource] = useState<ManagedGitSource | null>(null);
  const [gitSourceLoading, setGitSourceLoading] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    setActiveTab("variants");
    setFileTree(null);
    setFileTreeError(null);
    setFileTreeLoading(false);
    setSelectedFilePath(selectedSkill?.skill_md ?? null);
    setSelectedFileContent(null);
    setSelectedFileError(null);
    setSelectedFileLoading(false);
    setInstallStatuses(null);
    setInstallsError(null);
    setInstallsLoading(false);
    setInstallActionTarget(null);
    setOrigins(null);
    setOriginsError(null);
    setOriginsLoading(false);
    setEditingVariantLabel(false);
    setVariantLabelDraft(selectedSkill?.variant_label ?? "");
    setVariantLabelSaving(false);
    setVariantLabelError(null);
    setDirectoryDiff(null);
    setDirectoryDiffLoading(false);
    setDirectoryDiffError(null);
    setSelectedDiffFile(null);
    setHistory(null);
    setHistoryLoading(false);
    setHistoryError(null);
    setPromotingPath(null);
    setGitSource(null);
    setGitSourceLoading(false);
  }, [selectedSkill?.path, selectedSkill?.skill_md]);

  useEffect(() => {
    if (!selectedSkill) {
      return;
    }
    let cancelled = false;
    setGitSourceLoading(true);
    loadManagedGitSource(selectedSkill.path)
      .then((source) => {
        if (!cancelled) {
          setGitSource(source);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGitSource(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setGitSourceLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSkill?.path]);

  useEffect(() => {
    if (
      !selectedSkill ||
      activeTab !== "variants" ||
      history ||
      historyError
    ) {
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    void loadManagedSkillHistory(selectedSkill.path)
      .then((nextHistory) => {
        if (!cancelled) {
          setHistory(nextHistory);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setHistoryError(
            error instanceof Error ? error.message : text.defaultScanError,
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    history,
    historyError,
    selectedSkill,
    text.defaultScanError,
  ]);

  useEffect(() => {
    if (
      !selectedSkill ||
      activeTab !== "files" ||
      fileTree ||
      fileTreeError
    ) {
      return;
    }

    let cancelled = false;
    setFileTreeLoading(true);
    setFileTreeError(null);

    void loadSkillFileTree(selectedSkill.path)
      .then((tree) => {
        if (!cancelled) {
          setFileTree(tree);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFileTreeError(
            error instanceof Error ? error.message : text.defaultPreviewError,
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFileTreeLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    fileTree,
    fileTreeError,
    selectedSkill,
    text.defaultPreviewError,
  ]);

  useEffect(() => {
    if (
      !selectedSkill ||
      activeTab !== "files" ||
      !selectedFilePath ||
      selectedFileContent ||
      selectedFileError
    ) {
      return;
    }

    let cancelled = false;
    setSelectedFileLoading(true);
    setSelectedFileError(null);

    void readSkillTextFile(selectedFilePath)
      .then((content) => {
        if (!cancelled) {
          setSelectedFileContent(content);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSelectedFileError(
            error instanceof Error ? error.message : text.filePreviewUnavailable,
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSelectedFileLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    selectedFileContent,
    selectedFileError,
    selectedFilePath,
    selectedSkill,
    text.filePreviewUnavailable,
  ]);

  useEffect(() => {
    if (
      !selectedSkill ||
      activeTab !== "installs" ||
      installStatuses ||
      installsError
    ) {
      return;
    }

    let cancelled = false;
    setInstallsLoading(true);
    setInstallsError(null);

    void loadSkillInstallStatuses(selectedSkill.path)
      .then((statuses) => {
        if (!cancelled) {
          setInstallStatuses(statuses);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setInstallsError(
            error instanceof Error ? error.message : text.defaultScanError,
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setInstallsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    installStatuses,
    installsError,
    selectedSkill,
    text.defaultScanError,
  ]);

  useEffect(() => {
    if (
      !selectedSkill ||
      activeTab !== "origins" ||
      origins ||
      originsError
    ) {
      return;
    }

    let cancelled = false;
    setOriginsLoading(true);
    setOriginsError(null);

    void loadSkillOrigins(selectedSkill.path)
      .then((records) => {
        if (!cancelled) {
          setOrigins(records);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setOriginsError(
            error instanceof Error ? error.message : text.defaultScanError,
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOriginsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    origins,
    originsError,
    selectedSkill,
    text.defaultScanError,
  ]);

  async function handleCompareVariant(comparePath: string) {
    if (!selectedSkill) {
      return;
    }

    setDirectoryDiffLoading(true);
    setDirectoryDiffError(null);
    setSelectedDiffFile(null);

    try {
      const nextDiff = await diffSkills(selectedSkill.path, comparePath);
      setDirectoryDiff(nextDiff);
      const firstModified = nextDiff.file_diffs.find(
        (d) => d.kind === "modified",
      );
      if (firstModified) {
        setSelectedDiffFile(firstModified);
      }
    } catch (error: unknown) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      const friendlyMessage = rawMessage.includes("Path is outside configured skill roots")
        ? text.diffPathNotAllowedError
        : rawMessage;
      setDirectoryDiffError(friendlyMessage);
    } finally {
      setDirectoryDiffLoading(false);
    }
  }

  const currentVariantLabel =
    selectedSkill?.variant_label?.trim() || text.variantLabelFallback;
  const promotedManagedPath = history?.promoted_managed_skill_path ?? null;
  const promotedVariantLabel =
    history?.promoted_variant_label?.trim() || currentVariantLabel;
  const currentIsPromoted = promotedManagedPath
    ? promotedManagedPath === selectedSkill?.path
    : familySkills.length <= 1;

  if (!selectedSkill) {
    return (
      <aside className={styles.detailsPanel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.sectionLabel}>{text.detailsTitle}</p>
            <h2 className={styles.panelTitle}>{text.detailsEmptyTitle}</h2>
          </div>
        </div>
        <div className={styles.emptyPanel}>{text.detailsEmptyBody}</div>
      </aside>
    );
  }

  return (
    <aside className={styles.detailsPanel}>
      {onBack ? (
        <div style={{ marginBottom: 12 }}>
          <button type="button" className={styles.libraryBackButton} onClick={onBack}>
            ← {text.backToGallery ?? "Back to gallery"}
          </button>
        </div>
      ) : null}
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.sectionLabel}>{text.detailsTitle}</p>
          <h2 className={styles.panelTitle}>{selectedSkill.display_name}</h2>
        </div>
        <div className={styles.badgeRow}>
          <span className={styles.badge}>{scopeLabel(selectedSkill.scope, language)}</span>
          <span className={styles.agentBadge} data-agent={selectedSkill.agent}>
            {agentLabel(selectedSkill.agent)}
          </span>
          <span className={styles.sourceBadge}>
            {sourceLabel(selectedSkill.source_type, language)}
          </span>
        </div>
      </div>

      <p className={styles.detailsDescription}>
        {selectedSkill.description ?? text.descriptionFallback}
      </p>

      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onOpenPath(selectedSkill.path)}
        >
          {text.openFolder}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onOpenPath(selectedSkill.skill_md)}
        >
          {text.openSkillFile}
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => setShowInstallModal(true)}
        >
          {text.installToCustomLocation}
        </button>
      </div>

      <div className={styles.detailTabBarUnderline}>
        <DetailTabButton
          active={activeTab === "variants"}
          label={text.detailVariantsTab}
          onClick={() => setActiveTab("variants")}
        />
        <DetailTabButton
          active={activeTab === "content"}
          label={text.detailContentTab}
          onClick={() => setActiveTab("content")}
        />
        <DetailTabButton
          active={activeTab === "files"}
          label={text.detailFilesTab}
          onClick={() => setActiveTab("files")}
        />
        <DetailTabButton
          active={activeTab === "installs"}
          label={text.detailInstallsTab}
          onClick={() => setActiveTab("installs")}
        />
        <DetailTabButton
          active={activeTab === "origins"}
          label={text.detailOriginsTab}
          onClick={() => setActiveTab("origins")}
        />
      </div>

      {activeTab === "variants" ? (
        <section className={styles.detailStack}>
          <div className={styles.variantFamilyPanel}>
            <div className={styles.discoveryGroupHeader}>
              <div>
                <p className={styles.sectionLabel}>{text.familyVariantsTitle}</p>
                <p className={styles.helperText}>{text.familyVariantsBody}</p>
              </div>
              {!currentIsPromoted ? (
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={promotingPath === selectedSkill.path}
                  title={text.promoteHint}
                  onClick={async () => {
                    setPromotingPath(selectedSkill.path);
                    try {
                      await onPromoteVariant(selectedSkill.path);
                      const nextHistory = await loadManagedSkillHistory(selectedSkill.path);
                      setHistory(nextHistory);
                    } catch (error: unknown) {
                      setHistoryError(
                        error instanceof Error ? error.message : text.defaultScanError,
                      );
                    } finally {
                      setPromotingPath(null);
                    }
                  }}
                >
                  {promotingPath === selectedSkill.path
                    ? text.refreshingIndex
                    : text.promoteVariantAction}
                </button>
              ) : null}
              {hasUpdateFor(selectedSkill.path) ? (
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={updatingPath === selectedSkill.path}
                  onClick={() => onUpdateSkill(selectedSkill.path)}
                >
                  {updatingPath === selectedSkill.path
                    ? text.updatingSkill
                    : text.updateSkill}
                </button>
              ) : null}
            </div>
            <div className={styles.metaGrid}>
              <div>
                <span>{text.currentVariantLabel}</span>
                <strong>{currentVariantLabel}</strong>
              </div>
              <div>
                <span>{text.promotedVariantLabel}</span>
                <strong>{promotedVariantLabel}</strong>
              </div>
              <div>
                <span>{text.familyKeyLabel}</span>
                <strong>{selectedSkill.family_key}</strong>
              </div>
              <div>
                <span>{text.contentHashLabel}</span>
                <strong>{selectedSkill.content_hash}</strong>
              </div>
            </div>
          </div>

          <div className={styles.variantEditor}>
            <div className={styles.sectionIntro}>
              <p className={styles.sectionLabel}>{text.variantLabelTitle}</p>
              <p className={styles.helperText}>{text.variantLabelBody}</p>
            </div>

            {editingVariantLabel ? (
              <div className={styles.variantEditorForm}>
                <input
                  className={styles.searchField}
                  onChange={(event) => setVariantLabelDraft(event.target.value)}
                  placeholder={text.variantLabelPlaceholder}
                  value={variantLabelDraft}
                />
                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={variantLabelSaving}
                    onClick={async () => {
                      setVariantLabelSaving(true);
                      setVariantLabelError(null);
                      try {
                        await onUpdateVariantLabel(selectedSkill.path, variantLabelDraft);
                        setEditingVariantLabel(false);
                      } catch (error: unknown) {
                        setVariantLabelError(
                          error instanceof Error ? error.message : text.defaultScanError,
                        );
                      } finally {
                        setVariantLabelSaving(false);
                      }
                    }}
                  >
                    {variantLabelSaving ? text.savingVariantLabel : text.saveVariantLabel}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={variantLabelSaving}
                    onClick={() => {
                      setVariantLabelDraft(selectedSkill.variant_label ?? "");
                      setVariantLabelError(null);
                      setEditingVariantLabel(false);
                    }}
                  >
                    {text.cancelVariantLabel}
                  </button>
                </div>
                {variantLabelError ? (
                  <div className={styles.emptyPanel}>{variantLabelError}</div>
                ) : null}
              </div>
            ) : (
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setVariantLabelDraft(selectedSkill.variant_label ?? "");
                    setVariantLabelError(null);
                    setEditingVariantLabel(true);
                  }}
                >
                  {text.editVariantLabel}
                </button>
              </div>
            )}
          </div>

          <div className={styles.variantFamilyPanel}>
            <div className={styles.sectionIntro}>
              <p className={styles.sectionLabel}>{text.revisionHistoryTitle}</p>
            </div>
            {historyLoading ? (
              <div className={styles.emptyPanel}>{text.loadingPreview}</div>
            ) : historyError ? (
              <div className={styles.emptyPanel}>{historyError}</div>
            ) : history && history.variants.length > 0 ? (
              <div className={styles.variantFamilyList}>
                {history.variants.map((variant) => (
                  <div key={variant.variant_label} className={styles.variantFamilyPanel}>
                    <div className={styles.sectionIntro}>
                      <p className={styles.sectionLabel}>{variant.variant_label}</p>
                    </div>
                    <div className={styles.targetRecordedList}>
                      {variant.revisions.map((revision) => {
                        const matchingSkill = familySkills.find(
                          (skill) => skill.path === revision.managed_skill_path,
                        );
                        const isCurrent = selectedSkill.path === revision.managed_skill_path;

                        return (
                          <div key={revision.managed_skill_path} className={styles.targetItemCard}>
                            <div className={styles.discoveryGroupHeader}>
                              <div>
                                <strong>{revision.display_name}</strong>
                                <div className={styles.groupMetaRow}>
                                  <span className={styles.inlineTag}>
                                    {text.revisionHashLabel}: {revision.revision_hash.slice(0, 8)}
                                  </span>
                                  {revision.is_promoted ? (
                                    <span className={styles.inlineTag}>
                                      {text.promotedVariantLabel}
                                    </span>
                                  ) : null}
                                  {isCurrent ? (
                                    <span className={styles.inlineTag}>
                                      {text.currentVariantLabel}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <div className={styles.actionRow}>
                                {!isCurrent ? (
                                  <button
                                    type="button"
                                    className={styles.secondaryButton}
                                    onClick={() => onSelectSkill(revision.managed_skill_path)}
                                  >
                                    {text.switchVariantAction}
                                  </button>
                                ) : null}
                                {!revision.is_promoted ? (
                                  <button
                                    type="button"
                                    className={styles.secondaryButton}
                                    disabled={promotingPath === revision.managed_skill_path}
                                    title={text.promoteHint}
                                    onClick={async () => {
                                      setPromotingPath(revision.managed_skill_path);
                                      try {
                                        await onPromoteVariant(revision.managed_skill_path);
                                        const nextHistory = await loadManagedSkillHistory(
                                          isCurrent && selectedSkill
                                            ? selectedSkill.path
                                            : revision.managed_skill_path,
                                        );
                                        setHistory(nextHistory);
                                      } catch (error: unknown) {
                                        setHistoryError(
                                          error instanceof Error
                                            ? error.message
                                            : text.defaultScanError,
                                        );
                                      } finally {
                                        setPromotingPath(null);
                                      }
                                    }}
                                  >
                                    {promotingPath === revision.managed_skill_path
                                      ? text.refreshingIndex
                                      : text.promoteVariantAction}
                                  </button>
                                ) : null}
                                {matchingSkill && !isCurrent ? (
                                  <button
                                    type="button"
                                    className={styles.primaryButton}
                                    onClick={() => void handleCompareVariant(matchingSkill.path)}
                                  >
                                    {text.compareWithCurrent}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            <p className={styles.helperText}>
                              {text.lastUpdatedLabel}: {formatTimestamp(revision.created_unix_ms, language)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyPanel}>{text.compareEmptyBody}</div>
            )}
          </div>

          {directoryDiffLoading ? (
            <div className={styles.emptyPanel}>{text.loadingPreview}</div>
          ) : directoryDiffError ? (
            <div className={styles.emptyPanel}>{directoryDiffError}</div>
          ) : directoryDiff ? (
            <section className={styles.comparisonPanel}>
              <div className={styles.sectionIntro}>
                <p className={styles.sectionLabel}>{text.diffTitle}</p>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setDirectoryDiff(null);
                    setSelectedDiffFile(null);
                  }}
                >
                  {text.closeDiff}
                </button>
              </div>
              {directoryDiff.file_diffs.filter((d) => d.kind !== "unchanged").length === 0 ? (
                <div className={styles.emptyPanel}>
                  <strong>{text.diffEmptyTitle}</strong>
                  <p>{text.diffEmptyBody}</p>
                </div>
              ) : (
                <div className={styles.diffLayout}>
                  <div className={styles.diffFileList}>
                    {directoryDiff.file_diffs
                      .filter((d) => d.kind !== "unchanged")
                      .map((fileDiff) => (
                        <button
                          key={fileDiff.relative_path}
                          type="button"
                          className={styles.diffFileButton}
                          data-active={selectedDiffFile?.relative_path === fileDiff.relative_path}
                          onClick={() => setSelectedDiffFile(fileDiff)}
                        >
                          <span
                            className={styles.diffBadge}
                            data-kind={fileDiff.kind}
                          >
                            {fileDiff.kind === "added" && text.diffAdded}
                            {fileDiff.kind === "removed" && text.diffRemoved}
                            {fileDiff.kind === "modified" && text.diffModified}
                          </span>
                          <span className={styles.diffFileName}>
                            {fileDiff.relative_path}
                          </span>
                        </button>
                      ))}
                  </div>
                  <div className={styles.diffContent}>
                    {selectedDiffFile ? (
                      <>
                        <div className={styles.diffContentHeader}>
                          <strong>{selectedDiffFile.relative_path}</strong>
                          {selectedDiffFile.left_hash && selectedDiffFile.right_hash ? (
                            <div className={styles.diffHashRow}>
                              <span>
                                {text.leftHashLabel}: {selectedDiffFile.left_hash.slice(0, 8)}
                              </span>
                              <span>
                                {text.rightHashLabel}: {selectedDiffFile.right_hash.slice(0, 8)}
                              </span>
                            </div>
                          ) : null}
                        </div>
                        {selectedDiffFile.unified_diff ? (
                          <pre className={styles.diffUnified}>
                            {selectedDiffFile.unified_diff}
                          </pre>
                        ) : (
                          <div className={styles.emptyPanel}>
                            {text.noDiffAvailable}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={styles.emptyPanel}>
                        {text.selectVariantToCompare}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          ) : null}
        </section>
      ) : null}

      {activeTab === "content" ? (
        <section className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <p className={styles.sectionLabel}>{text.previewLabel}</p>
          </div>
          <div className={styles.previewFrame}>
            {previewLoading ? (
              <p className={styles.previewState}>{text.loadingPreview}</p>
            ) : previewError ? (
              <p className={styles.previewState}>{previewError}</p>
            ) : previewContent ? (
              <pre className={styles.previewContent}>{previewContent}</pre>
            ) : (
              <p className={styles.previewState}>{text.previewUnavailable}</p>
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "files" ? (
        <section className={styles.detailSection}>
          {fileTreeLoading ? (
            <div className={styles.emptyPanel}>{text.loadingFiles}</div>
          ) : fileTreeError ? (
            <div className={styles.emptyPanel}>{fileTreeError}</div>
          ) : fileTree ? (
            <div className={styles.fileBrowser}>
              <div className={styles.fileTreePane}>
                <p className={styles.sectionLabel}>{text.fileTreeTitle}</p>
                <FileTreeView
                  language={language}
                  onSelectFile={(path) => {
                    setSelectedFilePath(path);
                    setSelectedFileContent(null);
                    setSelectedFileError(null);
                  }}
                  selectedFilePath={selectedFilePath}
                  tree={fileTree}
                />
              </div>

              <div className={styles.fileViewerPane}>
                <div className={styles.previewHeader}>
                  <p className={styles.sectionLabel}>{text.fileViewerTitle}</p>
                  {selectedFilePath ? (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => onOpenPath(selectedFilePath)}
                    >
                      {text.openSkillFile}
                    </button>
                  ) : null}
                </div>
                <div className={styles.previewFrame}>
                  {selectedFileLoading ? (
                    <p className={styles.previewState}>{text.loadingFile}</p>
                  ) : selectedFileError ? (
                    <p className={styles.previewState}>{selectedFileError}</p>
                  ) : selectedFileContent ? (
                    <pre className={styles.previewContent}>{selectedFileContent}</pre>
                  ) : (
                    <p className={styles.previewState}>{text.filePreviewUnavailable}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.emptyPanel}>{text.noFilesBody}</div>
          )}
        </section>
      ) : null}

      {activeTab === "installs" ? (
        <section className={styles.detailSection}>
          {installsLoading ? (
            <div className={styles.emptyPanel}>{text.loadingInstalls}</div>
          ) : (
            <>
              {installsError ? (
                <div className={styles.inlineMessage}>{installsError}</div>
              ) : null}

              <div className={styles.variantFamilyPanel} style={{ marginBottom: 20 }}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setShowInstallModal(true)}
                >
                  {text.installToCustomLocation}
                </button>
              </div>

              {installStatuses && installStatuses.length > 0 ? (
                <div className={styles.installGrid}>
                  {installStatuses.map((status) => (
                    <InstallCard
                      key={status.target_id}
                      actionBusy={installActionTarget === status.target_id}
                      language={language}
                      onOpenPath={onOpenPath}
                      onRunAction={async (action) => {
                        setInstallActionTarget(status.target_id);
                        setInstallsError(null);
                        try {
                          const next =
                            action === "install"
                              ? await installSkillToTarget(selectedSkill.path, status.target_root)
                              : action === "remove"
                                ? await removeSkillFromTarget(selectedSkill.path, status.target_root)
                                : await repairSkillTarget(selectedSkill.path, status.target_root);
                          setInstallStatuses(next);
                        } catch (error: unknown) {
                          setInstallsError(
                            error instanceof Error ? error.message : text.defaultScanError,
                          );
                        } finally {
                          setInstallActionTarget(null);
                        }
                      }}
                      status={status}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyPanel}>{text.noTargetsBody}</div>
              )}
            </>
          )}
        </section>
      ) : null}

      {activeTab === "origins" ? (
        <section className={styles.detailSection}>
          {gitSourceLoading ? (
            <div className={styles.emptyPanel}>{text.loadingOrigins}</div>
          ) : gitSource ? (
            <div className={styles.originList}>
              <article className={styles.originCard}>
                <div className={styles.badgeRow}>
                  <span className={styles.sourceBadge}>{text.gitOriginLabel}</span>
                  <span className={styles.badge}>{text.originsRecordedLabel}</span>
                </div>
                <strong>{gitSource.git_url}</strong>
                <p>
                  {text.gitCommitLabel}: <code>{gitSource.git_commit}</code>
                </p>
                {gitSource.git_branch ? (
                  <p>
                    {text.gitBranchLabel}: {gitSource.git_branch}
                  </p>
                ) : null}
                {gitSource.repo_subpath ? (
                  <p>Path: {gitSource.repo_subpath}</p>
                ) : null}
              </article>
            </div>
          ) : null}

          {originsLoading ? (
            <div className={styles.emptyPanel}>{text.loadingOrigins}</div>
          ) : originsError ? (
            <div className={styles.emptyPanel}>{originsError}</div>
          ) : origins && origins.length > 0 ? (
            <div className={styles.originList}>
              {origins.map((origin) => (
                <article
                  key={`${origin.origin}-${origin.recorded_unix_ms}`}
                  className={styles.originCard}
                >
                  <div className={styles.badgeRow}>
                    <span className={styles.sourceBadge}>
                      {sourceLabel(origin.source_type, language)}
                    </span>
                    <span className={styles.badge}>{text.originsRecordedLabel}</span>
                  </div>
                  <strong>{origin.origin}</strong>
                  <p>
                    {text.lastUpdatedLabel}: {formatTimestamp(origin.recorded_unix_ms, language)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyPanel}>{text.originsEmptyBody}</div>
          )}
        </section>
      ) : null}

      {showInstallModal ? (
        <InstallModal
          skill={selectedSkill}
          language={language}
          onClose={() => setShowInstallModal(false)}
          onInstall={async (targetPath, targetAgent, targetMethod) => {
            setInstallsError(null);
            try {
              const next = await installSkillToTarget(
                selectedSkill.path,
                targetPath,
                targetAgent,
                targetMethod,
              );
              setInstallStatuses(next);
              setShowInstallModal(false);
            } catch (error: unknown) {
              setInstallsError(error instanceof Error ? error.message : text.defaultScanError);
              throw error;
            }
          }}
        />
      ) : null}
    </aside>
  );
}

type DetailTabButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function DetailTabButton({ active, label, onClick }: DetailTabButtonProps) {
  return (
    <button
      type="button"
      className={active ? styles.detailTabUnderlineActive : styles.detailTabUnderline}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

type FileTreeViewProps = {
  language: Language;
  onSelectFile: (path: string) => void;
  selectedFilePath: string | null;
  tree: SkillFileNode;
};

function FileTreeView({
  language,
  onSelectFile,
  selectedFilePath,
  tree,
}: FileTreeViewProps) {
  return (
    <div className={styles.fileTreeList}>
      <FileTreeNodeView
        language={language}
        node={tree}
        onSelectFile={onSelectFile}
        selectedFilePath={selectedFilePath}
      />
    </div>
  );
}

type FileTreeNodeViewProps = {
  language: Language;
  node: SkillFileNode;
  onSelectFile: (path: string) => void;
  selectedFilePath: string | null;
};

function FileTreeNodeView({
  language,
  node,
  onSelectFile,
  selectedFilePath,
}: FileTreeNodeViewProps) {
  const isDirectory = node.kind === "directory";
  const isActive = selectedFilePath === node.path;

  return (
    <div className={styles.fileTreeNode}>
      {isDirectory ? (
        <div className={styles.fileTreeDirectory}>
          <strong>{node.name}</strong>
          <span>{node.children.length}</span>
        </div>
      ) : (
        <button
          type="button"
          className={isActive ? styles.fileTreeButtonActive : styles.fileTreeButton}
          onClick={() => onSelectFile(node.path)}
        >
          <span>{node.name}</span>
          <span>{node.kind === "symlink" ? "↗" : agentLabelLabel(language)}</span>
        </button>
      )}

      {node.children.length > 0 ? (
        <div className={styles.fileTreeChildren}>
          {node.children.map((child) => (
            <FileTreeNodeView
              key={child.path}
              language={language}
              node={child}
              onSelectFile={onSelectFile}
              selectedFilePath={selectedFilePath}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type InstallCardProps = {
  actionBusy: boolean;
  language: Language;
  onOpenPath: (path: string) => void;
  onRunAction: (action: "install" | "remove" | "repair") => Promise<void>;
  status: SkillInstallStatus;
};

function InstallCard({
  actionBusy,
  language,
  onOpenPath,
  onRunAction,
  status,
}: InstallCardProps) {
  const text = copy[language];
  const action = primaryActionForStatus(status);

  return (
    <article className={styles.installCard}>
      <div className={styles.installCardHeader}>
        <div>
          <strong>{status.target_root}</strong>
          <p>
            {agentLabel(status.agent)} · {scopeLabel(status.scope, language)}
            {status.project_root ? ` · ${status.project_root}` : ""}
          </p>
        </div>
        <span
          className={
            status.health_state === "healthy" || status.health_state === "copied"
              ? styles.statusHealthy
              : status.health_state === "conflict" || status.health_state === "broken"
                ? styles.statusWarning
                : styles.statusMissing
          }
        >
          {installHealthLabel(status.health_state, language)}
        </span>
      </div>

      <div className={styles.metaGrid}>
        <div>
          <span>{text.installPath}</span>
          <strong>{status.install_path}</strong>
        </div>
        <div>
          <span>{text.installMethodLabel}</span>
          <strong>
            {status.install_method
              ? installMethodLabel(status.install_method, language)
              : "—"}
          </strong>
        </div>
        <div>
          <span>{text.recordedInstallLabel}</span>
          <strong>{status.recorded ? "Yes" : "No"}</strong>
        </div>
        <div>
          <span>{text.pinnedInstallLabel}</span>
          <strong>{status.pinned ? "Yes" : "No"}</strong>
        </div>
        <div>
          <span>{text.variantLabelLabel}</span>
          <strong>{status.variant_label ?? text.variantLabelFallback}</strong>
        </div>
        <div>
          <span>{text.revisionHashLabel}</span>
          <strong>{status.content_hash}</strong>
        </div>
        <div>
          <span>{text.promotedVariantLabel}</span>
          <strong>{status.is_family_default ? "Yes" : "No"}</strong>
        </div>
        <div>
          <span>{text.lastActionLabel}</span>
          <strong>
            {status.last_action_unix_ms
              ? formatTimestamp(status.last_action_unix_ms, language)
              : "—"}
          </strong>
        </div>
      </div>

      {status.health_state === "conflict" ? (
        <p className={styles.helperText}>{text.conflictInstallBody}</p>
      ) : null}

      <div className={styles.installCardActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() =>
            onOpenPath(
              status.health_state === "not_installed" ||
                status.health_state === "missing_target"
                ? status.target_root
                : status.install_path,
            )
          }
        >
          {text.openDirectory}
        </button>

        {action ? (
          <button
            type="button"
            className={styles.primaryButton}
            disabled={actionBusy}
            onClick={() => void onRunAction(action)}
          >
            {actionBusy
              ? action === "install"
                ? text.installingLabel
                : action === "remove"
                  ? text.removingLabel
                  : status.health_state === "copied"
                    ? text.relinkingLabel
                    : text.repairingLabel
              : action === "install"
                ? text.installNow
                : action === "remove"
                  ? text.removeInstall
                  : status.health_state === "copied"
                    ? text.relinkInstall
                    : text.repairInstall}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function primaryActionForStatus(
  status: SkillInstallStatus,
): "install" | "remove" | "repair" | null {
  if (status.health_state === "not_installed" || status.health_state === "missing_target") {
    return "install";
  }
  if (status.health_state === "broken" || status.health_state === "copied") {
    return "repair";
  }
  if (status.health_state === "healthy") {
    return "remove";
  }
  return null;
}

function formatTimestamp(timestamp: number, language: Language) {
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function agentLabelLabel(language: Language) {
  return language === "en" ? "file" : "文件";
}
