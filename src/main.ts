import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import ApiService from "@/core/services/ApiService.ts";

const app = createApp(App);

// 初始化 API 服务
ApiService.init(app);

app.mount('#app');
