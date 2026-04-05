import type {
  AgentKind,
  AppError,
  AppTab,
  HealthState,
  SkillScope,
  SkillSourceType,
} from "./types";

import en from "./locales/en.json";
import zh from "./locales/zh.json";

export type Language = "en" | "zh";
export const LANGUAGE_STORAGE_KEY = "skill-manager.language";

export type Copy = {
  appName: string;
  tabs: Record<AppTab, string>;
  languageLabel: string;
  english: string;
  chinese: string;
  globalSearchLabel: string;
  globalSearchPlaceholder: string;
  healthOkay: string;
  healthIssues: string;
  scanFailedTitle: string;
  defaultScanError: string;
  defaultPreviewError: string;
  defaultOpenError: string;
  libraryTitle: string;
  libraryBody: string;
  discoverTitle: string;
  discoverBody: string;
  targetsTitle: string;
  targetsBody: string;
  settingsTitle: string;
  settingsBody: string;
  searchLabel: string;
  searchPlaceholder: string;
  refreshIndex: string;
  refreshingIndex: string;
  showing: string;
  of: string;
  skills: string;
  warningsInline: string;
  allAgents: string;
  allScopes: string;
  allSources: string;
  indexedInventory: string;
  familiesInline: string;
  detailsTitle: string;
  detailsEmptyTitle: string;
  detailsEmptyBody: string;
  detailOverviewTab: string;
  detailVariantsTab: string;
  detailContentTab: string;
  detailFilesTab: string;
  detailInstallsTab: string;
  detailOriginsTab: string;
  previewLabel: string;
  loadingPreview: string;
  previewUnavailable: string;
  loadingFile: string;
  loadingFiles: string;
  noFilesBody: string;
  fileTreeTitle: string;
  fileViewerTitle: string;
  filePreviewUnavailable: string;
  installPath: string;
  managedPathLabel: string;
  skillFile: string;
  sourceRoot: string;
  metadataLabel: string;
  descriptionFallback: string;
  openFolder: string;
  openSkillFile: string;
  emptyLibraryTitle: string;
  emptyLibraryBody: string;
  emptyLibraryWelcomeTitle: string;
  emptyLibraryWelcomeBody: string;
  emptyLibraryScanAction: string;
  emptyLibraryDiscoverAction: string;
  emptyLibraryFirstRunHint: string;
  clearSearch: string;
  userInvocable: string;
  projectRootLabel: string;
  familyKeyLabel: string;
  variantLabelLabel: string;
  variantLabelTitle: string;
  variantLabelBody: string;
  variantLabelPlaceholder: string;
  variantLabelFallback: string;
  tagsLabel: string;
  addTagPlaceholder: string;
  exportByTag: string;
  exportSuccess: string;
  noTags: string;
  filterByTag: string;
  addTagAction: string;
  installedLabel: string;
  installIssuesLabel: string;
  editVariantLabel: string;
  saveVariantLabel: string;
  savingVariantLabel: string;
  cancelVariantLabel: string;
  contentHashLabel: string;
  installTargetsTitle: string;
  targetStatusHealthy: string;
  targetStatusWarning: string;
  targetStatusMissing: string;
  installStatusNotInstalled: string;
  installStatusHealthy: string;
  installStatusCopied: string;
  installStatusBroken: string;
  installStatusConflict: string;
  installStatusMissingTarget: string;
  installMethodLabel: string;
  installMethodSymlink: string;
  installMethodCopy: string;
  installNow: string;
  removeInstall: string;
  repairInstall: string;
  relinkInstall: string;
  installingLabel: string;
  installSuccess: string;
  installFailed: string;
  removingLabel: string;
  repairingLabel: string;
  relinkingLabel: string;
  loadingInstalls: string;
  conflictInstallBody: string;
  recordedInstallLabel: string;
  scanDiskTitle: string;
  scanDiskBody: string;
  startScan: string;
  scanConfirmTitle: string;
  scanConfirmBody: string;
  scanConfirmAction: string;
  scanCancel: string;
  lastScanLabel: string;
  neverScanned: string;
  errorIo: string;
  errorNetwork: string;
  errorNotFound: string;
  errorValidation: string;
  errorPermissionDenied: string;
  errorAlreadyExists: string;
  errorCancelled: string;
  errorUnsupported: string;
  errorUnknown: string;
  importFolderTitle: string;
  importFolderBody: string;
  chooseFolder: string;
  importingFolder: string;
  sourceAgentLabel: string;
  sourceScopeLabel: string;
  remoteSearchTitle: string;
  remoteSearchBody: string;
  remoteSearchPlaceholder: string;
  offlineModeTitle: string;
  offlineModeBody: string;
  remoteSearchAction: string;
  remoteSearchLoading: string;
  remoteNoResults: string;
  remoteAdoptAction: string;
  remoteInstallsLabel: string;
  plannedNext: string;
  discoveredSkillsTitle: string;
  discoveredSkillsBody: string;
  noDiscoveredSkills: string;
  adoptNoteTitle: string;
  adoptNoteBody: string;
  adoptSkill: string;
  adoptingSkill: string;
  adoptSelected: string;
  discoveryFilterAll: string;
  discoverySummaryFound: string;
  discoveryReady: string;
  discoveryNeedReview: string;
  discoveryHasDuplicates: string;
  clearSelection: string;
  groupUnique: string;
  groupExactDuplicate: string;
  groupVariant: string;
  duplicateCountLabel: string;
  variantCountLabel: string;
  issuesLabel: string;
  discoveryGroupReady: string;
  discoveryGroupDuplicates: string;
  discoveryGroupNeedsReview: string;
  discoveryReviewVariants: string;
  discoveryAdoptGroup: string;
  discoveryReviewAndAdopt: string;
  discoveryFoundNTimes: string;
  discoverySelectedCount: string;
  discoveryClearAll: string;
  selectedCandidatesLabel: string;
  summaryOccurrencesLabel: string;
  summaryExactDuplicateGroupsLabel: string;
  summaryFamiliesLabel: string;
  summaryNeedsReviewLabel: string;
  exactDuplicateSectionTitle: string;
  exactDuplicateSectionBody: string;
  variantSectionTitle: string;
  variantSectionBody: string;
  uniqueSectionTitle: string;
  uniqueSectionBody: string;
  suggestedVersionLabel: string;
  provenancePathsLabel: string;
  adoptFamily: string;
  adoptSelectedInGroup: string;
  selectVariantsFirst: string;
  resolveVariants: string;
  mergeExactAction: string;
  createVariantAction: string;
  resolutionTitle: string;
  resolutionBody: string;
  selectedCandidatesTitle: string;
  existingVariantsTitle: string;
  compareAction: string;
  compareEmptyBody: string;
  comparisonTitle: string;
  compareWithCurrent: string;
  currentVariantLabel: string;
  switchVariantAction: string;
  promoteVariantAction: string;
  promotedVariantLabel: string;
  promoteHint: string;
  diffPathNotAllowedError: string;
  revisionHistoryTitle: string;
  revisionHashLabel: string;
  pinnedInstallLabel: string;
  commonFilesLabel: string;
  leftOnlyFilesLabel: string;
  rightOnlyFilesLabel: string;
  applyResolutionAction: string;
  closeResolution: string;
  globalTargetsTitle: string;
  projectTargetsTitle: string;
  totalTargetsLabel: string;
  healthyTargetsLabel: string;
  brokenTargetsLabel: string;
  loadingTargets: string;
  syncTarget: string;
  syncingTarget: string;
  repairTarget: string;
  repairingTarget: string;
  openDirectory: string;
  targetSkillsLabel: string;
  managedInstallsLabel: string;
  discoveredOnDiskLabel: string;
  targetRecordedItemsTitle: string;
  noRecordedInstallsBody: string;
  noTargetsTitle: string;
  noTargetsBody: string;
  loadingOrigins: string;
  originsEmptyBody: string;
  originsRecordedLabel: string;
  familyVariantsTitle: string;
  familyVariantsBody: string;
  versionedFamilyLabel: string;
  openVariantsAction: string;
  overviewVersioningTitle: string;
  overviewVersioningBody: string;
  warningsTitle: string;
  warningsBody: string;
  activeLanguage: string;
  savedLanguageHint: string;
  cacheStatusTitle: string;
  cacheStatusBody: string;
  indexPathLabel: string;
  storePathLabel: string;
  installStrategyTitle: string;
  installStrategyBody: string;
  installStrategyValueSymlinkFirst: string;
  lastUpdatedLabel: string;
  lastActionLabel: string;
  discoveryScopeTitle: string;
  discoveryScopeBody: string;
  goToDiscover: string;
  startScanEmpty: string;
  expand: string;
  collapse: string;
  emptyDiscoverTitle: string;
  emptyDiscoverBody: string;
  emptyTargetsTitle: string;
  emptyTargetsBody: string;
  goToAdopt: string;
  emptyExactDuplicateBody: string;
  emptyVariantBody: string;
  emptyUniqueBody: string;
  noMatchingSkillsBody: string;
  noSkillsInLibraryBody: string;
  updateAvailable: string;
  updateSkill: string;
  updatingSkill: string;
  gitOriginLabel: string;
  gitCommitLabel: string;
  gitBranchLabel: string;
  noUpdateAvailable: string;
  checkUpdates: string;
  checkingUpdates: string;
  diffAdded: string;
  diffRemoved: string;
  diffModified: string;
  diffUnchanged: string;
  diffEmptyTitle: string;
  diffEmptyBody: string;
  diffTitle: string;
  closeDiff: string;
  selectVariantToCompare: string;
  compareWithVariant: string;
  noDiffAvailable: string;
  fileDiffTitle: string;
  leftHashLabel: string;
  rightHashLabel: string;
  backToGallery: string;
  appearanceTitle: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  savedThemeHint: string;
  scanningDisk: string;
  scanDiskAction: string;
  adoptSkillAction: string;
  quickActionsTitle: string;
  managedSkillsLabel: string;
  workspaceHealthLabel: string;
  healthyStatus: string;
  issuesStatus: string;
  managedSkillsCount: string;
  guideTitle: string;
  guideBody: string;
  guideQuickStartTitle: string;
  guideQuickStartBody: string;
  guideLibraryTitle: string;
  guideLibraryBody: string;
  guideDiscoverTitle: string;
  guideDiscoverBody: string;
  guideTargetsTitle: string;
  guideTargetsBody: string;
  guideSettingsTitle: string;
  guideSettingsBody: string;
  guideShortcutsTitle: string;
  guideShortcutsBody: string;
  guideFaqTitle: string;
  guideFaqBody: string;
  customTargetsTitle: string;
  customTargetsBody: string;
  addCustomTarget: string;
  removeCustomTarget: string;
  customTargetLabel: string;
  customTargetPath: string;
  customTargetAgent: string;
  customTargetScope: string;
  noCustomTargets: string;
  selectFolder: string;
  customTargetAdded: string;
  customTargetRemoved: string;
  customTargetDeleteConfirm: string;
  installToCustomLocation: string;
  customInstallTitle: string;
  customInstallAgent: string;
  customInstallMethod: string;
  customInstallConfirm: string;
  installQuickTitle: string;
  installQuickGlobal: string;
  registryUrlTitle: string;
  registryUrlBody: string;
  manageCustomTargetsTitle: string;
  manageCustomTargetsBody: string;
  viewDetails: string;
  contextMenuInstallSuccess: string;
  contextMenuInstallFailed: string;
  cardInstallAction: string;
  brandTagline: string;
  yesLabel: string;
  noLabel: string;
  errorBoundaryTitle: string;
  errorBoundaryBody: string;
  errorBoundaryReload: string;
  cancel: string;
  registryBrowserTitle: string;
  registryBrowserBody: string;
  registryPopularTitle: string;
  registryAddToLibrary: string;
  registryLoadingReadme: string;
  registryLoadingPopular: string;
  registryAdoptedTitle: string;
  registryAdoptedBody: string;
  registryInstallNow: string;
  registryLater: string;
  scopeGlobal: string;
  scopeProject: string;
  discoverTabMarketplace: string;
  discoverTabLocal: string;
  registryAttribution: string;
  registryVisitSite: string;
  registrySearchHint: string;
  registryReadmeFallback: string;
  registryViewOnGitHub: string;
  registryViewOnSkillsSh: string;
  registryTotalSkills: string;
  tooltipRefreshIndex: string;
  tooltipHealthStatus: string;
  tooltipStartScan: string;
  tooltipImportFolder: string;
  tooltipInstallSkill: string;
  tooltipUpdateAvailable: string;
  registryUrlSaved: string;
  repoSubpathLabel: string;
};

export const copy: Record<Language, Copy> = {
  en: en as Copy,
  zh: zh as Copy,
};

export function scopeLabel(scope: SkillScope, language: Language): string {
  if (scope === "global") {
    return language === "en" ? "Global" : "全局";
  }

  return language === "en" ? "Project" : "项目";
}

export function agentLabel(agent: AgentKind): string {
  if (agent === "codex") {
    return "Codex";
  }
  if (agent === "agent") {
    return "Agent";
  }
  if (agent === "open_claw") {
    return "OpenClaw";
  }
  return "Claude Code";
}

export function sourceLabel(source: SkillSourceType, language: Language): string {
  if (source === "import") {
    return language === "en" ? "Import" : "导入";
  }

  if (source === "remote") {
    return language === "en" ? "Remote" : "远程";
  }

  return language === "en" ? "Disk" : "磁盘";
}

export function healthLabel(state: HealthState, language: Language): string {
  if (state === "missing") {
    return copy[language].targetStatusMissing;
  }

  if (state === "warning") {
    return copy[language].targetStatusWarning;
  }

  return copy[language].targetStatusHealthy;
}

function tryParseAppErrorFromMessage(message: string): AppError | null {
  try {
    const parsed = JSON.parse(message);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.kind === "string" &&
      typeof parsed.code === "string" &&
      typeof parsed.message === "string"
    ) {
      return parsed as AppError;
    }
  } catch {
    // not JSON
  }
  return null;
}

export function friendlyErrorMessage(error: unknown, language: Language): string {
  const text = copy[language];

  // Tauri usually throws a JS Error whose .message may contain a JSON-serialized AppError
  if (error instanceof Error && error.message) {
    const parsed = tryParseAppErrorFromMessage(error.message);
    if (parsed) {
      error = parsed;
    } else {
      return error.message;
    }
  }

  const appError = error as AppError | undefined;
  if (!appError || typeof appError !== "object") {
    return text.errorUnknown;
  }
  switch (appError.kind) {
    case "io":
      return text.errorIo;
    case "network":
      return text.errorNetwork;
    case "not_found":
      return text.errorNotFound;
    case "validation":
      return text.errorValidation;
    case "permission_denied":
      return text.errorPermissionDenied;
    case "already_exists":
      return text.errorAlreadyExists;
    case "cancelled":
      return text.errorCancelled;
    case "unsupported":
      return text.errorUnsupported;
    default:
      return appError.message || text.errorUnknown;
  }
}

export function installHealthLabel(
  state: "not_installed" | "healthy" | "copied" | "broken" | "conflict" | "missing_target",
  language: Language
): string {
  if (state === "healthy") {
    return copy[language].installStatusHealthy;
  }

  if (state === "copied") {
    return copy[language].installStatusCopied;
  }

  if (state === "broken") {
    return copy[language].installStatusBroken;
  }

  if (state === "conflict") {
    return copy[language].installStatusConflict;
  }

  if (state === "missing_target") {
    return copy[language].installStatusMissingTarget;
  }

  return copy[language].installStatusNotInstalled;
}

export function installMethodLabel(
  method: "symlink" | "copy" | null | undefined,
  language: Language
): string {
  if (method === "copy") {
    return copy[language].installMethodCopy;
  }

  return copy[language].installMethodSymlink;
}
