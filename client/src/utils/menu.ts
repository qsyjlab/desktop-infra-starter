import type { MenuItem } from '../model/navigation'

export const menuItems: MenuItem[] = [
  {
    key: 'foundation:home',
    title: '框架概览',
    path: '/foundation/home',
    module: 'foundation',
    description: '查看框架信息与运行状态。',
  },
  {
    key: 'connectivity:api',
    title: '接口连通测试',
    path: '/connectivity/api',
    module: 'connectivity',
    description: '测试 API 链路与响应。',
  },
  {
    key: 'connectivity:db',
    title: '数据库连通测试',
    path: '/connectivity/db',
    module: 'connectivity',
    description: '测试外部或内置数据库连接。',
  },
  {
    key: 'runtime:status',
    title: '运行时状态',
    path: '/runtime/status',
    module: 'runtime',
    description: '展示 Electron 主进程上报的就绪状态。',
  },
  {
    key: 'settings:environment',
    title: '环境说明',
    path: '/settings/environment',
    module: 'settings',
    description: '展示环境变量和运行模式说明。',
  },
]

export const menuGroups = [
  {
    module: 'foundation',
    title: '基础',
    children: menuItems.filter((item) => item.module === 'foundation'),
  },
  {
    module: 'connectivity',
    title: '连通性',
    children: menuItems.filter((item) => item.module === 'connectivity'),
  },
  {
    module: 'runtime',
    title: '运行时',
    children: menuItems.filter((item) => item.module === 'runtime'),
  },
  {
    module: 'settings',
    title: '配置',
    children: menuItems.filter((item) => item.module === 'settings'),
  },
]
