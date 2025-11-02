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
      // Use local worker from node_modules to avoid CORS/CORB issues
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      
      this.isInitialized = true;
      
    } catch (error) {
      // If worker setup fails, try alternative path
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        this.isInitialized = true;
      } catch (fallbackError) {
        // If everything fails, disable worker (runs on main thread)
        console.warn('⚠️ PDF worker setup failed, disabling worker (will run on main thread)', fallbackError);
        pdfjs.GlobalWorkerOptions.workerSrc = '';
        this.isInitialized = true;
      }
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