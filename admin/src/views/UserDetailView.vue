<template>
  <div class="user-detail">
    <el-page-header title="返回" @back="goBack" />

    <h2 class="page-title">用户详情</h2>

    <div v-if="loading" class="loading">
      <el-skeleton :rows="5" animated />
    </div>

    <template v-else-if="user">
      <!-- 用户信息卡片 -->
      <el-card class="info-card">
        <div class="user-header">
          <el-avatar :size="80" :src="user.avatar" />
          <div class="user-info">
            <h3>{{ user.nickname }}</h3>
            <p class="user-meta">
              <span>UID: {{ user.uid }}</span>
              <span>用户名: {{ user.username }}</span>
              <span>邮箱: {{ user.email }}</span>
            </p>
            <p v-if="user.bio" class="user-bio">{{ user.bio }}</p>
          </div>
        </div>
      </el-card>

      <!-- 统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-title">作品数</div>
            <div class="stat-value">{{ user.stats?.artworkCount || 0 }}</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-title">获赞数</div>
            <div class="stat-value">{{ user.stats?.totalLikes || 0 }}</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-title">被收藏数</div>
            <div class="stat-value">{{ user.stats?.totalFavorites || 0 }}</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 作品列表 -->
      <el-card class="artworks-card">
        <template #header>
          <span>作品列表</span>
        </template>
        <el-table :data="user.artworks" stripe>
          <el-table-column prop="name" label="作品名称" />
          <el-table-column label="缩略图" width="100">
            <template #default="{ row }">
              <el-image
                :src="row.thumbnail"
                :preview-src-list="[row.thumbnail]"
                style="width: 60px; height: 60px"
                fit="cover"
              />
            </template>
          </el-table-column>
          <el-table-column prop="likes" label="点赞" width="100" />
          <el-table-column prop="favorites" label="收藏" width="100" />
          <el-table-column label="发布时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <el-empty v-else description="用户不存在" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getUserDetail } from '@/api/users'
import type { UserDetail } from '@/api/users'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const user = ref<UserDetail | null>(null)

const formatDateTime = (timestamp: number): string => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

const fetchUserDetail = async () => {
  const uid = route.params.uid as string
  if (!uid) return

  loading.value = true
  try {
    const result = await getUserDetail(uid)
    user.value = result
  } catch (error) {
    ElMessage.error('获取用户详情失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  fetchUserDetail()
})
</script>

<style scoped>
.page-title {
  margin: 20px 0;
  font-size: 20px;
  color: #303133;
}

.loading {
  padding: 40px;
}

.info-card {
  margin-bottom: 20px;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info h3 {
  margin: 0 0 10px;
  font-size: 20px;
}

.user-meta {
  margin: 0 0 10px;
  color: #606266;
}

.user-meta span {
  margin-right: 20px;
}

.user-bio {
  margin: 0;
  color: #909399;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
}

.stat-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.artworks-card {
  margin-bottom: 20px;
}
</style>
