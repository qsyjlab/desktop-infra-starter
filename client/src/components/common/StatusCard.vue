<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <el-card class="page-card" shadow="never">
    <template #header>
      <strong>{{ title }}</strong>
    </template>
    <slot />
  </el-card>
</template>
