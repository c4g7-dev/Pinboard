import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import type { User } from "@/lib/types"
import { Navigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, LogOut, Trash2 } from "lucide-react"

export default function AdminPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.is_admin) {
      api.listUsers()
        .then(data => setUsers(data as User[]))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [user])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin) return <Navigate to="/" replace />

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user and all their data?")) return
    try {
      await api.deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 px-4 pt-3 pb-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-5 h-12 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg shadow-black/20">
          <h1 className="text-lg font-bold text-primary">Admin Panel</h1>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={logout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <div className="h-3" />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Registered Users ({users.length})
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <Card key={u.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{u.username}</span>
                  {u.is_admin === 1 && <Badge>Admin</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
                {u.id !== user.id && !u.is_admin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(u.id)}
                    className="gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
