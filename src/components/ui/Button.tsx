import React from 'react';
import { cn } from '../../lib/utils';

export const Button = ({ children, onClick, disabled, variant = 'primary', className }: any) => {
  const variants = {
    primary: "bg-white text-black hover:bg-gray-200",
    secondary: "bg-white/5 text-white hover:bg-white/10 border border-white/10",
    outline: "border border-white/20 text-white hover:bg-white/5",
    ghost: "text-white/60 hover:text-white hover:bg-white/5"
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-6 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
        variants[variant as keyof typeof variants],
        className
      )}
    >
      {children}
    </button>
  );
};
