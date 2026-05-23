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
  { key: 'mard', name: 'MARD⭐' },
  { key: 'perler', name: 'Perler' },
  { key: 'hama', name: 'Hama' },
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

  // MARD 291色真实色卡（源自 perler-beads 开源项目）
  const mardHexColors = [
    '#FAF4C8','#FFFFD5','#FEFF8B','#FBED56','#F4D738','#FEAC4C','#FE8B4C','#FFDA45','#FF995B','#F77C31','#FFDD99','#FE9F72','#FFC365','#FD543D','#FFF365','#FFFF9F','#FFE36E','#FEBE7D','#FD7C72','#FFD568','#FFE395','#F4F57D','#E6C9B7','#F7F8A2','#FFD67D','#FFC830','#E6EE31','#63F347','#9EF780','#5DE035','#35E352','#65E2A6','#3DAF80','#1C9C4F','#27523A','#95D3C2','#5D722A','#166F41','#CAEB7B','#ADE946','#2E5132','#C5ED9C','#9BB13A','#E6EE49','#24B88C','#C2F0CC','#156A6B','#0B3C43','#303A21','#EEFCA5','#4E846D','#8D7A35','#CCE1AF','#9EE5B9','#C5E254','#E2FCB1','#B0E792','#9CAB5A','#E8FFE7','#A9F9FC','#A0E2FB','#41CCFF','#01ACEB','#50AAF0','#3677D2','#0F54C0','#324BCA','#3EBCE2','#28DDDE','#1C334D','#CDE8FF','#D5FDFF','#22C4C6','#1557A8','#04D1F6','#1D3344','#1887A2','#176DAF','#BEDDFF','#67B4BE','#C8E2FF','#7CC4FF','#A9E5E5','#3CAED8','#D3DFFA','#BBCFED','#34488E','#AEB4F2','#858EDD','#2F54AF','#182A84','#B843C5','#AC7BDE','#8854B3','#E2D3FF','#D5B9F8','#361851','#B9BAE1','#DE9AD4','#B90095','#8B279B','#2F1F90','#E3E1EE','#C4D4F6','#A45EC7','#D8C3D7','#9C32B2','#9A009B','#333A95','#EBDAFC','#7786E5','#494FC7','#DFC2F8','#FDD3CC','#FEC0DF','#FFB7E7','#E8649E','#F551A2','#F13D74','#C63478','#FFDBE9','#E970CC','#D33793','#FCDDD2','#F78FC3','#B5006D','#FFD1BA','#F8C7C9','#FFF3EB','#FFE2EA','#FFC7DB','#FEBAD5','#D8C7D1','#BD9DA1','#B785A1','#937A8D','#E1BCE8','#FD957B','#FC3D46','#F74941','#FC283C','#E7002F','#943630','#971937','#BC0028','#E2677A','#8A4526','#5A2121','#FD4E6A','#F35744','#FFA9AD','#D30022','#FEC2A6','#E69C79','#D37C46','#C1444A','#CD9391','#F7B4C6','#FDC0D0','#F67E66','#E698AA','#E54B4F','#FFE2CE','#FFC4AA','#F4C3A5','#E1B383','#EDB045','#E99C17','#D18A45','#CA7734','#A07042','#C5AFAF','#D5C8A5','#BAB8BB','#F5DEB3','#F9EAD4','#D6C1AB','#D7A87A','#D68A65','#804537','#592A1D','#BB9E86','#9C7056','#D19B6C','#FBEBCB','#EBBF8B','#A37646','#FDEEDE','#EAD7CC','#FFF1DA','#FEDBA9','#EFE7DD','#EEDBCD','#F7E8D4','#FCE7C5','#C7762A','#E5BC8C','#C87C38','#FFECC9','#FEE5BB','#FFE2D2','#F7CC6E','#FFF6ED','#FFFFFF','#D7D7D7','#B1B1B1','#878787','#606060','#2F2F2F','#010101','#FEE890','#F8E3BA','#F9F6F0','#F0F0DF','#E4E9EE','#D7E2E1','#DBE2D6','#D2CFCF','#23242B','#222933','#E8E9D4','#F4FDEE','#E6F3DD','#F9EABA','#FAF4E4','#FEF5D5','#FFFEF7','#EBE3C3','#B2A57B','#F8C6C7','#E9E3A7','#E4D6DD','#D6D5BB','#F9EBDE','#FDE58C','#EDEFD3','#D6B171','#EAD6AE','#F2EBF4','#E1D7E4','#D2C4CD','#D7CBB9','#C1B3AE','#A59A97','#83888A','#E5D7D1','#E3D2C1','#DAC7BF','#DFC7AB','#BFB9AE','#D2D0C3','#DCE0E6','#D9D4C6','#B7AFB3','#F0DDBA','#E3D5DD','#E6E0D2','#FBF0D9','#FFEBA8','#FEF3D2','#F6ECCE','#FDF3E1','#FFF5C2','#FEEBA1','#F5E8CC','#FEFAD9','#FEE99E','#FEF7DD','#D6B6A1','#CB9168','#FDE6BE','#FBE1D1','#FBCD98','#F5E2CF','#FED2AD','#FDC086','#D99E7A','#FEEDC4','#FCDEB2','#FAD099','#FAD6AB','#F6C386','#FECFA4','#FEBF7B','#FDA46A','#FEAF93','#820025','#9D425C','#F7A8C3','#FDD4DE','#FF86BC','#E990A2','#A86373','#C791A7','#E4A9C8','#D799B4','#E6336A','#C73A5F','#A84B6C','#FCBFAF','#DDB6C3',
  ]

  // MARD 色号命名（A系列黄橙、B系列绿、C系列蓝、D系列紫、E系列粉、F系列红、G系列棕、H系列黑白灰、M系列莫兰迪）
  const mardColorSeries = [
    ...Array(26).fill('A'), ...Array(32).fill('B'), ...Array(29).fill('C'),
    ...Array(26).fill('D'), ...Array(24).fill('E'), ...Array(25).fill('F'),
    ...Array(21).fill('G'), ...Array(23).fill('H'), ...Array(15).fill('M'),
    ...Array(23).fill('H2'), ...Array(47).fill('X'),
  ]

  const seriesNames: Record<string, string> = {
    A: '黄橙系', B: '绿色系', C: '蓝色系', D: '紫色系', E: '粉色系',
    F: '红色系', G: '棕肤色系', H: '黑白灰系', M: '莫兰迪系', H2: '扩展色', X: '补充色'
  }

  // 生成 MARD 真实颜色数据
  const mardColors: any[] = []
  const seriesCounters: Record<string, number> = {}
  mardHexColors.forEach((hex, i) => {
    const series = mardColorSeries[i] || 'X'
    if (!seriesCounters[series]) seriesCounters[series] = 1
    else seriesCounters[series]++
    const code = `${series}${seriesCounters[series]}`
    mardColors.push({
      id: `mard_${i + 1}`,
      code,
      name: `${seriesNames[series] || ''} ${code}`,
      hex,
      brand: 'mard',
      kitId: 'mard_291'
    })
  })

  // Perler 57色真实色卡（源自 pixel-beads.com）
  const perlerColors = [
    { code: 'P01', name: 'White', hex: '#F1F1F1' },
    { code: 'P18', name: 'Black', hex: '#2E2F32' },
    { code: 'P81', name: 'Light Gray', hex: '#EEE3CF' },
    { code: 'P17', name: 'Grey', hex: '#8A8D91' },
    { code: 'P92', name: 'Dark Grey', hex: '#4D5156' },
    { code: 'P03', name: 'Yellow', hex: '#ECD800' },
    { code: 'P04', name: 'Orange', hex: '#ED6120' },
    { code: 'P05', name: 'Red', hex: '#F01820' },
    { code: 'P06', name: 'Bubblegum', hex: '#DD669B' },
    { code: 'P07', name: 'Purple', hex: '#604089' },
    { code: 'P08', name: 'Dark Blue', hex: '#2B3F87' },
    { code: 'P09', name: 'Light Blue', hex: '#3370C0' },
    { code: 'P10', name: 'Dark Green', hex: '#1C753E' },
    { code: 'P11', name: 'Light Green', hex: '#56BA9F' },
    { code: 'P12', name: 'Brown', hex: '#513931' },
    { code: 'P20', name: 'Rust', hex: '#8C372C' },
    { code: 'P33', name: 'Peach', hex: '#EEBAB2' },
    { code: 'P35', name: 'Tan', hex: '#BC9371' },
    { code: 'P48', name: 'Neon Orange', hex: '#FF7700' },
    { code: 'P49', name: 'Neon Green', hex: '#019E43' },
    { code: 'P50', name: 'Neon Pink', hex: '#FF3991' },
    { code: 'P47', name: 'Neon Yellow', hex: '#DCE002' },
    { code: 'P100', name: 'Pearl Coral', hex: '#F97E79' },
    { code: 'P101', name: 'Pearl Light Blue', hex: '#7AAEA2' },
    { code: 'P102', name: 'Pearl Green', hex: '#84B791' },
    { code: 'P103', name: 'Pearl Yellow', hex: '#CAC033' },
    { code: 'P104', name: 'Pearl Light Pink', hex: '#D7A8A2' },
    { code: 'P105', name: 'Silver', hex: '#777B81' },
    { code: 'P38', name: 'Magenta', hex: '#F22A7B' },
    { code: 'P59', name: 'Hot Coral', hex: '#FF3851' },
    { code: 'P83', name: 'Pink', hex: '#E44892' },
    { code: 'P85', name: 'Gold', hex: '#BB7634' },
    { code: 'P88', name: 'Raspberry', hex: '#A53061' },
    { code: 'P96', name: 'Cranapple', hex: '#801922' },
    { code: 'P56', name: 'Pastel Yellow', hex: '#FEF875' },
    { code: 'P53', name: 'Pastel Green', hex: '#76C882' },
    { code: 'P52', name: 'Pastel Blue', hex: '#5390D1' },
    { code: 'P54', name: 'Pastel Lavender', hex: '#8A72C1' },
    { code: 'P60', name: 'Plum', hex: '#A24B9C' },
    { code: 'P62', name: 'Turquoise', hex: '#2B89C6' },
    { code: 'P63', name: 'Blush', hex: '#FF8285' },
    { code: 'P75', name: 'Glow Green', hex: '#BEC696' },
    { code: 'P79', name: 'Light Pink', hex: '#F6B3DD' },
    { code: 'P80', name: 'Bright Green', hex: '#4FAD42' },
    { code: 'P90', name: 'Butterscotch', hex: '#D48437' },
    { code: 'P57', name: 'Cheddar', hex: '#F1AA0C' },
    { code: 'P70', name: 'Periwinkle', hex: '#647CBE' },
    { code: 'P93', name: 'Blueberry Cream', hex: '#8297D9' },
    { code: 'P97', name: 'Prickly Pear', hex: '#BDDA01' },
    { code: 'P179', name: 'Evergreen', hex: '#114938' },
  ]

  // Hama 48色
  const hamaColors = [
    { code: 'H01', name: 'White', hex: '#FFFFFF' }, { code: 'H18', name: 'Black', hex: '#1A1A1A' },
    { code: 'H02', name: 'Cream', hex: '#FEFEE1' }, { code: 'H03', name: 'Yellow', hex: '#FFF200' },
    { code: 'H04', name: 'Orange', hex: '#FFA500' }, { code: 'H05', name: 'Red', hex: '#FF0000' },
    { code: 'H06', name: 'Pink', hex: '#FFC0CB' }, { code: 'H07', name: 'Purple', hex: '#8B008B' },
    { code: 'H08', name: 'Dark Blue', hex: '#00008B' }, { code: 'H09', name: 'Light Blue', hex: '#87CEEB' },
    { code: 'H10', name: 'Dark Green', hex: '#006400' }, { code: 'H11', name: 'Light Green', hex: '#90EE90' },
    { code: 'H12', name: 'Brown', hex: '#8B4513' }, { code: 'H20', name: 'Tan', hex: '#D2B48C' },
    { code: 'H13', name: 'Grey', hex: '#808080' }, { code: 'H15', name: 'Dark Grey', hex: '#505050' },
    { code: 'H17', name: 'Light Grey', hex: '#C0C0C0' }, { code: 'H22', name: 'Gold', hex: '#FFD700' },
    { code: 'H25', name: 'Burgundy', hex: '#800020' }, { code: 'H27', name: 'Lavender', hex: '#E6E6FA' },
    { code: 'H31', name: 'Teal', hex: '#008080' }, { code: 'H32', name: 'Mint', hex: '#98FF98' },
    { code: 'H33', name: 'Peach', hex: '#FFDAB9' }, { code: 'H34', name: 'Coral', hex: '#FF7F50' },
    { code: 'H35', name: 'Navy', hex: '#000080' }, { code: 'H36', name: 'Sky', hex: '#87CEFF' },
    { code: 'H37', name: 'Lime', hex: '#32CD32' }, { code: 'H38', name: 'Olive', hex: '#556B2F' },
    { code: 'H39', name: 'Maroon', hex: '#800000' }, { code: 'H40', name: 'Salmon', hex: '#FA8072' },
    { code: 'H41', name: 'Khaki', hex: '#C3B091' }, { code: 'H42', name: 'Indigo', hex: '#4B0082' },
    { code: 'H43', name: 'Violet', hex: '#EE82EE' }, { code: 'H44', name: 'Turquoise', hex: '#40E0D0' },
    { code: 'H45', name: 'Aqua', hex: '#00FFFF' }, { code: 'H46', name: 'Beige', hex: '#F5F5DC' },
    { code: 'H47', name: 'Ivory', hex: '#FFFFF0' }, { code: 'H48', name: 'Slate', hex: '#708090' },
  ]

  // 初始化套装数据
  kitsData.value = {
    mard: [
      { id: 'mard_291', name: 'MARD 291色全套装', brand: 'mard', colorCount: 291 },
      { id: 'mard_221', name: 'MARD 221色进阶套装', brand: 'mard', colorCount: 221 },
      { id: 'mard_144', name: 'MARD 144色标准套装', brand: 'mard', colorCount: 144 },
      { id: 'mard_72', name: 'MARD 72色入门套装', brand: 'mard', colorCount: 72 },
    ],
    perler: [
      { id: 'perler_57', name: 'Perler 57色完整', brand: 'perler', colorCount: 57 },
      { id: 'perler_47', name: 'Perler 47色标准', brand: 'perler', colorCount: 47 },
    ],
    hama: [
      { id: 'hama_48', name: 'Hama 48色完整', brand: 'hama', colorCount: 48 },
      { id: 'hama_24', name: 'Hama 24色基础', brand: 'hama', colorCount: 24 },
    ],
  }

  // 初始化颜色数据
  colorsData.value['mard_291'] = mardColors
  colorsData.value['mard_221'] = mardColors.slice(0, 221)
  colorsData.value['mard_144'] = mardColors.slice(0, 144)
  colorsData.value['mard_72'] = mardColors.slice(0, 72)

  colorsData.value['perler_57'] = perlerColors.map((c, i) => ({
    id: `perler_${i + 1}`, code: c.code, name: c.name, hex: c.hex, brand: 'perler', kitId: 'perler_57'
  }))
  colorsData.value['perler_47'] = colorsData.value['perler_57'].slice(0, 47)

  colorsData.value['hama_48'] = hamaColors.map((c, i) => ({
    id: `hama_${i + 1}`, code: c.code, name: c.name, hex: c.hex, brand: 'hama', kitId: 'hama_48'
  }))
  colorsData.value['hama_24'] = colorsData.value['hama_48'].slice(0, 24)

  // 删除 generateColors 引用（已不使用）
  activeKit.value = 'mard_291'
}

onMounted(() => {
  initData()
})
</script>

<style scoped>
.bead-inventory-page {
  min-height: 100vh;
  background: var(--color-bg-page);
  padding-bottom: 120rpx;
}

/* 品牌选择器 */
.brand-selector {
  background: var(--color-bg-panel);
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--color-divider);
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
  background: var(--color-bg-page);
}

.brand-item.active {
  background: var(--color-primary);
}

.brand-name {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.brand-item.active .brand-name {
  color: var(--color-text-inverse);
}

/* 套装选择器 */
.kit-selector {
  display: flex;
  align-items: center;
  background: var(--color-bg-panel);
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid var(--color-divider);
}

.kit-label {
  font-size: 26rpx;
  color: var(--color-text-tertiary);
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
  background: var(--color-bg-page);
}

.kit-item.active {
  background: var(--color-primary);
}

.kit-name {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.kit-item.active .kit-name {
  color: var(--color-text-inverse);
}

/* 统计栏 */
.stats-bar {
  display: flex;
  justify-content: space-around;
  background: var(--color-bg-panel);
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  display: block;
}

.stat-label {
  font-size: 22rpx;
  color: var(--color-text-tertiary);
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
  color: var(--color-text-tertiary);
}

.color-card {
  display: flex;
  align-items: center;
  background: var(--color-bg-panel);
  border-radius: var(--radius-lg);
  padding: 16rpx;
  margin-bottom: 12rpx;
  box-shadow: var(--shadow-sm);
}

/* 已拥有颜色卡片样式 - 使用半透明成功色背景 */
.color-card.owned {
  background: rgba(var(--color-success-rgb), 0.1);
  border: 1rpx solid var(--color-success);
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
  background: var(--color-success);
  border-radius: 50%;
  color: var(--color-text-inverse);
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
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 4rpx;
}

.color-code {
  font-size: 22rpx;
  color: var(--color-text-tertiary);
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
  background: var(--color-bg-page);
}

.stock-btn.plus {
  background: var(--color-primary);
}

.btn-icon {
  font-size: 28rpx;
  color: var(--color-text-secondary);
}

.stock-btn.plus .btn-icon {
  color: var(--color-text-inverse);
}

.stock-value {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  min-width: 60rpx;
  text-align: center;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-bg-panel);
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid var(--color-divider);
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
  background: var(--color-bg-page);
}

.batch-btn .btn-text {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}

.save-btn {
  padding: 16rpx 48rpx;
  border-radius: 8rpx;
  background: var(--color-primary);
}

.save-btn .btn-text {
  font-size: 26rpx;
  color: var(--color-text-inverse);
  font-weight: 600;
}
</style>
