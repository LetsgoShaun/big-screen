import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cesium from 'vite-plugin-cesium'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), cesium()],
  server: {
    host: '0.0.0.0',  // 允许通过IP地址访问
    port: 5173,       // 端口号（可自定义）
    strictPort: false, // 端口被占用时自动切换下一个可用端口
    open: false        // 启动时不自动打开浏览器
  }
})

