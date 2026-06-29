# Flourish Salon Pro

Flourish Salon Pro is a salon management SaaS prototype for owners, staff, and customers. It combines a **Next.js + React** web app with a local **Express + Socket.io** API, Supabase authentication/types, role-aware routes, live appointment availability, invoicing, staff attendance, payroll, inventory, reporting, and subscription-plan stubs.

The app is designed to be easy to run locally while still modeling production workflows such as route protection, backend role checks, double-booking prevention, realtime schedule updates, and billing/payroll calculations.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Routes and Roles](#routes-and-roles)
- [Demo Accounts](#demo-accounts)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Overview](#api-overview)
- [Realtime Events](#realtime-events)
- [Scheduling Rules](#scheduling-rules)
- [Billing, Commission, and Payroll](#billing-commission-and-payroll)
- [Supabase](#supabase)
- [Testing and Verification](#testing-and-verification)
- [Production Hardening Notes](#production-hardening-notes)

## Tech Stack

- **Framework:** Next.js 16, React 18, TypeScript
- **Styling:** Tailwind CSS, shadcn-style UI components, Radix UI primitives
- **Charts and UI:** Recharts, lucide-react, sonner, date-fns
- **Backend:** Express REST API, CORS, Socket.io
- **Auth/Data:** Supabase client, generated Supabase database types, SQL migrations
- **Testing:** Vitest, Testing Library, jsdom
- **Tooling:** ESLint, PostCSS, concurrently

## Features

### Customer Portal

- Public salon landing and booking flow
- Service browsing with prices, deposits, duration, category, and images
- Staff selection and live availability lookup
- Slot holds that temporarily reserve a staff/time combination
- Booking confirmation with deposit checkout stub
- Waitlist support when a slot becomes unavailable
- Customer booking lookup by email

### Admin Portal

- Owner-only dashboard with business metrics
- Appointment list, booking creation, status filtering, and cancellation
- Customer CRM with visit count, spend, and segment data
- Staff directory with specialties, status, base salary, commission rate, and protected edits
- Service menu CRUD
- Inventory overview with low-stock alerts
- Billing and invoice creation with service lines, custom lines, discounts, payment methods, and downloadable text invoices
- Reports for revenue, popular services, peak hours, staff performance, and financial summaries
- Attendance management, leave review, and monthly attendance views
- Payroll with base salary, invoice-driven commissions, bonuses, deductions, paid status, and profit-after-payroll summary
- SaaS plan and checkout stubs
- Salon profile, notification, reminder, usage, and security settings

### Staff Portal

- Staff-only daily schedule
- Appointment status updates for assigned appointments
- Attendance and leave request views
- Commission, payroll, and revenue stats for the signed-in staff member

## Project Structure

```text
.
|-- pages/                      # Next.js route files
|   |-- index.tsx               # Public customer portal route
|   |-- login.tsx               # Login route
|   |-- staff.tsx               # Staff portal route
|   `-- admin/                  # Owner/admin routes
|-- src/
|   |-- pages/                  # Main page-level React implementations
|   |-- components/             # App layout, tables, headers, UI primitives
|   |-- contexts/AuthContext.tsx # Supabase + demo auth state
|   |-- integrations/supabase/  # Supabase client and generated types
|   |-- lib/                    # API config and helpers
|   `-- test/                   # Vitest suites
|-- server/index.js             # Express API and Socket.io server
|-- supabase/migrations/        # Database schema, RLS, scheduling, attendance
|-- public/                     # Static assets
|-- proxy.ts                    # Next route guard using role cookie
`-- package.json                # Scripts and dependencies
```

The `pages/` files are thin Next.js route adapters. Most app screens live in `src/pages/` and are wrapped with `ProtectedRoute` and `AppLayout` where needed.

## Routes and Roles

| Route | Role | Description |
| --- | --- | --- |
| `/` | Public/customer | Customer portal, service discovery, live booking, holds, waitlist |
| `/login` | Public | Supabase login plus local demo accounts |
| `/staff` | Staff or owner | Staff schedule, attendance, leave, commission, payroll |
| `/admin` | Owner | Admin dashboard |
| `/admin/appointments` | Owner | Appointment operations |
| `/admin/customers` | Owner | Customer CRM |
| `/admin/staff` | Owner | Staff management |
| `/admin/services` | Owner | Service menu management |
| `/admin/inventory` | Owner | Stock and reorder tracking |
| `/admin/billing` | Owner | Invoice creation and download |
| `/admin/reports` | Owner | Revenue and operational reports |
| `/admin/attendance` | Owner | Attendance and leave administration |
| `/admin/payroll` | Owner | Payroll, commission, deductions, paid status |
| `/admin/settings` | Owner | Salon, notification, plan, and security settings |

RBAC is enforced in three layers:

- `proxy.ts` redirects protected Next.js routes based on the `flourish-role` cookie.
- `src/components/ProtectedRoute.tsx` handles client-side role checks and loading state.
- `server/index.js` checks `x-role` and `x-staff-id` headers before returning protected API data.

## Demo Accounts

```text
Owner/admin: admin@flourish.local / password123
Staff:       staff@flourish.local / staff123
```

Demo auth is stored locally under `flourish-demo-auth`, and the active role is mirrored to the `flourish-role` cookie for route protection.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

Run the API:

```bash
npm run dev:api
```

Run both together:

```bash
npm run dev:full
```

Local URLs:

```text
Frontend: http://localhost:3000
API:      http://localhost:4000
```

## Environment Variables

Create or update `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
NEXT_PUBLIC_API_URL="http://localhost:4000"
CLIENT_ORIGIN="http://localhost:3000"
PORT="4000"
```

Notes:

- Browser code reads only `NEXT_PUBLIC_*` values.
- The API reads `CLIENT_ORIGIN` for CORS and Socket.io origins.
- `PORT` controls the Express API port.
- Older `VITE_SUPABASE_*` values may still exist for compatibility, but the Next.js app uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Available Scripts

```bash
npm run dev        # Start the Next.js app
npm run dev:api    # Start the Express API
npm run dev:full   # Start frontend and API together
npm run build      # Build the production Next.js app
npm run start      # Start the built Next.js app
npm run lint       # Run ESLint
npm test           # Run Vitest once
npm run test:watch # Run Vitest in watch mode
```

## API Overview

The local API lives in `server/index.js` and currently uses in-memory demo data. Data resets when the API process restarts.

### Public and Customer Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | API health check |
| `GET` | `/api/services` | List active services |
| `GET` | `/api/staff` | List bookable staff |
| `GET` | `/api/availability?date=YYYY-MM-DD&staffId=...&serviceId=...` | Generate live appointment slots |
| `POST` | `/api/holds` | Hold a slot for 7 minutes |
| `POST` | `/api/bookings` | Convert a hold or selected slot into an appointment |
| `POST` | `/api/waitlist` | Add a customer to the waitlist |
| `PATCH` | `/api/appointments/:id/cancel` | Cancel appointment if outside cutoff |
| `GET` | `/api/customer/bookings?email=...` | Customer booking lookup |

### Admin and Staff Endpoints

Most protected endpoints require `x-role: admin` or `x-role: staff`. Staff-scoped endpoints may also use `x-staff-id`.

| Method | Endpoint | Roles | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/tenant` | Admin, staff | Tenant and plan metadata |
| `GET` | `/api/metrics` | Admin | Dashboard metrics |
| `GET` | `/api/appointments` | Admin, staff | Appointment list, scoped for staff |
| `POST` | `/api/appointments` | Admin | Create appointment |
| `PATCH` | `/api/appointments/:id/status` | Admin, staff | Update workflow status |
| `GET` | `/api/customers` | Admin | Customer list |
| `GET` | `/api/inventory` | Admin | Inventory list |
| `GET` | `/api/invoices` | Admin | Invoice history |
| `POST` | `/api/invoices` | Admin | Create invoice |
| `GET` | `/api/staff/me/schedule` | Staff, admin | Current staff schedule and payroll summary |
| `POST` | `/api/staff/me/leave` | Staff, admin | Submit leave request |
| `GET` | `/api/staff/me/attendance` | Staff, admin | Staff attendance rows |
| `GET` | `/api/staff/commission` | Admin, staff | Commission rows |
| `GET` | `/api/payroll` | Admin, staff | Payroll rows and financial summary |
| `GET` | `/api/financials` | Admin | Revenue, payroll, profit summary |
| `GET` | `/api/plans` | Admin | SaaS plan list |
| `POST` | `/api/subscription/checkout` | Admin | Subscription checkout stub |

### Admin Mutation Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/services` | Create service |
| `PATCH` | `/api/services/:id` | Update service |
| `DELETE` | `/api/services/:id` | Delete service |
| `POST` | `/api/staff` | Create staff member |
| `PATCH` | `/api/staff/:id` | Update staff member |
| `DELETE` | `/api/staff/:id` | Delete staff member |
| `PATCH` | `/api/staff/:id/status` | Mark staff online, offline, or on leave |
| `GET` | `/api/admin/attendance` | Attendance summary and leave requests |
| `POST` | `/api/admin/attendance` | Mark attendance |
| `GET` | `/api/admin/leave-requests` | List leave requests |
| `PATCH` | `/api/admin/leave-requests/:id` | Approve or reject leave |
| `PATCH` | `/api/payroll/:staffId/status` | Mark payroll paid/unpaid |
| `POST` | `/api/payroll/adjustments` | Add payroll bonus or deduction |
| `DELETE` | `/api/payroll/adjustments/:id` | Remove payroll adjustment |

Staff create, update, and delete requests require the demo security PIN:

```text
1234
```

## Realtime Events

The API emits Socket.io updates when schedules, appointments, staff, invoices, commissions, attendance, leave, waitlist, or payroll data changes.

Important events include:

- `schedule:update`
- `appointments:update`
- `waitlist:update`
- `waitlist:notify`
- `staff:update`
- `invoices:update`
- `staff:commission:update`
- `attendance:update`
- `leave:update`
- `payroll:update`

Clients can join a schedule room with:

```text
schedule:join -> { staffId, date }
```

## Scheduling Rules

- Business hours run from `10:00` to `02:00` next day.
- Slots are generated every 30 minutes.
- Availability is calculated using the selected service duration, not just the slot interval.
- Services can last 30, 60, 90, 120, or more minutes.
- Customers must book at least 2 hours before appointment start.
- Customers can cancel or reschedule only more than 4 hours before appointment start.
- Slot holds last 7 minutes.
- Active holds block matching staff/time combinations for other customers.
- Staff marked `offline_today` or `on_leave` are not bookable.
- Backend overlap validation prevents double-booking even if two users submit at the same time.
- Waitlist entries can be notified when a cancellation frees a matching slot.

## Billing, Commission, and Payroll

Invoices are service-linked. Each invoice line is assigned to a staff member, which lets the API calculate commission and payroll.

Billing supports:

- Multiple invoice lines
- Service-backed and custom invoice items
- Quantity and unit price
- Optional discounts
- Cash, card, Easypaisa, and JazzCash payment labels
- Downloadable `.txt` invoice files

Payroll uses:

- Staff base salary
- Commission from paid invoice lines
- Manual bonuses and deductions
- Attendance percentage
- Paid/unpaid status per staff member and month
- Financial summary with revenue, payable payroll, paid payroll, unpaid payroll, and profit after payroll

## Supabase

Supabase is used for authentication, local client integration, generated database types, and migration planning. The current local API still uses in-memory data for fast demos.

Migrations:

```text
supabase/migrations/20260226155232_4d3ba04d-33bb-44a5-8b20-ad4b573add75.sql
supabase/migrations/20260621190000_rbac_advanced_scheduling.sql
supabase/migrations/20260622100000_staff_availability_attendance.sql
```

The RBAC and scheduling migration includes tables/policies for profiles, roles, salon tenancy, staff, services, appointments, holds, waitlist, and related business rules. The attendance migration extends the model for staff availability, attendance, and leave.

## Testing and Verification

Run the main checks:

```bash
npm run lint
npm test
npm run build
```

Existing tests cover smoke behavior for booking/customer flows, the admin dashboard, Supabase connection assumptions, and basic app/test setup.

You can also smoke-test the API directly:

```bash
curl http://localhost:4000/api/health
```

Expected shape:

```json
{
  "ok": true,
  "service": "flourish-salon-pro-api",
  "checkedAt": "..."
}
```

## Production Hardening Notes

Before production deployment:

- Replace in-memory API state with Supabase tables or another persistent database.
- Verify Supabase JWTs in Express middleware instead of trusting `x-role`.
- Map application roles consistently between `owner`, `admin`, `staff`, and `customer`.
- Move the staff management PIN to a secure server-side policy or remove it in favor of audited admin permissions.
- Connect deposit checkout and subscription checkout to Stripe, Paddle, or another billing provider.
- Persist invoice files or render PDFs server-side.
- Add request validation schemas for all mutation endpoints.
- Add audit logging for staff, payroll, invoice, and attendance changes.
- Add rate limiting and abuse protection for booking, holds, login, and waitlist endpoints.
- Add automated integration tests that run against the API server and database.
- Configure production CORS, environment variables, secrets, backups, and monitoring.
