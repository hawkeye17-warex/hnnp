import React from 'react';

type NumberInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({label, hint, error, ...props}, ref) => (
    <label className="form__field">
      {label ? <span>{label}</span> : null}
      <input ref={ref} type="number" inputMode="decimal" {...props} />
      {hint ? <div className="muted" style={{fontSize: 12}}>{hint}</div> : null}
      {error ? <div className="form__error">{error}</div> : null}
    </label>
  ),
);

NumberInput.displayName = 'NumberInput';

export default NumberInput;
