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
  detailsTitle: string;
  detailsEmptyTitle: string;
  detailsEmptyBody: string;
  previewLabel: string;
  loadingPreview: string;
  previewUnavailable: string;
  installPath: string;
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
  installTargetsTitle: string;
  targetStatusHealthy: string;
  targetStatusWarning: string;
  targetStatusMissing: string;
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
  remoteSearchTitle: string;
  remoteSearchBody: string;
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
  selectedCandidatesLabel: string;
  globalTargetsTitle: string;
  projectTargetsTitle: string;
  totalTargetsLabel: string;
  healthyTargetsLabel: string;
  brokenTargetsLabel: string;
  openDirectory: string;
  targetSkillsLabel: string;
  noTargetsTitle: string;
  noTargetsBody: string;
  warningsTitle: string;
  warningsBody: string;
  activeLanguage: string;
  savedLanguageHint: string;
  cacheStatusTitle: string;
  cacheStatusBody: string;
  indexPathLabel: string;
  lastUpdatedLabel: string;
  discoveryScopeTitle: string;
  discoveryScopeBody: string;
};

export const copy: Record<Language, Copy> = {
  en: {
    appName: "Skill Manager",
    tabs: {
      library: "Library",
      discover: "Discover",
      targets: "Targets",
      settings: "Settings",
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
      "Browse managed skills already copied into the canonical store and inspect their metadata.",
    discoverTitle: "Discover",
    discoverBody:
      "Run full-disk discovery, review disk candidates, and adopt the ones you want into the managed library.",
    targetsTitle: "Targets",
    targetsBody:
      "Inspect target roots, verify current health, and reveal the installed directories.",
    settingsTitle: "Settings",
    settingsBody:
      "Language and cache controls stay lightweight until the managed store workflow lands.",
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
    detailsTitle: "Details",
    detailsEmptyTitle: "Select a skill",
    detailsEmptyBody:
      "Pick a row to inspect metadata, current targets, and the SKILL.md preview.",
    previewLabel: "SKILL.md preview",
    loadingPreview: "Loading preview...",
    previewUnavailable: "Preview is unavailable for this skill.",
    installPath: "Skill directory",
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
    installTargetsTitle: "Indexed targets",
    targetStatusHealthy: "Healthy",
    targetStatusWarning: "Warning",
    targetStatusMissing: "Missing",
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
      "Folder import is the next source to wire up after disk adoption. The card stays informational for now.",
    remoteSearchTitle: "Remote search",
    remoteSearchBody:
      "skills.sh search and download will plug into this panel after the inventory model is in place.",
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
    selectedCandidatesLabel: "selected",
    globalTargetsTitle: "Global targets",
    projectTargetsTitle: "Project targets",
    totalTargetsLabel: "Total",
    healthyTargetsLabel: "Healthy",
    brokenTargetsLabel: "Broken",
    openDirectory: "Open directory",
    targetSkillsLabel: "skills",
    noTargetsTitle: "No targets yet",
    noTargetsBody:
      "Target health will appear once scan roots or managed install targets are available.",
    warningsTitle: "Warnings",
    warningsBody: "Non-fatal issues collected while indexing and classifying skills.",
    activeLanguage: "Active language",
    savedLanguageHint: "Language is persisted locally and applied on the next launch.",
    cacheStatusTitle: "Scan & cache",
    cacheStatusBody:
      "Startup reads the local SQLite index first, then refreshes in the background when stale.",
    indexPathLabel: "Index path",
    lastUpdatedLabel: "Last updated",
    discoveryScopeTitle: "Discovery scope",
    discoveryScopeBody:
      "Current full-disk discovery looks for supported Codex and Claude Code install layouts only.",
  },
  zh: {
    appName: "Skill Manager",
    tabs: {
      library: "Library",
      discover: "Discover",
      targets: "Targets",
      settings: "Settings",
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
    libraryTitle: "Library",
    libraryBody: "浏览已经复制到 canonical store 的 managed skills，并查看它们的元数据。",
    discoverTitle: "Discover",
    discoverBody: "手动执行全盘发现，查看磁盘候选 skill，并把需要的条目 adopt 到 managed library。",
    targetsTitle: "Targets",
    targetsBody: "查看目标目录、校验当前健康状态，并直接在文件管理器中打开目录。",
    settingsTitle: "Settings",
    settingsBody: "在 managed store 闭环落地前，设置页先保持轻量，只放语言和缓存控制。",
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
    indexedInventory: "已索引库存",
    detailsTitle: "详情",
    detailsEmptyTitle: "选择一个 skill",
    detailsEmptyBody: "选择左侧条目后，可以查看元数据、目标状态和 `SKILL.md` 预览。",
    previewLabel: "SKILL.md 预览",
    loadingPreview: "正在加载预览...",
    previewUnavailable: "该 skill 暂时无法预览。",
    installPath: "Skill 目录",
    skillFile: "Skill 文件",
    sourceRoot: "来源目录",
    metadataLabel: "元数据",
    descriptionFallback: "在 `SKILL.md` frontmatter 中没有找到描述。",
    openFolder: "打开目录",
    openSkillFile: "定位 SKILL.md",
    emptyLibraryTitle: "没有匹配的 skill",
    emptyLibraryBody: "先去 Discover 里 adopt 一个 skill，随后它就会作为 managed skill 出现在这里。",
    clearSearch: "清空搜索",
    userInvocable: "可被用户直接调用",
    projectRootLabel: "项目根目录",
    installTargetsTitle: "已索引目标",
    targetStatusHealthy: "健康",
    targetStatusWarning: "警告",
    targetStatusMissing: "缺失",
    scanDiskTitle: "扫描磁盘",
    scanDiskBody: "手动执行一次全盘发现，查找受支持的 Codex / Claude Code skill 布局。",
    startScan: "开始扫描",
    scanConfirmTitle: "执行全盘扫描？",
    scanConfirmBody:
      "全盘发现可能需要一些时间。Skill Manager 会扫描受支持的 skill 布局、更新本地索引，然后让你在 adopt 前按分组审查候选项。",
    scanConfirmAction: "立即扫描",
    scanCancel: "取消",
    lastScanLabel: "上次扫描",
    neverScanned: "尚未扫描",
    importFolderTitle: "导入文件夹",
    importFolderBody: "文件夹导入会在下一阶段接入；这一步会接在当前的磁盘 adopt 之后。",
    remoteSearchTitle: "远程搜索",
    remoteSearchBody: "skills.sh 的搜索和下载会在库存模型稳定后接入这里。",
    plannedNext: "下一步计划",
    discoveredSkillsTitle: "已索引发现结果",
    discoveredSkillsBody: "这些候选项会按 skill family 分组，方便你先处理完全重复项，再保留需要的变体并批量 adopt。",
    noDiscoveredSkills: "先执行一次磁盘扫描来填充发现结果。",
    adoptNoteTitle: "Adopt 到 managed store",
    adoptNoteBody: "Adopt 会把整个 skill 目录复制到 `~/.skill-manager/store/`。安装目标同步是下一阶段。",
    adoptSkill: "Adopt 到 Library",
    adoptingSkill: "正在 Adopt...",
    adoptSelected: "批量 Adopt",
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
    selectedCandidatesLabel: "已选择",
    globalTargetsTitle: "全局目标",
    projectTargetsTitle: "项目目标",
    totalTargetsLabel: "总数",
    healthyTargetsLabel: "健康",
    brokenTargetsLabel: "异常",
    openDirectory: "打开目录",
    targetSkillsLabel: "个 skill",
    noTargetsTitle: "还没有目标目录",
    noTargetsBody: "当扫描根目录或 managed install target 可用时，这里会显示目标健康状态。",
    warningsTitle: "警告",
    warningsBody: "索引和分类 skill 时收集到的非阻断问题。",
    activeLanguage: "当前语言",
    savedLanguageHint: "语言偏好会保存在本地，并在下次启动时自动应用。",
    cacheStatusTitle: "扫描与缓存",
    cacheStatusBody: "应用启动时先读取本地 SQLite 索引；如果索引过期，再后台刷新。",
    indexPathLabel: "索引路径",
    lastUpdatedLabel: "最后更新时间",
    discoveryScopeTitle: "发现范围",
    discoveryScopeBody: "当前全盘发现只匹配受支持的 Codex / Claude Code 安装布局。",
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
