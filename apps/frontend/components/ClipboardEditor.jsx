'use client';

import { useState, useRef } from 'react';
import { copyToClipboard } from '@/lib/copyToClipboard';


const MAX_CHARS = 50000;

export default function ClipboardEditor({ content, onChange, placeholder = 'Paste or type your text here...' }) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  const handleCopy = async () => {
    if (!content) return;
    const ok = await copyToClipboard(content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const charCount = content?.length ?? 0;
  const atLimit = charCount >= MAX_CHARS;

  return (
    <div>
      <textarea
        ref={textareaRef}
        id="clipboard-content"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={MAX_CHARS}
        rows={8}
        className="
          w-full resize-none bg-transparent border-none outline-none
          text-base text-stone-900 dark:text-stone-50
          placeholder:text-stone-300 dark:placeholder:text-stone-600
          focus:ring-0 p-0
        "
        aria-label="Clipboard content"
        aria-describedby="char-count"
      />
      {/* Toolbar */}
      <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-700 pt-3 mt-3">
        <span
          id="char-count"
          className={`text-xs transition-colors duration-150 ${
            charCount > 0 ? 'text-olive-500' : 'text-stone-400'
          } ${atLimit ? 'text-red-500' : ''}`}
        >
          {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </span>
        {content && (
          <button
            type="button"
            onClick={handleCopy}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            {copied ? (
              <span className="flex items-center gap-1">
                <svg aria-hidden="true" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </span>
            ) : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}
