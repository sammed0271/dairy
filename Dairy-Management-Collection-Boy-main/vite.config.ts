import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          "pdf-vendor": ["jspdf", "jspdf-autotable", "html2pdf.js"],
          "file-vendor": ["file-saver", "xlsx"],
        },
      },
    },
  },
})
