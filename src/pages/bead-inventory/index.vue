<template>
  <!-- 豆仓管理页面 -->
  <view class="bead-inventory-page">
    <!-- 品牌选择器 -->
    <view class="brand-selector">
      <scroll-view class="brand-scroll" scroll-x>
        <view class="brand-list">
          <view 
            v-for="brand in brands" 
            :key="brand.key"
            :class="['brand-item', activeBrand === brand.key ? 'active' : '']"
            @click="switchBrand(brand.key)"
          >
            <text class="brand-name">{{ brand.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 套装选择器 -->
    <view class="kit-selector">
      <view class="kit-label">套装:</view>
      <scroll-view class="kit-scroll" scroll-x>
        <view class="kit-list">
          <view 
            v-for="kit in currentKits" 
            :key="kit.id"
            :class="['kit-item', activeKit === kit.id ? 'active' : '']"
            @click="switchKit(kit.id)"
          >
            <text class="kit-name">{{ kit.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 统计信息 -->
    <view class="stats-bar">
      <view class="stat-item">
        <text class="stat-value">{{ totalColors }}</text>
        <text class="stat-label">颜色总数</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ ownedColors }}</text>
        <text class="stat-label">已拥有</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ lowStockColors }}</text>
        <text class="stat-label">库存不足</text>
      </view>
    </view>

    <!-- 颜色列表 -->
    <scroll-view class="color-list" scroll-y>
      <view v-if="currentColors.length === 0" class="empty-state">
        <text class="empty-text">暂无颜色数据</text>
      </view>
      <view 
        v-for="color in currentColors" 
        :key="color.id"
        :class="['color-card', color.owned ? 'owned' : '']"
        @click="toggleOwned(color)"
      >
        <view class="color-preview" :style="{ backgroundColor: color.hex }">
          <view v-if="color.owned" class="owned-mark">✓</view>
        </view>
        <view class="color-info">
          <text class="color-name">{{ color.name }}</text>
          <text class="color-code">{{ color.code }}</text>
        </view>
        <view class="stock-control" @click.stop>
          <view 
            v-if="color.owned" 
            class="stock-btn minus"
            @click="updateStock(color, -1)"
          >
            <text class="btn-icon">−</text>
          </view>
          <text v-if="color.owned" class="stock-value">{{ color.stock || 0 }}</text>
          <view 
            v-if="color.owned" 
            class="stock-btn plus"
            @click="updateStock(color, 1)"
          >
            <text class="btn-icon">+</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <view class="batch-actions">
        <view class="batch-btn" @click="batchSelectAll">
          <text class="btn-text">全选</text>
        </view>
        <view class="batch-btn" @click="batchClearAll">
          <text class="btn-text">清空</text>
        </view>
      </view>
      <view class="save-btn" @click="saveInventory">
        <text class="btn-text">保存</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 品牌列表
const brands = [
  { key: 'mard', name: 'Mard' },
  { key: 'artkal', name: 'Artkal' },
  { key: 'hama', name: 'Hama' },
  { key: 'perler', name: 'Perler' },
  { key: 'nabbi', name: 'Nabbi' }
]

// 当前选中的品牌
const activeBrand = ref('mard')

// 当前选中的套装
const activeKit = ref('')

// 套装数据
const kitsData = ref<Record<string, any[]>>({})

// 颜色数据
const colorsData = ref<Record<string, any[]>>({})

// 用户库存数据
const inventoryData = ref<Record<string, { owned: boolean; stock: number }>>({})

/**
 * 获取当前品牌的套装列表
 */
const currentKits = computed(() => {
  return kitsData.value[activeBrand.value] || []
})

/**
 * 获取当前套装的颜色列表
 */
const currentColors = computed(() => {
  const colors = colorsData.value[activeKit.value] || []
  return colors.map(color => ({
    ...color,
    owned: inventoryData.value[color.id]?.owned || false,
    stock: inventoryData.value[color.id]?.stock || 0
  }))
})

/**
 * 颜色总数
 */
const totalColors = computed(() => currentColors.value.length)

/**
 * 已拥有的颜色数
 */
const ownedColors = computed(() => currentColors.value.filter(c => c.owned).length)

/**
 * 库存不足的颜色数
 */
const lowStockColors = computed(() => 
  currentColors.value.filter(c => c.owned && (c.stock || 0) < 10).length
)

/**
 * 切换品牌
 * @param brandKey 品牌标识
 */
const switchBrand = (brandKey: string) => {
  activeBrand.value = brandKey
  // 切换到该品牌的第一个套装
  const kits = kitsData.value[brandKey]
  if (kits && kits.length > 0) {
    activeKit.value = kits[0].id
  }
}

/**
 * 切换套装
 * @param kitId 套装ID
 */
const switchKit = (kitId: string) => {
  activeKit.value = kitId
}

/**
 * 切换颜色拥有状态
 * @param color 颜色对象
 */
const toggleOwned = (color: any) => {
  const current = inventoryData.value[color.id] || { owned: false, stock: 0 }
  inventoryData.value[color.id] = {
    ...current,
    owned: !current.owned,
    stock: !current.owned ? 100 : 0
  }
}

/**
 * 更新库存数量
 * @param color 颜色对象
 * @param delta 变化量
 */
const updateStock = (color: any, delta: number) => {
  const current = inventoryData.value[color.id] || { owned: true, stock: 0 }
  const newStock = Math.max(0, (current.stock || 0) + delta)
  inventoryData.value[color.id] = {
    ...current,
    stock: newStock
  }
}

/**
 * 全选当前套装颜色
 */
const batchSelectAll = () => {
  currentColors.value.forEach(color => {
    inventoryData.value[color.id] = { owned: true, stock: 100 }
  })
  uni.showToast({ title: '已全选', icon: 'success' })
}

/**
 * 清空当前套装选择
 */
const batchClearAll = () => {
  currentColors.value.forEach(color => {
    inventoryData.value[color.id] = { owned: false, stock: 0 }
  })
  uni.showToast({ title: '已清空', icon: 'success' })
}

/**
 * 保存库存数据
 */
const saveInventory = () => {
  uni.setStorageSync('pin_bead_inventory', inventoryData.value)
  uni.showToast({ title: '保存成功', icon: 'success' })
}

/**
 * 初始化数据
 */
const initData = () => {
  // 加载库存数据
  const savedInventory = uni.getStorageSync('pin_bead_inventory')
  if (savedInventory) {
    inventoryData.value = savedInventory
  }

  // 初始化套装数据（示例数据）
  kitsData.value = {
    mard: [
      { id: 'mard_221', name: '221色全套装', brand: 'mard', colorCount: 221 },
      { id: 'mard_100', name: '100色基础套装', brand: 'mard', colorCount: 100 },
      { id: 'mard_72', name: '72色常用套装', brand: 'mard', colorCount: 72 }
    ],
    artkal: [
      { id: 'artkal_200', name: '200色套装', brand: 'artkal', colorCount: 200 },
      { id: 'artkal_128', name: '128色套装', brand: 'artkal', colorCount: 128 }
    ],
    hama: [
      { id: 'hama_70', name: '70色套装', brand: 'hama', colorCount: 70 }
    ],
    perler: [
      { id: 'perler_80', name: '80色套装', brand: 'perler', colorCount: 80 }
    ],
    nabbi: [
      { id: 'nabbi_60', name: '60色套装', brand: 'nabbi', colorCount: 60 }
    ]
  }

  // 初始化 Mard 221 色数据（示例）
  const mardColors = []
  const colorNames = [
    '白色', '黑色', '红色', '橙色', '黄色', '绿色', '蓝色', '紫色', '粉色', '棕色',
    '灰色', '米色', '金色', '银色', '透明', '荧光黄', '荧光绿', '荧光粉', '荧光橙', '天蓝'
  ]
  for (let i = 1; i <= 221; i++) {
    const hue = (i * 137.5) % 360
    mardColors.push({
      id: `mard_${i}`,
      code: `M${String(i).padStart(3, '0')}`,
      name: colorNames[i % colorNames.length] + (Math.floor(i / 20) + 1),
      hex: `hsl(${hue}, 70%, 50%)`,
      brand: 'mard',
      kitId: 'mard_221'
    })
  }
  colorsData.value['mard_221'] = mardColors

  // 初始化其他套装颜色（简化示例）
  kitsData.value.artkal.forEach(kit => {
    colorsData.value[kit.id] = generateColors(kit.id, kit.colorCount, 'A')
  })
  kitsData.value.hama.forEach(kit => {
    colorsData.value[kit.id] = generateColors(kit.id, kit.colorCount, 'H')
  })
  kitsData.value.perler.forEach(kit => {
    colorsData.value[kit.id] = generateColors(kit.id, kit.colorCount, 'P')
  })
  kitsData.value.nabbi.forEach(kit => {
    colorsData.value[kit.id] = generateColors(kit.id, kit.colorCount, 'N')
  })

  // 设置默认选中的套装
  activeKit.value = 'mard_221'
}

/**
 * 生成颜色数据
 * @param kitId 套装ID
 * @param count 颜色数量
 * @param prefix 颜色代码前缀
 * @returns 颜色数组
 */
const generateColors = (kitId: string, count: number, prefix: string): any[] => {
  const colors = []
  const colorNames = ['红', '橙', '黄', '绿', '蓝', '紫', '粉', '棕', '灰', '黑', '白']
  for (let i = 1; i <= count; i++) {
    const hue = (i * 137.5) % 360
    colors.push({
      id: `${kitId}_${i}`,
      code: `${prefix}${String(i).padStart(3, '0')}`,
      name: colorNames[i % colorNames.length] + (Math.floor(i / 10) + 1),
      hex: `hsl(${hue}, 70%, 50%)`,
      brand: kitId.split('_')[0],
      kitId: kitId
    })
  }
  return colors
}

onMounted(() => {
  initData()
})
</script>

<style scoped>
.bead-inventory-page {
  min-height: 100vh;
  background: #F5F5F5;
  padding-bottom: 120rpx;
}

/* 品牌选择器 */
.brand-selector {
  background: #fff;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F0F0F0;
}

.brand-scroll {
  white-space: nowrap;
}

.brand-list {
  display: inline-flex;
  padding: 0 24rpx;
  gap: 16rpx;
}

.brand-item {
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  background: #F5F5F5;
}

.brand-item.active {
  background: #2D2D2D;
}

.brand-name {
  font-size: 26rpx;
  color: #666;
}

.brand-item.active .brand-name {
  color: #fff;
}

/* 套装选择器 */
.kit-selector {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #F0F0F0;
}

.kit-label {
  font-size: 26rpx;
  color: #999;
  margin-right: 16rpx;
}

.kit-scroll {
  flex: 1;
  white-space: nowrap;
}

.kit-list {
  display: inline-flex;
  gap: 16rpx;
}

.kit-item {
  padding: 8rpx 20rpx;
  border-radius: 24rpx;
  background: #F5F5F5;
}

.kit-item.active {
  background: #2D2D2D;
}

.kit-name {
  font-size: 24rpx;
  color: #666;
}

.kit-item.active .kit-name {
  color: #fff;
}

/* 统计栏 */
.stats-bar {
  display: flex;
  justify-content: space-around;
  background: #fff;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 36rpx;
  font-weight: 600;
  color: #2D2D2D;
  display: block;
}

.stat-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

/* 颜色列表 */
.color-list {
  height: calc(100vh - 320rpx);
  padding: 0 24rpx;
}

.empty-state {
  padding: 120rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.color-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
}

.color-card.owned {
  background: #F0FFF0;
  border: 1rpx solid #52C41A;
}

.color-preview {
  width: 72rpx;
  height: 72rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.owned-mark {
  width: 32rpx;
  height: 32rpx;
  background: #52C41A;
  border-radius: 50%;
  color: #fff;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.color-info {
  flex: 1;
}

.color-name {
  font-size: 28rpx;
  color: #2D2D2D;
  display: block;
  margin-bottom: 4rpx;
}

.color-code {
  font-size: 22rpx;
  color: #999;
}

.stock-control {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.stock-btn {
  width: 48rpx;
  height: 48rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stock-btn.minus {
  background: #F5F5F5;
}

.stock-btn.plus {
  background: #2D2D2D;
}

.btn-icon {
  font-size: 28rpx;
  color: #666;
}

.stock-btn.plus .btn-icon {
  color: #fff;
}

.stock-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D2D2D;
  min-width: 60rpx;
  text-align: center;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #F0F0F0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-actions {
  display: flex;
  gap: 16rpx;
}

.batch-btn {
  padding: 16rpx 32rpx;
  border-radius: 8rpx;
  background: #F5F5F5;
}

.batch-btn .btn-text {
  font-size: 26rpx;
  color: #666;
}

.save-btn {
  padding: 16rpx 48rpx;
  border-radius: 8rpx;
  background: #2D2D2D;
}

.save-btn .btn-text {
  font-size: 26rpx;
  color: #fff;
}
</style>
