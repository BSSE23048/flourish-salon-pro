import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

const io = new Server(server, {
  cors: { origin: clientOrigin, methods: ["GET", "POST", "PATCH"] },
});

app.use(cors({ origin: clientOrigin }));
app.use(express.json());

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
  { id: "svc-haircut", name: "Signature Haircut", category: "Hair", durationMinutes: 30, price: 3500, deposit: 1000, description: "Precision cut, consultation, and finishing polish." },
  { id: "svc-facial", name: "Botanical Facial", category: "Skin", durationMinutes: 60, price: 6500, deposit: 1500, description: "A calming skin reset with massage and glow mask." },
  { id: "svc-color", name: "Lived-In Color", category: "Color", durationMinutes: 120, price: 14500, deposit: 3500, description: "Dimensional color with toner and finish." },
  { id: "svc-bridal", name: "Bridal Preview", category: "Makeup", durationMinutes: 90, price: 18000, deposit: 5000, description: "Luxury bridal consultation and makeup trial." },
];

const staff = [
  { id: "stf-sara", name: "Sara Ahmed", title: "Creative Director", specialties: ["Hair", "Color"], commissionRate: 15, status: "online", bio: "Editorial cuts, soft color, and quiet luxury finishes." },
  { id: "stf-nadia", name: "Nadia Hussain", title: "Skin & Makeup Artist", specialties: ["Skin", "Makeup"], commissionRate: 12, status: "online", bio: "Glow-focused facials and camera-ready makeup." },
  { id: "stf-hina", name: "Hina Rashid", title: "Nail & Detail Specialist", specialties: ["Hair", "Skin", "Makeup"], commissionRate: 10, status: "online", bio: "Detail-led treatments with calm, precise timing." },
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
    { id: "INV-1042", date: today(), customer: "Ayesha Khan", total: 3500, payment: "Cash", status: "Paid" },
  ],
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

function getService(serviceId) {
  return services.find((service) => service.id === serviceId);
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
app.get("/api/staff", (req, res) => {
  const includeUnavailable = req.query.includeUnavailable === "true" || ["admin", "staff"].includes(roleFromRequest(req));
  res.json(includeUnavailable ? staff : staff.filter((member) => member.status === "online"));
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
  const revenue = appointments.reduce((sum, appointment) => sum + (serviceMap[appointment.serviceId]?.price || 0), 0);
  const staffMember = staff.find((item) => item.id === staffId);
  res.json({
    staff: staffMember,
    date,
    appointments,
    attendance: attendanceFor(staffId, date) || null,
    commission: Math.round(revenue * ((staffMember?.commissionRate || 0) / 100)),
  });
});

app.patch("/api/staff/:id/status", requireRole("admin", "staff"), (req, res) => {
  const staffMember = getStaffMember(req.params.id);
  if (!staffMember) return res.status(404).json({ error: "Staff member not found" });
  if (roleFromRequest(req) === "staff" && staffMember.id !== staffFromRequest(req)) {
    return res.status(403).json({ error: "Staff can only update their own availability" });
  }
  const allowed = ["online", "offline_today", "on_leave"];
  if (!allowed.includes(req.body.status)) return res.status(422).json({ error: "Invalid staff status" });
  staffMember.status = req.body.status;
  io.emit("staff:update", staffMember);
  res.json(staffMember);
});

app.post("/api/staff/me/clock-in", requireRole("staff", "admin"), (req, res) => {
  const staffId = staffFromRequest(req);
  const date = today();
  let entry = attendanceFor(staffId, date);
  if (!entry) {
    entry = { id: `att-${Date.now()}`, staffId, date, clockInAt: new Date().toISOString(), clockOutAt: null, status: "clocked_in" };
    state.attendance.push(entry);
  } else if (!entry.clockInAt) {
    entry.clockInAt = new Date().toISOString();
    entry.status = "clocked_in";
  }
  io.emit("attendance:update", attendanceSummary(date));
  res.status(201).json(entry);
});

app.post("/api/staff/me/clock-out", requireRole("staff", "admin"), (req, res) => {
  const staffId = staffFromRequest(req);
  const date = today();
  const entry = attendanceFor(staffId, date);
  if (!entry?.clockInAt) return res.status(422).json({ error: "Clock in before clocking out" });
  entry.clockOutAt = new Date().toISOString();
  entry.status = "clocked_out";
  io.emit("attendance:update", attendanceSummary(date));
  res.json(entry);
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
    };
  });
}

app.get("/api/admin/attendance", requireRole("admin"), (req, res) => {
  res.json({ date: req.query.date || today(), staff: attendanceSummary(req.query.date || today()) });
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
app.get("/api/invoices", requireRole("admin"), (_req, res) => res.json(state.invoices));
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
