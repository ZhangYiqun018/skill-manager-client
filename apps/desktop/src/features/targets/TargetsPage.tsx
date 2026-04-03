import styles from "../../App.module.css";
import { agentLabel, copy, healthLabel, scopeLabel, type Language } from "../../i18n";
import type { InstallTargetRecord, ScanWarning } from "../../types";

type TargetsPageProps = {
  language: Language;
  onOpenDirectory: (path: string) => void;
  onRefreshIndex: () => void;
  refreshing: boolean;
  targets: InstallTargetRecord[];
  warnings: ScanWarning[];
};

export function TargetsPage({
  language,
  onOpenDirectory,
  onRefreshIndex,
  refreshing,
  targets,
  warnings,
}: TargetsPageProps) {
  const text = copy[language];
  const globalTargets = targets.filter((target) => target.scope === "global");
  const projectTargets = targets.filter((target) => target.scope === "project");
  const healthyTargets = targets.filter(
    (target) => target.health_state === "healthy",
  ).length;
  const brokenTargets = targets.filter(
    (target) => target.health_state !== "healthy",
  ).length;

  return (
    <section className={styles.pageSection}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.sectionLabel}>{text.targetsTitle}</p>
          <h1 className={styles.pageTitle}>{text.targetsBody}</h1>
        </div>
        <button type="button" className={styles.primaryButton} onClick={onRefreshIndex}>
          {refreshing ? text.refreshingIndex : text.refreshIndex}
        </button>
      </header>

      <div className={styles.targetSummary}>
        <div className={styles.readout}>
          <span>{text.totalTargetsLabel}</span>
          <strong>{targets.length}</strong>
        </div>
        <div className={styles.readout}>
          <span>{text.healthyTargetsLabel}</span>
          <strong>{healthyTargets}</strong>
        </div>
        <div className={styles.readout}>
          <span>{text.brokenTargetsLabel}</span>
          <strong>{brokenTargets + warnings.length}</strong>
        </div>
      </div>

      <TargetGroup
        language={language}
        onOpenDirectory={onOpenDirectory}
        targets={globalTargets}
        title={text.globalTargetsTitle}
      />
      <TargetGroup
        language={language}
        onOpenDirectory={onOpenDirectory}
        targets={projectTargets}
        title={text.projectTargetsTitle}
      />

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
              <article
                key={`${warning.path ?? "warning"}-${index}`}
                className={styles.warningItem}
              >
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

type TargetGroupProps = {
  language: Language;
  onOpenDirectory: (path: string) => void;
  targets: InstallTargetRecord[];
  title: string;
};

function TargetGroup({
  language,
  onOpenDirectory,
  targets,
  title,
}: TargetGroupProps) {
  const text = copy[language];

  return (
    <section className={styles.targetGroup}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.sectionLabel}>{title}</p>
        </div>
      </div>

      {targets.length === 0 ? (
        <div className={styles.emptyPanel}>{text.noTargetsBody}</div>
      ) : (
        <div className={styles.targetGrid}>
          {targets.map((target) => (
            <article key={target.id} className={styles.targetCard}>
              <div className={styles.targetCardHeader}>
                <div className={styles.badgeRow}>
                  <span className={styles.badge}>{scopeLabel(target.scope, language)}</span>
                  <span className={styles.agentBadge} data-agent={target.agent}>
                    {agentLabel(target.agent)}
                  </span>
                </div>
                <span
                  className={
                    target.health_state === "healthy"
                      ? styles.statusHealthy
                      : target.health_state === "warning"
                        ? styles.statusWarning
                        : styles.statusMissing
                  }
                >
                  {healthLabel(target.health_state, language)}
                </span>
              </div>

              <p className={styles.directoryPath}>{target.path}</p>
              <div className={styles.directoryFooter}>
                <span>
                  {target.skill_count} {text.targetSkillsLabel}
                </span>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => onOpenDirectory(target.path)}
                  disabled={!target.exists}
                >
                  {text.openDirectory}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
