import buttons from "../styles/_buttons.module.css";
import { copy, type Language } from "../i18n";

type HealthBadgeProps = {
  issues: number;
  language: Language;
  onClick: () => void;
};

export function HealthBadge({ issues, language, onClick }: HealthBadgeProps) {
  const text = copy[language];
  const label = issues === 0 ? text.healthOkay : `${issues} ${text.healthIssues}`;

  return (
    <button
      type="button"
      className={issues === 0 ? buttons.healthBadge : buttons.healthBadgeAlert}
      onClick={onClick}
    >
      <span className={buttons.healthDot} />
      <span>{label}</span>
    </button>
  );
}
