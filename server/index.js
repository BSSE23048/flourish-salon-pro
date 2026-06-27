import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

const io = new Server(server, {
  cors: { origin: clientOrigin, methods: ["GET", "POST", "PATCH", "DELETE"] },
});

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: "10mb" }));

const BUSINESS_OPEN_MINUTES = 10 * 60;
const BUSINESS_CLOSE_MINUTES = 26 * 60;
const SLOT_STEP_MINUTES = 30;
const BOOKING_CUTOFF_MINUTES = 120;
const CANCEL_CUTOFF_MINUTES = 240;
const HOLD_MINUTES = 7;

const now = () => new Date();
const today = () => now().toISOString().slice(0, 10);
const minutes = (value) => value * 60 * 1000;

const services = [
  { id: "svc-haircut", name: "Signature Haircut", category: "Hair", durationMinutes: 30, price: 3500, deposit: 1000, description: "Precision cut, consultation, and finishing polish.", imageUrl: "/Hero_sec.png", active: true },
  { id: "svc-facial", name: "Botanical Facial", category: "Skin", durationMinutes: 60, price: 6500, deposit: 1500, description: "A calming skin reset with massage and glow mask.", imageUrl: "/Hero_sec.png", active: true },
  { id: "svc-color", name: "Lived-In Color", category: "Color", durationMinutes: 120, price: 14500, deposit: 3500, description: "Dimensional color with toner and finish.", imageUrl: "/Hero_sec.png", active: true },
  { id: "svc-bridal", name: "Bridal Preview", category: "Makeup", durationMinutes: 90, price: 18000, deposit: 5000, description: "Luxury bridal consultation and makeup trial.", imageUrl: "/Hero_sec.png", active: true },
];

const staff = [
  { id: "stf-sara", name: "Sara Ahmed", title: "Creative Director", specialties: ["Hair", "Color"], commissionRate: 15, baseSalary: 65000, status: "online", bio: "Editorial cuts, soft color, and quiet luxury finishes." },
  { id: "stf-nadia", name: "Nadia Hussain", title: "Skin & Makeup Artist", specialties: ["Skin", "Makeup"], commissionRate: 12, baseSalary: 52000, status: "online", bio: "Glow-focused facials and camera-ready makeup." },
  { id: "stf-hina", name: "Hina Rashid", title: "Nail & Detail Specialist", specialties: ["Hair", "Skin", "Makeup"], commissionRate: 10, baseSalary: 45000, status: "online", bio: "Detail-led treatments with calm, precise timing." },
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
      depositPaid: true,
    }),
    makeAppointment({
      id: "apt-1002",
      customerName: "Fatima Ali",
      customerEmail: "fatima@email.com",
      staffId: "stf-nadia",
      serviceId: "svc-facial",
      startAt: atBusinessTime(today(), 23, 30).toISOString(),
      status: "in_progress",
      depositPaid: true,
    }),
  ],
  holds: [],
  waitlist: [],
  attendance: [],
  customers: [
    { id: 1, name: "Ayesha Khan", phone: "0300-1234567", visits: 12, lifetimeValue: 42500, segment: "VIP" },
    { id: 2, name: "Fatima Ali", phone: "0321-7654321", visits: 8, lifetimeValue: 28000, segment: "Regular" },
  ],
  inventory: [
    { id: 1, item: "Hair Serum", stock: 3, reorderAt: 8, vendor: "Luxe Beauty Supply" },
    { id: 2, item: "Keratin Kit", stock: 14, reorderAt: 6, vendor: "SalonPro" },
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
};

const plans = [
  { id: "starter", name: "Starter", priceMonthly: 29, seats: 3, locations: 1, features: ["Bookings", "Customers", "Invoices"] },
  { id: "scale", name: "Scale", priceMonthly: 79, seats: 15, locations: 3, features: ["Everything in Starter", "Inventory", "Reports", "Automations"] },
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

function getService(serviceId) {
  return services.find((service) => service.id === serviceId);
}

function normalizeServicePayload(input, existing = {}) {
  const price = Number(input.price ?? existing.price ?? 0);
  const durationMinutes = Number(input.durationMinutes ?? input.duration ?? existing.durationMinutes ?? 30);
  const deposit = Number(input.deposit ?? existing.deposit ?? 0);

  return {
    ...existing,
    name: String(input.name ?? existing.name ?? "").trim(),
    category: String(input.category ?? existing.category ?? "Hair").trim(),
    durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 30,
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    deposit: Number.isFinite(deposit) && deposit >= 0 ? deposit : 0,
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
    ["present", "half_day", "clocked_in", "clocked_out"].includes(entry.status)
  ).reduce((sum, entry) => sum + (entry.status === "half_day" ? 0.5 : 1), 0);
  return totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
}

function normalizeStaffPayload(input, existing = {}) {
  return {
    ...existing,
    name: String(input.name ?? existing.name ?? "").trim(),
    title: String(input.title ?? existing.title ?? "").trim(),
    specialties: Array.isArray(input.specialties)
      ? input.specialties.map(String).filter(Boolean)
      : String(input.specialties ?? existing.specialties?.join(",") ?? "Hair").split(",").map((item) => item.trim()).filter(Boolean),
    commissionRate: Math.max(0, Number(input.commissionRate ?? existing.commissionRate ?? 0) || 0),
    baseSalary: Math.max(0, Number(input.baseSalary ?? existing.baseSalary ?? 0) || 0),
    status: input.status || existing.status || "online",
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
  return {
    month,
    grossRevenue,
    discounts,
    netRevenue,
    payrollPayable,
    payrollPaid,
    payrollUnpaid: payrollPayable - payrollPaid,
    profitAfterPayroll: netRevenue - payrollPayable,
    invoiceCount: invoices.length,
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
    staffId: input.staffId,
    serviceId: input.serviceId,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    status: input.status || "booked",
    depositRequired: service?.deposit || 0,
    depositPaid: Boolean(input.depositPaid),
    notes: input.notes || "",
    createdAt: new Date().toISOString(),
  };
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
  const commissionMap = Object.fromEntries(invoiceCommissions(month).map((item) => [item.staffId, item]));
  const payrollMap = Object.fromEntries(payrollRows(month).map((item) => [item.staffId, item]));
  const rows = staff.map((member) => ({
    ...member,
    monthlyRevenue: commissionMap[member.id]?.revenue || 0,
    monthlyCommission: commissionMap[member.id]?.commission || 0,
    attendancePercentage: commissionMap[member.id]?.attendancePercentage || 0,
    monthlyPayable: payrollMap[member.id]?.payable || 0,
  }));
  res.json(includeUnavailable ? rows : rows.filter((member) => member.status === "online"));
});

app.post("/api/staff", requireRole("admin"), (req, res) => {
  if (!verifyPin(req, res)) return;
  const payload = normalizeStaffPayload(req.body);
  if (!payload.name) return res.status(400).json({ error: "Staff name is required" });
  const member = { id: `stf-${Date.now()}-${Math.random().toString(16).slice(2)}`, ...payload };
  staff.push(member);
  io.emit("staff:update", member);
  res.status(201).json(member);
});

app.patch("/api/staff/:id", requireRole("admin"), (req, res) => {
  if (!verifyPin(req, res)) return;
  const index = staff.findIndex((member) => member.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Staff member not found" });
  const member = normalizeStaffPayload(req.body, staff[index]);
  if (!member.name) return res.status(400).json({ error: "Staff name is required" });
  staff[index] = member;
  io.emit("staff:update", member);
  res.json(member);
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
  const { holdId, customerName, customerEmail, staffId, serviceId, date, time, notes } = req.body;
  const service = getService(serviceId);
  if (!service) return res.status(404).json({ error: "Service not found" });
  if (!isStaffBookable(staffId)) return res.status(409).json({ error: "This staff member is offline today." });

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
    staffId,
    serviceId,
    startAt: start.toISOString(),
    status: "booked",
    depositPaid: false,
    notes,
  });
  state.appointments.unshift(appointment);
  if (hold) hold.status = "converted";
  emitSchedule(staffId, appointment.startAt.slice(0, 10));
  io.emit("appointments:update", state.appointments);
  res.status(201).json({
    appointment,
    payment: {
      required: appointment.depositRequired > 0,
      depositAmount: appointment.depositRequired,
      checkoutUrl: `https://payments.example.com/deposit/${appointment.id}`,
      message: "Stripe deposit stub: connect Stripe Checkout here before production.",
    },
  });
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
    depositPaid: Boolean(req.body.depositPaid),
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
    appointment.staffId === staffId && appointment.startAt.slice(0, 10) === date
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
  const serviceMap = Object.fromEntries(services.map((service) => [service.id, service]));
  const revenueToday = state.appointments
    .filter((appointment) => appointment.startAt.slice(0, 10) === today() && appointment.status === "completed")
    .reduce((sum, appointment) => sum + (serviceMap[appointment.serviceId]?.price || 0), 0);
  const lowStock = state.inventory.filter((item) => item.stock <= item.reorderAt);
  res.json({
    appointmentsToday: state.appointments.filter((appointment) => appointment.startAt.slice(0, 10) === today()).length,
    revenueToday,
    totalCustomers: state.customers.length,
    lowStockCount: lowStock.length,
    conversionRate: 68,
    retentionRate: 74,
    lowStock,
  });
});

app.get("/api/customers", requireRole("admin"), (_req, res) => res.json(state.customers));
app.get("/api/inventory", requireRole("admin"), (_req, res) => res.json(state.inventory));
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
    ...payload,
    createdAt: new Date().toISOString(),
  };
  state.invoices.unshift(invoice);
  io.emit("invoices:update", state.invoices);
  io.emit("staff:commission:update", invoiceCommissions(monthKey(invoice.date)));
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
