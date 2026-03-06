import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Necessario per esporre la rete fuori dal container
    watch: {
      usePolling: true, // <--- LA MAGIA CHE RISOLVE IL TUO PROBLEMA IN DOCKER
      interval: 100     // Controlla i file ogni 100ms
    }
  }
})