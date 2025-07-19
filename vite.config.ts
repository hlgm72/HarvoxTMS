import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Better CORS and external access
    strictPort: false,
    cors: true,
    headers: {
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *;"
    },
    // Improve external preview compatibility
    open: '/',
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    // Better error reporting
    reportCompressedSize: false,
    // Optimize for better loading
    target: 'esnext',
    minify: 'esbuild',
  },
  // Set base to root for better preview compatibility
  base: './',
  // Better development experience
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  // Improve CSS handling
  css: {
    devSourcemap: mode === 'development',
  },
  // Better preview handling
  preview: {
    port: 8080,
    host: true,
    strictPort: false,
    headers: {
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *;"
    }
  }
}));
