import axios from 'axios'
import type { Session } from '@supabase/supabase-js'

declare global {
  interface Window {
    __APP_CONFIG__?: {
      apiUrl?: string
    }
  }
}

const runtimeApiUrl = typeof window !== 'undefined'
  ? window.__APP_CONFIG__?.apiUrl?.trim()
  : undefined

const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim()

const localhostFallback = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:4000'
  : undefined

const resolvedBaseUrl = runtimeApiUrl?.length
  ? runtimeApiUrl
  : configuredBaseUrl?.length
      ? configuredBaseUrl
      : localhostFallback

if (!resolvedBaseUrl && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  console.warn('API base URL is not configured. Set VITE_API_URL or define window.__APP_CONFIG__.apiUrl in runtime-config.js')
}

const api = axios.create({
  baseURL: resolvedBaseUrl
})

export function setSession (session: Session | null) {
  if (session?.access_token) {
    api.defaults.headers.common.Authorization = `Bearer ${session.access_token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

export { api }
