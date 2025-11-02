import { pdfjs } from 'react-pdf';

class PDFService {
  private static instance: PDFService;
  private isInitialized = false;

  private constructor() {
    // Initialize worker synchronously on construction
    this.initializeSync();
  }

  public static getInstance(): PDFService {
    if (!PDFService.instance) {
      PDFService.instance = new PDFService();
    }
    return PDFService.instance;
  }

  private initializeSync(): void {
    try {
      // Disable worker to avoid CORB issues - PDF.js will run on main thread
      pdfjs.GlobalWorkerOptions.workerSrc = '';
      this.isInitialized = true;
    } catch (error) {
      console.warn('⚠️ PDF setup failed', error);
      this.isInitialized = true;
    }
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public getWorkerSrc(): string {
    return pdfjs.GlobalWorkerOptions.workerSrc || '';
  }

  // Ensure worker is configured (call this before using PDF.js)
  public ensureWorker(): void {
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      this.initializeSync();
    }
  }
}

export const pdfService = PDFService.getInstance();