"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navLinks } from './navLinks';

const utilityLinks = [
  { href: '/admin', label: 'Network status' },
  { href: '/history', label: 'Release notes' },
  { href: '/wallet', label: 'Community' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isLinkActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href) && href !== '/';
  };

  const searchItems = useMemo(
    () => [
      ...navLinks.map((item) => ({
        href: item.href,
        label: item.label,
        section: 'Navigation',
      })),
      ...utilityLinks.map((item) => ({
        href: item.href,
        label: item.label,
        section: 'Resources',
      })),
    ],
    []
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return searchItems;
    return searchItems.filter((item) => item.label.toLowerCase().includes(query));
  }, [searchItems, searchQuery]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isShortcut) {
        event.preventDefault();
        setIsSearchOpen(true);
      }
      if (event.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
    else setSearchQuery('');
  }, [isSearchOpen]);

  const openSearch = () => {
    setIsOpen(false);
    setIsSearchOpen(true);
  };
  const closeSearch = () => setIsSearchOpen(false);
  const isMac = typeof window !== 'undefined' && window.navigator.platform.toLowerCase().includes('mac');

  return (
    <>
      <nav className="navbar-arc sticky top-0 z-40 w-full flex justify-center bg-transparent py-4 px-2">
        <div className="navbar-arc-inner w-full max-w-5xl flex items-center justify-between bg-white/95 dark:bg-zinc-900/95 rounded-2xl shadow-lg border border-blue-100 dark:border-zinc-800 px-4 py-2 gap-2 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-cyan-400/20 text-base font-bold text-cyan-500 dark:bg-cyan-600/20 dark:text-cyan-300">AQ</span>
              <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">Arc Quantum Docs</span>
            </Link>
          </div>
          <ul className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = isLinkActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-zinc-800 text-cyan-600 dark:text-cyan-300 font-semibold'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-zinc-800 hover:text-cyan-700 dark:hover:text-cyan-300'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={openSearch}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 transition hover:border-cyan-400 dark:hover:border-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 shadow-sm"
            >
              <span>Search docs...</span>
              <span className="rounded border border-blue-200 dark:border-zinc-700 px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400">{isMac ? '⌘K' : 'Ctrl K'}</span>
            </button>
            {utilityLinks.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-zinc-800 hover:text-cyan-700 dark:hover:text-cyan-300 transition">
                {item.label}
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="inline-flex items-center rounded-lg border border-blue-200 dark:border-zinc-700 p-2 text-cyan-700 dark:text-cyan-300 md:hidden bg-white dark:bg-zinc-900"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 22, height: 22 }} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
        {/* Mobile menu overlay */}
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex md:hidden" onClick={() => setIsOpen(false)}>
            <div className="bg-white dark:bg-zinc-900 w-64 h-full shadow-2xl p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-cyan-400/20 text-base font-bold text-cyan-500 dark:bg-cyan-600/20 dark:text-cyan-300">AQ</span>
                <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">Arc Quantum Docs</span>
              </div>
              <ul className="flex flex-col gap-1">
                {navLinks.map((link) => {
                  const isActive = isLinkActive(link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                          isActive
                            ? 'bg-blue-50 dark:bg-zinc-800 text-cyan-600 dark:text-cyan-300 font-semibold'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-zinc-800 hover:text-cyan-700 dark:hover:text-cyan-300'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-col gap-1 mt-4">
                <button
                  type="button"
                  onClick={openSearch}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 transition hover:border-cyan-400 dark:hover:border-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 shadow-sm"
                >
                  <span>Search docs...</span>
                  <span className="rounded border border-blue-200 dark:border-zinc-700 px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400">{isMac ? '⌘K' : 'Ctrl K'}</span>
                </button>
                {utilityLinks.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-zinc-800 hover:text-cyan-700 dark:hover:text-cyan-300 transition">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>
      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={closeSearch} role="dialog" aria-modal="true" aria-label="Search docs modal">
          <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-blue-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-blue-100 dark:border-zinc-700 px-3 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18 }} className="text-gray-400" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.2-5.2m0 0A7.5 7.5 0 1 0 5.2 5.2a7.5 7.5 0 0 0 10.6 10.6Z" />
              </svg>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search docs..."
                className="w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={closeSearch}
                className="rounded border border-blue-200 dark:border-zinc-700 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 transition hover:border-cyan-400 dark:hover:border-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
              >
                Esc
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <li key={`${item.section}-${item.href}`}>
                    <Link
                      href={item.href}
                      onClick={closeSearch}
                      className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 transition hover:bg-blue-50 dark:hover:bg-zinc-800 hover:text-cyan-700 dark:hover:text-cyan-300"
                    >
                      <span>{item.label}</span>
                      <span className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{item.section}</span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-3 py-8 text-center text-sm text-gray-400 dark:text-gray-500">No result matched your search.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
