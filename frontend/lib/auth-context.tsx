"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { api } from "./api"
import type { User } from "./types"

const STORAGE_KEY = "rag.auth"

interface StoredAuth {
  user: User
  token: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) setAuth(JSON.parse(raw) as StoredAuth)
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [])

  const persist = useCallback((value: StoredAuth | null) => {
    setAuth(value)
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else window.localStorage.removeItem(STORAGE_KEY)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password)
      persist({ user: res.user, token: res.token })
    },
    [persist],
  )

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await api.register(email, password, name)
      persist({ user: res.user, token: res.token })
    },
    [persist],
  )

  const logout = useCallback(() => persist(null), [persist])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: auth?.user ?? null,
      token: auth?.token ?? null,
      loading,
      login,
      register,
      logout,
    }),
    [auth, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
