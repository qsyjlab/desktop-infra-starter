<script setup lang="ts">
import StatusCard from '../../components/common/StatusCard.vue'
</script>

<template>
  <StatusCard title="框架基线说明">
    <el-descriptions :column="1" border>
      <el-descriptions-item label="定位">纯技术框架基线，不包含业务实现</el-descriptions-item>
      <el-descriptions-item label="前端">Vue 3 + Vue Router + Element Plus</el-descriptions-item>
      <el-descriptions-item label="桌面壳层">Electron Main + Preload + Renderer</el-descriptions-item>
      <el-descriptions-item label="本地接口">NestJS（最小测试接口）</el-descriptions-item>
    </el-descriptions>
  </StatusCard>
</template>
