import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import commonjs from 'vite-plugin-commonjs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    commonjs({
      filter: (id) => {
        // Transform SDK packages
        if (id.includes('satsterminal-sdk')) return true
        return false
      }
    }),
  ],
  optimizeDeps: {
    include: ['@satsterminal-sdk/borrow', '@satsterminal-sdk/core'],
    esbuildOptions: {
      target: 'es2020',
    }
  },
  build: {
    target: 'es2020',
    commonjsOptions: {
      include: [/node_modules/, /satsterminal-sdk/],
      transformMixedEsModules: true,
      esmExternals: true,
    },
    rollupOptions: {
      output: {
        interop: 'auto',
      }
    }
  },
  resolve: {
    alias: {
      // Provide browser-compatible fetch
      'node-fetch': path.resolve(__dirname, 'node_modules/isomorphic-fetch'),
      '@satsterminal-sdk/borrow': path.resolve(__dirname, '../satsterminal-sdk/packages/borrow/dist'),
      '@satsterminal-sdk/core': path.resolve(__dirname, '../satsterminal-sdk/packages/core/dist'),
      '@': path.resolve(__dirname, './src'),
    },
  },
})
