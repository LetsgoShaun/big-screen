import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import ApiService from "@/core/services/ApiService.ts";
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App);

// 使用路由
app.use(router);

// 使用 Element Plus
app.use(ElementPlus);

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 初始化 API 服务
ApiService.init(app);

app.mount('#app');
