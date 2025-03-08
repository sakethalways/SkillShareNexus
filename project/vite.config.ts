import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: true, // Expose to all network interfaces
    port: 5173,
    strictPort: true,
    open: true
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true
  }
});