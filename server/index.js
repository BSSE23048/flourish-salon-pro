import "dotenv/config";
import crypto from "crypto";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import http from "http";
import { createClient } from "@supabase/supabase-js";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseServerKey = supabaseServiceRoleKey || process.env.SUPABASE_SECRET_KEY;
const defaultTenantId = process.env.DEFAULT_TENANT_ID || "00000000-0000-0000-0000-000000000001";
const demoAuthEnabled = process.env.NODE_ENV !== "production" && process.env.ENABLE_DEMO_AUTH !== "false";
const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseServerKey);

if (!supabaseConfigured && !demoAuthEnabled) {
  throw new Error("Missing Supabase environment. Set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.");
}

if (!supabaseConfigured) {
  console.warn("Supabase environment is incomplete. Starting API in local demo mode only.");
}

const supabase = supabaseConfigured ? createClient(supabaseUrl, supabaseServerKey, {
  auth: { autoRefreshToken: false, persistSession: false },
}) : null;

const supabaseVerifier = supabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
}) : null;

const io = new Server(server, {
  cors: { origin: clientOrigin, methods: ["GET", "POST", "PATCH", "DELETE"] },
});

const restrictedLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many security-sensitive requests. Try again in one minute." },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 180,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === clientOrigin) {
      callback(null, true);
      return;
    }
    callback(new Error("CORS origin is not allowed"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(generalLimiter);
app.use(["/api/holds", "/api/bookings", "/api/login", "/api/signup"], restrictedLimiter);

/**
 * @typedef {"owner" | "admin" | "staff" | "client"} AppRole
 * @typedef {{ id: string; email: string; role: AppRole; tenantId: string; staffId: string | null; accessToken: string }} RequestUser
 */

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

const demoStaffRows = [
  {
    id: "stf-sara",
    user_id: "00000000-0000-0000-0000-00000000faff",
    first_name: "Sara",
    last_name: "Ahmed",
    full_name: "Sara Ahmed",
    email: "staff@flourish.local",
    title: "Creative Director",
    specialties: ["Hair", "Color"],
    commission_rate: 15,
    base_salary_cents: 6500000,
    availability_status: "online",
    bio: "Editorial cuts, soft color, and quiet luxury finishes.",
    must_reset_password: false,
  },
  {
    id: "stf-nadia",
    user_id: null,
    first_name: "Nadia",
    last_name: "Hussain",
    full_name: "Nadia Hussain",
    email: "nadia.hussain@flourish.com",
    title: "Skin & Makeup Artist",
    specialties: ["Skin", "Makeup"],
    commission_rate: 12,
    base_salary_cents: 5200000,
    availability_status: "online",
    bio: "Glow-focused facials and camera-ready makeup.",
    must_reset_password: true,
  },
];

const demoServiceRows = [
  {
    id: "svc-haircut",
    name: "Signature Haircut",
    category: "Hair",
    description: "Precision cut, consultation, and finishing polish.",
    duration_minutes: 30,
    price_cents: 350000,
    deposit_cents: 100000,
    active: true,
  },
  {
    id: "svc-facial",
    name: "Botanical Facial",
    category: "Skin",
    description: "A calming skin reset with massage and glow mask.",
    duration_minutes: 60,
    price_cents: 650000,
    deposit_cents: 150000,
    active: true,
  },
];

function canUseDemoFallback(req) {
  return demoAuthEnabled && req.user?.accessToken?.startsWith("flourish-demo-");
}

function demoAttendanceSummary(date = new Date().toISOString().slice(0, 10), month = date.slice(0, 7)) {
  return {
    date,
    month,
    staff: demoStaffRows.map((member) => ({
      staffId: member.id,
      name: member.full_name,
      title: member.title,
      availabilityStatus: member.availability_status,
      attendanceStatus: member.availability_status === "online" ? "present" : member.availability_status,
      clockInAt: null,
      clockOutAt: null,
      attendancePercentage: member.id === "stf-sara" ? 82 : 76,
    })),
    monthly: demoStaffRows.map((member) => ({
      staffId: member.id,
      name: member.full_name,
      percentage: member.id === "stf-sara" ? 82 : 76,
      rows: [],
    })),
    leaveRequests: [],
  };
}

function demoPayrollRows(month = new Date().toISOString().slice(0, 7)) {
  const rows = demoStaffRows.map((member) => ({
    staffId: member.id,
    name: member.full_name,
    title: member.title,
    month,
    baseSalary: moneyNumber(member.base_salary_cents),
    commission: member.id === "stf-sara" ? 12500 : 8400,
    revenue: member.id === "stf-sara" ? 83500 : 70000,
    deductions: 0,
    bonuses: 0,
    payable: moneyNumber(member.base_salary_cents) + (member.id === "stf-sara" ? 12500 : 8400),
    paid: false,
    paidAt: null,
    adjustments: [],
    attendancePercentage: member.id === "stf-sara" ? 82 : 76,
  }));
  const netRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const payrollPayable = rows.reduce((sum, row) => sum + row.payable, 0);
  return {
    month,
    rows,
    summary: {
      grossRevenue: netRevenue,
      discounts: 0,
      netRevenue,
      payrollPayable,
      payrollPaid: 0,
      payrollUnpaid: payrollPayable,
      profitAfterPayroll: netRevenue - payrollPayable,
      invoiceCount: 2,
    },
  };
}

function getBearerToken(req) {
  const header = req.header("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function normalizeRole(value) {
  if (value === "owner" || value === "admin") return "admin";
  if (value === "staff") return "staff";
  return "client";
}

function getIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
}

async function auditLog(req, actionType, payload = {}) {
  if (!supabase) return;
  const user = req.user || null;
  await supabase.from("system_audit_logs").insert({
    tenant_id: user?.tenantId || defaultTenantId,
    user_id: user?.id || null,
    user_email: user?.email || null,
    role: user?.role || "anonymous",
    action_type: actionType,
    ip_address: getIp(req),
    payload,
  });
}

async function getRoleAndTenant(userId, rawUser) {
  if (!supabase) {
    return { role: normalizeRole(rawUser?.app_metadata?.role || rawUser?.user_metadata?.role), tenantId: defaultTenantId, staffId: null };
  }
  const metadataRole = rawUser?.app_metadata?.role || rawUser?.user_metadata?.role;
  const metadataTenant = rawUser?.app_metadata?.tenant_id || rawUser?.user_metadata?.tenant_id;

  const [{ data: roles }, { data: profile }, { data: staff }] = await Promise.all([
    supabase.from("user_roles").select("role, tenant_id").eq("user_id", userId),
    supabase.from("profiles").select("tenant_id").eq("user_id", userId).maybeSingle(),
    supabase.from("staff").select("id, tenant_id").eq("user_id", userId).is("deleted_at", null).maybeSingle(),
  ]);

  const orderedRole = roles?.map((row) => row.role).find((role) => role === "owner" || role === "admin")
    || roles?.map((row) => row.role).find((role) => role === "staff")
    || metadataRole
    || "client";

  return {
    role: normalizeRole(orderedRole),
    tenantId: metadataTenant || profile?.tenant_id || staff?.tenant_id || roles?.[0]?.tenant_id || defaultTenantId,
    staffId: staff?.id || null,
  };
}

async function verifySupabaseToken(req, res, next) {
  const publicRead =
    req.method === "GET" &&
    ["/services", "/staff", "/availability", "/api/services", "/api/staff", "/api/availability"].includes(req.path);
  if (publicRead) return next();

  const token = getBearerToken(req);
  if (!token) {
    await auditLog(req, "AUTH_TOKEN_MISSING", { path: req.path }).catch(() => undefined);
    return res.status(401).json({ error: "Bearer authorization token is required" });
  }

  if (demoAuthEnabled && token.startsWith("flourish-demo-")) {
    const demoRole = token === "flourish-demo-staff" ? "staff" : "admin";
    req.user = {
      id: demoRole === "staff" ? "00000000-0000-0000-0000-00000000faff" : "00000000-0000-0000-0000-00000000ad00",
      email: demoRole === "staff" ? "staff@flourish.local" : "admin@flourish.local",
      role: demoRole,
      tenantId: defaultTenantId,
      staffId: demoRole === "staff" ? "stf-sara" : null,
      accessToken: token,
    };
    return next();
  }

  if (!supabaseVerifier) {
    await auditLog(req, "AUTH_TOKEN_REJECTED_SUPABASE_UNCONFIGURED", { path: req.path }).catch(() => undefined);
    return res.status(503).json({ error: "Supabase auth is not configured. Use local demo login or configure Supabase server keys." });
  }

  const { data, error } = await supabaseVerifier.auth.getUser(token);
  if (error || !data?.user?.id || !data.user.email) {
    await auditLog(req, "AUTH_TOKEN_INVALID", { path: req.path, reason: error?.message || "Unknown validation failure" }).catch(() => undefined);
    return res.status(401).json({ error: "Invalid or expired authorization token" });
  }

  const context = await getRoleAndTenant(data.user.id, data.user);
  req.user = {
    id: data.user.id,
    email: data.user.email,
    role: context.role,
    tenantId: context.tenantId,
    staffId: context.staffId,
    accessToken: token,
  };
  return next();
}

function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      await auditLog(req, "AUTH_FORBIDDEN_ROUTE_ACCESS", { path: req.path, allowedRoles: roles }).catch(() => undefined);
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

function requireStaffIsolation(req, res, next) {
  const requestedStaffId = req.query.staffId || req.body?.staffId || req.params?.staffId;
  if (req.user?.role === "staff" && requestedStaffId && requestedStaffId !== req.user.staffId) {
    auditLog(req, "STAFF_CROSS_ID_INJECTION_BLOCKED", { requestedStaffId, verifiedStaffId: req.user.staffId }).catch(() => undefined);
    return res.status(403).json({ error: "Staff requests are restricted to the authenticated staff context" });
  }
  return next();
}

function toCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function fromCents(value) {
  return Math.round(Number(value || 0)) / 100;
}

function moneyNumber(value) {
  return fromCents(value);
}

function splitName(firstName, lastName) {
  const first = String(firstName || "").trim();
  const last = String(lastName || "").trim();
  if (!first || !last) throw new Error("first_name and last_name are required");
  return { first, last, fullName: `${first} ${last}`.trim() };
}

function slugEmailPart(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, ".");
}

function generateTemporaryPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*()-_=+[]{}";
  const all = upper + lower + numbers + symbols;
  const required = [
    upper[crypto.randomInt(upper.length)],
    lower[crypto.randomInt(lower.length)],
    numbers[crypto.randomInt(numbers.length)],
    symbols[crypto.randomInt(symbols.length)],
  ];
  while (required.length < 18) {
    required.push(all[crypto.randomInt(all.length)]);
  }
  return required.sort(() => crypto.randomInt(3) - 1).join("");
}

async function generateAvailableStaffEmail(firstName, lastName) {
  const base = `${slugEmailPart(firstName)}.${slugEmailPart(lastName)}`.replace(/\.+/g, ".");
  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const email = `${base}${suffix === 0 ? "" : suffix}@flourish.com`;
    const [{ data: staffMatch, error: staffError }, { data: authUsers, error: authError }] = await Promise.all([
      supabase.from("staff").select("id").eq("email", email).maybeSingle(),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (staffError) throw staffError;
    if (authError) throw authError;
    const authMatch = authUsers.users.some((user) => user.email?.toLowerCase() === email);
    if (!staffMatch && !authMatch) return email;
  }
  throw new Error("Could not generate an available staff email");
}

function mapStaff(row) {
  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    name: row.full_name,
    email: row.email,
    title: row.title,
    specialties: row.specialties || [],
    commissionRate: Number(row.commission_rate || 0),
    baseSalary: moneyNumber(row.base_salary_cents || 0),
    status: row.availability_status,
    bio: row.bio || "",
    monthlyRevenue: moneyNumber(row.monthly_revenue_cents || 0),
    monthlyCommission: moneyNumber(row.monthly_commission_cents || 0),
    monthlyPayable: moneyNumber((row.base_salary_cents || 0) + (row.monthly_commission_cents || 0)),
    attendancePercentage: Number(row.attendance_percentage || 0),
    mustResetPassword: Boolean(row.must_reset_password),
  };
}

function mapService(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    durationMinutes: row.duration_minutes,
    price: moneyNumber(row.price_cents),
    deposit: moneyNumber(row.deposit_cents),
    active: row.active,
  };
}

function mapAppointment(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    staffId: row.staff_id,
    serviceId: row.service_id,
    startAt: row.start_at,
    endAt: row.end_at,
    status: row.status,
    depositRequired: moneyNumber(row.deposit_required_cents),
    depositPaid: row.deposit_paid,
    notes: row.notes,
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "flourish-salon-pro-api", checkedAt: new Date().toISOString() });
});

app.use("/api", verifySupabaseToken);

app.get("/api/services", asyncHandler(async (req, res) => {
  if (!supabase) return res.json(demoServiceRows.map(mapService));
  const tenantId = req.user?.tenantId || defaultTenantId;
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .is("deleted_at", null)
      .order("name");
    if (error) {
      if (demoAuthEnabled) return res.json(demoServiceRows.map(mapService));
      throw error;
    }
    return res.json(data.map(mapService));
  } catch (error) {
    if (demoAuthEnabled) return res.json(demoServiceRows.map(mapService));
    throw error;
  }
}));

app.get("/api/staff", asyncHandler(async (req, res) => {
  if (!supabase) return res.json(demoStaffRows.map(mapStaff));
  const tenantId = req.user?.tenantId || defaultTenantId;
  try {
    let query = supabase
      .from("staff")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("full_name");
    if (req.user?.role === "staff") query = query.eq("id", req.user.staffId);
    if (!req.user || req.user.role === "client" || req.query.includeUnavailable !== "true") query = query.eq("availability_status", "online").eq("active", true);
    const { data, error } = await query;
    if (error) {
      if (demoAuthEnabled) return res.json(demoStaffRows.map(mapStaff));
      throw error;
    }
    return res.json(data.map(mapStaff));
  } catch (error) {
    if (demoAuthEnabled) return res.json(demoStaffRows.map(mapStaff));
    throw error;
  }
}));

app.get("/api/availability", asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenantId || defaultTenantId;
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  const staffId = String(req.query.staffId || "");
  const serviceId = String(req.query.serviceId || "");
  if (!staffId || !serviceId) return res.status(400).json({ error: "staffId and serviceId are required" });

  const [{ data: service }, { data: staff }, { data: appointments }, { data: locks }] = await Promise.all([
    supabase.from("services").select("*").eq("tenant_id", tenantId).eq("id", serviceId).eq("active", true).is("deleted_at", null).maybeSingle(),
    supabase.from("staff").select("*").eq("tenant_id", tenantId).eq("id", staffId).eq("active", true).is("deleted_at", null).maybeSingle(),
    supabase.from("appointments").select("start_at, end_at, status").eq("tenant_id", tenantId).eq("staff_id", staffId).gte("start_at", `${date}T00:00:00Z`).lt("start_at", `${date}T23:59:59Z`),
    supabase.from("slot_locks").select("start_time, end_time, locked_until").eq("tenant_id", tenantId).eq("staff_id", staffId).eq("booking_date", date).gt("locked_until", new Date().toISOString()),
  ]);

  if (!service || !staff || staff.availability_status !== "online") {
    return res.json({ date, staffId, serviceId, businessHours: { opensAt: "10:00", closesAt: "02:00", closesNextDay: true }, bookingCutoffMinutes: 120, slots: [] });
  }

  const duration = Number(service.duration_minutes || 30);
  const slots = [];
  for (let minutesFromMidnight = 10 * 60; minutesFromMidnight + duration <= 26 * 60; minutesFromMidnight += 30) {
    const hour = Math.floor(minutesFromMidnight / 60);
    const minute = minutesFromMidnight % 60;
    const slotDate = new Date(`${date}T00:00:00`);
    if (hour >= 24) slotDate.setDate(slotDate.getDate() + 1);
    slotDate.setHours(hour % 24, minute, 0, 0);
    const endDate = new Date(slotDate.getTime() + duration * 60_000);
    const time = `${String(hour % 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const blockedByAppointment = (appointments || []).some((appointment) => !["cancelled", "no_show"].includes(appointment.status)
      && slotDate < new Date(appointment.end_at) && new Date(appointment.start_at) < endDate);
    const blockedByLock = (locks || []).some((lock) => lock.start_time?.slice(0, 5) === time);
    const cutoff = slotDate.getTime() - Date.now() < 120 * 60_000;
    slots.push({
      time,
      startAt: slotDate.toISOString(),
      endAt: endDate.toISOString(),
      available: !blockedByAppointment && !blockedByLock && !cutoff,
      blockedBy: cutoff ? "cutoff" : blockedByAppointment ? "appointment" : blockedByLock ? "hold" : null,
      label: slotDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    });
  }
  res.json({ date, staffId, serviceId, businessHours: { opensAt: "10:00", closesAt: "02:00", closesNextDay: true }, bookingCutoffMinutes: 120, slots });
}));

app.post("/api/holds", requireRole("client", "admin"), asyncHandler(async (req, res) => {
  const startAt = req.body.startAt ? new Date(req.body.startAt) : new Date(`${req.body.date}T${req.body.time}:00`);
  const { data: service, error: serviceError } = await supabase.from("services").select("duration_minutes").eq("tenant_id", req.user.tenantId).eq("id", req.body.serviceId).single();
  if (serviceError) return res.status(404).json({ error: "Service not found" });
  const endAt = new Date(startAt.getTime() + Number(service.duration_minutes || 30) * 60_000);
  const { data, error } = await supabase
    .from("slot_locks")
    .insert({
      tenant_id: req.user.tenantId,
      staff_id: req.body.staffId,
      booking_date: startAt.toISOString().slice(0, 10),
      start_time: startAt.toISOString().slice(11, 19),
      end_time: endAt.toISOString().slice(11, 19),
      locked_until: new Date(Date.now() + 7 * 60_000).toISOString(),
      locked_by: req.user.id,
    })
    .select("*")
    .single();
  if (error) {
    await auditLog(req, "CLIENT_BOOKING_PREVENTED", { reason: "slot_lock_failed", staffId: req.body.staffId, startAt: startAt.toISOString() });
    return res.status(409).json({ error: "That slot is already locked. Choose another time or join the waitlist." });
  }
  io.emit("appointments:update", []);
  res.status(201).json({ id: data.id, staffId: data.staff_id, startAt: startAt.toISOString(), endAt: endAt.toISOString(), expiresAt: data.locked_until, status: "active" });
}));

app.post("/api/waitlist", requireRole("client", "admin"), asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("waitlist_entries")
    .insert({
      tenant_id: req.user.tenantId,
      customer_user_id: req.user.id,
      customer_name: req.body.customerName,
      customer_email: req.user.email,
      staff_id: req.body.staffId,
      service_id: req.body.serviceId,
      desired_start_at: req.body.startAt,
      status: "waiting",
    })
    .select("*")
    .single();
  if (error) throw error;
  io.emit("waitlist:update", data);
  res.status(201).json(data);
}));

app.post("/api/staff", requireRole("admin"), asyncHandler(async (req, res) => {
  const { first, last, fullName } = splitName(req.body.first_name, req.body.last_name);
  const email = await generateAvailableStaffEmail(first, last);
  const temporaryPassword = generateTemporaryPassword();
  const title = String(req.body.title || "Stylist").trim();
  const specialties = Array.isArray(req.body.specialties)
    ? req.body.specialties.map(String).filter(Boolean)
    : String(req.body.specialties || "Hair").split(",").map((item) => item.trim()).filter(Boolean);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    app_metadata: { role: "staff", tenant_id: req.user.tenantId },
    user_metadata: { full_name: fullName, role: "staff" },
  });
  if (authError || !authData.user) throw authError || new Error("Supabase Auth did not return a user");

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .insert({
      tenant_id: req.user.tenantId,
      user_id: authData.user.id,
      first_name: first,
      last_name: last,
      full_name: fullName,
      email,
      title,
      specialties,
      commission_rate: Number(req.body.commissionRate || req.body.commission_rate || 10),
      base_salary_cents: toCents(req.body.baseSalary || req.body.base_salary || 0),
      bio: String(req.body.bio || ""),
      availability_status: "online",
      must_reset_password: true,
    })
    .select("*")
    .single();
  if (staffError) throw staffError;

  await supabase.from("user_roles").insert({ user_id: authData.user.id, role: "staff", tenant_id: req.user.tenantId });
  await auditLog(req, "STAFF_PROVISIONED", { staffId: staff.id, email });
  io.emit("staff:update", mapStaff(staff));
  res.status(201).json({ staff: mapStaff(staff), credentials: { email, temporaryPassword } });
}));

app.post("/api/staff/:staffId/force-password-reset", requireRole("admin"), asyncHandler(async (req, res) => {
  if (canUseDemoFallback(req)) {
    const demoStaff = demoStaffRows.find((member) => member.id === req.params.staffId);
    if (demoStaff) {
      const temporaryPassword = generateTemporaryPassword();
      const staff = { ...demoStaff, must_reset_password: true };
      io.emit("staff:update", { id: staff.id, mustResetPassword: true });
      return res.json({ staff: mapStaff(staff), credentials: { email: staff.email, temporaryPassword } });
    }
  }

  if (!supabase) return res.status(404).json({ error: "Staff member not found" });

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("*")
    .eq("tenant_id", req.user.tenantId)
    .eq("id", req.params.staffId)
    .is("deleted_at", null)
    .single();
  if (staffError || !staff?.user_id) {
    if (demoAuthEnabled) {
      const demoStaff = demoStaffRows.find((member) => member.id === req.params.staffId);
      if (demoStaff) {
        const temporaryPassword = generateTemporaryPassword();
        const staffWithReset = { ...demoStaff, must_reset_password: true };
        io.emit("staff:update", { id: staffWithReset.id, mustResetPassword: true });
        return res.json({ staff: mapStaff(staffWithReset), credentials: { email: staffWithReset.email, temporaryPassword } });
      }
    }
    return res.status(404).json({ error: "Staff member not found" });
  }

  const temporaryPassword = generateTemporaryPassword();
  const { error: updateError } = await supabase.auth.admin.updateUserById(staff.user_id, {
    password: temporaryPassword,
    user_metadata: { must_reset_password: true },
  });
  if (updateError) throw updateError;
  await supabase.auth.admin.signOut(staff.user_id, "global");
  await supabase.from("staff").update({ must_reset_password: true, updated_at: new Date().toISOString() }).eq("id", staff.id);
  await auditLog(req, "AUTH_PASSWORD_RESET_FORCED", { staffId: staff.id, email: staff.email });
  io.emit("staff:update", { id: staff.id, mustResetPassword: true });
  res.json({ staff: mapStaff(staff), credentials: { email: staff.email, temporaryPassword } });
}));

app.get("/api/appointments", requireRole("admin", "staff"), requireStaffIsolation, asyncHandler(async (req, res) => {
  let query = supabase.from("appointments").select("*").eq("tenant_id", req.user.tenantId).order("start_at", { ascending: true });
  if (req.user.role === "staff") query = query.eq("staff_id", req.user.staffId);
  const { data, error } = await query;
  if (error) throw error;
  res.json(data.map(mapAppointment));
}));

app.post("/api/appointments", requireRole("admin"), asyncHandler(async (req, res) => {
  const { data: service, error: serviceError } = await supabase.from("services").select("*").eq("id", req.body.serviceId).eq("tenant_id", req.user.tenantId).single();
  if (serviceError) return res.status(404).json({ error: "Service not found" });
  const startAt = req.body.startAt ? new Date(req.body.startAt) : new Date(`${req.body.date}T${req.body.time}:00`);
  const endAt = new Date(startAt.getTime() + Number(service.duration_minutes) * 60_000);
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      tenant_id: req.user.tenantId,
      customer_name: req.body.customerName,
      customer_email: req.body.customerEmail,
      email: req.body.customerEmail,
      staff_id: req.body.staffId,
      service_id: req.body.serviceId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: req.body.status || "booked",
      deposit_required_cents: service.deposit_cents || 0,
      deposit_paid: Boolean(req.body.depositPaid),
      notes: req.body.notes || "",
    })
    .select("*")
    .single();
  if (error) throw error;
  await auditLog(req, "ADMIN_APPOINTMENT_CREATED", { appointmentId: data.id });
  io.emit("appointments:update", [mapAppointment(data)]);
  res.status(201).json(mapAppointment(data));
}));

app.patch("/api/appointments/:id/status", requireRole("admin", "staff"), requireStaffIsolation, asyncHandler(async (req, res) => {
  const allowed = ["arrived", "in_progress", "completed", "no_show"];
  if (!allowed.includes(req.body.status)) return res.status(422).json({ error: "Invalid status" });
  let query = supabase.from("appointments").update({ status: req.body.status, updated_at: new Date().toISOString() }).eq("tenant_id", req.user.tenantId).eq("id", req.params.id);
  if (req.user.role === "staff") query = query.eq("staff_id", req.user.staffId);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  io.emit("appointments:update", [mapAppointment(data)]);
  res.json(mapAppointment(data));
}));

app.post("/api/bookings", requireRole("admin", "client"), asyncHandler(async (req, res) => {
  const requestedEmail = String(req.body.customerEmail || req.body.email || "").trim().toLowerCase();
  if (req.user.role === "client" && requestedEmail !== req.user.email.toLowerCase()) {
    await auditLog(req, "CLIENT_BOOKING_PREVENTED", { reason: "email_mismatch", requestedEmail });
    return res.status(403).json({ error: "Booking email must match the authenticated user" });
  }
  const startAt = req.body.startAt ? new Date(req.body.startAt) : new Date(`${req.body.date}T${req.body.time}:00`);
  const { data, error } = await supabase.rpc("create_client_booking", {
    p_tenant_id: req.user.tenantId,
    p_client_id: req.user.id,
    p_customer_name: req.body.customerName,
    p_customer_email: requestedEmail,
    p_staff_id: req.body.staffId,
    p_service_id: req.body.serviceId,
    p_start_at: startAt.toISOString(),
    p_notes: req.body.notes || "",
  });
  if (error) throw error;
  await auditLog(req, "CLIENT_BOOKING_CREATED", { appointmentId: data.id, staffId: req.body.staffId });
  io.emit("appointments:update", [mapAppointment(data)]);
  res.status(201).json({ appointment: mapAppointment(data), payment: { required: data.deposit_required_cents > 0, depositAmount: moneyNumber(data.deposit_required_cents) } });
}));

app.get("/api/admin/metrics", requireRole("admin"), asyncHandler(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: appointments }, { data: invoices }, { data: ledger }, { data: staff }, { data: inventory }] = await Promise.all([
    supabase.from("appointments").select("id, client_id, customer_email, status, start_at").eq("tenant_id", req.user.tenantId),
    supabase.from("invoices").select("id, total_cents, status, created_at").eq("tenant_id", req.user.tenantId).is("deleted_at", null),
    supabase.from("ledger_entries").select("entry_type, amount_cents").eq("tenant_id", req.user.tenantId),
    supabase.from("staff").select("base_salary_cents").eq("tenant_id", req.user.tenantId).is("deleted_at", null),
    supabase.from("inventory").select("stock, reorderAt").eq("tenant_id", req.user.tenantId).then((result) => result).catch(() => ({ data: [] })),
  ]);

  const activeClients = new Set((appointments || []).map((item) => item.client_id || item.customer_email).filter(Boolean)).size;
  const revenueCents = (ledger || []).filter((row) => row.entry_type === "revenue").reduce((sum, row) => sum + Number(row.amount_cents || 0), 0)
    || (invoices || []).filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + Number(invoice.total_cents || 0), 0);
  const salaryCents = (staff || []).reduce((sum, row) => sum + Number(row.base_salary_cents || 0), 0);
  const inventoryExpenseCents = (ledger || []).filter((row) => row.entry_type === "inventory_expense").reduce((sum, row) => sum + Math.abs(Number(row.amount_cents || 0)), 0);
  const todayAppointments = (appointments || []).filter((appointment) => String(appointment.start_at).startsWith(today)).length;
  const todayRevenueCents = (invoices || [])
    .filter((invoice) => invoice.status === "paid" && String(invoice.created_at).startsWith(today))
    .reduce((sum, invoice) => sum + Number(invoice.total_cents || 0), 0);

  res.json({
    activeClients,
    totalCustomers: activeClients,
    appointmentsToday: todayAppointments,
    revenueToday: moneyNumber(todayRevenueCents),
    ledgerRevenue: moneyNumber(revenueCents),
    staffSalaryLiability: moneyNumber(salaryCents),
    inventoryExpense: moneyNumber(inventoryExpenseCents),
    netProfit: moneyNumber(revenueCents - salaryCents - inventoryExpenseCents),
    netProfitMargin: revenueCents > 0 ? Math.round(((revenueCents - salaryCents - inventoryExpenseCents) / revenueCents) * 1000) / 10 : 0,
    lowStockCount: (inventory || []).filter((item) => Number(item.stock || 0) <= Number(item.reorderAt || item.reorder_at || 0)).length,
  });
}));

app.get("/api/metrics", requireRole("admin"), (req, res, next) => {
  req.url = "/admin/metrics";
  app._router.handle(req, res, next);
});

app.get("/api/financials", requireRole("admin"), asyncHandler(async (req, res) => {
  const { data: ledger, error } = await supabase.from("ledger_entries").select("entry_type, amount_cents").eq("tenant_id", req.user.tenantId);
  if (error) throw error;
  const revenue = ledger.filter((row) => row.entry_type === "revenue").reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  const expenses = ledger.filter((row) => row.entry_type !== "revenue").reduce((sum, row) => sum + Math.abs(Number(row.amount_cents || 0)), 0);
  res.json({ revenue: moneyNumber(revenue), expenses: moneyNumber(expenses), netProfit: moneyNumber(revenue - expenses) });
}));

app.get("/api/invoices", requireRole("admin"), asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_line_items(*)")
    .eq("tenant_id", req.user.tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  res.json((data || []).map((invoice) => ({
    id: invoice.invoice_number || invoice.id,
    date: String(invoice.created_at).slice(0, 10),
    customer: invoice.customer_name,
    customerEmail: invoice.customer_email,
    payment: invoice.payment_method,
    status: invoice.status === "paid" ? "Paid" : invoice.status,
    subtotal: moneyNumber(invoice.subtotal_cents),
    discount: moneyNumber(invoice.discount_cents),
    total: moneyNumber(invoice.total_cents),
    createdAt: invoice.created_at,
    items: (invoice.invoice_line_items || []).map((item) => ({
      serviceId: item.service_id || "other",
      staffId: item.staff_id,
      name: item.description,
      quantity: item.quantity,
      unitPrice: moneyNumber(item.unit_amount_cents),
      total: moneyNumber(item.amount_cents),
      custom: !item.service_id,
    })),
  })));
}));

app.post("/api/invoices", requireRole("admin"), asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!req.body.customer) return res.status(400).json({ error: "Customer name is required" });
  if (items.length === 0) return res.status(400).json({ error: "At least one invoice item is required" });

  const normalizedItems = items.map((item) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const unitAmountCents = toCents(item.unitPrice || 0);
    return {
      tenant_id: req.user.tenantId,
      staff_id: item.staffId,
      service_id: item.serviceId === "other" ? null : item.serviceId,
      description: String(item.name || "Service"),
      quantity,
      unit_amount_cents: unitAmountCents,
      amount_cents: quantity * unitAmountCents,
    };
  });
  const subtotalCents = normalizedItems.reduce((sum, item) => sum + item.amount_cents, 0);
  const discountCents = toCents(req.body.discount || 0);
  const totalCents = Math.max(0, subtotalCents - discountCents);
  const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      tenant_id: req.user.tenantId,
      customer_name: req.body.customer,
      customer_email: req.body.customerEmail || "walk-in@flourish.local",
      invoice_number: invoiceNumber,
      status: String(req.body.status || "Paid").toLowerCase(),
      subtotal_cents: subtotalCents,
      discount_cents: discountCents,
      total_cents: totalCents,
      payment_method: req.body.payment || "Cash",
      created_by: req.user.id,
    })
    .select("*")
    .single();
  if (invoiceError) throw invoiceError;

  const { error: lineError } = await supabase.from("invoice_line_items").insert(normalizedItems.map((item) => ({ ...item, invoice_id: invoice.id })));
  if (lineError) throw lineError;
  await supabase.from("ledger_entries").insert({
    tenant_id: req.user.tenantId,
    invoice_id: invoice.id,
    entry_type: "revenue",
    amount_cents: totalCents,
    description: `Invoice ${invoiceNumber}`,
    created_by: req.user.id,
  });

  const response = {
    id: invoiceNumber,
    date: String(invoice.created_at).slice(0, 10),
    customer: invoice.customer_name,
    payment: invoice.payment_method,
    status: "Paid",
    items: normalizedItems.map((item) => ({
      serviceId: item.service_id || "other",
      staffId: item.staff_id,
      name: item.description,
      quantity: item.quantity,
      unitPrice: moneyNumber(item.unit_amount_cents),
      total: moneyNumber(item.amount_cents),
      custom: !item.service_id,
    })),
    subtotal: moneyNumber(subtotalCents),
    discount: moneyNumber(discountCents),
    total: moneyNumber(totalCents),
    createdAt: invoice.created_at,
  };
  await auditLog(req, "INVOICE_CREATED", { invoiceId: invoice.id, invoiceNumber });
  io.emit("invoices:update", [response]);
  res.status(201).json(response);
}));

app.get("/api/payroll", requireRole("admin", "staff"), requireStaffIsolation, asyncHandler(async (req, res) => {
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  if (canUseDemoFallback(req) || !supabase) return res.json(demoPayrollRows(month));

  let staffQuery = supabase.from("staff").select("*").eq("tenant_id", req.user.tenantId).is("deleted_at", null);
  if (req.user.role === "staff") staffQuery = staffQuery.eq("id", req.user.staffId);

  let staffRows = [];
  let lines = [];
  try {
    const [staffResult, lineResult] = await Promise.all([
      staffQuery,
      supabase.from("invoice_line_items").select("staff_id, amount_cents").eq("tenant_id", req.user.tenantId),
    ]);
    if (staffResult.error) throw staffResult.error;
    if (lineResult.error) throw lineResult.error;
    staffRows = staffResult.data || [];
    lines = lineResult.data || [];
  } catch (error) {
    if (demoAuthEnabled) return res.json(demoPayrollRows(month));
    throw error;
  }

  const rows = (staffRows || []).map((member) => {
    const revenueCents = (lines || []).filter((line) => line.staff_id === member.id).reduce((sum, line) => sum + Number(line.amount_cents || 0), 0);
    const commissionCents = Math.round(revenueCents * (Number(member.commission_rate || 0) / 100));
    const payableCents = Number(member.base_salary_cents || 0) + commissionCents;
    return {
      staffId: member.id,
      name: member.full_name,
      title: member.title,
      month,
      baseSalary: moneyNumber(member.base_salary_cents),
      commission: moneyNumber(commissionCents),
      revenue: moneyNumber(revenueCents),
      deductions: 0,
      bonuses: 0,
      payable: moneyNumber(payableCents),
      paid: false,
      paidAt: null,
      attendancePercentage: 0,
    };
  });
  const netRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const payrollPayable = rows.reduce((sum, row) => sum + row.payable, 0);
  res.json({
    month,
    rows,
    summary: {
      grossRevenue: netRevenue,
      discounts: 0,
      netRevenue,
      payrollPayable,
      payrollPaid: 0,
      payrollUnpaid: payrollPayable,
      profitAfterPayroll: netRevenue - payrollPayable,
      invoiceCount: 0,
    },
  });
}));

app.patch("/api/payroll/:staffId/status", requireRole("admin"), asyncHandler(async (req, res) => {
  const month = String(req.body.month || new Date().toISOString().slice(0, 7));
  const row = demoPayrollRows(month).rows.find((item) => item.staffId === req.params.staffId);
  if (!row) return res.status(404).json({ error: "Staff member not found" });
  row.paid = Boolean(req.body.paid);
  row.paidAt = row.paid ? new Date().toISOString() : null;
  io.emit("payroll:update", row);
  res.json(row);
}));

app.post("/api/payroll/adjustments", requireRole("admin"), asyncHandler(async (req, res) => {
  const adjustment = {
    id: `adj-${Date.now()}`,
    staffId: req.body.staffId,
    month: req.body.month || new Date().toISOString().slice(0, 7),
    type: req.body.type === "bonus" ? "bonus" : "deduction",
    amount: Number(req.body.amount || 0),
    reason: String(req.body.reason || ""),
  };
  io.emit("payroll:update", adjustment);
  res.status(201).json(adjustment);
}));

app.delete("/api/payroll/adjustments/:id", requireRole("admin"), asyncHandler(async (req, res) => {
  const payload = { id: req.params.id };
  io.emit("payroll:update", payload);
  res.json(payload);
}));

app.get("/api/admin/attendance", requireRole("admin"), asyncHandler(async (req, res) => {
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  const month = String(req.query.month || date.slice(0, 7));
  if (canUseDemoFallback(req) || !supabase) return res.json(demoAttendanceSummary(date, month));

  try {
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("tenant_id", req.user.tenantId)
      .is("deleted_at", null)
      .order("full_name");
    if (error) throw error;
    const summary = demoAttendanceSummary(date, month);
    summary.staff = (data || []).map((member) => ({
      staffId: member.id,
      name: member.full_name,
      title: member.title,
      availabilityStatus: member.availability_status,
      attendanceStatus: member.availability_status === "online" ? "present" : member.availability_status,
      clockInAt: null,
      clockOutAt: null,
      attendancePercentage: 0,
    }));
    return res.json(summary);
  } catch (error) {
    if (demoAuthEnabled) return res.json(demoAttendanceSummary(date, month));
    throw error;
  }
}));

app.post("/api/admin/attendance", requireRole("admin"), asyncHandler(async (req, res) => {
  const payload = {
    id: `att-${Date.now()}`,
    staffId: req.body.staffId,
    date: req.body.date || new Date().toISOString().slice(0, 10),
    status: req.body.status || "present",
    clockInAt: req.body.clockInAt || null,
    clockOutAt: req.body.clockOutAt || null,
  };
  io.emit("attendance:update", payload);
  await auditLog(req, "ATTENDANCE_MARKED", payload);
  res.status(201).json(payload);
}));

app.get("/api/admin/leave-requests", requireRole("admin"), asyncHandler(async (_req, res) => {
  res.json([]);
}));

app.patch("/api/admin/leave-requests/:id", requireRole("admin"), asyncHandler(async (req, res) => {
  const payload = { id: req.params.id, status: req.body.status, reviewedAt: new Date().toISOString() };
  io.emit("leave:update", payload);
  res.json(payload);
}));

app.post("/api/staff/me/password", requireRole("staff"), asyncHandler(async (req, res) => {
  if (!req.body.current_password || !req.body.new_password) return res.status(400).json({ error: "Current and new passwords are required" });
  const { error: signInError } = await supabaseVerifier.auth.signInWithPassword({ email: req.user.email, password: req.body.current_password });
  if (signInError) return res.status(403).json({ error: "Current password is incorrect" });
  const { error } = await supabase.auth.admin.updateUserById(req.user.id, { password: req.body.new_password, user_metadata: { must_reset_password: false } });
  if (error) throw error;
  if (req.user.staffId) await supabase.from("staff").update({ must_reset_password: false, updated_at: new Date().toISOString() }).eq("id", req.user.staffId);
  await auditLog(req, "STAFF_PASSWORD_UPDATED", { staffId: req.user.staffId });
  io.emit("security:staff-password-updated", { staffId: req.user.staffId, email: req.user.email, at: new Date().toISOString() });
  res.json({ ok: true });
}));

app.get("/api/staff/me/schedule", requireRole("staff", "admin"), requireStaffIsolation, asyncHandler(async (req, res) => {
  const staffId = req.user.role === "staff" ? req.user.staffId : req.query.staffId;
  if (!staffId) return res.status(400).json({ error: "staffId is required" });
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  const [{ data: staff }, { data: appointments }] = await Promise.all([
    supabase.from("staff").select("*").eq("id", staffId).eq("tenant_id", req.user.tenantId).single(),
    supabase.from("appointments").select("*").eq("tenant_id", req.user.tenantId).eq("staff_id", staffId).gte("start_at", `${date}T00:00:00Z`).lt("start_at", `${date}T23:59:59Z`),
  ]);
  res.json({ staff: staff ? mapStaff(staff) : null, date, appointments: (appointments || []).map(mapAppointment), attendance: null, attendancePercentage: 0, commission: 0, revenue: 0 });
}));

app.get("/api/staff/commission", requireRole("admin", "staff"), requireStaffIsolation, asyncHandler(async (req, res) => {
  const staffId = req.user.role === "staff" ? req.user.staffId : req.query.staffId;
  let query = supabase.from("invoice_line_items").select("staff_id, amount_cents").eq("tenant_id", req.user.tenantId);
  if (staffId) query = query.eq("staff_id", staffId);
  const { data, error } = await query;
  if (error) throw error;
  res.json(data || []);
}));

app.post("/api/staff/me/leave", requireRole("staff", "admin"), asyncHandler(async (req, res) => {
  await auditLog(req, "STAFF_LEAVE_REQUESTED", { fromDate: req.body.fromDate, toDate: req.body.toDate });
  io.emit("attendance:update", { staffId: req.user.staffId, leaveRequest: req.body });
  res.status(201).json({ ok: true });
}));

app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));

app.use(async (error, req, res, _next) => {
  const message = error instanceof Error ? error.message : "Internal server error";
  await auditLog(req, "SERVER_ERROR", { path: req.path, message }).catch(() => undefined);
  res.status(500).json({ error: message });
});

io.on("connection", (socket) => {
  socket.on("schedule:join", ({ staffId, date }) => {
    if (staffId && date) socket.join(`schedule:${staffId}:${date}`);
  });
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. The API is probably already running at http://localhost:${port}. Stop the existing process before starting another one.`);
    process.exit(1);
  }
  throw error;
});

server.listen(port, () => {
  console.log(`Flourish Salon Pro API running on http://localhost:${port}`);
});
