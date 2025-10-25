import express from 'express'
import { supabase } from '../supabaseClient.js'
import { authenticate, handleSupabaseError, requireTenantMembership } from '../middleware.js'

const router = express.Router()

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { tenantId, projectId } = req.query

    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId query parameter is required' })
    }

    await requireTenantMembership(req.user.id, tenantId)

    let query = supabase
      .from('tickets')
      .select('id, project_id, tenant_id, title, description, status, priority, assignee_id, reporter_id, created_at, updated_at')
      .eq('tenant_id', tenantId)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    res.json({ tickets: data })
  } catch (error) {
    handleSupabaseError(res, error)
  }
})

router.post('/', async (req, res) => {
  try {
    const { tenantId, projectId, title, description, priority = 'medium', assigneeId } = req.body

    if (!tenantId || !projectId || !title) {
      return res.status(400).json({ message: 'tenantId, projectId and title are required' })
    }

    await requireTenantMembership(req.user.id, tenantId)

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert([{ tenant_id: tenantId, project_id: projectId, title, description, priority, reporter_id: req.user.id, assignee_id: assigneeId }])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ ticket })
  } catch (error) {
    handleSupabaseError(res, error)
  }
})

router.patch('/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params
    const { tenantId, status, assigneeId, title, description, priority } = req.body

    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId is required' })
    }

    await requireTenantMembership(req.user.id, tenantId)

    const updates = {}

    if (status) updates.status = status
    if (assigneeId !== undefined) updates.assignee_id = assigneeId
    if (title) updates.title = title
    if (description) updates.description = description
    if (priority) updates.priority = priority

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No updates supplied' })
    }

    const { data: ticket, error } = await supabase
      .from('tickets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', ticketId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error

    res.json({ ticket })
  } catch (error) {
    handleSupabaseError(res, error)
  }
})

router.get('/:ticketId/comments', async (req, res) => {
  try {
    const { ticketId } = req.params
    const { tenantId } = req.query

    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId query parameter is required' })
    }

    await requireTenantMembership(req.user.id, tenantId)

    const { data, error } = await supabase
      .from('ticket_comments')
      .select('id, ticket_id, body, author_id, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error) throw error

    res.json({ comments: data })
  } catch (error) {
    handleSupabaseError(res, error)
  }
})

router.post('/:ticketId/comments', async (req, res) => {
  try {
    const { ticketId } = req.params
    const { tenantId, body } = req.body

    if (!tenantId || !body) {
      return res.status(400).json({ message: 'tenantId and body are required' })
    }

    await requireTenantMembership(req.user.id, tenantId)

    const { data: comment, error } = await supabase
      .from('ticket_comments')
      .insert([{ ticket_id: ticketId, tenant_id: tenantId, body, author_id: req.user.id }])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({ comment })
  } catch (error) {
    handleSupabaseError(res, error)
  }
})

export default router
