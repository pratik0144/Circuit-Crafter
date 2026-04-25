import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, join } from 'path'
import { copyFileSync, mkdirSync, readdirSync, existsSync, statSync, readFileSync } from 'fs'

const editorRoot = resolve(__dirname, '..')

// -----------------------------------------------------------
// Plugin 1: Dev middleware — serve /editor/* from the repo root
// -----------------------------------------------------------
function editorDevMiddleware() {
  return {
    name: 'editor-dev-middleware',
    configureServer(server) {
      server.middlewares.use(function (req, res, next) {
        if (!req.url || !req.url.startsWith('/editor/')) return next()

        // Strip /editor prefix to get the relative path
        var relativePath = req.url.replace(/^\/editor/, '')
        if (relativePath === '' || relativePath === '/') relativePath = '/index.html'

        // Strip query strings
        relativePath = relativePath.split('?')[0]

        var filePath = join(editorRoot, relativePath)

        if (existsSync(filePath) && statSync(filePath).isFile()) {
          // Determine content type
          var ext = filePath.split('.').pop().toLowerCase()
          var contentTypes = {
            'html': 'text/html; charset=utf-8',
            'css': 'text/css; charset=utf-8',
            'js': 'application/javascript; charset=utf-8',
            'json': 'application/json; charset=utf-8',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'svg': 'image/svg+xml',
            'ico': 'image/x-icon'
          }

          res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.end(readFileSync(filePath))
        } else {
          next()
        }
      })
    }
  }
}

// -----------------------------------------------------------
// Plugin 2: Build — copy canonical editor files into dist/editor/
// -----------------------------------------------------------
function copyEditorPlugin() {
  function copyDir(src, dest) {
    if (!existsSync(src)) return
    mkdirSync(dest, { recursive: true })
    readdirSync(src).forEach(function (entry) {
      var srcPath = resolve(src, entry)
      var destPath = resolve(dest, entry)
      if (statSync(srcPath).isDirectory()) {
        copyDir(srcPath, destPath)
      } else {
        copyFileSync(srcPath, destPath)
      }
    })
  }

  return {
    name: 'copy-editor-build',
    writeBundle() {
      var dest = resolve(__dirname, 'dist', 'editor')
      mkdirSync(dest, { recursive: true })

      // Copy JS
      copyDir(resolve(editorRoot, 'js'), resolve(dest, 'js'))

      // Copy CSS
      copyDir(resolve(editorRoot, 'css'), resolve(dest, 'css'))

      // Copy assets (if non-empty)
      var assetsDir = resolve(editorRoot, 'assets')
      if (existsSync(assetsDir) && readdirSync(assetsDir).length > 0) {
        copyDir(assetsDir, resolve(dest, 'assets'))
      }

      // Copy editor index.html
      var indexSrc = resolve(editorRoot, 'index.html')
      if (existsSync(indexSrc)) {
        copyFileSync(indexSrc, resolve(dest, 'index.html'))
      }

      console.log('[copy-editor] Editor files copied to dist/editor/')
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    editorDevMiddleware(),
    copyEditorPlugin()
  ]
})
