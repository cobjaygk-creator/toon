import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': '*'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/audio_cache': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/characters': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/backgrounds': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
