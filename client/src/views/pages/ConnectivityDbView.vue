<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import StatusCard from '../../components/common/StatusCard.vue'
import { runtimeApi } from '../../api'

const loading = ref(false)
const result = ref('')

async function runDbTest() {
  loading.value = true
  try {
    const data = await runtimeApi.testDb()
    result.value = JSON.stringify(data, null, 2)
    ElMessage.success(data.connected ? '数据库连通正常' : '数据库未连通')
  } catch (error) {
    result.value = error instanceof Error ? error.message : '请求失败'
    ElMessage.error('数据库测试失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <StatusCard title="数据库连通测试">
    <el-alert
      title="支持外部数据库：通过 API 服务环境变量配置 MYSQL_URL 或 MYSQL_HOST/MYSQL_PORT。"
      type="info"
      :closable="false"
      show-icon
    />
    <el-button type="primary" :loading="loading" style="margin-top: 12px" @click="runDbTest">
      调用 /test/db
    </el-button>
    <el-input
      v-model="result"
      type="textarea"
      :rows="16"
      readonly
      style="margin-top: 12px"
      placeholder="点击按钮查看数据库检测返回"
    />
  </StatusCard>
</template>
