async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...opts?.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Request failed")
  return data as T
}

export const api = {
  // Auth
  register: (username: string, pin: string) =>
    apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify({ username, pin }) }),
  login: (username: string, pin: string) =>
    apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ username, pin }) }),
  logout: () =>
    apiFetch("/api/auth/logout", { method: "POST" }),
  me: () =>
    apiFetch("/api/auth/me"),

  // Suggestions
  listSuggestions: (sort: string = "score") =>
    apiFetch(`/api/suggestions?sort=${sort}`),
  addSuggestion: (mod_name: string, mod_url?: string) =>
    apiFetch("/api/suggestions", { method: "POST", body: JSON.stringify({ mod_name, mod_url: mod_url || undefined }) }),
  deleteSuggestion: (id: number) =>
    apiFetch(`/api/suggestions/${id}`, { method: "DELETE" }),
  setStatus: (id: number, status: string) =>
    apiFetch(`/api/suggestions/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  editSuggestion: (id: number, mod_name: string, mod_url?: string) =>
    apiFetch(`/api/suggestions/${id}`, { method: "PATCH", body: JSON.stringify({ mod_name, mod_url: mod_url || undefined }) }),

  // Votes
  vote: (suggestionId: number, value: number) =>
    apiFetch(`/api/suggestions/${suggestionId}/vote`, { method: "POST", body: JSON.stringify({ value }) }),

  // Admin
  listUsers: () =>
    apiFetch("/api/admin/users"),
  deleteUser: (id: number) =>
    apiFetch(`/api/admin/users/${id}`, { method: "DELETE" }),

  // Updates
  listUpdates: () =>
    apiFetch("/api/updates"),
  createUpdate: (title: string, body: string, clearResolved: boolean = false) =>
    apiFetch("/api/updates", { method: "POST", body: JSON.stringify({ title, body, clearResolved }) }),
  deleteUpdate: (id: number) =>
    apiFetch(`/api/updates/${id}`, { method: "DELETE" }),
}
