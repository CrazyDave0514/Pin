import assert from 'node:assert/strict'
import test from 'node:test'

import { createPinServices } from '../src/services/pin/index.ts'
import { MemoryStorageAdapter } from '../src/services/pin/storage-adapter.ts'

const createServices = () => {
  const storageAdapter = new MemoryStorageAdapter()
  return {
    storageAdapter,
    ...createPinServices({ storageAdapter }),
  }
}

test('register stores user, user list, and initial points', async () => {
  const { authService, pointsService } = createServices()

  const user = await authService.register('测试用户')

  assert.equal(user.username, '测试用户')
  assert.equal((await authService.getCurrentUser())?.uid, user.uid)
  assert.equal((await authService.getLastUser())?.uid, user.uid)
  assert.equal(await pointsService.getPointsBalance(), 100)
})

test('quick login restores last user and initializes points only when missing', async () => {
  const { authService, pointsService, provider } = createServices()

  const created = await authService.register('Alpha')
  await pointsService.setPointsBalance(0)
  await provider.removeCurrentUser()

  const loggedIn = await authService.quickLogin()

  assert.equal(loggedIn.uid, created.uid)
  assert.equal(await pointsService.getPointsBalance(), 100)
})

test('points display records seed defaults when storage is empty', async () => {
  const { pointsService } = createServices()

  const records = await pointsService.getDisplayRecords()

  assert.equal(records.length, 3)
  assert.deepEqual(records.map((item) => item.title), ['注册奖励', '每日签到', '发布作品'])
})

test('purchase deducts points, appends record, marks purchase, and increments use count', async () => {
  const { authService, communityService, purchaseService, pointsService } = createServices()

  await authService.register('Buyer')
  await pointsService.setPointsBalance(150)
  await communityService.replaceArtworks([
    {
      id: 'art_1',
      name: '星星图纸',
      creatorName: 'Creator',
      creatorAvatar: '',
      likes: 0,
      favorites: 0,
      points: 40,
      createdAt: 1,
      updatedAt: 1,
      tags: [],
      tagMeta: {},
      viewCount: 0,
      useCount: 2,
      isPublic: true,
      description: '',
      beadCount: 0,
      colorTypeCount: 0,
      canvasData: {
        width: 10,
        height: 10,
        backgroundColor: '#FFFFFF',
        beads: [],
        beadStyle: 'square',
        showColorCode: false,
      },
      thumbnail: '',
    },
  ])

  const result = await purchaseService.purchaseArtwork('art_1')

  assert.equal(result.success, true)
  assert.equal(result.balance, 110)
  assert.equal(result.artwork?.useCount, 3)
  assert.deepEqual(await communityService.getPurchasedArtworkIds(), ['art_1'])
  assert.equal((await pointsService.getRecords())[0]?.title, '购买星星图纸')
  assert.equal((await pointsService.getRecords())[0]?.amount, -40)
})

test('sync project artwork publishes latest project snapshot with current user info', async () => {
  const { authService, communityService, projectService } = createServices()

  await authService.register('发布者')
  await projectService.saveProjects([
    {
      id: 'project_1',
      name: '发布作品',
      createdAt: 100,
      updatedAt: 200,
      folderId: '',
      thumbnail: '',
      tags: { primary: '动物', secondary: '猫咪' },
      isPublished: true,
      isOffShelf: false,
      publishedArtworkId: '',
      publishPoints: 20,
      canvasData: {
        width: 12,
        height: 12,
        backgroundColor: '#FFFFFF',
        beads: [],
        beadStyle: 'round',
        showColorCode: false,
      },
    },
  ])

  const synced = await communityService.ensureArtworks()
  const published = synced.find((item) => item.projectId === 'project_1')

  assert.ok(published)
  assert.equal(published?.creatorName, '发布者')
  assert.equal(published?.points, 20)
  assert.equal(published?.isPublic, true)
})

test('recent imports are deduplicated and capped', async () => {
  const { projectService } = createServices()

  for (let index = 0; index < 12; index += 1) {
    await projectService.saveRecentImport({
      projectId: `project_${index % 8}`,
      name: `项目${index}`,
    })
  }

  const recent = await projectService.getRecentImports()

  assert.equal(recent.length, 5)
  assert.equal(new Set(recent.map((item) => item.projectId)).size, recent.length)
})
