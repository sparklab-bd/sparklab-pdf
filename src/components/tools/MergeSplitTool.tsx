import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Check, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { DropZone } from '../DropZone';
import { DownloadSuccessPanel } from '../DownloadSuccessPanel';
import {
  createSamplePdfFile,
  formatFileSize,
  getPdfPageCount,
  mergePdfFiles,
  parsePageRange,
  RenderedPageThumbnail,
  renderPdfThumbnails,
  splitPdfFile,
  triggerDownload,
  validateFiles,
} from '../../utils/pdfEngine';

interface MergeItem {
  id: string;
  file: File;
  pageCount: number;
}

interface MergeSplitToolProps {
  onStepChange: (step: 1 | 2 | 3) => void;
}

export const MergeSplitTool: React.FC<MergeSplitToolProps> = ({ onStepChange }) => {
  const [mode, setMode] = useState<'merge' | 'split'>('merge');
  const [mergeItems, setMergeItems] = useState<MergeItem[]>([]);
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitThumbnails, setSplitThumbnails] = useState<RenderedPageThumbnail[]>([]);
  const [splitPageCount, setSplitPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [rangeInput, setRangeInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string; summary: string } | null>(null);

  const resetAll = () => {
    setMergeItems([]);
    setSplitFile(null);
    setSplitThumbnails([]);
    setSplitPageCount(0);
    setSelectedPages([]);
    setRangeInput('');
    setError(null);
    setResult(null);
    onStepChange(1);
  };

  const switchMode = (nextMode: 'merge' | 'split') => {
    setMode(nextMode);
    resetAll();
  };

  const handleMergeFiles = async (rawFiles: File[]) => {
    setError(null);
    setResult(null);
    try {
      const valid = validateFiles(rawFiles, 'pdf');
      setLoading(true);
      const nextItems: MergeItem[] = [];
      for (const file of valid) {
        const count = await getPdfPageCount(file);
        nextItems.push({
          id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          pageCount: count,
        });
      }
      setMergeItems((prev) => {
        const updated = [...prev, ...nextItems];
        onStepChange(updated.length > 0 ? 2 : 1);
        return updated;
      });
    } catch (err: any) {
      setError(err?.message || 'Could not load selected PDF files.');
    } finally {
      setLoading(false);
    }
  };

  const handleSplitFile = async (rawFiles: File[]) => {
    setError(null);
    setResult(null);
    try {
      const [file] = validateFiles([rawFiles[0]], 'pdf');
      setLoading(true);
      const count = await getPdfPageCount(file);
      const thumbs = await renderPdfThumbnails(file, 0.35, 48);
      setSplitFile(file);
      setSplitPageCount(count);
      setSplitThumbnails(thumbs);
      const defaultSelected = count > 1 ? [1] : [1];
      setSelectedPages(defaultSelected);
      setRangeInput('1');
      onStepChange(2);
    } catch (err: any) {
      setError(err?.message || 'Could not read PDF pages.');
      setSplitFile(null);
      onStepChange(1);
    } finally {
      setLoading(false);
    }
  };

  const handleTrySample = async () => {
    setError(null);
    setResult(null);
    setSampleLoading(true);
    try {
      if (mode === 'merge') {
        const s1 = await createSamplePdfFile('sample-part-1.pdf', 2, 'Part 1');
        const s2 = await createSamplePdfFile('sample-part-2.pdf', 2, 'Part 2');
        await handleMergeFiles([s1, s2]);
      } else {
        const sample = await createSamplePdfFile('sample-4-pages.pdf', 4, 'Sample Booklet');
        await handleSplitFile([sample]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to generate sample PDF.');
    } finally {
      setSampleLoading(false);
    }
  };

  const moveMergeItem = (index: number, delta: -1 | 1) => {
    setMergeItems((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const removeMergeItem = (id: string) => {
    setMergeItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (next.length === 0) onStepChange(1);
      return next;
    });
  };

  const toggleSplitPage = (pageNum: number) => {
    setSelectedPages((prev) => {
      const exists = prev.includes(pageNum);
      const next = exists
        ? prev.filter((p) => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b);
      setRangeInput(next.join(', '));
      return next;
    });
  };

  const handleRangeChange = (val: string) => {
    setRangeInput(val);
    if (!splitPageCount || !val.trim()) {
      setSelectedPages([]);
      return;
    }
    try {
      const parsed = parsePageRange(val, splitPageCount);
      setSelectedPages(parsed);
      setError(null);
    } catch {
      // Allow typing intermediate characters like "1-"
    }
  };

  const runMerge = async () => {
    setError(null);
    if (mergeItems.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      return;
    }
    setLoading(true);
    try {
      const blob = await mergePdfFiles(mergeItems.map((m) => m.file));
      const totalPages = mergeItems.reduce((acc, m) => acc + m.pageCount, 0);
      const filename = 'spark-merged.pdf';
      triggerDownload(blob, filename);
      setResult({
        blob,
        filename,
        summary: `Combined ${mergeItems.length} PDFs (${totalPages} pages)`,
      });
      onStepChange(3);
    } catch (err: any) {
      setError(err?.message || 'Merge failed. Resetting safely.');
    } finally {
      setLoading(false);
    }
  };

  const runSplit = async () => {
    setError(null);
    if (!splitFile) return;
    setLoading(true);
    try {
      const pages = rangeInput.trim()
        ? parsePageRange(rangeInput, splitPageCount)
        : selectedPages;
      if (pages.length === 0) {
        throw new Error('Select at least 1 page to extract.');
      }
      const blob = await splitPdfFile(splitFile, pages);
      const filename = 'spark-split.pdf';
      triggerDownload(blob, filename);
      setResult({
        blob,
        filename,
        summary: `Extracted ${pages.length} of ${splitPageCount} pages`,
      });
      onStepChange(3);
    } catch (err: any) {
      setError(err?.message || 'Could not extract pages.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base text-slate-600 dark:text-slate-300">
          Combine multiple PDFs into one file, or pick specific pages to extract.
        </p>

        <div
          className="inline-flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 dark:border-slate-700 dark:bg-slate-800 shrink-0"
          role="tablist"
          aria-label="Merge or Split mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'merge'}
            onClick={() => switchMode('merge')}
            className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              mode === 'merge'
                ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Merge PDFs
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'split'}
            onClick={() => switchMode('split')}
            className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              mode === 'split'
                ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Split / Extract
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
      ) : mode === 'merge' ? (
        mergeItems.length === 0 ? (
          <DropZone
            accept=".pdf,application/pdf"
            multiple
            label="Drop 2 or more PDF files here"
            hint="Up to 30MB per file • Reorder anytime before merging"
            onFilesSelected={handleMergeFiles}
            onTrySample={handleTrySample}
            sampleLoading={sampleLoading}
            disabled={loading}
          />
        ) : (
          <div className="space-y-4">
            <ul className="divide-y divide-[#E2E8F0] rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/50">
              {mergeItems.map((item, idx) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#E11D48] dark:bg-rose-950/40 dark:text-rose-400">
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[#0F172A] dark:text-white">
                        {item.file.name}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                        {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'} ·{' '}
                        {formatFileSize(item.file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveMergeItem(idx, -1)}
                      aria-label={`Move ${item.file.name} up`}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === mergeItems.length - 1}
                      onClick={() => moveMergeItem(idx, 1)}
                      aria-label={`Move ${item.file.name} down`}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMergeItem(item.id)}
                      aria-label={`Remove ${item.file.name}`}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5 text-base font-semibold text-[#0F172A] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                <Plus className="h-4 w-4 text-[#E11D48]" aria-hidden="true" />
                <span>Add More PDFs</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files?.length) handleMergeFiles(Array.from(e.target.files));
                    e.target.value = '';
                  }}
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={resetAll}
                  className="min-h-[44px] rounded-xl px-4 py-2.5 text-base font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={loading || mergeItems.length < 2}
                  onClick={runMerge}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#BE123C] disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
                  <span>{loading ? 'Merging PDFs...' : `Merge ${mergeItems.length} PDFs`}</span>
                </button>
              </div>
            </div>
          </div>
        )
      ) : !splitFile ? (
        <DropZone
          accept=".pdf,application/pdf"
          label="Drop a PDF file to extract pages"
          hint="Up to 30MB • Pick pages visually or type a page range"
          onFilesSelected={handleSplitFile}
          onTrySample={handleTrySample}
          sampleLoading={sampleLoading}
          disabled={loading}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div>
              <p className="text-base font-semibold text-[#0F172A] dark:text-white">
                {splitFile.name}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                {splitPageCount} total pages · {formatFileSize(splitFile.size)}
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

          <div>
            <label
              htmlFor="split-range-input"
              className="block text-base font-semibold text-[#0F172A] dark:text-white"
            >
              Pages to Extract (tap pages below or type e.g. 1-3, 5)
            </label>
            <input
              id="split-range-input"
              type="text"
              value={rangeInput}
              onChange={(e) => handleRangeChange(e.target.value)}
              placeholder="1-3, 5"
              className="mt-2 min-h-[44px] w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5 text-base text-[#0F172A] focus:border-[#E11D48] focus:outline-none focus:ring-2 focus:ring-[#E11D48]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {splitThumbnails.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {splitThumbnails.map((thumb) => {
                const isSelected = selectedPages.includes(thumb.pageNumber);
                return (
                  <button
                    key={thumb.pageNumber}
                    type="button"
                    onClick={() => toggleSplitPage(thumb.pageNumber)}
                    className={`group relative flex flex-col items-center rounded-xl border p-2 text-left transition-colors ${
                      isSelected
                        ? 'border-[#E11D48] bg-rose-50/60 ring-2 ring-[#E11D48]/30 dark:bg-rose-950/30'
                        : 'border-[#E2E8F0] bg-[#FFFFFF] hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <img
                      src={thumb.dataUrl}
                      alt={`Page ${thumb.pageNumber}`}
                      className="aspect-[3/4] w-full rounded-lg border border-slate-200 object-contain bg-white dark:border-slate-700"
                    />
                    <div className="mt-2 flex w-full items-center justify-between px-1">
                      <span className="text-sm font-semibold text-[#0F172A] dark:text-slate-200 tabular-nums">
                        Page {thumb.pageNumber}
                      </span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full ${
                          isSelected
                            ? 'bg-[#E11D48] text-white'
                            : 'border border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={loading || selectedPages.length === 0}
              onClick={runSplit}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#BE123C] disabled:opacity-50"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
              <span>
                {loading
                  ? 'Extracting Pages...'
                  : `Extract ${selectedPages.length} ${selectedPages.length === 1 ? 'Page' : 'Pages'}`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
