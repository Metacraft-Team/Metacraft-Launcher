import fs from 'fs/promises'
import { builtinModules } from 'module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electronRenderer from 'vite-plugin-electron/renderer'
import optimizer from 'vite-plugin-optimizer'
import polyfillExports from 'vite-plugin-electron/polyfill-exports'
const path = require('path')

export default defineConfig({
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    sourcemap: true
  },
  root: __dirname,
  plugins: [
    electronRenderer(),
    polyfillExports(),
    react({
      babel: {
        plugins: [
          [
            'babel-plugin-styled-components',
            { ssr: false }
          ]
        ]
      }
    }),
    electron()
  ],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      },
      plugins: [
        {
          name: 'load-js-files-as-jsx', // treat js files as jsx in vite
          setup (build) {
            build.onLoad({ filter: /src\/.*\.js$/ }, async (args) => ({
              loader: 'jsx',
              contents: await fs.readFile(args.path, 'utf8')
            }))
          }
        }
      ]
    }
  },
  resolve: {
    alias: {
      '@common': path.resolve(__dirname, 'common'),
      '@components': path.resolve(__dirname, 'app/components'),
      '@utils': path.resolve(__dirname, 'app/utils'),
      '@views': path.resolve(__dirname, 'app/views')
    },
    conditions: ['node']
  },
  server: {
    host: 'localhost',
    port: 3000
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  }
})

export function electron (
  entries) {
  const builtins = builtinModules.filter((t) => !t.startsWith('_'))

  /**
   * @see https://github.com/caoxiemeihao/vite-plugins/tree/main/packages/resolve#readme
   */
  return optimizer({
    electron: electronExport(),
    ...builtinModulesExport(builtins),
    ...entries
  })

  function electronExport () {
    return `
      /**
       * For all exported modules see https://www.electronjs.org/docs/latest/api/clipboard -> Renderer Process Modules
       */
      const electron = require("electron");
      const {
        clipboard,
        nativeImage,
        shell,
        contextBridge,
        crashReporter,
        ipcRenderer,
        webFrame,
        desktopCapturer,
        deprecate,
      } = electron;

      export {
        electron as default,
        clipboard,
        nativeImage,
        shell,
        contextBridge,
        crashReporter,
        ipcRenderer,
        webFrame,
        desktopCapturer,
        deprecate,
      }
    `
  }

  function builtinModulesExport (modules) {
    return modules
      .map((moduleId) => {
        const nodeModule = require(moduleId)
        const requireModule = `const M = require("${moduleId}");`
        const exportDefault = 'export default M;'
        const exportMembers =
          Object.keys(nodeModule)
            .map((attr) => `export const ${attr} = M.${attr}`)
            .join(';\n') + ';'
        const nodeModuleCode = `
          ${requireModule}

          ${exportDefault}

          ${exportMembers}
        `

        return { [moduleId]: nodeModuleCode }
      })
      .reduce((memo, item) => Object.assign(memo, item), {})
  }
}
