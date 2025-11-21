import React from 'react';

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({label, hint, error, ...props}, ref) => (
    <label className="form__field">
      {label ? <span>{label}</span> : null}
      <input ref={ref} {...props} />
      {hint ? <div className="muted" style={{fontSize: 12}}>{hint}</div> : null}
      {error ? <div className="form__error">{error}</div> : null}
    </label>
  ),
);

TextInput.displayName = 'TextInput';

export default TextInput;
