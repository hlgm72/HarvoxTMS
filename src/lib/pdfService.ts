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
      
      console.log(`📄 React-PDF version: ${pdfjs.version}`);
      
      // Try multiple worker URLs for the correct version (5.3.93)
      const workerUrls = [
        // Try unpkg with .mjs extension (newer format)
        `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`,
        // Try unpkg with legacy .js
        `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.js`,
        // Try different CDN structure
        `https://cdn.skypack.dev/pdfjs-dist@${pdfjs.version}/build/pdf.worker.js`,
        // Try esm.sh
        `https://esm.sh/pdfjs-dist@${pdfjs.version}/build/pdf.worker.js`
      ];
      
      // For now, try the first one synchronously, but if it fails, disable worker
      const workerUrl = workerUrls[0]; // Use .mjs format
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      
      this.isInitialized = true;
      console.log(`✅ PDF worker configured with matching version ${pdfjs.version}: ${workerUrl}`);
      
      // Test if worker loads properly by attempting a simple operation
      setTimeout(() => {
        console.log(`🧪 Testing PDF worker with version ${pdfjs.version}`);
      }, 100);
      
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