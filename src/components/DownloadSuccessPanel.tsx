import React, { useState } from 'react';
import { CheckCircle2, Download, Mail, RotateCcw, Share2 } from 'lucide-react';
import { formatFileSize, triggerDownload } from '../utils/pdfEngine';

interface DownloadSuccessPanelProps {
  blob: Blob;
  filename: string;
  summary: string;
  onReset: () => void;
}

export const DownloadSuccessPanel: React.FC<DownloadSuccessPanelProps> = ({
  blob,
  filename,
  summary,
  onReset,
}) => {
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [showFallbackLinks, setShowFallbackLinks] = useState(false);

  const shareText = `I just edited a PDF privately offline with Spark PDF!`;

  const handleShare = async () => {
    setShareNote(null);
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const file = new File([blob], filename, { type: blob.type || 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Spark PDF',
            text: shareText,
            files: [file],
          });
          return;
        }
        await navigator.share({
          title: 'Spark PDF',
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    setShowFallbackLinks((prev) => !prev);
    setShareNote('Choose WhatsApp or Email below to share.');
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `${shareText} ${window.location.href}`
  )}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(
    'Try Spark PDF — Free Offline PDF Tools'
  )}&body=${encodeURIComponent(`${shareText}\n\n${window.location.href}`)}`;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/25">
      <div className="flex items-start gap-3">
        <CheckCircle2
          className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
            Ready — Your file has been downloaded
          </h3>
          <p className="mt-1 text-base text-slate-700 dark:text-slate-300">
            {summary} ({filename}, {formatFileSize(blob.size)})
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => triggerDownload(blob, filename)}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#BE123C]"
        >
          <Download className="h-5 w-5" aria-hidden="true" />
          <span>Download Again</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-5 py-2.5 text-base font-semibold text-[#0F172A] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          <Share2 className="h-5 w-5 text-[#E11D48]" aria-hidden="true" />
          <span>Share via WhatsApp / Email</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-base font-medium text-slate-600 transition-colors hover:bg-white/70 hover:text-[#0F172A] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          <span>Start Over</span>
        </button>
      </div>

      {showFallbackLinks && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {shareNote && (
            <span className="text-sm text-slate-600 dark:text-slate-400">{shareNote}</span>
          )}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-sm font-semibold text-[#0F172A] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <span>WhatsApp</span>
          </a>
          <a
            href={emailHref}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-sm font-semibold text-[#0F172A] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            <span>Email</span>
          </a>
        </div>
      )}

      <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
        Need to compress or resize images? Try{' '}
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="font-semibold text-[#E11D48] underline underline-offset-2 hover:text-[#BE123C]"
        >
          Spark Image
        </a>
      </p>
    </div>
  );
};
