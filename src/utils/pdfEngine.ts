export const ENABLE_PRO_LOCK = false;
export const MAX_FILE_SIZE_MB = 30;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

async function waitForGlobal<T>(getter: () => T | undefined, name: string): Promise<T> {
  const existing = getter();
  if (existing) return existing;

  for (let i = 0; i < 40; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const found = getter();
    if (found) return found;
  }

  throw new Error(
    `${name} could not be loaded. If you are offline for the first time, reconnect briefly to cache the tools.`
  );
}

export async function getPDFLib() {
  return waitForGlobal(() => window.PDFLib, 'PDF engine (pdf-lib)');
}

export async function getPDFJs() {
  const pdfjsLib = await waitForGlobal(() => window.pdfjsLib, 'PDF renderer (pdf.js)');
  return pdfjsLib;
}

export async function getJSZip() {
  return waitForGlobal(() => window.JSZip, 'ZIP packer (JSZip)');
}

export async function getJsPDF() {
  const jspdf = await waitForGlobal(() => window.jspdf, 'PDF security engine (jsPDF)');
  return jspdf.jsPDF;
}

export function validateFiles(files: File[], allowedTypes: 'pdf' | 'image'): File[] {
  if (!files.length) {
    throw new Error('Please select at least one file.');
  }

  let totalBytes = 0;
  for (const file of files) {
    if (file.size === 0) {
      throw new Error(`"${file.name}" appears to be empty.`);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `"${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB safety limit so your device stays fast and never crashes.`
      );
    }
    totalBytes += file.size;

    const lower = file.name.toLowerCase();
    if (allowedTypes === 'pdf') {
      if (file.type !== 'application/pdf' && !lower.endsWith('.pdf')) {
        throw new Error(`"${file.name}" is not a PDF file. Please choose a .pdf file.`);
      }
    } else {
      const validImage =
        file.type === 'image/jpeg' ||
        file.type === 'image/png' ||
        file.type === 'image/webp' ||
        /\.(jpe?g|png|webp)$/i.test(lower);
      if (!validImage) {
        throw new Error(`"${file.name}" is not a supported image. Use JPG, PNG, or WebP.`);
      }
    }
  }

  if (totalBytes > MAX_FILE_SIZE_BYTES * 2) {
    throw new Error(
      `Combined files exceed ${MAX_FILE_SIZE_MB * 2}MB. Please process smaller batches to keep mobile memory safe.`
    );
  }

  return files;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
}

export async function loadPdfDocument(bytes: Uint8Array, password?: string) {
  const pdfjsLib = await getPDFJs();
  const loadingTask = pdfjsLib.getDocument({
    data: bytes.slice(),
    password: password || undefined,
    disableAutoFetch: true,
    disableStream: true,
  });
  return loadingTask.promise;
}

export async function getPdfPageCount(file: File): Promise<number> {
  const PDFLib = await getPDFLib();
  const buffer = await file.arrayBuffer();
  try {
    const doc = await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    const pdfDoc = await loadPdfDocument(new Uint8Array(buffer));
    const count = pdfDoc.numPages;
    await pdfDoc.destroy();
    return count;
  }
}

export interface RenderedPageThumbnail {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

export async function renderPdfThumbnails(
  file: File,
  scale = 0.45,
  maxPages = 60
): Promise<RenderedPageThumbnail[]> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await loadPdfDocument(new Uint8Array(buffer));
  const total = Math.min(pdfDoc.numPages, maxPages);
  const thumbnails: RenderedPageThumbnail[] = [];

  try {
    for (let i = 1; i <= total; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      thumbnails.push({
        pageNumber: i,
        dataUrl: canvas.toDataURL('image/jpeg', 0.8),
        width: canvas.width,
        height: canvas.height,
      });
    }
  } finally {
    await pdfDoc.destroy();
  }

  return thumbnails;
}

export function parsePageRange(input: string, maxPage: number): number[] {
  const cleaned = input.trim();
  if (!cleaned) {
    throw new Error('Please select at least one page or enter a page range like 1-3, 5.');
  }

  const selected = new Set<number>();
  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startRaw, endRaw] = part.split('-').map((n) => parseInt(n.trim(), 10));
      if (isNaN(startRaw) || isNaN(endRaw)) {
        throw new Error(`Invalid page range "${part}". Use numbers like 1-3.`);
      }
      const start = Math.max(1, Math.min(startRaw, endRaw));
      const end = Math.min(maxPage, Math.max(startRaw, endRaw));
      if (start > maxPage) {
        throw new Error(`Page ${start} does not exist. This PDF has ${maxPage} pages.`);
      }
      for (let p = start; p <= end; p++) selected.add(p);
    } else {
      const page = parseInt(part, 10);
      if (isNaN(page) || page < 1 || page > maxPage) {
        throw new Error(`Page "${part}" is out of range (1–${maxPage}).`);
      }
      selected.add(page);
    }
  }

  const result = Array.from(selected).sort((a, b) => a - b);
  if (result.length === 0) {
    throw new Error('No valid pages matched that range.');
  }
  return result;
}

// Tool 1A: Merge PDFs
export async function mergePdfFiles(files: File[]): Promise<Blob> {
  const PDFLib = await getPDFLib();
  const mergedPdf = await PDFLib.PDFDocument.create();

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    let srcPdf;
    try {
      srcPdf = await PDFLib.PDFDocument.load(buffer);
    } catch {
      throw new Error(
        `"${file.name}" is encrypted or unreadable. Unlock it first with the Password Unlock tool.`
      );
    }
    const indices = srcPdf.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(srcPdf, indices);
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  const outBytes = await mergedPdf.save();
  return new Blob([outBytes], { type: 'application/pdf' });
}

// Tool 1B: Split / Extract Pages
export async function splitPdfFile(file: File, pageNumbers: number[]): Promise<Blob> {
  const PDFLib = await getPDFLib();
  const buffer = await file.arrayBuffer();
  let srcPdf;
  try {
    srcPdf = await PDFLib.PDFDocument.load(buffer);
  } catch {
    throw new Error(
      `"${file.name}" appears password-protected. Please unlock it first with Tool 5.`
    );
  }

  const outPdf = await PDFLib.PDFDocument.create();
  const indices = pageNumbers.map((p) => p - 1);
  const copiedPages = await outPdf.copyPages(srcPdf, indices);
  for (const page of copiedPages) {
    outPdf.addPage(page);
  }

  const outBytes = await outPdf.save();
  return new Blob([outBytes], { type: 'application/pdf' });
}

// Tool 2A: Images to A4 PDF
async function imageFileToPngOrJpgBytes(
  file: File
): Promise<{ bytes: ArrayBuffer; format: 'jpg' | 'png' }> {
  if (file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)) {
    return { bytes: await file.arrayBuffer(), format: 'jpg' };
  }
  if (file.type === 'image/png' || /\.png$/i.test(file.name)) {
    return { bytes: await file.arrayBuffer(), format: 'png' };
  }

  // Convert WebP or other browser-decodable image via canvas to PNG
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Could not decode image "${file.name}".`));
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable on this device.');
    ctx.drawImage(img, 0, 0);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image conversion failed.'))), 'image/png');
    });
    return { bytes: await pngBlob.arrayBuffer(), format: 'png' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function imagesToA4Pdf(files: File[], marginPt = 28): Promise<Blob> {
  const PDFLib = await getPDFLib();
  const pdfDoc = await PDFLib.PDFDocument.create();
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;

  for (const file of files) {
    const { bytes, format } = await imageFileToPngOrJpgBytes(file);
    const embedded =
      format === 'jpg' ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes);

    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const maxW = A4_WIDTH - marginPt * 2;
    const maxH = A4_HEIGHT - marginPt * 2;
    const scale = Math.min(maxW / embedded.width, maxH / embedded.height);
    const drawW = embedded.width * scale;
    const drawH = embedded.height * scale;
    const x = (A4_WIDTH - drawW) / 2;
    const y = (A4_HEIGHT - drawH) / 2;

    page.drawImage(embedded, { x, y, width: drawW, height: drawH });
  }

  const outBytes = await pdfDoc.save();
  return new Blob([outBytes], { type: 'application/pdf' });
}

// Tool 2B: PDF to JPG ZIP
export async function pdfToJpgZip(
  file: File,
  quality: 'standard' | 'high',
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; pageCount: number }> {
  const JSZip = await getJSZip();
  const buffer = await file.arrayBuffer();
  const pdfDoc = await loadPdfDocument(new Uint8Array(buffer));
  const zip = new JSZip();
  const scale = quality === 'high' ? 2.2 : 1.5;
  const jpegQuality = quality === 'high' ? 0.92 : 0.85;
  const baseName = file.name.replace(/\.pdf$/i, '') || 'document';
  const total = pdfDoc.numPages;

  try {
    for (let i = 1; i <= total; i++) {
      onProgress?.(i, total);
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to create image canvas.');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

      const jpgBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error(`Failed rendering page ${i}.`))),
          'image/jpeg',
          jpegQuality
        );
      });
      const padded = String(i).padStart(String(total).length, '0');
      zip.file(`${baseName}-page-${padded}.jpg`, jpgBlob);
    }
  } finally {
    await pdfDoc.destroy();
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { blob: zipBlob, pageCount: total };
}

// Tool 3: Organize Pages (Rotate & Delete)
export interface PageOperation {
  pageNumber: number; // 1-indexed original page
  rotateDelta: number; // 0, 90, 180, 270
  deleted: boolean;
}

export async function applyPageOrganization(
  file: File,
  operations: PageOperation[]
): Promise<Blob> {
  const PDFLib = await getPDFLib();
  const activeOps = operations.filter((op) => !op.deleted);
  if (activeOps.length === 0) {
    throw new Error('You must keep at least 1 page to save the PDF.');
  }

  const buffer = await file.arrayBuffer();
  let srcPdf;
  try {
    srcPdf = await PDFLib.PDFDocument.load(buffer);
  } catch {
    throw new Error('This PDF is encrypted. Unlock it first with the Password tool.');
  }

  const outPdf = await PDFLib.PDFDocument.create();
  const copiedPages = await outPdf.copyPages(
    srcPdf,
    activeOps.map((op) => op.pageNumber - 1)
  );

  copiedPages.forEach((page: any, idx: number) => {
    const delta = activeOps[idx].rotateDelta;
    if (delta !== 0) {
      const currentAngle = page.getRotation().angle || 0;
      page.setRotation(PDFLib.degrees((currentAngle + delta) % 360));
    }
    outPdf.addPage(page);
  });

  const outBytes = await outPdf.save();
  return new Blob([outBytes], { type: 'application/pdf' });
}

// Tool 4: Watermark & Page Numbers
export interface WatermarkOptions {
  watermarkText: string;
  watermarkOpacity: number; // 0.1 to 0.8
  watermarkPosition: 'diagonal' | 'top' | 'bottom';
  watermarkSize: number; // 24 to 72
  addPageNumbers: boolean;
  pageNumberFormat: 'simple' | 'of-total';
  pageNumberPosition: 'bottom-center' | 'bottom-right' | 'top-right';
}

export async function applyWatermarkAndPageNumbers(
  file: File,
  opts: WatermarkOptions
): Promise<Blob> {
  const PDFLib = await getPDFLib();
  const buffer = await file.arrayBuffer();
  let pdfDoc;
  try {
    pdfDoc = await PDFLib.PDFDocument.load(buffer);
  } catch {
    throw new Error('This PDF is encrypted. Please unlock it first with Tool 5.');
  }

  const font = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const total = pages.length;
  const cleanText = opts.watermarkText.trim();

  pages.forEach((page: any, index: number) => {
    const { width, height } = page.getSize();

    if (cleanText) {
      const textWidth = font.widthOfTextAtSize(cleanText, opts.watermarkSize);
      const color = PDFLib.rgb(0.88, 0.11, 0.28);

      if (opts.watermarkPosition === 'diagonal') {
        const angleRad = Math.PI / 4;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const x = width / 2 - (textWidth / 2) * cos;
        const y = height / 2 - (textWidth / 2) * sin;
        page.drawText(cleanText, {
          x,
          y,
          size: opts.watermarkSize,
          font,
          color,
          opacity: opts.watermarkOpacity,
          rotate: PDFLib.degrees(45),
        });
      } else if (opts.watermarkPosition === 'top') {
        page.drawText(cleanText, {
          x: Math.max(24, (width - textWidth) / 2),
          y: height - opts.watermarkSize - 28,
          size: opts.watermarkSize,
          font,
          color,
          opacity: opts.watermarkOpacity,
        });
      } else {
        page.drawText(cleanText, {
          x: Math.max(24, (width - textWidth) / 2),
          y: 36,
          size: opts.watermarkSize,
          font,
          color,
          opacity: opts.watermarkOpacity,
        });
      }
    }

    if (opts.addPageNumbers) {
      const label =
        opts.pageNumberFormat === 'of-total'
          ? `Page ${index + 1} of ${total}`
          : `${index + 1}`;
      const numSize = 11;
      const labelW = font.widthOfTextAtSize(label, numSize);
      let x = (width - labelW) / 2;
      let y = 20;

      if (opts.pageNumberPosition === 'bottom-right') {
        x = width - labelW - 28;
        y = 20;
      } else if (opts.pageNumberPosition === 'top-right') {
        x = width - labelW - 28;
        y = height - 28;
      }

      page.drawText(label, {
        x,
        y,
        size: numSize,
        font,
        color: PDFLib.rgb(0.2, 0.25, 0.33),
        opacity: 0.9,
      });
    }
  });

  const outBytes = await pdfDoc.save();
  return new Blob([outBytes], { type: 'application/pdf' });
}

// Tool 5A: Lock PDF with Password
export async function lockPdfWithPassword(
  file: File,
  password: string,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  if (!password || password.length < 1) {
    throw new Error('Please enter a password to lock this PDF.');
  }

  const JsPDF = await getJsPDF();
  const buffer = await file.arrayBuffer();
  let pdfDoc;
  try {
    pdfDoc = await loadPdfDocument(new Uint8Array(buffer));
  } catch (err: any) {
    if (err?.name === 'PasswordException') {
      throw new Error('This PDF already has a password. Unlock it first before setting a new password.');
    }
    throw new Error('Could not read this PDF file. Please verify it is not corrupted.');
  }

  const total = pdfDoc.numPages;
  let doc: any = null;

  try {
    for (let i = 1; i <= total; i++) {
      onProgress?.(i, total);
      const page = await pdfDoc.getPage(i);
      const unscaled = page.getViewport({ scale: 1 });
      const ptWidth = unscaled.width * 0.75;
      const ptHeight = unscaled.height * 0.75;
      const orientation = ptWidth > ptHeight ? 'landscape' : 'portrait';

      const renderViewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(renderViewport.width));
      canvas.height = Math.max(1, Math.floor(renderViewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to initialize canvas.');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

      const imgData = canvas.toDataURL('image/jpeg', 0.9);

      if (i === 1) {
        doc = new JsPDF({
          orientation,
          unit: 'pt',
          format: [ptWidth, ptHeight],
          compress: true,
          encryption: {
            userPassword: password,
            ownerPassword: password,
            userPermissions: ['print', 'modify', 'copy', 'annot-forms'],
          },
        });
      } else {
        doc.addPage([ptWidth, ptHeight], orientation);
      }

      doc.addImage(imgData, 'JPEG', 0, 0, ptWidth, ptHeight, undefined, 'FAST');
    }
  } finally {
    await pdfDoc.destroy();
  }

  if (!doc) {
    throw new Error('PDF contains no pages.');
  }

  return doc.output('blob');
}

// Tool 5B: Unlock Password-Protected PDF
export async function unlockPdfWithPassword(
  file: File,
  password: string,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const PDFLib = await getPDFLib();
  const buffer = await file.arrayBuffer();

  // First try direct pdf-lib load if only owner-restricted (no open password needed)
  if (!password) {
    try {
      const testDoc = await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: false });
      const cleanBytes = await testDoc.save();
      return new Blob([cleanBytes], { type: 'application/pdf' });
    } catch {
      // Needs user password via pdf.js
    }
  }

  let pdfDoc;
  try {
    pdfDoc = await loadPdfDocument(new Uint8Array(buffer), password);
  } catch (err: any) {
    if (err?.name === 'PasswordException') {
      throw new Error(
        password
          ? 'Incorrect password. Please double-check and try again.'
          : 'This PDF requires an open password. Enter the password above.'
      );
    }
    throw new Error('Could not open this PDF. It may be damaged or use an unsupported format.');
  }

  const outPdf = await PDFLib.PDFDocument.create();
  const total = pdfDoc.numPages;

  try {
    for (let i = 1; i <= total; i++) {
      onProgress?.(i, total);
      const page = await pdfDoc.getPage(i);
      const unscaled = page.getViewport({ scale: 1 });
      const ptWidth = unscaled.width * 0.75;
      const ptHeight = unscaled.height * 0.75;

      const renderViewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(renderViewport.width));
      canvas.height = Math.max(1, Math.floor(renderViewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to initialize canvas.');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

      const jpgBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error(`Failed unlocking page ${i}.`))),
          'image/jpeg',
          0.92
        );
      });
      const jpgBytes = await jpgBlob.arrayBuffer();
      const embedded = await outPdf.embedJpg(jpgBytes);
      const outPage = outPdf.addPage([ptWidth, ptHeight]);
      outPage.drawImage(embedded, { x: 0, y: 0, width: ptWidth, height: ptHeight });
    }
  } finally {
    await pdfDoc.destroy();
  }

  const outBytes = await outPdf.save();
  return new Blob([outBytes], { type: 'application/pdf' });
}

// Instant "Try Sample" Generators (100% client-side, zero network)
export async function createSamplePdfFile(
  filename = 'sample-report.pdf',
  pagesCount = 3,
  titlePrefix = 'Spark PDF Sample'
): Promise<File> {
  const PDFLib = await getPDFLib();
  const doc = await PDFLib.PDFDocument.create();
  const fontBold = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(PDFLib.StandardFonts.Helvetica);

  for (let i = 1; i <= pagesCount; i++) {
    const page = doc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    // Clean top bar accent
    page.drawRectangle({
      x: 48,
      y: height - 92,
      width: width - 96,
      height: 44,
      color: PDFLib.rgb(0.88, 0.11, 0.28),
    });

    page.drawText(`${titlePrefix} — Page ${i} of ${pagesCount}`, {
      x: 64,
      y: height - 76,
      size: 16,
      font: fontBold,
      color: PDFLib.rgb(1, 1, 1),
    });

    page.drawText('100% Private Local Document', {
      x: 48,
      y: height - 140,
      size: 22,
      font: fontBold,
      color: PDFLib.rgb(0.06, 0.09, 0.16),
    });

    const lines = [
      'This sample document was generated directly inside your browser.',
      'No files ever leave your device or touch a remote server.',
      `Section ${i}.1 — Merge, split, rotate, watermark, or protect pages instantly.`,
      `Section ${i}.2 — Test offline support in Airplane Mode anytime.`,
    ];

    lines.forEach((line, idx) => {
      page.drawText(line, {
        x: 48,
        y: height - 184 - idx * 28,
        size: 13,
        font: fontRegular,
        color: PDFLib.rgb(0.28, 0.33, 0.41),
      });
    });

    page.drawRectangle({
      x: 48,
      y: 120,
      width: width - 96,
      height: 360,
      borderColor: PDFLib.rgb(0.88, 0.91, 0.94),
      borderWidth: 1.5,
      color: PDFLib.rgb(0.97, 0.98, 0.99),
    });

    page.drawText(`Sample Card Content • Page ${i}`, {
      x: 170,
      y: 295,
      size: 18,
      font: fontBold,
      color: PDFLib.rgb(0.39, 0.45, 0.55),
    });
  }

  const bytes = await doc.save();
  return new File([bytes], filename, { type: 'application/pdf' });
}

export async function createSampleLockedPdfFile(password: string): Promise<File> {
  const plainSample = await createSamplePdfFile('sample-unlocked.pdf', 2, 'Protected Sample');
  const lockedBlob = await lockPdfWithPassword(plainSample, password);
  return new File([lockedBlob], 'sample-locked.pdf', { type: 'application/pdf' });
}

export async function createSampleImageFiles(): Promise<File[]> {
  const specs = [
    { name: 'sample-photo-1.png', bg: '#FFF1F2', accent: '#E11D48', title: 'Sample Photo 1' },
    { name: 'sample-photo-2.png', bg: '#F1F5F9', accent: '#0F172A', title: 'Sample Photo 2' },
  ];

  const files: File[] = [];
  for (const spec of specs) {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.fillStyle = spec.bg;
    ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = spec.accent;
    ctx.fillRect(60, 60, 680, 120);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText(spec.title, 96, 134);
    ctx.fillStyle = '#334155';
    ctx.font = '24px sans-serif';
    ctx.fillText('Generated locally in Spark PDF for instant testing', 60, 260);
    ctx.fillStyle = '#64748B';
    ctx.font = '20px sans-serif';
    ctx.fillText('Ready to convert into an A4 PDF document', 60, 310);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed creating sample image.'))), 'image/png');
    });
    files.push(new File([blob], spec.name, { type: 'image/png' }));
  }

  return files;
}
