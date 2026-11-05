import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// 빌드 결과는 저장소의 play/ 폴더로 → GitHub Pages에서 /film-career/play/ 로 바로 열림
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  build: {
    outDir: fileURLToPath(new URL('../play', import.meta.url)),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true, port: 5173 },
})
