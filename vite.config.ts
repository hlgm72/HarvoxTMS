
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Ensure SPA routing works correctly
    historyApiFallback: true,
    // Improve error handling
    strictPort: false,
    // Better CORS handling
    cors: true,
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
}));
