'use strict'

const { PinTablestoreStore } = require('./tablestore-store')
const bcrypt = require('bcryptjs')

// ============================================
// 原有响应构建函数
// ============================================

const buildResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
  },
  isBase64Encoded: false,
  body: JSON.stringify(body),
})

const success = (data) => buildResponse(200, {
  success: true,
  data,
})

const fail = (statusCode, message) => buildResponse(statusCode, {
  success: false,
  message,
})

// ============================================
const { safeJsonParse } = require('./utils')

// ============================================

const normalizeEventSource = (event) => {
  // handler 层已做 Buffer → 对象解析，此处仅处理字符串/边界情况
  if (typeof event === 'string') {
    return safeJsonParse(event, { body: event })
  }
  return event || {}
}

const getRuntimeConfig = () => ({
  region: process.env.ALIYUN_REGION || '',
  tablestoreInstance: process.env.ALIYUN_TABLESTORE_INSTANCE || '',
  apiStage: process.env.PIN_API_STAGE || 'dev',
})

const API_PATH_PREFIX = process.env.PIN_API_PATH_PREFIX || '/pin'

const normalizeRoutePath = (path) => {
  const normalized = String(path || '/').trim() || '/'
  if (normalized === API_PATH_PREFIX) return '/'
  if (normalized.startsWith(API_PATH_PREFIX + '/')) {
    return normalized.slice(API_PATH_PREFIX.length) || '/'
  }
  return normalized
}

const parseRequestBody = (request) => {
  const body = request?.body
  if (!body) return {}
  // API Gateway HTTP Trigger 传入的 body 可能是 Buffer
  if (Buffer.isBuffer(body)) {
    const text = body.toString('utf8')
    return safeJsonParse(text) || {}
  }
  if (typeof body === 'string') {
    return safeJsonParse(body) || {}
  }
  return body
}

const normalizeRequest = (event) => {
  // API Gateway 通过 HTTP Trigger 调用时，event 是类 HTTP 请求对象
  // 包含 path, method, body(Buffer), queries, headers 等
  const rootRequest = normalizeEventSource(event)

  // 判断是否为 HTTP Trigger 的请求对象格式
  const isHttpRequest = rootRequest.path && rootRequest.method && !rootRequest.httpMethod && !rootRequest.requestContext

  let request, body
  if (isHttpRequest) {
    // HTTP Trigger 请求对象：body 可能在 request.body（Buffer）
    request = rootRequest
    body = parseRequestBody(request)
  } else {
    // 标准 FC event 格式
    const nestedBody = parseRequestBody(rootRequest)
    request = (
      !rootRequest.path &&
      !rootRequest.rawPath &&
      nestedBody &&
      typeof nestedBody === 'object' &&
      (nestedBody.path || nestedBody.rawPath || nestedBody.httpMethod || nestedBody.method)
    ) ? nestedBody : rootRequest

    body = request === nestedBody ? parseRequestBody(request) : nestedBody
  }

  const method = String(
    request.httpMethod ||
    request.method ||
    request.requestContext?.http?.method ||
    rootRequest.httpMethod ||
    rootRequest.method ||
    'GET'
  ).toUpperCase()

  // 提取认证 Token
  // 支持三种方式（优先级从高到低）：
  // 1. Query parameter: ?token=xxx
  // 2. X-Auth-Token header（避免被 API Gateway 签名认证覆盖）
  // 3. Authorization header（Bearer token 格式）
  let token = null

  // 从 query parameter 获取
  if (request.queries && request.queries.token) {
    token = request.queries.token
  }

  if (!token) {
    const rawHeaders = request.headers || {}
    // 从 X-Auth-Token header 获取
    const authToken = rawHeaders['x-auth-token'] || rawHeaders['X-Auth-Token'] || ''
    if (authToken) {
      token = authToken
    } else {
      // 从 Authorization header 获取
      const authHeader = rawHeaders.authorization || rawHeaders.Authorization || ''
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }
  }

  return {
    raw: request,
    path: normalizeRoutePath(
      request.path ||
      request.rawPath ||
      request.requestContext?.path ||
      request.uri ||
      '/'
    ),
    method,
    body,
    token,
    queries: request.queries || request.queryParameters || {},
  }
}

// ============================================
// JWT 认证工具（内联实现，避免额外依赖）
// ============================================

// JWT_SECRET 生产环境务必通过 FC 环境变量配置
// 此默认值仅用于开发/测试，且会在运行时记录警告
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('[SECURITY] JWT_SECRET not configured, using default (INSECURE for production)')
  return 'pin-api-default-secret-change-in-production'
})()
// 解析过期时间（支持 7d / 24h / 3600 等格式）
const JWT_EXPIRES_IN_SECONDS = (() => {
  const raw = process.env.JWT_EXPIRES_IN || '7d'
  const match = raw.match(/^(\d+)([dhms])$/)
  if (!match) return 7 * 24 * 60 * 60 // 默认 7 天
  const num = parseInt(match[1], 10)
  switch (match[2]) {
    case 'd': return num * 86400
    case 'h': return num * 3600
    case 'm': return num * 60
    case 's': return num
    default: return 7 * 86400
  }
})()

/**
 * 简单的 Base64 编码（用于 JWT）
 */
const base64UrlEncode = (str) => {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * 简单的 Base64 解码
 */
const base64UrlDecode = (str) => {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return Buffer.from(str, 'base64').toString()
}

/**
 * HMAC SHA256 签名（返回 raw Buffer，由调用方编码）
 */
const hmacSha256 = (secret, message) => {
  const crypto = require('crypto')
  return crypto.createHmac('sha256', secret).update(message).digest()
}

/**
 * Raw Buffer 转 Base64URL（单次编码，避免双重编码）
 */
const bufferToBase64Url = (buf) => {
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * 生成 JWT Token（简化版）
 */
const generateToken = (payload) => {
  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN_SECONDS,
  }))
  const signature = bufferToBase64Url(hmacSha256(JWT_SECRET, `${encodedHeader}.${encodedPayload}`))
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

/**
 * 验证 JWT Token（简化版）
 */
const verifyToken = (token) => {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid token format')
  }

  const [encodedHeader, encodedPayload, signature] = parts
  const expectedSignature = bufferToBase64Url(hmacSha256(JWT_SECRET, `${encodedHeader}.${encodedPayload}`))

  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature')
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload))

  // 检查过期
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    const error = new Error('Token expired')
    error.code = 'TOKEN_EXPIRED'
    throw error
  }

  return payload
}

/**
 * 创建标准化错误
 */
const createError = (statusCode, message, code) => {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code
  return error
}

// ============================================
// 认证 Controller
// ============================================

const authController = {
  /**
   * 用户注册
   * P0: 邮箱必填验证 + 注册赠送100积分
   */
  async register(request, store) {
    const { username, password, email, nickname } = request.body || {}

    // 输入验证
    if (!username || !password || !email) {
      throw createError(400, '用户名、密码和邮箱不能为空', 'VALIDATION_ERROR')
    }
    if (username.length < 3) {
      throw createError(400, '用户名长度至少为 3 个字符', 'VALIDATION_ERROR')
    }
    if (username.length > 16) {
      throw createError(400, '用户名最多 16 个字符', 'VALIDATION_ERROR')
    }
    // 用户名格式：只允许字母、数字、中文、下划线
    const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/
    if (!usernameRegex.test(username)) {
      throw createError(400, '用户名只能包含字母、数字、中文和下划线', 'VALIDATION_ERROR')
    }
    if (password.length < 6) {
      throw createError(400, '密码长度至少为 6 个字符', 'VALIDATION_ERROR')
    }
    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw createError(400, '邮箱格式不正确', 'VALIDATION_ERROR')
    }

    // 检查用户名是否已存在
    const userList = await store.getUserList()
    if (userList.some(u => u.username === username)) {
      throw createError(409, '用户名已存在', 'USERNAME_EXISTS')
    }
    // 检查邮箱是否已存在
    if (userList.some(u => u.email === email)) {
      throw createError(409, '邮箱已被注册', 'EMAIL_EXISTS')
    }

    // 创建用户（密码使用 bcrypt 加密）
    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = {
      uid: `U${Date.now().toString(36).toUpperCase()}`,
      username,
      email,
      nickname: nickname || username,
      avatar: '',
      password: hashedPassword,
      createdAt: Date.now(),
      following: [],
    }

    // 单行写入（避免全量读写 userList）
    await store.addUser(newUser)

    // 注册赠送 100 积分（传入新用户 uid）
    await store.setPoints(100, newUser.uid)
    await store.addPointsRecord({
      id: `R${Date.now()}`,
      type: 'earn',
      amount: 100,
      reason: '注册赠送',
      createdAt: Date.now(),
    }, newUser.uid)

    // 生成 Token
    const token = generateToken({ uid: newUser.uid, username: newUser.username })

    // 返回用户信息（不含密码）
    const { password: _, ...userWithoutPassword } = newUser

    return { user: userWithoutPassword, token }
  },

  /**
   * 用户登录
   */
  async login(request, store) {
    const { username, password } = request.body || {}
    if (!username || !password) {
      throw createError(400, '用户名和密码不能为空', 'VALIDATION_ERROR')
    }
    const userList = await store.getUserList()
    const user = userList.find(u => u.username === username)

    if (!user) {
      throw createError(401, '用户名或密码错误', 'INVALID_CREDENTIALS')
    }

    // 验证密码（使用 bcrypt 比较）
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw createError(401, '用户名或密码错误', 'INVALID_CREDENTIALS')
    }

    // 生成 Token
    const token = generateToken({ uid: user.uid, username: user.username })

    // 返回用户信息（不含密码）
    const { password: _, ...userWithoutPassword } = user

    return { user: userWithoutPassword, token }
  },

  /**
   * 获取当前用户
   */
  async getCurrentUser(request, store) {
    const { token } = request
    if (!token) {
      throw createError(401, '未提供认证令牌', 'UNAUTHORIZED')
    }
    try {
      const decoded = verifyToken(token)
      const userList = await store.getUserList()
      const user = userList.find(u => u.uid === decoded.uid)

      if (!user) {
        throw createError(401, '用户不存在', 'USER_NOT_FOUND')
      }

      // 返回用户信息（不含密码）
      const { password: _, ...userWithoutPassword } = user
      return { user: userWithoutPassword }
    } catch (error) {
      if (error.code === 'TOKEN_EXPIRED') {
        throw createError(401, '令牌已过期', 'TOKEN_EXPIRED')
      }
      throw createError(401, '令牌无效', 'TOKEN_INVALID')
    }
  },
}

// ============================================
// 路由处理
// ============================================

/**
 * 验证 token 并返回 uid，区分错误类型
 * @returns {{ uid: string|null, errorCode: string|null }}
 */
const extractUidFromToken = (token) => {
  if (!token) return { uid: null, errorCode: 'NO_TOKEN' }
  try {
    const decoded = verifyToken(token)
    return { uid: decoded.uid, errorCode: null }
  } catch (error) {
    if (error.code === 'TOKEN_EXPIRED') {
      return { uid: null, errorCode: 'TOKEN_EXPIRED' }
    }
    return { uid: null, errorCode: 'TOKEN_INVALID' }
  }
}

const route = async (request) => {
  try {
    const { method, path, body, token } = request

  // CORS 预检请求
  if (method === 'OPTIONS') {
    return buildResponse(204, null)
  }

  // 健康检查
  if (path === '/health' && method === 'GET') {
    return success({
      service: 'pin-api',
      function: 'pin-app',
      method,
      path,
      config: getRuntimeConfig(),
    })
  }

  // 认证路由（无需 token 或自行处理 token）
  // 共享 store 实例，避免重复创建
  const store = new PinTablestoreStore()

  if (path === '/auth/register' && method === 'POST') {
    return success(await authController.register(request, store))
  }

  if (path === '/auth/login' && method === 'POST') {
    return success(await authController.login(request, store))
  }

  if (path === '/auth/me' && method === 'GET') {
    return success(await authController.getCurrentUser(request, store))
  }

  // 业务路由 - 需要验证 token 并设置 session
  const { uid, errorCode } = extractUidFromToken(token)
  if (!uid) {
    const message = errorCode === 'TOKEN_EXPIRED' ? '令牌已过期' : '未提供认证令牌或令牌无效'
    throw createError(401, message, errorCode)
  }

  // 设置当前用户 session（让 store 方法能获取到 uid）
  await store.setCurrentUser({ uid })

  if (path === '/users/current' && method === 'GET') {
    return success(await store.getCurrentUser())
  }

  if (path === '/users/current' && method === 'PUT') {
    // P2: 支持更新用户资料（nickname, avatar, bio）
    if (body.profile) {
      await store.updateCurrentUserProfile(body.profile)
    }
    // 同时支持设置当前用户
    if (body.user) {
      await store.setCurrentUser(body.user)
    }
    return success(null)
  }

  if (path === '/users/current' && method === 'DELETE') {
    await store.removeCurrentUser()
    return success(null)
  }

  if (path === '/users' && method === 'GET') {
    return success(await store.getUserList())
  }

  if (path === '/users' && method === 'PUT') {
    await store.setUserList(body.users || [])
    return success(null)
  }

  if (path === '/points/balance' && method === 'GET') {
    return success(await store.getPoints())
  }

  if (path === '/points/balance' && method === 'PUT') {
    await store.setPoints(body.points || 0)
    return success(null)
  }

  if (path === '/points/records' && method === 'GET') {
    return success(await store.getPointsRecords())
  }

  if (path === '/points/records' && method === 'PUT') {
    await store.setPointsRecords(body.records || [])
    return success(null)
  }

  if (path === '/projects' && method === 'GET') {
    return success(await store.getProjects())
  }

  if (path === '/projects' && method === 'PUT') {
    await store.setProjects(body.projects || [])
    return success(null)
  }

  // P1: 作品发布到社区（发布项目为作品）
  if (path.startsWith('/projects/') && path.endsWith('/publish') && method === 'POST') {
    const projectId = path.split('/')[2]
    const project = await store.getProjectById(projectId)
    if (!project) {
      throw createError(404, '项目不存在', 'NOT_FOUND')
    }

    // 发布为作品
    const artwork = await store.publishProjectAsArtwork(projectId, body)

    // 发布作品奖励 10 积分
    await store.addPoints(10)
    await store.addPointsRecord({
      id: `R${Date.now()}`,
      type: 'earn',
      amount: 10,
      reason: '发布作品奖励',
      createdAt: Date.now(),
    })

    return success({ artworkId: artwork.id })
  }

  // P1: 下架作品
  if (path.startsWith('/projects/') && path.endsWith('/publish') && method === 'DELETE') {
    const projectId = path.split('/')[2]
    await store.unpublishArtwork(projectId)
    return success(null)
  }

  if (path === '/folders' && method === 'GET') {
    return success(await store.getFolders())
  }

  if (path === '/folders' && method === 'PUT') {
    await store.setFolders(body.folders || [])
    return success(null)
  }

  if (path === '/recent-imports' && method === 'GET') {
    return success(await store.getRecentImports())
  }

  if (path === '/recent-imports' && method === 'PUT') {
    await store.setRecentImports(body.records || [])
    return success(null)
  }

  if (path === '/artworks' && method === 'GET') {
    return success(await store.getArtworks())
  }

  if (path === '/artworks' && method === 'PUT') {
    await store.setArtworks(body.artworks || [])
    return success(null)
  }

  if (path === '/artworks/version' && method === 'GET') {
    return success(await store.getArtworksVersion())
  }

  if (path === '/artworks/version' && method === 'PUT') {
    await store.setArtworksVersion(body.version || '')
    return success(null)
  }

  if (path === '/relations/liked-artworks' && method === 'GET') {
    return success(await store.getLikedArtworkIds())
  }

  if (path === '/relations/liked-artworks' && method === 'PUT') {
    await store.setLikedArtworkIds(body.ids || [])
    return success(null)
  }

  if (path === '/relations/favorited-artworks' && method === 'GET') {
    return success(await store.getFavoritedArtworkIds())
  }

  if (path === '/relations/favorited-artworks' && method === 'PUT') {
    await store.setFavoritedArtworkIds(body.ids || [])
    return success(null)
  }

  if (path === '/relations/purchased-artworks' && method === 'GET') {
    return success(await store.getPurchasedArtworkIds())
  }

  if (path === '/relations/purchased-artworks' && method === 'PUT') {
    await store.setPurchasedArtworkIds(body.ids || [])
    return success(null)
  }

  if (path === '/relations/followed-creators' && method === 'GET') {
    return success(await store.getFollowedCreators())
  }

  if (path === '/relations/followed-creators' && method === 'PUT') {
    await store.setFollowedCreators(body.creators || [])
    return success(null)
  }

  // P1: 增量操作接口 - 点赞/取消点赞
  if (path.startsWith('/artworks/') && path.endsWith('/like') && method === 'POST') {
    const artworkId = path.split('/')[2]
    const result = await store.likeArtwork(artworkId)
    return success(result)
  }

  if (path.startsWith('/artworks/') && path.endsWith('/like') && method === 'DELETE') {
    const artworkId = path.split('/')[2]
    const result = await store.unlikeArtwork(artworkId)
    return success(result)
  }

  // P1: 增量操作接口 - 收藏/取消收藏
  if (path.startsWith('/artworks/') && path.endsWith('/favorite') && method === 'POST') {
    const artworkId = path.split('/')[2]
    const result = await store.favoriteArtwork(artworkId)
    return success(result)
  }

  if (path.startsWith('/artworks/') && path.endsWith('/favorite') && method === 'DELETE') {
    const artworkId = path.split('/')[2]
    const result = await store.unfavoriteArtwork(artworkId)
    return success(result)
  }

  // P1: 增量操作接口 - 关注/取消关注
  if (path.startsWith('/users/') && path.endsWith('/follow') && method === 'POST') {
    const targetUid = path.split('/')[2]
    const result = await store.followUser(targetUid)
    return success(result)
  }

  if (path.startsWith('/users/') && path.endsWith('/follow') && method === 'DELETE') {
    const targetUid = path.split('/')[2]
    const result = await store.unfollowUser(targetUid)
    return success(result)
  }

  // P0: 购买作品接口（积分校验 + 扣减 + 记录购买）
  if (path.startsWith('/artworks/') && path.endsWith('/purchase') && method === 'POST') {
    const artworkId = path.split('/')[2]
    const result = await store.purchaseArtwork(artworkId)
    return success(result)
  }

  // P1: 获取单个作品详情
  if (path.match(/^\/artworks\/[^\/]+$/) && method === 'GET' && !path.endsWith('/like') && !path.endsWith('/favorite') && !path.endsWith('/purchase')) {
    const artworkId = path.split('/')[2]
    const artwork = await store.getArtworkById(artworkId)
    if (!artwork) {
      throw createError(404, '作品不存在', 'NOT_FOUND')
    }
    // 增加浏览量
    artwork.viewCount = (artwork.viewCount || 0) + 1
    await store.updateArtworkViewCount(artworkId, artwork.viewCount)
    return success(artwork)
  }

  // P1: 注销账号（清除所有关联数据）
  if (path === '/auth/unregister' && method === 'POST') {
    await store.unregisterCurrentUser()
    return success({ message: '账号已注销' })
  }

  if (path === '/search-history' && method === 'GET') {
    return success(await store.getSearchHistory())
  }

  if (path === '/search-history' && method === 'PUT') {
    // P2: 搜索历史最多保存 10 条
    const history = (body.history || []).slice(0, 10)
    await store.setSearchHistory(history)
    return success(null)
  }

  if (path === '/settings' && method === 'GET') {
    return success(await store.getSettings())
  }

  if (path === '/settings' && method === 'PUT') {
    await store.setSettings(body.settings || {})
    return success(null)
  }

  if (path === '/storage/remove-keys' && method === 'POST') {
    await store.removeKeys(body.keys || [])
    return success(null)
  }

  if (path === '/storage/clear-all' && method === 'POST') {
    await store.clearAll()
    return success(null)
  }

  // P1: 批量导入接口（数据迁移用）
  if (path === '/import' && method === 'POST') {
    const { projects = [], folders = [], settings = {} } = body

    // 批量导入项目
    if (projects.length > 0) {
      const existingProjects = await store.getProjects()
      const newProjects = [...existingProjects, ...projects]
      await store.setProjects(newProjects)
    }

    // 批量导入文件夹
    if (folders.length > 0) {
      const existingFolders = await store.getFolders()
      const newFolders = [...existingFolders, ...folders]
      await store.setFolders(newFolders)
    }

    // 导入设置
    if (Object.keys(settings).length > 0) {
      await store.setSettings(settings)
    }

    return success({
      imported: {
        projects: projects.length,
        folders: folders.length,
        settings: Object.keys(settings).length > 0,
      },
    })
  }

  return fail(404, `Route not found: ${method} ${path}`)
  } catch (error) {
    console.error('Route error:', error)
    const statusCode = error.statusCode || error.status || 500
    return buildResponse(statusCode, {
      success: false,
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
    })
  }
}

// ============================================
// 云函数入口（FC 3.0 Node.js 18 标准运行时）
// event 为 Buffer 类型，需 JSON.parse(event.toString()) 解析
// 使用 async/await 直接 return，不使用 callback
// ============================================

exports.handler = async (event, context) => {
  try {
    // FC 3.0 内置运行时 event 为 Buffer，需先解析
    // 但通过 API Gateway 调用时 event 可能已经是对象
    let eventObj
    if (Buffer.isBuffer(event)) {
      eventObj = JSON.parse(event.toString())
    } else if (typeof event === 'string') {
      eventObj = JSON.parse(event)
    } else if (typeof event === 'object') {
      eventObj = event
    } else {
      eventObj = {}
    }

    const request = normalizeRequest(eventObj)

    const response = await route(request)
    // FC 3.0 HTTP Trigger: route() 返回 buildResponse 对象
    // 提取 body 字符串直接返回，避免外层 JSON.stringify 导致双重编码
    return response.body || JSON.stringify(response)
  } catch (error) {
    // 仅在 route 也崩溃时才会到这里（真正的意外错误）
    console.error('Unexpected handler error:', error)
    const fatalResponse = buildResponse(500, {
        success: false,
        message: 'Internal server error',
        code: 'FATAL',
      })
      return fatalResponse.body || JSON.stringify(fatalResponse)
  }
}
