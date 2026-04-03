import type { AgentKind, AppTab, SkillScope } from "./types";

export type Language = "en" | "zh";
export const LANGUAGE_STORAGE_KEY = "skill-manager.language";

export type Copy = {
  appName: string;
  tabs: Record<AppTab, string>;
  languageLabel: string;
  english: string;
  chinese: string;
  scanFailedTitle: string;
  previewFailedTitle: string;
  defaultScanError: string;
  defaultPreviewError: string;
  defaultOpenError: string;
  searchLabel: string;
  searchPlaceholder: string;
  rescan: string;
  rescanning: string;
  showing: string;
  of: string;
  skills: string;
  warningsInline: string;
  allAgents: string;
  allScopes: string;
  directoriesIntro: string;
  settingsIntro: string;
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
  emptySkillsTitle: string;
  emptySkillsBody: string;
  clearSearch: string;
  directoriesTitle: string;
  directoriesBody: string;
  directoryStatusAvailable: string;
  directoryStatusMissing: string;
  skillCount: string;
  openDirectory: string;
  warningsTitle: string;
  warningsBody: string;
  settingsTitle: string;
  settingsBody: string;
  projectRootLabel: string;
  projectRootPlaceholder: string;
  projectRootHelp: string;
  applySettings: string;
  clearProjectRoot: string;
  activeProjectRoot: string;
  globalOnly: string;
  activeLanguage: string;
  savedLanguageHint: string;
  projectRootSaved: string;
  userInvocable: string;
};

export const copy: Record<Language, Copy> = {
  en: {
    appName: "Skill Manager",
    tabs: {
      skills: "Skills",
      directories: "Directories",
      settings: "Settings",
    },
    languageLabel: "Language",
    english: "EN",
    chinese: "中文",
    scanFailedTitle: "Scan failed",
    previewFailedTitle: "Preview failed",
    defaultScanError: "Skill scan failed.",
    defaultPreviewError: "Could not read SKILL.md content.",
    defaultOpenError: "Could not open the selected path.",
    searchLabel: "Search skills",
    searchPlaceholder: "Search skills by name or description...",
    rescan: "Rescan",
    rescanning: "Scanning...",
    showing: "Showing",
    of: "of",
    skills: "skills",
    warningsInline: "warnings",
    allAgents: "All",
    allScopes: "All scopes",
    directoriesIntro:
      "Review the known scan roots and reveal folders in the file manager.",
    settingsIntro:
      "Set project scope and language defaults for this desktop client.",
    detailsTitle: "Skill details",
    detailsEmptyTitle: "Select a skill",
    detailsEmptyBody:
      "Choose a row to inspect its metadata, reveal files, and preview the SKILL.md body.",
    previewLabel: "SKILL.md preview",
    loadingPreview: "Loading preview...",
    previewUnavailable: "Preview is unavailable for this skill.",
    installPath: "Install path",
    skillFile: "Skill file",
    sourceRoot: "Source root",
    metadataLabel: "Metadata",
    descriptionFallback: "No description was found in the SKILL.md frontmatter.",
    openFolder: "Open folder",
    openSkillFile: "Reveal SKILL.md",
    emptySkillsTitle: "No matching skills",
    emptySkillsBody:
      "Try a different search term or switch filters. If the project should contain local skills, set the project root in Settings and rescan.",
    clearSearch: "Clear search",
    directoriesTitle: "Scan roots",
    directoriesBody:
      "Each root maps to one agent and one scope. Project paths depend on the configured project root.",
    directoryStatusAvailable: "Available",
    directoryStatusMissing: "Missing",
    skillCount: "skills",
    openDirectory: "Open directory",
    warningsTitle: "Warnings",
    warningsBody: "Non-fatal issues collected while scanning installed skills.",
    settingsTitle: "Project and preferences",
    settingsBody:
      "Project scope stays empty by default. Set a repository root only when you want project-level skills included in scans.",
    projectRootLabel: "Project root",
    projectRootPlaceholder: "/Users/you/code/project-name",
    projectRootHelp:
      "Use an absolute path for predictable project-level scans. Leaving this empty keeps the app in global-only mode.",
    applySettings: "Apply and rescan",
    clearProjectRoot: "Clear",
    activeProjectRoot: "Active project root",
    globalOnly: "Global scan only",
    activeLanguage: "Active language",
    savedLanguageHint: "Language is persisted locally and applied on next launch.",
    projectRootSaved: "Current scan scope",
    userInvocable: "User invocable",
  },
  zh: {
    appName: "Skill Manager",
    tabs: {
      skills: "Skills",
      directories: "Directories",
      settings: "Settings",
    },
    languageLabel: "语言",
    english: "EN",
    chinese: "中文",
    scanFailedTitle: "扫描失败",
    previewFailedTitle: "预览失败",
    defaultScanError: "Skill 扫描失败。",
    defaultPreviewError: "无法读取 `SKILL.md` 内容。",
    defaultOpenError: "无法打开选中的路径。",
    searchLabel: "搜索 skill",
    searchPlaceholder: "按名称或描述搜索 skill...",
    rescan: "重新扫描",
    rescanning: "扫描中...",
    showing: "显示",
    of: "/",
    skills: "个 skill",
    warningsInline: "条警告",
    allAgents: "全部",
    allScopes: "全部范围",
    directoriesIntro: "查看已知扫描根目录，并可直接在文件管理器中打开。",
    settingsIntro: "设置项目范围和客户端偏好。",
    detailsTitle: "Skill 详情",
    detailsEmptyTitle: "选择一个 skill",
    detailsEmptyBody:
      "点击左侧列表项后，可以查看元数据、打开文件位置，并预览 `SKILL.md` 正文。",
    previewLabel: "SKILL.md 预览",
    loadingPreview: "正在加载预览...",
    previewUnavailable: "该 skill 暂时无法预览。",
    installPath: "安装路径",
    skillFile: "Skill 文件",
    sourceRoot: "来源目录",
    metadataLabel: "元数据",
    descriptionFallback: "在 `SKILL.md` frontmatter 中没有找到描述。",
    openFolder: "打开目录",
    openSkillFile: "定位 SKILL.md",
    emptySkillsTitle: "没有匹配的 skill",
    emptySkillsBody:
      "可以尝试更换关键词或切换筛选条件。如果你期望这里出现项目级 skill，请先在 Settings 中设置项目根目录后重新扫描。",
    clearSearch: "清空搜索",
    directoriesTitle: "扫描根目录",
    directoriesBody: "每个根目录对应一个 agent 和一个 scope。项目路径取决于当前配置的项目根目录。",
    directoryStatusAvailable: "可用",
    directoryStatusMissing: "缺失",
    skillCount: "个 skill",
    openDirectory: "打开目录",
    warningsTitle: "警告",
    warningsBody: "扫描已安装 skill 时收集到的非阻断问题。",
    settingsTitle: "项目与偏好",
    settingsBody: "默认只扫描全局 skill。只有在需要纳入项目级 skill 时，才设置项目根目录。",
    projectRootLabel: "项目根目录",
    projectRootPlaceholder: "/Users/you/code/project-name",
    projectRootHelp: "建议使用绝对路径，避免项目级扫描范围不明确。留空则保持仅全局扫描。",
    applySettings: "应用并重新扫描",
    clearProjectRoot: "清空",
    activeProjectRoot: "当前项目根目录",
    globalOnly: "仅全局扫描",
    activeLanguage: "当前语言",
    savedLanguageHint: "语言偏好会保存在本地，并在下次启动时自动应用。",
    projectRootSaved: "当前扫描范围",
    userInvocable: "可被用户直接调用",
  },
};

export function scopeLabel(scope: SkillScope, language: Language): string {
  if (scope === "global") {
    return language === "en" ? "Global" : "全局";
  }

  return language === "en" ? "Project" : "项目";
}

export function agentLabel(agent: AgentKind, language: Language): string {
  if (agent === "codex") {
    return "Codex";
  }

  return language === "en" ? "Claude Code" : "Claude Code";
}
