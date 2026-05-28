<template>
  <view class="guide-page">
    <!-- 步骤指示器 -->
    <view class="step-indicator">
      <view
        v-for="(_, index) in steps"
        :key="index"
        class="step-dot"
        :class="{ active: currentStep === index }"
      />
    </view>

    <!-- 内容区域 -->
    <view class="content-area">
      <!-- 图标 -->
      <view class="icon-wrapper">
        <text class="step-icon">{{ currentStepData.icon }}</text>
      </view>

      <!-- 标题和描述 -->
      <text class="step-title">{{ currentStepData.title }}</text>
      <text class="step-desc">{{ currentStepData.desc }}</text>
    </view>

    <!-- 底部按钮区域 -->
    <view class="action-area">
      <button
        class="btn-next"
        :class="{ 'btn-finish': isLastStep }"
        @click="handleNext"
      >
        {{ isLastStep ? '开始创作' : '下一步' }}
      </button>

      <view class="secondary-actions">
        <text
          v-if="currentStep > 0"
          class="btn-prev"
          @click="handlePrev"
        >
          上一步
        </text>
        <text
          v-if="!isLastStep"
          class="btn-skip"
          @click="handleSkip"
        >
          跳过引导
        </text>
      </view>
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

// 5步引导内容
const steps: GuideStep[] = [
  {
    icon: '🎨',
    title: '欢迎来到 Pin',
    desc: 'Pin 是一款拼豆创作应用，帮助你将创意转化为精美的拼豆作品。'
  },
  {
    icon: '🔍',
    title: '发现灵感',
    desc: '在首页浏览社区作品，发现创作灵感，学习他人的拼豆技巧。'
  },
  {
    icon: '✏️',
    title: '开始创作',
    desc: '点击底部"项目"标签，创建新项目，使用网格画板设计你的拼豆图案。'
  },
  {
    icon: '⚡',
    title: '快速创建',
    desc: '随时点击右下角的 + 按钮，快速开始新的拼豆创作。'
  },
  {
    icon: '👤',
    title: '个人中心',
    desc: '管理你的作品、收藏和账号设置，查看创作统计。'
  }
]

const currentStep = ref(0)

const currentStepData = computed(() => steps[currentStep.value])
const isLastStep = computed(() => currentStep.value === steps.length - 1)

const handleNext = () => {
  if (isLastStep.value) {
    completeGuide()
  } else {
    currentStep.value++
  }
}

const handlePrev = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const handleSkip = () => {
  completeGuide()
}

const completeGuide = () => {
  // 标记已完成引导
  uni.setStorageSync('pin_guide_completed', true)
  // 返回首页
  uni.switchTab({
    url: '/pages/index/index'
  })
}
</script>

<style scoped>
.guide-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFFDFA 0%, #FFF5EE 100%);
  display: flex;
  flex-direction: column;
  padding: 60px 32px 40px;
  box-sizing: border-box;
}

/* 步骤指示器 */
.step-indicator {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 60px;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #E5E5E5;
  transition: all 0.3s ease;
}

.step-dot.active {
  background: linear-gradient(135deg, #E8A87C 0%, #D4956A 100%);
  width: 24px;
  border-radius: 4px;
}

/* 内容区域 */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.icon-wrapper {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, #FFF5EE 0%, #FFE8D6 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
  box-shadow: 0 8px 24px rgba(232, 168, 124, 0.2);
}

.step-icon {
  font-size: 60px;
}

.step-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.step-desc {
  font-size: 15px;
  color: #666;
  line-height: 1.6;
  max-width: 280px;
}

/* 底部按钮区域 */
.action-area {
  margin-top: auto;
}

.btn-next {
  width: 100%;
  height: 50px;
  background: linear-gradient(135deg, #E8A87C 0%, #D4956A 100%);
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 17px;
  font-weight: 500;
  margin-bottom: 20px;
}

.btn-finish {
  background: linear-gradient(135deg, #5CB85C 0%, #4CAE4C 100%);
}

.secondary-actions {
  display: flex;
  justify-content: space-between;
  padding: 0 8px;
}

.btn-prev,
.btn-skip {
  font-size: 14px;
  color: #999;
  padding: 8px;
}

.btn-prev {
  color: #666;
}
</style>
