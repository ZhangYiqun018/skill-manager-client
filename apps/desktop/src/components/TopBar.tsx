import styles from "../App.module.css";
import { copy, type Language } from "../i18n";
import type { AppTab } from "../types";
import { HealthBadge } from "./HealthBadge";
import { SearchField } from "./SearchField";

type TopBarProps = {
  activeTab: AppTab;
  healthCount: number;
  language: Language;
  onHealthClick: () => void;
  onLanguageChange: (language: Language) => void;
  onSearchQueryChange: (value: string) => void;
  onTabChange: (tab: AppTab) => void;
  searchQuery: string;
};

const tabs: AppTab[] = ["library", "discover", "targets", "settings"];

export function TopBar({
  activeTab,
  healthCount,
  language,
  onHealthClick,
  onLanguageChange,
  onSearchQueryChange,
  onTabChange,
  searchQuery,
}: TopBarProps) {
  const text = copy[language];

  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>S</div>
        <strong>{text.appName}</strong>
      </div>

      <nav className={styles.tabNav} aria-label="Primary">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? styles.tabButtonActive : styles.tabButton}
            onClick={() => onTabChange(tab)}
          >
            {text.tabs[tab]}
          </button>
        ))}
      </nav>

      <div className={styles.topBarCenter}>
        <SearchField
          ariaLabel={text.globalSearchLabel}
          onChange={onSearchQueryChange}
          placeholder={text.globalSearchPlaceholder}
          value={searchQuery}
        />
      </div>

      <div className={styles.topBarActions}>
        <HealthBadge
          issues={healthCount}
          language={language}
          onClick={onHealthClick}
        />
        <div className={styles.languageSwitch} aria-label={text.languageLabel}>
          <button
            type="button"
            className={language === "en" ? styles.languageButtonActive : styles.languageButton}
            onClick={() => onLanguageChange("en")}
          >
            {text.english}
          </button>
          <button
            type="button"
            className={language === "zh" ? styles.languageButtonActive : styles.languageButton}
            onClick={() => onLanguageChange("zh")}
          >
            {text.chinese}
          </button>
        </div>
      </div>
    </header>
  );
}
