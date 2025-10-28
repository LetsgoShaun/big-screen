import { fileURLToPath, URL } from "node:url";
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cesium from 'vite-plugin-cesium'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), cesium()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  // 开发环境也启用代码压缩和混淆
  esbuild: {
    minify: true,
    minifyIdentifiers: true,  // 压缩标识符
    minifySyntax: true,       // 压缩语法
    minifyWhitespace: true,   // 压缩空白
    legalComments: 'none',    // 移除注释
  },
  // 配置代理,解决跨域问题
  server: {
    host: '0.0.0.0',  // 允许通过IP地址访问
    port: 5173,       // 端口号（可自定义）
    strictPort: false, // 端口被占用时自动切换下一个可用端口
    open: false,       // 启动时不自动打开浏览器
    cors: true,        // 允许跨域
    proxy: {
      '/api': {
        target: "http://10.6.20.39:8080",  // 后端接口地址（根据实际情况修改）
        // target: "http://10.6.19.118:9000",
        // target: "http://10.6.19.43:9000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  },
  // 开发环境禁用 source map（重要！）
  css: {
    devSourcemap: false
  },
  build: {
    chunkSizeWarningLimit: 3000,
    // 生产环境移除 console.log
    minify: 'terser', // 使用 terser 进行代码压缩
    terserOptions: {
      compress: {
        drop_console: true,  // 删除 console
        drop_debugger: true, // 删除 debugger
        pure_funcs: ['console.log'] // 删除特定函数
      },
      format: {
        comments: false // 删除所有注释
      }
    },
    // 禁用生成 source map（重要！）
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        // 手动分块，进一步混淆代码结构
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      },
    },
  },
})
