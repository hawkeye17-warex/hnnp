import React from 'react';

type SubmitButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
};

const SubmitButton = ({
  loading = false,
  label = 'Submit',
  loadingLabel = 'Submitting...',
  disabled,
  children,
  ...props
}: SubmitButtonProps) => {
  return (
    <button className="primary auth-button" type="submit" disabled={loading || disabled} {...props}>
      {loading ? loadingLabel : children ?? label}
    </button>
  );
};

export default SubmitButton;
