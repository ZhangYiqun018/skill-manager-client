import styles from "../../../App.module.css";
import { copy, sourceLabel, type Language } from "../../../i18n";
import type { ManagedGitSource, ManagedSkillOrigin } from "../../../types";
import { formatTimestamp } from "./utils";

type OriginsTabProps = {
  language: Language;
  gitSourceLoading: boolean;
  gitSource: ManagedGitSource | null;
  originsLoading: boolean;
  originsError: string | null;
  origins: ManagedSkillOrigin[] | null;
};

export function OriginsTab({
  language,
  gitSourceLoading,
  gitSource,
  originsLoading,
  originsError,
  origins,
}: OriginsTabProps) {
  const text = copy[language];

  return (
    <section className={styles.detailSection}>
      {gitSourceLoading ? (
        <div className={styles.emptyPanel}>{text.loadingOrigins}</div>
      ) : gitSource ? (
        <div className={styles.originList}>
          <article className={styles.originCard}>
            <div className={styles.badgeRow}>
              <span className={styles.sourceBadge}>{text.gitOriginLabel}</span>
              <span className={styles.badge}>{text.originsRecordedLabel}</span>
            </div>
            <strong>{gitSource.git_url}</strong>
            <p>
              {text.gitCommitLabel}: <code>{gitSource.git_commit}</code>
            </p>
            {gitSource.git_branch ? (
              <p>
                {text.gitBranchLabel}: {gitSource.git_branch}
              </p>
            ) : null}
            {gitSource.repo_subpath ? (
              <p>Path: {gitSource.repo_subpath}</p>
            ) : null}
          </article>
        </div>
      ) : null}

      {originsLoading ? (
        <div className={styles.emptyPanel}>{text.loadingOrigins}</div>
      ) : originsError ? (
        <div className={styles.emptyPanel}>{originsError}</div>
      ) : origins && origins.length > 0 ? (
        <div className={styles.originList}>
          {origins.map((origin) => (
            <article
              key={`${origin.origin}-${origin.recorded_unix_ms}`}
              className={styles.originCard}
            >
              <div className={styles.badgeRow}>
                <span className={styles.sourceBadge}>
                  {sourceLabel(origin.source_type, language)}
                </span>
                <span className={styles.badge}>{text.originsRecordedLabel}</span>
              </div>
              <strong>{origin.origin}</strong>
              <p>
                {text.lastUpdatedLabel}: {formatTimestamp(origin.recorded_unix_ms, language)}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyPanel}>{text.originsEmptyBody}</div>
      )}
    </section>
  );
}
