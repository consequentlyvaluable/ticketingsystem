import axios from 'axios'
import type { Session } from '@supabase/supabase-js'

const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim()

const api = axios.create({
  baseURL: configuredBaseUrl?.length ? configuredBaseUrl : undefined
})

export function setSession (session: Session | null) {
  if (session?.access_token) {
    api.defaults.headers.common.Authorization = `Bearer ${session.access_token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

export { api }
