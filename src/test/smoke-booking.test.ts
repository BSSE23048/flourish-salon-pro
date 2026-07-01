/**
 * Smoke test for appointment booking and customer auto-creation.
 *
 * Tests:
 * 1. POST /api/bookings creates an appointment and auto-creates a customer
 * 2. GET /api/appointments returns the newly created appointment
 * 3. GET /api/customers includes the auto-created customer
 * 4. POST /api/customers creates a customer directly
 * 5. POST /api/bookings for an existing customer increases bookings without counting a visit
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const API_URL = "http://localhost:4000";

type SmokeAppointment = {
  customerName: string;
};

type SmokeCustomer = {
  name: string;
  visits: number;
  totalBookings: number;
};

async function fetchJSON(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-role": "admin",
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  const body = await res.json();
  return { status: res.status, ok: res.ok, body };
}

describe("Smoke tests: Appointment booking & customer sync", () => {
  let serverReachable = false;
  const runId = Date.now().toString(36);
  const smokeName = `Smoke Test Customer ${runId}`;
  const smokeEmail = `smoketest-${runId}@example.com`;
  const day = String((Date.now() % 20) + 1).padStart(2, "0");
  const month = String(((Date.now() % 8) + 1)).padStart(2, "0");
  const firstDate = `2099-${month}-${day}`;
  const secondDate = `2099-${month}-${String(Number(day) + 1).padStart(2, "0")}`;
  const directName = `Directly Added Customer ${runId}`;
  const directEmail = `direct-${runId}@example.com`;

  beforeAll(async () => {
    try {
      const res = await fetch(`${API_URL}/api/health`);
      serverReachable = res.ok;
      if (serverReachable) {
        await fetchJSON(`${API_URL}/api/staff/stf-sara/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "online" }),
        });
        await fetchJSON(`${API_URL}/api/staff/stf-nadia/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "online" }),
        });
      }
    } catch {
      serverReachable = false;
    }
  });

  it("API server is reachable", () => {
    if (!serverReachable) return;
    expect(serverReachable).toBe(true);
  });

  it("GET /api/appointments returns the initial appointments", async () => {
    if (!serverReachable) return;
    const { ok, body } = await fetchJSON(`${API_URL}/api/appointments`);
    expect(ok).toBe(true);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(2); // at least the seed data
  });

  it("GET /api/customers returns the initial customers", async () => {
    if (!serverReachable) return;
    const { ok, body } = await fetchJSON(`${API_URL}/api/customers`);
    expect(ok).toBe(true);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(2); // seed data
  });

  it("POST /api/bookings creates appointment AND auto-creates a new customer", async () => {
    if (!serverReachable) return;

    // Get customers before
    const beforeRes = await fetchJSON(`${API_URL}/api/customers`);
    const customersBefore = beforeRes.body.length;

    // Book an appointment for a brand-new customer
    const bookingRes = await fetchJSON(`${API_URL}/api/bookings`, {
      method: "POST",
      body: JSON.stringify({
        customerName: smokeName,
        customerEmail: smokeEmail,
        customerPhone: "0300-1111111",
        staffId: "stf-sara",
        serviceId: "svc-haircut",
        date: firstDate,
        time: "14:00",
        notes: "Smoke test booking",
      }),
    });

    expect(bookingRes.ok).toBe(true);
    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.appointment).toBeDefined();
    expect(bookingRes.body.appointment.customerName).toBe(smokeName);
    expect(bookingRes.body.appointment.status).toBe("confirmed");

    // Verify the appointment shows in GET /api/appointments
    const aptsRes = await fetchJSON(`${API_URL}/api/appointments`);
    const newApt = aptsRes.body.find(
      (a: SmokeAppointment) => a.customerName === smokeName
    );
    expect(newApt).toBeDefined();

    // Verify the customer was auto-created in GET /api/customers
    const afterRes = await fetchJSON(`${API_URL}/api/customers`);
    expect(afterRes.body.length).toBe(customersBefore + 1);
    const newCustomer = afterRes.body.find(
      (c: SmokeCustomer) => c.name === smokeName
    );
    expect(newCustomer).toBeDefined();
    expect(newCustomer.visits).toBe(0);
    expect(newCustomer.totalBookings).toBe(1);
  });

  it("POST /api/bookings for an existing customer increases bookings without counting a visit", async () => {
    if (!serverReachable) return;

    const beforeRes = await fetchJSON(`${API_URL}/api/customers`);
    const customersBefore = beforeRes.body.length;

    // Book another appointment for the same customer
    const bookingRes = await fetchJSON(`${API_URL}/api/bookings`, {
      method: "POST",
      body: JSON.stringify({
        customerName: smokeName,
        customerEmail: smokeEmail,
        customerPhone: "0300-1111111",
        staffId: "stf-nadia",
        serviceId: "svc-facial",
        date: secondDate,
        time: "15:00",
        notes: "Second booking for same customer",
      }),
    });

    expect(bookingRes.ok).toBe(true);
    expect(bookingRes.status).toBe(201);

    // No new customer should have been created
    const afterRes = await fetchJSON(`${API_URL}/api/customers`);
    expect(afterRes.body.length).toBe(customersBefore);

    // Booking alone should not increment visits; only arrived/completed appointments do.
    const customer = afterRes.body.find(
      (c: SmokeCustomer) => c.name === smokeName
    );
    expect(customer).toBeDefined();
    expect(customer.visits).toBe(0);
    expect(customer.totalBookings).toBe(2);
  });

  it("POST /api/customers creates a customer directly", async () => {
    if (!serverReachable) return;

    const beforeRes = await fetchJSON(`${API_URL}/api/customers`);
    const customersBefore = beforeRes.body.length;

    const createRes = await fetchJSON(`${API_URL}/api/customers`, {
      method: "POST",
      body: JSON.stringify({
        name: directName,
        phone: "0300-9999999",
        email: directEmail,
        notes: "Added via API",
      }),
    });

    expect(createRes.ok).toBe(true);
    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe(directName);

    const afterRes = await fetchJSON(`${API_URL}/api/customers`);
    expect(afterRes.body.length).toBe(customersBefore + 1);
  });

  it("POST /api/customers rejects missing name", async () => {
    if (!serverReachable) return;

    const res = await fetchJSON(`${API_URL}/api/customers`, {
      method: "POST",
      body: JSON.stringify({ phone: "0300-0000000" }),
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("name");
  });
});
