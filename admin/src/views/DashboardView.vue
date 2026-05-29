<template>
  <div class="dashboard">
    <h2 class="page-title">仪表盘</h2>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-row">
      <el-col :span="4" :xs="24" :sm="12" :md="8" :lg="4">
        <el-card class="stat-card">
          <div class="stat-title">总用户数</div>
          <div class="stat-value">{{ formatNumber(stats.totalUsers) }}</div>
        </el-card>
      </el-col>
      <el-col :span="4" :xs="24" :sm="12" :md="8" :lg="4">
        <el-card class="stat-card">
          <div class="stat-title">总作品数</div>
          <div class="stat-value">{{ formatNumber(stats.totalArtworks) }}</div>
        </el-card>
      </el-col>
      <el-col :span="4" :xs="24" :sm="12" :md="8" :lg="4">
        <el-card class="stat-card">
          <div class="stat-title">今日新增用户</div>
          <div class="stat-value">
            +{{ formatNumber(stats.todayNewUsers) }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="4" :xs="24" :sm="12" :md="8" :lg="4">
        <el-card class="stat-card">
          <div class="stat-title">今日新增作品</div>
          <div class="stat-value">
            +{{ formatNumber(stats.todayNewArtworks) }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="8" :xs="24" :sm="24" :md="8" :lg="8">
        <el-card class="stat-card visit-card">
          <div class="stat-title">今日访问量</div>
          <div class="stat-value">{{ formatNumber(stats.todayVisits) }}</div>
          <div
            v-if="stats.visitTrend !== undefined"
            class="stat-trend"
            :class="stats.visitTrend >= 0 ? 'up' : 'down'"
          >
            {{ stats.visitTrend >= 0 ? '↑' : '↓' }}
            {{ Math.abs(stats.visitTrend) }}%
            <span class="trend-label">较昨日</span>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getOverview } from '@/api/stats'
import type { OverviewStats } from '@/api/stats'

const stats = ref<OverviewStats>({
  totalUsers: 0,
  totalArtworks: 0,
  todayNewUsers: 0,
  todayNewArtworks: 0,
  todayVisits: 0,
  yesterdayVisits: 0,
  visitTrend: 0,
})

const formatNumber = (num: number): string => {
  return num?.toLocaleString('zh-CN') || '0'
}

const fetchStats = async () => {
  try {
    const data = await getOverview()
    stats.value = data
  } catch (error) {
    ElMessage.error('获取统计数据失败')
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<style scoped>
.page-title {
  margin: 0 0 20px;
  font-size: 20px;
  color: #303133;
}

.stat-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  margin-bottom: 20px;
}

.stat-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.visit-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.visit-card .stat-title,
.visit-card .stat-value {
  color: #fff;
}

.stat-trend {
  margin-top: 10px;
  font-size: 14px;
}

.stat-trend.up {
  color: #67c23a;
}

.stat-trend.down {
  color: #f56c6c;
}

.visit-card .stat-trend.up,
.visit-card .stat-trend.down {
  color: #fff;
  opacity: 0.9;
}

.trend-label {
  font-size: 12px;
  opacity: 0.8;
}
</style>
