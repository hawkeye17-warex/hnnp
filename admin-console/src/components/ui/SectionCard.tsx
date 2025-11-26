import React, {ReactNode} from 'react';
import clsx from 'clsx';

type SectionCardProps = {
  title: string;
  className?: string;
  children: ReactNode;
};

const SectionCard: React.FC<SectionCardProps> = ({title, className, children}) => {
  return (
    <section
      className={clsx(
        'bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-sm text-slate-600',
        className,
      )}>
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </header>
      <div>{children}</div>
    </section>
  );
};

export default SectionCard;
