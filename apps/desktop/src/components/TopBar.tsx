import styles from "../App.module.css";
import { copy, type Language } from "../i18n";
import type { AppTab } from "../types";
import type { ThemeMode } from "../hooks/useTheme";

type TopBarProps = {
  activeTab: AppTab;
  healthCount: number;
  language: Language;
  onHealthClick: () => void;
  onTabChange: (tab: AppTab) => void;
  onRefreshIndex?: () => void;
  onGoToDiscover?: () => void;
  skillCount?: number;
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
  themeMode,
  onThemeChange,
}: TopBarProps) {
  const text = copy[language];

  return (
    <aside className={styles.topBar}>
      <div className={styles.sidebarSection}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>S</div>
          <div className={styles.brandCopy}>
            <strong>{text.appName}</strong>
            <span className={styles.helperText}>
              {language === "zh"
                ? "发现、收编、安装、修复"
                : "Discover, adopt, install, repair"}
            </span>
          </div>
        </div>
      </div>

      <nav className={styles.tabNav} aria-label="Primary">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? styles.tabButtonActive : styles.tabButton}
            onClick={() => onTabChange(tab)}
          >
            <span className={styles.tabButtonLabel}>{text.tabs[tab]}</span>
          </button>
        ))}
      </nav>

      <div className={styles.quickActions}>
        <p className={styles.quickActionsLabel}>
          {language === "zh" ? "快捷操作" : "Quick actions"}
        </p>
        <button
          type="button"
          className={styles.quickActionButton}
          onClick={() => onRefreshIndex && onRefreshIndex()}
        >
          <span>↻</span>
          {text.refreshIndex}
        </button>
        <button
          type="button"
          className={styles.quickActionButton}
          onClick={() => onGoToDiscover && onGoToDiscover()}
        >
          <span>＋</span>
          {text.adoptSkill}
        </button>
      </div>

      <div className={styles.sidebarStats}>
        <div className={styles.statsCard}>
          <div>
            <strong>{skillCount}</strong>
            <span style={{ display: "block" }}>
              {language === "zh" ? "已管理技能" : "Managed skills"}
            </span>
          </div>
        </div>

        <div
          className={styles.statsCard}
          onClick={onHealthClick}
          style={{ cursor: "pointer" }}
        >
          <div>
            <strong style={{ color: healthCount > 0 ? "var(--sm-danger)" : "var(--sm-success)" }}>
              {healthCount > 0 ? healthCount : "OK"}
            </strong>
            <span style={{ display: "block" }}>
              {language === "zh" ? "运行状态" : "Workspace health"}
            </span>
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

        {onThemeChange ? (
          <div className={styles.miniThemeToggle}>
            <button
              type="button"
              className={themeMode === "light" ? styles.miniThemeButtonActive : styles.miniThemeButton}
              onClick={() => onThemeChange("light")}
            >
              {language === "zh" ? "浅色" : "Light"}
            </button>
            <button
              type="button"
              className={themeMode === "dark" ? styles.miniThemeButtonActive : styles.miniThemeButton}
              onClick={() => onThemeChange("dark")}
            >
              {language === "zh" ? "深色" : "Dark"}
            </button>
          </div>
        ) : null}

        <p className={styles.sidebarFootnote}>Skill Manager v0.1.0</p>
      </div>
    </aside>
  );
}
