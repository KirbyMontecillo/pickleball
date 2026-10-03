import type { ReactNode } from 'react';

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-3xl border border-pink-100 bg-white p-5 ${className}`}>{children}</section>
);

export const Title = ({ children }: { children: ReactNode }) => (
  <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-pink-400">{children}</h2>
);

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'soft';
  disabled?: boolean;
  className?: string;
}

export const Button = ({ children, onClick, variant = 'primary', disabled, className = '' }: ButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`min-h-14 w-full rounded-2xl px-5 text-lg font-semibold transition active:scale-[0.98] disabled:opacity-40 ${
      variant === 'primary' ? 'bg-pink-400 text-white' : 'bg-pink-50 text-pink-600'
    } ${className}`}
  >
    {children}
  </button>
);

interface SegmentedProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function Segmented<T extends string | number>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="flex gap-1 rounded-2xl bg-pink-50 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 flex-1 rounded-xl text-sm font-semibold transition ${
            o.value === value ? 'bg-white text-pink-600 shadow-sm' : 'text-pink-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}