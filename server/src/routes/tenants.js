import express from 'express'
import { supabase } from '../supabaseClient.js'
import { authenticate, handleSupabaseError, requireTenantMembership } from '../middleware.js'

const router = express.Router()

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tenant_members')
      .select('role, tenants(id, name, slug, created_at)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    const tenants = (data || []).map(member => ({
      ...member.tenants,
      role: member.role
    }))

    res.json({ tenants })
  } catch (error) {
    handleSupabaseError(res, error)
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, slug } = req.body

    if (!name || !slug) {
      return res.status(400).json({ message: 'Name and slug are required' })
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert([{ name, slug, created_by: req.user.id }])
      .select()
      .single()

    if (error) throw error

    const { error: memberError } = await supabase
      .from('tenant_members')
      .insert([{ tenant_id: tenant.id, user_id: req.user.id, role: 'owner' }])

    if (memberError) throw memberError

    res.status(201).json({ tenant })
  } catch (error) {
    handleSupabaseError(res, error)
  }
})

router.post('/:tenantId/members', async (req, res) => {
  try {
    const { tenantId } = req.params
    const { email, role = 'member' } = req.body

    if (!email) {
      return res.status(400).json({ message: 'Member email is required' })
    }

    const membership = await requireTenantMembership(req.user.id, tenantId)

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can invite members' })
    }

    const { data: userLookup, error: lookupError } = await supabase.auth.admin.getUserByEmail(email)

    if (lookupError) throw lookupError

    if (!userLookup?.user) {
      return res.status(404).json({ message: 'User with that email does not exist yet. Ask them to sign up first.' })
    }

    const { data: existingMember, error: existingError } = await supabase
      .from('tenant_members')
      .select('id, role')
      .eq('tenant_id', tenantId)
      .eq('user_id', userLookup.user.id)
      .maybeSingle()

    if (existingError) throw existingError

    if (existingMember) {
      return res.status(409).json({ message: 'User is already a member of this tenant' })
    }

    const { error } = await supabase
      .from('tenant_members')
      .insert([{ tenant_id: tenantId, user_id: userLookup.user.id, role }])

    if (error) throw error

    res.status(201).json({ message: 'Member invited successfully' })
  } catch (error) {
    handleSupabaseError(res, error)
  }
})

export default router
