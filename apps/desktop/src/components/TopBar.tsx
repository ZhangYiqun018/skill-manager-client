import badges from "../styles/_badges.module.css";
import layout from "../styles/_layout.module.css";
import navigation from "../styles/_navigation.module.css";
import { copy, type Language } from "../i18n";
import type { AppTab } from "../types";
import type { ThemeMode } from "../hooks/useTheme";
import { version } from "../../package.json";
import { LogoMark } from "./LogoMark";
import { Tooltip } from "./Tooltip";

type TopBarProps = {
  activeTab: AppTab;
  healthCount: number;
  language: Language;
  onHealthClick: () => void;
  onTabChange: (tab: AppTab) => void;
  onRefreshIndex?: () => void;
  onGoToDiscover?: () => void;
  skillCount?: number;
  updateCount?: number;
  themeMode: ThemeMode;
  onThemeChange?: (mode: ThemeMode) => void;
};

const tabs: AppTab[] = ["library", "discover", "targets", "settings", "guide"];

export function TopBar({
  activeTab,
  healthCount,
  language,
  onHealthClick,
  onTabChange,
  onRefreshIndex,
  onGoToDiscover,
  skillCount = 0,
  updateCount = 0,
  themeMode,
  onThemeChange,
}: TopBarProps) {
  const text = copy[language];

  return (
    <aside className={navigation.topBar}>
      <div className={navigation.sidebarSection}>
        <div className={navigation.brand}>
          <LogoMark size={28} />
          <div className={navigation.brandCopy}>
            <strong>{text.appName}</strong>
            <span className={layout.helperText}>{text.brandTagline}</span>
          </div>
        </div>
      </div>

      <nav className={navigation.tabNav} role="tablist" aria-label={text.tabs.guide ?? "Primary"}>
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-current={activeTab === tab ? "page" : undefined}
            tabIndex={activeTab === tab ? 0 : -1}
            className={activeTab === tab ? navigation.tabButtonActive : navigation.tabButton}
            onClick={() => onTabChange(tab)}
          >
            <span className={navigation.tabButtonLabel}>{text.tabs[tab]}</span>
            {tab === "library" && updateCount > 0 ? (
              <span
                className={badges.navBadge}
                aria-label={`${updateCount} ${text.warningsInline ?? "updates"}`}
              >
                {updateCount}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className={navigation.quickActions}>
        <p className={navigation.quickActionsLabel}>{text.quickActionsTitle}</p>
        <Tooltip content={text.tooltipRefreshIndex} position="right">
          <button
            type="button"
            className={navigation.quickActionButton}
            onClick={() => onRefreshIndex && onRefreshIndex()}
          >
            <span>↻</span>
            {text.refreshIndex}
          </button>
        </Tooltip>
        <button
          type="button"
          className={navigation.quickActionButton}
          onClick={() => onGoToDiscover && onGoToDiscover()}
        >
          <span>＋</span>
          {text.adoptSkill}
        </button>
      </div>

      <div className={navigation.sidebarStats}>
        <div className={navigation.statsCard}>
          <div>
            <strong>{skillCount}</strong>
            <span className={layout.displayBlock}>{text.managedSkillsLabel}</span>
          </div>
        </div>

        <Tooltip content={text.tooltipHealthStatus} position="right">
          <div
            className={`${navigation.statsCard} ${layout.cursorPointer}`}
            onClick={onHealthClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onHealthClick();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div>
              <strong style={{ color: healthCount > 0 ? "var(--sm-danger)" : "var(--sm-success)" }}>
                {healthCount > 0 ? healthCount : "OK"}
              </strong>
              <span className={layout.displayBlock}>{text.workspaceHealthLabel}</span>
            </div>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: healthCount > 0 ? "var(--sm-danger)" : "var(--sm-success)",
              }}
            />
          </div>
        </Tooltip>

        {onThemeChange ? (
          <div className={navigation.miniThemeToggle}>
            <button
              type="button"
              className={
                themeMode === "light"
                  ? navigation.miniThemeButtonActive
                  : navigation.miniThemeButton
              }
              onClick={() => onThemeChange("light")}
            >
              {text.themeLight}
            </button>
            <button
              type="button"
              className={
                themeMode === "dark" ? navigation.miniThemeButtonActive : navigation.miniThemeButton
              }
              onClick={() => onThemeChange("dark")}
            >
              {text.themeDark}
            </button>
          </div>
        ) : null}

        <p className={navigation.sidebarFootnote}>
          {text.appName} v{version}
        </p>
      </div>
    </aside>
  );
}
