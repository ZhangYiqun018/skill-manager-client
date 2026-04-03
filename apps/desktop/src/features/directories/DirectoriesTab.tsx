import styles from "../../App.module.css";
import { agentLabel, copy, scopeLabel, type Language } from "../../i18n";
import type { InstalledSkill, ScanRoot, ScanWarning } from "../../types";

type DirectoriesTabProps = {
  language: Language;
  onOpenDirectory: (path: string) => void;
  roots: ScanRoot[];
  skills: InstalledSkill[];
  warnings: ScanWarning[];
};

export function DirectoriesTab({
  language,
  onOpenDirectory,
  roots,
  skills,
  warnings,
}: DirectoriesTabProps) {
  const text = copy[language];

  return (
    <section className={styles.pageSection}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.sectionLabel}>{text.directoriesTitle}</p>
          <h1 className={styles.pageTitle}>{text.directoriesBody}</h1>
        </div>
      </header>

      <div className={styles.directoryGrid}>
        {roots.map((root) => {
          const skillCount = skills.filter(
            (skill) => skill.source_root === root.base_dir,
          ).length;

          return (
            <article key={`${root.agent}-${root.scope}-${root.base_dir}`} className={styles.directoryCard}>
              <div className={styles.directoryCardHeader}>
                <div className={styles.badgeRow}>
                  <span className={styles.badge}>{scopeLabel(root.scope, language)}</span>
                  <span className={styles.agentBadge}>
                    {agentLabel(root.agent, language)}
                  </span>
                </div>
                <span className={root.exists ? styles.statusOk : styles.statusMissing}>
                  {root.exists ? text.directoryStatusAvailable : text.directoryStatusMissing}
                </span>
              </div>

              <p className={styles.directoryPath}>{root.base_dir}</p>
              <div className={styles.directoryFooter}>
                <span>
                  {skillCount} {text.skillCount}
                </span>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => onOpenDirectory(root.base_dir)}
                  disabled={!root.exists}
                >
                  {text.openDirectory}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {warnings.length > 0 ? (
        <section className={styles.warningPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.sectionLabel}>{text.warningsTitle}</p>
              <h2 className={styles.panelTitle}>{text.warningsBody}</h2>
            </div>
          </div>
          <div className={styles.warningList}>
            {warnings.map((warning, index) => (
              <article key={`${warning.path ?? "warning"}-${index}`} className={styles.warningItem}>
                <strong>{warning.path ?? text.warningsTitle}</strong>
                <p>{warning.message}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
