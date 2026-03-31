export interface User {
  id: number
  username: string
  is_admin: number
  created_at?: string
}

export interface Suggestion {
  id: number
  mod_name: string
  mod_url: string | null
  og_title: string | null
  og_desc: string | null
  og_image: string | null
  status: "pending" | "accepted" | "added" | "rejected"
  created_at: string
  username: string
  user_id: number
  score: number
  user_vote: number | null
}

export interface UpdateSuggestion {
  id: number
  mod_name: string
  mod_url: string | null
  status: "accepted" | "added" | "rejected"
  username: string
}

export interface Update {
  id: number
  title: string
  body: string
  created_at: string
  suggestions: UpdateSuggestion[]
}
