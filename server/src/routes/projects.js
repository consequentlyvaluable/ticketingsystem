import express from 'express'
import { supabase } from '../supabaseClient.js'
import { authenticate, handleSupabaseError, requireTenantMembership } from '../middleware.js'

const router = express.Router()

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { tenantId } = req.query

    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId query parameter is required' })
    }

    await requireTenantMembership(req.user.id, tenantId)

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description, status, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })

    if (error) throw error

    res.json({ projects: data })
  } catch (error) {
    handleSupabaseError(res, error)
  }
})

router.post('/', async (req, res) => {
  try {
    const { tenantId, name, description } = req.body

    if (!tenantId || !name) {
      return res.status(400).json({ message: 'tenantId and name are required' })
    }

    await requireTenantMembership(req.user.id, tenantId)

    const { data: project, error } = await supabase
      .from('projects')
      .insert([{ tenant_id: tenantId, name, description, created_by: req.user.id }])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ project })
  } catch (error) {
    handleSupabaseError(res, error)
  }
})

export default router
