<script setup lang="ts">
import StatusCard from '../../components/common/StatusCard.vue'

const envHints = [
  'API_HOST / API_PORT: API 服务监听地址与端口',
  'DB_MODE=none|external|embedded: 数据库模式（默认 external）',
  'MYSQL_URL: 外部 MySQL 连接串（优先）',
  'MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DATABASE: 外部 MySQL 分项参数',
  'EMBEDDED_MYSQL_ENABLED=true: 启用 Electron 内置数据库自启动',
  'pnpm db:download -- --platform all: 下载内置 MySQL 资源',
]
</script>

<template>
  <StatusCard title="环境变量说明">
    <el-alert
      title="默认建议使用外部数据库模式（DB_MODE=external），避免强耦合内置数据库。"
      type="warning"
      :closable="false"
      show-icon
    />
    <el-timeline style="margin-top: 12px">
      <el-timeline-item v-for="item in envHints" :key="item">
        {{ item }}
      </el-timeline-item>
    </el-timeline>
  </StatusCard>
</template>
