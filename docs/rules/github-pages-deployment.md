# GitHub Pages 部署问题解决方案

## 问题描述

在 GitHub Pages 部署 uni-app H5 应用时，经常出现 **"连接服务器超时，点击屏幕重试"** 错误。

## 根本原因

1. **懒加载机制**：uni-app H5 默认对非 tabBar 页面使用动态导入（懒加载）
2. **浏览器缓存**：index.html 被缓存，引用了旧的 JS 文件名（带 hash）
3. **文件名变化**：每次构建后 JS 文件名（hash）会变化
4. **404 错误**：浏览器尝试加载旧的/不存在的 JS chunk 文件

## 解决方案

### 方案 1：禁用懒加载（推荐）

在 `vite.config.js` 中添加 `inlineDynamicImports: true`，将所有代码打包到单个 JS 文件：

```javascript
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  base: '/',
  plugins: [uni()],
  build: {
    rollupOptions: {
      output: {
        // 禁用动态导入，将所有代码打包到一个文件
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
})
```

**优点**：
- 彻底解决懒加载 404 问题
- 只有一个 JS 文件，缓存管理更简单
- 页面切换更快（无需动态加载）

**缺点**：
- 首屏加载时间略增加（但现代网络环境下影响很小）
- JS 文件体积较大（但 gzip 后通常可接受）

### 方案 2：使用 Service Worker 缓存策略

添加 Service Worker 控制缓存策略，确保始终加载最新文件。

### 方案 3：添加版本号强制刷新

在 URL 中添加时间戳或版本号：

```javascript
// main.js
const script = document.createElement('script')
script.src = `/app.js?v=${Date.now()}`
document.head.appendChild(script)
```

## 最佳实践

1. **使用单文件打包**（方案 1）是最简单可靠的解决方案
2. **每次部署后清除 CDN 缓存**（如果使用了 CDN）
3. **告知用户强制刷新**（Ctrl+Shift+R 或 Cmd+Shift+R）
4. **监控 GitHub Pages 部署状态**，确保部署成功

## 验证方法

构建后检查 `dist/build/h5/assets/` 目录：

```bash
# 理想状态：只有一个 JS 文件
ls assets/*.js
# 输出：index-xxx.js

# 问题状态：多个 pages-xxx.js 文件
ls assets/*.js
# 输出：index-xxx.js pages-index-xxx.js pages-project-xxx.js ...
```

## 相关配置

### vite.config.js

```javascript
export default defineConfig({
  base: '/',  // 使用绝对路径，避免相对路径问题
  // ...
})
```

### manifest.json

```json
{
  "h5": {
    "title": "Pin",
    "favicon": "static/favicon.ico"
  }
}
```

## 故障排查

如果遇到问题，检查：

1. **GitHub Pages 部署状态**
   ```bash
   curl -s "https://api.github.com/repos/USER/REPO/pages"
   ```

2. **文件是否存在**
   ```bash
   curl -I "https://your-domain.com/assets/index-xxx.js"
   ```

3. **浏览器控制台错误**
   - 打开 F12 → Console
   - 查看是否有 `ERR_ABORTED` 或 `Failed to fetch` 错误

## 参考

- [Vite 构建选项](https://vitejs.dev/config/build-options.html)
- [Rollup 输出选项](https://rollupjs.org/configuration-options/#output-inlinedynamicimports)
- [GitHub Pages 文档](https://docs.github.com/en/pages)
