import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CustomerPortal from "@/pages/CustomerPortal";

const mocks = vi.hoisted(() => ({
  session: null as null | { user: { email: string; user_metadata?: Record<string, string> } },
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("framer-motion", () => {
  const cleanProps = (props: Record<string, unknown>) => {
    const blocked = new Set([
      "animate",
      "drag",
      "exit",
      "initial",
      "layout",
      "transition",
      "variants",
      "whileHover",
      "whileTap",
    ]);
    return Object.fromEntries(Object.entries(props).filter(([key]) => !blocked.has(key)));
  };

  const component = (tag: keyof JSX.IntrinsicElements) => React.forwardRef<HTMLElement, Record<string, unknown>>(
    ({ children, ...props }, ref) => React.createElement(tag, { ...cleanProps(props), ref }, children),
  );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: new Proxy({}, { get: (_target, tag: string) => component(tag as keyof JSX.IntrinsicElements) }),
    useInView: () => true,
    useScroll: () => ({ scrollYProgress: 0 }),
    useTransform: (_value: unknown, _input: unknown, output: unknown[]) => output[0],
    useMotionValueEvent: vi.fn(),
  };
});

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: mocks.session } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOAuth: mocks.signInWithOAuth,
      signOut: mocks.signOut,
    },
  },
}));

vi.mock("sonner", () => ({
  toast: mocks.toast,
}));

vi.mock("@/components/Carousel", () => ({
  default: ({ items, onBook }: { items: Array<{ id: string; name: string; category: string }>; onBook: () => void }) => (
    <div data-testid="service-carousel">
      {items.map((item) => (
        <article key={item.id}>
          <h3>{item.name}</h3>
          <p>{item.category}</p>
          <button type="button" onClick={onBook}>Book {item.name}</button>
        </article>
      ))}
    </div>
  ),
}));

vi.mock("@/components/StickyScrollGallery", () => ({
  default: () => <div data-testid="sticky-gallery" />,
}));

type MockResponse = Pick<Response, "ok" | "json">;

const apiResponse = (body: unknown, ok = true): MockResponse => ({
  ok,
  json: vi.fn().mockResolvedValue(body),
});

const services = [
  {
    id: "svc-haircut",
    name: "Signature Haircut",
    category: "Hair",
    durationMinutes: 30,
    price: 3500,
    deposit: 1000,
    description: "Precision cut",
  },
  {
    id: "svc-beard",
    name: "Executive Beard Trim",
    category: "Beard",
    durationMinutes: 20,
    price: 1800,
    deposit: 0,
    description: "Beard shaping",
  },
];

const staff = [
  {
    id: "stf-sara",
    name: "Sara Ahmed",
    title: "Senior Stylist",
    specialties: ["Hair"],
    bio: "Sharp fades and styling.",
  },
  {
    id: "stf-ali",
    name: "Ali Khan",
    title: "Beard Specialist",
    specialties: ["Beard"],
    bio: "Clean beard lines.",
  },
];

const mockInitialFetches = () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(apiResponse(services) as Response)
    .mockResolvedValueOnce(apiResponse(staff) as Response);
};

describe("CustomerPortal smoke and regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session = null;
    mocks.signInWithOAuth.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    Element.prototype.scrollIntoView = vi.fn();
    window.localStorage.clear();
    global.fetch = vi.fn();
    mockInitialFetches();
  });

  afterEach(() => {
    cleanup();
  });

  it("smoke renders public service content from the API", async () => {
    render(<CustomerPortal />);

    expect(await screen.findByText("Signature Haircut")).toBeInTheDocument();
    expect(screen.getByText("Executive Beard Trim")).toBeInTheDocument();
    expect(screen.getByTestId("service-carousel")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("http://localhost:4000/api/services");
    expect(fetch).toHaveBeenCalledWith("http://localhost:4000/api/staff");
  });

  it("regression gates booking behind Supabase login when the customer is signed out", async () => {
    render(<CustomerPortal />);

    await screen.findByText("Signature Haircut");
    fireEvent.click(screen.getAllByRole("button", { name: /book appointment/i })[0]);

    expect(await screen.findByRole("heading", { name: /client login/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /login with google/i }));

    await waitFor(() => {
      expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
    });
    expect(window.localStorage.getItem("flourish-pending-booking")).toBe("true");
  });

  it("regression filters booking services by selected category for signed-in customers", async () => {
    mocks.session = { user: { email: "client@example.com", user_metadata: { full_name: "Client User" } } };

    render(<CustomerPortal />);

    await screen.findByText("Signature Haircut");
    fireEvent.click(screen.getAllByRole("button", { name: /book appointment/i })[0]);

    const booking = await screen.findByRole("heading", { name: /choose a service/i });
    const bookingSection = booking.closest("div")?.parentElement as HTMLElement;

    expect(within(bookingSection).getByText("Signature Haircut")).toBeInTheDocument();
    expect(within(bookingSection).getByText("Executive Beard Trim")).toBeInTheDocument();

    fireEvent.click(within(bookingSection).getByRole("button", { name: "Beard" }));

    expect(within(bookingSection).getByText("Executive Beard Trim")).toBeInTheDocument();
    expect(within(bookingSection).queryByText("Signature Haircut")).not.toBeInTheDocument();
  });
});
