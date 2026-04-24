'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const THEMES = ['system', 'light', 'dark'];

const icons = {
  light: (
    /* Sun icon */
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  dark: (
    /* Moon icon */
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  system: (
    /* Monitor icon */
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
};

const labels = { light: 'Light mode', dark: 'Dark mode', system: 'System' };

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />; // Prevent hydration mismatch

  const current = theme || 'system';

  const cycle = () => {
    const idx = THEMES.indexOf(current);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  };

  return (
    <div className="relative group">
      <button
        onClick={cycle}
        aria-label={`Current theme: ${labels[current]}. Click to change.`}
        className="
          w-8 h-8 flex items-center justify-center
          rounded-lg border border-stone-200 dark:border-stone-700
          text-stone-600 dark:text-stone-300
          hover:bg-stone-100 dark:hover:bg-stone-700
          transition-colors duration-150
        "
      >
        {icons[current]}
      </button>
      {/* Tooltip */}
      <div className="
        absolute top-full right-0 mt-1.5
        bg-stone-900 dark:bg-stone-100
        text-stone-50 dark:text-stone-900
        text-xs font-medium
        px-2 py-1 rounded-md whitespace-nowrap
        opacity-0 group-hover:opacity-100
        pointer-events-none
        transition-opacity duration-150
        z-50
      ">
        {labels[current]}
      </div>
    </div>
  );
}
