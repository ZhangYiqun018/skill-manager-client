import styles from "../App.module.css";
import { copy, type Language } from "../i18n";

type HealthBadgeProps = {
  issues: number;
  language: Language;
  onClick: () => void;
};

export function HealthBadge({ issues, language, onClick }: HealthBadgeProps) {
  const text = copy[language];
  const label =
    issues === 0 ? text.healthOkay : `${issues} ${text.healthIssues}`;

  return (
    <button
      type="button"
      className={issues === 0 ? styles.healthBadge : styles.healthBadgeAlert}
      onClick={onClick}
    >
      <span className={styles.healthDot} />
      <span>{label}</span>
    </button>
  );
}
