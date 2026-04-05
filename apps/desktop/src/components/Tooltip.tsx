import styles from "../styles/_tooltip.module.css";

type TooltipProps = {
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
};

export function Tooltip({ content, position = "top", children }: TooltipProps) {
  return (
    <span className={styles.tooltipWrapper} data-tooltip={content} data-position={position}>
      {children}
    </span>
  );
}
