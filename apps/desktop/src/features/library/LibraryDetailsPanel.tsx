import { useState } from "react";
import styles from "../../App.module.css";
import {
  installSkillToTarget,
  loadManagedSkillHistory,
  loadSkillInstallStatuses,
  removeSkillFromTarget,
  repairSkillTarget,
} from "../../api";
import { InstallModal } from "./InstallModal";
import { useToast } from "../../components/ToastProvider";
import {
  agentLabel,
  copy,
  friendlyErrorMessage,
  scopeLabel,
  sourceLabel,
  type Language,
} from "../../i18n";
import type { AgentKind, SkillItem } from "../../types";
import { ContentTab } from "./details/ContentTab";
import { DetailTabButton } from "./details/DetailTabButton";
import { FilesTab } from "./details/FilesTab";
import { InstallsTab } from "./details/InstallsTab";
import { OriginsTab } from "./details/OriginsTab";
import { VariantsTab } from "./details/VariantsTab";
import { useLibraryDetailsState } from "./details/useLibraryDetailsState";

type DetailTab = "variants" | "content" | "files" | "installs" | "origins";

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
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<DetailTab>("variants");
  const [showInstallModal, setShowInstallModal] = useState(false);

  const {
    fileTree,
    fileTreeLoading,
    fileTreeError,
    selectedFilePath,
    selectedFileContent,
    selectedFileLoading,
    selectedFileError,
    installStatuses,
    installsLoading,
    installsError,
    installActionTarget,
    origins,
    originsLoading,
    originsError,
    editingVariantLabel,
    variantLabelDraft,
    variantLabelSaving,
    variantLabelError,
    directoryDiff,
    directoryDiffLoading,
    directoryDiffError,
    selectedDiffFile,
    history,
    historyLoading,
    historyError,
    promotingPath,
    gitSource,
    gitSourceLoading,
    setInstallActionTarget,
    setInstallsError,
    setInstallStatuses,
    setEditingVariantLabel,
    setVariantLabelDraft,
    setVariantLabelSaving,
    setVariantLabelError,
    setDirectoryDiff,
    setSelectedDiffFile,
    setHistory,
    setHistoryError,
    setPromotingPath,
    handleSelectFile,
    handleCompareVariant,
  } = useLibraryDetailsState({ activeTab, language, selectedSkill });

  async function handlePromoteVariant(path: string, isCurrent: boolean) {
    setPromotingPath(path);
    try {
      await onPromoteVariant(path);
      const historyPath = isCurrent && selectedSkill ? selectedSkill.path : path;
      const nextHistory = await loadManagedSkillHistory(historyPath);
      setHistory(nextHistory);
    } catch (error: unknown) {
      setHistoryError(friendlyErrorMessage(error, language));
    } finally {
      setPromotingPath(null);
    }
  }

  async function handleSaveVariantLabel() {
    if (!selectedSkill) return;
    setVariantLabelSaving(true);
    setVariantLabelError(null);
    try {
      await onUpdateVariantLabel(selectedSkill.path, variantLabelDraft);
      setEditingVariantLabel(false);
    } catch (error: unknown) {
      setVariantLabelError(friendlyErrorMessage(error, language));
    } finally {
      setVariantLabelSaving(false);
    }
  }

  function handleCancelVariantLabel() {
    setVariantLabelDraft(selectedSkill?.variant_label ?? "");
    setVariantLabelError(null);
    setEditingVariantLabel(false);
  }

  function handleStartEditingVariantLabel() {
    setVariantLabelDraft(selectedSkill?.variant_label ?? "");
    setVariantLabelError(null);
    setEditingVariantLabel(true);
  }

  async function handleInstallModalInstall(
    targetPath: string,
    targetAgents: AgentKind[],
    targetMethod: "symlink" | "copy",
  ) {
    if (!selectedSkill) return;
    setInstallsError(null);
    const errors: string[] = [];
    for (const agent of targetAgents) {
      try {
        await installSkillToTarget(selectedSkill.path, targetPath, agent, targetMethod);
      } catch (error: unknown) {
        errors.push(`${agentLabel(agent)}: ${friendlyErrorMessage(error, language)}`);
      }
    }
    if (errors.length > 0) {
      setInstallsError(errors.join("\n"));
      showToast(`${text.installFailed}\n${errors.join("\n")}`, "error");
    } else {
      showToast(text.installSuccess, "success");
      setShowInstallModal(false);
      try {
        const refreshed = await loadSkillInstallStatuses(selectedSkill.path);
        setInstallStatuses(refreshed);
      } catch {
        // ignore refresh error
      }
    }
  }

  async function handleRunInstallAction(
    targetId: string,
    targetRoot: string,
    action: "install" | "remove" | "repair",
  ) {
    if (!selectedSkill) return;
    setInstallActionTarget(targetId);
    setInstallsError(null);
    try {
      const next =
        action === "install"
          ? await installSkillToTarget(selectedSkill.path, targetRoot)
          : action === "remove"
            ? await removeSkillFromTarget(selectedSkill.path, targetRoot)
            : await repairSkillTarget(selectedSkill.path, targetRoot);
      setInstallStatuses(next);
    } catch (error: unknown) {
      setInstallsError(friendlyErrorMessage(error, language));
    } finally {
      setInstallActionTarget(null);
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
            ← {text.backToGallery}
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
        <VariantsTab
          language={language}
          selectedSkill={selectedSkill}
          familySkills={familySkills}
          history={history}
          historyLoading={historyLoading}
          historyError={historyError}
          directoryDiff={directoryDiff}
          directoryDiffLoading={directoryDiffLoading}
          directoryDiffError={directoryDiffError}
          selectedDiffFile={selectedDiffFile}
          currentVariantLabel={currentVariantLabel}
          promotedVariantLabel={promotedVariantLabel}
          currentIsPromoted={currentIsPromoted}
          promotingPath={promotingPath}
          updatingPath={updatingPath}
          editingVariantLabel={editingVariantLabel}
          variantLabelDraft={variantLabelDraft}
          variantLabelSaving={variantLabelSaving}
          variantLabelError={variantLabelError}
          hasUpdateFor={hasUpdateFor}
          onUpdateSkill={onUpdateSkill}
          onSelectSkill={onSelectSkill}
          onPromote={handlePromoteVariant}
          onUpdateVariantLabel={handleSaveVariantLabel}
          onCompareVariant={handleCompareVariant}
          onCloseDiff={() => {
            setDirectoryDiff(null);
            setSelectedDiffFile(null);
          }}
          onEditVariantLabel={handleStartEditingVariantLabel}
          onCancelVariantLabel={handleCancelVariantLabel}
          onChangeVariantLabelDraft={setVariantLabelDraft}
          onSelectDiffFile={setSelectedDiffFile}
        />
      ) : null}

      {activeTab === "content" ? (
        <ContentTab
          language={language}
          previewLoading={previewLoading}
          previewError={previewError}
          previewContent={previewContent}
        />
      ) : null}

      {activeTab === "files" ? (
        <FilesTab
          language={language}
          fileTreeLoading={fileTreeLoading}
          fileTreeError={fileTreeError}
          fileTree={fileTree}
          selectedFilePath={selectedFilePath}
          selectedFileLoading={selectedFileLoading}
          selectedFileError={selectedFileError}
          selectedFileContent={selectedFileContent}
          onSelectFile={handleSelectFile}
          onOpenPath={onOpenPath}
        />
      ) : null}

      {activeTab === "installs" ? (
        <InstallsTab
          language={language}
          installsLoading={installsLoading}
          installsError={installsError}
          installStatuses={installStatuses}
          installActionTarget={installActionTarget}
          onShowInstallModal={() => setShowInstallModal(true)}
          onRunAction={handleRunInstallAction}
          onOpenPath={onOpenPath}
        />
      ) : null}

      {activeTab === "origins" ? (
        <OriginsTab
          language={language}
          gitSourceLoading={gitSourceLoading}
          gitSource={gitSource}
          originsLoading={originsLoading}
          originsError={originsError}
          origins={origins}
        />
      ) : null}

      {showInstallModal ? (
        <InstallModal
          skill={selectedSkill}
          language={language}
          onClose={() => setShowInstallModal(false)}
          onInstall={handleInstallModalInstall}
        />
      ) : null}
    </aside>
  );
}
