import { createRouter, createWebHistory } from 'vue-router'
import BigScreen from '@/pages/BigScreen.vue'
import AddStation from '@/pages/addPages/index.vue'

const routes = [
  {
    path: '/',
    name: 'BigScreen',
    component: BigScreen
  },
  {
    path: '/add',
    name: 'AddStation',
    component: AddStation
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
