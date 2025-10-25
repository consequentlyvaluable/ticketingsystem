import { supabase } from './supabaseClient.js'

export async function authenticate (req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Authorization token is missing' })
  }

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data?.user) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }

  req.user = data.user
  next()
}

export async function requireTenantMembership (userId, tenantId) {
  const { data, error } = await supabase
    .from('tenant_members')
    .select('id, role')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    const err = new Error('You are not a member of this tenant')
    err.status = 403
    throw err
  }

  return data
}

export function handleSupabaseError (res, error) {
  console.error(error)
  if (error?.status) {
    return res.status(error.status).json({ message: error.message })
  }

  return res.status(500).json({ message: 'Unexpected error', details: error?.message })
}
