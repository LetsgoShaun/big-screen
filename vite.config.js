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
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
      },
    },
  },
})
