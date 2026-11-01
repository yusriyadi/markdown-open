import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    'import.meta.env.TAURI_ENV_PLATFORM': JSON.stringify(process.env.TAURI_ENV_PLATFORM || ''),
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
})
