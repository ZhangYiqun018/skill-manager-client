import styles from "../App.module.css";

type SearchFieldProps = {
  ariaLabel: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

export function SearchField({
  ariaLabel,
  onChange,
  placeholder,
  value,
}: SearchFieldProps) {
  return (
    <label className={styles.searchField}>
      <span className={styles.visuallyHidden}>{ariaLabel}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
