import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayoutView from '../views/layout/MainLayoutView.vue'
import FoundationHomeView from '../views/pages/FoundationHomeView.vue'
import ConnectivityApiView from '../views/pages/ConnectivityApiView.vue'
import ConnectivityDbView from '../views/pages/ConnectivityDbView.vue'
import RuntimeStatusView from '../views/pages/RuntimeStatusView.vue'
import SettingsEnvironmentView from '../views/pages/SettingsEnvironmentView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: MainLayoutView,
      children: [
        {
          path: '',
          redirect: '/foundation/home',
        },
        {
          path: 'foundation/home',
          component: FoundationHomeView,
          meta: { menuKey: 'foundation:home', title: '框架概览' },
        },
        {
          path: 'connectivity/api',
          component: ConnectivityApiView,
          meta: { menuKey: 'connectivity:api', title: '接口连通测试' },
        },
        {
          path: 'connectivity/db',
          component: ConnectivityDbView,
          meta: { menuKey: 'connectivity:db', title: '数据库连通测试' },
        },
        {
          path: 'runtime/status',
          component: RuntimeStatusView,
          meta: { menuKey: 'runtime:status', title: '运行时状态' },
        },
        {
          path: 'settings/environment',
          component: SettingsEnvironmentView,
          meta: { menuKey: 'settings:environment', title: '环境说明' },
        },
      ],
    },
  ],
})

export default router
