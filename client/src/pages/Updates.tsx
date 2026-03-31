import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import type { Update } from "@/lib/types"
import { Navigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Pin, Plus, Trash2, Newspaper, LogOut, PackageCheck, XCircle, Download } from "lucide-react"

function formatDate(dateStr: string) {
  const utc = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z'
  const d = new Date(utc)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function renderBody(body: string) {
  // Simple line-based rendering: lines starting with + / - / ~ get colored
  return body.split('\n').map((line, i) => {
    const trimmed = line.trimStart()
    if (trimmed.startsWith('+ ')) {
      return <div key={i} className="text-emerald-400 font-mono text-sm">{line}</div>
    }
    if (trimmed.startsWith('- ')) {
      return <div key={i} className="text-red-400 font-mono text-sm">{line}</div>
    }
    if (trimmed.startsWith('~ ')) {
      return <div key={i} className="text-yellow-400 font-mono text-sm">{line}</div>
    }
    if (trimmed.startsWith('## ')) {
      return <h3 key={i} className="text-base font-bold mt-4 mb-1">{trimmed.slice(3)}</h3>
    }
    if (trimmed.startsWith('### ')) {
      return <h4 key={i} className="text-sm font-semibold mt-3 mb-1 text-muted-foreground">{trimmed.slice(4)}</h4>
    }
    if (trimmed === '') {
      return <div key={i} className="h-2" />
    }
    return <div key={i} className="text-sm text-foreground/90">{line}</div>
  })
}

export default function UpdatesPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const [updates, setUpdates] = useState<Update[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [clearResolved, setClearResolved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dlCurseforge, setDlCurseforge] = useState("")
  const [dlModrinth, setDlModrinth] = useState("")
  const [dlPrism, setDlPrism] = useState("")

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const data = await api.listUpdates() as Update[]
        setUpdates(data)
      } catch { /* ignore */ }
      setLoading(false)
    })()
  }, [user])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  const isAdmin = user.is_admin === 1

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSubmitting(true)
    try {
      const downloads: Record<string, string> = {}
      if (dlCurseforge.trim()) downloads.curseforge = dlCurseforge.trim()
      if (dlModrinth.trim()) downloads.modrinth = dlModrinth.trim()
      if (dlPrism.trim()) downloads.prism = dlPrism.trim()
      const data = await api.createUpdate(title.trim(), body.trim(), clearResolved, Object.keys(downloads).length > 0 ? downloads : undefined) as Update
      setUpdates(prev => [data, ...prev])
      setTitle("")
      setBody("")
      setClearResolved(false)
      setDlCurseforge("")
      setDlModrinth("")
      setDlPrism("")
      setCreating(false)
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this update?")) return
    try {
      await api.deleteUpdate(id)
      setUpdates(prev => prev.filter(u => u.id !== id))
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
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" /> Board
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">@{user.username}</span>
            <Button variant="ghost" size="icon" onClick={logout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <div className="h-3" />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Modpack Updates</h2>
          </div>
          {isAdmin && !creating && (
            <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Update
            </Button>
          )}
        </div>

        {/* Create Form (admin) */}
        {isAdmin && creating && (
          <Card className="p-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Update title (e.g. Modpack v2.0 — March 2026)"
                maxLength={200}
                required
              />
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={"Write your update here...\n\nUse + for added mods, - for removed mods\n## for headings"}
                maxLength={10000}
                rows={12}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y font-mono"
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearResolved}
                  onChange={e => setClearResolved(e.target.checked)}
                  className="rounded border-border"
                />
                Archive resolved suggestions (added & rejected) to this update
              </label>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Download Links (optional)</p>
                <Input
                  value={dlCurseforge}
                  onChange={e => setDlCurseforge(e.target.value)}
                  placeholder="CurseForge download URL"
                  type="url"
                />
                <Input
                  value={dlModrinth}
                  onChange={e => setDlModrinth(e.target.value)}
                  placeholder="Modrinth download URL"
                  type="url"
                />
                <Input
                  value={dlPrism}
                  onChange={e => setDlPrism(e.target.value)}
                  placeholder="Prism Launcher download URL"
                  type="url"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting} className="gap-1.5">
                  <Plus className="h-4 w-4" /> {submitting ? "Posting..." : "Post Update"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Latest Download Hero */}
        {!loading && updates.length > 0 && updates[0].downloads && Object.keys(updates[0].downloads).length > 0 && (
          <Card className="p-0 overflow-hidden border-primary/20">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <Download className="h-5 w-5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Latest Release</span>
              </div>
              <h3 className="text-lg font-bold">{updates[0].title}</h3>
            </div>
            <div className="px-5 pb-4 pt-3 flex flex-wrap gap-3">
              {updates[0].downloads.curseforge && (
                <a href={updates[0].downloads.curseforge} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px]">
                  <Button variant="outline" className="w-full gap-2 h-11 text-orange-400 border-orange-400/30 hover:bg-orange-400/10 hover:border-orange-400/50 transition-all">
                    <Download className="h-4 w-4" /> CurseForge
                  </Button>
                </a>
              )}
              {updates[0].downloads.modrinth && (
                <a href={updates[0].downloads.modrinth} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px]">
                  <Button variant="outline" className="w-full gap-2 h-11 text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10 hover:border-emerald-400/50 transition-all">
                    <Download className="h-4 w-4" /> Modrinth
                  </Button>
                </a>
              )}
              {updates[0].downloads.prism && (
                <a href={updates[0].downloads.prism} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px]">
                  <Button variant="outline" className="w-full gap-2 h-11 text-blue-400 border-blue-400/30 hover:bg-blue-400/10 hover:border-blue-400/50 transition-all">
                    <Download className="h-4 w-4" /> Prism Launcher
                  </Button>
                </a>
              )}
            </div>
          </Card>
        )}

        {/* Updates List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : updates.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Newspaper className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-lg mb-1">No updates yet</p>
            <p className="text-sm">Check back later for modpack changelogs.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map(u => (
              <Card key={u.id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-lg font-bold leading-snug">{u.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(u.created_at)}</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer shrink-0"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="border-t border-border pt-3">
                  {renderBody(u.body)}
                </div>
                {u.downloads && (Object.keys(u.downloads).length > 0) && (
                  <div className="border-t border-border mt-4 pt-4">
                    <div className="rounded-xl bg-gradient-to-r from-primary/8 via-transparent to-transparent p-4 border border-primary/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Download className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold">Download this version</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {u.downloads.curseforge && (
                          <a href={u.downloads.curseforge} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="gap-2 text-orange-400 border-orange-400/30 hover:bg-orange-400/10 hover:border-orange-400/50 transition-all">
                              <Download className="h-3.5 w-3.5" /> CurseForge
                            </Button>
                          </a>
                        )}
                        {u.downloads.modrinth && (
                          <a href={u.downloads.modrinth} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="gap-2 text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10 hover:border-emerald-400/50 transition-all">
                              <Download className="h-3.5 w-3.5" /> Modrinth
                            </Button>
                          </a>
                        )}
                        {u.downloads.prism && (
                          <a href={u.downloads.prism} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="gap-2 text-blue-400 border-blue-400/30 hover:bg-blue-400/10 hover:border-blue-400/50 transition-all">
                              <Download className="h-3.5 w-3.5" /> Prism Launcher
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {u.suggestions && u.suggestions.length > 0 && (
                  <div className="border-t border-border mt-4 pt-3">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Resolved Suggestions</h4>
                    <div className="space-y-1">
                      {u.suggestions.filter(s => s.status === 'added').length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                            <PackageCheck className="h-3.5 w-3.5" /> Added
                          </span>
                          {u.suggestions.filter(s => s.status === 'added').map(s => (
                            <div key={s.id} className="flex items-center gap-2 text-sm py-0.5 pl-5">
                              <span className="text-emerald-400">+</span>
                              {s.mod_url ? (
                                <a href={s.mod_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.mod_name}</a>
                              ) : (
                                <span>{s.mod_name}</span>
                              )}
                              <span className="text-xs text-muted-foreground">by @{s.username}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {u.suggestions.filter(s => s.status === 'accepted').length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-semibold text-emerald-400/70 uppercase tracking-wider flex items-center gap-1 mb-1">
                            Accepted
                          </span>
                          {u.suggestions.filter(s => s.status === 'accepted').map(s => (
                            <div key={s.id} className="flex items-center gap-2 text-sm py-0.5 pl-5">
                              <span className="text-emerald-400/70">~</span>
                              {s.mod_url ? (
                                <a href={s.mod_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.mod_name}</a>
                              ) : (
                                <span>{s.mod_name}</span>
                              )}
                              <span className="text-xs text-muted-foreground">by @{s.username}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {u.suggestions.filter(s => s.status === 'rejected').length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                            <XCircle className="h-3.5 w-3.5" /> Rejected
                          </span>
                          {u.suggestions.filter(s => s.status === 'rejected').map(s => (
                            <div key={s.id} className="flex items-center gap-2 text-sm py-0.5 pl-5">
                              <span className="text-red-400">-</span>
                              {s.mod_url ? (
                                <a href={s.mod_url} target="_blank" rel="noopener noreferrer" className="text-primary/60 hover:underline line-through">{s.mod_name}</a>
                              ) : (
                                <span className="line-through text-foreground/60">{s.mod_name}</span>
                              )}
                              <span className="text-xs text-muted-foreground">by @{s.username}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
