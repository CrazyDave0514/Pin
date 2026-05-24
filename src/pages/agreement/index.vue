<template>
  <view class="agreement-page">
    <view class="page-nav">
      <view class="nav-back" @click="goBack">
        <text class="back-icon">‹</text>
      </view>
      <text class="nav-title">{{ currentTitle }}</text>
      <view class="nav-placeholder"></view>
    </view>

    <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
      <!-- 用户协议 -->
      <view v-if="type === 'user'" class="agreement-content">
        <text class="title">用户协议</text>
        <text class="update-time">最后更新日期：2026年5月20日</text>

        <view class="section">
          <text class="section-title">一、协议范围</text>
          <text class="paragraph">
            欢迎使用 Pin 拼豆创作平台（以下简称"本平台"）。本协议是您与本平台之间关于使用本平台服务的协议。请您仔细阅读本协议，一旦您使用本平台服务，即表示您已同意本协议的所有条款。
          </text>
        </view>

        <view class="section">
          <text class="section-title">二、账号注册与安全</text>
          <text class="paragraph">
            2.1 您承诺以真实身份注册账号，并保证所提供的个人资料真实、准确、完整、合法有效。
          </text>
          <text class="paragraph">
            2.2 您有责任妥善保管账号及密码，并对该账号下的所有行为承担法律责任。
          </text>
          <text class="paragraph">
            2.3 如发现账号被未经授权使用或存在安全漏洞，您应立即通知本平台。
          </text>
        </view>

        <view class="section">
          <text class="section-title">三、服务内容</text>
          <text class="paragraph">
            3.1 本平台为您提供拼豆创作、作品分享、社区交流等服务。
          </text>
          <text class="paragraph">
            3.2 您有权在本平台创作、编辑、保存、分享您的拼豆作品。
          </text>
          <text class="paragraph">
            3.3 本平台保留随时变更、中断或终止部分或全部服务的权利。
          </text>
        </view>

        <view class="section">
          <text class="section-title">四、知识产权</text>
          <text class="paragraph">
            4.1 您在本平台创作的作品，其知识产权归您所有。
          </text>
          <text class="paragraph">
            4.2 您授予本平台非独占的、全球性的、免许可费的权利，以使用、复制、修改、发布、展示您的作品，用于平台运营和推广。
          </text>
          <text class="paragraph">
            4.3 您保证您发布的作品不侵犯任何第三方的知识产权。
          </text>
        </view>

        <view class="section">
          <text class="section-title">五、免责声明</text>
          <text class="paragraph">
            5.1 本平台不对用户发布的内容的真实性、准确性负责。
          </text>
          <text class="paragraph">
            5.2 因不可抗力导致的服务中断，本平台不承担责任。
          </text>
        </view>
      </view>

      <!-- 隐私政策 -->
      <view v-if="type === 'privacy'" class="agreement-content">
        <text class="title">隐私政策</text>
        <text class="update-time">最后更新日期：2026年5月20日</text>

        <view class="section">
          <text class="section-title">一、信息收集</text>
          <text class="paragraph">
            我们可能收集以下类型的信息：
          </text>
          <text class="list-item">• 账号信息：用户名、头像、邮箱等</text>
          <text class="list-item">• 设备信息：设备型号、操作系统版本等</text>
          <text class="list-item">• 使用数据：作品数据、操作记录等</text>
          <text class="list-item">• 位置信息：经您授权的位置数据</text>
        </view>

        <view class="section">
          <text class="section-title">二、信息使用</text>
          <text class="paragraph">
            我们使用您的信息用于：
          </text>
          <text class="list-item">• 提供、维护和改进我们的服务</text>
          <text class="list-item">• 与您沟通，包括发送服务通知</text>
          <text class="list-item">• 个性化您的用户体验</text>
          <text class="list-item">• 保护平台安全和防止欺诈</text>
        </view>

        <view class="section">
          <text class="section-title">三、信息共享</text>
          <text class="paragraph">
            我们不会将您的个人信息出售给第三方。但在以下情况下，我们可能会共享您的信息：
          </text>
          <text class="list-item">• 经您同意或授权</text>
          <text class="list-item">• 应法律法规要求</text>
          <text class="list-item">• 为保护我们的合法权益</text>
        </view>

        <view class="section">
          <text class="section-title">四、信息安全</text>
          <text class="paragraph">
            我们采取合理的安全措施保护您的个人信息，包括数据加密、访问控制等。但请注意，互联网传输无法保证100%安全。
          </text>
        </view>

        <view class="section">
          <text class="section-title">五、您的权利</text>
          <text class="paragraph">
            您有权：
          </text>
          <text class="list-item">• 访问、更正您的个人信息</text>
          <text class="list-item">• 删除您的账号和相关数据</text>
          <text class="list-item">• 撤回对信息处理的同意</text>
        </view>
      </view>

      <!-- 社区规范 -->
      <view v-if="type === 'community'" class="agreement-content">
        <text class="title">社区规范</text>
        <text class="update-time">最后更新日期：2026年5月20日</text>

        <view class="section">
          <text class="section-title">一、总则</text>
          <text class="paragraph">
            为维护 Pin 社区的良好氛围，保障用户的合法权益，特制定本规范。所有使用 Pin 平台的用户均应遵守本规范。
          </text>
        </view>

        <view class="section">
          <text class="section-title">二、内容规范</text>
          <text class="paragraph">
            2.1 鼓励发布的内容：
          </text>
          <text class="list-item">• 原创拼豆作品及创作过程</text>
          <text class="list-item">• 拼豆技巧、教程分享</text>
          <text class="list-item">• 友善、积极的交流互动</text>
          <text class="list-item">• 对他人作品的建设性评价</text>
        </view>

        <view class="section">
          <text class="section-title">三、禁止行为</text>
          <text class="paragraph">
            3.1 严禁发布以下内容：
          </text>
          <text class="list-item">• 违法违规内容</text>
          <text class="list-item">• 色情、暴力、恐怖内容</text>
          <text class="list-item">• 侵犯他人知识产权的内容</text>
          <text class="list-item">• 虚假信息、诈骗内容</text>
          <text class="list-item">• 恶意攻击、侮辱他人的内容</text>
        </view>

        <view class="section">
          <text class="section-title">四、版权保护</text>
          <text class="paragraph">
            4.1 尊重原创，禁止盗用他人作品。
          </text>
          <text class="paragraph">
            4.2 转载他人作品需获得授权并注明出处。
          </text>
          <text class="paragraph">
            4.3 发现侵权内容，请及时举报。
          </text>
        </view>

        <view class="section">
          <text class="section-title">五、互动礼仪</text>
          <text class="paragraph">
            5.1 友善交流，尊重他人观点。
          </text>
          <text class="paragraph">
            5.2 理性讨论，避免人身攻击。
          </text>
          <text class="paragraph">
            5.3 鼓励分享，共同进步。
          </text>
        </view>

        <view class="section">
          <text class="section-title">六、违规处理</text>
          <text class="paragraph">
            对于违反本规范的行为，平台有权采取以下措施：
          </text>
          <text class="list-item">• 删除违规内容</text>
          <text class="list-item">• 限制账号功能</text>
          <text class="list-item">• 封禁账号</text>
          <text class="list-item">• 追究法律责任</text>
        </view>

        <view class="section">
          <text class="section-title">七、规范更新</text>
          <text class="paragraph">
            本平台保留随时更新本规范的权利。更新后的规范将在平台公布，继续使用平台服务视为接受更新后的规范。
          </text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

// 协议类型
const type = ref('user')

const currentTitle = computed(() => {
  const titles: Record<string, string> = {
    user: '用户协议',
    privacy: '隐私政策',
    community: '社区规范'
  }
  return titles[type.value] || '协议'
})

/**
 * 加载协议类型
 */
onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.options || {}

  if (options.type) {
    type.value = options.type
  }

})

const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.agreement-page {
  min-height: 100vh;
  background-color: var(--color-bg-page);
}

.page-nav {
  height: 88rpx;
  padding: 0 24rpx;
  background-color: var(--color-bg-panel);
  border-bottom: 1rpx solid var(--color-divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.nav-back,
.nav-placeholder {
  width: 80rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
}

.back-icon {
  font-size: 42rpx;
  color: var(--color-text-primary);
}

.nav-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 34rpx;
  font-weight: 700;
  color: var(--color-text-primary);
}

.content-scroll {
  height: calc(100vh - 88rpx);
  padding: 32rpx;
  box-sizing: border-box;
}

.agreement-content {
  padding-bottom: 60rpx;
}

.title {
  display: none;
}

.update-time {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
  display: block;
  text-align: center;
  margin-bottom: 48rpx;
}

.section {
  margin-bottom: 40rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--color-text-primary);
  display: block;
  margin-bottom: 16rpx;
}

.paragraph {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  line-height: 1.8;
  display: block;
  margin-bottom: 16rpx;
  text-align: justify;
}

.list-item {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  line-height: 1.8;
  display: block;
  margin-bottom: 8rpx;
  padding-left: 16rpx;
}
</style>
