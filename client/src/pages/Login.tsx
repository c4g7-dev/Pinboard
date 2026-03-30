import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { Navigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Pin } from "lucide-react"

export default function LoginPage() {
  const { user, login, register } = useAuth()
  const [tab, setTab] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      if (tab === "login") {
        await login(username.trim(), pin)
      } else {
        await register(username.trim(), pin)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-1"><Pin className="h-7 w-7 text-primary" /></div>
          <CardTitle className="text-xl text-primary">Pinboard</CardTitle>
          <p className="text-sm text-muted-foreground">Mod suggestion board</p>
        </CardHeader>
        <CardContent>
          {/* Tab Switcher */}
          <div className="flex rounded-lg border overflow-hidden mb-6">
            <button
              type="button"
              onClick={() => { setTab("login"); setError("") }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                tab === "login"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setTab("register"); setError("") }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                tab === "register"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Username
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your name"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                4-Digit PIN
              </label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                maxLength={4}
                inputMode="numeric"
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : tab === "login" ? "Login" : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
