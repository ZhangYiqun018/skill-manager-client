import buttons from "../../../styles/_buttons.module.css";

type DetailTabButtonProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

export function DetailTabButton({ active, label, onClick }: DetailTabButtonProps) {
  return (
    <button
      type="button"
      className={active ? buttons.detailTabUnderlineActive : buttons.detailTabUnderline}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
