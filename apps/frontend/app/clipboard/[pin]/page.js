'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { getSocket, disconnectSocket } from '@/lib/socket';
import LiveIndicator from '@/components/LiveIndicator';
import { copyToClipboard } from '@/lib/copyToClipboard';



function formatCountdown(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${sec}s`;
}

export default function ClipboardPage({ params }) {
  const { pin } = params;

  const [content, setContent] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [readAndDestroy, setReadAndDestroy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [lastSynced, setLastSynced] = useState(null);
  const [copied, setCopied] = useState(false);

  const debounceRef = useRef(null);
  const fromSocketRef = useRef(false);

  // ── Fetch clipboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchClipboard() {
      try {
        const { data } = await api.get(`/clipboard/${pin}`);
        if (cancelled) return;
        setContent(data.content || '');
        setExpiresAt(data.expires_at);
        setReadAndDestroy(data.read_and_destroy || false);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchClipboard();
    return () => { cancelled = true; };
  }, [pin]);

  // ── Countdown ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!expiresAt) return;
    setCountdown(formatCountdown(expiresAt));
    const iv = setInterval(() => {
      const v = formatCountdown(expiresAt);
      setCountdown(v);
      if (v === 'Expired') clearInterval(iv);
    }, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  // ── Socket.io ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || notFound) return;
    const socket = getSocket();

    const onConnect = () => { setSocketConnected(true); socket.emit('join-clipboard', { pin }); };
    const onDisconnect = () => setSocketConnected(false);
    const onUpdated = ({ content: c, updatedAt }) => {
      fromSocketRef.current = true;
      setContent(c ?? '');
      setLastSynced(updatedAt ? new Date(updatedAt) : new Date());
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('clipboard-updated', onUpdated);
    socket.on('error', (e) => console.error('[Socket]', e));

    if (!socket.connected) socket.connect(); else onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('clipboard-updated', onUpdated);
      disconnectSocket();
    };
  }, [loading, notFound, pin]);

  const handleContentChange = useCallback((newContent) => {
    if (fromSocketRef.current) { fromSocketRef.current = false; setContent(newContent); return; }
    setContent(newContent);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const socket = getSocket();
      if (socket.connected) socket.emit('update-clipboard', { pin, content: newContent });
    }, 500);
  }, [pin]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(content);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-olive-400 border-t-transparent animate-spin" />
          <p className="text-sm text-stone-400">Loading clipboard…</p>
        </div>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="page-container flex items-center justify-center px-4">
        <div className="text-center content-wrapper">
          <p className="text-6xl font-semibold text-stone-200 dark:text-stone-700" aria-hidden="true">404</p>
          <h1 className="text-xl font-medium text-stone-900 dark:text-stone-50 mt-4">Clipboard not found</h1>
          <p className="text-stone-400 text-sm mt-2">This clipboard may have expired or been deleted.</p>
          <Link href="/" className="btn-primary mt-6 inline-flex">
            Create a new clipboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────────────
  return (
    <main className="page-container">
      <div className="content-wrapper">

        {/* Read & Destroy banner */}
        {readAndDestroy && (
          <div
            id="read-destroy-banner"
            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 mb-4 flex items-start gap-3"
          >
            <svg aria-hidden="true" className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="font-medium text-sm text-amber-800 dark:text-amber-300">Read &amp; destroy enabled</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                This clipboard will be permanently deleted when you close or leave this page.
              </p>
            </div>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="badge">PIN: {pin}</span>
            {countdown && (
              <span className={`text-xs ${countdown === 'Expired' ? 'text-red-500' : 'text-stone-400'}`}>
                {countdown === 'Expired' ? 'Expired' : `Expires in ${countdown}`}
              </span>
            )}
          </div>
          <LiveIndicator connected={socketConnected} />
        </div>

        {/* Editor card */}
        <div className="card">
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            readOnly={readAndDestroy}
            placeholder="Clipboard content will appear here…"
            className="w-full min-h-[280px] resize-none bg-transparent border-none outline-none focus:ring-0 text-base text-stone-900 dark:text-stone-50 placeholder:text-stone-300 dark:placeholder:text-stone-600 p-0"
            aria-label="Clipboard content"
          />

          {/* Bottom toolbar */}
          <div className="border-t border-stone-100 dark:border-stone-800 mt-4 pt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-stone-400">
              {content.length.toLocaleString()} chars
              {lastSynced && (
                <span className="ml-3">Synced {lastSynced.toLocaleTimeString()}</span>
              )}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
            >
              {copied ? (
                <>
                  <svg aria-hidden="true" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : 'Copy'}
            </button>
          </div>
        </div>

        <footer className="mt-8 text-center text-xs text-stone-400">
          Week 1 · ClipSync DevOps Portfolio Project
        </footer>
      </div>
    </main>
  );
}
