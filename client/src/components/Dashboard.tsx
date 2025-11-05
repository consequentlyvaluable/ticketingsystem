import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Tenant {
  id: string
  name: string
  role: string | null
  created_at: string
}

interface Project {
  id: string
  tenant_id: string
  name: string
  description: string | null
  created_at: string
}

type TicketPriority = 'low' | 'medium' | 'high'

interface Ticket {
  id: string
  project_id: string
  tenant_id: string
  title: string
  description: string | null
  status: string
  priority: TicketPriority
  created_by: string | null
  created_at: string
  updated_at: string | null
}

interface Comment {
  id: string
  ticket_id: string
  tenant_id: string
  content: string
  author_id: string
  created_at: string
}

function priorityNumberToLabel (value: number | null | undefined): TicketPriority {
  if (value === null || value === undefined) return 'medium'
  if (value <= 1) return 'low'
  if (value >= 4) return 'high'
  return 'medium'
}

function priorityLabelToNumber (label: string): number {
  switch (label) {
    case 'low':
      return 1
    case 'high':
      return 5
    default:
      return 3
  }
}

function mapProjectRow (row: any): Project {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    description: row.description ?? null,
    created_at: row.created_at
  }
}

function mapTicketRow (row: any): Ticket {
  return {
    id: row.id,
    project_id: row.project_id,
    tenant_id: row.tenant_id,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    priority: priorityNumberToLabel(row.priority),
    created_by: row.created_by ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null
  }
}

function mapCommentRow (row: any): Comment {
  return {
    id: row.id,
    ticket_id: row.ticket_id,
    tenant_id: row.tenant_id,
    content: row.content ?? '',
    author_id: row.author_id,
    created_at: row.created_at
  }
}

const panelStyles: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '1rem',
  padding: '1.5rem',
  boxShadow: '0 15px 40px rgba(15, 23, 42, 0.08)'
}

const sectionTitle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 600,
  marginBottom: '0.75rem'
}

const badgeStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  borderRadius: '999px',
  padding: '0.25rem 0.75rem',
  backgroundColor: '#e0e7ff',
  color: '#4338ca',
  fontWeight: 600,
  fontSize: '0.8rem'
}

const listStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  marginTop: '1rem'
}

const labelStyles: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#1f2937'
}

const inputStyles: React.CSSProperties = {
  padding: '0.65rem 0.85rem',
  borderRadius: '0.65rem',
  border: '1px solid #cbd5f5',
  width: '100%'
}

const buttonStyles: React.CSSProperties = {
  padding: '0.65rem 1rem',
  borderRadius: '0.7rem',
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer'
}

type DashboardProps = {
  session: Session
}

export function Dashboard ({ session }: DashboardProps) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantLoading, setTenantLoading] = useState(false)
  const [tenantError, setTenantError] = useState<string | null>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedTicketId, setSelectedTicketId] = useState<string>('')

  const [creatingTenant, setCreatingTenant] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [creatingTicket, setCreatingTicket] = useState(false)
  const [commentBody, setCommentBody] = useState('')

  const selectedTenant = useMemo(
    () => (Array.isArray(tenants) ? tenants.find(tenant => tenant.id === selectedTenantId) : null),
    [tenants, selectedTenantId]
  )

  useEffect(() => {
    if (!session?.user?.id) {
      return
    }

    let active = true

    const fetchTenants = async () => {
      setTenantLoading(true)
      setTenantError(null)
      try {
        const { data, error } = await supabase
          .from('members')
          .select('role, tenants(id, name, created_at)')
          .eq('user_id', session.user.id)

        if (error) throw error

        const tenantList = (data ?? [])
          .map(member => {
            const tenant = (member as any).tenants
            if (!tenant) return null
            return {
              id: tenant.id,
              name: tenant.name,
              created_at: tenant.created_at,
              role: member.role ?? 'member'
            } as Tenant
          })
          .filter((tenant): tenant is Tenant => Boolean(tenant))

        if (!active) return

        setTenants(tenantList)
        setSelectedTenantId(currentId => {
          if (tenantList.length === 0) {
            return ''
          }
          if (currentId && tenantList.some(tenant => tenant.id === currentId)) {
            return currentId
          }
          return tenantList[0].id
        })
      } catch (error) {
        if (!active) return
        setTenantError(error instanceof Error ? error.message : 'Unable to load tenants')
      } finally {
        if (active) {
          setTenantLoading(false)
        }
      }
    }

    fetchTenants()

    return () => {
      active = false
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (!selectedTenantId) {
      setProjects([])
      setTickets([])
      setSelectedProjectId('')
      setSelectedTicketId('')
      setComments([])
      return
    }

    let active = true

    const loadTenantData = async () => {
      try {
        const { data: projectRows, error: projectError } = await supabase
          .from('projects')
          .select('id, tenant_id, name, description, created_at')
          .eq('tenant_id', selectedTenantId)
          .order('created_at', { ascending: true })

        if (projectError) throw projectError

        const mappedProjects = (projectRows ?? []).map(mapProjectRow)

        if (!active) return

        setProjects(mappedProjects)

        let nextProjectId = ''
        setSelectedProjectId(currentProjectId => {
          if (mappedProjects.length === 0) {
            nextProjectId = ''
            return ''
          }

          const stillValid = currentProjectId && mappedProjects.some(project => project.id === currentProjectId)
          if (stillValid) {
            nextProjectId = currentProjectId
            return currentProjectId
          }

          nextProjectId = mappedProjects[0].id
          return nextProjectId
        })

        const { data: ticketRows, error: ticketError } = await supabase
          .from('tickets')
          .select('id, tenant_id, project_id, title, description, status, priority, created_by, created_at, updated_at')
          .eq('tenant_id', selectedTenantId)
          .order('created_at', { ascending: false })

        if (ticketError) throw ticketError

        const mappedTickets = (ticketRows ?? []).map(mapTicketRow)

        if (!active) return

        setTickets(mappedTickets)

        let nextTicketId = ''
        setSelectedTicketId(currentTicketId => {
          if (mappedTickets.length === 0) {
            nextTicketId = ''
            return ''
          }

          const stillValid = currentTicketId && mappedTickets.some(ticket => ticket.id === currentTicketId && (!nextProjectId || ticket.project_id === nextProjectId))
          if (stillValid) {
            nextTicketId = currentTicketId
            return currentTicketId
          }

          const fallbackTicket = nextProjectId
            ? mappedTickets.find(ticket => ticket.project_id === nextProjectId)
            : mappedTickets[0]

          nextTicketId = fallbackTicket ? fallbackTicket.id : ''
          return nextTicketId
        })

        if (nextTicketId === '') {
          setComments([])
        }
      } catch (error) {
        console.error(error)
      }
    }

    loadTenantData()

    return () => {
      active = false
    }
  }, [selectedTenantId])

  useEffect(() => {
    if (!selectedTicketId || !selectedTenantId) {
      setComments([])
      return
    }

    let active = true

    const loadComments = async () => {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('id, ticket_id, tenant_id, content, author_id, created_at')
          .eq('ticket_id', selectedTicketId)
          .eq('tenant_id', selectedTenantId)
          .order('created_at', { ascending: true })

        if (error) throw error

        if (!active) return

        setComments((data ?? []).map(mapCommentRow))
      } catch (error) {
        if (active) {
          console.error(error)
        }
      }
    }

    loadComments()

    return () => {
      active = false
    }
  }, [selectedTicketId, selectedTenantId])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleCreateTenant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get('tenantName')?.toString().trim() ?? ''

    if (!name || !session.user?.id) return

    try {
      setCreatingTenant(true)

      const { data: tenantRow, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name })
        .select('id, name, created_at')
        .single()

      if (tenantError) throw tenantError
      if (!tenantRow) throw new Error('Unable to create tenant')

      const { error: memberError } = await supabase
        .from('members')
        .insert({ tenant_id: tenantRow.id, user_id: session.user.id, role: 'owner' })

      if (memberError) throw memberError

      const newTenant: Tenant = {
        id: tenantRow.id,
        name: tenantRow.name,
        created_at: tenantRow.created_at,
        role: 'owner'
      }

      setTenants(current => [...current, newTenant])
      setSelectedTenantId(newTenant.id)
      event.currentTarget.reset()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to create tenant')
    } finally {
      setCreatingTenant(false)
    }
  }

  const handleCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedTenantId) return
    const form = new FormData(event.currentTarget)
    const name = form.get('projectName')?.toString().trim() ?? ''
    const description = form.get('projectDescription')?.toString().trim() ?? ''

    if (!name) return

    try {
      setCreatingProject(true)
      const { data, error } = await supabase
        .from('projects')
        .insert({
          tenant_id: selectedTenantId,
          name,
          description: description.length ? description : null
        })
        .select('id, tenant_id, name, description, created_at')
        .single()

      if (error) throw error
      if (!data) throw new Error('Unable to create project')

      const project = mapProjectRow(data)
      setProjects(current => [...current, project])
      setSelectedProjectId(project.id)
      event.currentTarget.reset()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to create project')
    } finally {
      setCreatingProject(false)
    }
  }

  const handleCreateTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedTenantId || !selectedProjectId) return

    const form = new FormData(event.currentTarget)
    const title = form.get('ticketTitle')?.toString().trim() ?? ''
    const description = form.get('ticketDescription')?.toString().trim() ?? ''
    const priority = form.get('ticketPriority')?.toString() ?? 'medium'

    if (!title) return

    try {
      setCreatingTicket(true)
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          tenant_id: selectedTenantId,
          project_id: selectedProjectId,
          title,
          description: description.length ? description : null,
          priority: priorityLabelToNumber(priority),
          created_by: session.user.id
        })
        .select('id, tenant_id, project_id, title, description, status, priority, created_by, created_at, updated_at')
        .single()

      if (error) throw error
      if (!data) throw new Error('Unable to create ticket')

      const ticket = mapTicketRow(data)
      setTickets(current => [ticket, ...current])
      setSelectedTicketId(ticket.id)
      event.currentTarget.reset()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to create ticket')
    } finally {
      setCreatingTicket(false)
    }
  }

  const handleStatusChange = async (ticketId: string, status: string) => {
    if (!selectedTenantId) return

    try {
      const { data, error } = await supabase
        .from('tickets')
        .update({ status })
        .eq('id', ticketId)
        .eq('tenant_id', selectedTenantId)
        .select('id, tenant_id, project_id, title, description, status, priority, created_by, created_at, updated_at')
        .single()

      if (error) throw error
      if (!data) throw new Error('Unable to update ticket')

      const updatedTicket = mapTicketRow(data)
      setTickets(current => current.map(ticket => ticket.id === ticketId ? updatedTicket : ticket))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to update ticket')
    }
  }

  const handleCreateComment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!commentBody || !selectedTicketId || !selectedTenantId || !session.user?.id) return

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          tenant_id: selectedTenantId,
          ticket_id: selectedTicketId,
          author_id: session.user.id,
          content: commentBody
        })
        .select('id, ticket_id, tenant_id, content, author_id, created_at')
        .single()

      if (error) throw error
      if (!data) throw new Error('Unable to add comment')

      setComments(current => [...current, mapCommentRow(data)])
      setCommentBody('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to add comment')
    }
  }

  return (
    <div style={{ padding: '3rem 4vw', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '2rem' }}>Welcome back</h2>
          <p style={{ margin: 0, color: '#64748b' }}>{session.user.email}</p>
        </div>
        <button onClick={handleSignOut} style={{ ...buttonStyles, background: '#0f172a' }}>Sign out</button>
      </header>

      <div style={{ display: 'grid', gap: '1.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <section style={panelStyles}>
          <h3 style={sectionTitle}>Your Tenants</h3>
          {tenantLoading && <p>Loading tenants…</p>}
          {tenantError && <p style={{ color: '#dc2626' }}>{tenantError}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tenants.map(tenant => (
              <button
                key={tenant.id}
                onClick={() => setSelectedTenantId(tenant.id)}
                style={{
                  ...buttonStyles,
                  justifyContent: 'space-between',
                  display: 'flex',
                  alignItems: 'center',
                  background: tenant.id === selectedTenantId ? '#1d4ed8' : '#eff3ff',
                  color: tenant.id === selectedTenantId ? '#fff' : '#1d4ed8'
                }}
              >
                <span>{tenant.name}</span>
                <span style={{ ...badgeStyles, backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>{tenant.role ?? 'member'}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleCreateTenant} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={labelStyles} htmlFor="tenantName">Tenant name</label>
              <input id="tenantName" name="tenantName" required placeholder="Acme Corp" style={inputStyles} />
            </div>
            <button type="submit" style={{ ...buttonStyles, alignSelf: 'flex-start', opacity: creatingTenant ? 0.7 : 1 }} disabled={creatingTenant}>
              {creatingTenant ? 'Creating…' : 'Create tenant'}
            </button>
          </form>
        </section>

        <section style={panelStyles}>
          <h3 style={sectionTitle}>Projects</h3>
          {selectedTenant ? (
            <>
              <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyles} htmlFor="projectName">Project name</label>
                  <input id="projectName" name="projectName" placeholder="Support" required style={inputStyles} />
                </div>
                <div>
                  <label style={labelStyles} htmlFor="projectDescription">Description</label>
                  <textarea id="projectDescription" name="projectDescription" placeholder="Optional" style={{ ...inputStyles, minHeight: '4.5rem' }} />
                </div>
                <button type="submit" style={{ ...buttonStyles, alignSelf: 'flex-start', opacity: creatingProject ? 0.7 : 1 }} disabled={creatingProject}>
                  {creatingProject ? 'Saving…' : 'Add project'}
                </button>
              </form>

              <div style={listStyles}>
                {projects.map(project => (
                  <article
                    key={project.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.9rem',
                      padding: '1rem',
                      background: selectedProjectId === project.id ? '#eef2ff' : '#fff'
                    }}
                  >
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0 }}>{project.name}</h4>
                      <button
                        style={{ ...buttonStyles, background: '#4338ca', padding: '0.4rem 0.8rem' }}
                        onClick={() => {
                          setSelectedProjectId(project.id)
                          setSelectedTicketId('')
                        }}
                        type="button"
                      >
                        View tickets
                      </button>
                    </header>
                    {project.description && <p style={{ marginTop: '0.5rem', color: '#475569' }}>{project.description}</p>}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p>Select or create a tenant first.</p>
          )}
        </section>

        <section style={panelStyles}>
          <h3 style={sectionTitle}>Tickets</h3>
          {selectedProjectId ? (
            <>
              <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyles} htmlFor="ticketTitle">Title</label>
                  <input id="ticketTitle" name="ticketTitle" placeholder="Cannot log in" required style={inputStyles} />
                </div>
                <div>
                  <label style={labelStyles} htmlFor="ticketDescription">Description</label>
                  <textarea id="ticketDescription" name="ticketDescription" placeholder="Describe the issue" style={{ ...inputStyles, minHeight: '4.5rem' }} />
                </div>
                <div>
                  <label style={labelStyles} htmlFor="ticketPriority">Priority</label>
                  <select id="ticketPriority" name="ticketPriority" defaultValue="medium" style={inputStyles}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <button type="submit" style={{ ...buttonStyles, alignSelf: 'flex-start', opacity: creatingTicket ? 0.7 : 1 }} disabled={creatingTicket}>
                  {creatingTicket ? 'Saving…' : 'Create ticket'}
                </button>
              </form>

              <div style={{ ...listStyles, maxHeight: '18rem', overflow: 'auto', paddingRight: '0.5rem' }}>
                {tickets.filter(ticket => ticket.project_id === selectedProjectId).map(ticket => (
                  <article
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.9rem',
                      padding: '1rem',
                      background: selectedTicketId === ticket.id ? '#f0f9ff' : '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <header style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: 0 }}>{ticket.title}</h4>
                        <span style={{ ...badgeStyles, marginTop: '0.35rem', background: '#bfdbfe', color: '#1d4ed8' }}>{ticket.status}</span>
                      </div>
                      <select
                        value={ticket.status}
                        onChange={event => handleStatusChange(ticket.id, event.target.value)}
                        style={{ ...inputStyles, maxWidth: '9rem' }}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </header>
                    {ticket.description && <p style={{ marginTop: '0.5rem', color: '#475569' }}>{ticket.description}</p>}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p>Select a project to see its tickets.</p>
          )}
        </section>

        <section style={panelStyles}>
          <h3 style={sectionTitle}>Discussion</h3>
          {selectedTicketId ? (
            <>
              <form onSubmit={handleCreateComment} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyles} htmlFor="commentBody">Add a comment</label>
                  <textarea
                    id="commentBody"
                    value={commentBody}
                    onChange={event => setCommentBody(event.target.value)}
                    placeholder="Share an update"
                    style={{ ...inputStyles, minHeight: '5rem' }}
                  />
                </div>
                <button type="submit" style={{ ...buttonStyles, alignSelf: 'flex-start' }}>
                  Post comment
                </button>
              </form>

              <div style={{ ...listStyles, maxHeight: '18rem', overflow: 'auto', paddingRight: '0.5rem' }}>
                {comments.map(comment => (
                  <article key={comment.id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.9rem', padding: '1rem' }}>
                    <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', color: '#475569' }}>
                      <span>{comment.author_id === session.user.id ? 'You' : comment.author_id}</span>
                      <span>{new Date(comment.created_at).toLocaleString()}</span>
                    </header>
                    <p style={{ margin: 0 }}>{comment.content}</p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p>Select a ticket to view the activity feed.</p>
          )}
        </section>
      </div>
    </div>
  )
}
