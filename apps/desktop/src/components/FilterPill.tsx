import buttons from "../styles/_buttons.module.css";

type FilterPillProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

export function FilterPill({ active, label, onClick }: FilterPillProps) {
  return (
    <button
      type="button"
      className={active ? buttons.filterPillActive : buttons.filterPill}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
