import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl", className)}>
    {children}
  </div>
);
