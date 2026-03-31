import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import type { Suggestion } from "@/lib/types"
import { Navigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronUp, ChevronDown, Trash2, Plus, ArrowUpDown, Clock, LogOut, Shield, Pin, CircleCheck, PackageCheck, XCircle, Pencil, X, Save, Newspaper } from "lucide-react"

function timeAgo(dateStr: string) {
  // Ensure UTC interpretation: SQLite datetimes lack 'Z' suffix
  const utc = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z'
  const diff = Date.now() - new Date(utc).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [sort, setSort] = useState<"score" | "newest">("score")
  const [modName, setModName] = useState("")
  const [modUrl, setModUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loadingList, setLoadingList] = useState(true)

  const fetchSuggestions = useCallback(async () => {
    try {
      const data = await api.listSuggestions(sort) as Suggestion[]
      setSuggestions(data)
    } catch { /* ignore */ }
    setLoadingList(false)
  }, [sort])

  useEffect(() => {
    if (user) fetchSuggestions()
  }, [user, fetchSuggestions])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modName.trim()) return
    setSubmitting(true)
    try {
      await api.addSuggestion(modName.trim(), modUrl.trim() || undefined)
      setModName("")
      setModUrl("")
      await fetchSuggestions()
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  const handleVote = async (id: number, currentVote: number | null, direction: 1 | -1) => {
    const value = currentVote === direction ? 0 : direction
    try {
      const data = await api.vote(id, value) as { score: number; user_vote: number | null }
      setSuggestions(prev =>
        prev.map(s => s.id === id ? { ...s, score: data.score, user_vote: data.user_vote } : s)
      )
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this suggestion?")) return
    try {
      await api.deleteSuggestion(id)
      setSuggestions(prev => prev.filter(s => s.id !== id))
    } catch { /* ignore */ }
  }

  const handleSetStatus = async (id: number, status: "pending" | "accepted" | "added" | "rejected") => {
    try {
      await api.setStatus(id, status)
      setSuggestions(prev =>
        prev.map(s => s.id === id ? { ...s, status } : s)
      )
    } catch { /* ignore */ }
  }

  const handleEdit = async (id: number, mod_name: string, mod_url?: string) => {
    try {
      const data = await api.editSuggestion(id, mod_name, mod_url) as {
        id: number; mod_name: string; mod_url: string | null;
        og_title: string | null; og_desc: string | null; og_image: string | null
      }
      setSuggestions(prev =>
        prev.map(s => s.id === id ? { ...s, ...data } : s)
      )
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 px-4 pt-3 pb-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-5 h-12 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg shadow-black/20">
          <h1 className="text-lg font-bold text-primary flex items-center gap-2">
            <Pin className="h-4 w-4" /> Pinboard
          </h1>
          <div className="flex items-center gap-3">
            <Link to="/updates">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Newspaper className="h-4 w-4" /> Updates
              </Button>
            </Link>
            {user.is_admin === 1 && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <Shield className="h-4 w-4" /> Admin
                </Button>
              </Link>
            )}
            <span className="text-sm text-muted-foreground">@{user.username}</span>
            <Button variant="ghost" size="icon" onClick={logout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <div className="h-3" />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Add Form */}
        <Card className="p-4">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={modName}
                onChange={e => setModName(e.target.value)}
                placeholder="Mod name..."
                maxLength={100}
                className="flex-1"
                required
              />
              <Button type="submit" disabled={submitting} className="gap-1.5 shrink-0">
                <Plus className="h-4 w-4" />
                {submitting ? "..." : "Add"}
              </Button>
            </div>
            <Input
              value={modUrl}
              onChange={e => setModUrl(e.target.value)}
              placeholder="Link (optional, e.g. modrinth.com/mod/...)"
              type="url"
            />
          </form>
        </Card>

        {/* Sort Bar */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Sort</span>
          <Button
            variant={sort === "score" ? "default" : "outline"}
            size="sm"
            onClick={() => setSort("score")}
            className="gap-1"
          >
            <ArrowUpDown className="h-3.5 w-3.5" /> Top
          </Button>
          <Button
            variant={sort === "newest" ? "default" : "outline"}
            size="sm"
            onClick={() => setSort("newest")}
            className="gap-1"
          >
            <Clock className="h-3.5 w-3.5" /> New
          </Button>
        </div>

        {/* Suggestions */}
        {loadingList ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg mb-1">No suggestions yet</p>
            <p className="text-sm">Be the first to suggest a mod!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map(s => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                isOwn={s.user_id === user.id}
                isAdmin={user.is_admin === 1}
                onVote={handleVote}
                onDelete={handleDelete}
                onSetStatus={handleSetStatus}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function SuggestionCard({
  suggestion: s,
  isOwn,
  isAdmin,
  onVote,
  onDelete,
  onSetStatus,
  onEdit,
}: {
  suggestion: Suggestion
  isOwn: boolean
  isAdmin: boolean
  onVote: (id: number, currentVote: number | null, direction: 1 | -1) => void
  onDelete: (id: number) => void
  onSetStatus: (id: number, status: "pending" | "accepted" | "added" | "rejected") => void
  onEdit: (id: number, mod_name: string, mod_url?: string) => void
}) {
  const canDelete = isOwn || isAdmin
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(s.mod_name)
  const [editUrl, setEditUrl] = useState(s.mod_url || "")

  const statusConfig = {
    pending: { label: null, icon: null, color: "", border: "" },
    accepted: { label: "Accepted", icon: CircleCheck, color: "text-emerald-400", border: "border-emerald-400/30" },
    added: { label: "Added", icon: PackageCheck, color: "text-emerald-400", border: "border-emerald-400/30" },
    rejected: { label: "Rejected", icon: XCircle, color: "text-red-400", border: "border-red-400/30" },
  }
  const st = statusConfig[s.status] || statusConfig.pending

  const handleSaveEdit = () => {
    if (!editName.trim()) return
    onEdit(s.id, editName.trim(), editUrl.trim() || undefined)
    setEditing(false)
  }

  return (
    <Card className={`flex gap-3 p-4 ${st.border} ${s.status === "rejected" ? "opacity-60" : ""}`}>
      {/* Vote Controls */}
      <div className="flex flex-col items-center gap-0.5 pt-0.5">
        <button
          onClick={() => onVote(s.id, s.user_vote, 1)}
          disabled={isOwn}
          className={`p-1 rounded transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
            s.user_vote === 1 ? "text-emerald-400" : "text-muted-foreground hover:text-emerald-400"
          }`}
          title="Upvote"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <span className={`text-sm font-bold tabular-nums ${
          s.score > 0 ? "text-emerald-400" : s.score < 0 ? "text-destructive" : "text-muted-foreground"
        }`}>
          {s.score}
        </span>
        <button
          onClick={() => onVote(s.id, s.user_vote, -1)}
          disabled={isOwn}
          className={`p-1 rounded transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
            s.user_vote === -1 ? "text-destructive" : "text-muted-foreground hover:text-destructive"
          }`}
          title="Downvote"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <Input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Mod name..."
              maxLength={100}
            />
            <Input
              value={editUrl}
              onChange={e => setEditUrl(e.target.value)}
              placeholder="Link (optional)"
              type="url"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit} className="gap-1">
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setEditing(false); setEditName(s.mod_name); setEditUrl(s.mod_url || "") }} className="gap-1">
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className={`font-semibold leading-snug truncate ${s.status === "rejected" ? "line-through" : ""}`}>{s.mod_name}</h3>
                {st.icon && (
                  <span className={`flex items-center gap-1 shrink-0 ${st.color}`} title={st.label!}>
                    <st.icon className="h-4 w-4" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isAdmin && (
                  <select
                    value={s.status}
                    onChange={e => onSetStatus(s.id, e.target.value as "pending" | "accepted" | "added" | "rejected")}
                    className="text-xs bg-secondary text-muted-foreground border border-border rounded px-1.5 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="added">Added</option>
                    <option value="rejected">Rejected</option>
                  </select>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-muted-foreground hover:text-primary transition-colors p-1 cursor-pointer"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDelete(s.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>@{s.username}</span>
          <span>·</span>
          <span>{timeAgo(s.created_at)}</span>
          {isOwn && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">you</Badge>}
          {s.status !== "pending" && (
            <Badge className={`text-[10px] px-1.5 py-0 ${
              s.status === "rejected"
                ? "bg-red-500/20 text-red-400 border-red-500/30"
                : s.status === "added"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-emerald-500/10 text-emerald-400/80 border-emerald-500/20"
            }`}>
              {s.status === "accepted" ? "Accepted" : s.status === "added" ? "Added" : "Rejected"}
            </Badge>
          )}
        </div>

        {/* OG Preview */}
        {(s.og_title || s.og_image) && s.mod_url ? (
          <a
            href={s.mod_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 mt-3 p-3 rounded-md border bg-background hover:border-primary/50 transition-colors group"
          >
            {s.og_image && (
              <img
                src={s.og_image}
                alt=""
                loading="lazy"
                className="w-16 h-16 rounded object-cover shrink-0 bg-secondary"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                {s.og_title || s.mod_name}
              </p>
              {s.og_desc && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {s.og_desc}
                </p>
              )}
              <p className="text-xs text-muted-foreground/60 mt-1 truncate">{s.mod_url}</p>
            </div>
          </a>
        ) : s.mod_url ? (
          <a
            href={s.mod_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline mt-2 inline-block truncate max-w-full"
          >
            {s.mod_url}
          </a>
        ) : null}
          </>
        )}
      </div>
    </Card>
  )
}
