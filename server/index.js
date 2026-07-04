import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000;
const clientOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigin = (origin, callback) => {
  if (!origin || clientOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Origin ${origin} is not allowed by CORS`));
};
const businessTimeZone = process.env.BUSINESS_TIMEZONE || "Asia/Karachi";
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseAdmin = supabaseUrl && supabaseKey && supabaseUrl !== "https://example.supabase.co" && supabaseKey !== "demo-key"
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ["GET", "POST", "PATCH", "DELETE"] },
});

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "10mb" }));

const BUSINESS_OPEN_MINUTES = 10 * 60;
const BUSINESS_CLOSE_MINUTES = 26 * 60;
const SLOT_STEP_MINUTES = 30;
const BOOKING_CUTOFF_MINUTES = 120;
const CANCEL_CUTOFF_MINUTES = 240;
const HOLD_MINUTES = 7;

const now = () => new Date();
function dateKey(value = now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: businessTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
const today = () => dateKey(now());
const appointmentDateKey = (appointment) => dateKey(appointment.startAt);
const minutes = (value) => value * 60 * 1000;

const services = [
  { id: "svc-haircut", name: "Signature Haircut", category: "Hair", durationMinutes: 30, price: 3500, description: "Precision cut, consultation, and finishing polish.", imageUrl: "/Hero_sec.png", active: true },
  { id: "svc-facial", name: "Botanical Facial", category: "Skin", durationMinutes: 60, price: 6500, description: "A calming skin reset with massage and glow mask.", imageUrl: "/Hero_sec.png", active: true },
  { id: "svc-color", name: "Lived-In Color", category: "Color", durationMinutes: 120, price: 14500, description: "Dimensional color with toner and finish.", imageUrl: "/Hero_sec.png", active: true },
  { id: "svc-bridal", name: "Bridal Preview", category: "Makeup", durationMinutes: 90, price: 18000, description: "Luxury bridal consultation and makeup trial.", imageUrl: "/Hero_sec.png", active: true },
];

const staff = [
  { id: "stf-sara", name: "Sara Ahmed", title: "Creative Director", specialties: ["Hair", "Color"], commissionRate: 15, baseSalary: 65000, status: "online", credentialEmail: "sara.ahmed@flourish.local", activePassword: "staff123", passwordUpdatedAt: new Date().toISOString(), bio: "Editorial cuts, soft color, and quiet luxury finishes." },
  { id: "stf-nadia", name: "Nadia Hussain", title: "Skin & Makeup Artist", specialties: ["Skin", "Makeup"], commissionRate: 12, baseSalary: 52000, status: "online", credentialEmail: "nadia.hussain@flourish.local", activePassword: "Nadia123", passwordUpdatedAt: new Date().toISOString(), bio: "Glow-focused facials and camera-ready makeup." },
  { id: "stf-hina", name: "Hina Rashid", title: "Nail & Detail Specialist", specialties: ["Hair", "Skin", "Makeup"], commissionRate: 10, baseSalary: 45000, status: "online", credentialEmail: "hina.rashid@flourish.local", activePassword: "Hina1234", passwordUpdatedAt: new Date().toISOString(), bio: "Detail-led treatments with calm, precise timing." },
];

const state = {
  tenant: {
    id: "salon_demo_001",
    name: "Flourish Salon Pro",
    plan: "Scale",
    trialEndsAt: "2026-07-21",
    locations: 2,
    seats: 12,
  },
  appointments: [
    makeAppointment({
      id: "apt-1001",
      customerName: "Ayesha Khan",
      customerEmail: "ayesha@email.com",
      staffId: "stf-sara",
      serviceId: "svc-haircut",
      startAt: atBusinessTime(today(), 10, 0).toISOString(),
      status: "booked",
    }),
    makeAppointment({
      id: "apt-1002",
      customerName: "Fatima Ali",
      customerEmail: "fatima@email.com",
      staffId: "stf-nadia",
      serviceId: "svc-facial",
      startAt: atBusinessTime(today(), 23, 30).toISOString(),
      status: "in_progress",
    }),
  ],
  holds: [],
  waitlist: [],
  attendance: [],
  customers: [
    { id: 1, name: "Ayesha Khan", phone: "0300-1234567", email: "ayesha@email.com", notes: "Prefers Sara for haircuts", createdAt: new Date().toISOString() },
    { id: 2, name: "Fatima Ali", phone: "0321-7654321", email: "fatima@email.com", notes: "Allergic to certain products", createdAt: new Date().toISOString() },
  ],
  invoices: [
    {
      id: "INV-1042",
      date: today(),
      customer: "Ayesha Khan",
      payment: "Cash",
      status: "Paid",
      items: [
        { serviceId: "svc-haircut", name: "Signature Haircut", staffId: "stf-sara", quantity: 1, unitPrice: 3500, total: 3500, custom: false },
      ],
      subtotal: 3500,
      discount: 0,
      total: 3500,
      createdAt: new Date().toISOString(),
    },
  ],
  leaveRequests: [],
  payroll: [],
  payrollAdjustments: [],
  expenses: [
    {
      id: "exp-1001",
      date: today(),
      category: "Product purchase",
      vendor: "Luxe Beauty Supply",
      description: "Hair serum stock refill",
      amount: 12000,
      createdAt: new Date().toISOString(),
    },
  ],
};

const plans = [
  { id: "starter", name: "Starter", priceMonthly: 29, seats: 3, locations: 1, features: ["Bookings", "Customers", "Invoices"] },
  { id: "scale", name: "Scale", priceMonthly: 79, seats: 15, locations: 3, features: ["Everything in Starter", "Payroll", "Reports", "Automations"] },
  { id: "enterprise", name: "Enterprise", priceMonthly: 199, seats: 50, locations: 10, features: ["Everything in Scale", "SAML", "Audit logs", "Priority support"] },
];

function roleFromRequest(req) {
  return req.header("x-role") || "customer";
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(roleFromRequest(req))) {
      return res.status(403).json({ error: "Forbidden for this role" });
    }
    next();
  };
}

function staffFromRequest(req) {
  return req.header("x-staff-id") || "stf-sara";
}

function verifyPin(req, res) {
  const pin = String(req.body?.pin || req.header("x-pin") || "");
  if (pin !== "1234") {
    res.status(403).json({ error: "Security PIN is required for staff changes" });
    return false;
  }
  return true;
}

function sanitizeCredentialPart(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function staffEmailFromName(name, domain = "flourish.local") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = sanitizeCredentialPart(parts[0] || "staff");
  const lastName = sanitizeCredentialPart(parts.slice(1).join("") || "member");
  return `${firstName}.${lastName}@${domain}`;
}

function uniqueStaffEmail(baseEmail, ignoreStaffId = "") {
  const [localPart, domain] = baseEmail.split("@");
  let email = baseEmail;
  let count = 2;
  while (staff.some((member) => member.id !== ignoreStaffId && member.credentialEmail === email)) {
    email = `${localPart}${count}@${domain}`;
    count += 1;
  }
  return email;
}

function generateTemporaryPassword(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function getService(serviceId) {
  return services.find((service) => service.id === serviceId);
}

function normalizeServicePayload(input, existing = {}) {
  const price = Number(input.price ?? existing.price ?? 0);
  const durationMinutes = Number(input.durationMinutes ?? input.duration ?? existing.durationMinutes ?? 30);
  return {
    ...existing,
    name: String(input.name ?? existing.name ?? "").trim(),
    category: String(input.category ?? existing.category ?? "Hair").trim(),
    durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 30,
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    description: String(input.description ?? existing.description ?? "").trim(),
    imageUrl: String(input.imageUrl ?? existing.imageUrl ?? "/Hero_sec.png").trim() || "/Hero_sec.png",
    active: input.active ?? existing.active ?? true,
  };
}

function getStaffMember(staffId) {
  return staff.find((member) => member.id === staffId);
}

function isStaffBookable(staffId) {
  return getStaffMember(staffId)?.status === "online";
}

function attendanceFor(staffId, date = today()) {
  return state.attendance.find((entry) => entry.staffId === staffId && entry.date === date);
}

function monthKey(value = today()) {
  return String(value).slice(0, 7);
}

function daysInMonth(month = monthKey()) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

function workingDaysElapsed(month = monthKey()) {
  const currentMonth = monthKey(today());
  return month === currentMonth ? Number(today().slice(8, 10)) : daysInMonth(month);
}

function staffAttendancePercentage(staffId, month = monthKey()) {
  const totalDays = workingDaysElapsed(month);
  const presentDays = state.attendance.filter((entry) =>
    entry.staffId === staffId &&
    entry.date.startsWith(month) &&
    ["present", "half_day", "paid_leave", "clocked_in", "clocked_out"].includes(entry.status)
  ).reduce((sum, entry) => sum + (entry.status === "half_day" ? 0.5 : 1), 0);
  return totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
}

function normalizeStaffPayload(input, existing = {}) {
  const name = String(input.name ?? existing.name ?? "").trim();
  const domain = String(input.domain || "flourish.local").replace(/^@/, "").trim() || "flourish.local";
  const credentialEmail = String(input.credentialEmail || existing.credentialEmail || staffEmailFromName(name, domain)).trim().toLowerCase();
  return {
    ...existing,
    name,
    title: String(input.title ?? existing.title ?? "").trim(),
    specialties: Array.isArray(input.specialties)
      ? input.specialties.map(String).filter(Boolean)
      : String(input.specialties ?? existing.specialties?.join(",") ?? "Hair").split(",").map((item) => item.trim()).filter(Boolean),
    commissionRate: Math.max(0, Number(input.commissionRate ?? existing.commissionRate ?? 0) || 0),
    baseSalary: Math.max(0, Number(input.baseSalary ?? existing.baseSalary ?? 0) || 0),
    status: input.status || existing.status || "online",
    credentialEmail,
    activePassword: existing.activePassword,
    passwordUpdatedAt: existing.passwordUpdatedAt,
    bio: String(input.bio ?? existing.bio ?? "").trim(),
  };
}

function invoiceCommissions(month = monthKey()) {
  const totals = Object.fromEntries(staff.map((member) => [member.id, { revenue: 0, commission: 0, invoices: 0 }]));
  for (const invoice of state.invoices) {
    if (!String(invoice.date).startsWith(month) || invoice.status !== "Paid") continue;
    for (const item of invoice.items || []) {
      const staffMember = getStaffMember(item.staffId);
      if (!staffMember) continue;
      const lineTotal = Number(item.total || 0);
      totals[staffMember.id].revenue += lineTotal;
      totals[staffMember.id].commission += Math.round(lineTotal * (Number(staffMember.commissionRate || 0) / 100));
      totals[staffMember.id].invoices += 1;
    }
  }
  return staff.map((member) => ({
    staffId: member.id,
    name: member.name,
    title: member.title,
    commissionRate: member.commissionRate,
    revenue: totals[member.id]?.revenue || 0,
    commission: totals[member.id]?.commission || 0,
    invoices: totals[member.id]?.invoices || 0,
    attendancePercentage: staffAttendancePercentage(member.id, month),
  }));
}

function payrollRecordFor(staffId, month = monthKey()) {
  let record = state.payroll.find((item) => item.staffId === staffId && item.month === month);
  if (!record) {
    record = { staffId, month, paid: false, paidAt: null, updatedAt: new Date().toISOString() };
    state.payroll.push(record);
  }
  return record;
}

function payrollRows(month = monthKey()) {
  const commissionMap = Object.fromEntries(invoiceCommissions(month).map((item) => [item.staffId, item]));
  return staff.map((member) => {
    const record = payrollRecordFor(member.id, month);
    const adjustments = state.payrollAdjustments.filter((item) => item.staffId === member.id && item.month === month);
    const deductions = adjustments.filter((item) => item.type === "deduction").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const bonuses = adjustments.filter((item) => item.type === "bonus").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const commission = commissionMap[member.id]?.commission || 0;
    const revenue = commissionMap[member.id]?.revenue || 0;
    const baseSalary = Number(member.baseSalary || 0);
    return {
      staffId: member.id,
      name: member.name,
      title: member.title,
      month,
      baseSalary,
      commission,
      revenue,
      deductions,
      bonuses,
      payable: Math.max(0, baseSalary + commission + bonuses - deductions),
      paid: Boolean(record.paid),
      paidAt: record.paidAt,
      adjustments,
      attendancePercentage: staffAttendancePercentage(member.id, month),
    };
  });
}

function financialSummary(month = monthKey()) {
  const invoices = state.invoices.filter((invoice) => String(invoice.date).startsWith(month) && invoice.status === "Paid");
  const grossRevenue = invoices.reduce((sum, invoice) => sum + Number(invoice.subtotal || invoice.total || 0), 0);
  const discounts = invoices.reduce((sum, invoice) => sum + Number(invoice.discount || 0), 0);
  const netRevenue = invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const payroll = payrollRows(month);
  const payrollPayable = payroll.reduce((sum, row) => sum + row.payable, 0);
  const payrollPaid = payroll.filter((row) => row.paid).reduce((sum, row) => sum + row.payable, 0);
  const expenses = state.expenses.filter((expense) => String(expense.date).startsWith(month));
  const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  return {
    month,
    grossRevenue,
    discounts,
    netRevenue,
    payrollPayable,
    payrollPaid,
    payrollUnpaid: payrollPayable - payrollPaid,
    expenseTotal,
    operatingExpenses: expenseTotal,
    profitAfterPayroll: netRevenue - payrollPayable,
    netProfit: netRevenue - payrollPayable - expenseTotal,
    invoiceCount: invoices.length,
    expenseCount: expenses.length,
    expenses,
  };
}

function normalizeExpensePayload(input) {
  return {
    date: input.date || today(),
    category: String(input.category || "Miscellaneous").trim(),
    vendor: String(input.vendor || "").trim(),
    description: String(input.description || "").trim(),
    amount: Math.max(0, Number(input.amount || 0)),
  };
}

function normalizeInvoicePayload(input) {
  const items = Array.isArray(input.items) ? input.items : [];
  const normalizedItems = items.map((item) => {
    const service = item.serviceId && item.serviceId !== "other" ? getService(item.serviceId) : null;
    const quantity = Math.max(1, Number(item.quantity || 1));
    const unitPrice = Math.max(0, Number(item.unitPrice ?? service?.price ?? 0));
    const name = String(item.name || service?.name || "Other service").trim();
    return {
      serviceId: service?.id || "other",
      name,
      staffId: item.staffId,
      quantity,
      unitPrice,
      total: quantity * unitPrice,
      custom: !service,
    };
  }).filter((item) => item.name && item.staffId && item.total >= 0);
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
  const discount = Math.max(0, Number(input.discount || 0));
  return {
    customer: String(input.customer || "").trim(),
    payment: String(input.payment || "Cash"),
    status: String(input.status || "Paid"),
    items: normalizedItems,
    subtotal,
    discount,
    total: Math.max(0, subtotal - discount),
  };
}

function atBusinessTime(date, hour, minute = 0) {
  const base = new Date(`${date}T00:00:00`);
  const extraDays = hour >= 24 ? 1 : 0;
  base.setDate(base.getDate() + extraDays);
  base.setHours(hour % 24, minute, 0, 0);
  return base;
}

function parseBusinessStart(date, time) {
  const [hourRaw, minuteRaw] = time.split(":").map(Number);
  const hour = hourRaw < 10 ? hourRaw + 24 : hourRaw;
  return atBusinessTime(date, hour, minuteRaw || 0);
}

function makeAppointment(input) {
  const service = getService(input.serviceId);
  const startAt = new Date(input.startAt);
  const endAt = new Date(startAt.getTime() + minutes(service?.durationMinutes || input.durationMinutes || 30));
  return {
    id: input.id || `apt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone || "",
    staffId: input.staffId,
    serviceId: input.serviceId,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    status: input.status || "booked",
    notes: input.notes || "",
    createdAt: new Date().toISOString(),
  };
}

function upsertCustomer({ name, email = "", phone = "", notes = "" }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedName = String(name || "").trim();
  const customer = state.customers.find((item) =>
    (normalizedEmail && String(item.email || "").toLowerCase() === normalizedEmail) ||
    String(item.name || "").toLowerCase() === normalizedName.toLowerCase()
  );

  if (customer) {
    customer.email = customer.email || normalizedEmail;
    customer.phone = customer.phone || phone;
    customer.notes = notes || customer.notes;
    return { customer, created: false };
  }

  const nextCustomer = {
    id: Math.max(0, ...state.customers.map((item) => Number(item.id) || 0)) + 1,
    name: normalizedName,
    phone: String(phone || "").trim(),
    email: normalizedEmail,
    notes: String(notes || "").trim(),
    createdAt: new Date().toISOString(),
  };
  state.customers.unshift(nextCustomer);
  return { customer: nextCustomer, created: true };
}

function customerStatsFor({ name = "", email = "" }) {
  const normalizedEmail = String(email || "").toLowerCase();
  const normalizedName = String(name || "").toLowerCase();
  const matchingAppointments = state.appointments.filter((appointment) =>
    (normalizedEmail && String(appointment.customerEmail || "").toLowerCase() === normalizedEmail) ||
    String(appointment.customerName || "").toLowerCase() === normalizedName
  );
  const visitStatuses = new Set(["arrived", "completed"]);
  const visitAppointments = matchingAppointments.filter((appointment) => visitStatuses.has(String(appointment.status || "").toLowerCase()));
  const lastVisitedDate = visitAppointments
    .map((appointment) => appointmentDateKey(appointment))
    .filter(Boolean)
    .sort()
    .at(-1) || "";

  return {
    totalBookings: matchingAppointments.length,
    visits: visitAppointments.length,
    lastVisitedDate,
  };
}

function appointmentStatsFromRows(rows = []) {
  const stats = new Map();
  const visitStatuses = new Set(["arrived", "completed"]);
  const ensure = (key) => {
    if (!stats.has(key)) stats.set(key, { totalBookings: 0, visits: 0, lastVisitedDate: "" });
    return stats.get(key);
  };

  for (const row of rows) {
    const email = String(row.customer_email || row.customerEmail || "").trim().toLowerCase();
    const name = String(row.customer_name || row.customerName || "").trim().toLowerCase();
    const keys = [email && `email:${email}`, name && `name:${name}`].filter(Boolean);
    const status = String(row.status || "").toLowerCase();
    const startValue = row.start_at || row.startAt || row.date || row.created_at || row.createdAt;
    const visitDate = startValue ? dateKey(startValue) : "";

    for (const key of keys) {
      const entry = ensure(key);
      entry.totalBookings += 1;
      if (visitStatuses.has(status)) {
        entry.visits += 1;
        if (visitDate && (!entry.lastVisitedDate || visitDate > entry.lastVisitedDate)) {
          entry.lastVisitedDate = visitDate;
        }
      }
    }
  }

  return stats;
}

function statsForRecordFromMap(record, statsMap) {
  const email = String(record.email || "").trim().toLowerCase();
  const name = String(record.full_name || record.name || record.email || "").trim().toLowerCase();
  return statsMap.get(`email:${email}`) || statsMap.get(`name:${name}`) || customerStatsFor({ name, email });
}

function normalizeCustomerRecord(record) {
  const name = String(record.full_name || record.name || record.email || "Unnamed Customer").trim();
  const email = String(record.email || "").trim();
  const stats = customerStatsFor({ name, email });
  return {
    id: record.user_id || record.id,
    name,
    phone: record.phone || "",
    email,
    totalBookings: Number(record.totalBookings ?? record.total_bookings ?? stats.totalBookings ?? 0),
    visits: Number(record.visits ?? record.visits_count ?? stats.visits ?? 0),
    lastVisitedDate: record.lastVisitedDate || record.last_visited_date || stats.lastVisitedDate || "",
    notes: record.notes || "",
    vip: Number(record.visits ?? record.visits_count ?? stats.visits ?? 0) >= 10,
    createdAt: record.created_at || record.createdAt || "",
    source: record.source || "supabase",
  };
}

function localCustomerRows() {
  return state.customers.map((customer) => normalizeCustomerRecord({
    ...customer,
    full_name: customer.name,
    source: "local",
  }));
}

async function fetchSupabaseCustomerRows() {
  if (!supabaseAdmin) return null;

  const [{ data: profiles, error: profileError }, { data: roles, error: roleError }, appointmentResult] = await Promise.all([
    supabaseAdmin.from("profiles").select("id,user_id,full_name,email,created_at,updated_at").order("created_at", { ascending: false }),
    supabaseAdmin.from("user_roles").select("user_id,role"),
    supabaseAdmin.from("appointments").select("customer_email,customer_name,status,start_at,date,created_at"),
  ]);

  if (profileError) throw profileError;
  if (roleError) throw roleError;
  const appointmentStats = appointmentStatsFromRows(appointmentResult.error ? [] : appointmentResult.data || []);

  const roleMap = new Map();
  for (const role of roles || []) {
    if (!roleMap.has(role.user_id)) roleMap.set(role.user_id, new Set());
    roleMap.get(role.user_id).add(role.role);
  }

  return (profiles || [])
    .filter((profile) => {
      const userRoles = roleMap.get(profile.user_id) || new Set();
      return userRoles.has("customer") || (!userRoles.has("owner") && !userRoles.has("staff"));
    })
    .map((profile) => normalizeCustomerRecord({ ...profile, ...statsForRecordFromMap(profile, appointmentStats) }));
}

function cleanupHolds() {
  const current = now();
  for (const hold of state.holds) {
    if (hold.status === "active" && new Date(hold.expiresAt) <= current) {
      hold.status = "expired";
    }
  }
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function findConflict({ staffId, startAt, endAt, ignoreHoldId }) {
  cleanupHolds();
  const start = new Date(startAt);
  const end = new Date(endAt);
  const appointment = state.appointments.find((item) =>
    item.staffId === staffId &&
    !["cancelled", "no_show"].includes(item.status) &&
    overlaps(start, end, new Date(item.startAt), new Date(item.endAt))
  );
  if (appointment) return { type: "appointment", record: appointment };

  const hold = state.holds.find((item) =>
    item.id !== ignoreHoldId &&
    item.staffId === staffId &&
    item.status === "active" &&
    overlaps(start, end, new Date(item.startAt), new Date(item.endAt))
  );
  if (hold) return { type: "hold", record: hold };

  return null;
}

function validateBookingWindow(startAt, endAt) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (start.getTime() - now().getTime() < minutes(BOOKING_CUTOFF_MINUTES)) {
    return "Bookings must be made at least 2 hours before the appointment.";
  }
  if (end <= start) return "Appointment end time must be after start time.";
  return null;
}

function generateSlots({ date, staffId, serviceId }) {
  cleanupHolds();
  const service = getService(serviceId);
  if (!service || !isStaffBookable(staffId)) return [];
  const slots = [];
  for (let cursor = BUSINESS_OPEN_MINUTES; cursor + service.durationMinutes <= BUSINESS_CLOSE_MINUTES; cursor += SLOT_STEP_MINUTES) {
    const hour = Math.floor(cursor / 60);
    const minute = cursor % 60;
    const start = atBusinessTime(date, hour, minute);
    const end = new Date(start.getTime() + minutes(service.durationMinutes));
    const cutoffReason = validateBookingWindow(start, end);
    const conflict = findConflict({ staffId, startAt: start, endAt: end });
    const displayHour = hour >= 24 ? hour - 24 : hour;
    slots.push({
      time: `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      available: !cutoffReason && !conflict,
      blockedBy: cutoffReason ? "cutoff" : conflict?.type || null,
      label: start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    });
  }
  return slots;
}

function emitSchedule(staffId, date) {
  io.to(`schedule:${staffId}:${date}`).emit("schedule:update", {
    staffId,
    date,
    appointments: state.appointments.filter((appointment) => appointment.staffId === staffId && appointment.startAt.slice(0, 10) === date),
    holds: state.holds.filter((hold) => hold.staffId === staffId && hold.status === "active"),
  });
}

function notifyWaitlist(appointment) {
  const waiting = state.waitlist.find((entry) =>
    entry.status === "waiting" &&
    entry.staffId === appointment.staffId &&
    entry.serviceId === appointment.serviceId &&
    entry.desiredStartAt === appointment.startAt
  );
  if (waiting) {
    waiting.status = "notified";
    waiting.notifiedAt = new Date().toISOString();
    io.emit("waitlist:notify", waiting);
  }
}

io.on("connection", (socket) => {
  socket.on("schedule:join", ({ staffId, date }) => {
    socket.join(`schedule:${staffId}:${date}`);
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "flourish-salon-pro-api", checkedAt: new Date().toISOString() });
});

app.get("/api/tenant", requireRole("admin", "staff"), (_req, res) => res.json(state.tenant));
app.get("/api/services", (_req, res) => res.json(services));
app.post("/api/services", requireRole("admin"), (req, res) => {
  const payload = normalizeServicePayload(req.body);
  if (!payload.name) return res.status(400).json({ error: "Service name is required" });

  const service = {
    id: `svc-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...payload,
  };
  services.push(service);
  res.status(201).json(service);
});
app.patch("/api/services/:id", requireRole("admin"), (req, res) => {
  const index = services.findIndex((service) => service.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Service not found" });

  const nextService = {
    ...services[index],
    ...normalizeServicePayload(req.body, services[index]),
  };
  if (!nextService.name) return res.status(400).json({ error: "Service name is required" });

  services[index] = nextService;
  res.json(nextService);
});
app.delete("/api/services/:id", requireRole("admin"), (req, res) => {
  const index = services.findIndex((service) => service.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Service not found" });

  const [removed] = services.splice(index, 1);
  res.json(removed);
});
app.get("/api/staff", (req, res) => {
  const includeUnavailable = req.query.includeUnavailable === "true" || ["admin", "staff"].includes(roleFromRequest(req));
  const month = req.query.month || monthKey();
  const role = roleFromRequest(req);
  const commissionMap = Object.fromEntries(invoiceCommissions(month).map((item) => [item.staffId, item]));
  const payrollMap = Object.fromEntries(payrollRows(month).map((item) => [item.staffId, item]));
  const rows = staff.map((member) => {
    const row = {
      ...member,
      credentialEmail: member.credentialEmail,
      activePassword: role === "admin" ? member.activePassword : undefined,
      passwordUpdatedAt: member.passwordUpdatedAt,
    monthlyRevenue: commissionMap[member.id]?.revenue || 0,
    monthlyCommission: commissionMap[member.id]?.commission || 0,
    attendancePercentage: commissionMap[member.id]?.attendancePercentage || 0,
    monthlyPayable: payrollMap[member.id]?.payable || 0,
    };
    if (role !== "admin") delete row.activePassword;
    return row;
  });
  res.json(includeUnavailable ? rows : rows.filter((member) => member.status === "online"));
});

app.post("/api/staff", requireRole("admin"), (req, res) => {
  if (!verifyPin(req, res)) return;
  const payload = normalizeStaffPayload(req.body);
  if (!payload.name) return res.status(400).json({ error: "Staff name is required" });
  const temporaryPassword = generateTemporaryPassword();
  const member = {
    id: `stf-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...payload,
    credentialEmail: uniqueStaffEmail(payload.credentialEmail),
    activePassword: temporaryPassword,
    passwordUpdatedAt: new Date().toISOString(),
  };
  staff.push(member);
  io.emit("staff:update", member);
  res.status(201).json({ ...member, credentials: { email: member.credentialEmail, password: temporaryPassword } });
});

app.patch("/api/staff/:id", requireRole("admin"), (req, res) => {
  if (!verifyPin(req, res)) return;
  const index = staff.findIndex((member) => member.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Staff member not found" });
  const member = normalizeStaffPayload(req.body, staff[index]);
  if (!member.name) return res.status(400).json({ error: "Staff name is required" });
  member.credentialEmail = uniqueStaffEmail(member.credentialEmail, member.id);
  if (req.body.overridePassword) {
    const nextPassword = String(req.body.overridePassword).trim();
    if (nextPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    member.activePassword = nextPassword;
    member.passwordUpdatedAt = new Date().toISOString();
  }
  staff[index] = member;
  io.emit("staff:update", member);
  res.json(member);
});

app.patch("/api/staff/me/password", requireRole("staff", "admin"), (req, res) => {
  const staffMember = getStaffMember(staffFromRequest(req));
  if (!staffMember) return res.status(404).json({ error: "Staff member not found" });
  const currentPassword = String(req.body.currentPassword || "");
  const nextPassword = String(req.body.newPassword || "");
  if (staffMember.activePassword !== currentPassword) return res.status(401).json({ error: "Current password is incorrect" });
  if (nextPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });
  staffMember.activePassword = nextPassword;
  staffMember.passwordUpdatedAt = new Date().toISOString();
  io.emit("staff:update", staffMember);
  res.json({ staffId: staffMember.id, email: staffMember.credentialEmail, passwordUpdatedAt: staffMember.passwordUpdatedAt });
});

app.patch("/api/staff/:id/password", requireRole("admin"), (req, res) => {
  if (!verifyPin(req, res)) return;
  const member = getStaffMember(req.params.id);
  if (!member) return res.status(404).json({ error: "Staff member not found" });
  const nextPassword = String(req.body.password || generateTemporaryPassword()).trim();
  if (nextPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  member.activePassword = nextPassword;
  member.passwordUpdatedAt = new Date().toISOString();
  io.emit("staff:update", member);
  res.json({ staffId: member.id, email: member.credentialEmail, password: member.activePassword, passwordUpdatedAt: member.passwordUpdatedAt });
});

app.delete("/api/staff/:id", requireRole("admin"), (req, res) => {
  if (!verifyPin(req, res)) return;
  const index = staff.findIndex((member) => member.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Staff member not found" });
  const [removed] = staff.splice(index, 1);
  state.appointments = state.appointments.filter((appointment) => appointment.staffId !== removed.id);
  state.attendance = state.attendance.filter((entry) => entry.staffId !== removed.id);
  io.emit("staff:update", removed);
  io.emit("appointments:update", state.appointments);
  res.json(removed);
});

app.get("/api/availability", (req, res) => {
  const { date = today(), staffId, serviceId } = req.query;
  if (!staffId || !serviceId) return res.status(400).json({ error: "staffId and serviceId are required" });
  if (!isStaffBookable(staffId)) {
    return res.json({
      date,
      staffId,
      serviceId,
      businessHours: { opensAt: "10:00", closesAt: "02:00", closesNextDay: true },
      bookingCutoffMinutes: BOOKING_CUTOFF_MINUTES,
      staffStatus: getStaffMember(staffId)?.status || "offline_today",
      slots: [],
    });
  }
  res.json({
    date,
    staffId,
    serviceId,
    businessHours: { opensAt: "10:00", closesAt: "02:00", closesNextDay: true },
    bookingCutoffMinutes: BOOKING_CUTOFF_MINUTES,
    slots: generateSlots({ date, staffId, serviceId }),
  });
});

app.post("/api/holds", (req, res) => {
  const { date, time, staffId, serviceId, customerEmail } = req.body;
  const service = getService(serviceId);
  if (!service) return res.status(404).json({ error: "Service not found" });
  if (!isStaffBookable(staffId)) return res.status(409).json({ error: "This staff member is offline today." });
  const start = parseBusinessStart(date, time);
  const end = new Date(start.getTime() + minutes(service.durationMinutes));
  const windowError = validateBookingWindow(start, end);
  if (windowError) return res.status(422).json({ error: windowError });
  const conflict = findConflict({ staffId, startAt: start, endAt: end });
  if (conflict) return res.status(409).json({ error: "That slot was just taken. Join the waitlist or choose another time.", conflict: conflict.type });

  const hold = {
    id: `hold-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    staffId,
    serviceId,
    customerEmail,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    expiresAt: new Date(now().getTime() + minutes(HOLD_MINUTES)).toISOString(),
    status: "active",
  };
  state.holds.push(hold);
  emitSchedule(staffId, date);
  res.status(201).json(hold);
});

app.post("/api/bookings", (req, res) => {
  const { holdId, customerName, customerEmail, customerPhone, staffId, serviceId, date, time, notes } = req.body;
  const service = getService(serviceId);
  if (!service) return res.status(404).json({ error: "Service not found" });
  if (!isStaffBookable(staffId)) return res.status(409).json({ error: "This staff member is offline today." });
  if (!String(customerPhone || "").replace(/\D/g, "").match(/^\d{7,15}$/)) {
    return res.status(400).json({ error: "A valid phone number is required" });
  }

  const hold = holdId ? state.holds.find((item) => item.id === holdId && item.status === "active") : null;
  const start = hold ? new Date(hold.startAt) : parseBusinessStart(date, time);
  const end = new Date(start.getTime() + minutes(service.durationMinutes));
  const windowError = validateBookingWindow(start, end);
  if (windowError) return res.status(422).json({ error: windowError });
  const conflict = findConflict({ staffId, startAt: start, endAt: end, ignoreHoldId: hold?.id });
  if (conflict) return res.status(409).json({ error: "Double-booking prevented by backend validation.", conflict: conflict.type });

  const appointment = makeAppointment({
    customerName,
    customerEmail,
    customerPhone,
    staffId,
    serviceId,
    startAt: start.toISOString(),
    status: "confirmed",
    notes,
  });
  state.appointments.unshift(appointment);
  upsertCustomer({
    name: customerName,
    email: customerEmail,
    phone: customerPhone,
  });
  if (hold) hold.status = "converted";
  emitSchedule(staffId, appointment.startAt.slice(0, 10));
  io.emit("appointments:update", state.appointments);
  io.emit("customers:update", state.customers);
  res.status(201).json({ appointment, message: "Booking confirmed. Payment is collected after service." });
});

app.post("/api/waitlist", (req, res) => {
  const { customerName, customerEmail, staffId, serviceId, startAt } = req.body;
  const entry = {
    id: `wait-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    customerName,
    customerEmail,
    staffId,
    serviceId,
    desiredStartAt: startAt,
    status: "waiting",
    createdAt: new Date().toISOString(),
  };
  state.waitlist.push(entry);
  io.emit("waitlist:update", entry);
  res.status(201).json(entry);
});

app.get("/api/appointments", requireRole("admin", "staff"), (req, res) => {
  if (roleFromRequest(req) === "staff") {
    return res.json(state.appointments.filter((appointment) => appointment.staffId === staffFromRequest(req)));
  }
  res.json(state.appointments);
});

app.post("/api/appointments", requireRole("admin"), (req, res) => {
  const service = getService(req.body.serviceId);
  const staffMember = getStaffMember(req.body.staffId);
  if (!service) return res.status(404).json({ error: "Service not found" });
  if (!staffMember) return res.status(404).json({ error: "Staff member not found" });
  const start = req.body.startAt ? new Date(req.body.startAt) : parseBusinessStart(req.body.date || today(), req.body.time || "10:00");
  const end = new Date(start.getTime() + minutes(service.durationMinutes));
  const conflict = findConflict({ staffId: staffMember.id, startAt: start, endAt: end });
  if (conflict) return res.status(409).json({ error: "That staff member is already booked at this time." });
  const appointment = makeAppointment({
    customerName: req.body.customerName,
    customerEmail: req.body.customerEmail || "",
    staffId: staffMember.id,
    serviceId: service.id,
    startAt: start.toISOString(),
    status: req.body.status || "booked",
    notes: req.body.notes,
  });
  state.appointments.unshift(appointment);
  emitSchedule(appointment.staffId, appointment.startAt.slice(0, 10));
  io.emit("appointments:update", state.appointments);
  res.status(201).json(appointment);
});

app.patch("/api/appointments/:id/status", requireRole("admin", "staff"), (req, res) => {
  const appointment = state.appointments.find((item) => item.id === req.params.id);
  if (!appointment) return res.status(404).json({ error: "Appointment not found" });
  if (roleFromRequest(req) === "staff" && appointment.staffId !== staffFromRequest(req)) {
    return res.status(403).json({ error: "Staff can only update their own appointments" });
  }
  const allowed = ["arrived", "in_progress", "completed", "no_show"];
  if (!allowed.includes(req.body.status)) return res.status(422).json({ error: "Invalid staff status" });
  appointment.status = req.body.status;
  appointment.updatedAt = new Date().toISOString();
  emitSchedule(appointment.staffId, appointment.startAt.slice(0, 10));
  io.emit("appointments:update", state.appointments);
  res.json(appointment);
});

app.patch("/api/appointments/:id/cancel", (req, res) => {
  const appointment = state.appointments.find((item) => item.id === req.params.id);
  if (!appointment) return res.status(404).json({ error: "Appointment not found" });
  if (new Date(appointment.startAt).getTime() - now().getTime() < minutes(CANCEL_CUTOFF_MINUTES)) {
    return res.status(422).json({ error: "Appointments can only be cancelled or rescheduled more than 4 hours before start time." });
  }
  appointment.status = "cancelled";
  appointment.updatedAt = new Date().toISOString();
  notifyWaitlist(appointment);
  emitSchedule(appointment.staffId, appointment.startAt.slice(0, 10));
  io.emit("appointments:update", state.appointments);
  res.json({ appointment, waitlistNotification: "Next waitlisted customer has been notified if one exists." });
});

app.get("/api/customer/bookings", (req, res) => {
  const email = req.query.email;
  res.json(state.appointments.filter((appointment) => appointment.customerEmail === email));
});

app.get("/api/staff/me/schedule", requireRole("staff", "admin"), (req, res) => {
  const staffId = staffFromRequest(req);
  const date = req.query.date || today();
  const appointments = state.appointments.filter((appointment) =>
    appointment.staffId === staffId && appointmentDateKey(appointment) === date
  );
  const serviceMap = Object.fromEntries(services.map((service) => [service.id, service]));
  const staffMember = staff.find((item) => item.id === staffId);
  const commission = invoiceCommissions(monthKey(date)).find((item) => item.staffId === staffId);
  const payroll = payrollRows(monthKey(date)).find((item) => item.staffId === staffId);
  res.json({
    staff: staffMember,
    date,
    appointments: appointments.map((appointment) => ({ ...appointment, serviceName: serviceMap[appointment.serviceId]?.name || "Service" })),
    attendance: attendanceFor(staffId, date) || null,
    attendancePercentage: staffAttendancePercentage(staffId, monthKey(date)),
    commission: commission?.commission || 0,
    revenue: commission?.revenue || 0,
    payroll,
  });
});

app.patch("/api/staff/:id/status", requireRole("admin"), (req, res) => {
  const staffMember = getStaffMember(req.params.id);
  if (!staffMember) return res.status(404).json({ error: "Staff member not found" });
  const allowed = ["online", "offline_today", "on_leave"];
  if (!allowed.includes(req.body.status)) return res.status(422).json({ error: "Invalid staff status" });
  staffMember.status = req.body.status;
  io.emit("staff:update", staffMember);
  res.json(staffMember);
});

app.post("/api/auth/staff-login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const staffMember = staff.find((member) => member.credentialEmail === email && member.activePassword === password);
  if (!staffMember) return res.status(401).json({ error: "Invalid staff email or password" });
  res.json({
    role: "staff",
    staff: {
      id: staffMember.id,
      name: staffMember.name,
      title: staffMember.title,
      email: staffMember.credentialEmail,
    },
  });
});

app.post("/api/staff/me/leave", requireRole("staff", "admin"), (req, res) => {
  const staffId = staffFromRequest(req);
  const request = {
    id: `leave-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    staffId,
    fromDate: req.body.fromDate,
    toDate: req.body.toDate || req.body.fromDate,
    reason: String(req.body.reason || "").trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  state.leaveRequests.unshift(request);
  io.emit("leave:update", request);
  res.status(201).json(request);
});

app.get("/api/staff/me/attendance", requireRole("staff", "admin"), (req, res) => {
  const staffId = staffFromRequest(req);
  const month = req.query.month || monthKey();
  res.json({
    month,
    percentage: staffAttendancePercentage(staffId, month),
    rows: state.attendance.filter((entry) => entry.staffId === staffId && entry.date.startsWith(month)),
    leaveRequests: state.leaveRequests.filter((entry) => entry.staffId === staffId && String(entry.fromDate).startsWith(month)),
  });
});

function attendanceSummary(date = today()) {
  return staff.map((member) => {
    const entry = attendanceFor(member.id, date);
    return {
      staffId: member.id,
      name: member.name,
      title: member.title,
      availabilityStatus: member.status,
      attendanceStatus: entry?.status || (member.status === "online" ? "absent" : member.status),
      clockInAt: entry?.clockInAt || null,
      clockOutAt: entry?.clockOutAt || null,
      attendancePercentage: staffAttendancePercentage(member.id, monthKey(date)),
    };
  });
}

app.get("/api/admin/attendance", requireRole("admin"), (req, res) => {
  const date = req.query.date || today();
  const month = req.query.month || monthKey(date);
  res.json({
    date,
    month,
    staff: attendanceSummary(date),
    monthly: staff.map((member) => ({
      staffId: member.id,
      name: member.name,
      percentage: staffAttendancePercentage(member.id, month),
      rows: state.attendance.filter((entry) => entry.staffId === member.id && entry.date.startsWith(month)),
    })),
    leaveRequests: state.leaveRequests,
  });
});

app.post("/api/admin/attendance", requireRole("admin"), (req, res) => {
  const { staffId, date = today(), status = "present" } = req.body;
  if (!getStaffMember(staffId)) return res.status(404).json({ error: "Staff member not found" });
  const allowed = ["present", "absent", "half_day", "paid_leave", "unpaid_leave"];
  if (!allowed.includes(status)) return res.status(422).json({ error: "Invalid attendance status" });
  let entry = attendanceFor(staffId, date);
  if (!entry) {
    entry = { id: `att-${Date.now()}-${Math.random().toString(16).slice(2)}`, staffId, date, clockInAt: null, clockOutAt: null, status };
    state.attendance.push(entry);
  }
  entry.status = status;
  entry.clockInAt = req.body.clockInAt || null;
  entry.clockOutAt = req.body.clockOutAt || null;
  entry.markedBy = "admin";
  entry.updatedAt = new Date().toISOString();
  io.emit("attendance:update", attendanceSummary(date));
  res.status(201).json(entry);
});

app.get("/api/admin/leave-requests", requireRole("admin"), (_req, res) => {
  res.json(state.leaveRequests);
});

app.patch("/api/admin/leave-requests/:id", requireRole("admin"), (req, res) => {
  const request = state.leaveRequests.find((entry) => entry.id === req.params.id);
  if (!request) return res.status(404).json({ error: "Leave request not found" });
  const allowed = ["approved", "rejected"];
  if (!allowed.includes(req.body.status)) return res.status(422).json({ error: "Invalid leave status" });
  request.status = req.body.status;
  request.reviewedAt = new Date().toISOString();
  if (request.status === "approved") {
    let cursor = new Date(`${request.fromDate}T00:00:00`);
    const end = new Date(`${request.toDate}T00:00:00`);
    while (cursor <= end) {
      const date = cursor.toISOString().slice(0, 10);
      let entry = attendanceFor(request.staffId, date);
      if (!entry) {
        entry = { id: `att-${Date.now()}-${Math.random().toString(16).slice(2)}`, staffId: request.staffId, date, clockInAt: null, clockOutAt: null, status: "paid_leave" };
        state.attendance.push(entry);
      } else {
        entry.status = "paid_leave";
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  io.emit("leave:update", request);
  io.emit("attendance:update", attendanceSummary(request.fromDate));
  res.json(request);
});

app.get("/api/metrics", requireRole("admin"), (_req, res) => {
  const revenueToday = state.invoices
    .filter((invoice) => invoice.date === today() && invoice.status === "Paid")
    .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  res.json({
    appointmentsToday: state.appointments.filter((appointment) => appointmentDateKey(appointment) === today()).length,
    revenueToday,
    totalCustomers: state.customers.length,
    conversionRate: 68,
    retentionRate: 74,
  });
});

app.get("/api/customers", requireRole("admin"), async (_req, res) => {
  try {
    const supabaseRows = await fetchSupabaseCustomerRows();
    if (supabaseRows) return res.json(supabaseRows);
    return res.json(localCustomerRows());
  } catch (error) {
    console.error("Could not fetch Supabase customers", error);
    return res.status(502).json({
      error: "Could not fetch customers from Supabase",
      fallback: localCustomerRows(),
    });
  }
});
app.post("/api/customers", requireRole("admin"), (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Customer name is required" });
  const { customer, created } = upsertCustomer({
    name,
    email: req.body.email,
    phone: req.body.phone,
    notes: req.body.notes,
  });
  io.emit("customers:update", state.customers);
  res.status(created ? 201 : 200).json(normalizeCustomerRecord({ ...customer, full_name: customer.name, source: "local" }));
});
app.get("/api/staff/commission", requireRole("admin", "staff"), (req, res) => {
  const month = req.query.month || monthKey();
  const rows = invoiceCommissions(month);
  if (roleFromRequest(req) === "staff") {
    return res.json(rows.filter((row) => row.staffId === staffFromRequest(req)));
  }
  res.json(rows);
});
app.get("/api/payroll", requireRole("admin", "staff"), (req, res) => {
  const month = req.query.month || monthKey();
  const rows = payrollRows(month);
  if (roleFromRequest(req) === "staff") {
    return res.json({ month, rows: rows.filter((row) => row.staffId === staffFromRequest(req)), summary: financialSummary(month) });
  }
  res.json({ month, rows, summary: financialSummary(month) });
});
app.patch("/api/payroll/:staffId/status", requireRole("admin"), (req, res) => {
  const staffMember = getStaffMember(req.params.staffId);
  if (!staffMember) return res.status(404).json({ error: "Staff member not found" });
  const month = req.body.month || monthKey();
  const record = payrollRecordFor(staffMember.id, month);
  record.paid = Boolean(req.body.paid);
  record.paidAt = record.paid ? new Date().toISOString() : null;
  record.updatedAt = new Date().toISOString();
  io.emit("payroll:update", payrollRows(month));
  res.json(payrollRows(month).find((row) => row.staffId === staffMember.id));
});
app.post("/api/payroll/adjustments", requireRole("admin"), (req, res) => {
  const staffMember = getStaffMember(req.body.staffId);
  if (!staffMember) return res.status(404).json({ error: "Staff member not found" });
  const type = req.body.type === "bonus" ? "bonus" : "deduction";
  const amount = Math.max(0, Number(req.body.amount || 0));
  if (amount <= 0) return res.status(400).json({ error: "Adjustment amount is required" });
  const adjustment = {
    id: `adj-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    staffId: staffMember.id,
    month: req.body.month || monthKey(),
    type,
    amount,
    reason: String(req.body.reason || "").trim(),
    createdAt: new Date().toISOString(),
  };
  state.payrollAdjustments.unshift(adjustment);
  io.emit("payroll:update", payrollRows(adjustment.month));
  res.status(201).json(adjustment);
});
app.delete("/api/payroll/adjustments/:id", requireRole("admin"), (req, res) => {
  const index = state.payrollAdjustments.findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Adjustment not found" });
  const [removed] = state.payrollAdjustments.splice(index, 1);
  io.emit("payroll:update", payrollRows(removed.month));
  res.json(removed);
});
app.get("/api/financials", requireRole("admin"), (req, res) => {
  res.json(financialSummary(req.query.month || monthKey()));
});
app.get("/api/expenses", requireRole("admin"), (req, res) => {
  const month = req.query.month || monthKey();
  res.json(state.expenses.filter((expense) => String(expense.date).startsWith(month)));
});
app.post("/api/expenses", requireRole("admin"), (req, res) => {
  const payload = normalizeExpensePayload(req.body);
  if (!payload.category) return res.status(400).json({ error: "Expense category is required" });
  if (payload.amount <= 0) return res.status(400).json({ error: "Expense amount must be greater than zero" });
  const expense = {
    id: `exp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...payload,
    createdAt: new Date().toISOString(),
  };
  state.expenses.unshift(expense);
  io.emit("expenses:update", state.expenses);
  io.emit("financials:update", financialSummary(monthKey(expense.date)));
  res.status(201).json(expense);
});
app.delete("/api/expenses/:id", requireRole("admin"), (req, res) => {
  const index = state.expenses.findIndex((expense) => expense.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Expense not found" });
  const [removed] = state.expenses.splice(index, 1);
  io.emit("expenses:update", state.expenses);
  io.emit("financials:update", financialSummary(monthKey(removed.date)));
  res.json(removed);
});
app.get("/api/invoices", requireRole("admin"), (_req, res) => res.json(state.invoices));
app.post("/api/invoices", requireRole("admin"), (req, res) => {
  const payload = normalizeInvoicePayload(req.body);
  if (!payload.customer) return res.status(400).json({ error: "Customer name is required" });
  if (payload.items.length === 0) return res.status(400).json({ error: "Add at least one service line" });
  for (const item of payload.items) {
    if (!getStaffMember(item.staffId)) return res.status(404).json({ error: `Staff member not found for ${item.name}` });
  }
  const invoice = {
    id: `INV-${Date.now().toString().slice(-6)}`,
    date: req.body.date || today(),
    source: "walk-in",
    customerEmail: req.body.customerEmail || "",
    customerPhone: req.body.customerPhone || "",
    ...payload,
    createdAt: new Date().toISOString(),
  };
  state.invoices.unshift(invoice);
  upsertCustomer({ name: invoice.customer, email: invoice.customerEmail, phone: invoice.customerPhone });
  io.emit("invoices:update", state.invoices);
  io.emit("customers:update", localCustomerRows());
  io.emit("staff:commission:update", invoiceCommissions(monthKey(invoice.date)));
  io.emit("payroll:update", payrollRows(monthKey(invoice.date)));
  io.emit("financials:update", financialSummary(monthKey(invoice.date)));
  res.status(201).json(invoice);
});
app.get("/api/plans", requireRole("admin"), (_req, res) => res.json(plans));
app.post("/api/subscription/checkout", requireRole("admin"), (req, res) => {
  const plan = plans.find((item) => item.id === req.body.planId);
  if (!plan) return res.status(400).json({ error: "Unknown plan" });
  res.json({ checkoutUrl: `https://billing.example.com/checkout/${plan.id}`, plan });
});

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

server.listen(port, () => {
  console.log(`Flourish Salon Pro API running on http://localhost:${port}`);
});
