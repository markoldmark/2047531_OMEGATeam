import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true, // <--- LA MAGIA CHE RISOLVE IL TUO PROBLEMA IN DOCKER
      interval: 100     // Controlla i file ogni 100ms
    },
    proxy: {
      // Reindirizziamo le chiamate WebSocket e API al backend Docker
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  }
})