import { useEffect, useState } from "react";
import buttons from "../../styles/_buttons.module.css";
import badges from "../../styles/_badges.module.css";
import panels from "../../styles/_panels.module.css";
import layout from "../../styles/_layout.module.css";
import { open } from "@tauri-apps/plugin-shell";
import { fetchSkillReadme } from "../../api/discover";
import { copy, friendlyErrorMessage, type Language } from "../../i18n";
import type { RegistrySkillResult } from "../../types";

type RegistrySkillDetailProps = {
  skill: RegistrySkillResult;
  language: Language;
  onAdopt: () => void;
  adopting: boolean;
};

export function RegistrySkillDetail({
  skill,
  language,
  onAdopt,
  adopting,
}: RegistrySkillDetailProps) {
  const text = copy[language];
  const [readme, setReadme] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Reset state when skill changes — synchronous setState here is intentional
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReadme(null);
    setError(null);
    setLoading(true);
    fetchSkillReadme(skill.source, skill.skillId)
      .then((content) => {
        if (!cancelled) setReadme(content);
      })
      .catch((err) => {
        if (!cancelled) setError(friendlyErrorMessage(err, language));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [skill.source, skill.skillId, language]);

  return (
    <div className={panels.registryDetailPanel}>
      <div className={panels.registryDetailHeader}>
        <div>
          <h3 className={panels.registryDetailTitle}>{skill.name}</h3>
          <div className={layout.groupMetaRow}>
            <span className={badges.inlineTag}>{skill.source}</span>
            <span className={badges.inlineTag}>
              {skill.installs.toLocaleString()} {text.remoteInstallsLabel}
            </span>
          </div>
        </div>
        <button
          type="button"
          className={buttons.primaryButton}
          disabled={adopting}
          onClick={onAdopt}
        >
          {adopting ? text.adoptingSkill : text.registryAddToLibrary}
        </button>
      </div>

      <div className={panels.registryDetailContent}>
        {loading ? (
          <p className={layout.helperText}>{text.registryLoadingReadme}</p>
        ) : error ? (
          <div className={layout.sectionStack}>
            <p className={layout.helperText}>{text.registryReadmeFallback}</p>
            <div className={layout.groupMetaRow}>
              <button
                type="button"
                className={layout.externalLink}
                onClick={() => void open(`https://github.com/${skill.source}`)}
              >
                {text.registryViewOnGitHub}
              </button>
              <button
                type="button"
                className={layout.externalLink}
                onClick={() => void open(`https://skills.sh/s/${skill.skillId}`)}
              >
                {text.registryViewOnSkillsSh}
              </button>
            </div>
          </div>
        ) : readme ? (
          <pre className={panels.registryReadme}>{readme}</pre>
        ) : null}
      </div>
    </div>
  );
}
