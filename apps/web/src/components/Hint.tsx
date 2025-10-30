"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import { Lightbulb } from 'lucide-react';

type HintProps = {
  id: string; // stable id for this hint
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export default function Hint({ id, title = 'Hint', children, className = '' }: HintProps) {
  const pathname = usePathname();
  const storageKey = React.useMemo(() => `gala:hint:${id}:${pathname || ''}`, [id, pathname]);
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const v = localStorage.getItem(storageKey);
    setDismissed(v === '1');
  }, [storageKey]);

  const dismiss = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, '1');
    }
    setDismissed(true);
  }, [storageKey]);

  if (dismissed) return null;

  return (
    <div className={`rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 flex items-start gap-2 ${className}`}>
      <Lightbulb className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
      <div className="text-sm">
        <div className="font-medium mb-0.5">{title}</div>
        <div className="opacity-90">{children}</div>
        <button onClick={dismiss} className="mt-2 text-xs text-amber-700 underline">Got it</button>
      </div>
    </div>
  );
}

