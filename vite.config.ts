import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      generateScopedName: (localName, filename) => {
        const cleanName = path.basename(filename).split('?')[0]
        const base = cleanName
          .replace(/\.module\.css$/i, '')
          .replace(/\.css$/i, '')
          .replace(/\.module$/i, '')
        const hash = createHash('sha256')
          .update(localName)
          .update(base)
          .update(filename)
          .digest('base64')
          .replace(/[+/=]/g, '')
          .slice(0, 6)
        return `${base}__${localName}__${hash}`
      },
    },
  },
})
