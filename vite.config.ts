import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@satsterminal-sdk/borrow'],
    esbuildOptions: {
      target: 'es2020',
    }
  },
  build: {
    target: 'es2020',
    commonjsOptions: {
      include: [
        /node_modules/,
        /satsterminal-sdk\/packages\/borrow/,
        /satsterminal-sdk\/packages\/core/,
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
})
