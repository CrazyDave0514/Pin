/**
 * @fileoverview 路由配置
 */

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory('/Pin/admin/'),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'Layout',
      component: () => import('@/components/AppLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: '仪表盘' },
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('@/views/UsersView.vue'),
          meta: { title: '用户管理' },
        },
        {
          path: 'users/:uid',
          name: 'UserDetail',
          component: () => import('@/views/UserDetailView.vue'),
          meta: { title: '用户详情' },
        },
        {
          path: 'artworks',
          name: 'Artworks',
          component: () => import('@/views/ArtworksView.vue'),
          meta: { title: '作品管理' },
        },
        {
          path: 'artworks/:id',
          name: 'ArtworkDetail',
          component: () => import('@/views/ArtworkDetailView.vue'),
          meta: { title: '作品详情' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (!to.meta.public && !authStore.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && authStore.isLoggedIn) {
    next('/')
  } else {
    next()
  }
})

export default router
