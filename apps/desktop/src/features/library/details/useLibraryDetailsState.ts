import { useEffect, useState } from "react";
import {
  loadManagedSkillHistory,
  loadSkillFileTree,
  loadSkillInstallStatuses,
  loadSkillOrigins,
  readSkillTextFile,
} from "../../../api";
import { diffSkills, loadManagedGitSource } from "../../../api/library";
import { copy, friendlyErrorMessage, type Language } from "../../../i18n";
import type {
  ManagedGitSource,
  ManagedSkillHistory,
  ManagedSkillOrigin,
  SkillDirectoryDiff,
  SkillFileDiff,
  SkillFileNode,
  SkillInstallStatus,
} from "../../../types";

type DetailTab = "variants" | "content" | "files" | "installs" | "origins";

type UseLibraryDetailsStateOptions = {
  activeTab: DetailTab;
  language: Language;
  selectedSkill: import("../../../types").SkillItem | null;
};

export function useLibraryDetailsState({
  activeTab,
  language,
  selectedSkill,
}: UseLibraryDetailsStateOptions) {
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

  useEffect(() => {
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
  }, [selectedSkill?.path, selectedSkill?.skill_md, selectedSkill?.variant_label]);

  useEffect(() => {
    if (!selectedSkill) return;
    let cancelled = false;
    setGitSourceLoading(true);
    loadManagedGitSource(selectedSkill.path)
      .then((source) => { if (!cancelled) setGitSource(source); })
      .catch(() => { if (!cancelled) setGitSource(null); })
      .finally(() => { if (!cancelled) setGitSourceLoading(false); });
    return () => { cancelled = true; };
  }, [selectedSkill]);

  useTabLoadEffect(
    activeTab === "variants",
    selectedSkill?.path,
    history,
    historyError,
    loadManagedSkillHistory,
    setHistoryLoading,
    setHistoryError,
    setHistory,
    language,
  );

  useTabLoadEffect(
    activeTab === "files",
    selectedSkill?.path,
    fileTree,
    fileTreeError,
    loadSkillFileTree,
    setFileTreeLoading,
    setFileTreeError,
    setFileTree,
    language,
  );

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
      .then((content) => { if (!cancelled) setSelectedFileContent(content); })
      .catch((error: unknown) => { if (!cancelled) setSelectedFileError(friendlyErrorMessage(error, language)); })
      .finally(() => { if (!cancelled) setSelectedFileLoading(false); });
    return () => { cancelled = true; };
  }, [
    activeTab,
    selectedFileContent,
    selectedFileError,
    selectedFilePath,
    selectedSkill,
    language,
  ]);

  useTabLoadEffect(
    activeTab === "installs",
    selectedSkill?.path,
    installStatuses,
    installsError,
    loadSkillInstallStatuses,
    setInstallsLoading,
    setInstallsError,
    setInstallStatuses,
    language,
  );

  useTabLoadEffect(
    activeTab === "origins",
    selectedSkill?.path,
    origins,
    originsError,
    loadSkillOrigins,
    setOriginsLoading,
    setOriginsError,
    setOrigins,
    language,
  );

  function handleSelectFile(path: string) {
    setSelectedFilePath(path);
    setSelectedFileContent(null);
    setSelectedFileError(null);
  }

  async function handleCompareVariant(comparePath: string) {
    if (!selectedSkill) return;
    setDirectoryDiffLoading(true);
    setDirectoryDiffError(null);
    setSelectedDiffFile(null);
    try {
      const nextDiff = await diffSkills(selectedSkill.path, comparePath);
      setDirectoryDiff(nextDiff);
      const firstModified = nextDiff.file_diffs.find((d) => d.kind === "modified");
      if (firstModified) {
        setSelectedDiffFile(firstModified);
      }
    } catch (error: unknown) {
      const rawMessage = friendlyErrorMessage(error, language);
      const friendlyMessage = typeof rawMessage === "string" && rawMessage.includes("Path is outside configured skill roots")
        ? copy[language].diffPathNotAllowedError
        : rawMessage;
      setDirectoryDiffError(friendlyMessage);
    } finally {
      setDirectoryDiffLoading(false);
    }
  }

  return {
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
    setDirectoryDiffError,
    setDirectoryDiffLoading,
    setSelectedDiffFile,
    setHistory,
    setHistoryError,
    setPromotingPath,
    handleSelectFile,
    handleCompareVariant,
  };
}

function useTabLoadEffect<T>(
  active: boolean,
  skillPath: string | undefined,
  data: T | null | undefined,
  error: string | null,
  load: (path: string) => Promise<T>,
  setLoading: (v: boolean) => void,
  setError: (v: string | null) => void,
  setData: (v: T) => void,
  language: Language,
) {
  useEffect(() => {
    if (!active || !skillPath || data || error) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void load(skillPath)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err: unknown) => { if (!cancelled) setError(friendlyErrorMessage(err, language)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [active, skillPath, data, error, load, setLoading, setError, setData, language]);
}
