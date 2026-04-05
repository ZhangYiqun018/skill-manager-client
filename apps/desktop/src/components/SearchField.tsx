import forms from "../styles/_forms.module.css";
import layout from "../styles/_layout.module.css";

type SearchFieldProps = {
  ariaLabel: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

export function SearchField({ ariaLabel, onChange, placeholder, value }: SearchFieldProps) {
  return (
    <label className={forms.searchField}>
      <span className={layout.visuallyHidden}>{ariaLabel}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
