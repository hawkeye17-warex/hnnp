import React from 'react';

type ToggleProps = {
  label?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
  error?: string;
};

const Toggle = ({label, checked, onChange, hint, error}: ToggleProps) => {
  return (
    <label className="form__field toggle">
      {label ? <span>{label}</span> : null}
      <div className="toggle__control">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          aria-checked={checked}
          aria-label={label}
        />
        <div className={`toggle__slider ${checked ? 'toggle__slider--on' : ''}`} />
      </div>
      {hint ? <div className="muted" style={{fontSize: 12}}>{hint}</div> : null}
      {error ? <div className="form__error">{error}</div> : null}
    </label>
  );
};

export default Toggle;
