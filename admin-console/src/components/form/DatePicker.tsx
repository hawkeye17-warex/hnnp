import React from 'react';

type DatePickerProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({label, hint, error, ...props}, ref) => (
    <label className="form__field">
      {label ? <span>{label}</span> : null}
      <input ref={ref} type="date" {...props} />
      {hint ? <div className="muted" style={{fontSize: 12}}>{hint}</div> : null}
      {error ? <div className="form__error">{error}</div> : null}
    </label>
  ),
);

DatePicker.displayName = 'DatePicker';

export default DatePicker;
