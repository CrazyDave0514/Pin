import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    uni(),
    /** 构建完成后自动写入 CNAME 文件到输出目录 */
    {
      name: 'add-cname',
      closeBundle: () => {
        const cnamePath = join(__dirname, 'dist', 'build', 'h5', 'CNAME')
        const dir = join(__dirname, 'dist', 'build', 'h5')
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true })
        }
        writeFileSync(cnamePath, 'pindou.picsync.cn\n')
        console.log('✅ CNAME file written to dist/build/h5/CNAME')
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name || 'chunk'
          if (name.startsWith('_')) {
            return `assets/${name.slice(1)}-[hash].js`
          }
          return `assets/${name}-[hash].js`
        },
        entryFileNames: 'assets/[name]-[hash].js',
        inlineDynamicImports: true,
      },
    },
  },
})
