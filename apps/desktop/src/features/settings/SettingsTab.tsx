import styles from "../../App.module.css";
import { copy, type Language } from "../../i18n";

type SettingsTabProps = {
  draftProjectRoot: string;
  language: Language;
  onApply: () => void;
  onClear: () => void;
  onLanguageChange: (language: Language) => void;
  onProjectRootChange: (value: string) => void;
  projectRoot: string;
  saving: boolean;
};

export function SettingsTab({
  draftProjectRoot,
  language,
  onApply,
  onClear,
  onLanguageChange,
  onProjectRootChange,
  projectRoot,
  saving,
}: SettingsTabProps) {
  const text = copy[language];

  return (
    <section className={styles.pageSection}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.sectionLabel}>{text.settingsTitle}</p>
          <h1 className={styles.pageTitle}>{text.settingsBody}</h1>
        </div>
      </header>

      <div className={styles.settingsGrid}>
        <article className={styles.settingsCard}>
          <p className={styles.sectionLabel}>{text.projectRootLabel}</p>
          <label className={styles.settingsField}>
            <input
              value={draftProjectRoot}
              onChange={(event) => onProjectRootChange(event.currentTarget.value)}
              placeholder={text.projectRootPlaceholder}
            />
          </label>
          <p className={styles.helperText}>{text.projectRootHelp}</p>
          <div className={styles.actionRow}>
            <button type="button" className={styles.primaryButton} onClick={onApply}>
              {saving ? text.rescanning : text.applySettings}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={onClear}>
              {text.clearProjectRoot}
            </button>
          </div>
          <div className={styles.readout}>
            <span>{text.activeProjectRoot}</span>
            <strong>{projectRoot.trim() || text.globalOnly}</strong>
          </div>
        </article>

        <article className={styles.settingsCard}>
          <p className={styles.sectionLabel}>{text.activeLanguage}</p>
          <div className={styles.languageSwitchInline}>
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
          <p className={styles.helperText}>{text.savedLanguageHint}</p>
          <div className={styles.readout}>
            <span>{text.projectRootSaved}</span>
            <strong>{projectRoot.trim() || text.globalOnly}</strong>
          </div>
        </article>
      </div>
    </section>
  );
}
