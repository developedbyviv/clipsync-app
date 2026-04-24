'use client';

export default function ExpirySelector({ value, onChange }) {
  const options = [
    { label: '1h', value: '1h' },
    { label: '24h', value: '24h' },
    { label: '7d', value: '7d' },
  ];

  return (
    <div role="group" aria-label="Expiry duration">
      <span className="sr-only">Select expiry duration</span>
      <div className="inline-flex rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden">
        {options.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`
              px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-olive-400
              ${i > 0 ? 'border-l border-stone-200 dark:border-stone-700' : ''}
              ${
                value === opt.value
                  ? 'bg-olive-500 dark:bg-olive-400 text-white dark:text-stone-900'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
