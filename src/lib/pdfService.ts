import { pdfjs } from 'react-pdf';

class PDFService {
  private static instance: PDFService;
  private isInitialized = false;
  private isInitializing = false;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {}

  public static getInstance(): PDFService {
    if (!PDFService.instance) {
      PDFService.instance = new PDFService();
    }
    return PDFService.instance;
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this.configureWorker();
    
    const result = await this.initPromise;
    this.isInitialized = result;
    this.isInitializing = false;
    
    return result;
  }

  private async configureWorker(): Promise<boolean> {
    try {
      // Clear any existing worker configuration
      delete pdfjs.GlobalWorkerOptions.workerSrc;
      
      // Use the working cdnjs URL directly since we know it works from logs
      const workerUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      // Test if the worker URL is accessible
      const response = await fetch(workerUrl, { method: 'HEAD' });
      if (response.ok) {
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        console.log(`✅ PDF worker configured globally with: ${workerUrl}`);
        return true;
      }
      
      throw new Error('Worker URL not accessible');
    } catch (error) {
      // If worker fails, disable it (runs on main thread)
      console.warn('⚠️ PDF worker failed, disabling worker (will run on main thread)', error);
      pdfjs.GlobalWorkerOptions.workerSrc = '';
      return false;
    }
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public async waitForReady(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }
    
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }
    
    return this.initialize();
  }
}

export const pdfService = PDFService.getInstance();