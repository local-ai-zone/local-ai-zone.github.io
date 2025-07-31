import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    cssMinify: true,
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        manualChunks: {
          // Split vendor code for better caching
          vendor: ['./services/SearchEngine.js', './utils/debounce.js'],
          components: ['./components/ModelCard.js'],
          utils: ['./utils/seoManager.js', './utils/router.js', './utils/performanceOptimizer.js']
        },
        // Optimize chunk file names for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Enable tree shaking
    treeshake: true,
    // Optimize bundle size
    chunkSizeWarningLimit: 500,
    // Enable compression
    reportCompressedSize: true,
    // Terser options for better minification
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace']
      },
      mangle: {
        safari10: true
      },
      format: {
        safari10: true
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  preview: {
    port: 4173
  },
  // Enable CSS code splitting
  css: {
    devSourcemap: false,
    modules: {
      localsConvention: 'camelCase'
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [],
    exclude: []
  }
});