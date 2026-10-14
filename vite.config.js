import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8088",
      },
      "/auth": {
        target: "http://localhost:8088",
      },
      "/swagger-ui": {
        target: "http://localhost:8088",
      },
      "/v3/api-docs": {
        target: "http://localhost:8088",
      },
      "/actuator": {
        target: "http://localhost:8088",
      },
    },
  },
  optimizeDeps: {
    include: ['quagga'],
    exclude: ['@ericblade/quagga2'],
  },
  resolve: {
    alias: {
      'quagga': '@ericblade/quagga2',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-barcode': ['jsbarcode', 'qrcode.react', 'html5-qrcode']
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
});
