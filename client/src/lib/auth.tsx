import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { api } from "@/lib/api"
import type { User } from "@/lib/types"

interface AuthCtx {
  user: User | null
  loading: boolean
  login: (username: string, pin: string) => Promise<void>
  register: (username: string, pin: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.me()
      .then((u) => setUser(u as User))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, pin: string) => {
    const u = await api.login(username, pin) as User
    setUser(u)
  }, [])

  const register = useCallback(async (username: string, pin: string) => {
    const u = await api.register(username, pin) as User
    setUser(u)
  }, [])

  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be inside AuthProvider")
  return ctx
}
