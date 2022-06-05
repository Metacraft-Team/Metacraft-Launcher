import { builtinModules } from 'module'
import { defineConfig } from 'vite'
import pkg from '../../package.json'
import esmodule from 'vite-plugin-esmodule'

export default defineConfig({
  root: __dirname,
  plugins: [
    esmodule([
      'axios'
    ])
  ],
  build: {
    outDir: '../../dist/main',
    emptyOutDir: true,
    minify: process.env.NODE_ENV === 'production',
    lib: {
      entry: 'index.js',
      formats: ['cjs'],
      fileName: () => '[name].cjs'
    },
    rollupOptions: {
      external: [
        'electron',
        ...builtinModules,
        ...Object.keys(pkg.dependencies || {})
      ]
    }
  }
})
