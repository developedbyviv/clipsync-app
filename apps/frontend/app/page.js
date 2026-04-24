'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import ClipboardEditor from '@/components/ClipboardEditor';
import PinDisplay from '@/components/PinDisplay';
import RetrieveForm from '@/components/RetrieveForm';
import ExpirySelector from '@/components/ExpirySelector';

function SelfDestructToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-stone-600 dark:text-stone-300">Self-destruct</span>
      {/* Info tooltip */}
      <div className="relative group">
        <svg aria-hidden="true" className="w-3.5 h-3.5 text-stone-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 text-xs rounded-md px-2 py-1.5 text-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-10">
          Clipboard is permanently deleted after first view
        </div>
      </div>
      {/* Toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label="Enable self-destruct mode"
        onClick={() => onChange(!value)}
        className={`relative w-8 h-4 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-400 focus-visible:ring-offset-2 ${
          value ? 'bg-olive-500 dark:bg-olive-400' : 'bg-stone-200 dark:bg-stone-700'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-150 ${
            value ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();

  const [content, setContent] = useState('');
  const [expiresIn, setExpiresIn] = useState('24h');
  const [readAndDestroy, setReadAndDestroy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/clipboard', { content, expiresIn, readAndDestroy });
      setCreated(data);
      toast({ message: 'Clipboard created!', variant: 'success' });
    } catch (err) {
      setError(err.message || 'Failed to create clipboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCreated(null);
    setContent('');
    setError('');
    setExpiresIn('24h');
    setReadAndDestroy(false);
  };

  return (
    <main className="page-container">
      <div className="content-wrapper">

        {/* Hero */}
        <div className="mb-8">
          <span className="badge">Free · No signup required</span>
          <h1 className="text-3xl font-semibold text-stone-900 dark:text-stone-50 mt-4">
            Your instant clipboard, everywhere
          </h1>
          <p className="text-base text-stone-500 dark:text-stone-400 mt-2">
            Paste text on one device, access it on any other. Syncs in real time.
          </p>
        </div>

        {/* Editor card */}
        <section className="card">
          {!created ? (
            <form onSubmit={handleCreate}>
              {/* Auth banner */}
              {isAuthenticated && user && (
                <div className="bg-olive-50 dark:bg-olive-900/30 border border-olive-100 dark:border-olive-800 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
                  <svg aria-hidden="true" className="w-4 h-4 text-olive-600 dark:text-olive-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-olive-700 dark:text-olive-300">
                    Saved to your account
                  </p>
                </div>
              )}

              {/* Textarea — transparent, card provides the border */}
              <ClipboardEditor
                content={content}
                onChange={setContent}
                placeholder="Paste or type your text here..."
              />

              {/* Error */}
              {error && (
                <div role="alert" className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Bottom toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <div className="flex items-center gap-3">
                  <ExpirySelector value={expiresIn} onChange={setExpiresIn} />
                  <SelfDestructToggle value={readAndDestroy} onChange={setReadAndDestroy} />
                </div>
                <button
                  id="create-clipboard-btn"
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <>
                      <span aria-hidden="true" className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />
                      Creating…
                    </>
                  ) : 'Create clipboard'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Clipboard created</p>
                <button
                  id="create-another-btn"
                  onClick={handleReset}
                  className="text-sm text-olive-600 dark:text-olive-400 hover:underline"
                >
                  + Create another
                </button>
              </div>
              <PinDisplay pin={created.pin} url={created.url} expiresAt={created.expiresAt} />
            </div>
          )}
        </section>

        {/* Guest CTA */}
        {!isAuthenticated && (
          <p className="text-xs text-stone-400 text-center mt-4">
            <Link href="/register" className="text-olive-600 dark:text-olive-400 hover:underline font-medium">
              Create a free account
            </Link>
            {' '}to save and manage your clipboards
          </p>
        )}

        {/* Retrieve form */}
        <RetrieveForm />

        <footer className="mt-12 text-center text-xs text-stone-400">
          Week 1 · ClipSync DevOps Portfolio Project
        </footer>
      </div>
    </main>
  );
}
