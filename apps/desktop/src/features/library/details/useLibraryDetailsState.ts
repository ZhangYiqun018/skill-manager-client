import { useEffect, useReducer, useCallback } from "react";
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
  SkillItem,
} from "../../../types";

type DetailTab = "variants" | "content" | "files" | "installs" | "origins";

type State = {
  fileTree: SkillFileNode | null;
  fileTreeLoading: boolean;
  fileTreeError: string | null;
  selectedFilePath: string | null;
  selectedFileContent: string | null;
  selectedFileLoading: boolean;
  selectedFileError: string | null;
  installStatuses: SkillInstallStatus[] | null;
  installsLoading: boolean;
  installsError: string | null;
  installActionTarget: string | null;
  origins: ManagedSkillOrigin[] | null;
  originsLoading: boolean;
  originsError: string | null;
  editingVariantLabel: boolean;
  variantLabelDraft: string;
  variantLabelSaving: boolean;
  variantLabelError: string | null;
  directoryDiff: SkillDirectoryDiff | null;
  directoryDiffLoading: boolean;
  directoryDiffError: string | null;
  selectedDiffFile: SkillFileDiff | null;
  history: ManagedSkillHistory | null;
  historyLoading: boolean;
  historyError: string | null;
  promotingPath: string | null;
  gitSource: ManagedGitSource | null;
  gitSourceLoading: boolean;
};

export const initialState: State = {
  fileTree: null,
  fileTreeLoading: false,
  fileTreeError: null,
  selectedFilePath: null,
  selectedFileContent: null,
  selectedFileLoading: false,
  selectedFileError: null,
  installStatuses: null,
  installsLoading: false,
  installsError: null,
  installActionTarget: null,
  origins: null,
  originsLoading: false,
  originsError: null,
  editingVariantLabel: false,
  variantLabelDraft: "",
  variantLabelSaving: false,
  variantLabelError: null,
  directoryDiff: null,
  directoryDiffLoading: false,
  directoryDiffError: null,
  selectedDiffFile: null,
  history: null,
  historyLoading: false,
  historyError: null,
  promotingPath: null,
  gitSource: null,
  gitSourceLoading: false,
};

type Action =
  | { type: "RESET"; payload: { selectedSkill: SkillItem | null } }
  | { type: "SET_GIT_SOURCE"; payload: ManagedGitSource | null }
  | { type: "SET_GIT_SOURCE_LOADING"; payload: boolean }
  | { type: "SET_FILE_TREE"; payload: SkillFileNode | null }
  | { type: "SET_FILE_TREE_LOADING"; payload: boolean }
  | { type: "SET_FILE_TREE_ERROR"; payload: string | null }
  | { type: "SET_SELECTED_FILE_PATH"; payload: string | null }
  | { type: "SET_SELECTED_FILE_CONTENT"; payload: string | null }
  | { type: "SET_SELECTED_FILE_LOADING"; payload: boolean }
  | { type: "SET_SELECTED_FILE_ERROR"; payload: string | null }
  | { type: "SET_INSTALLS"; payload: SkillInstallStatus[] | null }
  | { type: "SET_INSTALLS_LOADING"; payload: boolean }
  | { type: "SET_INSTALLS_ERROR"; payload: string | null }
  | { type: "SET_INSTALL_ACTION_TARGET"; payload: string | null }
  | { type: "SET_ORIGINS"; payload: ManagedSkillOrigin[] | null }
  | { type: "SET_ORIGINS_LOADING"; payload: boolean }
  | { type: "SET_ORIGINS_ERROR"; payload: string | null }
  | { type: "SET_HISTORY"; payload: ManagedSkillHistory | null }
  | { type: "SET_HISTORY_LOADING"; payload: boolean }
  | { type: "SET_HISTORY_ERROR"; payload: string | null }
  | { type: "SET_DIRECTORY_DIFF"; payload: SkillDirectoryDiff | null }
  | { type: "SET_DIRECTORY_DIFF_LOADING"; payload: boolean }
  | { type: "SET_DIRECTORY_DIFF_ERROR"; payload: string | null }
  | { type: "SET_SELECTED_DIFF_FILE"; payload: SkillFileDiff | null }
  | { type: "SET_EDITING_VARIANT_LABEL"; payload: boolean }
  | { type: "SET_VARIANT_LABEL_DRAFT"; payload: string }
  | { type: "SET_VARIANT_LABEL_SAVING"; payload: boolean }
  | { type: "SET_VARIANT_LABEL_ERROR"; payload: string | null }
  | { type: "SET_PROMOTING_PATH"; payload: string | null };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "RESET":
      return {
        ...initialState,
        selectedFilePath: action.payload.selectedSkill?.skill_md ?? null,
        variantLabelDraft: action.payload.selectedSkill?.variant_label ?? "",
      };
    case "SET_GIT_SOURCE":
      return { ...state, gitSource: action.payload };
    case "SET_GIT_SOURCE_LOADING":
      return { ...state, gitSourceLoading: action.payload };
    case "SET_FILE_TREE":
      return { ...state, fileTree: action.payload };
    case "SET_FILE_TREE_LOADING":
      return { ...state, fileTreeLoading: action.payload };
    case "SET_FILE_TREE_ERROR":
      return { ...state, fileTreeError: action.payload };
    case "SET_SELECTED_FILE_PATH":
      return { ...state, selectedFilePath: action.payload };
    case "SET_SELECTED_FILE_CONTENT":
      return { ...state, selectedFileContent: action.payload };
    case "SET_SELECTED_FILE_LOADING":
      return { ...state, selectedFileLoading: action.payload };
    case "SET_SELECTED_FILE_ERROR":
      return { ...state, selectedFileError: action.payload };
    case "SET_INSTALLS":
      return { ...state, installStatuses: action.payload };
    case "SET_INSTALLS_LOADING":
      return { ...state, installsLoading: action.payload };
    case "SET_INSTALLS_ERROR":
      return { ...state, installsError: action.payload };
    case "SET_INSTALL_ACTION_TARGET":
      return { ...state, installActionTarget: action.payload };
    case "SET_ORIGINS":
      return { ...state, origins: action.payload };
    case "SET_ORIGINS_LOADING":
      return { ...state, originsLoading: action.payload };
    case "SET_ORIGINS_ERROR":
      return { ...state, originsError: action.payload };
    case "SET_HISTORY":
      return { ...state, history: action.payload };
    case "SET_HISTORY_LOADING":
      return { ...state, historyLoading: action.payload };
    case "SET_HISTORY_ERROR":
      return { ...state, historyError: action.payload };
    case "SET_DIRECTORY_DIFF":
      return { ...state, directoryDiff: action.payload };
    case "SET_DIRECTORY_DIFF_LOADING":
      return { ...state, directoryDiffLoading: action.payload };
    case "SET_DIRECTORY_DIFF_ERROR":
      return { ...state, directoryDiffError: action.payload };
    case "SET_SELECTED_DIFF_FILE":
      return { ...state, selectedDiffFile: action.payload };
    case "SET_EDITING_VARIANT_LABEL":
      return { ...state, editingVariantLabel: action.payload };
    case "SET_VARIANT_LABEL_DRAFT":
      return { ...state, variantLabelDraft: action.payload };
    case "SET_VARIANT_LABEL_SAVING":
      return { ...state, variantLabelSaving: action.payload };
    case "SET_VARIANT_LABEL_ERROR":
      return { ...state, variantLabelError: action.payload };
    case "SET_PROMOTING_PATH":
      return { ...state, promotingPath: action.payload };
    default:
      return state;
  }
}

type UseLibraryDetailsStateOptions = {
  activeTab: DetailTab;
  language: Language;
  selectedSkill: SkillItem | null;
};

export function useLibraryDetailsState({
  activeTab,
  language,
  selectedSkill,
}: UseLibraryDetailsStateOptions) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: "RESET", payload: { selectedSkill } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSkill?.path, selectedSkill?.skill_md, selectedSkill?.variant_label]);

  useEffect(() => {
    if (!selectedSkill) return;
    let cancelled = false;
    dispatch({ type: "SET_GIT_SOURCE_LOADING", payload: true });
    loadManagedGitSource(selectedSkill.path)
      .then((source) => {
        if (!cancelled) dispatch({ type: "SET_GIT_SOURCE", payload: source });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: "SET_GIT_SOURCE", payload: null });
      })
      .finally(() => {
        if (!cancelled) dispatch({ type: "SET_GIT_SOURCE_LOADING", payload: false });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSkill]);

  const setHistoryLoading = useCallback(
    (v: boolean) => dispatch({ type: "SET_HISTORY_LOADING", payload: v }),
    [dispatch]
  );
  const setHistoryError = useCallback(
    (v: string | null) => dispatch({ type: "SET_HISTORY_ERROR", payload: v }),
    [dispatch]
  );
  const setHistory = useCallback(
    (v: ManagedSkillHistory) => dispatch({ type: "SET_HISTORY", payload: v }),
    [dispatch]
  );

  useTabLoadEffect(
    activeTab === "variants",
    selectedSkill?.path,
    state.history,
    state.historyError,
    loadManagedSkillHistory,
    setHistoryLoading,
    setHistoryError,
    setHistory,
    language
  );

  const setFileTreeLoading = useCallback(
    (v: boolean) => dispatch({ type: "SET_FILE_TREE_LOADING", payload: v }),
    [dispatch]
  );
  const setFileTreeError = useCallback(
    (v: string | null) => dispatch({ type: "SET_FILE_TREE_ERROR", payload: v }),
    [dispatch]
  );
  const setFileTree = useCallback(
    (v: SkillFileNode) => dispatch({ type: "SET_FILE_TREE", payload: v }),
    [dispatch]
  );

  useTabLoadEffect(
    activeTab === "files",
    selectedSkill?.path,
    state.fileTree,
    state.fileTreeError,
    loadSkillFileTree,
    setFileTreeLoading,
    setFileTreeError,
    setFileTree,
    language
  );

  useEffect(() => {
    if (
      !selectedSkill ||
      activeTab !== "files" ||
      !state.selectedFilePath ||
      state.selectedFileContent ||
      state.selectedFileError
    ) {
      return;
    }
    let cancelled = false;
    dispatch({ type: "SET_SELECTED_FILE_LOADING", payload: true });
    dispatch({ type: "SET_SELECTED_FILE_ERROR", payload: null });
    void readSkillTextFile(state.selectedFilePath)
      .then((content) => {
        if (!cancelled) dispatch({ type: "SET_SELECTED_FILE_CONTENT", payload: content });
      })
      .catch((error: unknown) => {
        if (!cancelled)
          dispatch({
            type: "SET_SELECTED_FILE_ERROR",
            payload: friendlyErrorMessage(error, language),
          });
      })
      .finally(() => {
        if (!cancelled) dispatch({ type: "SET_SELECTED_FILE_LOADING", payload: false });
      });
    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    state.selectedFileContent,
    state.selectedFileError,
    state.selectedFilePath,
    selectedSkill,
    language,
  ]);

  const setInstallsLoading = useCallback(
    (v: boolean) => dispatch({ type: "SET_INSTALLS_LOADING", payload: v }),
    [dispatch]
  );
  const setInstallsError = useCallback(
    (v: string | null) => dispatch({ type: "SET_INSTALLS_ERROR", payload: v }),
    [dispatch]
  );
  const setInstalls = useCallback(
    (v: SkillInstallStatus[]) => dispatch({ type: "SET_INSTALLS", payload: v }),
    [dispatch]
  );

  useTabLoadEffect(
    activeTab === "installs",
    selectedSkill?.path,
    state.installStatuses,
    state.installsError,
    loadSkillInstallStatuses,
    setInstallsLoading,
    setInstallsError,
    setInstalls,
    language
  );

  const setOriginsLoading = useCallback(
    (v: boolean) => dispatch({ type: "SET_ORIGINS_LOADING", payload: v }),
    [dispatch]
  );
  const setOriginsError = useCallback(
    (v: string | null) => dispatch({ type: "SET_ORIGINS_ERROR", payload: v }),
    [dispatch]
  );
  const setOrigins = useCallback(
    (v: ManagedSkillOrigin[]) => dispatch({ type: "SET_ORIGINS", payload: v }),
    [dispatch]
  );

  useTabLoadEffect(
    activeTab === "origins",
    selectedSkill?.path,
    state.origins,
    state.originsError,
    loadSkillOrigins,
    setOriginsLoading,
    setOriginsError,
    setOrigins,
    language
  );

  const handleSelectFile = useCallback((path: string) => {
    dispatch({ type: "SET_SELECTED_FILE_PATH", payload: path });
    dispatch({ type: "SET_SELECTED_FILE_CONTENT", payload: null });
    dispatch({ type: "SET_SELECTED_FILE_ERROR", payload: null });
  }, []);

  const handleCompareVariant = useCallback(
    async (comparePath: string) => {
      if (!selectedSkill) return;
      dispatch({ type: "SET_DIRECTORY_DIFF_LOADING", payload: true });
      dispatch({ type: "SET_DIRECTORY_DIFF_ERROR", payload: null });
      dispatch({ type: "SET_SELECTED_DIFF_FILE", payload: null });
      try {
        const nextDiff = await diffSkills(selectedSkill.path, comparePath);
        dispatch({ type: "SET_DIRECTORY_DIFF", payload: nextDiff });
        const firstModified = nextDiff.file_diffs.find((d) => d.kind === "modified");
        if (firstModified) {
          dispatch({ type: "SET_SELECTED_DIFF_FILE", payload: firstModified });
        }
      } catch (error: unknown) {
        const rawMessage = friendlyErrorMessage(error, language);
        const friendlyMessage =
          typeof rawMessage === "string" &&
          rawMessage.includes("Path is outside configured skill roots")
            ? copy[language].diffPathNotAllowedError
            : rawMessage;
        dispatch({ type: "SET_DIRECTORY_DIFF_ERROR", payload: friendlyMessage });
      } finally {
        dispatch({ type: "SET_DIRECTORY_DIFF_LOADING", payload: false });
      }
    },
    [selectedSkill, language]
  );

  return {
    ...state,
    dispatch,
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
  language: Language
) {
  useEffect(() => {
    if (!active || !skillPath || data || error) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void load(skillPath)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(friendlyErrorMessage(err, language));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, skillPath, data, error, load, setLoading, setError, setData, language]);
}
