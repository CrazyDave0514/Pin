/**
 * @fileoverview 认证状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string>(localStorage.getItem('admin_token') || '')
  const admin = ref<{ email: string; name: string } | null>(null)

  // Getters
  const isLoggedIn = computed(() => !!token.value)
  const adminEmail = computed(() => admin.value?.email || '')

  // Actions
  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('admin_token', newToken)
  }

  const clearToken = () => {
    token.value = ''
    admin.value = null
    localStorage.removeItem('admin_token')
  }

  const login = async (email: string, password: string) => {
    const result = await authApi.login({ email, password })
    setToken(result.token)
    admin.value = result.admin
    return result
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      clearToken()
    }
  }

  const fetchAdminInfo = async () => {
    if (!token.value) return
    try {
      const result = await authApi.getCurrentAdmin()
      admin.value = {
        email: result.admin.email,
        name: '管理员',
      }
    } catch {
      clearToken()
    }
  }

  return {
    token,
    admin,
    isLoggedIn,
    adminEmail,
    login,
    logout,
    fetchAdminInfo,
    clearToken,
  }
})
