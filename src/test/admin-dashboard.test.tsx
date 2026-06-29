import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "@/pages/Dashboard";

const mocks = vi.hoisted(() => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div data-testid="bar" />,
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

vi.mock("sonner", () => ({
  toast: mocks.toast,
}));

type MockResponse = Pick<Response, "ok" | "json">;

const apiResponse = (body: unknown, ok = true): MockResponse => ({
  ok,
  json: vi.fn().mockResolvedValue(body),
});

const today = () => new Date().toISOString().slice(0, 10);

const services = [
  { id: "svc-haircut", name: "Signature Haircut", price: 3500 },
  { id: "svc-beard", name: "Executive Beard Trim", price: 1800 },
];

const staff = [
  { id: "stf-sara", name: "Sara Ahmed" },
  { id: "stf-ali", name: "Ali Khan" },
];

const appointments = [
  {
    id: "apt-1",
    customerName: "Amina Khan",
    customerEmail: "amina@example.com",
    staffId: "stf-sara",
    serviceId: "svc-haircut",
    startAt: `${today()}T10:00:00.000Z`,
    endAt: `${today()}T10:30:00.000Z`,
    status: "booked",
  },
];

const metrics = {
  appointmentsToday: 1,
  revenueToday: 3500,
  totalCustomers: 2,
  lowStockCount: 1,
};

const invoices = [
  {
    id: "INV-1",
    date: today(),
    customer: "Amina Khan",
    status: "Paid",
    total: 3500,
    createdAt: `${today()}T09:00:00.000Z`,
  },
];

const payroll = {
  summary: {
    netRevenue: 3500,
    invoiceCount: 1,
  },
};

const mockDashboardLoad = () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(apiResponse(appointments) as Response)
    .mockResolvedValueOnce(apiResponse(services) as Response)
    .mockResolvedValueOnce(apiResponse(staff) as Response)
    .mockResolvedValueOnce(apiResponse(metrics) as Response)
    .mockResolvedValueOnce(apiResponse(invoices) as Response)
    .mockResolvedValueOnce(apiResponse(payroll) as Response);
};

describe("Admin dashboard smoke and regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockDashboardLoad();
  });

  afterEach(() => {
    cleanup();
  });

  it("smoke renders live dashboard metrics, activity, and today's appointments", async () => {
    render(<Dashboard />);

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(await screen.findAllByText("Today's Appointments")).toHaveLength(2);
    expect(screen.getAllByText("Rs. 3,500")).toHaveLength(2);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1 inventory alerts")).toBeInTheDocument();
    expect(screen.getByText("Amina Khan")).toBeInTheDocument();
    expect(screen.getByText("Signature Haircut")).toBeInTheDocument();
    expect(screen.getByText("Sara Ahmed")).toBeInTheDocument();
    expect(screen.getByText(/invoice INV-1 generated/i)).toBeInTheDocument();

    expect(fetch).toHaveBeenCalledWith("http://localhost:4000/api/metrics", { headers: { "x-role": "admin" } });
    expect(fetch).toHaveBeenCalledWith("http://localhost:4000/api/payroll?month=" + today().slice(0, 7), { headers: { "x-role": "admin" } });
  });

  it("regression creates appointments using API service and staff IDs", async () => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch)
      .mockResolvedValueOnce(apiResponse(appointments) as Response)
      .mockResolvedValueOnce(apiResponse(services) as Response)
      .mockResolvedValueOnce(apiResponse(staff) as Response)
      .mockResolvedValueOnce(apiResponse(metrics) as Response)
      .mockResolvedValueOnce(apiResponse(invoices) as Response)
      .mockResolvedValueOnce(apiResponse(payroll) as Response)
      .mockResolvedValueOnce(apiResponse({ id: "apt-2" }) as Response)
      .mockResolvedValueOnce(apiResponse(appointments) as Response)
      .mockResolvedValueOnce(apiResponse(services) as Response)
      .mockResolvedValueOnce(apiResponse(staff) as Response)
      .mockResolvedValueOnce(apiResponse(metrics) as Response)
      .mockResolvedValueOnce(apiResponse(invoices) as Response)
      .mockResolvedValueOnce(apiResponse(payroll) as Response);

    render(<Dashboard />);

    await screen.findByText("Signature Haircut");
    fireEvent.click(screen.getByRole("button", { name: /add appointment/i }));
    fireEvent.change(screen.getByPlaceholderText("Customer name"), { target: { value: "New Client" } });
    fireEvent.change(screen.getByPlaceholderText("Customer email"), { target: { value: "new@example.com" } });
    fireEvent.change(document.querySelector('input[type="time"]') as HTMLInputElement, { target: { value: "14:30" } });
    fireEvent.click(screen.getByRole("button", { name: /book appointment/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("http://localhost:4000/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify({
          customerName: "New Client",
          customerEmail: "new@example.com",
          serviceId: "svc-haircut",
          staffId: "stf-sara",
          date: today(),
          time: "14:30",
        }),
      });
    });
    expect(mocks.toast.success).toHaveBeenCalledWith("Appointment booked for New Client");
  });
});
