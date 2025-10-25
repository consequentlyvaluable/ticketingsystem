-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Custom enums
create type membership_role as enum ('owner', 'admin', 'member');
create type ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type ticket_priority as enum ('low', 'medium', 'high');

-- Tenants represent individual customer organizations
create table if not exists public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Members belong to one or more tenants
create table if not exists public.tenant_members (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role membership_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

-- Projects let tenants organize workstreams
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_tenant_name_unique unique (tenant_id, lower(name))
);

-- Tickets are the heart of the support workflow
create table if not exists public.tickets (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  description text,
  status ticket_status not null default 'open',
  priority ticket_priority not null default 'medium',
  reporter_id uuid references auth.users (id) on delete set null,
  assignee_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Comments let teammates collaborate on tickets
create table if not exists public.ticket_comments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

-- Utility function to update timestamp columns
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_tenants_updated_at
  before update on public.tenants
  for each row execute procedure public.set_updated_at();

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

create trigger set_tickets_updated_at
  before update on public.tickets
  for each row execute procedure public.set_updated_at();

-- Enable Row Level Security
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.projects enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;

-- RLS policies ensure users may only see data for tenants they belong to
create policy "Members can view tenant metadata"
  on public.tenants
  for select using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenants.id
        and tm.user_id = auth.uid()
    )
  );

create policy "Members manage their tenant memberships"
  on public.tenant_members
  for select using (auth.uid() = user_id);

create policy "Members read tenant projects"
  on public.projects
  for select using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = projects.tenant_id
        and tm.user_id = auth.uid()
    )
  );

create policy "Members read tenant tickets"
  on public.tickets
  for select using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tickets.tenant_id
        and tm.user_id = auth.uid()
    )
  );

create policy "Members read ticket comments"
  on public.ticket_comments
  for select using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ticket_comments.tenant_id
        and tm.user_id = auth.uid()
    )
  );

-- Allow members to insert comments into tickets they can access
create policy "Members can comment on tenant tickets"
  on public.ticket_comments
  for insert with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ticket_comments.tenant_id
        and tm.user_id = auth.uid()
    )
  );

-- Allow members to update tickets they can see
create policy "Members update their tenant tickets"
  on public.tickets
  for update using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tickets.tenant_id
        and tm.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tickets.tenant_id
        and tm.user_id = auth.uid()
    )
  );

-- NOTE: inserts for tenants, tenant_members, projects and tickets are performed by the backend service role.
