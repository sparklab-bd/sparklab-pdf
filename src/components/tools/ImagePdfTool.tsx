import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { DropZone } from '../DropZone';
import { DownloadSuccessPanel } from '../DownloadSuccessPanel';
import {
  createSampleImageFiles,
  createSamplePdfFile,
  formatFileSize,
  getPdfPageCount,
  imagesToA4Pdf,
  pdfToJpgZip,
  triggerDownload,
  validateFiles,
} from '../../utils/pdfEngine';

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
}

interface ImagePdfToolProps {
  onStepChange: (step: 1 | 2 | 3) => void;
}

export const ImagePdfTool: React.FC<ImagePdfToolProps> = ({ onStepChange }) => {
  const [mode, setMode] = useState<'img2pdf' | 'pdf2jpg'>('img2pdf');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [marginPt, setMarginPt] = useState<number>(28);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [quality, setQuality] = useState<'standard' | 'high'>('high');
  const [progress, setProgress] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string; summary: string } | null>(null);

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [images]);

  const resetAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setPdfFile(null);
    setPdfPageCount(0);
    setProgress(null);
    setError(null);
    setResult(null);
    onStepChange(1);
  };

  const switchMode = (next: 'img2pdf' | 'pdf2jpg') => {
    setMode(next);
    resetAll();
  };

  const handleImageFiles = (rawFiles: File[]) => {
    setError(null);
    setResult(null);
    try {
      const valid = validateFiles(rawFiles, 'image');
      const items: ImageItem[] = valid.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setImages((prev) => {
        const next = [...prev, ...items];
        onStepChange(next.length > 0 ? 2 : 1);
        return next;
      });
    } catch (err: any) {
      setError(err?.message || 'Could not load selected images.');
    }
  };

  const handlePdfFile = async (rawFiles: File[]) => {
    setError(null);
    setResult(null);
    try {
      const [file] = validateFiles([rawFiles[0]], 'pdf');
      setLoading(true);
      const count = await getPdfPageCount(file);
      setPdfFile(file);
      setPdfPageCount(count);
      onStepChange(2);
    } catch (err: any) {
      setError(err?.message || 'Could not read PDF file.');
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
      if (mode === 'img2pdf') {
        const sampleImgs = await createSampleImageFiles();
        handleImageFiles(sampleImgs);
      } else {
        const samplePdf = await createSamplePdfFile('sample-slides.pdf', 3, 'Slide Deck');
        await handlePdfFile([samplePdf]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed creating sample.');
    } finally {
      setSampleLoading(false);
    }
  };

  const moveImage = (index: number, delta: -1 | 1) => {
    setImages((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const removed = prev.find((i) => i.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      const next = prev.filter((i) => i.id !== id);
      if (next.length === 0) onStepChange(1);
      return next;
    });
  };

  const runImgToPdf = async () => {
    setError(null);
    if (images.length === 0) return;
    setLoading(true);
    try {
      const blob = await imagesToA4Pdf(
        images.map((i) => i.file),
        marginPt
      );
      const filename = 'spark-images-a4.pdf';
      triggerDownload(blob, filename);
      setResult({
        blob,
        filename,
        summary: `Converted ${images.length} ${images.length === 1 ? 'image' : 'images'} to A4 PDF`,
      });
      onStepChange(3);
    } catch (err: any) {
      setError(err?.message || 'Failed converting images to PDF.');
    } finally {
      setLoading(false);
    }
  };

  const runPdfToJpg = async () => {
    setError(null);
    if (!pdfFile) return;
    setLoading(true);
    setProgress('Starting...');
    try {
      const { blob, pageCount } = await pdfToJpgZip(pdfFile, quality, (cur, tot) => {
        setProgress(`Rendering page ${cur} of ${tot}...`);
      });
      const filename = 'spark-pages-jpg.zip';
      triggerDownload(blob, filename);
      setResult({
        blob,
        filename,
        summary: `Saved ${pageCount} JPG ${pageCount === 1 ? 'image' : 'images'} in a ZIP archive`,
      });
      onStepChange(3);
    } catch (err: any) {
      setError(err?.message || 'Failed converting PDF pages to JPG.');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base text-slate-600 dark:text-slate-300">
          Turn photos into a clean A4 PDF, or export all PDF pages as JPG images in a ZIP.
        </p>

        <div
          className="inline-flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 dark:border-slate-700 dark:bg-slate-800 shrink-0"
          role="tablist"
          aria-label="Image conversion mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'img2pdf'}
            onClick={() => switchMode('img2pdf')}
            className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              mode === 'img2pdf'
                ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Image to PDF
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'pdf2jpg'}
            onClick={() => switchMode('pdf2jpg')}
            className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              mode === 'pdf2jpg'
                ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            PDF to JPG (ZIP)
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
      ) : mode === 'img2pdf' ? (
        images.length === 0 ? (
          <DropZone
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            multiple
            label="Drop JPG, PNG, or WebP photos here"
            hint="Each photo is centered neatly on an A4 page • Up to 30MB each"
            onFilesSelected={handleImageFiles}
            onTrySample={handleTrySample}
            sampleLoading={sampleLoading}
            disabled={loading}
          />
        ) : (
          <div className="space-y-4">
            <ul className="divide-y divide-[#E2E8F0] rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/50">
              {images.map((item, idx) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="h-14 w-14 shrink-0 rounded-xl border border-[#E2E8F0] object-cover bg-white dark:border-slate-700"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[#0F172A] dark:text-white">
                        {item.file.name}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                        Page {idx + 1} · {formatFileSize(item.file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveImage(idx, -1)}
                      aria-label={`Move ${item.file.name} up`}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === images.length - 1}
                      onClick={() => moveImage(idx, 1)}
                      aria-label={`Move ${item.file.name} down`}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(item.id)}
                      aria-label={`Remove ${item.file.name}`}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-rose-600 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5 text-base font-semibold text-[#0F172A] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <Plus className="h-4 w-4 text-[#E11D48]" aria-hidden="true" />
                  <span>Add Photos</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      if (e.target.files?.length) handleImageFiles(Array.from(e.target.files));
                      e.target.value = '';
                    }}
                  />
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    A4 Margin:
                  </span>
                  <select
                    value={marginPt}
                    onChange={(e) => setMarginPt(Number(e.target.value))}
                    aria-label="A4 Margin"
                    className="min-h-[44px] rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-sm font-medium text-[#0F172A] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value={28}>Standard Margin</option>
                    <option value={0}>Edge-to-Edge</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={runImgToPdf}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#BE123C] disabled:opacity-50"
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
                <span>{loading ? 'Creating A4 PDF...' : 'Convert to A4 PDF'}</span>
              </button>
            </div>
          </div>
        )
      ) : !pdfFile ? (
        <DropZone
          accept=".pdf,application/pdf"
          label="Drop a PDF file to export as JPG images"
          hint="All pages are packaged into a single easy ZIP download"
          onFilesSelected={handlePdfFile}
          onTrySample={handleTrySample}
          sampleLoading={sampleLoading}
          disabled={loading}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#E11D48] dark:bg-rose-950/40">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-base font-semibold text-[#0F172A] dark:text-white">
                  {pdfFile.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                  {pdfPageCount} {pdfPageCount === 1 ? 'page' : 'pages'} ·{' '}
                  {formatFileSize(pdfFile.size)}
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

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-base font-medium text-[#0F172A] dark:text-slate-200">
                JPG Quality:
              </span>
              <div className="inline-flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setQuality('standard')}
                  className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold ${
                    quality === 'standard'
                      ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setQuality('high')}
                  className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold ${
                    quality === 'high'
                      ? 'bg-[#FFFFFF] text-[#0F172A] shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  High Detail
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={runPdfToJpg}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#E11D48] px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#BE123C] disabled:opacity-50"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
              <span>{progress || 'Convert to JPG ZIP'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
