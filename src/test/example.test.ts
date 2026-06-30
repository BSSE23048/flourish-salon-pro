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

vi.mock("sonner", () => ({
  toast: mocks.toast,
}));

vi.mock("@/lib/api", () => ({
  API_UNAVAILABLE_MESSAGE: "Could not reach the API server at http://localhost:4000.",
  API_URL: "http://localhost:4000",
  getAuthHeaders: vi.fn(async (extra = {}) => ({ ...extra, Authorization: "Bearer flourish-demo-staff" })),
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
  payroll: { payable: 12500, paid: false },
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
    vi.mocked(fetch).mockResolvedValueOnce(apiResponse(schedule()) as Response);

    await renderStaffPortal();

    expect(screen.getByRole("heading", { name: "Hello, Sara Ahmed" })).toBeInTheDocument();
    expect(screen.getByText("1 appointments")).toBeInTheDocument();
    expect(screen.getByText("Rs. 12,500")).toBeInTheDocument();
    expect(screen.getAllByText("82%")).toHaveLength(2);
    expect(screen.getByText("Not marked today")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Request Leave" })).toBeInTheDocument();
    expect(screen.getByText("amina@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("arrived")).toHaveLength(2);
    expect(fetch).toHaveBeenCalledWith("http://localhost:4000/api/staff/me/schedule", {
      headers: { Authorization: "Bearer flourish-demo-staff" },
    });
  });

  it("submits leave requests to admin", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(apiResponse(schedule()) as Response)
      .mockResolvedValueOnce(apiResponse({ id: "leave-1", status: "pending" }) as Response);

    await renderStaffPortal();
    fireEvent.change(screen.getByPlaceholderText("Reason"), { target: { value: "Family commitment" } });
    fireEvent.click(screen.getByRole("button", { name: /send request/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("http://localhost:4000/api/staff/me/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer flourish-demo-staff" },
        body: expect.stringContaining("Family commitment"),
      });
    });
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith("Leave request sent to admin"));
  });

  it("shows an error toast when leave request cannot reach the API", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(apiResponse(schedule()) as Response)
      .mockRejectedValueOnce(new Error("Failed to fetch"));

    await renderStaffPortal();
    fireEvent.click(screen.getByRole("button", { name: /send request/i }));

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Failed to fetch"));
    expect(mocks.toast.success).not.toHaveBeenCalledWith("Leave request sent to admin");
  });

  it("surfaces API errors when an appointment status update fails", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(apiResponse(schedule()) as Response)
      .mockResolvedValueOnce(apiResponse({ error: "Appointment is already closed" }, false) as Response);

    await renderStaffPortal();
    fireEvent.click(screen.getByRole("button", { name: /completed/i }));

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Appointment is already closed"));
    expect(fetch).toHaveBeenCalledWith("http://localhost:4000/api/appointments/apt-1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: "Bearer flourish-demo-staff" },
      body: JSON.stringify({ status: "completed" }),
    });
  });
});
