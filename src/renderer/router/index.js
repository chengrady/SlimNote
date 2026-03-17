import { createRouter, createWebHashHistory } from 'vue-router'
import MainEditor from '../views/MainEditor.vue'
import PinWindow from '../views/PinWindow.vue'

const routes = [
  {
    path: '/',
    name: 'MainEditor',
    component: MainEditor,
  },
  {
    path: '/pin',
    name: 'PinWindow',
    component: PinWindow,
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
