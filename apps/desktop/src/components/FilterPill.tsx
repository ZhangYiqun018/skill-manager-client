import styles from "../App.module.css";

type FilterPillProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

export function FilterPill({ active, label, onClick }: FilterPillProps) {
  return (
    <button
      type="button"
      className={active ? styles.filterPillActive : styles.filterPill}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
