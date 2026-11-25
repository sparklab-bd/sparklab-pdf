/* eslint-disable @typescript-eslint/no-explicit-any */
export {};

declare global {
  interface Window {
    PDFLib?: any;
    pdfjsLib?: any;
    JSZip?: any;
    jspdf?: {
      jsPDF: any;
    };
  }
}
