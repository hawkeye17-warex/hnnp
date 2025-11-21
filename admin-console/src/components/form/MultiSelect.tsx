import React from 'react';

type Option = {label: string; value: string};

type MultiSelectProps = {
  label?: string;
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  hint?: string;
  error?: string;
};

const MultiSelect = ({label, options, value, onChange, hint, error}: MultiSelectProps) => {
  const toggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter(v => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  return (
    <div className="form__field">
      {label ? <span>{label}</span> : null}
      <div className="multiselect">
        {options.map(opt => (
          <label key={opt.value} className="multiselect__item">
            <input
              type="checkbox"
              checked={value.includes(opt.value)}
              onChange={() => toggle(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
      {hint ? <div className="muted" style={{fontSize: 12}}>{hint}</div> : null}
      {error ? <div className="form__error">{error}</div> : null}
    </div>
  );
};

export default MultiSelect;
