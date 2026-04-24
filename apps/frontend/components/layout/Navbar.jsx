'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ui/ThemeToggle';


function Avatar({ user, size = 'sm' }) {
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-9 h-9 text-sm';
  const initials = user.name?.charAt(0).toUpperCase() || '?';

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        className={`${dim} rounded-full object-cover`}
      />
    );
  }
  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-medium bg-olive-100 dark:bg-olive-900 text-olive-700 dark:text-olive-300 flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);


  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  return (
    <nav className="sticky top-0 z-50 h-14 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm border-b border-stone-200 dark:border-stone-800">
      <div className="max-w-dashboard mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-olive-600 dark:text-olive-400 font-semibold text-lg hover:opacity-80 transition-opacity"
        >
          <span aria-hidden="true" className="w-2 h-2 rounded-sm bg-olive-500 inline-block" />
          ClipSync
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {!isLoading && (
            <>
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="hidden sm:block text-sm text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-50 transition-colors"
                  >
                    Dashboard
                  </Link>

                  {/* Avatar + dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen((v) => !v)}
                      aria-label="Open user menu"
                      aria-expanded={dropdownOpen}
                      className="flex items-center gap-1.5 rounded-lg p-0.5 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                    >
                      <Avatar user={user} />
                    </button>

                    {dropdownOpen && (
                      <div className="card absolute right-0 top-full mt-2 w-48 p-3 shadow-sm z-50 text-left">
                        <p className="text-sm font-medium text-stone-900 dark:text-stone-50 truncate">{user.name}</p>
                        <p className="text-xs text-stone-400 truncate mt-0.5">{user.email}</p>
                        <div className="border-t border-stone-100 dark:border-stone-700 my-2" />
                        <Link
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="block w-full text-left text-sm text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-50 py-1 transition-colors"
                        >
                          Dashboard
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left text-sm text-red-500 hover:text-red-600 py-1 mt-1 transition-colors"
                        >
                          Log out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login" className="btn-secondary">Log in</Link>
                  <Link href="/register" className="btn-primary">Sign up</Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
