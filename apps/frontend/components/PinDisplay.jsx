'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { copyToClipboard } from '@/lib/copyToClipboard';


function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button type="button" onClick={handleCopy} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
      {copied ? (
        <>
          <svg aria-hidden="true" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : label}
    </button>
  );
}

export default function PinDisplay({ pin, url, expiresAt }) {
  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="card mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Top row */}
      <div className="flex items-center gap-2">
        <p className="text-base font-medium text-stone-900 dark:text-stone-50">Clipboard created</p>
        <span aria-hidden="true" className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
      </div>

      {/* PIN + copy */}
      <div className="mt-4">
        <p className="text-xs text-stone-400 uppercase tracking-wide">Your PIN</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-4xl font-semibold tracking-[0.2em] text-olive-600 dark:text-olive-400 tabular-nums">
            {pin}
          </span>
          <CopyButton text={pin} label="Copy PIN" />
        </div>
      </div>

      <div className="border-t border-stone-100 dark:border-stone-700 my-4" />

      {/* Share link + QR code */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Share link */}
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide mb-2">Share link</p>
          <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2 text-xs font-mono text-stone-600 dark:text-stone-400 truncate">
            {url}
          </div>
          <CopyButton text={url} label="Copy link" />
        </div>

        {/* QR code */}
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide mb-2">QR Code</p>
          <div className="inline-flex border border-olive-200 dark:border-olive-800 rounded-lg p-2 bg-white dark:bg-stone-900">
            <QRCodeSVG value={url} size={96} aria-label={`QR code for clipboard PIN ${pin}`} />
          </div>
        </div>
      </div>

      {/* Expiry note */}
      {expiryLabel && (
        <p className="text-xs text-stone-400 mt-4">
          Expires {expiryLabel}
        </p>
      )}
    </div>
  );
}
