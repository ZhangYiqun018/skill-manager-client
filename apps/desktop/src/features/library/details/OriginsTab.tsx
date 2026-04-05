import badges from "../../../styles/_badges.module.css";
import panels from "../../../styles/_panels.module.css";
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
    <section className={panels.detailSection}>
      {gitSourceLoading ? (
        <div className={panels.emptyPanel}>{text.loadingOrigins}</div>
      ) : gitSource ? (
        <div className={panels.originList}>
          <article className={panels.originCard}>
            <div className={badges.badgeRow}>
              <span className={badges.sourceBadge}>{text.gitOriginLabel}</span>
              <span className={badges.badge}>{text.originsRecordedLabel}</span>
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
              <p>
                {text.repoSubpathLabel}: {gitSource.repo_subpath}
              </p>
            ) : null}
          </article>
        </div>
      ) : null}

      {originsLoading ? (
        <div className={panels.emptyPanel}>{text.loadingOrigins}</div>
      ) : originsError ? (
        <div className={panels.emptyPanel}>{originsError}</div>
      ) : origins && origins.length > 0 ? (
        <div className={panels.originList}>
          {origins.map((origin) => (
            <article
              key={`${origin.origin}-${origin.recorded_unix_ms}`}
              className={panels.originCard}
            >
              <div className={badges.badgeRow}>
                <span className={badges.sourceBadge}>
                  {sourceLabel(origin.source_type, language)}
                </span>
                <span className={badges.badge}>{text.originsRecordedLabel}</span>
              </div>
              <strong>{origin.origin}</strong>
              <p>
                {text.lastUpdatedLabel}: {formatTimestamp(origin.recorded_unix_ms, language)}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className={panels.emptyPanel}>{text.originsEmptyBody}</div>
      )}
    </section>
  );
}
