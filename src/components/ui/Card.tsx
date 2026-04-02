import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={cn("bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl", className)} {...props}>
    {children}
  </div>
);
