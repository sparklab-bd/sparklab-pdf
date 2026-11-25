import React, { useState } from 'react';
import { PrivacyModal } from './PrivacyModal';

export const Footer: React.FC = () => {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <>
      <footer className="mt-12 border-t border-[#E2E8F0] py-6 text-center dark:border-slate-800">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-600 sm:flex-row sm:px-6 dark:text-slate-400">
          <p>
            100% Private • Works Offline (Test in Airplane Mode) • Powered by Spark Lab
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="min-h-[44px] px-2 font-medium text-[#0F172A] underline underline-offset-4 hover:text-[#E11D48] dark:text-slate-200 dark:hover:text-rose-400"
            >
              Privacy &amp; Terms
            </button>
            <a
              href="mailto:support@sparklab.app?subject=Spark%20PDF%20Issue%20Report"
              className="inline-flex min-h-[44px] items-center px-2 font-medium text-[#0F172A] underline underline-offset-4 hover:text-[#E11D48] dark:text-slate-200 dark:hover:text-rose-400"
            >
              Report Issue
            </a>
          </div>
        </div>
      </footer>

      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </>
  );
};
