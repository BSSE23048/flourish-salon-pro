import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StaffPortal from "@/pages/StaffPortal";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    signOut: mocks.signOut,
    profile: { full_name: "Sara Ahmed", email: "staff@flourish.local" },
  }),
}));

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock("sonner", () => ({
  toast: mocks.toast,
}));

type MockResponse = Pick<Response, "ok" | "json">;

const apiResponse = (body: unknown, ok = true): MockResponse => ({
  ok,
  json: vi.fn().mockResolvedValue(body),
});

const schedule = (overrides = {}) => ({
  staff: { id: "stf-sara", name: "Sara Ahmed", title: "Senior Stylist", status: "online" },
  date: "2026-06-26",
  attendance: null,
  attendancePercentage: 82,
  commission: 12500,
  revenue: 84000,
  payroll: { baseSalary: 0, commission: 12500, deductions: 0, bonuses: 0, payable: 12500, paid: false, paidAt: null },
  appointments: [
    {
      id: "apt-1",
      customerName: "Amina Khan",
      customerEmail: "amina@example.com",
      serviceId: "svc-cut",
      startAt: "2026-06-26T10:00:00.000Z",
      endAt: "2026-06-26T11:00:00.000Z",
      status: "arrived",
    },
  ],
  ...overrides,
});

const attendance = (overrides = {}) => ({
  month: "2026-06",
  percentage: 82,
  rows: [{ id: "att-1", date: "2026-06-26", status: "present" }],
  leaveRequests: [],
  ...overrides,
});

const renderStaffPortal = async () => {
  render(React.createElement(StaffPortal));
  await screen.findByText("Amina Khan");
};

describe("StaffPortal dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads and renders the staff dashboard summary, leave request controls, and schedule", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(apiResponse(schedule()) as Response)
      .mockResolvedValueOnce(apiResponse(attendance()) as Response);

    await renderStaffPortal();

    expect(screen.getByRole("heading", { name: "Hello, Sara Ahmed" })).toBeInTheDocument();
    expect(screen.getByText("1 appointments")).toBeInTheDocument();
    expect(screen.getByText("Rs. 12,500")).toBeInTheDocument();
    expect(screen.getAllByText("82%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Not marked")).toBeInTheDocument();
    expect(screen.getByText("amina@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("arrived")).toHaveLength(2);
    fireEvent.click(screen.getByRole("tab", { name: "Security" }));
    expect(screen.getByRole("heading", { name: "Request Leave" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("http://localhost:4000/api/staff/me/schedule?date="), {
      headers: { "x-role": "staff", "x-staff-id": "stf-sara" },
    });
  });

  it("submits leave requests to admin", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(apiResponse(schedule()) as Response)
      .mockResolvedValueOnce(apiResponse(attendance()) as Response)
      .mockResolvedValueOnce(apiResponse({ id: "leave-1", status: "pending" }) as Response)
      .mockResolvedValueOnce(apiResponse(schedule()) as Response)
      .mockResolvedValueOnce(apiResponse(attendance()) as Response);

    await renderStaffPortal();
    fireEvent.click(screen.getByRole("tab", { name: "Security" }));
    fireEvent.change(screen.getByPlaceholderText("Reason"), { target: { value: "Family commitment" } });
    fireEvent.click(screen.getByRole("button", { name: /send request/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("http://localhost:4000/api/staff/me/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "staff", "x-staff-id": "stf-sara" },
        body: expect.stringContaining("Family commitment"),
      });
    });
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith("Leave request sent to admin"));
  });

  it("shows an error toast when leave request cannot reach the API", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(apiResponse(schedule()) as Response)
      .mockResolvedValueOnce(apiResponse(attendance()) as Response)
      .mockRejectedValueOnce(new Error("Failed to fetch"));

    await renderStaffPortal();
    fireEvent.click(screen.getByRole("tab", { name: "Security" }));
    fireEvent.click(screen.getByRole("button", { name: /send request/i }));

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Failed to fetch"));
    expect(mocks.toast.success).not.toHaveBeenCalledWith("Leave request sent to admin");
  });

  it("surfaces API errors when an appointment status update fails", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(apiResponse(schedule()) as Response)
      .mockResolvedValueOnce(apiResponse(attendance()) as Response)
      .mockResolvedValueOnce(apiResponse({ error: "Appointment is already closed" }, false) as Response);

    await renderStaffPortal();
    fireEvent.click(screen.getByRole("button", { name: /completed/i }));

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Appointment is already closed"));
    expect(fetch).toHaveBeenCalledWith("http://localhost:4000/api/appointments/apt-1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-role": "staff", "x-staff-id": "stf-sara" },
      body: JSON.stringify({ status: "completed" }),
    });
  });
});
