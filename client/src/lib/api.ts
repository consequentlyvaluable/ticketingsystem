import axios from 'axios'
import type { Session } from '@supabase/supabase-js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000'
})

export function setSession (session: Session | null) {
  if (session?.access_token) {
    api.defaults.headers.common.Authorization = `Bearer ${session.access_token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

export { api }
