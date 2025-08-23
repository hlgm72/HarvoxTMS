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
      // Clear any existing worker configuration
      if (pdfjs.GlobalWorkerOptions.workerSrc) {
        delete pdfjs.GlobalWorkerOptions.workerSrc;
      }
      
      // Set the working cdnjs URL directly (we know it works from network logs)
      const workerUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      
      this.isInitialized = true;
      console.log(`✅ PDF worker configured synchronously with: ${workerUrl}`);
    } catch (error) {
      // If worker setup fails, disable worker (runs on main thread)
      console.warn('⚠️ PDF worker setup failed, disabling worker (will run on main thread)', error);
      pdfjs.GlobalWorkerOptions.workerSrc = '';
      this.isInitialized = true; // Mark as initialized even if worker disabled
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
      console.log('🔄 Re-initializing PDF worker...');
      this.initializeSync();
    }
  }
}

export const pdfService = PDFService.getInstance();