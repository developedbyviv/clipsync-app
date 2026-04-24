'use client';

export default function LiveIndicator({ connected }) {
  return (
    <div className="flex items-center gap-1.5" aria-live="polite" aria-atomic="true">
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          connected
            ? 'bg-green-500 animate-pulse-dot'
            : 'bg-stone-300 dark:bg-stone-600'
        }`}
      />
      <span className="text-xs text-stone-400">
        {connected ? 'Live' : 'Offline'}
      </span>
      <span className="sr-only">{connected ? 'Real-time sync is active' : 'Disconnected from real-time sync'}</span>
    </div>
  );
}
