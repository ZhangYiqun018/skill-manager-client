import badges from "../../../styles/_badges.module.css";
import buttons from "../../../styles/_buttons.module.css";
import forms from "../../../styles/_forms.module.css";
import layout from "../../../styles/_layout.module.css";
import lists from "../../../styles/_lists.module.css";
import panels from "../../../styles/_panels.module.css";
import { copy, type Language } from "../../../i18n";
import type {
  ManagedSkillHistory,
  SkillDirectoryDiff,
  SkillFileDiff,
  SkillItem,
} from "../../../types";
import { formatTimestamp } from "./utils";

type VariantsTabProps = {
  language: Language;
  selectedSkill: SkillItem;
  familySkills: SkillItem[];
  history: ManagedSkillHistory | null;
  historyLoading: boolean;
  historyError: string | null;
  directoryDiff: SkillDirectoryDiff | null;
  directoryDiffLoading: boolean;
  directoryDiffError: string | null;
  selectedDiffFile: SkillFileDiff | null;
  currentVariantLabel: string;
  promotedVariantLabel: string;
  currentIsPromoted: boolean;
  promotingPath: string | null;
  updatingPath: string | null;
  editingVariantLabel: boolean;
  variantLabelDraft: string;
  variantLabelSaving: boolean;
  variantLabelError: string | null;
  hasUpdateFor: (path: string) => boolean;
  onUpdateSkill: (path: string) => void;
  onSelectSkill: (path: string) => void;
  onPromote: (path: string, isCurrent: boolean) => void;
  onUpdateVariantLabel: () => void;
  onCompareVariant: (comparePath: string) => void;
  onCloseDiff: () => void;
  onEditVariantLabel: () => void;
  onCancelVariantLabel: () => void;
  onChangeVariantLabelDraft: (value: string) => void;
  onSelectDiffFile: (file: SkillFileDiff | null) => void;
};

export function VariantsTab({
  language,
  selectedSkill,
  familySkills,
  history,
  historyLoading,
  historyError,
  directoryDiff,
  directoryDiffLoading,
  directoryDiffError,
  selectedDiffFile,
  currentVariantLabel,
  promotedVariantLabel,
  currentIsPromoted,
  promotingPath,
  updatingPath,
  editingVariantLabel,
  variantLabelDraft,
  variantLabelSaving,
  variantLabelError,
  hasUpdateFor,
  onUpdateSkill,
  onSelectSkill,
  onPromote,
  onUpdateVariantLabel,
  onCompareVariant,
  onCloseDiff,
  onEditVariantLabel,
  onCancelVariantLabel,
  onChangeVariantLabelDraft,
  onSelectDiffFile,
}: VariantsTabProps) {
  const text = copy[language];

  return (
    <section className={panels.detailStack}>
      <div className={lists.variantFamilyPanel}>
        <div className={layout.discoveryGroupHeader}>
          <div>
            <p className={layout.sectionLabel}>{text.familyVariantsTitle}</p>
            <p className={layout.helperText}>{text.familyVariantsBody}</p>
          </div>
          {!currentIsPromoted ? (
            <button
              type="button"
              className={buttons.primaryButton}
              disabled={promotingPath === selectedSkill.path}
              title={text.promoteHint}
              onClick={() => void onPromote(selectedSkill.path, true)}
            >
              {promotingPath === selectedSkill.path
                ? text.refreshingIndex
                : text.promoteVariantAction}
            </button>
          ) : null}
          {hasUpdateFor(selectedSkill.path) ? (
            <button
              type="button"
              className={buttons.primaryButton}
              disabled={updatingPath === selectedSkill.path}
              onClick={() => onUpdateSkill(selectedSkill.path)}
            >
              {updatingPath === selectedSkill.path ? text.updatingSkill : text.updateSkill}
            </button>
          ) : null}
        </div>
        <div className={layout.metaGrid}>
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

      <div className={panels.variantEditor}>
        <div className={layout.sectionIntro}>
          <p className={layout.sectionLabel}>{text.variantLabelTitle}</p>
          <p className={layout.helperText}>{text.variantLabelBody}</p>
        </div>

        {editingVariantLabel ? (
          <div className={panels.variantEditorForm}>
            <input
              className={forms.searchField}
              onChange={(event) => onChangeVariantLabelDraft(event.target.value)}
              placeholder={text.variantLabelPlaceholder}
              value={variantLabelDraft}
            />
            <div className={buttons.actionRow}>
              <button
                type="button"
                className={buttons.primaryButton}
                disabled={variantLabelSaving}
                onClick={() => void onUpdateVariantLabel()}
              >
                {variantLabelSaving ? text.savingVariantLabel : text.saveVariantLabel}
              </button>
              <button
                type="button"
                className={buttons.secondaryButton}
                disabled={variantLabelSaving}
                onClick={onCancelVariantLabel}
              >
                {text.cancelVariantLabel}
              </button>
            </div>
            {variantLabelError ? (
              <div className={panels.emptyPanel}>{variantLabelError}</div>
            ) : null}
          </div>
        ) : (
          <div className={buttons.actionRow}>
            <button type="button" className={buttons.secondaryButton} onClick={onEditVariantLabel}>
              {text.editVariantLabel}
            </button>
          </div>
        )}
      </div>

      <div className={lists.variantFamilyPanel}>
        <div className={layout.sectionIntro}>
          <p className={layout.sectionLabel}>{text.revisionHistoryTitle}</p>
        </div>
        {historyLoading ? (
          <div className={panels.emptyPanel}>{text.loadingPreview}</div>
        ) : historyError ? (
          <div className={panels.emptyPanel}>{historyError}</div>
        ) : history && history.variants.length > 0 ? (
          <div className={lists.variantFamilyList}>
            {history.variants.map((variant) => (
              <div key={variant.variant_label} className={lists.variantFamilyPanel}>
                <div className={layout.sectionIntro}>
                  <p className={layout.sectionLabel}>{variant.variant_label}</p>
                </div>
                <div className={lists.targetRecordedList}>
                  {variant.revisions.map((revision) => {
                    const matchingSkill = familySkills.find(
                      (skill) => skill.path === revision.managed_skill_path
                    );
                    const isCurrent = selectedSkill.path === revision.managed_skill_path;

                    return (
                      <div key={revision.managed_skill_path} className={lists.targetItemCard}>
                        <div className={layout.discoveryGroupHeader}>
                          <div>
                            <strong>{revision.display_name}</strong>
                            <div className={layout.groupMetaRow}>
                              <span className={badges.inlineTag}>
                                {text.revisionHashLabel}: {revision.revision_hash.slice(0, 8)}
                              </span>
                              {revision.is_promoted ? (
                                <span className={badges.inlineTag}>
                                  {text.promotedVariantLabel}
                                </span>
                              ) : null}
                              {isCurrent ? (
                                <span className={badges.inlineTag}>{text.currentVariantLabel}</span>
                              ) : null}
                            </div>
                          </div>
                          <div className={buttons.actionRow}>
                            {!isCurrent ? (
                              <button
                                type="button"
                                className={buttons.secondaryButton}
                                onClick={() => onSelectSkill(revision.managed_skill_path)}
                              >
                                {text.switchVariantAction}
                              </button>
                            ) : null}
                            {!revision.is_promoted ? (
                              <button
                                type="button"
                                className={buttons.secondaryButton}
                                disabled={promotingPath === revision.managed_skill_path}
                                title={text.promoteHint}
                                onClick={() =>
                                  void onPromote(revision.managed_skill_path, isCurrent)
                                }
                              >
                                {promotingPath === revision.managed_skill_path
                                  ? text.refreshingIndex
                                  : text.promoteVariantAction}
                              </button>
                            ) : null}
                            {matchingSkill && !isCurrent ? (
                              <button
                                type="button"
                                className={buttons.primaryButton}
                                onClick={() => void onCompareVariant(matchingSkill.path)}
                              >
                                {text.compareWithCurrent}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <p className={layout.helperText}>
                          {text.lastUpdatedLabel}:{" "}
                          {formatTimestamp(revision.created_unix_ms, language)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={panels.emptyPanel}>{text.compareEmptyBody}</div>
        )}
      </div>

      {directoryDiffLoading ? (
        <div className={panels.emptyPanel}>{text.loadingPreview}</div>
      ) : directoryDiffError ? (
        <div className={panels.emptyPanel}>{directoryDiffError}</div>
      ) : directoryDiff ? (
        <section className={panels.comparisonPanel}>
          <div className={layout.sectionIntro}>
            <p className={layout.sectionLabel}>{text.diffTitle}</p>
            <button type="button" className={buttons.secondaryButton} onClick={onCloseDiff}>
              {text.closeDiff}
            </button>
          </div>
          {directoryDiff.file_diffs.filter((d) => d.kind !== "unchanged").length === 0 ? (
            <div className={panels.emptyPanel}>
              <strong>{text.diffEmptyTitle}</strong>
              <p>{text.diffEmptyBody}</p>
            </div>
          ) : (
            <div className={layout.diffLayout}>
              <div className={lists.diffFileList}>
                {directoryDiff.file_diffs
                  .filter((d) => d.kind !== "unchanged")
                  .map((fileDiff) => (
                    <button
                      key={fileDiff.relative_path}
                      type="button"
                      className={buttons.diffFileButton}
                      data-active={selectedDiffFile?.relative_path === fileDiff.relative_path}
                      onClick={() => onSelectDiffFile(fileDiff)}
                    >
                      <span className={badges.diffBadge} data-kind={fileDiff.kind}>
                        {fileDiff.kind === "added" && text.diffAdded}
                        {fileDiff.kind === "removed" && text.diffRemoved}
                        {fileDiff.kind === "modified" && text.diffModified}
                      </span>
                      <span className={lists.diffFileName}>{fileDiff.relative_path}</span>
                    </button>
                  ))}
              </div>
              <div className={panels.diffContent}>
                {selectedDiffFile ? (
                  <>
                    <div className={panels.diffContentHeader}>
                      <strong>{selectedDiffFile.relative_path}</strong>
                      {selectedDiffFile.left_hash && selectedDiffFile.right_hash ? (
                        <div className={layout.diffHashRow}>
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
                      <pre className={panels.diffUnified}>{selectedDiffFile.unified_diff}</pre>
                    ) : (
                      <div className={panels.emptyPanel}>{text.noDiffAvailable}</div>
                    )}
                  </>
                ) : (
                  <div className={panels.emptyPanel}>{text.selectVariantToCompare}</div>
                )}
              </div>
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
