'use strict'

const { safeJsonParse, safeArray } = require('./utils')

const SESSION_ROW_UID = '__meta__session'
const ARTWORKS_VERSION_UID = '__meta__artworks_version'

const firstNonEmpty = (...values) => values.find((value) => value !== undefined && value !== null && value !== '') || ''

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
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => ({ [key]: value }))
  }

  /**
   * 将 Tablestore 行数据转换为普通对象
   * Tablestore SDK 5.x 返回的列格式: { columnName: "col_name", columnValue: "col_value", timestamp: ... }
   * 旧格式或简写: { columnName: "value" }
   */
  rowToObject(row) {
    if (!row) return null

    const result = {}
    const primaryKeyColumns = safeArray(row.primaryKey)
    const attributeColumns = safeArray(row.attributes || row.attributeColumns)

    const extractColumnValue = (item) => {
      if (!item) return null
      // Tablestore SDK 5.x 标准格式: { columnName: "col", columnValue: "val" }
      if (item.columnName !== undefined && item.columnValue !== undefined) {
        return [item.columnName, item.columnValue]
      }
      // 兼容其他格式: { name: "col", value: "val" }
      if (item.name !== undefined && item.value !== undefined) {
        return [item.name, item.value]
      }
      // 旧格式: { columnName: "value" } (只有一个 key-value)
      const entries = Object.entries(item)
      if (entries.length > 0) {
        return entries[0]
      }
      return null
    }

    primaryKeyColumns.forEach((item) => {
      const extracted = extractColumnValue(item)
      if (extracted) {
        const [key, value] = extracted
        if (key) result[key] = value
      }
    })

    attributeColumns.forEach((item) => {
      const extracted = extractColumnValue(item)
      if (extracted) {
        const [key, value] = extracted
        if (key) result[key] = value
      }
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

  /**
   * 更新行中指定列（不覆盖其他列）
   * 使用 PUT 模式的 updateRow，只更新传入的 attribute 列
   */
  async updateRow(tableName, primaryKey, attributes) {
    const columns = this.attributeColumnsFromObject(attributes)
    const params = {
      tableName,
      condition: new this.TableStore.Condition(this.TableStore.RowExistenceExpectation.IGNORE, null),
      primaryKey: this.primaryKeyFromObject(primaryKey),
      updateOfAttributeColumns: [
        { 'PUT': columns },
      ],
      returnContent: { returnType: this.TableStore.ReturnType.Primarykey },
    }

    await this.callbackToPromise((callback) => this.client.updateRow(params, callback))
  }

  async getRange(tableName, inclusiveStartPrimaryKey, exclusiveEndPrimaryKey) {
    const params = {
      tableName,
      direction: this.TableStore.Direction.FORWARD,
      inclusiveStartPrimaryKey: this.primaryKeyFromObject(inclusiveStartPrimaryKey),
      exclusiveEndPrimaryKey: this.primaryKeyFromObject(exclusiveEndPrimaryKey),
      maxVersions: 1,
      // TODO: 当前 limit 500，超过时需要实现 nextToken 分页
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

  /**
   * 标准化用户行数据（包含认证字段）
   */
  normalizeUserRow(row) {
    if (!row) return null
    return {
      uid: String(row.uid || ''),
      username: String(row.username || ''),
      email: String(row.email || ''),
      nickname: String(row.nickname || ''),
      avatar: String(row.avatar || ''),
      password: String(row.password || ''),
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

  /**
   * P2: 更新当前用户资料（昵称、头像、简介）
   * 使用 updateRow 只更新指定字段，避免覆盖其他字段
   */
  async updateCurrentUserProfile(profile) {
    const uid = await this.requireCurrentUserUid()
    const updateFields = { updatedAt: Date.now() }
    if (profile.nickname !== undefined) updateFields.nickname = profile.nickname
    if (profile.avatar !== undefined) updateFields.avatar = profile.avatar
    if (profile.bio !== undefined) updateFields.bio = profile.bio
    await this.updateRow('pin_users', { uid }, updateFields)
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
        email: user.email || '',
        nickname: user.nickname || user.username,
        avatar: user.avatar,
        password: user.password || '',
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

  /**
   * 添加单个用户（单行写入，不读取全量列表）
   */
  async addUser(user) {
    await this.putRow('pin_users', { uid: user.uid }, {
      username: user.username,
      email: user.email || '',
      nickname: user.nickname || user.username,
      avatar: user.avatar || '',
      password: user.password || '',
      createdAt: Number(user.createdAt || Date.now()),
      followingJson: JSON.stringify(safeArray(user.following)),
      bio: user.bio || '',
      extensionsJson: user.extensions ? JSON.stringify(user.extensions) : '',
      updatedAt: Date.now(),
    })
  }

  async getPoints() {
    const uid = await this.requireCurrentUserUid()
    const user = await this.getRow('pin_users', { uid })
    return Number(user?.pointsBalance || 0)
  }

  /**
   * 设置积分余额（P0: 积分业务逻辑）
   * 使用 updateRow 只更新 pointsBalance 列，避免覆盖其他字段
   * @param points 积分值
   * @param targetUid 可选，指定用户ID（用于注册等场景）
   */
  async setPoints(points, targetUid) {
    const uid = targetUid || await this.requireCurrentUserUid()
    await this.updateRow('pin_users', { uid }, {
      pointsBalance: Number(points || 0),
      updatedAt: Date.now(),
    })
  }

  /**
   * 增加积分（P1: 积分业务逻辑）
   */
  async addPoints(amount) {
    const current = await this.getPoints()
    await this.setPoints(current + amount)
  }

  /**
   * 扣减积分（P1: 积分业务逻辑）
   */
  async deductPoints(amount, reason) {
    const current = await this.getPoints()
    if (current < amount) {
      throw new Error('积分不足')
    }
    await this.setPoints(current - amount)
    await this.addPointsRecord({
      id: `R${Date.now()}`,
      type: 'spend',
      amount: -amount,
      reason,
      createdAt: Date.now(),
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

  /**
   * 添加单条积分记录（P0: 积分业务逻辑）
   * @param record 积分记录
   * @param targetUid 可选，指定用户ID（用于注册等场景）
   */
  async addPointsRecord(record, targetUid) {
    const uid = targetUid || await this.requireCurrentUserUid()
    await this.putRow('pin_points_records', {
      uid,
      recordId: record.id,
    }, {
      title: record.reason || record.title,
      amount: Number(record.amount || 0),
      time: Number(record.createdAt || Date.now()),
    })
  }

  async getProjects() {
    const uid = await this.requireCurrentUserUid()
    const rows = await this.listSingleKeyTable('pin_projects', 'projectId')
    return rows
      .filter((row) => !row.ownerUid || row.ownerUid === uid)
      .map((row) => this.normalizeProjectRow(row))
  }

  /**
   * 根据ID获取项目（P1: 作品发布）
   */
  async getProjectById(projectId) {
    const uid = await this.requireCurrentUserUid()
    const row = await this.getRow('pin_projects', { projectId })
    if (!row || (row.ownerUid && row.ownerUid !== uid)) {
      return null
    }
    return this.normalizeProjectRow(row)
  }

  /**
   * 发布项目为社区作品（P1: 作品发布）
   */
  async publishProjectAsArtwork(projectId, options = {}) {
    const uid = await this.requireCurrentUserUid()
    const project = await this.getProjectById(projectId)
    if (!project) {
      throw new Error('项目不存在')
    }

    const artworkId = `A${Date.now().toString(36).toUpperCase()}`
    const artwork = {
      id: artworkId,
      title: options.title || project.name,
      description: options.description || '',
      authorUid: uid,
      grid: project.canvasData?.grid || [],
      colors: project.canvasData?.colors || [],
      likes: 0,
      favorites: 0,
      price: Number(options.price || 0),
      isForSale: !!options.isForSale,
      createdAt: Date.now(),
    }

    // 保存作品
    const artworks = await this.getArtworks()
    artworks.push(artwork)
    await this.setArtworks(artworks)

    // 更新项目状态
    await this.putRow('pin_projects', { projectId }, {
      ...project,
      isPublished: true,
      publishedArtworkId: artworkId,
      publishPoints: Number(options.price || 0),
      updatedAt: Date.now(),
    })

    return artwork
  }

  /**
   * 下架作品（P1: 作品发布）
   */
  async unpublishArtwork(projectId) {
    const uid = await this.requireCurrentUserUid()
    const project = await this.getProjectById(projectId)
    if (!project) {
      throw new Error('项目不存在')
    }

    // 从作品列表中移除
    const artworks = await this.getArtworks()
    const filtered = artworks.filter(a => a.id !== project.publishedArtworkId)
    await this.setArtworks(filtered)

    // 更新项目状态
    await this.putRow('pin_projects', { projectId }, {
      ...project,
      isPublished: false,
      publishedArtworkId: '',
      isOffShelf: true,
      updatedAt: Date.now(),
    })
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

  /**
   * P1: 增量操作 - 点赞作品
   */
  async likeArtwork(artworkId) {
    const likedIds = await this.getLikedArtworkIds()
    if (likedIds.includes(artworkId)) {
      return { liked: true, message: '已点赞' }
    }
    likedIds.push(artworkId)
    await this.setLikedArtworkIds(likedIds)

    // 增加作品点赞数
    const artworks = await this.getArtworks()
    const artwork = artworks.find(a => a.id === artworkId)
    if (artwork) {
      artwork.likes = (artwork.likes || 0) + 1
      await this.setArtworks(artworks)
    }

    return { liked: true, likes: artwork?.likes || 1 }
  }

  /**
   * P1: 增量操作 - 取消点赞
   */
  async unlikeArtwork(artworkId) {
    const likedIds = await this.getLikedArtworkIds()
    const index = likedIds.indexOf(artworkId)
    if (index === -1) {
      return { liked: false, message: '未点赞' }
    }
    likedIds.splice(index, 1)
    await this.setLikedArtworkIds(likedIds)

    // 减少作品点赞数
    const artworks = await this.getArtworks()
    const artwork = artworks.find(a => a.id === artworkId)
    if (artwork && artwork.likes > 0) {
      artwork.likes = artwork.likes - 1
      await this.setArtworks(artworks)
    }

    return { liked: false, likes: artwork?.likes || 0 }
  }

  /**
   * P1: 增量操作 - 收藏作品
   */
  async favoriteArtwork(artworkId) {
    const favoritedIds = await this.getFavoritedArtworkIds()
    if (favoritedIds.includes(artworkId)) {
      return { favorited: true, message: '已收藏' }
    }
    favoritedIds.push(artworkId)
    await this.setFavoritedArtworkIds(favoritedIds)

    // 增加作品收藏数
    const artworks = await this.getArtworks()
    const artwork = artworks.find(a => a.id === artworkId)
    if (artwork) {
      artwork.favorites = (artwork.favorites || 0) + 1
      await this.setArtworks(artworks)
    }

    return { favorited: true, favorites: artwork?.favorites || 1 }
  }

  /**
   * P1: 增量操作 - 取消收藏
   */
  async unfavoriteArtwork(artworkId) {
    const favoritedIds = await this.getFavoritedArtworkIds()
    const index = favoritedIds.indexOf(artworkId)
    if (index === -1) {
      return { favorited: false, message: '未收藏' }
    }
    favoritedIds.splice(index, 1)
    await this.setFavoritedArtworkIds(favoritedIds)

    // 减少作品收藏数
    const artworks = await this.getArtworks()
    const artwork = artworks.find(a => a.id === artworkId)
    if (artwork && artwork.favorites > 0) {
      artwork.favorites = artwork.favorites - 1
      await this.setArtworks(artworks)
    }

    return { favorited: false, favorites: artwork?.favorites || 0 }
  }

  /**
   * P1: 增量操作 - 关注用户
   */
  async followUser(targetUid) {
    const followedCreators = await this.getFollowedCreators()
    if (followedCreators.includes(targetUid)) {
      return { following: true, message: '已关注' }
    }
    followedCreators.push(targetUid)
    await this.setFollowedCreators(followedCreators)
    return { following: true }
  }

  /**
   * P1: 增量操作 - 取消关注
   */
  async unfollowUser(targetUid) {
    const followedCreators = await this.getFollowedCreators()
    const index = followedCreators.indexOf(targetUid)
    if (index === -1) {
      return { following: false, message: '未关注' }
    }
    followedCreators.splice(index, 1)
    await this.setFollowedCreators(followedCreators)
    return { following: false }
  }

  /**
   * P0: 购买作品（积分校验 + 扣减 + 记录购买）
   */
  async purchaseArtwork(artworkId) {
    const uid = await this.requireCurrentUserUid()

    // 获取作品信息
    const artworks = await this.getArtworks()
    const artwork = artworks.find(a => a.id === artworkId)
    if (!artwork) {
      throw new Error('作品不存在')
    }
    if (!artwork.isForSale || !artwork.price || artwork.price <= 0) {
      throw new Error('该作品不可购买')
    }
    if (artwork.authorUid === uid) {
      throw new Error('不能购买自己的作品')
    }

    // 检查是否已购买
    const purchasedIds = await this.getPurchasedArtworkIds()
    if (purchasedIds.includes(artworkId)) {
      throw new Error('已购买过该作品')
    }

    // 校验积分余额
    const currentPoints = await this.getPoints()
    if (currentPoints < artwork.price) {
      throw new Error(`积分不足，需要 ${artwork.price} 积分，当前余额 ${currentPoints}`)
    }

    // 扣减积分
    await this.deductPoints(artwork.price, `购买作品: ${artwork.title || artworkId}`)

    // 记录购买
    purchasedIds.push(artworkId)
    await this.setPurchasedArtworkIds(purchasedIds)

    // 增加作品 useCount
    artwork.useCount = (artwork.useCount || 0) + 1
    await this.setArtworks(artworks)

    return {
      purchased: true,
      pointsDeducted: artwork.price,
      remainingPoints: currentPoints - artwork.price,
      artwork: {
        id: artwork.id,
        title: artwork.title,
        grid: artwork.grid,
        colors: artwork.colors,
      },
    }
  }

  /**
   * P1: 获取单个作品详情
   */
  async getArtworkById(artworkId) {
    const artworks = await this.getArtworks()
    return artworks.find(a => a.id === artworkId) || null
  }

  /**
   * P1: 更新作品浏览量
   */
  async updateArtworkViewCount(artworkId, viewCount) {
    const artworks = await this.getArtworks()
    const artwork = artworks.find(a => a.id === artworkId)
    if (artwork) {
      artwork.viewCount = viewCount
      await this.setArtworks(artworks)
    }
  }

  /**
   * P1: 注销账号（清除所有关联数据）
   */
  async unregisterCurrentUser() {
    const uid = await this.requireCurrentUserUid()

    // 逐步骤删除，每个步骤独立容错
    const safeDelete = async (label, fn) => {
      try {
        await fn()
      } catch (error) {
        console.warn(`unregister: ${label} 删除失败（已跳过）:`, error.message)
      }
    }

    // 删除用户信息（积分余额也在 pin_users 表中）
    await safeDelete('用户信息', () => this.deleteRow('pin_users', { uid }))

    // 删除积分记录
    await safeDelete('积分记录', async () => {
      const pointRecords = await this.listDoubleKeyTable('pin_points_records', 'uid', uid, 'recordId')
      for (const record of pointRecords) {
        if (record.recordId) {
          await this.deleteRow('pin_points_records', { uid, recordId: String(record.recordId) })
        }
      }
    })

    // 删除项目
    await safeDelete('项目', async () => {
      const projects = await this.listSingleKeyTable('pin_projects', 'projectId')
      for (const project of projects) {
        if (project.ownerUid === uid && project.projectId) {
          await this.deleteRow('pin_projects', { projectId: project.projectId })
        }
      }
    })

    // 删除设置
    await safeDelete('设置', () => this.deleteRow('pin_settings', { uid }))

    // 删除关系（使用双键表精确查询当前用户的所有关系）
    await safeDelete('关系', async () => {
      const relations = await this.listDoubleKeyTable('pin_relations', 'uid', uid, 'relationKey')
      for (const relation of relations) {
        if (relation.relationKey) {
          await this.deleteRow('pin_relations', { uid, relationKey: relation.relationKey })
        }
      }
    })
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
