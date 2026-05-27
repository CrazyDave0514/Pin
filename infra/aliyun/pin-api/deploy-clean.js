/**
 * 部署最新代码到 pin-app-http 函数
 * 使用 FC SDK 直接上传 zip 包
 */
'use strict'

const FCClient = require('@alicloud/fc2')
const fs = require('fs')
const path = require('path')

// 阿里云配置
const ACCOUNT_ID = '1541417015708449'
const REGION = 'cn-hangzhou'
const ACCESS_KEY_ID = '$ALIYUN_ACCESS_KEY_ID'
const ACCESS_KEY_SECRET = '$ALIYUN_ACCESS_KEY_SECRET'

const SERVICE_NAME = 'pin-api'
const FUNCTION_NAME = 'pin-app-http'

async function deploy() {
  console.log('=== 开始部署 ===')
  console.log(`目标函数: ${SERVICE_NAME}/${FUNCTION_NAME}`)

  const client = new FCClient(ACCOUNT_ID, {
    accessKeyID: ACCESS_KEY_ID,
    accessKeySecret: ACCESS_KEY_SECRET,
    region: REGION,
  })

  // 读取 zip 包
  const zipPath = path.join(__dirname, 'function.zip')
  if (!fs.existsSync(zipPath)) {
    console.error('❌ function.zip 不存在，请先打包')
    process.exit(1)
  }

  const zipBuffer = fs.readFileSync(zipPath)
  const zipBase64 = zipBuffer.toString('base64')
  console.log(`📦 zip 包大小: ${(zipBuffer.length / 1024).toFixed(1)} KB`)

  // 更新函数代码 - 使用 updateFunction
  console.log('⬆️ 上传代码...')
  try {
    const result = await client.updateFunction(SERVICE_NAME, FUNCTION_NAME, {
      code: {
        zipFile: zipBase64,
      },
      handler: 'index.handler',
      runtime: 'nodejs18',
    })

    console.log('✅ 部署成功！')
    console.log(`   Function: ${FUNCTION_NAME}`)
    console.log(`   Handler: ${result.data?.handler || 'index.handler'}`)
    console.log(`   Runtime: ${result.data?.runtime || 'nodejs18'}`)
    console.log(`   LastModified: ${result.data?.lastModifiedTime || new Date().toISOString()}`)
  } catch (error) {
    console.error('❌ 部署失败:', error.message)
    if (error.data) {
      console.error('   详情:', JSON.stringify(error.data, null, 2))
    }
    process.exit(1)
  }
}

deploy()
