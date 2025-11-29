import React from 'react';

type Props = {label: string};

const InfoTooltip: React.FC<Props> = ({label}) => {
  return (
    <span className="relative group inline-flex items-center">
      <span
        className="ml-1 h-4 w-4 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center cursor-default"
        aria-label={label}
        role="img"
        tabIndex={0}>
        ?
      </span>
      <span className="absolute z-20 bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 text-white text-xs px-3 py-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shadow-lg">
        {label}
      </span>
    </span>
  );
};

export default InfoTooltip;
