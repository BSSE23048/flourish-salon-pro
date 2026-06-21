# Flourish Salon Pro

Flourish Salon Pro is a salon management SaaS built with **Next.js** on the frontend and **Express** on the backend. It includes the core workflows a modern salon needs: bookings, customers, staff, services, inventory, billing, reports, settings, SaaS plan controls, Supabase auth, and a local API contract ready for production hardening.

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/Radix UI, Recharts
- **Backend:** Express, CORS, JSON REST endpoints
- **Auth/Data:** Supabase client and generated database types
- **Tooling:** ESLint, Vitest, Testing Library, PostCSS

## Features

- Strict RBAC split across customer, admin, and staff areas
- Public premium customer booking wizard with live slots and booking deposit stub
- Protected admin dashboard with Supabase auth and demo fallback
- Staff dashboard for assigned appointments, status updates, and commission stats
- Appointment booking with search and status filtering
- Customer CRM with visit and spend tracking
- Staff management with commission and leaderboard views
- Service menu CRUD with category filters
- Inventory tracking with low-stock alerts
- Billing and invoice generation with downloadable invoice files
- Reports for revenue, popular services, peak hours, and staff performance
- Settings for salon profile, WhatsApp reminders, notifications, plan usage, and security notes
- Express API for tenant, metrics, appointments, customers, inventory, invoices, plans, and subscription checkout stubs
- Advanced scheduling: 10:00 AM to 2:00 AM business day, dynamic service durations, 2-hour booking cutoff, 4-hour cancellation window, slot holds, waitlist, and backend overlap prevention
- Socket.io realtime schedule updates when holds or bookings change

## RBAC Route Map

- `/` - Public customer portal for browsing services, checking live availability, holding slots, joining waitlists, and booking with a deposit stub.
- `/login` - Supabase auth plus local demo accounts for development.
- `/admin/*` - Owner/admin-only operations: dashboard, appointments, customers, staff, services, inventory, billing, reports, settings.
- `/staff` - Staff-only daily schedule, appointment workflow status updates, and commission overview.

Demo accounts:

```text
Admin: admin@flourish.local / password123
Staff: staff@flourish.local / staff123
```

RBAC is enforced in three places:

- Next.js `proxy.ts` checks route access from the `flourish-role` cookie.
- `ProtectedRoute` performs client-side auth and role checks.
- Express middleware reads `x-role` / `x-staff-id` and blocks unauthorized API access.

Supabase database-level security is defined in `supabase/migrations/20260621190000_rbac_advanced_scheduling.sql`.

## Scheduling Rules

- Business hours run from `10:00` to `02:00` next day.
- Slot grid uses 30-minute increments, but availability is calculated from the selected service duration.
- Services can block 30, 60, 90, 120, or more minutes.
- Customers cannot book any appointment starting less than 2 hours from the current time.
- Customers can cancel or reschedule only more than 4 hours before appointment start.
- Slot holds last 7 minutes and instantly block the same staff/time for everyone else.
- Backend overlap validation rejects double-booking even if two users click at the same time.
- Waitlist entries can be created for blocked slots, and cancellation triggers a realtime notification event.

## Getting Started

Install dependencies:

```bash

npm install
```

Run the Next.js app:

```bash
npm run dev
```

Run the Express API:

```bash
npm run dev:api
```

Run both together:

```bash
npm run dev:full
```

Frontend runs on `http://localhost:3000`.
Backend runs on `http://localhost:4000`.

## Environment

Create or update `.env` with these values:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
NEXT_PUBLIC_API_URL="http://localhost:4000"
CLIENT_ORIGIN="http://localhost:3000"
PORT="4000"
```

The project also keeps the previous `VITE_SUPABASE_*` values for compatibility, but Next.js uses the `NEXT_PUBLIC_*` variables in the browser.

## Scripts

```bash
npm run dev       # Start Next.js
npm run dev:api   # Start Express API
npm run dev:full  # Start frontend and backend together
npm run build     # Build the Next.js production app
npm run start     # Start the built Next.js app
npm run lint      # Run ESLint
npm test          # Run Vitest
```

## API Routes

The Express backend lives in `server/index.js`.

- `GET /api/health`
- `GET /api/tenant`
- `GET /api/services`
- `GET /api/staff`
- `GET /api/availability?date=YYYY-MM-DD&staffId=...&serviceId=...`
- `POST /api/holds`
- `POST /api/bookings`
- `POST /api/waitlist`
- `GET /api/metrics`
- `GET /api/appointments`
- `PATCH /api/appointments/:id/status`
- `PATCH /api/appointments/:id/cancel`
- `GET /api/customer/bookings?email=...`
- `GET /api/staff/me/schedule`
- `GET /api/customers`
- `GET /api/inventory`
- `GET /api/invoices`
- `GET /api/plans`
- `POST /api/subscription/checkout`

The API currently uses in-memory demo data so local development is instant. For production, connect these routes to Supabase tables, verify JWTs in Express middleware, and wire deposit checkout to Stripe, Paddle, or your preferred billing provider.

## Verification

Current checks:

```bash
npm run build
npm run lint
npm test
```

The Express API health check was also smoke-tested at `GET /api/health`.
