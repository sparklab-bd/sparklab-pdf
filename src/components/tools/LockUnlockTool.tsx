import React, { useState } from 'react';
import { Eye, EyeOff, FileText, Loader2, Lock, Unlock } from 'lucide-react';
import { DropZone } from '../DropZone';
import { DownloadSuccessPanel } from '../DownloadSuccessPanel';
import {
  createSampleLockedPdfFile,
  createSamplePdfFile,
  formatFileSize,
  lockPdfWithPassword,
  triggerDownload,
  unlockPdfWithPassword,
  validateFiles,
} from '../../utils/pdfEngine';

interface LockUnlockToolProps {
  onStepChange: (step: 1 | 2 | 3) => void;
}

export const LockUnlockTool: React.FC<LockUnlockToolProps> = ({ onStepChange }) => {
  const [mode, setMode] = useState<'lock' | 'unlock'>('lock');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sampleHint, setSampleHint] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string; summary: string } | null>(null);

  const resetAll = () => {
    setFile(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setSampleHint(null);
    setProgress(null);
    setError(null);
    setResult(null);
    onStepChange(1);
  };

  const switchMode = (next: 'lock' | 'unlock') => {
    setMode(next);
    resetAll();
  };

  const handleFile = (rawFiles: File[]) => {
    setError(null);
    setResult(null);
    setSampleHint(null);
    try {
      const [valid] = validateFiles([rawFiles[0]], 'pdf');
      setFile(valid);
      onStepChange(2);
    } catch (err: any) {
      setError(err?.message || 'Could not select file.');
      onStepChange(1);
    }
  };

  const handleTrySample = async () => {
    setError(null);
    setResult(null);
    setSampleLoading(true);
    try {
      if (mode === 'lock') {
        const sample = await createSamplePdfFile('sample-contract.pdf', 2, 'Private Agreement');
        setFile(sample);
        setPassword('spark2026');
        setConfirmPassword('spark2026');
        setSampleHint('Sample loaded with demo password "spark2026" — change it or click Lock PDF.');
      } else {
        const lockedSample = await createSampleLockedPdfFile('spark2026');
        setFile(lockedSample);
        setPassword('spark2026');
        setSampleHint('Locked sample loaded! Demo password is "spark2026" (pre-filled for testing).');
      }
      onStepChange(2);
    } catch (err: any) {
      setError(err?.message || 'Failed creating sample PDF.');
    } finally {
      setSampleLoading(false);
    }
  };

  const runAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError(null);

    if (mode === 'lock') {
      if (!password.trim()) {
        setError('Please enter a password.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please check both fields.');
        return;
      }
    }

    setLoading(true);
    setProgress('Starting...');
    try {
      if (mode === 'lock') {
        const blob = await lockPdfWithPassword(file, password, (cur, tot) => {
          setProgress(`Encrypting page ${cur} of ${tot}...`);
        });
        const filename = 'spark-locked.pdf';
        triggerDownload(blob, filename);
        setResult({
          blob,
          filename,
          summary: 'Protected PDF with your password',
        });
      } else {
        const blob = await unlockPdfWithPassword(file, password, (cur, tot) => {
          setProgress(`Unlocking page ${cur} of ${tot}...`);
        });
        const filename = 'spark-unlocked.pdf';
        triggerDownload(blob, filename);
        setResult({
          blob,
          filename,
          summary: 'Removed password protection from PDF',
        });
      }
      onStepChange(3);
    } catch (err: any) {
      setError(err?.message || 'Operation failed. Please check your password and try again.');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base text-slate-600 dark:text-slate-300">
          Add a password to lock sensitive PDFs, or unlock a password-protected PDF locally.
        </p>

        <div
          className="inline-flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 dark:border-slate-700 dark:bg-slate-800 shrink-0"
          role="tablist"
          aria-label="Lock or Unlock mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'lock'}
            onClick={() => switchMode('lock')}
            className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              mode === 'lock'
                ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Lock PDF
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'unlock'}
            onClick={() => switchMode('unlock')}
            className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              mode === 'unlock'
                ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Unlock PDF
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={resetAll}
            className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-[#E11D48] underline underline-offset-2"
          >
            Reset
          </button>
        </div>
      )}

      {result ? (
        <DownloadSuccessPanel
          blob={result.blob}
          filename={result.filename}
          summary={result.summary}
          onReset={resetAll}
        />
      ) : !file ? (
        <DropZone
          accept=".pdf,application/pdf"
          label={
            mode === 'lock'
              ? 'Drop a PDF file to lock with a password'
              : 'Drop a locked PDF file to remove its password'
          }
          hint="Passwords are processed strictly in your browser memory"
          onFilesSelected={handleFile}
          onTrySample={handleTrySample}
          sampleLoading={sampleLoading}
          disabled={loading}
        />
      ) : (
        <form onSubmit={runAction} className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#E11D48] dark:bg-rose-950/40">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-base font-semibold text-[#0F172A] dark:text-white">
                  {file.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={resetAll}
              className="min-h-[44px] rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-sm font-semibold text-[#0F172A] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              Change File
            </button>
          </div>

          {sampleHint && (
            <p className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
              {sampleHint}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="pdf-password-input"
                className="block text-base font-semibold text-[#0F172A] dark:text-white"
              >
                {mode === 'lock' ? 'Set Password' : 'Enter PDF Password'}
              </label>
              <div className="relative mt-2">
                <input
                  id="pdf-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'lock' ? 'Create a password' : 'Password to unlock'}
                  autoComplete="new-password"
                  className="min-h-[44px] w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] py-2.5 pl-4 pr-12 text-base text-[#0F172A] focus:border-[#E11D48] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 flex min-h-[40px] min-w-[40px] -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-[#0F172A] dark:text-slate-400"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {mode === 'lock' && (
              <div>
                <label
                  htmlFor="pdf-password-confirm"
                  className="block text-base font-semibold text-[#0F172A] dark:text-white"
                >
                  Confirm Password
                </label>
                <input
                  id="pdf-password-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className="mt-2 min-h-[44px] w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5 text-base text-[#0F172A] focus:border-[#E11D48] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#BE123C] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : mode === 'lock' ? (
                <Lock className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Unlock className="h-5 w-5" aria-hidden="true" />
              )}
              <span>
                {progress || (mode === 'lock' ? 'Lock & Download PDF' : 'Unlock & Download PDF')}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
