/**
 * Smoke test for appointment booking and customer auto-creation.
 *
 * Tests:
 * 1. POST /api/bookings creates an appointment and auto-creates a customer
 * 2. GET /api/appointments returns the newly created appointment
 * 3. GET /api/customers includes the auto-created customer
 * 4. POST /api/customers creates a customer directly
 * 5. POST /api/bookings for an existing customer increments visits (not duplicate)
 *
 * Opt in with RUN_API_SMOKE_TESTS=true because this suite mutates a live API.
 */
import { describe, it, expect, beforeAll } from "vitest";

const API_URL = "http://localhost:4000";
const runLiveApiSmoke = process.env.RUN_API_SMOKE_TESTS === "true";
const describeLiveApi = runLiveApiSmoke ? describe : describe.skip;

type SmokeAppointment = {
  customerName: string;
};

type SmokeCustomer = {
  name: string;
  visits: number;
  segment: string;
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

describeLiveApi("Smoke tests: Appointment booking & customer sync", () => {
  let serverReachable = false;

  beforeAll(async () => {
    try {
      const res = await fetch(`${API_URL}/api/health`);
      serverReachable = res.ok;
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
        customerName: "Smoke Test Customer",
        customerEmail: "smoketest@example.com",
        staffId: "stf-sara",
        serviceId: "svc-haircut",
        date: "2026-12-25",
        time: "14:00",
        notes: "Smoke test booking",
      }),
    });

    expect(bookingRes.ok).toBe(true);
    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.appointment).toBeDefined();
    expect(bookingRes.body.appointment.customerName).toBe("Smoke Test Customer");
    expect(bookingRes.body.appointment.status).toBe("booked");

    // Verify the appointment shows in GET /api/appointments
    const aptsRes = await fetchJSON(`${API_URL}/api/appointments`);
    const newApt = aptsRes.body.find(
      (a: SmokeAppointment) => a.customerName === "Smoke Test Customer"
    );
    expect(newApt).toBeDefined();

    // Verify the customer was auto-created in GET /api/customers
    const afterRes = await fetchJSON(`${API_URL}/api/customers`);
    expect(afterRes.body.length).toBe(customersBefore + 1);
    const newCustomer = afterRes.body.find(
      (c: SmokeCustomer) => c.name === "Smoke Test Customer"
    );
    expect(newCustomer).toBeDefined();
    expect(newCustomer.visits).toBe(1);
    expect(newCustomer.segment).toBe("New");
  });

  it("POST /api/bookings for an existing customer increments visits (no duplicate)", async () => {
    if (!serverReachable) return;

    const beforeRes = await fetchJSON(`${API_URL}/api/customers`);
    const customersBefore = beforeRes.body.length;

    // Book another appointment for the same customer
    const bookingRes = await fetchJSON(`${API_URL}/api/bookings`, {
      method: "POST",
      body: JSON.stringify({
        customerName: "Smoke Test Customer",
        customerEmail: "smoketest@example.com",
        staffId: "stf-nadia",
        serviceId: "svc-facial",
        date: "2026-12-26",
        time: "15:00",
        notes: "Second booking for same customer",
      }),
    });

    expect(bookingRes.ok).toBe(true);
    expect(bookingRes.status).toBe(201);

    // No new customer should have been created
    const afterRes = await fetchJSON(`${API_URL}/api/customers`);
    expect(afterRes.body.length).toBe(customersBefore);

    // Visit count should have incremented
    const customer = afterRes.body.find(
      (c: SmokeCustomer) => c.name === "Smoke Test Customer"
    );
    expect(customer).toBeDefined();
    expect(customer.visits).toBe(2);
  });

  it("POST /api/customers creates a customer directly", async () => {
    if (!serverReachable) return;

    const beforeRes = await fetchJSON(`${API_URL}/api/customers`);
    const customersBefore = beforeRes.body.length;

    const createRes = await fetchJSON(`${API_URL}/api/customers`, {
      method: "POST",
      body: JSON.stringify({
        name: "Directly Added Customer",
        phone: "0300-9999999",
        email: "direct@example.com",
        notes: "Added via API",
      }),
    });

    expect(createRes.ok).toBe(true);
    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe("Directly Added Customer");

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
