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
// 请求解析工具
// ============================================

const safeJsonParse = (value) => {
  if (typeof value !== 'string' || !value) return null

  try {
    return JSON.parse(value)
  } catch (error) {
    return null
  }
}

const normalizeEventSource = (event) => {
  if (typeof event === 'string') {
    return safeJsonParse(event) || { body: event }
  }

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(event)) {
    const text = event.toString('utf8')
    return safeJsonParse(text) || { body: text }
  }

  if (event instanceof Uint8Array) {
    const text = Buffer.from(event).toString('utf8')
    return safeJsonParse(text) || { body: text }
  }

  return event || {}
}

const getRuntimeConfig = () => ({
  region: process.env.ALIYUN_REGION || '',
  ossBucket: process.env.ALIYUN_OSS_BUCKET || '',
  tablestoreInstance: process.env.ALIYUN_TABLESTORE_INSTANCE || '',
  apiStage: process.env.PIN_API_STAGE || 'dev',
})

const normalizeRoutePath = (path) => {
  const normalized = String(path || '/').trim() || '/'

  if (normalized === '/pin') return '/'
  if (normalized.startsWith('/pin/')) {
    return normalized.slice(4) || '/'
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

const JWT_SECRET = process.env.JWT_SECRET || 'pin-api-default-secret-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

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
 * HMAC SHA256 签名
 */
const hmacSha256 = (secret, message) => {
  const crypto = require('crypto')
  return crypto.createHmac('sha256', secret).update(message).digest('base64')
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
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 天
  }))
  const signature = base64UrlEncode(hmacSha256(JWT_SECRET, `${encodedHeader}.${encodedPayload}`))
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
  const expectedSignature = base64UrlEncode(hmacSha256(JWT_SECRET, `${encodedHeader}.${encodedPayload}`))

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
   */
  async register(request) {
    const { username, password, email, nickname } = request.body || {}

    // 输入验证
    if (!username || !password) {
      throw createError(400, '用户名和密码不能为空', 'VALIDATION_ERROR')
    }
    if (username.length < 3) {
      throw createError(400, '用户名长度至少为 3 个字符', 'VALIDATION_ERROR')
    }
    if (password.length < 6) {
      throw createError(400, '密码长度至少为 6 个字符', 'VALIDATION_ERROR')
    }

    const store = new PinTablestoreStore()

    // 检查用户名是否已存在
    const userList = await store.getUserList()
    if (userList.some(u => u.username === username)) {
      throw createError(409, '用户名已存在', 'USERNAME_EXISTS')
    }

    // 创建用户（密码使用 bcrypt 加密）
    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = {
      uid: `U${Date.now().toString(36).toUpperCase()}`,
      username,
      email: email || '',
      nickname: nickname || username,
      avatar: '',
      password: hashedPassword,
      createdAt: Date.now(),
      following: [],
    }

    userList.push(newUser)
    await store.setUserList(userList)

    // 生成 Token
    const token = generateToken({ uid: newUser.uid, username: newUser.username })

    // 返回用户信息（不含密码）
    const { password: _, ...userWithoutPassword } = newUser

    return { user: userWithoutPassword, token }
  },

  /**
   * 用户登录
   */
  async login(request) {
    const { username, password } = request.body || {}

    if (!username || !password) {
      throw createError(400, '用户名和密码不能为空', 'VALIDATION_ERROR')
    }

    const store = new PinTablestoreStore()
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
  async getCurrentUser(request) {
    const { token } = request

    if (!token) {
      throw createError(401, '未提供认证令牌', 'UNAUTHORIZED')
    }

    try {
      const decoded = verifyToken(token)
      const store = new PinTablestoreStore()
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

const route = async (request) => {
  const { method, path, body, token } = request

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

  // 认证路由
  if (path === '/auth/register' && method === 'POST') {
    return success(await authController.register(request))
  }

  if (path === '/auth/login' && method === 'POST') {
    return success(await authController.login(request))
  }

  if (path === '/auth/me' && method === 'GET') {
    return success(await authController.getCurrentUser(request))
  }

  // 业务路由
  const store = new PinTablestoreStore()

  if (path === '/users/current' && method === 'GET') {
    return success(await store.getCurrentUser())
  }

  if (path === '/users/current' && method === 'PUT') {
    await store.setCurrentUser(body.user || null)
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

  if (path === '/search-history' && method === 'GET') {
    return success(await store.getSearchHistory())
  }

  if (path === '/search-history' && method === 'PUT') {
    await store.setSearchHistory(body.history || [])
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

  return fail(404, `Route not found: ${method} ${path}`)
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
    // 直接返回 JSON 字符串，让 FC 运行时自动包装
    return JSON.stringify(response)
  } catch (error) {
    console.error('Handler error:', error)
    return JSON.stringify({ statusCode: 500, body: JSON.stringify({ success: false, message: error.message }) })
  }
}
