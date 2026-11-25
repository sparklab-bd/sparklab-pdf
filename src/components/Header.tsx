import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const SPARK_APPS = [
  { name: 'Spark Office', href: '#', current: false },
  { name: 'Spark PDF', href: '#', current: true },
  { name: 'Spark Image', href: '#', current: false },
  { name: 'Spark Studio', href: '#', current: false },
];

export const Header: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [appsOpen, setAppsOpen] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAppsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAppsOpen(false);
        setShowInstallGuide(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) return;
      return;
    }
    setShowInstallGuide(true);
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-[#FFFFFF]/95 backdrop-blur-md dark:border-slate-800 dark:bg-[#0B1120]/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Header Left: Minimal rounded-square coral-red icon ("SP" + white sparkle dot) + bold wordmark */}
          <a
            href="#top"
            className="flex items-center gap-3 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E11D48] rounded-lg"
          >
            <span
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#E11D48] text-white shadow-sm select-none"
              aria-hidden="true"
            >
              <span className="text-sm font-bold tracking-tight">SP</span>
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            <span className="text-xl font-bold tracking-tight text-[#0F172A] dark:text-white">
              Spark PDF
            </span>
          </a>

          {/* Header Right: Apps ▾ pill + Install App button */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setAppsOpen((prev) => !prev)}
                aria-expanded={appsOpen}
                aria-haspopup="menu"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E11D48] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                <span>Apps</span>
                <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              </button>

              {appsOpen && (
                <div
                  role="menu"
                  aria-label="Spark apps"
                  className="absolute right-0 mt-2 w-48 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                >
                  {SPARK_APPS.map((app) => (
                    <a
                      key={app.name}
                      href={app.href}
                      role="menuitem"
                      onClick={(e) => {
                        if (app.href === '#') e.preventDefault();
                        setAppsOpen(false);
                      }}
                      className={`flex min-h-[44px] items-center justify-between rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                        app.current
                          ? 'bg-rose-50 text-[#E11D48] dark:bg-rose-950/50 dark:text-rose-400'
                          : 'text-[#0F172A] hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{app.name}</span>
                      {app.current && <span className="text-xs font-semibold">Active</span>}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#E11D48] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#BE123C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E11D48] focus-visible:ring-offset-2 whitespace-nowrap shrink-0"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Install App</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {showInstallGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
          onClick={() => setShowInstallGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                id="install-guide-title"
                className="text-lg font-bold text-[#0F172A] dark:text-white"
              >
                Install Spark PDF
              </h2>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                aria-label="Close install guide"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 space-y-3 text-base text-slate-600 dark:text-slate-300">
              {isIOS ? (
                <div className="space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-800/60">
                  <p className="font-medium text-[#0F172A] dark:text-white">
                    1. Tap the <strong>Share</strong> button in Safari&apos;s toolbar.
                  </p>
                  <p className="font-medium text-[#0F172A] dark:text-white">
                    2. Scroll down and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-800/60">
                    <p className="font-semibold text-[#0F172A] dark:text-white">
                      iOS Safari Users:
                    </p>
                    <p>1. Tap the <strong>Share</strong> button in Safari&apos;s toolbar.</p>
                    <p>2. Scroll down and tap <strong>Add to Home Screen</strong>.</p>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    On Chrome or Edge desktop/Android, click the install icon in your browser&apos;s address bar or menu to install for offline use.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInstallGuide(false)}
              className="mt-5 min-h-[44px] w-full rounded-xl bg-[#E11D48] px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#BE123C]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
