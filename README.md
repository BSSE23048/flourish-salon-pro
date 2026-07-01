# Flourish Salon Pro

Flourish Salon Pro is a salon management SaaS built with **Next.js** on the frontend and **Express** on the backend. It includes the core workflows a modern salon needs: bookings, customers, staff, services, billing, payroll, attendance, finance, reports, settings, SaaS plan controls, Supabase auth, and a local API contract ready for production hardening.

## Tech Stack

- **Frontend:** Next.js 16, React 18, TypeScript, Tailwind CSS, shadcn/Radix UI, Recharts
- **Backend:** Express, CORS, JSON REST endpoints, Socket.io realtime events
- **Auth/Data:** Supabase client and generated database types
- **Tooling:** ESLint, Vitest, Testing Library, PostCSS

## Features

- Strict RBAC split across customer, admin, and staff areas
- Public premium customer booking wizard with live slots and pay-after-service confirmation
- Protected admin dashboard with Supabase auth and demo fallback
- Staff dashboard for assigned appointments, service workflow updates, attendance percentage, salary status, commission, deductions, and payable salary
- Realtime appointment booking with search, status filtering, backend overlap prevention, and Socket.io updates
- Customer CRM with visit and spend tracking
- Staff management with salary, commission rate, attendance percentage, payable salary, leaderboard views, and PIN-protected add/edit/delete actions
- Service menu CRUD with category filters
- Service-linked billing and invoice generation with staff assignment, quantities, custom "other service" line items, optional discounts, downloadable receipts, and automatic commission calculation
- Payroll module with month-wise base salary, commission, bonuses, deductions/penalties, paid/unpaid status, total payable, and profit after payroll
- Finance module with month-wise expenses, payroll cost, paid invoice revenue, and final profit
- Admin-managed attendance with month-wise percentages, leave request alerts, and approve/reject workflow
- Reports for revenue, payroll cost, profit after payroll, popular services, peak hours, and staff performance
- Settings for salon profile, WhatsApp reminders, notifications, plan usage, and security notes
- Express API for tenant, metrics, appointments, customers, staff, attendance, leave requests, invoices, expenses, payroll, financials, plans, and subscription checkout stubs
- Advanced scheduling: 10:00 AM to 2:00 AM business day, dynamic service durations, 2-hour booking cutoff, 4-hour cancellation window, slot holds, waitlist, and backend overlap prevention
- Socket.io realtime updates for schedules, appointments, attendance, leave requests, invoices, staff, and payroll

## RBAC Route Map

- `/` - Public customer portal for browsing services, checking live availability, holding slots, joining waitlists, and confirming appointments for free.
- `/login` - Supabase auth plus local demo accounts for development.
- `/admin/*` - Owner/admin-only operations: dashboard, appointments, customers, staff, attendance, payroll, services, billing, finance reports, settings.
- `/staff` - Staff-only daily schedule, appointment workflow status updates, attendance percentage, leave requests, commission, deductions, payable salary, and salary paid/unpaid status.

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

Staff add, edit, and delete actions require the demo security PIN:

```text
PIN: 1234
```

## Scheduling Rules

- Business hours run from `10:00` to `02:00` next day.
- Slot grid uses 30-minute increments, but availability is calculated from the selected service duration.
- Services can block 30, 60, 90, 120, or more minutes.
- Customers cannot book any appointment starting less than 2 hours from the current time.
- Customers can cancel or reschedule only more than 4 hours before appointment start.
- Slot holds last 7 minutes and instantly block the same staff/time for everyone else.
- Backend overlap validation rejects double-booking even if two users click at the same time.
- Waitlist entries can be created for blocked slots, and cancellation triggers a realtime notification event.

## Payroll and Finance

- Staff profiles store a monthly base salary and commission percentage.
- Invoice service lines are assigned to staff members, and paid invoices automatically feed commission totals.
- Payroll is calculated month-wise as:

```text
total payable = base salary + commission + bonuses - deductions
profit after payroll = net invoice revenue - total payroll payable
```

- Admins can mark each staff salary as paid or unpaid for the selected month.
- Admins can add bonuses or deductions/penalties with reasons.
- Staff can see their own salary, commission, deductions, payable amount, and paid/unpaid status.
- Reports and payroll both use the same financial summary endpoint so profit reflects staff salary costs.

## Attendance and Leave

- Attendance is managed by admins only.
- Admins can mark each staff member as present, absent, half day, paid leave, or unpaid leave.
- Staff can request leave from the staff dashboard.
- Leave requests appear as admin alerts in the attendance module.
- Approved leave is written into attendance for the selected date range.
- Attendance percentages are calculated month-wise and shown to both admin and staff.

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

## Google OAuth

Google sign-in uses Supabase Auth. In Supabase, enable the Google provider and paste the Google Cloud OAuth client ID and client secret.

Use this Supabase callback URL in Google Cloud:

```text
https://ajsqyhvktrrczvrsqiiw.supabase.co/auth/v1/callback
```

For local development, add this authorized JavaScript origin:

```text
http://localhost:3000
```

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
- `POST /api/services`
- `PATCH /api/services/:id`
- `DELETE /api/services/:id`
- `GET /api/staff`
- `POST /api/staff`
- `PATCH /api/staff/:id`
- `DELETE /api/staff/:id`
- `PATCH /api/staff/:id/status`
- `GET /api/availability?date=YYYY-MM-DD&staffId=...&serviceId=...`
- `POST /api/holds`
- `POST /api/bookings`
- `POST /api/waitlist`
- `GET /api/metrics`
- `GET /api/appointments`
- `POST /api/appointments`
- `PATCH /api/appointments/:id/status`
- `PATCH /api/appointments/:id/cancel`
- `GET /api/customer/bookings?email=...`
- `GET /api/staff/me/schedule`
- `POST /api/staff/me/leave`
- `GET /api/staff/me/attendance`
- `GET /api/admin/attendance`
- `POST /api/admin/attendance`
- `GET /api/admin/leave-requests`
- `PATCH /api/admin/leave-requests/:id`
- `GET /api/customers`
- `GET /api/staff/commission`
- `GET /api/invoices`
- `POST /api/invoices`
- `GET /api/expenses`
- `POST /api/expenses`
- `DELETE /api/expenses/:id`
- `GET /api/payroll`
- `PATCH /api/payroll/:staffId/status`
- `POST /api/payroll/adjustments`
- `DELETE /api/payroll/adjustments/:id`
- `GET /api/financials`
- `GET /api/plans`
- `POST /api/subscription/checkout`

The API currently uses in-memory demo data so local development is instant. For production, connect these routes to Supabase tables, verify JWTs in Express middleware, persist payroll, invoice, and expense records, and wire checkout only if you later choose to collect online payments.

## Verification

Current checks:

```bash
npm run build
npm run lint
npm test
```

The Express API health check was also smoke-tested at `GET /api/health`.
