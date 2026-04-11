<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import StatusCard from '../../components/common/StatusCard.vue'
import { runtimeApi } from '../../api'

const loading = ref(false)
const result = ref('')

async function runHealthCheck() {
  loading.value = true
  try {
    const data = await runtimeApi.getHealth()
    result.value = JSON.stringify(data, null, 2)
    ElMessage.success('接口连通正常')
  } catch (error) {
    result.value = error instanceof Error ? error.message : '请求失败'
    ElMessage.error('接口连通失败')
  } finally {
    loading.value = false
  }
}

async function runPing() {
  loading.value = true
  try {
    const data = await runtimeApi.ping()
    result.value = JSON.stringify(data, null, 2)
    ElMessage.success('Ping 成功')
  } catch (error) {
    result.value = error instanceof Error ? error.message : '请求失败'
    ElMessage.error('Ping 失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <StatusCard title="接口连通测试">
    <el-space wrap>
      <el-button type="primary" :loading="loading" @click="runHealthCheck">调用 /health</el-button>
      <el-button type="success" :loading="loading" @click="runPing">调用 /test/ping</el-button>
    </el-space>
    <el-input
      v-model="result"
      type="textarea"
      :rows="16"
      readonly
      style="margin-top: 12px"
      placeholder="点击按钮查看接口返回"
    />
  </StatusCard>
</template>
