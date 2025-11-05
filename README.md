# Ticketing System SaaS

A multi-tenant SaaS ticketing platform built with a React + Vite frontend and an Express API that orchestrates Supabase for authentication, authorization and persistence. The project demonstrates how to structure tenants, projects, tickets and collaboration features for subscription businesses.

## Project layout

```text
client/   # React (Vite) single-page app that calls the API and Supabase Auth
server/   # Express API that uses a Supabase service role key to enforce multi-tenant rules
supabase/ # SQL schema and policies to run inside your Supabase instance
```

## Getting started

1. **Install dependencies**

   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Configure environment variables**

   - Duplicate `server/.env.example` as `server/.env` and fill in:
     - `SUPABASE_URL` – your Supabase project URL
     - `SUPABASE_SERVICE_ROLE_KEY` – service role key (keep it secret; server only)
     - `ALLOWED_ORIGINS` – comma-separated list of front-end origins (defaults to `http://localhost:5173`)
   - Duplicate `client/.env.example` as `client/.env` and set:
     - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
     - `VITE_API_URL` – usually `http://localhost:4000`
   - (Optional) Adjust `client/public/runtime-config.js` (a copy of `runtime-config.example.js` is provided) to override the
     `apiUrl` after the app has been built. This is useful on static hosts like Netlify where you may not want to rebuild the
     frontend just to change the backend URL.

3. **Provision the database**

   Run the SQL script from `supabase/schema.sql` inside the SQL editor of your Supabase project. It creates tables, enums, triggers and row level security (RLS) policies for the application.

4. **Start the services**

   In separate terminals run:

   ```bash
   # API
   cd server
   npm run dev

   # Frontend
   cd client
   npm run dev
   ```

   Open the frontend at `http://localhost:5173`.

## API overview

The Express API is namespaced under `/api` and expects a Supabase user access token in the `Authorization` header. Routes include:

- `GET /api/tenants` – list tenants the current user belongs to
- `POST /api/tenants` – create a tenant and grant the creator the `owner` role
- `POST /api/tenants/:tenantId/members` – invite an existing Supabase user to the tenant
- `GET /api/projects?tenantId=…` – list projects scoped to a tenant
- `POST /api/projects` – create a project inside a tenant
- `GET /api/tickets?tenantId=…[&projectId=…]` – list tenant tickets
- `POST /api/tickets` – create a ticket
- `PATCH /api/tickets/:ticketId` – update ticket status, title, description or assignee
- `GET /api/tickets/:ticketId/comments?tenantId=…` – fetch ticket comments
- `POST /api/tickets/:ticketId/comments` – add a new comment

All operations require that the authenticated user is a member of the tenant; the middleware checks membership via Supabase before allowing changes.

## Frontend features

- Email + password authentication via Supabase Auth
- Tenant picker and creation flow
- Project creation and listing inside the selected tenant
- Ticket creation, status updates and quick filters by project
- Inline activity feed with ticket comments

The dashboard is intentionally minimal yet demonstrates how to build tenant-aware UI flows on top of Supabase-authenticated APIs.

## Supabase SQL

The file [`supabase/schema.sql`](supabase/schema.sql) contains the SQL to create tables, enums, triggers and security policies required by the application. Run the contents of that file inside your Supabase project before starting the app.

Feel free to adjust naming, add billing logic or integrate webhooks for your specific SaaS needs.
