<template>
  <view class="image-import-page">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">导入图片</text>
      <text class="page-subtitle">选择图片并转换为拼豆图纸</text>
    </view>

    <!-- 图片选择区域 -->
    <view class="upload-section">
      <view v-if="!selectedImage" class="upload-area" @click="chooseImage">
        <view class="upload-icon"><text class="icon-text">📷</text></view>
        <text class="upload-text">点击选择图片</text>
        <text class="upload-hint">支持 JPG、PNG 格式</text>
      </view>
    </view>

    <!-- 对比预览区域（选择图片后显示） -->
    <view v-if="selectedImage" class="compare-section">
      <view class="compare-row">
        <!-- 左：原图 -->
        <view class="compare-col">
          <text class="compare-label">原图</text>
          <view class="compare-image-wrap">
            <image
              :src="selectedImage"
              mode="aspectFit"
              class="compare-img"
              @longpress="showFullImage"
            ></image>
          </view>
        </view>
        <!-- 右：生成结果 -->
        <view class="compare-col">
          <text class="compare-label">生成结果</text>
          <view class="compare-image-wrap" :class="{ 'has-result': generatedBlueprint }">
            <image
              v-if="generatedBlueprint && blueprintPreviewUrl"
              :src="blueprintPreviewUrl"
              mode="aspectFit"
              class="bp-preview-img"
              :style="{ width: resultCanvasSize.width + 'px', height: resultCanvasSize.height + 'px' }"
              @touchstart="onPreviewTouch"
            ></image>
            <text v-else class="no-result-text">点击下方按钮生成</text>
          </view>
        </view>
      </view>
      <view class="compare-actions">
        <text class="action-link" @click="chooseImage">更换图片</text>
        <text class="action-link" @click="removeImage">删除</text>
      </view>
    </view>

    <!-- 图纸设置 -->
    <view v-if="selectedImage" class="settings-section">
      <text class="section-title">图纸设置</text>

      <!-- 输出尺寸 -->
      <view class="setting-item">
        <text class="setting-label">输出尺寸（拼豆格子数）</text>
        <view class="size-inputs">
          <view class="input-group">
            <text class="input-label">宽</text>
            <input type="number" v-model="outputWidth" class="size-input" @input="onSizeChange('w')"/>
            <text class="input-unit">格</text>
          </view>
          <text class="size-separator">×</text>
          <view class="input-group">
            <text class="input-label">高</text>
            <input type="number" v-model="outputHeight" class="size-input" @input="onSizeChange('h')"/>
            <text class="input-unit">格</text>
          </view>
        </view>
        <view class="size-presets">
          <text
            :class="['preset-btn', activePreset === '小(20×20)' ? 'active' : '']"
            @click="applyPreset({ label: '小(20×20)', width: 20, height: 20 })"
          >小(20)格</text>
          <text
            :class="['preset-btn', activePreset === '中(30×30)' ? 'active' : '']"
            @click="applyPreset({ label: '中(30×30)', width: 30, height: 30 })"
          >中(30)格</text>
          <text
            :class="['preset-btn', activePreset === '大(40×40)' ? 'active' : '']"
            @click="applyPreset({ label: '大(40×40)', width: 40, height: 40 })"
          >大(40)格</text>
          <text
            :class="['preset-btn', activePreset === '超大(60×60)' ? 'active' : '']"
            @click="applyPreset({ label: '超大(60×60)', width: 60, height: 60 })"
          >超大(60)格</text>
          <text
            :class="['preset-btn', isCustomSize ? 'active' : '']"
            @click="isCustomSize = true"
          >自定义</text>
        </view>
      </view>

      <!-- 品牌色卡选择 P2 -->
      <view class="setting-item">
        <text class="setting-label">品牌色卡</text>
        <view class="brand-options">
          <text
            v-for="brand in brandList"
            :key="brand.id"
            :class="['brand-btn', activeBrand === brand.id ? 'active' : '']"
            @click="switchBrand(brand.id)"
          >{{ brand.name }}</text>
        </view>
      </view>

      <!-- 算法选择 P2 -->
      <view class="setting-item">
        <text class="setting-label">生成算法</text>
        <view class="algo-options">
          <text
            v-for="algo in algoList"
            :key="algo.id"
            :class="['algo-btn', activeAlgo === algo.id ? 'active' : '']"
            @click="activeAlgo = algo.id"
          >{{ algo.name }}</text>
        </view>
        <text class="algo-desc">{{ algoList.find(a => a.id === activeAlgo)?.desc }}</text>
      </view>

      <!-- 检测到的颜色 -->
      <view v-if="detectedColors.length > 0" class="setting-item">
        <text class="setting-label">检测到 {{ detectedColors.length }} 种颜色</text>
        <view class="detected-colors">
          <view v-for="(color, index) in detectedColors" :key="index" class="detected-color-item">
            <view class="color-swatch" :style="{ backgroundColor: color }"></view>
            <text class="color-value">{{ color }}</text>
          </view>
        </view>
      </view>

      <!-- 统计信息 -->
      <view v-if="generatedBlueprint" class="setting-item">
        <text class="setting-label">统计</text>
        <view class="result-stats">
          <text class="stat-item">总格子数：{{ totalCells }}</text>
          <text class="stat-item">有效像素：{{ generatedBlueprint.beads?.length || 0 }}</text>
        </view>
      </view>
    </view>

    <!-- 底部操作区 -->
    <view class="bottom-actions">
      <!-- 未生成 -->
      <view
        v-if="!generatedBlueprint"
        class="btn-generate"
        :class="{ disabled: !selectedImage || isProcessing }"
        @tap="!selectedImage || isProcessing ? null : generateBlueprint()"
      >
        <text v-if="isProcessing">分析中...</text>
        <text v-else>生成图纸</text>
      </view>
      <!-- 已生成 -->
      <view v-else class="btn-row">
        <view class="btn-regenerate" @tap="generateBlueprint">
          <text v-if="isProcessing">分析中...</text>
          <text v-else>重新生成</text>
        </view>
        <view class="btn-start-creation" @tap="startCreation">
          <text>开始创作</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { setBlueprintData } from '@/utils/blueprint-transfer'
import { mardFullPalette, getMardCodeByHex } from '@/utils/mard-colors'

// ==================== 品牌色卡（真实色卡数据） ====================
// MARD 291色完整色卡，源自 perler-beads 开源项目 (AGPL-3.0)
// https://github.com/Zippland/perler-beads
// 色卡数据已迁移到 @/utils/mard-colors.ts，包含 HEX 和 MARD 色号映射
// 如需访问完整色卡数据：import { mardColorPalette } from '@/utils/mard-colors'
const unusedMardFullPalette: string[] = [
  '#FAF4C8','#FFFFD5','#FEFF8B','#FBED56','#F4D738','#FEAC4C','#FE8B4C','#FFDA45','#FF995B','#F77C31','#FFDD99','#FE9F72','#FFC365','#FD543D','#FFF365','#FFFF9F','#FFE36E','#FEBE7D','#FD7C72','#FFD568','#FFE395','#F4F57D','#E6C9B7','#F7F8A2','#FFD67D','#FFC830','#E6EE31','#63F347','#9EF780','#5DE035','#35E352','#65E2A6','#3DAF80','#1C9C4F','#27523A','#95D3C2','#5D722A','#166F41','#CAEB7B','#ADE946','#2E5132','#C5ED9C','#9BB13A','#E6EE49','#24B88C','#C2F0CC','#156A6B','#0B3C43','#303A21','#EEFCA5','#4E846D','#8D7A35','#CCE1AF','#9EE5B9','#C5E254','#E2FCB1','#B0E792','#9CAB5A','#E8FFE7','#A9F9FC','#A0E2FB','#41CCFF','#01ACEB','#50AAF0','#3677D2','#0F54C0','#324BCA','#3EBCE2','#28DDDE','#1C334D','#CDE8FF','#D5FDFF','#22C4C6','#1557A8','#04D1F6','#1D3344','#1887A2','#176DAF','#BEDDFF','#67B4BE','#C8E2FF','#7CC4FF','#A9E5E5','#3CAED8','#D3DFFA','#BBCFED','#34488E','#AEB4F2','#858EDD','#2F54AF','#182A84','#B843C5','#AC7BDE','#8854B3','#E2D3FF','#D5B9F8','#361851','#B9BAE1','#DE9AD4','#B90095','#8B279B','#2F1F90','#E3E1EE','#C4D4F6','#A45EC7','#D8C3D7','#9C32B2','#9A009B','#333A95','#EBDAFC','#7786E5','#494FC7','#DFC2F8','#FDD3CC','#FEC0DF','#FFB7E7','#E8649E','#F551A2','#F13D74','#C63478','#FFDBE9','#E970CC','#D33793','#FCDDD2','#F78FC3','#B5006D','#FFD1BA','#F8C7C9','#FFF3EB','#FFE2EA','#FFC7DB','#FEBAD5','#D8C7D1','#BD9DA1','#B785A1','#937A8D','#E1BCE8','#FD957B','#FC3D46','#F74941','#FC283C','#E7002F','#943630','#971937','#BC0028','#E2677A','#8A4526','#5A2121','#FD4E6A','#F35744','#FFA9AD','#D30022','#FEC2A6','#E69C79','#D37C46','#C1444A','#CD9391','#F7B4C6','#FDC0D0','#F67E66','#E698AA','#E54B4F','#FFE2CE','#FFC4AA','#F4C3A5','#E1B383','#EDB045','#E99C17','#D18A45','#CA7734','#A07042','#C5AFAF','#D5C8A5','#BAB8BB','#F5DEB3','#F9EAD4','#D6C1AB','#D7A87A','#D68A65','#804537','#592A1D','#BB9E86','#9C7056','#D19B6C','#FBEBCB','#EBBF8B','#A37646','#FDEEDE','#EAD7CC','#FFF1DA','#FEDBA9','#EFE7DD','#EEDBCD','#F7E8D4','#FCE7C5','#C7762A','#E5BC8C','#C87C38','#FFECC9','#FEE5BB','#FFE2D2','#F7CC6E','#FFF6ED','#FFFFFF','#D7D7D7','#B1B1B1','#878787','#606060','#2F2F2F','#010101','#FEE890','#F8E3BA','#F9F6F0','#F0F0DF','#E4E9EE','#D7E2E1','#DBE2D6','#D2CFCF','#23242B','#222933','#E8E9D4','#F4FDEE','#E6F3DD','#F9EABA','#FAF4E4','#FEF5D5','#FFFEF7','#EBE3C3','#B2A57B','#F8C6C7','#E9E3A7','#E4D6DD','#D6D5BB','#F9EBDE','#FDE58C','#EDEFD3','#D6B171','#EAD6AE','#F2EBF4','#E1D7E4','#D2C4CD','#D7CBB9','#C1B3AE','#A59A97','#83888A','#E5D7D1','#E3D2C1','#DAC7BF','#DFC7AB','#BFB9AE','#D2D0C3','#DCE0E6','#D9D4C6','#B7AFB3','#F0DDBA','#E3D5DD','#E6E0D2','#FBF0D9','#FFEBA8','#FEF3D2','#F6ECCE','#FDF3E1','#FFF5C2','#FEEBA1','#F5E8CC','#FEFAD9','#FEE99E','#FEF7DD','#D6B6A1','#CB9168','#FDE6BE','#FBE1D1','#FBCD98','#F5E2CF','#FED2AD','#FDC086','#D99E7A','#FEEDC4','#FCDEB2','#FAD099','#FAD6AB','#F6C386','#FECFA4','#FEBF7B','#FDA46A','#FEAF93','#820025','#9D425C','#F7A8C3','#FDD4DE','#FF86BC','#E990A2','#A86373','#C791A7','#E4A9C8','#D799B4','#E6336A','#C73A5F','#A84B6C','#FCBFAF','#DDB6C3',
]

const brandColorData: Record<string, string[]> = {
  default: mardFullPalette,  // 默认使用 MARD 291色完整色卡
  mard72: mardFullPalette.slice(0, 72),
  mard144: mardFullPalette.slice(0, 144),
  mard221: mardFullPalette.slice(0, 221),
  mard291: mardFullPalette,
}

const brandList = [
  { id: 'default', name: 'MARD(291色)⭐' },
  { id: 'mard72', name: '入门(72色)' },
  { id: 'mard144', name: '进阶(144色)' },
  { id: 'mard221', name: '全色(221色)' },
]

// 当前色池
const getActiveColorPool = (): string[] => {
  return brandColorData[activeBrand.value] || brandColorData.default
}

// ==================== 算法选项 P2 ====================
const algoList = [
  { id: 'quantize', name: '标准', desc: '最近邻颜色量化，颜色丰富度最高（推荐）' },
  { id: 'enhanced', name: '增强', desc: '保边缘去噪，移除孤立噪点不损失颜色' },
  { id: 'dither', name: '抖动', desc: 'Floyd-Steinberg 抖动，照片类优化' },
]

// ==================== 状态 ====================
const selectedImage = ref('')
const outputWidth = ref(30)
const outputHeight = ref(30)
const activePreset = ref('中(30×30)')
const imageAspectRatio = ref(1)  // 原图宽高比
const isCustomSize = ref(false)   // 是否自定义尺寸
const detectedColors = ref<string[]>([])
const isProcessing = ref(false)
const generatedBlueprint = ref<any>(null)
const activeBrand = ref('default')
const activeAlgo = ref('quantize')
const blueprintPreviewUrl = ref('')   // 生成结果的 data URL 预览图

// ==================== 计算属性 ====================
const totalCells = computed(() => outputWidth.value * outputHeight.value)

const resultCanvasSize = computed(() => {
  const maxSize = 260
  const ratio = outputWidth.value / outputHeight.value
  if (ratio > 1) return { width: maxSize, height: Math.round(maxSize / ratio) }
  return { width: Math.round(maxSize * ratio), height: maxSize }
})

// ==================== 图片操作 ====================
const chooseImage = () => {
  uni.chooseImage({
    count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
    success: (res) => {
      selectedImage.value = res.tempFilePaths[0]
      generatedBlueprint.value = null
      detectedColors.value = []
      blueprintPreviewUrl.value = ''
      // 获取图片宽高比，自动适配尺寸
      uni.getImageInfo({
        src: res.tempFilePaths[0],
        success: (info) => {
          imageAspectRatio.value = info.width / info.height
          // 以短边30为基准自动适配
          if (imageAspectRatio.value >= 1) {
            outputWidth.value = 30
            outputHeight.value = Math.round(30 / imageAspectRatio.value)
          } else {
            outputHeight.value = 30
            outputWidth.value = Math.round(30 * imageAspectRatio.value)
          }
        }
      })
    }
  })
}

const removeImage = () => {
  selectedImage.value = ''
  generatedBlueprint.value = null
  detectedColors.value = []
  blueprintPreviewUrl.value = ''
}

const showFullImage = () => {
  if (!selectedImage.value) return
  uni.previewImage({ urls: [selectedImage.value], current: 0 })
}

const applyPreset = (size: { label: string, width: number, height: number }) => {
  activePreset.value = size.label
  isCustomSize.value = false
  outputWidth.value = size.width
  outputHeight.value = size.height
}

// onSizeChange：窄边变化时自动计算高，反之亦然
const onSizeChange = (changed: 'w' | 'h') => {
  activePreset.value = ''
  isCustomSize.value = true
  const ratio = imageAspectRatio.value || 1
  if (changed === 'w') {
    if (outputWidth.value < 4) outputWidth.value = 4
    if (outputWidth.value > 200) outputWidth.value = 200
    outputHeight.value = Math.round(outputWidth.value / ratio)
  } else {
    if (outputHeight.value < 4) outputHeight.value = 4
    if (outputHeight.value > 200) outputHeight.value = 200
    outputWidth.value = Math.round(outputHeight.value * ratio)
  }
}

const switchBrand = (brandId: string) => {
  activeBrand.value = brandId
  // 切换品牌后清除结果，需重新生成
  if (generatedBlueprint.value) {
    generatedBlueprint.value = null
    detectedColors.value = []
    blueprintPreviewUrl.value = ''
  }
}

// ==================== 颜色工具函数 ====================
const rgbToHex = (r: number, g: number, b: number): string =>
  '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0').toUpperCase()).join('')

const colorDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number =>
  Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)

const findClosestBeadColor = (r: number, g: number, b: number, pool: string[]): string => {
  let minDist = Infinity, closest = pool[0]
  for (const hex of pool) {
    const pr = parseInt(hex.slice(1, 3), 16)
    const pg = parseInt(hex.slice(3, 5), 16)
    const pb = parseInt(hex.slice(5, 7), 16)
    const d = colorDistance(r, g, b, pr, pg, pb)
    if (d < minDist) { minDist = d; closest = hex }
  }
  return closest
}

// ==================== 滤镜算法 ====================
// 中值滤波 P0
const medianFilter = (pixels: string[][], w: number, h: number): string[][] => {
  const result: string[][] = Array.from({ length: h }, () => [])
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const freq: Record<string, number> = {}
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy, nx = x + dx
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            const c = pixels[ny][nx]; freq[c] = (freq[c] || 0) + 1
          }
        }
      }
      let best = result[y][0] || pixels[y][x], bestCnt = 0
      for (const [c, cnt] of Object.entries(freq)) { if (cnt > bestCnt) { bestCnt = cnt; best = c } }
      result[y][x] = best
    }
  }
  return result
}

// 保边缘中值滤波：只移除 8 邻域全不同的孤立噪点
// 与标准中值滤波不同，此滤波器只在像素与其 8 邻域全部不同时才替换
const edgePreservingFilter = (pixels: string[][], w: number, h: number): string[][] => {
  const result: string[][] = Array.from({ length: h }, (_, y) => [...pixels[y]])
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const selfColor = pixels[y][x]
      // 检查 8 邻域中有多少个与自身同色
      let sameCount = 0
      const freq: Record<string, number> = {}
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dy === 0 && dx === 0) continue
          const c = pixels[y + dy][x + dx]
          freq[c] = (freq[c] || 0) + 1
          if (c === selfColor) sameCount++
        }
      }
      // 如果周围 8 个格子没有一个与自身同色，替换为邻域最常见色
      if (sameCount === 0) {
        let best = selfColor, bestCnt = 0
        for (const [c, cnt] of Object.entries(freq)) {
          if (cnt > bestCnt) { bestCnt = cnt; best = c }
        }
        result[y][x] = best
      }
    }
  }
  return result
}

// BFS 连通区域合并（对标 perler-beads）
// 基于颜色相似度（RGB 欧氏距离）将相邻的同色或相近色区域合并为统一颜色
const bfsRegionMerge = (
  pixels: string[][], w: number, h: number,
  pool: string[], threshold: number
): string[][] => {
  const visited = Array.from({ length: h }, () => Array(w).fill(false))
  const result = JSON.parse(JSON.stringify(pixels))
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (visited[y][x]) continue
      
      // BFS 从当前格子出发
      const queue: [number, number][] = [[y, x]]
      const region: [number, number][] = []
      visited[y][x] = true
      const baseColor = pixels[y][x]
      const baseR = parseInt(baseColor.slice(1, 3), 16)
      const baseG = parseInt(baseColor.slice(3, 5), 16)
      const baseB = parseInt(baseColor.slice(5, 7), 16)
      
      while (queue.length > 0) {
        const [cy, cx] = queue.shift()!
        region.push([cy, cx])
        
        for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const ny = cy + dy, nx = cx + dx
          if (ny < 0 || ny >= h || nx < 0 || nx >= w || visited[ny][nx]) continue
          const nR = parseInt(pixels[ny][nx].slice(1, 3), 16)
          const nG = parseInt(pixels[ny][nx].slice(3, 5), 16)
          const nB = parseInt(pixels[ny][nx].slice(5, 7), 16)
          const dist = Math.sqrt((baseR-nR)**2 + (baseG-nG)**2 + (baseB-nB)**2)
          if (dist < threshold) {
            visited[ny][nx] = true
            queue.push([ny, nx])
          }
        }
      }
      
      // 统计区域内最常见的颜色
      const regionFreq: Record<string, number> = {}
      for (const [ry, rx] of region) {
        const c = pixels[ry][rx]
        regionFreq[c] = (regionFreq[c] || 0) + 1
      }
      let bestC = baseColor, bestCnt = 0
      for (const [c, cnt] of Object.entries(regionFreq)) {
        if (cnt > bestCnt) { bestCnt = cnt; bestC = c }
      }
      
      // 统一区域内所有格子为最常见颜色
      for (const [ry, rx] of region) {
        result[ry][rx] = bestC
      }
    }
  }
  return result
}

// 小区域合并 P1 - 消除 < minPixels 的连通区域
const regionMerge = (pixels: string[][], w: number, h: number, minSize: number = 3): string[][] => {
  const visited = Array.from({ length: h }, () => Array(w).fill(false))
  const result = JSON.parse(JSON.stringify(pixels))

  // BFS 找连通域
  const bfs = (startY: number, startX: number): { cells: [number,number][], color: string } => {
    const targetColor = pixels[startY][startX]
    const queue: [number,number][] = [[startY, startX]]
    const cells: [number,number][] = []
    visited[startY][startX] = true
    while (queue.length > 0) {
      const [cy, cx] = queue.shift()!
      cells.push([cy, cx])
      for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const ny = cy + dy, nx = cx + dx
        if (ny >= 0 && ny < h && nx >= 0 && nx < w && !visited[ny][nx] && pixels[ny][nx] === targetColor) {
          visited[ny][nx] = true; queue.push([ny, nx])
        }
      }
    }
    return { cells, color: targetColor }
  }

  // 遍历所有单元格
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (visited[y][x]) continue
      const { cells } = bfs(y, x)
      if (cells.length < minSize) {
        // 找相邻区域最常见的颜色
        const neighborColors: Record<string, number> = {}
        for (const [cy, cx] of cells) {
          for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const ny = cy + dy, nx = cx + dx
            if (ny >= 0 && ny < h && nx >= 0 && nx < w && pixels[ny][nx] !== pixels[cy][cx]) {
              neighborColors[pixels[ny][nx]] = (neighborColors[pixels[ny][nx]] || 0) + 1
            }
          }
        }
        let mergeTo = ''
        let mergeCnt = 0
        for (const [c, cnt] of Object.entries(neighborColors)) {
          if (cnt > mergeCnt) { mergeCnt = cnt; mergeTo = c }
        }
        if (mergeTo) { for (const [cy, cx] of cells) result[cy][cx] = mergeTo }
      }
    }
  }
  return result
}

// Floyd-Steinberg 抖动 P2
const floydSteinbergDither = (
  rawPixels: string[][],
  w: number, h: number,
  colorPool: string[]
): string[][] => {
  const result: string[][] = Array.from({ length: h }, () => Array(w).fill(''))
  // 使用浮点误差数组
  const rErr = Array.from({ length: h + 2 }, () => Array(w + 2).fill(0))
  const gErr = Array.from({ length: h + 2 }, () => Array(w + 2).fill(0))
  const bErr = Array.from({ length: h + 2 }, () => Array(w + 2).fill(0))

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const hex = rawPixels[y][x]
      let r = parseInt(hex.slice(1, 3), 16) + rErr[y][x]
      let g = parseInt(hex.slice(3, 5), 16) + gErr[y][x]
      let b = parseInt(hex.slice(5, 7), 16) + bErr[y][x]
      // clamp
      r = Math.max(0, Math.min(255, Math.round(r)))
      g = Math.max(0, Math.min(255, Math.round(g)))
      b = Math.max(0, Math.min(255, Math.round(b)))

      const closest = findClosestBeadColor(r, g, b, colorPool)
      result[y][x] = closest

      const cr = parseInt(closest.slice(1, 3), 16)
      const cg = parseInt(closest.slice(3, 5), 16)
      const cb = parseInt(closest.slice(5, 7), 16)
      const errR = r - cr
      const errG = g - cg
      const errB = b - cb

      // 扩散误差到相邻像素
      const spread = (ey: number, ex: number, w: number) => {
        if (ey >= 0 && ey < h && ex >= 0 && ex < w) {
          rErr[ey][ex] += errR * w
          gErr[ey][ex] += errG * w
          bErr[ey][ex] += errB * w
        }
      }
      spread(y, x + 1, 7 / 16)
      spread(y + 1, x - 1, 3 / 16)
      spread(y + 1, x, 5 / 16)
      spread(y + 1, x + 1, 1 / 16)
    }
  }
  return result
}

// ==================== 核心：颜色提取 ====================
// 新算法：主导色提取 + BFS 区域合并（对标 perler-beads）
// Step 1: 将原图以原始尺寸绘制到临时 Canvas，对每个目标网格采样源图对应区域，取最高频 RGB
// Step 2: 颜色量化，映射到拼豆色池
// Step 3（增强模式）: 中值滤波 → BFS 连通区域合并（相似度阈值30） → 消除 <3px 孤立区域
const extractColorsFromImage = (
  imagePath: string, targetW: number, targetH: number,
  algo: string
): Promise<{ colors: string[]; pixelData: string[][] }> => {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    const pool = getActiveColorPool()
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Step 1: 将原图绘制到临时 Canvas（保持原始尺寸）
      const srcW = img.width, srcH = img.height
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = srcW; tempCanvas.height = srcH
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) { reject(new Error('Canvas context failed')); return }
      tempCtx.drawImage(img, 0, 0)

      const srcData = tempCtx.getImageData(0, 0, srcW, srcH).data

      // Step 2: 主导色提取 - 对每个目标网格，采样源图中对应区域，取频率最高的RGB
      const dominantPixels: string[][] = []
      for (let gy = 0; gy < targetH; gy++) {
        dominantPixels[gy] = []
        for (let gx = 0; gx < targetW; gx++) {
          // 计算源图中对应区域
          const sxStart = Math.floor(gx * srcW / targetW)
          const syStart = Math.floor(gy * srcH / targetH)
          const sxEnd = Math.floor((gx + 1) * srcW / targetW)
          const syEnd = Math.floor((gy + 1) * srcH / targetH)
          
          // 统计区域内的颜色频率
          const freq: Record<string, number> = {}
          for (let sy = syStart; sy < syEnd; sy++) {
            for (let sx = sxStart; sx < sxEnd; sx++) {
              const idx = (sy * srcW + sx) * 4
              const r = srcData[idx], g = srcData[idx + 1], b = srcData[idx + 2], a = srcData[idx + 3]
              if (a < 128) continue
              const hex = rgbToHex(r, g, b)
              freq[hex] = (freq[hex] || 0) + 1
            }
          }
          
          // 找最常见的颜色
          let best = '#FFFFFF', bestCnt = 0
          for (const [hex, cnt] of Object.entries(freq)) {
            if (cnt > bestCnt) { bestCnt = cnt; best = hex }
          }
          dominantPixels[gy][gx] = bestCnt > 0 ? best : '#FFFFFF'
        }
      }

      // Step 3: 颜色量化 - 映射到拼豆色池
      let pixelData: string[][] = []
      if (algo === 'dither') {
        pixelData = floydSteinbergDither(dominantPixels, targetW, targetH, pool)
      } else {
        pixelData = Array.from({ length: targetH }, () => Array(targetW).fill(''))
        for (let y = 0; y < targetH; y++) {
          for (let x = 0; x < targetW; x++) {
            const hex = dominantPixels[y][x]
            const r = parseInt(hex.slice(1, 3), 16)
            const g = parseInt(hex.slice(3, 5), 16)
            const b = parseInt(hex.slice(5, 7), 16)
            if (r > 240 && g > 240 && b > 240) { pixelData[y][x] = '#FFFFFF'; continue }
            pixelData[y][x] = findClosestBeadColor(r, g, b, pool)
          }
        }
      }

      // Step 4: 增强模式：保边缘中值滤波（只移除完全孤立噪点）
      let final = pixelData
      if (algo === 'enhanced') {
        // 保边缘中值滤波：只移除 8 邻域全不同的孤立噪点
        // 不进行BFS合并，避免损失颜色丰富度
        final = edgePreservingFilter(pixelData, targetW, targetH)
      }

      // Step 5: 统计颜色
      const freq: Record<string, number> = {}
      for (let y = 0; y < targetH; y++)
        for (let x = 0; x < targetW; x++)
          { const c = final[y][x]; freq[c] = (freq[c] || 0) + 1 }

      const { '#FFFFFF': _, ...nonBg } = freq
      const colors = Object.entries(nonBg)
        .sort((a, b) => b[1] - a[1])
        .map(([c]) => c)

      resolve({ colors, pixelData: final })
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    // 通过 fetch+blob 读取图片避免跨域
    fetch(imagePath)
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader()
        reader.onload = () => { img.src = reader.result as string }
        reader.onerror = () => reject(new Error('读取图片失败'))
        reader.readAsDataURL(blob)
      })
      .catch(() => { img.src = imagePath })
    // #endif

    // #ifndef H5
    reject(new Error('非 H5 端暂不支持真实颜色提取'))
    // #endif
  })
}

const convertPixelDataToBeads = (pixelData: string[][], w: number, h: number) => {
  const beads: { x: number, y: number, color: string }[] = []
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (pixelData[y][x] !== '#FFFFFF')
        beads.push({ x, y, color: pixelData[y][x] })
  return beads
}

// ==================== 生成图纸 ====================
const generateBlueprint = async () => {
  if (!selectedImage.value) return
  isProcessing.value = true
  const algoName = algoList.find(a => a.id === activeAlgo)?.name || activeAlgo.value
  uni.showLoading({ title: `分析中(${algoName})...` })

  try {
    const result = await extractColorsFromImage(
      selectedImage.value, outputWidth.value, outputHeight.value,
      activeAlgo.value
    )
    detectedColors.value = result.colors
    const beads = convertPixelDataToBeads(result.pixelData, outputWidth.value, outputHeight.value)
    generatedBlueprint.value = {
      width: outputWidth.value, height: outputHeight.value,
      colors: result.colors, pixelData: result.pixelData,
      backgroundColor: '#FFFFFF', showGrid: true, gridColor: '#CCCCCC',
      beads, createdAt: Date.now(), updatedAt: Date.now(),
    }

    // 绘制预览（离屏Canvas生成dataURL，无需等待DOM）
    drawResultCanvas(result.pixelData)

    uni.hideLoading()
    uni.showToast({ title: `检测到 ${result.colors.length} 种颜色`, icon: 'success' })
  } catch (error: any) {
    console.error('生成失败:', error)
    uni.hideLoading()
    uni.showToast({ title: error.message || '生成失败，请重试', icon: 'none' })
  } finally {
    isProcessing.value = false
  }
}

// ==================== Canvas 预览绘制 ====================
// 离屏 Canvas 生成 data URL，避免 uni-app 组件兼容问题
const drawResultCanvas = (pixelData: string[][]) => {
  // #ifdef H5
  const w = outputWidth.value, h = outputHeight.value
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, w, h)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      ctx.fillStyle = pixelData[y][x]
      ctx.fillRect(x, y, 1, 1)
    }
  }
  blueprintPreviewUrl.value = canvas.toDataURL('image/png')
  // #endif
}

// ==================== 手动编辑单像素 P2 ====================
const selectedEditColor = ref('#FF0000')

const onPreviewTouch = (e: any) => {
  if (!generatedBlueprint.value || !generatedBlueprint.value.pixelData) return
  const touch = e.touches?.[0] || e.changedTouches?.[0]
  if (!touch) return

  const img = e.currentTarget as HTMLElement
  const rect = img.getBoundingClientRect()
  const w = outputWidth.value, h = outputHeight.value
  const px = Math.floor(((touch.clientX - rect.left) / rect.width) * w)
  const py = Math.floor(((touch.clientY - rect.top) / rect.height) * h)

  if (px < 0 || px >= w || py < 0 || py >= h) return

  const newData: string[][] = JSON.parse(JSON.stringify(generatedBlueprint.value.pixelData))
  newData[py][px] = selectedEditColor.value
  generatedBlueprint.value.pixelData = newData
  generatedBlueprint.value.beads = convertPixelDataToBeads(newData, w, h)
  drawResultCanvas(newData)
}

/**
 * 跳转到编辑器开始创作
 * - 通过共享模块全局变量传递数据引用（零拷贝，不受容量限制，无时序问题）
 */
const startCreation = () => {
  if (!generatedBlueprint.value) return
  try {
    /** 只提取编辑器需要的字段 */
    const editorData = {
      width: generatedBlueprint.value.width,
      height: generatedBlueprint.value.height,
      backgroundColor: generatedBlueprint.value.backgroundColor || '#FFFFFF',
      showGrid: generatedBlueprint.value.showGrid !== undefined ? generatedBlueprint.value.showGrid : true,
      gridColor: generatedBlueprint.value.gridColor || '#CCCCCC',
      beads: generatedBlueprint.value.beads || [],
    }
    console.log('[开始创作] beads数量:', editorData.beads.length)
    /** 通过共享模块传递数据（模块级变量，不走代理，最可靠） */
    setBlueprintData(editorData)
    uni.navigateTo({
      url: `/pages/canvas-editor/index?mode=blueprint`
    })
  } catch (e: any) {
    console.error('[开始创作] 失败:', e)
    uni.showToast({ title: '跳转失败: ' + (e.message || '未知错误'), icon: 'none' })
  }
}
</script>

<style scoped>
.image-import-page { min-height: 100vh; background-color: #F5F5F5; padding-bottom: 200rpx; }

.page-header { padding: 32rpx; background-color: #FFFFFF; margin-bottom: 24rpx; }
.page-title { font-size: 36rpx; font-weight: 600; color: #2D2D2D; display: block; }
.page-subtitle { font-size: 26rpx; color: #999999; margin-top: 8rpx; }

.upload-section { padding: 0 32rpx; margin-bottom: 24rpx; }
.upload-area {
  height: 240rpx; background-color: #FFFFFF; border-radius: 24rpx; border: 4rpx dashed #E8E8E8;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.upload-icon { width: 100rpx; height: 100rpx; background-color: #F0F7FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16rpx; }
.icon-text { font-size: 48rpx; }
.upload-text { font-size: 28rpx; color: #2D2D2D; margin-bottom: 4rpx; }
.upload-hint { font-size: 22rpx; color: #999999; }

/* 对比区域 */
.compare-section { padding: 0 32rpx; margin-bottom: 24rpx; }
.compare-row { display: flex; gap: 16rpx; }
.compare-col { flex: 1; display: flex; flex-direction: column; align-items: center; }
.compare-label { font-size: 24rpx; color: #666666; margin-bottom: 8rpx; }
.compare-image-wrap {
  width: 100%; aspect-ratio: 1; background-color: #FFFFFF; border-radius: 16rpx;
  border: 2rpx solid #E8E8E8; overflow: hidden; display: flex; align-items: center; justify-content: center;
}
.compare-image-wrap.has-result { border-color: #34C759; }
.compare-img { width: 100%; height: 100%; }
.bp-preview-img { image-rendering: pixelated; image-rendering: crisp-edges; background-color: #FFFFFF; }
.no-result-text { font-size: 22rpx; color: #CCCCCC; }
.compare-actions { display: flex; justify-content: flex-end; gap: 24rpx; margin-top: 12rpx; }
.action-link { font-size: 24rpx; color: #007AFF; }

/* 设置 */
.settings-section { padding: 32rpx; background-color: #FFFFFF; margin-bottom: 24rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: #2D2D2D; margin-bottom: 24rpx; display: block; }
.setting-item { margin-bottom: 28rpx; }
.setting-item:last-child { margin-bottom: 0; }
.setting-label { font-size: 26rpx; color: #666666; margin-bottom: 14rpx; display: block; }

.size-inputs { display: flex; align-items: center; justify-content: center; margin-bottom: 16rpx; }
.input-group { display: flex; align-items: center; background-color: #F5F5F5; border-radius: 12rpx; padding: 14rpx 18rpx; }
.input-label { font-size: 26rpx; color: #666666; margin-right: 10rpx; }
.size-input { width: 80rpx; font-size: 28rpx; color: #2D2D2D; text-align: center; }
.input-unit { font-size: 22rpx; color: #999999; margin-left: 6rpx; }
.size-separator { font-size: 32rpx; color: #999999; margin: 0 20rpx; }
.size-presets { display: flex; justify-content: center; gap: 12rpx; flex-wrap: wrap; }
.preset-btn { padding: 10rpx 20rpx; background-color: #F5F5F5; border-radius: 32rpx; font-size: 22rpx; color: #666666; }
.preset-btn.active { background-color: #F0F7FF; color: #007AFF; }

/* 颜色横向滑动 */
.color-scroll { white-space: nowrap; }
.color-chip-row { display: inline-flex; gap: 12rpx; padding: 4rpx 0; }
.color-chip {
  display: inline-block; padding: 14rpx 28rpx; background-color: #F5F5F5;
  border-radius: 24rpx; font-size: 24rpx; color: #666666; white-space: nowrap;
}
.color-chip.active { background-color: #E8F5E9; color: #2E7D32; font-weight: 600; }

/* 品牌选择 */
.brand-options { display: flex; gap: 12rpx; flex-wrap: wrap; }
.brand-btn { padding: 10rpx 20rpx; background-color: #F5F5F5; border-radius: 24rpx; font-size: 22rpx; color: #666666; }
.brand-btn.active { background-color: #FFF3E0; color: #FF9800; }

/* 算法选择 */
.algo-options { display: flex; gap: 12rpx; flex-wrap: wrap; }
.algo-btn { padding: 10rpx 20rpx; background-color: #F5F5F5; border-radius: 24rpx; font-size: 22rpx; color: #666666; }
.algo-btn.active { background-color: #E8F5E9; color: #2E7D32; }
.algo-desc { font-size: 22rpx; color: #999999; margin-top: 8rpx; display: block; }

/* 检测颜色 */
.detected-colors { display: flex; flex-wrap: wrap; gap: 10rpx; }
.detected-color-item { display: flex; align-items: center; background-color: #F5F5F5; padding: 6rpx 14rpx; border-radius: 8rpx; }
.color-swatch { width: 28rpx; height: 28rpx; border-radius: 4rpx; margin-right: 10rpx; border: 1rpx solid #E8E8E8; }
.color-value { font-size: 20rpx; color: #666666; font-family: monospace; }

/* 统计 */
.result-stats { display: flex; gap: 24rpx; }
.stat-item { font-size: 24rpx; color: #666666; }

/* 底部 */
.bottom-actions { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 32rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background-color: #FFFFFF; box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05); }
.btn-generate {
  width: 100%; height: 88rpx;
  background: linear-gradient(135deg, #007AFF, #0056CC);
  color: #FFFFFF; font-size: 32rpx; font-weight: 600;
  border-radius: 44rpx; border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.btn-generate.disabled { background: #CCCCCC; pointer-events: none; }
.btn-row { display: flex; gap: 16rpx; }
.btn-regenerate {
  flex: 1; height: 88rpx; background: #F5F5F5; color: #007AFF;
  font-size: 28rpx; font-weight: 600; border-radius: 44rpx;
  border: 2rpx solid #007AFF;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.btn-start-creation {
  flex: 1; height: 88rpx;
  background: linear-gradient(135deg, #34C759, #28A745);
  color: #FFFFFF; font-size: 28rpx; font-weight: 600;
  border-radius: 44rpx; border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
</style>
