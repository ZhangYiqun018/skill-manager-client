import styles from "../App.module.css";
import { copy, type Language } from "../i18n";
import type { AppTab } from "../types";
import { HealthBadge } from "./HealthBadge";

type TopBarProps = {
  activeTab: AppTab;
  healthCount: number;
  language: Language;
  onHealthClick: () => void;
  onTabChange: (tab: AppTab) => void;
};

const tabs: AppTab[] = ["library", "discover", "targets", "settings"];

export function TopBar({
  activeTab,
  healthCount,
  language,
  onHealthClick,
  onTabChange,
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

      <div className={styles.sidebarStatus}>
        <p className={styles.sectionLabel}>
          {language === "zh" ? "运行状态" : "Workspace health"}
        </p>
        <HealthBadge
          issues={healthCount}
          language={language}
          onClick={onHealthClick}
        />
      </div>
    </aside>
  );
}
