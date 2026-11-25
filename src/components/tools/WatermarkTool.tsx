import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DropZone } from '../DropZone';
import { DownloadSuccessPanel } from '../DownloadSuccessPanel';
import {
  applyWatermarkAndPageNumbers,
  createSamplePdfFile,
  formatFileSize,
  getPdfPageCount,
  RenderedPageThumbnail,
  renderPdfThumbnails,
  triggerDownload,
  validateFiles,
  WatermarkOptions,
} from '../../utils/pdfEngine';

interface WatermarkToolProps {
  onStepChange: (step: 1 | 2 | 3) => void;
}

export const WatermarkTool: React.FC<WatermarkToolProps> = ({ onStepChange }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previewThumb, setPreviewThumb] = useState<RenderedPageThumbnail | null>(null);

  const [options, setOptions] = useState<WatermarkOptions>({
    watermarkText: 'CONFIDENTIAL',
    watermarkOpacity: 0.25,
    watermarkPosition: 'diagonal',
    watermarkSize: 42,
    addPageNumbers: true,
    pageNumberFormat: 'of-total',
    pageNumberPosition: 'bottom-center',
  });

  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string; summary: string } | null>(null);

  const resetAll = () => {
    setFile(null);
    setPageCount(0);
    setPreviewThumb(null);
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
      const count = await getPdfPageCount(valid);
      const [firstPage] = await renderPdfThumbnails(valid, 0.85, 1);
      setFile(valid);
      setPageCount(count);
      setPreviewThumb(firstPage || null);
      onStepChange(2);
    } catch (err: any) {
      setError(err?.message || 'Could not load PDF for preview.');
      onStepChange(1);
    } finally {
      setLoading(false);
    }
  };

  const handleTrySample = async () => {
    setSampleLoading(true);
    try {
      const sample = await createSamplePdfFile('sample-proposal.pdf', 3, 'Client Proposal');
      await handleFile([sample]);
    } catch (err: any) {
      setError(err?.message || 'Failed creating sample PDF.');
    } finally {
      setSampleLoading(false);
    }
  };

  const applyAndDownload = async () => {
    if (!file) return;
    setError(null);
    if (!options.watermarkText.trim() && !options.addPageNumbers) {
      setError('Enter watermark text or turn on page numbers before saving.');
      return;
    }

    setLoading(true);
    try {
      const blob = await applyWatermarkAndPageNumbers(file, options);
      const filename = 'spark-stamped.pdf';
      triggerDownload(blob, filename);
      setResult({
        blob,
        filename,
        summary: `Applied formatting across ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`,
      });
      onStepChange(3);
    } catch (err: any) {
      setError(err?.message || 'Failed stamping PDF.');
    } finally {
      setLoading(false);
    }
  };

  const previewPageLabel =
    options.pageNumberFormat === 'of-total' ? `Page 1 of ${Math.max(1, pageCount)}` : '1';

  return (
    <div className="space-y-6">
      <p className="text-base text-slate-600 dark:text-slate-300">
        Stamp a clean text watermark or page numbers onto every page with live preview.
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
          label="Drop a PDF file to add watermark or page numbers"
          hint="See a live preview of Page 1 before downloading"
          onFilesSelected={handleFile}
          onTrySample={handleTrySample}
          sampleLoading={sampleLoading}
          disabled={loading}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {/* Controls Column */}
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div>
                <p className="text-base font-semibold text-[#0F172A] dark:text-white">
                  {file.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                  {pageCount} pages · {formatFileSize(file.size)}
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

            <div className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div>
                <label
                  htmlFor="watermark-text"
                  className="block text-base font-semibold text-[#0F172A] dark:text-white"
                >
                  Watermark Text (optional)
                </label>
                <input
                  id="watermark-text"
                  type="text"
                  maxLength={40}
                  value={options.watermarkText}
                  onChange={(e) =>
                    setOptions((prev) => ({ ...prev, watermarkText: e.target.value }))
                  }
                  placeholder="CONFIDENTIAL"
                  className="mt-2 min-h-[44px] w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-base text-[#0F172A] focus:border-[#E11D48] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="watermark-pos"
                    className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200"
                  >
                    Placement
                  </label>
                  <select
                    id="watermark-pos"
                    value={options.watermarkPosition}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        watermarkPosition: e.target.value as WatermarkOptions['watermarkPosition'],
                      }))
                    }
                    className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="diagonal">Diagonal Center</option>
                    <option value="top">Top Banner</option>
                    <option value="bottom">Bottom Banner</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="watermark-opacity"
                    className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 tabular-nums"
                  >
                    Opacity ({Math.round(options.watermarkOpacity * 100)}%)
                  </label>
                  <input
                    id="watermark-opacity"
                    type="range"
                    min={0.1}
                    max={0.75}
                    step={0.05}
                    value={options.watermarkOpacity}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        watermarkOpacity: Number(e.target.value),
                      }))
                    }
                    className="mt-3 h-2 w-full accent-[#E11D48]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3">
                <span className="text-base font-semibold text-[#0F172A] dark:text-white">
                  Add Page Numbers
                </span>
                <input
                  type="checkbox"
                  checked={options.addPageNumbers}
                  onChange={(e) =>
                    setOptions((prev) => ({ ...prev, addPageNumbers: e.target.checked }))
                  }
                  className="h-5 w-5 accent-[#E11D48]"
                />
              </label>

              {options.addPageNumbers && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="pagenum-format"
                      className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200"
                    >
                      Format
                    </label>
                    <select
                      id="pagenum-format"
                      value={options.pageNumberFormat}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          pageNumberFormat: e.target.value as WatermarkOptions['pageNumberFormat'],
                        }))
                      }
                      className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="of-total">Page 1 of {pageCount}</option>
                      <option value="simple">1, 2, 3...</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="pagenum-pos"
                      className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200"
                    >
                      Position
                    </label>
                    <select
                      id="pagenum-pos"
                      value={options.pageNumberPosition}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          pageNumberPosition: e.target.value as WatermarkOptions['pageNumberPosition'],
                        }))
                      }
                      className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="bottom-center">Bottom Center</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="top-right">Top Right</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={applyAndDownload}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#BE123C] disabled:opacity-50"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
              <span>{loading ? 'Applying to PDF...' : 'Apply & Download PDF'}</span>
            </button>
          </div>

          {/* Live Preview Column */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Live Preview (Page 1)
            </p>
            {previewThumb && (
              <div className="relative mx-auto max-w-sm overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-xs dark:border-slate-700">
                <img
                  src={previewThumb.dataUrl}
                  alt="Page 1 live watermark preview"
                  className="block w-full select-none"
                />

                {options.watermarkText.trim() && (
                  <div
                    aria-hidden="true"
                    style={{ opacity: options.watermarkOpacity }}
                    className={`pointer-events-none absolute inset-0 flex justify-center overflow-hidden px-4 ${
                      options.watermarkPosition === 'diagonal'
                        ? 'items-center'
                        : options.watermarkPosition === 'top'
                        ? 'items-start pt-5'
                        : 'items-end pb-8'
                    }`}
                  >
                    <span
                      className={`font-bold tracking-wide text-[#E11D48] select-none text-center break-words ${
                        options.watermarkPosition === 'diagonal' ? '-rotate-45 text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                      }`}
                    >
                      {options.watermarkText.trim()}
                    </span>
                  </div>
                )}

                {options.addPageNumbers && (
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute px-3 py-1.5 text-xs font-bold text-slate-700 ${
                      options.pageNumberPosition === 'bottom-center'
                        ? 'bottom-1 left-1/2 -translate-x-1/2'
                        : options.pageNumberPosition === 'bottom-right'
                        ? 'bottom-1 right-2'
                        : 'top-1.5 right-2'
                    }`}
                  >
                    {previewPageLabel}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
