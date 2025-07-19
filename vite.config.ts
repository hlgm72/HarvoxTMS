import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: false,
    cors: true,
    open: '/',
    headers: {
      'X-Frame-Options': 'SAMEORIGIN'
    }
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
  base: '/',
  // Better development experience
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  // Improve CSS handling
  css: {
    devSourcemap: mode === 'development',
  },
  preview: {
    port: 8080,
    host: true,
    strictPort: false
  }
}));
