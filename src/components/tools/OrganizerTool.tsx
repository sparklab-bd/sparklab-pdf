import React, { useState } from 'react';
import { Loader2, RotateCw, Trash2, Undo2 } from 'lucide-react';
import { DropZone } from '../DropZone';
import { DownloadSuccessPanel } from '../DownloadSuccessPanel';
import {
  applyPageOrganization,
  createSamplePdfFile,
  formatFileSize,
  PageOperation,
  RenderedPageThumbnail,
  renderPdfThumbnails,
  triggerDownload,
  validateFiles,
} from '../../utils/pdfEngine';

interface OrganizerToolProps {
  onStepChange: (step: 1 | 2 | 3) => void;
}

export const OrganizerTool: React.FC<OrganizerToolProps> = ({ onStepChange }) => {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<RenderedPageThumbnail[]>([]);
  const [operations, setOperations] = useState<PageOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string; summary: string } | null>(null);

  const resetAll = () => {
    setFile(null);
    setThumbnails([]);
    setOperations([]);
    setError(null);
    setResult(null);
    onStepChange(1);
  };

  const handleFile = async (rawFiles: File[]) => {
    setError(null);
    setResult(null);
    try {
      const [valid] = validateFiles([rawFiles[0]], 'pdf');
      setLoading(true);
      const thumbs = await renderPdfThumbnails(valid, 0.4, 60);
      setFile(valid);
      setThumbnails(thumbs);
      setOperations(
        thumbs.map((t) => ({
          pageNumber: t.pageNumber,
          rotateDelta: 0,
          deleted: false,
        }))
      );
      onStepChange(2);
    } catch (err: any) {
      setError(err?.message || 'Could not load PDF pages.');
      onStepChange(1);
    } finally {
      setLoading(false);
    }
  };

  const handleTrySample = async () => {
    setSampleLoading(true);
    try {
      const sample = await createSamplePdfFile('sample-organize.pdf', 4, 'Organizer Sample');
      await handleFile([sample]);
    } catch (err: any) {
      setError(err?.message || 'Failed creating sample PDF.');
    } finally {
      setSampleLoading(false);
    }
  };

  const rotatePage = (pageNumber: number) => {
    setOperations((prev) =>
      prev.map((op) =>
        op.pageNumber === pageNumber
          ? { ...op, rotateDelta: (op.rotateDelta + 90) % 360 }
          : op
      )
    );
  };

  const toggleDelete = (pageNumber: number) => {
    setOperations((prev) =>
      prev.map((op) =>
        op.pageNumber === pageNumber ? { ...op, deleted: !op.deleted } : op
      )
    );
  };

  const activeCount = operations.filter((o) => !o.deleted).length;

  const saveOrganized = async () => {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const blob = await applyPageOrganization(file, operations);
      const filename = 'spark-organized.pdf';
      triggerDownload(blob, filename);
      const deletedCount = operations.length - activeCount;
      setResult({
        blob,
        filename,
        summary: `Saved ${activeCount} ${activeCount === 1 ? 'page' : 'pages'}${
          deletedCount > 0 ? ` (${deletedCount} removed)` : ''
        }`,
      });
      onStepChange(3);
    } catch (err: any) {
      setError(err?.message || 'Failed saving organized PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-base text-slate-600 dark:text-slate-300">
        Rotate sideways pages or delete unwanted pages with a single click.
      </p>

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
          label="Drop a PDF file to rotate or delete pages"
          hint="Visual page thumbnails load 100% locally on your device"
          onFilesSelected={handleFile}
          onTrySample={handleTrySample}
          sampleLoading={sampleLoading}
          disabled={loading}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div>
              <p className="text-base font-semibold text-[#0F172A] dark:text-white">
                {file.name}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                Keeping {activeCount} of {operations.length} pages · {formatFileSize(file.size)}
              </p>
            </div>

            <button
              type="button"
              onClick={resetAll}
              className="min-h-[44px] rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-sm font-semibold text-[#0F172A] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              Change File
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {thumbnails.map((thumb) => {
              const op = operations.find((o) => o.pageNumber === thumb.pageNumber);
              if (!op) return null;

              return (
                <div
                  key={thumb.pageNumber}
                  className={`flex flex-col rounded-2xl border p-3 transition-opacity ${
                    op.deleted
                      ? 'border-rose-200 bg-rose-50/40 opacity-60 dark:border-rose-900/50 dark:bg-rose-950/20'
                      : 'border-[#E2E8F0] bg-[#FFFFFF] dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
                    <img
                      src={thumb.dataUrl}
                      alt={`Page ${thumb.pageNumber}`}
                      style={{ transform: `rotate(${op.rotateDelta}deg)` }}
                      className="max-h-full max-w-full object-contain transition-transform duration-200"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm font-semibold text-[#0F172A] dark:text-slate-200 tabular-nums">
                    <span>Page {thumb.pageNumber}</span>
                    {op.rotateDelta !== 0 && !op.deleted && (
                      <span className="text-xs font-medium text-[#E11D48]">
                        +{op.rotateDelta}°
                      </span>
                    )}
                    {op.deleted && (
                      <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                        Removed
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={op.deleted}
                      onClick={() => rotatePage(thumb.pageNumber)}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm font-semibold text-[#0F172A] hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <RotateCw className="h-4 w-4" aria-hidden="true" />
                      <span>Rotate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleDelete(thumb.pageNumber)}
                      className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold ${
                        op.deleted
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'border-[#E2E8F0] bg-[#F8FAFC] text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400'
                      }`}
                    >
                      {op.deleted ? (
                        <>
                          <Undo2 className="h-4 w-4" aria-hidden="true" />
                          <span>Keep</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          <span>Delete</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={loading || activeCount === 0}
              onClick={saveOrganized}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#BE123C] disabled:opacity-50"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
              <span>{loading ? 'Saving PDF...' : 'Save Organized PDF'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
