<template>
  <div class="artwork-detail">
    <el-page-header title="返回" @back="goBack" />

    <h2 class="page-title">作品详情</h2>

    <div v-if="loading" class="loading">
      <el-skeleton :rows="5" animated />
    </div>

    <template v-else-if="artwork">
      <!-- 作品预览 -->
      <el-card class="preview-card">
        <div class="artwork-preview">
          <el-image
            :src="artwork.thumbnail"
            :preview-src-list="[artwork.thumbnail]"
            style="width: 200px; height: 200px"
            fit="cover"
          />
          <div class="artwork-info">
            <h3>{{ artwork.name }}</h3>
            <p class="artwork-desc">{{ artwork.description || '暂无描述' }}</p>
            <div class="artwork-tags">
              <el-tag
                v-for="tag in artwork.tags"
                :key="tag"
                size="small"
                class="tag"
              >
                {{ tag }}
              </el-tag>
            </div>
            <div class="artwork-status">
              <el-tag v-if="artwork.isOffShelf" type="danger">已下架</el-tag>
              <el-tag v-else type="success">上架中</el-tag>
              <el-tag v-if="artwork.isPublic" type="info">公开</el-tag>
              <el-tag v-else type="warning">私有</el-tag>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-title">积分价格</div>
            <div class="stat-value">{{ artwork.points }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-title">点赞数</div>
            <div class="stat-value">{{ artwork.likes }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-title">收藏数</div>
            <div class="stat-value">{{ artwork.favorites }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-title">浏览量</div>
            <div class="stat-value">{{ artwork.viewCount }}</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 详细信息 -->
      <el-card class="detail-card">
        <template #header>
          <span>详细信息</span>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="作品ID">{{ artwork.id }}</el-descriptions-item>
          <el-descriptions-item label="作者">{{ artwork.creatorName }}</el-descriptions-item>
          <el-descriptions-item label="拼豆数量">{{ artwork.beadCount }}</el-descriptions-item>
          <el-descriptions-item label="颜色种类">{{ artwork.colorTypeCount }}</el-descriptions-item>
          <el-descriptions-item label="使用次数">{{ artwork.useCount }}</el-descriptions-item>
          <el-descriptions-item label="发布时间">
            {{ formatDateTime(artwork.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatDateTime(artwork.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 操作按钮 -->
      <el-card class="action-card">
        <el-button
          v-if="!artwork.isOffShelf"
          type="warning"
          @click="handleOffShelf"
        >
          下架作品
        </el-button>
        <el-button type="danger" @click="handleDelete">删除作品</el-button>
      </el-card>
    </template>

    <el-empty v-else description="作品不存在" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getArtworkDetail, offShelfArtwork, deleteArtwork } from '@/api/artworks'
import type { ArtworkDetail } from '@/api/artworks'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const artwork = ref<ArtworkDetail | null>(null)

const formatDateTime = (timestamp: number): string => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

const fetchArtworkDetail = async () => {
  const id = route.params.id as string
  if (!id) return

  loading.value = true
  try {
    const result = await getArtworkDetail(id)
    artwork.value = result
  } catch (error) {
    ElMessage.error('获取作品详情失败')
  } finally {
    loading.value = false
  }
}

const handleOffShelf = async () => {
  if (!artwork.value) return
  try {
    await ElMessageBox.confirm(
      `确定要下架作品 "${artwork.value.name}" 吗？`,
      '确认下架',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    await offShelfArtwork(artwork.value.id)
    ElMessage.success('下架成功')
    fetchArtworkDetail()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '下架失败')
    }
  }
}

const handleDelete = async () => {
  if (!artwork.value) return
  try {
    await ElMessageBox.confirm(
      `确定要删除作品 "${artwork.value.name}" 吗？此操作不可恢复！`,
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
      }
    )
    await deleteArtwork(artwork.value.id)
    ElMessage.success('删除成功')
    router.push('/artworks')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  fetchArtworkDetail()
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

.preview-card {
  margin-bottom: 20px;
}

.artwork-preview {
  display: flex;
  gap: 20px;
}

.artwork-info h3 {
  margin: 0 0 10px;
  font-size: 20px;
}

.artwork-desc {
  margin: 0 0 15px;
  color: #606266;
}

.artwork-tags {
  margin-bottom: 15px;
}

.tag {
  margin-right: 8px;
  margin-bottom: 8px;
}

.artwork-status .el-tag {
  margin-right: 8px;
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

.detail-card {
  margin-bottom: 20px;
}

.action-card {
  margin-bottom: 20px;
}
</style>
