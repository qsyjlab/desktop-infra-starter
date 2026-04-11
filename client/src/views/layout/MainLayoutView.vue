<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { menuGroups, menuItems } from '../../utils/menu'
import { useRuntimeStore } from '../../store/runtime-store'

const route = useRoute()
const router = useRouter()
const { runtimeStatus, initRuntime, disposeRuntime } = useRuntimeStore()

const activeMenuKey = computed(() => String(route.meta.menuKey || 'foundation:home'))
const currentTitle = computed(() => String(route.meta.title || '框架概览'))
const currentDescription = computed(() => {
  const item = menuItems.find((entry) => entry.key === activeMenuKey.value)
  return item?.description || '框架页面'
})

async function onMenuSelect(index: string) {
  const target = menuItems.find((item) => item.key === index)
  if (!target) return
  await router.push(target.path)
}

onMounted(async () => {
  await initRuntime()
})

onBeforeUnmount(() => {
  disposeRuntime()
})
</script>

<template>
  <el-container class="audit-app">
    <el-header class="topbar" height="64px">
      <div class="brand">
        <span class="brand-dot" />
        <div>
          <p class="brand-name">Desktop Infra Starter</p>
          <p class="brand-subtitle">Electron + Vue + Nest 基础框架</p>
        </div>
      </div>
      <el-tag :type="runtimeStatus.ready ? 'success' : 'warning'">
        {{ runtimeStatus.ready ? '运行中' : '启动中' }}
      </el-tag>
    </el-header>

    <el-container class="main-shell">
      <el-aside width="220px" class="sidebar">
        <p class="menu-title">框架菜单</p>
        <el-menu
          :default-active="activeMenuKey"
          class="menu"
          @select="onMenuSelect"
        >
          <el-sub-menu v-for="group in menuGroups" :key="group.module" :index="group.module">
            <template #title>{{ group.title }}</template>
            <el-menu-item v-for="item in group.children" :key="item.key" :index="item.key">
              {{ item.title }}
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-aside>

      <el-main class="workspace">
        <div class="workspace-header">
          <h1>{{ currentTitle }}</h1>
          <p>{{ currentDescription }}</p>
        </div>
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>
