<template>
  <!-- 新手引导遮罩层 -->
  <view v-if="visible" class="guide-overlay" @click="handleOverlayClick">
    <!-- 高亮区域 -->
    <view
      v-if="currentStep?.target"
      class="highlight-box"
      :style="highlightStyle"
      @click.stop
    >
      <view class="highlight-border"></view>
    </view>

    <!-- 引导卡片 -->
    <view
      class="guide-card"
      :style="cardStyle"
      @click.stop
    >
      <!-- 步骤指示器 -->
      <view class="step-indicator">
        <view
          v-for="(step, index) in steps"
          :key="index"
          class="step-dot"
          :class="{ active: index === currentStepIndex }"
        />
      </view>

      <!-- 步骤内容 -->
      <view class="guide-content">
        <image
          v-if="currentStep?.image"
          :src="currentStep.image"
          class="guide-image"
          mode="aspectFit"
        />
        <text class="guide-title">{{ currentStep?.title }}</text>
        <text class="guide-desc">{{ currentStep?.description }}</text>
      </view>

      <!-- 操作按钮 -->
      <view class="guide-actions">
        <button
          v-if="currentStepIndex > 0"
          class="btn-secondary"
          @click="handlePrev"
        >
          上一步
        </button>
        <button
          class="btn-primary"
          @click="handleNext"
        >
          {{ isLastStep ? '完成' : '下一步' }}
        </button>
      </view>

      <!-- 跳过按钮 -->
      <text
        v-if="!isLastStep"
        class="skip-text"
        @click="handleSkip"
      >
        跳过引导
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface GuideStep {
  target?: string // CSS选择器，用于高亮元素
  title: string
  description: string
  image?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

const props = defineProps<{
  steps: GuideStep[]
  storageKey?: string
}>()

const emit = defineEmits<{
  complete: []
  skip: []
}>()

const visible = ref(false)
const currentStepIndex = ref(0)
const highlightRect = ref({
  top: 0,
  left: 0,
  width: 0,
  height: 0,
})

const currentStep = computed(() => props.steps[currentStepIndex.value])
const isLastStep = computed(() => currentStepIndex.value === props.steps.length - 1)

// 高亮区域样式
const highlightStyle = computed(() => ({
  top: `${highlightRect.value.top}px`,
  left: `${highlightRect.value.left}px`,
  width: `${highlightRect.value.width}px`,
  height: `${highlightRect.value.height}px`,
}))

// 引导卡片位置
const cardStyle = computed(() => {
  const step = currentStep.value
  if (!step?.target) {
    // 居中显示
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }

  // 根据位置计算卡片位置
  const rect = highlightRect.value
  const position = step.position || 'bottom'
  const cardWidth = 320
  const cardHeight = 280
  const gap = 16

  let top = rect.top
  let left = rect.left + rect.width / 2 - cardWidth / 2

  switch (position) {
    case 'top':
      top = rect.top - cardHeight - gap
      break
    case 'bottom':
      top = rect.top + rect.height + gap
      break
    case 'left':
      left = rect.left - cardWidth - gap
      top = rect.top + rect.height / 2 - cardHeight / 2
      break
    case 'right':
      left = rect.left + rect.width + gap
      top = rect.top + rect.height / 2 - cardHeight / 2
      break
  }

  // 边界检查
  const windowWidth = uni.getSystemInfoSync().windowWidth
  const windowHeight = uni.getSystemInfoSync().windowHeight

  if (left < 16) left = 16
  if (left + cardWidth > windowWidth - 16) left = windowWidth - cardWidth - 16
  if (top < 16) top = 16
  if (top + cardHeight > windowHeight - 16) top = windowHeight - cardHeight - 16

  return {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
  }
})

// 计算高亮区域位置
const calculateHighlight = () => {
  const step = currentStep.value
  if (!step?.target) {
    highlightRect.value = { top: 0, left: 0, width: 0, height: 0 }
    return
  }

  // 使用 uni.createSelectorQuery 获取元素位置
  const query = uni.createSelectorQuery()
  query.select(step.target).boundingClientRect((rect: any) => {
    if (rect) {
      highlightRect.value = {
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
      }
    }
  }).exec()
}

// 显示引导
const show = () => {
  visible.value = true
  currentStepIndex.value = 0
  calculateHighlight()
}

// 隐藏引导
const hide = () => {
  visible.value = false
}

// 下一步
const handleNext = () => {
  if (isLastStep.value) {
    completeGuide()
  } else {
    currentStepIndex.value++
    calculateHighlight()
  }
}

// 上一步
const handlePrev = () => {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--
    calculateHighlight()
  }
}

// 跳过引导
const handleSkip = () => {
  hide()
  emit('skip')
}

// 完成引导
const completeGuide = () => {
  hide()
  // 标记已完成引导
  if (props.storageKey) {
    uni.setStorageSync(props.storageKey, true)
  }
  emit('complete')
}

// 遮罩点击
const handleOverlayClick = () => {
  // 点击遮罩不关闭，必须点击按钮
}

// 窗口大小变化时重新计算
const handleResize = () => {
  if (visible.value) {
    calculateHighlight()
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// 暴露方法
defineExpose({
  show,
  hide,
})
</script>

<style scoped>
.guide-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 9999;
}

.highlight-box {
  position: absolute;
  border-radius: 12px;
  overflow: hidden;
}

.highlight-border {
  width: 100%;
  height: 100%;
  border: 2px solid var(--color-primary, #E8A87C);
  border-radius: 12px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
}

.guide-card {
  width: 320px;
  background-color: #FFFDFA;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.step-indicator {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #E5E5E5;
  transition: background-color 0.3s;
}

.step-dot.active {
  background-color: var(--color-primary, #E8A87C);
  width: 24px;
  border-radius: 4px;
}

.guide-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 24px;
}

.guide-image {
  width: 120px;
  height: 120px;
  margin-bottom: 16px;
}

.guide-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.guide-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.guide-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-primary {
  flex: 1;
  height: 44px;
  background: linear-gradient(135deg, #E8A87C 0%, #D4956A 100%);
  color: white;
  border: none;
  border-radius: 22px;
  font-size: 16px;
  font-weight: 500;
}

.btn-secondary {
  flex: 1;
  height: 44px;
  background-color: #F5F5F5;
  color: #666;
  border: none;
  border-radius: 22px;
  font-size: 16px;
}

.skip-text {
  display: block;
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: #999;
}
</style>
