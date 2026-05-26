'use strict'

const SESSION_ROW_UID = '__meta__session'
const ARTWORKS_VERSION_UID = '__meta__artworks_version'

const safeArray = (value) => Array.isArray(value) ? value : []
const firstNonEmpty = (...values) => values.find((value) => value !== undefined && value !== null && value !== '') || ''

const safeJsonParse = (value, fallback) => {
  if (typeof value !== 'string' || !value) return fallback

  try {
    return JSON.parse(value)
  } catch (error) {
    return fallback
  }
}

const requireTablestore = () => {
  try {
    // Alibaba Cloud Function Compute Node.js runtime usually provides this SDK.
    // If not, add it during function packaging.
    return require('tablestore')
  } catch (error) {
    throw new Error('Tablestore SDK is not available in the current runtime')
  }
}

class PinTablestoreStore {
  constructor() {
    this.TableStore = requireTablestore()
    const accessKeyId = firstNonEmpty(
      process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
      process.env.ALIYUN_ACCESS_KEY_ID,
      process.env.accessKeyID,
      process.env.accessKeyId
    )
    const secretAccessKey = firstNonEmpty(
      process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
      process.env.ALIYUN_ACCESS_KEY_SECRET,
      process.env.secretAccessKey,
      process.env.accessKeySecret
    )
    const securityToken = firstNonEmpty(
      process.env.ALIBABA_CLOUD_SECURITY_TOKEN,
      process.env.ALIYUN_SECURITY_TOKEN,
      process.env.securityToken,
      process.env.stsToken
    )

    this.client = new this.TableStore.Client({
      accessKeyId,
      secretAccessKey,
      stsToken: securityToken,
      securityToken,
      endpoint: process.env.ALIYUN_TABLESTORE_ENDPOINT,
      instancename: process.env.ALIYUN_TABLESTORE_INSTANCE,
    })
  }

  async callbackToPromise(invoker) {
    return await new Promise((resolve, reject) => {
      invoker((error, data) => {
        if (error) {
          reject(error)
          return
        }
        resolve(data)
      })
    })
  }

  primaryKeyFromObject(source) {
    return Object.entries(source).map(([key, value]) => ({ [key]: value }))
  }

  attributeColumnsFromObject(source) {
    return Object.entries(source)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => ({ [key]: value }))
  }

  rowToObject(row) {
    if (!row) return null

    const result = {}
    const primaryKeyColumns = safeArray(row.primaryKey)
    const attributeColumns = safeArray(row.attributes || row.attributeColumns)

    primaryKeyColumns.forEach((item) => {
      const [key, value] = Object.entries(item)[0] || []
      if (key) result[key] = value
    })

    attributeColumns.forEach((item) => {
      const [key, value] = Object.entries(item)[0] || []
      if (key) result[key] = value
    })

    return result
  }

  async putRow(tableName, primaryKey, attributes) {
    const params = {
      tableName,
      condition: new this.TableStore.Condition(this.TableStore.RowExistenceExpectation.IGNORE, null),
      primaryKey: this.primaryKeyFromObject(primaryKey),
      attributeColumns: this.attributeColumnsFromObject(attributes),
      returnContent: { returnType: this.TableStore.ReturnType.Primarykey },
    }

    await this.callbackToPromise((callback) => this.client.putRow(params, callback))
  }

  async getRow(tableName, primaryKey) {
    const params = {
      tableName,
      primaryKey: this.primaryKeyFromObject(primaryKey),
      maxVersions: 1,
    }

    const response = await this.callbackToPromise((callback) => this.client.getRow(params, callback))
    return this.rowToObject(response?.row || null)
  }

  async deleteRow(tableName, primaryKey) {
    const params = {
      tableName,
      condition: new this.TableStore.Condition(this.TableStore.RowExistenceExpectation.IGNORE, null),
      primaryKey: this.primaryKeyFromObject(primaryKey),
    }

    await this.callbackToPromise((callback) => this.client.deleteRow(params, callback))
  }

  async getRange(tableName, inclusiveStartPrimaryKey, exclusiveEndPrimaryKey) {
    const params = {
      tableName,
      direction: this.TableStore.Direction.FORWARD,
      inclusiveStartPrimaryKey: this.primaryKeyFromObject(inclusiveStartPrimaryKey),
      exclusiveEndPrimaryKey: this.primaryKeyFromObject(exclusiveEndPrimaryKey),
      maxVersions: 1,
      limit: 500,
    }

    const response = await this.callbackToPromise((callback) => this.client.getRange(params, callback))
    return safeArray(response?.rows).map((row) => this.rowToObject(row)).filter(Boolean)
  }

  async listSingleKeyTable(tableName, primaryKeyName) {
    return await this.getRange(
      tableName,
      { [primaryKeyName]: this.TableStore.INF_MIN },
      { [primaryKeyName]: this.TableStore.INF_MAX }
    )
  }

  async listDoubleKeyTable(tableName, firstKeyName, firstKeyValue, secondKeyName) {
    return await this.getRange(
      tableName,
      {
        [firstKeyName]: firstKeyValue,
        [secondKeyName]: this.TableStore.INF_MIN,
      },
      {
        [firstKeyName]: firstKeyValue,
        [secondKeyName]: this.TableStore.INF_MAX,
      }
    )
  }

  async getSessionRow() {
    return await this.getRow('pin_settings', { uid: SESSION_ROW_UID })
  }

  async getCurrentUserUid() {
    const row = await this.getSessionRow()
    return row?.currentUserUid ? String(row.currentUserUid) : ''
  }

  async requireCurrentUserUid() {
    const uid = await this.getCurrentUserUid()
    if (!uid) {
      throw new Error('No current user session')
    }
    return uid
  }

  normalizeUserRow(row) {
    if (!row) return null
    return {
      uid: String(row.uid || ''),
      username: String(row.username || ''),
      avatar: String(row.avatar || ''),
      createdAt: Number(row.createdAt || 0),
      following: safeJsonParse(row.followingJson, []),
      bio: row.bio ? String(row.bio) : undefined,
      extensions: safeJsonParse(row.extensionsJson, undefined),
    }
  }

  normalizeProjectRow(row) {
    return {
      id: String(row.projectId || ''),
      name: String(row.name || ''),
      canvasData: safeJsonParse(row.canvasDataJson, {}),
      createdAt: Number(row.createdAt || 0),
      updatedAt: Number(row.updatedAt || 0),
      thumbnail: String(row.thumbnail || ''),
      folderId: row.folderId ? String(row.folderId) : '',
      tags: safeJsonParse(row.tagsJson, undefined),
      isPublished: row.isPublished === true || row.isPublished === 'true',
      isOffShelf: row.isOffShelf === true || row.isOffShelf === 'true',
      publishedArtworkId: row.publishedArtworkId ? String(row.publishedArtworkId) : '',
      publishPoints: Number(row.publishPoints || 0),
      extensions: safeJsonParse(row.extensionsJson, undefined),
    }
  }

  normalizeFolderRow(row) {
    return {
      id: String(row.folderId || ''),
      name: String(row.name || ''),
      parentId: row.parentId ? String(row.parentId) : '',
      createdAt: Number(row.createdAt || 0),
      updatedAt: Number(row.updatedAt || 0),
      extensions: safeJsonParse(row.extensionsJson, undefined),
    }
  }

  normalizeArtworkRow(row) {
    return {
      id: String(row.artworkId || ''),
      name: String(row.name || ''),
      creatorName: String(row.creatorName || ''),
      creatorAvatar: String(row.creatorAvatar || ''),
      likes: Number(row.likes || 0),
      favorites: Number(row.favorites || 0),
      points: Number(row.points || 0),
      createdAt: Number(row.createdAt || 0),
      updatedAt: Number(row.updatedAt || 0),
      tags: safeJsonParse(row.tagsJson, []),
      tagMeta: safeJsonParse(row.tagMetaJson, undefined),
      viewCount: Number(row.viewCount || 0),
      useCount: Number(row.useCount || 0),
      isPublic: row.isPublic !== false && row.isPublic !== 'false',
      description: String(row.description || ''),
      beadCount: Number(row.beadCount || 0),
      colorTypeCount: Number(row.colorTypeCount || 0),
      cover: safeJsonParse(row.coverJson, undefined),
      canvasData: safeJsonParse(row.canvasDataJson, undefined),
      projectId: row.projectId ? String(row.projectId) : '',
      thumbnail: row.thumbnail ? String(row.thumbnail) : '',
      extensions: safeJsonParse(row.extensionsJson, undefined),
    }
  }

  normalizePointsRecordRow(row) {
    return {
      id: String(row.recordId || ''),
      title: String(row.title || ''),
      amount: Number(row.amount || 0),
      time: Number(row.time || 0),
    }
  }

  async getCurrentUser() {
    const uid = await this.getCurrentUserUid()
    if (!uid) return null
    return this.normalizeUserRow(await this.getRow('pin_users', { uid }))
  }

  async setCurrentUser(user) {
    if (!user) {
      await this.removeCurrentUser()
      return
    }

    await this.putRow('pin_settings', { uid: SESSION_ROW_UID }, {
      currentUserUid: user.uid,
      updatedAt: Date.now(),
    })
  }

  async removeCurrentUser() {
    await this.deleteRow('pin_settings', { uid: SESSION_ROW_UID })
  }

  async getUserList() {
    const rows = await this.listSingleKeyTable('pin_users', 'uid')
    return rows.map((row) => this.normalizeUserRow(row)).filter(Boolean)
  }

  async setUserList(users) {
    const existing = await this.getUserList()
    const incomingIds = new Set(users.map((user) => user.uid))

    for (const user of users) {
      await this.putRow('pin_users', { uid: user.uid }, {
        username: user.username,
        avatar: user.avatar,
        createdAt: user.createdAt,
        followingJson: JSON.stringify(safeArray(user.following)),
        bio: user.bio || '',
        extensionsJson: user.extensions ? JSON.stringify(user.extensions) : '',
        updatedAt: Date.now(),
      })
    }

    for (const user of existing) {
      if (!incomingIds.has(user.uid)) {
        await this.deleteRow('pin_users', { uid: user.uid })
      }
    }
  }

  async getPoints() {
    const uid = await this.requireCurrentUserUid()
    const user = await this.getRow('pin_users', { uid })
    return Number(user?.pointsBalance || 0)
  }

  async setPoints(points) {
    const uid = await this.requireCurrentUserUid()
    const user = await this.getRow('pin_users', { uid })
    await this.putRow('pin_users', { uid }, {
      username: user?.username || '',
      avatar: user?.avatar || '',
      createdAt: Number(user?.createdAt || Date.now()),
      followingJson: user?.followingJson || '[]',
      bio: user?.bio || '',
      extensionsJson: user?.extensionsJson || '',
      pointsBalance: Number(points || 0),
      updatedAt: Date.now(),
    })
  }

  async getPointsRecords() {
    const uid = await this.requireCurrentUserUid()
    const rows = await this.listDoubleKeyTable('pin_points_records', 'uid', uid, 'recordId')
    return rows
      .map((row) => this.normalizePointsRecordRow(row))
      .sort((left, right) => right.time - left.time)
  }

  async setPointsRecords(records) {
    const uid = await this.requireCurrentUserUid()
    const existing = await this.listDoubleKeyTable('pin_points_records', 'uid', uid, 'recordId')

    for (const row of existing) {
      await this.deleteRow('pin_points_records', {
        uid,
        recordId: row.recordId,
      })
    }

    for (const record of records) {
      await this.putRow('pin_points_records', {
        uid,
        recordId: record.id,
      }, {
        title: record.title,
        amount: Number(record.amount || 0),
        time: Number(record.time || 0),
      })
    }
  }

  async getProjects() {
    const uid = await this.requireCurrentUserUid()
    const rows = await this.listSingleKeyTable('pin_projects', 'projectId')
    return rows
      .filter((row) => !row.ownerUid || row.ownerUid === uid)
      .map((row) => this.normalizeProjectRow(row))
  }

  async setProjects(projects) {
    const uid = await this.requireCurrentUserUid()
    const existing = await this.getProjects()
    const incomingIds = new Set(projects.map((project) => project.id))

    for (const project of projects) {
      await this.putRow('pin_projects', { projectId: project.id }, {
        ownerUid: uid,
        name: project.name,
        thumbnail: project.thumbnail || '',
        folderId: project.folderId || '',
        canvasDataJson: JSON.stringify(project.canvasData || {}),
        tagsJson: project.tags ? JSON.stringify(project.tags) : '',
        isPublished: !!project.isPublished,
        isOffShelf: !!project.isOffShelf,
        publishedArtworkId: project.publishedArtworkId || '',
        publishPoints: Number(project.publishPoints || 0),
        createdAt: Number(project.createdAt || Date.now()),
        updatedAt: Number(project.updatedAt || Date.now()),
        extensionsJson: project.extensions ? JSON.stringify(project.extensions) : '',
      })
    }

    for (const project of existing) {
      if (!incomingIds.has(project.id)) {
        await this.deleteRow('pin_projects', { projectId: project.id })
      }
    }
  }

  async getFolders() {
    const uid = await this.requireCurrentUserUid()
    const rows = await this.listSingleKeyTable('pin_folders', 'folderId')
    return rows
      .filter((row) => !row.ownerUid || row.ownerUid === uid)
      .map((row) => this.normalizeFolderRow(row))
  }

  async setFolders(folders) {
    const uid = await this.requireCurrentUserUid()
    const existing = await this.getFolders()
    const incomingIds = new Set(folders.map((folder) => folder.id))

    for (const folder of folders) {
      await this.putRow('pin_folders', { folderId: folder.id }, {
        ownerUid: uid,
        name: folder.name,
        parentId: folder.parentId || '',
        createdAt: Number(folder.createdAt || Date.now()),
        updatedAt: Number(folder.updatedAt || Date.now()),
        extensionsJson: folder.extensions ? JSON.stringify(folder.extensions) : '',
      })
    }

    for (const folder of existing) {
      if (!incomingIds.has(folder.id)) {
        await this.deleteRow('pin_folders', { folderId: folder.id })
      }
    }
  }

  async getRecentImports() {
    const uid = await this.requireCurrentUserUid()
    const rows = await this.listDoubleKeyTable('pin_recent_imports', 'uid', uid, 'projectId')
    return rows
      .map((row) => ({
        id: String(row.projectId || ''),
        projectId: String(row.projectId || ''),
        name: String(row.name || ''),
        importedAt: Number(row.importedAt || 0),
      }))
      .sort((left, right) => right.importedAt - left.importedAt)
  }

  async setRecentImports(records) {
    const uid = await this.requireCurrentUserUid()
    const existing = await this.listDoubleKeyTable('pin_recent_imports', 'uid', uid, 'projectId')

    for (const row of existing) {
      await this.deleteRow('pin_recent_imports', { uid, projectId: row.projectId })
    }

    for (const record of records) {
      await this.putRow('pin_recent_imports', {
        uid,
        projectId: record.projectId,
      }, {
        name: record.name,
        importedAt: Number(record.importedAt || Date.now()),
      })
    }
  }

  async getArtworks() {
    const rows = await this.listSingleKeyTable('pin_artworks', 'artworkId')
    return rows.map((row) => this.normalizeArtworkRow(row))
  }

  async setArtworks(artworks) {
    const existing = await this.getArtworks()
    const incomingIds = new Set(artworks.map((artwork) => artwork.id))

    for (const artwork of artworks) {
      await this.putRow('pin_artworks', { artworkId: artwork.id }, {
        projectId: artwork.projectId || '',
        ownerUid: artwork.extensions?.ownerUid || '',
        name: artwork.name,
        creatorName: artwork.creatorName,
        creatorAvatar: artwork.creatorAvatar || '',
        thumbnail: artwork.thumbnail || '',
        canvasDataJson: artwork.canvasData ? JSON.stringify(artwork.canvasData) : '',
        tagMetaJson: artwork.tagMeta ? JSON.stringify(artwork.tagMeta) : '',
        tagsJson: JSON.stringify(safeArray(artwork.tags)),
        likes: Number(artwork.likes || 0),
        favorites: Number(artwork.favorites || 0),
        points: Number(artwork.points || 0),
        viewCount: Number(artwork.viewCount || 0),
        useCount: Number(artwork.useCount || 0),
        isPublic: artwork.isPublic !== false,
        description: artwork.description || '',
        beadCount: Number(artwork.beadCount || 0),
        colorTypeCount: Number(artwork.colorTypeCount || 0),
        coverJson: artwork.cover ? JSON.stringify(artwork.cover) : '',
        createdAt: Number(artwork.createdAt || Date.now()),
        updatedAt: Number(artwork.updatedAt || Date.now()),
        extensionsJson: artwork.extensions ? JSON.stringify(artwork.extensions) : '',
      })
    }

    for (const artwork of existing) {
      if (!incomingIds.has(artwork.id)) {
        await this.deleteRow('pin_artworks', { artworkId: artwork.id })
      }
    }
  }

  async getArtworksVersion() {
    const row = await this.getRow('pin_settings', { uid: ARTWORKS_VERSION_UID })
    return row?.version ? String(row.version) : ''
  }

  async setArtworksVersion(version) {
    await this.putRow('pin_settings', { uid: ARTWORKS_VERSION_UID }, {
      version: String(version || ''),
      updatedAt: Date.now(),
    })
  }

  async listRelationsByType(relationType) {
    const uid = await this.requireCurrentUserUid()
    const rows = await this.listDoubleKeyTable('pin_relations', 'uid', uid, 'relationKey')
    return rows.filter((row) => row.relationType === relationType)
  }

  async replaceRelations(relationType, nextItems) {
    const uid = await this.requireCurrentUserUid()
    const existing = await this.listRelationsByType(relationType)

    for (const row of existing) {
      await this.deleteRow('pin_relations', {
        uid,
        relationKey: row.relationKey,
      })
    }

    for (const item of nextItems) {
      await this.putRow('pin_relations', {
        uid,
        relationKey: item.relationKey,
      }, {
        relationType,
        targetId: item.targetId || '',
        targetName: item.targetName || '',
        createdAt: Number(item.createdAt || Date.now()),
      })
    }
  }

  async getLikedArtworkIds() {
    return (await this.listRelationsByType('liked'))
      .map((row) => String(row.targetId || ''))
      .filter(Boolean)
  }

  async setLikedArtworkIds(ids) {
    await this.replaceRelations('liked', ids.map((id) => ({
      relationKey: `liked#${id}`,
      targetId: id,
      createdAt: Date.now(),
    })))
  }

  async getFavoritedArtworkIds() {
    return (await this.listRelationsByType('favorited'))
      .map((row) => String(row.targetId || ''))
      .filter(Boolean)
  }

  async setFavoritedArtworkIds(ids) {
    await this.replaceRelations('favorited', ids.map((id) => ({
      relationKey: `favorited#${id}`,
      targetId: id,
      createdAt: Date.now(),
    })))
  }

  async getPurchasedArtworkIds() {
    return (await this.listRelationsByType('purchased'))
      .map((row) => String(row.targetId || ''))
      .filter(Boolean)
  }

  async setPurchasedArtworkIds(ids) {
    await this.replaceRelations('purchased', ids.map((id) => ({
      relationKey: `purchased#${id}`,
      targetId: id,
      createdAt: Date.now(),
    })))
  }

  async getFollowedCreators() {
    return (await this.listRelationsByType('followed'))
      .map((row) => String(row.targetName || row.targetId || ''))
      .filter(Boolean)
  }

  async setFollowedCreators(creators) {
    await this.replaceRelations('followed', creators.map((name) => ({
      relationKey: `followed#${name}`,
      targetId: name,
      targetName: name,
      createdAt: Date.now(),
    })))
  }

  async getSearchHistory() {
    return (await this.listRelationsByType('search'))
      .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0))
      .map((row) => String(row.targetName || row.targetId || ''))
      .filter(Boolean)
  }

  async setSearchHistory(history) {
    await this.replaceRelations('search', history.map((keyword) => ({
      relationKey: `search#${keyword}`,
      targetId: keyword,
      targetName: keyword,
      createdAt: Date.now(),
    })))
  }

  async getSettings() {
    const uid = await this.requireCurrentUserUid()
    const row = await this.getRow('pin_settings', { uid })
    if (!row) return {}

    return {
      pushEnabled: row.pushEnabled === true || row.pushEnabled === 'true',
      emailEnabled: row.emailEnabled === true || row.emailEnabled === 'true',
      followerNotify: row.followerNotify === true || row.followerNotify === 'true',
      favoriteNotify: row.favoriteNotify === true || row.favoriteNotify === 'true',
      publicWorks: row.publicWorks !== false && row.publicWorks !== 'false',
      allowMessage: row.allowMessage !== false && row.allowMessage !== 'false',
    }
  }

  async setSettings(settings) {
    const uid = await this.requireCurrentUserUid()
    await this.putRow('pin_settings', { uid }, {
      pushEnabled: settings.pushEnabled !== false,
      emailEnabled: settings.emailEnabled === true,
      followerNotify: settings.followerNotify !== false,
      favoriteNotify: settings.favoriteNotify !== false,
      publicWorks: settings.publicWorks !== false,
      allowMessage: settings.allowMessage !== false,
      updatedAt: Date.now(),
    })
  }

  async removeKeys(keys) {
    const keySet = new Set(safeArray(keys))
    const uid = await this.getCurrentUserUid()

    if (keySet.has('pin_user')) {
      await this.removeCurrentUser()
    }

    if (!uid) return

    if (keySet.has('pin_projects')) {
      const projects = await this.getProjects()
      for (const project of projects) {
        await this.deleteRow('pin_projects', { projectId: project.id })
      }
    }

    if (keySet.has('pin_folders')) {
      const folders = await this.getFolders()
      for (const folder of folders) {
        await this.deleteRow('pin_folders', { folderId: folder.id })
      }
    }

    if (keySet.has('pin_search_history')) {
      await this.setSearchHistory([])
    }

    if (keySet.has('pin_recent_imports')) {
      await this.setRecentImports([])
    }

    if (keySet.has('pin_settings')) {
      await this.deleteRow('pin_settings', { uid })
    }

    if (keySet.has('pin_user_list')) {
      await this.deleteRow('pin_users', { uid })
    }
  }

  async clearAll() {
    const uid = await this.getCurrentUserUid()
    if (!uid) {
      await this.removeCurrentUser()
      return
    }

    await this.removeKeys([
      'pin_user',
      'pin_user_list',
      'pin_projects',
      'pin_folders',
      'pin_search_history',
      'pin_recent_imports',
      'pin_settings',
    ])
    await this.setPointsRecords([])
  }
}

module.exports = {
  PinTablestoreStore,
}
