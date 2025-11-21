import React from 'react';

type Option = {label: string; value: string};

type SelectInputProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: Option[];
  hint?: string;
  error?: string;
};

const SelectInput = React.forwardRef<HTMLSelectElement, SelectInputProps>(
  ({label, options, hint, error, ...props}, ref) => (
    <label className="form__field">
      {label ? <span>{label}</span> : null}
      <select ref={ref} {...props}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint ? <div className="muted" style={{fontSize: 12}}>{hint}</div> : null}
      {error ? <div className="form__error">{error}</div> : null}
    </label>
  ),
);

SelectInput.displayName = 'SelectInput';

export default SelectInput;
