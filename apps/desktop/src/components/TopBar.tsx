import styles from "../App.module.css";
import { copy, type Language } from "../i18n";
import type { AppTab } from "../types";

type TopBarProps = {
  activeTab: AppTab;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onTabChange: (tab: AppTab) => void;
};

const tabs: AppTab[] = ["skills", "directories", "settings"];

export function TopBar({
  activeTab,
  language,
  onLanguageChange,
  onTabChange,
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
    </header>
  );
}
