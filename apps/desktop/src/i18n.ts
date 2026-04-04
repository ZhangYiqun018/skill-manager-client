import type {
  AgentKind,
  AppTab,
  HealthState,
  SkillScope,
  SkillSourceType,
} from "./types";

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
  clearSearch: string;
  userInvocable: string;
  projectRootLabel: string;
  familyKeyLabel: string;
  variantLabelLabel: string;
  variantLabelTitle: string;
  variantLabelBody: string;
  variantLabelPlaceholder: string;
  variantLabelFallback: string;
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
  importFolderTitle: string;
  importFolderBody: string;
  chooseFolder: string;
  importingFolder: string;
  sourceAgentLabel: string;
  sourceScopeLabel: string;
  remoteSearchTitle: string;
  remoteSearchBody: string;
  remoteSearchPlaceholder: string;
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
  selectingRecommended: string;
  selectingProject: string;
  selectingCodex: string;
  selectingClaude: string;
  clearSelection: string;
  groupUnique: string;
  groupExactDuplicate: string;
  groupVariant: string;
  duplicateCountLabel: string;
  variantCountLabel: string;
  representativeCountLabel: string;
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
  reviewNeededLabel: string;
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
  customInstallScope: string;
  customInstallLabel: string;
  customInstallConfirm: string;
  manageCustomTargetsTitle: string;
  manageCustomTargetsBody: string;
};

export const copy: Record<Language, Copy> = {
  en: {
    appName: "Skill Manager",
    tabs: {
      library: "Library",
      discover: "Discover",
      targets: "Targets",
      settings: "Settings",
      guide: "Guide",
    },
    languageLabel: "Language",
    english: "EN",
    chinese: "中文",
    globalSearchLabel: "Global search",
    globalSearchPlaceholder: "Search indexed skills...",
    healthOkay: "Healthy",
    healthIssues: "issues",
    scanFailedTitle: "Index refresh failed",
    defaultScanError: "Could not refresh the skill inventory.",
    defaultPreviewError: "Could not read SKILL.md content.",
    defaultOpenError: "Could not open the selected path.",
    libraryTitle: "Library",
    libraryBody:
      "Browse managed skills already in the library and inspect their metadata.",
    discoverTitle: "Discover",
    discoverBody:
      "Bring new skills in, review grouped candidates, and adopt only the variants worth keeping.",
    targetsTitle: "Targets",
    targetsBody:
      "Use this page as a repair console when install targets drift or break.",
    settingsTitle: "Settings",
    settingsBody:
      "Keep settings minimal: runtime paths and language only.",
    searchLabel: "Search skills",
    searchPlaceholder: "Filter by name, description, or source...",
    refreshIndex: "Refresh index",
    refreshingIndex: "Refreshing...",
    showing: "Showing",
    of: "of",
    skills: "skills",
    warningsInline: "warnings",
    allAgents: "All agents",
    allScopes: "All scopes",
    allSources: "All sources",
    indexedInventory: "Indexed inventory",
    familiesInline: "families",
    detailsTitle: "Details",
    detailsEmptyTitle: "Select a skill",
    detailsEmptyBody:
      "Pick a row to inspect metadata, current targets, and the SKILL.md preview.",
    detailOverviewTab: "Overview",
    detailVariantsTab: "Variants",
    detailContentTab: "Content",
    detailFilesTab: "Files",
    detailInstallsTab: "Installs",
    detailOriginsTab: "Origins",
    previewLabel: "SKILL.md preview",
    loadingPreview: "Loading preview...",
    previewUnavailable: "Preview is unavailable for this skill.",
    loadingFile: "Loading file...",
    loadingFiles: "Loading files...",
    noFilesBody: "No files were found in this skill directory.",
    fileTreeTitle: "File tree",
    fileViewerTitle: "File viewer",
    filePreviewUnavailable: "Text preview is unavailable for the selected file.",
    installPath: "Skill directory",
    managedPathLabel: "Managed path",
    skillFile: "Skill file",
    sourceRoot: "Source root",
    metadataLabel: "Metadata",
    descriptionFallback: "No description was found in the SKILL.md frontmatter.",
    openFolder: "Open folder",
    openSkillFile: "Reveal SKILL.md",
    emptyLibraryTitle: "No matching skills",
    emptyLibraryBody:
      "Adopt a skill from Discover first, then it will appear here as part of the managed library.",
    clearSearch: "Clear search",
    userInvocable: "User invocable",
    projectRootLabel: "Project root",
    familyKeyLabel: "Family key",
    variantLabelLabel: "Variant label",
    variantLabelTitle: "Variant label",
    variantLabelBody:
      "Use a stable label to distinguish same-family variants inside the managed library.",
    variantLabelPlaceholder: "Enter a variant label",
    variantLabelFallback: "Not labeled yet",
    editVariantLabel: "Edit label",
    saveVariantLabel: "Save label",
    savingVariantLabel: "Saving...",
    cancelVariantLabel: "Cancel",
    contentHashLabel: "Content hash",
    installTargetsTitle: "Indexed targets",
    targetStatusHealthy: "Healthy",
    targetStatusWarning: "Warning",
    targetStatusMissing: "Missing",
    installStatusNotInstalled: "Not installed",
    installStatusHealthy: "Symlink healthy",
    installStatusCopied: "Copied",
    installStatusBroken: "Broken symlink",
    installStatusConflict: "Conflict",
    installStatusMissingTarget: "Target missing",
    installMethodLabel: "Install method",
    installMethodSymlink: "Symlink",
    installMethodCopy: "Copy",
    installNow: "Install",
    removeInstall: "Remove",
    repairInstall: "Repair",
    relinkInstall: "Relink",
    installingLabel: "Installing...",
    removingLabel: "Removing...",
    repairingLabel: "Repairing...",
    relinkingLabel: "Relinking...",
    loadingInstalls: "Loading install status...",
    conflictInstallBody:
      "This target already contains different content for the same slug. Review the directory before replacing it.",
    recordedInstallLabel: "Recorded by Skill Manager",
    scanDiskTitle: "Scan disk",
    scanDiskBody:
      "Run a manual full-disk discovery for supported Codex and Claude Code skill layouts.",
    startScan: "Start scan",
    scanConfirmTitle: "Run full-disk scan?",
    scanConfirmBody:
      "Full-disk discovery can take noticeable time. Skill Manager will scan supported skill layouts, update the local index, and then let you review grouped candidates before adoption.",
    scanConfirmAction: "Scan now",
    scanCancel: "Cancel",
    lastScanLabel: "Last scan",
    neverScanned: "Not scanned yet",
    importFolderTitle: "Import folder",
    importFolderBody:
      "Import a local skill folder directly into the managed library.",
    chooseFolder: "Choose folder",
    importingFolder: "Importing...",
    sourceAgentLabel: "Agent",
    sourceScopeLabel: "Library scope",
    remoteSearchTitle: "Remote search",
    remoteSearchBody:
      "Search skills.sh and adopt a selected skill into the managed library.",
    remoteSearchPlaceholder: "Search skills.sh...",
    remoteSearchAction: "Search",
    remoteSearchLoading: "Searching...",
    remoteNoResults: "No registry skills matched this query.",
    remoteAdoptAction: "Adopt remote skill",
    remoteInstallsLabel: "installs",
    plannedNext: "Planned next",
    discoveredSkillsTitle: "Indexed discovery results",
    discoveredSkillsBody:
      "These candidates are grouped by skill family so you can review exact duplicates, keep variants, and batch-adopt the right set.",
    noDiscoveredSkills: "Run a disk scan to populate discovery results.",
    adoptNoteTitle: "Adopt into managed store",
    adoptNoteBody:
      "Adopt copies the whole skill directory into ~/.skill-manager/store/. Install target sync comes next.",
    adoptSkill: "Adopt to library",
    adoptingSkill: "Adopting...",
    adoptSelected: "Adopt selected",
    selectingRecommended: "Select recommended",
    selectingProject: "Select project skills",
    selectingCodex: "Select Codex",
    selectingClaude: "Select Claude Code",
    clearSelection: "Clear selection",
    groupUnique: "Unique",
    groupExactDuplicate: "Exact duplicates",
    groupVariant: "Variants",
    duplicateCountLabel: "duplicates",
    variantCountLabel: "versions",
    representativeCountLabel: "representatives",
    selectedCandidatesLabel: "selected",
    summaryOccurrencesLabel: "occurrences",
    summaryExactDuplicateGroupsLabel: "exact duplicate groups",
    summaryFamiliesLabel: "families",
    summaryNeedsReviewLabel: "families need review",
    exactDuplicateSectionTitle: "Exact duplicate groups",
    exactDuplicateSectionBody:
      "These families collapse multiple disk occurrences down to one representative candidate.",
    variantSectionTitle: "Variants needing review",
    variantSectionBody:
      "These families share a name but differ in content. Review the candidate representatives before adoption.",
    uniqueSectionTitle: "Ready to adopt",
    uniqueSectionBody:
      "These families currently have a single candidate and can be adopted directly.",
    suggestedVersionLabel: "Suggested label",
    provenancePathsLabel: "source paths",
    reviewNeededLabel: "Review needed",
    adoptFamily: "Adopt family",
    adoptSelectedInGroup: "Adopt selected",
    selectVariantsFirst: "Select variants",
    resolveVariants: "Resolve variants",
    mergeExactAction: "Merge exact",
    createVariantAction: "Create variant",
    resolutionTitle: "Variant resolution",
    resolutionBody:
      "Review matching managed variants, merge exact duplicates, or create a new named branch for content that should stay separate.",
    selectedCandidatesTitle: "Selected candidates",
    existingVariantsTitle: "Existing managed variants",
    compareAction: "Compare",
    compareEmptyBody:
      "Select a candidate and a managed variant to inspect their SKILL.md and file-level differences.",
    comparisonTitle: "Comparison",
    compareWithCurrent: "Compare with current",
    currentVariantLabel: "Current variant",
    switchVariantAction: "View this variant",
    promoteVariantAction: "Set as default",
    promotedVariantLabel: "Default variant",
    promoteHint: "Only affects future installs. Existing installations stay unchanged.",
    diffPathNotAllowedError: "Cannot compare: this variant is outside the current workspace scope.",
    revisionHistoryTitle: "Revision history",
    revisionHashLabel: "Revision",
    pinnedInstallLabel: "Pinned",
    commonFilesLabel: "Common files",
    leftOnlyFilesLabel: "Only in candidate",
    rightOnlyFilesLabel: "Only in managed variant",
    applyResolutionAction: "Apply resolution",
    closeResolution: "Close",
    globalTargetsTitle: "Global targets",
    projectTargetsTitle: "Project targets",
    totalTargetsLabel: "Total",
    healthyTargetsLabel: "Healthy",
    brokenTargetsLabel: "Broken",
    loadingTargets: "Loading targets...",
    syncTarget: "Sync recorded",
    syncingTarget: "Syncing...",
    repairTarget: "Repair all",
    repairingTarget: "Repairing...",
    openDirectory: "Open directory",
    targetSkillsLabel: "skills",
    managedInstallsLabel: "managed installs",
    discoveredOnDiskLabel: "discovered on disk",
    targetRecordedItemsTitle: "Recorded installs",
    noRecordedInstallsBody:
      "No managed installs are recorded for this target yet. Install from Library to start tracking it here.",
    noTargetsTitle: "No targets yet",
    noTargetsBody:
      "Target health will appear once scan roots or managed install targets are available.",
    loadingOrigins: "Loading origins...",
    originsEmptyBody:
      "No origin records have been captured for this managed skill yet. Future adoptions will preserve them.",
    originsRecordedLabel: "Recorded origin",
    familyVariantsTitle: "Family variants",
    familyVariantsBody:
      "These managed variants share the same family. Switch between them here instead of treating them as unrelated skills.",
    versionedFamilyLabel: "Versioned family",
    openVariantsAction: "Open variants",
    overviewVersioningTitle: "Versioned family",
    overviewVersioningBody:
      "This managed family can keep multiple named variants, compare them, and promote one as the default install line.",
    warningsTitle: "Warnings",
    warningsBody: "Non-fatal issues collected while indexing and classifying skills.",
    activeLanguage: "Active language",
    savedLanguageHint: "Language is persisted locally and applied on the next launch.",
    cacheStatusTitle: "Scan & cache",
    cacheStatusBody:
      "Startup reads the local SQLite index first, then refreshes in the background when stale.",
    indexPathLabel: "Index path",
    storePathLabel: "Managed store path",
    installStrategyTitle: "Install strategy",
    installStrategyBody:
      "Managed skills are installed outward by symlink first. Copy mode remains a compatibility fallback for a later settings expansion.",
    installStrategyValueSymlinkFirst: "Symlink first",
    lastUpdatedLabel: "Last updated",
    lastActionLabel: "Last action",
    discoveryScopeTitle: "Discovery scope",
    discoveryScopeBody:
      "Current full-disk discovery looks for supported Codex and Claude Code install layouts only.",
    goToDiscover: "Go to Discover",
    startScanEmpty: "Start scan",
    expand: "Expand",
    collapse: "Collapse",
    emptyDiscoverTitle: "No discovery results",
    emptyDiscoverBody:
      "Run a full-disk scan and Skill Manager will find Codex / Claude Code skills on your machine.",
    emptyTargetsTitle: "No targets yet",
    emptyTargetsBody:
      "Target health will appear once scan roots or managed install targets are available.",
    goToAdopt: "Go adopt",
    emptyExactDuplicateBody: "No exact-duplicate groups.",
    emptyVariantBody: "No variants need review.",
    emptyUniqueBody: "No unique items ready to adopt.",
    noMatchingSkillsBody: "No skills match the current filters.",
    noSkillsInLibraryBody:
      "Scan your disk for existing skills or import a local folder.",
    updateAvailable: "Update available",
    updateSkill: "Update skill",
    updatingSkill: "Updating...",
    gitOriginLabel: "Git source",
    gitCommitLabel: "Commit",
    gitBranchLabel: "Branch",
    noUpdateAvailable: "Up to date",
    checkUpdates: "Check for updates",
    checkingUpdates: "Checking...",
    diffAdded: "Added",
    diffRemoved: "Removed",
    diffModified: "Modified",
    diffUnchanged: "Unchanged",
    diffEmptyTitle: "No differences",
    diffEmptyBody: "The selected variants are identical.",
    diffTitle: "Compare variants",
    closeDiff: "Close",
    selectVariantToCompare: "Select a variant to compare",
    compareWithVariant: "Compare with",
    noDiffAvailable: "Diff is not available for this file type.",
    fileDiffTitle: "File changes",
    leftHashLabel: "Left hash",
    rightHashLabel: "Right hash",
    backToGallery: "Back to gallery",
    appearanceTitle: "Appearance",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    savedThemeHint: "Your preference is saved for the next session.",
    scanningDisk: "Scanning...",
    scanDiskAction: "Scan disk",
    adoptSkillAction: "Adopt skill",
    quickActionsTitle: "Quick actions",
    managedSkillsLabel: "Managed skills",
    workspaceHealthLabel: "Workspace health",
    healthyStatus: "Healthy",
    issuesStatus: "issues",
    managedSkillsCount: "Managed skills",
    guideTitle: "Guide",
    guideBody: "How Skill Manager works and how to get the most out of it.",
    guideQuickStartTitle: "Quick start",
    guideQuickStartBody:
      "Skill Manager helps you collect, version, and install AI skills for Codex and Claude Code. Start in Discover to find existing skills, then use Library to manage versions and Targets to keep installs healthy.",
    guideLibraryTitle: "Library — skill inventory",
    guideLibraryBody:
      "Browse all managed skills grouped by family. Each card represents a skill family. Inside a skill you can view its files, install history, and Git origin. The Variants tab lets you compare different snapshots of the same family and set one as the default.",
    guideDiscoverTitle: "Discover — find and adopt",
    guideDiscoverBody:
      "Scan your disk to find existing Codex / Claude Code skills. You can also adopt skills directly from a Git URL. When a discovered skill matches an existing family, you can merge the duplicate or create a new named variant.",
    guideTargetsTitle: "Targets — install health",
    guideTargetsBody:
      "Targets are the directories where skills are installed (e.g. Codex global, Claude Code project). Use this page to install, remove, or repair skills on each target. Green means healthy, yellow means warning, red means broken or missing.",
    guideSettingsTitle: "Settings — preferences and paths",
    guideSettingsBody:
      "Change language and theme, and review the local index path and managed store path. Your preferences are saved locally.",
    customTargetsTitle: "Custom install targets",
    customTargetsBody:
      "Add arbitrary directories as install targets. Skills can be symlink-installed into any custom target you define here.",
    addCustomTarget: "Add target",
    removeCustomTarget: "Remove",
    customTargetLabel: "Label",
    customTargetPath: "Path",
    customTargetAgent: "Agent",
    customTargetScope: "Scope",
    noCustomTargets: "No custom targets yet. Add one to install skills anywhere.",
    selectFolder: "Select folder",
    customTargetAdded: "Target added",
    customTargetRemoved: "Target removed",
    customTargetDeleteConfirm: "Remove this install target? Existing symlinks will not be deleted.",
    installToCustomLocation: "Install to custom location",
    customInstallTitle: "Install skill to a custom directory",
    customInstallAgent: "Agent",
    customInstallScope: "Scope",
    customInstallLabel: "Label (optional)",
    customInstallConfirm: "Install",
    manageCustomTargetsTitle: "Managed custom targets",
    manageCustomTargetsBody:
      "These are directories you have previously installed skills into. You can remove records here; existing symlinks on disk will not be deleted.",
  },
  zh: {
    appName: "Skill Manager",
    tabs: {
      library: "托管库",
      discover: "发现与导入",
      targets: "安装目标",
      settings: "设置",
      guide: "指南",
    },
    languageLabel: "语言",
    english: "EN",
    chinese: "中文",
    globalSearchLabel: "全局搜索",
    globalSearchPlaceholder: "搜索已索引的 skill...",
    healthOkay: "正常",
    healthIssues: "个问题",
    scanFailedTitle: "索引刷新失败",
    defaultScanError: "无法刷新 skill 索引。",
    defaultPreviewError: "无法读取 `SKILL.md` 内容。",
    defaultOpenError: "无法打开所选路径。",
    libraryTitle: "托管库",
    libraryBody: "浏览已托管到本地仓库的技能，查看它们的元数据和安装状态。",
    discoverTitle: "发现与导入",
    discoverBody: "手动执行全盘发现，查看磁盘候选 skill，并把需要的条目收编到托管库。",
    targetsTitle: "安装目标",
    targetsBody: "查看目标目录、校验当前健康状态，并直接在文件管理器中打开目录。",
    settingsTitle: "设置",
    settingsBody: "在本地仓库流程完善前，设置页保持轻量，仅提供语言和缓存控制。",
    searchLabel: "搜索 skill",
    searchPlaceholder: "按名称、描述或来源过滤...",
    refreshIndex: "刷新索引",
    refreshingIndex: "刷新中...",
    showing: "显示",
    of: "/",
    skills: "个 skill",
    warningsInline: "条警告",
    allAgents: "全部 Agent",
    allScopes: "全部范围",
    allSources: "全部来源",
    indexedInventory: "已托管技能",
    familiesInline: "个 family",
    detailsTitle: "详情",
    detailsEmptyTitle: "选择一个 skill",
    detailsEmptyBody: "选择左侧条目后，可以查看元数据、目标状态和 `SKILL.md` 预览。",
    detailOverviewTab: "概览",
    detailVariantsTab: "变体",
    detailContentTab: "内容",
    detailFilesTab: "文件",
    detailInstallsTab: "安装",
    detailOriginsTab: "来源",
    previewLabel: "SKILL.md 预览",
    loadingPreview: "正在加载预览...",
    previewUnavailable: "该 skill 暂时无法预览。",
    loadingFile: "正在加载文件...",
    loadingFiles: "正在加载文件树...",
    noFilesBody: "这个 skill 目录里没有可显示的文件。",
    fileTreeTitle: "文件树",
    fileViewerTitle: "文件查看",
    filePreviewUnavailable: "当前所选文件无法进行文本预览。",
    installPath: "Skill 目录",
    managedPathLabel: "本地仓库路径",
    skillFile: "Skill 文件",
    sourceRoot: "来源目录",
    metadataLabel: "元数据",
    descriptionFallback: "在 `SKILL.md` frontmatter 中没有找到描述。",
    openFolder: "打开目录",
    openSkillFile: "定位 SKILL.md",
    emptyLibraryTitle: "还没有托管的技能",
    emptyLibraryBody: "先前往“发现与导入”收编一个技能，随后它就会出现在这里。",
    clearSearch: "清空搜索",
    userInvocable: "可被用户直接调用",
    projectRootLabel: "项目根目录",
    familyKeyLabel: "技能族标识",
    variantLabelLabel: "变体标签",
    variantLabelTitle: "变体标签",
    variantLabelBody: "给同一 family 下的不同版本一个稳定标签，方便后续安装和区分。",
    variantLabelPlaceholder: "输入变体标签",
    variantLabelFallback: "尚未命名",
    editVariantLabel: "编辑标签",
    saveVariantLabel: "保存标签",
    savingVariantLabel: "保存中...",
    cancelVariantLabel: "取消",
    contentHashLabel: "内容指纹",
    installTargetsTitle: "已索引目标",
    targetStatusHealthy: "健康",
    targetStatusWarning: "警告",
    targetStatusMissing: "缺失",
    installStatusNotInstalled: "未安装",
    installStatusHealthy: "软链接正常",
    installStatusCopied: "已复制",
    installStatusBroken: "软链接损坏",
    installStatusConflict: "冲突",
    installStatusMissingTarget: "目标不存在",
    installMethodLabel: "安装方式",
    installMethodSymlink: "软链接",
    installMethodCopy: "复制",
    installNow: "安装",
    removeInstall: "移除",
    repairInstall: "修复",
    relinkInstall: "重新链接",
    installingLabel: "正在安装...",
    removingLabel: "正在移除...",
    repairingLabel: "正在修复...",
    relinkingLabel: "正在重新链接...",
    loadingInstalls: "正在加载安装状态...",
    conflictInstallBody: "这个 target 中已经有同名但内容不同的目录。请先检查后再决定是否替换。",
    recordedInstallLabel: "由 Skill Manager 记录",
    scanDiskTitle: "扫描磁盘",
    scanDiskBody: "手动执行一次全盘发现，查找受支持的 Codex / Claude Code skill 布局。",
    startScan: "开始扫描",
    scanConfirmTitle: "执行全盘扫描？",
    scanConfirmBody:
      "全盘发现可能需要一些时间。Skill Manager 会扫描受支持的 skill 布局、更新本地索引，然后让你在收编前按分组审查候选项。",
    scanConfirmAction: "立即扫描",
    scanCancel: "取消",
    lastScanLabel: "上次扫描",
    neverScanned: "尚未扫描",
    importFolderTitle: "导入文件夹",
    importFolderBody: "把本地 skill 文件夹直接导入到托管库。",
    chooseFolder: "选择文件夹",
    importingFolder: "导入中...",
    sourceAgentLabel: "Agent",
    sourceScopeLabel: "库范围",
    remoteSearchTitle: "远程搜索",
    remoteSearchBody: "搜索 skills.sh，并把所选 skill 收编进托管库。",
    remoteSearchPlaceholder: "搜索 skills.sh...",
    remoteSearchAction: "搜索",
    remoteSearchLoading: "搜索中...",
    remoteNoResults: "没有匹配的远程 skill。",
    remoteAdoptAction: "收编远程 skill",
    remoteInstallsLabel: "安装量",
    plannedNext: "下一步计划",
    discoveredSkillsTitle: "已索引发现结果",
    discoveredSkillsBody: "这些候选项会按技能族分组，方便你先处理完全重复项，再保留需要的变体并批量收编。",
    noDiscoveredSkills: "先执行一次磁盘扫描来填充发现结果。",
    adoptNoteTitle: "收编到本地仓库",
    adoptNoteBody: "收编会将整个 skill 目录复制到 `~/.skill-manager/store/`。安装目标同步是下一阶段。",
    adoptSkill: "收编到库",
    adoptingSkill: "正在收编...",
    adoptSelected: "批量收编",
    selectingRecommended: "选择推荐项",
    selectingProject: "选择项目级",
    selectingCodex: "选择 Codex",
    selectingClaude: "选择 Claude Code",
    clearSelection: "清空选择",
    groupUnique: "唯一项",
    groupExactDuplicate: "完全重复",
    groupVariant: "变体",
    duplicateCountLabel: "个重复",
    variantCountLabel: "个版本",
    representativeCountLabel: "个代表项",
    selectedCandidatesLabel: "已选择",
    summaryOccurrencesLabel: "个发现项",
    summaryExactDuplicateGroupsLabel: "组完全重复",
    summaryFamiliesLabel: "个 family",
    summaryNeedsReviewLabel: "组待审查",
    exactDuplicateSectionTitle: "完全重复分组",
    exactDuplicateSectionBody: "这些技能族在磁盘上存在多个副本，但内容完全相同，系统已折叠为代表项。",
    variantSectionTitle: "待审查的变体",
    variantSectionBody: "这些技能族名称相同但内容不同。请先审查各个版本，再决定收编哪些。",
    uniqueSectionTitle: "可直接收编",
    uniqueSectionBody: "这些技能族只有一个候选版本，可以直接收编到托管库。",
    suggestedVersionLabel: "建议标签",
    provenancePathsLabel: "来源路径",
    reviewNeededLabel: "需要审查",
    adoptFamily: "收编整组",
    adoptSelectedInGroup: "收编已选项",
    selectVariantsFirst: "先选择变体",
    resolveVariants: "处理变体",
    mergeExactAction: "合并重复",
    createVariantAction: "创建变体",
    resolutionTitle: "变体消歧",
    resolutionBody:
      "审查已存在的托管变体。完全重复时直接合并；内容需要保留时，创建一个带自定义名称的新分支。",
    selectedCandidatesTitle: "已选候选项",
    existingVariantsTitle: "已存在的托管变体",
    compareAction: "对比",
    compareEmptyBody: "选择一个候选项和一个已存在变体后，这里会显示 `SKILL.md` 与文件差异。",
    comparisonTitle: "内容对比",
    compareWithCurrent: "与当前版本对比",
    currentVariantLabel: "当前变体",
    switchVariantAction: "查看此变体",
    promoteVariantAction: "设为默认版本",
    promotedVariantLabel: "默认版本",
    promoteHint: "仅影响未来的新安装，不会修改已有的安装。",
    diffPathNotAllowedError: "无法对比：该变体已不在当前工作区范围内。",
    revisionHistoryTitle: "修订历史",
    revisionHashLabel: "修订",
    pinnedInstallLabel: "已固定",
    commonFilesLabel: "共同文件",
    leftOnlyFilesLabel: "仅候选项有",
    rightOnlyFilesLabel: "仅托管变体有",
    applyResolutionAction: "应用处理结果",
    closeResolution: "关闭",
    globalTargetsTitle: "全局目标",
    projectTargetsTitle: "项目目标",
    totalTargetsLabel: "总数",
    healthyTargetsLabel: "健康",
    brokenTargetsLabel: "异常",
    loadingTargets: "正在加载目标...",
    syncTarget: "同步记录安装",
    syncingTarget: "同步中...",
    repairTarget: "批量修复",
    repairingTarget: "修复中...",
    openDirectory: "打开目录",
    targetSkillsLabel: "个 skill",
    managedInstallsLabel: "个托管安装",
    discoveredOnDiskLabel: "个磁盘发现项",
    targetRecordedItemsTitle: "已记录安装",
    noRecordedInstallsBody: "这个 target 还没有被 Skill Manager 记录的安装项。先从托管库里执行安装，它才会出现在这里。",
    noTargetsTitle: "还没有目标目录",
    noTargetsBody: "当扫描根目录或托管安装目标可用时，这里会显示目标健康状态。",
    loadingOrigins: "正在加载来源...",
    originsEmptyBody: "这个托管 skill 还没有记录来源。之后的新收编会保留来源记录。",
    originsRecordedLabel: "记录来源",
    familyVariantsTitle: "同族变体",
    familyVariantsBody: "这些托管变体属于同一个技能族。你可以在这里切换，而不是把它们当成完全无关的 skill。",
    versionedFamilyLabel: "版本化技能族",
    openVariantsAction: "查看变体",
    overviewVersioningTitle: "版本化技能族",
    overviewVersioningBody: "这个技能族可以保留多个命名变体、相互比较，并把其中一个提升为默认安装线。",
    warningsTitle: "警告",
    warningsBody: "索引和分类 skill 时收集到的非阻断问题。",
    activeLanguage: "当前语言",
    savedLanguageHint: "语言偏好会保存在本地，并在下次启动时自动应用。",
    cacheStatusTitle: "扫描与缓存",
    cacheStatusBody: "应用启动时先读取本地 SQLite 索引；如果索引过期，再后台刷新。",
    indexPathLabel: "索引路径",
    storePathLabel: "本地仓库路径",
    installStrategyTitle: "安装策略",
    installStrategyBody: "当前默认策略是优先使用软链接向外安装。复制模式会在后续设置扩展里作为兼容兜底出现。",
    installStrategyValueSymlinkFirst: "优先软链接",
    lastUpdatedLabel: "最后更新时间",
    lastActionLabel: "最近动作",
    discoveryScopeTitle: "发现范围",
    discoveryScopeBody: "当前全盘发现只匹配受支持的 Codex / Claude Code 安装布局。",
    goToDiscover: "前往发现与导入",
    startScanEmpty: "开始扫描",
    expand: "展开",
    collapse: "收起",
    emptyDiscoverTitle: "还没有发现结果",
    emptyDiscoverBody: "执行一次全盘扫描，Skill Manager 会自动查找你电脑上的 Codex / Claude Code 技能。",
    emptyTargetsTitle: "还没有目标目录",
    emptyTargetsBody: "当扫描根目录或托管安装目标可用时，这里会显示目标健康状态。",
    goToAdopt: "去收编",
    emptyExactDuplicateBody: "没有完全重复的技能组。",
    emptyVariantBody: "没有需要审查的变体。",
    emptyUniqueBody: "没有可直接收编的唯一项。",
    noMatchingSkillsBody: "没有找到匹配当前筛选条件的技能。",
    noSkillsInLibraryBody: "你可以从磁盘扫描已有技能，或直接导入本地文件夹。",
    updateAvailable: "有可用更新",
    updateSkill: "更新技能",
    updatingSkill: "正在更新...",
    gitOriginLabel: "Git 来源",
    gitCommitLabel: "提交",
    gitBranchLabel: "分支",
    noUpdateAvailable: "已是最新",
    checkUpdates: "检查更新",
    checkingUpdates: "正在检查...",
    diffAdded: "新增",
    diffRemoved: "删除",
    diffModified: "修改",
    diffUnchanged: "未变",
    diffEmptyTitle: "无差异",
    diffEmptyBody: "所选变体内容完全相同。",
    diffTitle: "对比变体",
    closeDiff: "关闭",
    selectVariantToCompare: "选择要对比的变体",
    compareWithVariant: "与...对比",
    noDiffAvailable: "该文件类型暂不支持差异对比。",
    fileDiffTitle: "文件变更",
    leftHashLabel: "左侧哈希",
    rightHashLabel: "右侧哈希",
    backToGallery: "返回画廊",
    appearanceTitle: "外观",
    themeSystem: "跟随系统",
    themeLight: "浅色",
    themeDark: "深色",
    savedThemeHint: "您的偏好设置会在下次启动时保留。",
    scanningDisk: "扫描中...",
    scanDiskAction: "扫描磁盘",
    adoptSkillAction: "收编技能",
    quickActionsTitle: "快捷操作",
    managedSkillsLabel: "已管理技能",
    workspaceHealthLabel: "运行状态",
    healthyStatus: "健康",
    issuesStatus: "个问题",
    managedSkillsCount: "已管理技能",
    guideTitle: "使用指南",
    guideBody: "了解 Skill Manager 的工作原理和最佳实践。",
    guideQuickStartTitle: "快速上手",
    guideQuickStartBody:
      "Skill Manager 帮助你收集、版本化管理并安装 Codex 和 Claude Code 的 AI 技能。先在「发现与导入」里扫描已有技能，然后在「托管库」中管理版本，在「安装目标」里保持安装健康。",
    guideLibraryTitle: "托管库 — 技能仓库",
    guideLibraryBody:
      "按技能族（family）分组浏览所有托管技能。每张卡片代表一个技能族。点进去可以查看文件、安装历史、Git 来源。变体页签让你对比同一技能族的不同快照，并将其中一个设为默认版本。",
    guideDiscoverTitle: "发现与导入 — 寻找技能",
    guideDiscoverBody:
      "扫描磁盘查找已有的 Codex / Claude Code 技能，也可以直接通过 Git URL 收编远程技能。当发现的技能与已有技能族匹配时，你可以选择合并重复项，或创建一个带名称的新变体。",
    guideTargetsTitle: "安装目标 — 安装健康",
    guideTargetsBody:
      "目标目录是技能实际安装的位置（如 Codex 全局目录、Claude Code 项目目录）。在这个页面可以对每个目标执行安装、移除或修复操作。绿色表示健康，黄色表示警告，红色表示损坏或缺失。",
    guideSettingsTitle: "设置 — 偏好与路径",
    guideSettingsBody:
      "更改语言和主题，查看本地索引路径和托管仓库路径。偏好设置会保存在本地。",
    customTargetsTitle: "自定义安装目标",
    customTargetsBody:
      "将任意目录添加为安装目标。你可以把技能通过软链接安装到任何在这里定义的目录。",
    addCustomTarget: "添加目标",
    removeCustomTarget: "删除",
    customTargetLabel: "名称",
    customTargetPath: "路径",
    customTargetAgent: "代理",
    customTargetScope: "范围",
    noCustomTargets: "还没有自定义目标。添加一个，就可以把技能安装到任意目录。",
    selectFolder: "选择文件夹",
    customTargetAdded: "目标已添加",
    customTargetRemoved: "目标已删除",
    customTargetDeleteConfirm: "确定删除这个安装目标？已有的软链接不会被删除。",
    installToCustomLocation: "安装到自定义目录",
    customInstallTitle: "将技能安装到自定义目录",
    customInstallAgent: "代理",
    customInstallScope: "范围",
    customInstallLabel: "名称（可选）",
    customInstallConfirm: "安装",
    manageCustomTargetsTitle: "已管理的自定义目标",
    manageCustomTargetsBody:
      "这些是你曾经安装过技能的目录。你可以在这里删除记录；磁盘上已有的软链接不会被删除。",
  },
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

export function installHealthLabel(
  state:
    | "not_installed"
    | "healthy"
    | "copied"
    | "broken"
    | "conflict"
    | "missing_target",
  language: Language,
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
  language: Language,
): string {
  if (method === "copy") {
    return copy[language].installMethodCopy;
  }

  return copy[language].installMethodSymlink;
}
