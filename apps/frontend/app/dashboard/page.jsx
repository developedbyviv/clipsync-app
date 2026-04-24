'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';


const PAGE_SIZE = 20;

function formatExpiry(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return { label: 'Expired', color: 'text-red-500', isExpired: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h < 1) return { label: `${m}m left`, color: 'text-amber-500', isExpired: false };
  if (h < 24) return { label: `${h}h ${m}m left`, color: h < 2 ? 'text-amber-500' : 'text-stone-400', isExpired: false };
  const d = Math.floor(h / 24);
  return { label: `${d}d left`, color: 'text-stone-400', isExpired: false };
}

function StatCard({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-stone-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-stone-900 dark:text-stone-50 mt-1">{value}</p>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 mb-3 animate-pulse">
      <div className="h-4 skeleton rounded w-3/5 mb-2" />
      <div className="h-3 skeleton rounded w-2/5" />
    </div>
  );
}

function ClipboardRow({ clipboard, onDelete }) {
  const router = useRouter();
  const expiry = formatExpiry(clipboard.expires_at);
  const preview = clipboard.content?.trim() || null;

  return (
    <div
      onClick={() => router.push(`/clipboard/${clipboard.pin}`)}
      className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 mb-3 hover:border-stone-300 dark:hover:border-stone-600 hover:bg-stone-50/50 dark:hover:bg-stone-800/50 transition-colors duration-150 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-700 dark:text-stone-300 truncate">
            {preview || <span className="italic text-stone-400">Empty clipboard</span>}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="badge">PIN: {clipboard.pin}</span>
            <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-600 flex-shrink-0" aria-hidden="true" />
            <span className={`text-xs ${expiry.color}`}>{expiry.label}</span>
            {clipboard.read_and_destroy && (
              <span className="inline-flex items-center bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-medium px-2 py-0.5 rounded-md">
                Self-destruct
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => router.push(`/clipboard/${clipboard.pin}`)}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Open
          </button>
          <button
            onClick={() => onDelete(clipboard.pin)}
            aria-label={`Delete clipboard with PIN ${clipboard.pin}`}
            className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
          >
            <svg aria-hidden="true" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      {/* Clipboard SVG illustration */}
      <svg aria-hidden="true" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-stone-300 dark:text-stone-700">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h4" />
      </svg>
      <p className="text-lg font-medium text-stone-700 dark:text-stone-300 mt-4">No clipboards yet</p>
      <p className="text-sm text-stone-400 mt-2">Create your first clipboard and it will appear here.</p>
      <Link href="/" className="btn-primary mt-6 inline-flex">
        Create clipboard
      </Link>
    </div>
  );
}

function DashboardContent() {
  const toast = useToast();

  const [clipboards, setClipboards] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchClipboards = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/clipboard/my-clipboards?page=${p}&limit=${PAGE_SIZE}`);
      setClipboards(data.clipboards);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      toast({ message: 'Failed to load clipboards.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchClipboards(1); }, [fetchClipboards]);

  const handleDelete = async (pin) => {
    if (!confirm(`Delete clipboard ${pin}? This cannot be undone.`)) return;
    try {
      await api.delete(`/clipboard/${pin}`);
      toast({ message: 'Clipboard deleted.', variant: 'success' });
      fetchClipboards(page);
    } catch {
      toast({ message: 'Failed to delete clipboard.', variant: 'error' });
    }
  };

  // Stats
  const now = Date.now();
  const active = clipboards.filter((c) => new Date(c.expires_at) > now).length;
  const expiringSoon = clipboards.filter((c) => {
    const diff = new Date(c.expires_at) - now;
    return diff > 0 && diff < 3600000;
  }).length;

  return (
    <div className="page-container">
      <div className="max-w-dashboard mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">Your clipboards</h1>
            <p className="text-sm text-stone-400 mt-1">{total} clipboard{total !== 1 ? 's' : ''} saved</p>
          </div>
          <Link href="/" className="btn-primary self-start sm:self-auto flex items-center gap-1.5">
            <svg aria-hidden="true" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New clipboard
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Total" value={total} />
          <StatCard label="Active" value={active} />
          <StatCard label="Expiring soon" value={expiringSoon} />
        </div>

        {/* Clipboard list */}
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : clipboards.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {clipboards.map((c) => (
              <ClipboardRow key={c.id} clipboard={c} onDelete={handleDelete} />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => fetchClipboards(page - 1)}
                  disabled={page === 1}
                  className="btn-secondary"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => fetchClipboards(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        p === page
                          ? 'bg-olive-500 dark:bg-olive-400 text-white dark:text-stone-900'
                          : 'btn-secondary p-0'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => fetchClipboards(page + 1)}
                  disabled={page === totalPages}
                  className="btn-secondary"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
