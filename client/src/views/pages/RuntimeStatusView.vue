<script setup lang="ts">
import { computed } from 'vue'
import StatusCard from '../../components/common/StatusCard.vue'
import { useRuntimeStore } from '../../store/runtime-store'

const { runtimeStatus } = useRuntimeStore()

const pretty = computed(() => JSON.stringify(runtimeStatus.value, null, 2))
</script>

<template>
  <StatusCard title="运行时状态">
    <el-tag :type="runtimeStatus.ready ? 'success' : 'warning'">
      {{ runtimeStatus.ready ? 'Ready' : 'Not Ready' }}
    </el-tag>
    <el-input
      :model-value="pretty"
      type="textarea"
      :rows="18"
      readonly
      style="margin-top: 12px"
    />
  </StatusCard>
</template>
