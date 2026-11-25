import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="privacy-modal-title"
            className="text-xl font-bold text-[#0F172A] dark:text-white"
          >
            Privacy &amp; Terms
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Privacy and Terms"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-base text-slate-600 dark:text-slate-300">
          <div>
            <h3 className="font-semibold text-[#0F172A] dark:text-white">
              Zero Data Collection
            </h3>
            <p className="mt-1">
              Spark PDF runs 100% locally inside your browser. Your files, passwords, and edits never leave your device, are never uploaded to any server, and no analytics, cookies, or tracking scripts are used.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#0F172A] dark:text-white">
              AS-IS Disclaimer
            </h3>
            <p className="mt-1">
              This software is provided &ldquo;AS IS&rdquo;, without warranty of any kind, express or implied, including merchantability, fitness for a particular purpose, or non-infringement. Always keep a backup copy of important documents.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#0F172A] dark:text-white">
              Limitation of Liability ($0 Cap)
            </h3>
            <p className="mt-1">
              In no event shall Spark Lab or its contributors be liable for any direct, indirect, incidental, or consequential damages arising from the use of Spark PDF. Maximum aggregate liability is strictly capped at $0 (zero dollars).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 min-h-[44px] w-full rounded-xl bg-[#E11D48] px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#BE123C]"
        >
          Close
        </button>
      </div>
    </div>
  );
};
