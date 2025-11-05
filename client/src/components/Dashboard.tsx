import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'

interface Tenant {
  id: string
  name: string
  slug: string
  role: string
  created_at: string
}

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  created_at: string
  updated_at: string | null
}

interface Ticket {
  id: string
  project_id: string
  tenant_id: string
  title: string
  description: string | null
  status: string
  priority: string
  assignee_id: string | null
  reporter_id: string
  created_at: string
  updated_at: string | null
}

interface Comment {
  id: string
  ticket_id: string
  body: string
  author_id: string
  created_at: string
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
    if (!session?.access_token) {
      return
    }

    const fetchTenants = async () => {
      setTenantLoading(true)
      setTenantError(null)
      try {
        const response = await api.get('/api/tenants')
        const tenantList = Array.isArray(response.data?.tenants) ? response.data.tenants : []
        setTenants(tenantList)
        if (tenantList.length > 0) {
          setSelectedTenantId(tenantList[0].id)
        }
      } catch (error) {
        setTenantError(error instanceof Error ? error.message : 'Unable to load tenants')
      } finally {
        setTenantLoading(false)
      }
    }

    fetchTenants()
  }, [session?.access_token])

  useEffect(() => {
    if (!selectedTenantId) {
      setProjects([])
      setTickets([])
      setSelectedProjectId('')
      setSelectedTicketId('')
      setComments([])
      return
    }

    const loadProjects = async () => {
      try {
        const response = await api.get('/api/projects', {
          params: { tenantId: selectedTenantId }
        })
        const projectList = Array.isArray(response.data?.projects) ? response.data.projects : []
        setProjects(projectList)
        if (projectList.length > 0) {
          setSelectedProjectId(projectList[0].id)
        } else {
          setSelectedProjectId('')
        }
      } catch (error) {
        console.error(error)
      }
    }

    const loadTickets = async () => {
      try {
        const response = await api.get('/api/tickets', {
          params: { tenantId: selectedTenantId }
        })
        const ticketList = Array.isArray(response.data?.tickets) ? response.data.tickets : []
        setTickets(ticketList)
        if (ticketList.length > 0) {
          setSelectedTicketId(ticketList[0].id)
        } else {
          setSelectedTicketId('')
          setComments([])
        }
      } catch (error) {
        console.error(error)
      }
    }

    loadProjects()
    loadTickets()
  }, [selectedTenantId])

  useEffect(() => {
    if (!selectedTicketId || !selectedTenantId) {
      setComments([])
      return
    }

    const loadComments = async () => {
      try {
        const response = await api.get(`/api/tickets/${selectedTicketId}/comments`, {
          params: { tenantId: selectedTenantId }
        })
        const commentList = Array.isArray(response.data?.comments) ? response.data.comments : []
        setComments(commentList)
      } catch (error) {
        console.error(error)
      }
    }

    loadComments()
  }, [selectedTicketId, selectedTenantId])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleCreateTenant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get('tenantName')?.toString().trim() ?? ''
    const slug = form.get('tenantSlug')?.toString().trim().toLowerCase() ?? ''

    if (!name || !slug) return

    try {
      setCreatingTenant(true)
      const response = await api.post('/api/tenants', { name, slug })
      const newTenant: Tenant = response.data.tenant
      newTenant.role = 'owner'
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
      const response = await api.post('/api/projects', {
        tenantId: selectedTenantId,
        name,
        description
      })
      const project: Project = response.data.project
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
      const response = await api.post('/api/tickets', {
        tenantId: selectedTenantId,
        projectId: selectedProjectId,
        title,
        description,
        priority
      })
      const ticket: Ticket = response.data.ticket
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
      const { data } = await api.patch(`/api/tickets/${ticketId}`, {
        tenantId: selectedTenantId,
        status
      })
      setTickets(current => current.map(ticket => ticket.id === ticketId ? data.ticket : ticket))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to update ticket')
    }
  }

  const handleCreateComment = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!commentBody || !selectedTicketId || !selectedTenantId) return

    try {
      const { data } = await api.post(`/api/tickets/${selectedTicketId}/comments`, {
        tenantId: selectedTenantId,
        body: commentBody
      })
      setComments(current => [...current, data.comment])
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
                <span style={{ ...badgeStyles, backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>{tenant.role}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleCreateTenant} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={labelStyles} htmlFor="tenantName">Tenant name</label>
              <input id="tenantName" name="tenantName" required placeholder="Acme Corp" style={inputStyles} />
            </div>
            <div>
              <label style={labelStyles} htmlFor="tenantSlug">Slug</label>
              <input id="tenantSlug" name="tenantSlug" required placeholder="acme" style={inputStyles} />
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
                    <p style={{ margin: 0 }}>{comment.body}</p>
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
