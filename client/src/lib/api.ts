import axios from 'axios'
import type { Session } from '@supabase/supabase-js'

type AppConfig = {
  apiUrl?: string
}

declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig
    __APPLY_APP_CONFIG__?: (config?: AppConfig) => void
  }
}

const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim()

const isBrowser = typeof window !== 'undefined'
const hostname = isBrowser ? window.location.hostname : undefined
const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'

const localhostFallback = isLocalHost ? 'http://localhost:4000' : undefined

const api = axios.create({
  baseURL: configuredBaseUrl?.length ? configuredBaseUrl : localhostFallback
})

function applyRuntimeApiConfig (config?: AppConfig) {
  const candidate = config?.apiUrl?.trim()

  if (candidate) {
    api.defaults.baseURL = candidate
  }
}

if (isBrowser) {
  window.__APPLY_APP_CONFIG__ = applyRuntimeApiConfig

  if (window.__APP_CONFIG__) {
    applyRuntimeApiConfig(window.__APP_CONFIG__)
  }

  if (!api.defaults.baseURL && !isLocalHost) {
    console.warn('API base URL is not configured. Set VITE_API_URL or define window.__APP_CONFIG__.apiUrl in runtime-config.js')
  }
}

export function setSession (session: Session | null) {
  if (session?.access_token) {
    api.defaults.headers.common.Authorization = `Bearer ${session.access_token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

export { api }
