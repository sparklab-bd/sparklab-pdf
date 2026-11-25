import React, { useRef, useState } from 'react';
import { FileUp, Sparkles } from 'lucide-react';

interface DropZoneProps {
  accept: string;
  multiple?: boolean;
  label: string;
  hint: string;
  onFilesSelected: (files: File[]) => void;
  onTrySample: () => void;
  sampleLoading?: boolean;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  accept,
  multiple = false,
  label,
  hint,
  onFilesSelected,
  onTrySample,
  sampleLoading = false,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    onFilesSelected(Array.from(fileList));
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-8 ${
        isDragging
          ? 'border-[#E11D48] bg-rose-50/70 dark:bg-rose-950/20'
          : 'border-[#E2E8F0] bg-[#F8FAFC] dark:border-slate-700 dark:bg-slate-900/60'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
        className="sr-only"
        aria-label={label}
      />

      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-[#E11D48] dark:bg-rose-950/40 dark:text-rose-400">
        <FileUp className="h-6 w-6" aria-hidden="true" />
      </div>

      <p className="mt-3 text-base font-semibold text-[#0F172A] dark:text-white">{label}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-6 py-2.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#BE123C] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E11D48] focus-visible:ring-offset-2"
        >
          <FileUp className="h-5 w-5" aria-hidden="true" />
          <span>Select {multiple ? 'Files' : 'File'}</span>
        </button>

        <button
          type="button"
          disabled={disabled || sampleLoading}
          onClick={onTrySample}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-5 py-2.5 text-base font-semibold text-[#0F172A] transition-colors hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E11D48] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          <Sparkles className="h-4 w-4 text-[#E11D48]" aria-hidden="true" />
          <span>{sampleLoading ? 'Creating Sample...' : 'Try Sample'}</span>
        </button>
      </div>
    </div>
  );
};
