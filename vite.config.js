import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    uni(),
  ],
  build: {
    rollupOptions: {
      output: {
        // 避免生成以下划线开头的文件名（GitHub Pages 可能特殊处理）
        chunkFileNames: (chunkInfo) => {
          // 将 _plugin-vue_export-helper 改为 plugin-vue-export-helper
          const name = chunkInfo.name || 'chunk'
          if (name.startsWith('_')) {
            return `assets/${name.slice(1)}-[hash].js`
          }
          return `assets/${name}-[hash].js`
        },
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
})
