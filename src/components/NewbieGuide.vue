<template>
  <!-- 新手引导弹窗 -->
  <view v-if="visible" class="guide-mask">
    <view class="guide-container">
      <!-- 步骤内容 -->
      <view class="guide-content">
        <!-- 步骤指示器 -->
        <view class="step-dots">
          <view
            v-for="(_, index) in steps"
            :key="index"
            class="dot"
            :class="{ active: currentStep === index }"
          />
        </view>

        <!-- 图标 -->
        <view class="guide-icon">
          <text class="icon-text">{{ currentStepData.icon }}</text>
        </view>

        <!-- 标题和描述 -->
        <text class="guide-title">{{ currentStepData.title }}</text>
        <text class="guide-desc">{{ currentStepData.desc }}</text>
      </view>

      <!-- 按钮区域 -->
      <view class="guide-actions">
        <button
          v-if="currentStep > 0"
          class="btn-prev"
          @click="prevStep"
        >
          上一步
        </button>
        <button
          class="btn-next"
          :class="{ 'btn-finish': isLastStep }"
          @click="nextStep"
        >
          {{ isLastStep ? '开始创作' : '下一步' }}
        </button>
      </view>

      <!-- 跳过 -->
      <text v-if="!isLastStep" class="skip-btn" @click="skipGuide">跳过引导</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface GuideStep {
  icon: string
  title: string
  desc: string
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  complete: []
  skip: []
}>()

// 5步引导内容
const steps: GuideStep[] = [
  { icon: '🎨', title: '欢迎来到 Pin', desc: 'Pin 是一款拼豆创作应用，帮助你将创意转化为精美的拼豆作品。' },
  { icon: '🔍', title: '发现灵感', desc: '在首页浏览社区作品，发现创作灵感，学习他人的拼豆技巧。' },
  { icon: '✏️', title: '开始创作', desc: '点击底部"项目"标签，创建新项目，使用网格画板设计你的拼豆图案。' },
  { icon: '⚡', title: '快速创建', desc: '随时点击右下角的 + 按钮，快速开始新的拼豆创作。' },
  { icon: '👤', title: '个人中心', desc: '管理你的作品、收藏和账号设置，查看创作统计。' },
]

const currentStep = ref(0)

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const currentStepData = computed(() => steps[currentStep.value])
const isLastStep = computed(() => currentStep.value === steps.length - 1)

const nextStep = () => {
  if (isLastStep.value) {
    completeGuide()
  } else {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const skipGuide = () => {
  visible.value = false
  emit('skip')
}

const completeGuide = () => {
  visible.value = false
  // 标记已完成引导
  uni.setStorageSync('pin_guide_completed', true)
  emit('complete')
}
</script>

<style scoped>
.guide-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.guide-container {
  width: 300px;
  background-color: #FFFDFA;
  border-radius: 20px;
  padding: 32px 24px;
  text-align: center;
}

.step-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #E5E5E5;
  transition: all 0.3s;
}

.dot.active {
  background: linear-gradient(135deg, #E8A87C 0%, #D4956A 100%);
  width: 24px;
  border-radius: 4px;
}

.guide-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #FFF5EE 0%, #FFE8D6 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.icon-text {
  font-size: 40px;
}

.guide-title {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.guide-desc {
  display: block;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 28px;
}

.guide-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.btn-prev,
.btn-next {
  flex: 1;
  height: 44px;
  border-radius: 22px;
  font-size: 15px;
  font-weight: 500;
  border: none;
}

.btn-prev {
  background-color: #F5F5F5;
  color: #666;
}

.btn-next {
  background: linear-gradient(135deg, #E8A87C 0%, #D4956A 100%);
  color: white;
}

.btn-finish {
  background: linear-gradient(135deg, #5CB85C 0%, #4CAE4C 100%);
}

.skip-btn {
  font-size: 13px;
  color: #999;
}
</style>
