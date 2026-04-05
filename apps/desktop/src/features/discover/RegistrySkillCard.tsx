import cards from "../../styles/_cards.module.css";
import badges from "../../styles/_badges.module.css";
import layout from "../../styles/_layout.module.css";
import { copy, type Language } from "../../i18n";
import type { RegistrySkillResult } from "../../types";

type RegistrySkillCardProps = {
  skill: RegistrySkillResult;
  selected: boolean;
  onClick: () => void;
  language: Language;
};

export function RegistrySkillCard({ skill, selected, onClick, language }: RegistrySkillCardProps) {
  const text = copy[language];
  return (
    <article
      className={`${cards.registryResultCard} ${selected ? cards.registryCardSelected : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={cards.registryCardIcon}>{skill.name.charAt(0).toUpperCase()}</div>
      <strong className={cards.registryCardTitle}>{skill.name}</strong>
      <p className={layout.helperText}>{skill.source}</p>
      <span className={badges.inlineTag}>
        {skill.installs >= 1000 ? `${(skill.installs / 1000).toFixed(1)}K` : skill.installs}{" "}
        {text.remoteInstallsLabel}
      </span>
    </article>
  );
}
