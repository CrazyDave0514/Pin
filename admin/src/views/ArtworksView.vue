<template>
  <div class="artworks-page">
    <h2 class="page-title">作品管理</h2>

    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索作品ID/名称/作者"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable>
            <el-option label="全部" value="all" />
            <el-option label="上架中" value="active" />
            <el-option label="已下架" value="offshelf" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 作品列表 -->
    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="artworkList"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="作品ID" width="120" />
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
        <el-table-column prop="name" label="作品名称" />
        <el-table-column prop="creatorName" label="作者" />
        <el-table-column prop="points" label="积分" width="80" />
        <el-table-column prop="likes" label="点赞" width="80" />
        <el-table-column prop="favorites" label="收藏" width="80" />
        <el-table-column prop="viewCount" label="浏览" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.isOffShelf" type="danger">已下架</el-tag>
            <el-tag v-else type="success">上架中</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button
              v-if="!row.isOffShelf"
              type="warning"
              size="small"
              @click="handleOffShelf(row)"
            >
              下架
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getArtworkList, offShelfArtwork, deleteArtwork } from '@/api/artworks'
import type { Artwork } from '@/api/artworks'

const router = useRouter()
const loading = ref(false)
const artworkList = ref<Artwork[]>([])

const searchForm = reactive({
  keyword: '',
  status: 'all',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const formatDateTime = (timestamp: number): string => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

const fetchArtworkList = async () => {
  loading.value = true
  try {
    const result = await getArtworkList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword,
      status: searchForm.status as any,
    })
    artworkList.value = result.list
    pagination.total = result.total
  } catch (error) {
    ElMessage.error('获取作品列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchArtworkList()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.status = 'all'
  pagination.page = 1
  fetchArtworkList()
}

const handleView = (row: Artwork) => {
  router.push(`/artworks/${row.id}`)
}

const handleOffShelf = async (row: Artwork) => {
  try {
    await ElMessageBox.confirm(
      `确定要下架作品 "${row.name}" 吗？`,
      '确认下架',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    await offShelfArtwork(row.id)
    ElMessage.success('下架成功')
    fetchArtworkList()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '下架失败')
    }
  }
}

const handleDelete = async (row: Artwork) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除作品 "${row.name}" 吗？此操作不可恢复！`,
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
      }
    )
    await deleteArtwork(row.id)
    ElMessage.success('删除成功')
    fetchArtworkList()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.page = 1
  fetchArtworkList()
}

const handlePageChange = (page: number) => {
  pagination.page = page
  fetchArtworkList()
}

onMounted(() => {
  fetchArtworkList()
})
</script>

<style scoped>
.page-title {
  margin: 0 0 20px;
  font-size: 20px;
  color: #303133;
}

.search-card {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
