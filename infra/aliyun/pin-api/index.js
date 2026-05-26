'use strict'

const { PinTablestoreStore } = require('./tablestore-store')

const buildResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
  },
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
  if (typeof body === 'string') {
    return safeJsonParse(body) || {}
  }
  return body
}

const normalizeRequest = (event) => {
  const rootRequest = normalizeEventSource(event)

  const nestedBody = parseRequestBody(rootRequest)
  const request = (
    !rootRequest.path &&
    !rootRequest.rawPath &&
    nestedBody &&
    typeof nestedBody === 'object' &&
    (nestedBody.path || nestedBody.rawPath || nestedBody.httpMethod || nestedBody.method)
  ) ? nestedBody : rootRequest

  const body = request === nestedBody ? parseRequestBody(request) : nestedBody
  const method = String(
    request.httpMethod ||
    request.method ||
    request.requestContext?.http?.method ||
    rootRequest.httpMethod ||
    rootRequest.method ||
    'GET'
  ).toUpperCase()

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
  }
}

const route = async (request) => {
  const { method, path, body } = request

  if (path === '/health' && method === 'GET') {
    return success({
      service: 'pin-api',
      function: 'pin-app',
      method,
      path,
      config: getRuntimeConfig(),
    })
  }

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

exports.handler = async (event, context, callback) => {
  try {
    const request = normalizeRequest(event)
    const response = await route(request)
    if (typeof callback === 'function') {
      callback(null, response)
      return
    }
    return response
  } catch (error) {
    const response = fail(500, error instanceof Error ? error.message : 'Unexpected server error')
    if (typeof callback === 'function') {
      callback(null, response)
      return
    }
    return response
  }
}
