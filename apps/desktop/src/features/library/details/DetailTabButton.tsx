import styles from "../../../App.module.css";

type DetailTabButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

export function DetailTabButton({ active, label, onClick }: DetailTabButtonProps) {
  return (
    <button
      type="button"
      className={active ? styles.detailTabUnderlineActive : styles.detailTabUnderline}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
