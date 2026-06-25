import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { CalendarDays, Check, Clock, CreditCard, Scissors, Sparkles, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Service = {
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  price: number;
  deposit: number;
  description: string;
};

type StaffMember = {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  bio: string;
};

type Slot = {
  time: string;
  label: string;
  startAt: string;
  endAt: string;
  available: boolean;
  blockedBy: "cutoff" | "appointment" | "hold" | null;
};

const steps = [
  { key: "service", label: "Service", icon: Scissors },
  { key: "staff", label: "Artist", icon: Users },
  { key: "time", label: "Time", icon: CalendarDays },
  { key: "confirm", label: "Confirm", icon: CreditCard },
];

function money(value: number) {
  return `Rs. ${value.toLocaleString()}`;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function CustomerPortal() {
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(todayInputValue());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [holdId, setHoldId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  const service = useMemo(() => services.find((item) => item.id === selectedService), [selectedService, services]);
  const artist = useMemo(() => staff.find((item) => item.id === selectedStaff), [selectedStaff, staff]);
  const activeStep = !selectedService ? 0 : !selectedStaff ? 1 : !selectedSlot ? 2 : 3;

  const fetchAvailability = useCallback(async () => {
    if (!selectedService || !selectedStaff || !selectedDate) return;
    const params = new URLSearchParams({ serviceId: selectedService, staffId: selectedStaff, date: selectedDate });
    const res = await fetch(`${API_URL}/api/availability?${params}`);
    const data = await res.json();
    setSlots(data.slots || []);
  }, [selectedDate, selectedService, selectedStaff]);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/services`).then((res) => res.json()),
      fetch(`${API_URL}/api/staff`).then((res) => res.json()),
    ])
      .then(([serviceData, staffData]) => {
        setServices(serviceData);
        setStaff(staffData);
      })
      .catch(() => toast.error("Could not load salon menu. Check the API server."));
  }, []);

  useEffect(() => {
    const socket: Socket = io(API_URL);
    socket.on("staff:update", () => {
      fetch(`${API_URL}/api/staff`)
        .then((res) => res.json())
        .then((staffData: StaffMember[]) => {
          setStaff(staffData);
          if (selectedStaff && !staffData.some((item) => item.id === selectedStaff)) {
            setSelectedStaff("");
            setSlots([]);
            toast.info("That artist is offline today. Please choose another artist.");
          }
        });
    });
    return () => {
      socket.disconnect();
    };
  }, [selectedStaff]);

  useEffect(() => {
    fetchAvailability();
    setSelectedSlot(null);
    setHoldId(null);
  }, [fetchAvailability, selectedService, selectedStaff, selectedDate]);

  useEffect(() => {
    if (!selectedStaff || !selectedDate) return;
    const socket: Socket = io(API_URL);
    socket.emit("schedule:join", { staffId: selectedStaff, date: selectedDate });
    socket.on("schedule:update", fetchAvailability);
    socket.on("waitlist:notify", () => toast.success("A waitlisted client was notified for an opened slot."));
    return () => {
      socket.disconnect();
    };
  }, [fetchAvailability, selectedStaff, selectedDate, selectedService]);

  const holdSlot = async (slot: Slot) => {
    if (!slot.available || !service || !artist) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/holds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          time: slot.time,
          staffId: artist.id,
          serviceId: service.id,
          customerEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not hold that slot");
      setSelectedSlot(slot);
      setHoldId(data.id);
      toast.success("Slot held for 7 minutes while you confirm.");
      await fetchAvailability();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Slot is unavailable");
      await fetchAvailability();
    } finally {
      setLoading(false);
    }
  };

  const joinWaitlist = async (slot: Slot) => {
    if (!service || !artist) return;
    if (!customerEmail || !customerName) {
      toast.error("Add your name and email before joining the waitlist.");
      return;
    }
    const res = await fetch(`${API_URL}/api/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        customerEmail,
        staffId: artist.id,
        serviceId: service.id,
        startAt: slot.startAt,
      }),
    });
    if (res.ok) toast.success("You are on the waitlist. We will notify you if it opens.");
  };

  const confirmBooking = async () => {
    if (!service || !artist || !selectedSlot) return;
    if (!customerName || !customerEmail) {
      toast.error("Name and email are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdId,
          customerName,
          customerEmail,
          staffId: artist.id,
          serviceId: service.id,
          date: selectedDate,
          time: selectedSlot.time,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create booking");
      toast.success(`Booked ${service.name} with ${artist.name}. Deposit checkout is ready.`);
      setSelectedSlot(null);
      setHoldId(null);
      await fetchAvailability();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f2ea] text-[#231f1b]">
      <section className="border-b border-[#decfbd] bg-[#fbf8f2]/90 backdrop-blur">
        <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <Link href="/" className="font-serif text-2xl font-semibold">Flourish</Link>
          <nav className="flex items-center gap-4 text-sm text-[#6f6459]">
            <Link href="/login?portal=staff" className="hover:text-[#231f1b]">Staff Login</Link>
            <Link href="/login?portal=admin" className="hover:text-[#231f1b]">Admin Portal</Link>
          </nav>
        </header>
        <div className="mx-auto grid min-h-[420px] max-w-7xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
          <div className="flex flex-col justify-center">
            <Badge className="mb-5 w-fit bg-[#2f4f3f] text-white hover:bg-[#2f4f3f]">Premium salon booking</Badge>
            <h1 className="font-serif text-5xl font-semibold leading-tight text-[#231f1b] md:text-6xl">
              Flourish, booked beautifully.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#6f6459]">
              Choose your service, artist, and live available time. Holds, deposits, waitlist, and cutoff rules are enforced before your appointment is confirmed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-[#5c5045]">
              <Button onClick={() => setShowBooking(true)} className="bg-[#2f4f3f] px-6 hover:bg-[#263f33]">Book an Appointment</Button>
              <span className="rounded-full border border-[#decfbd] bg-white/70 px-4 py-2">10 AM to 2 AM</span>
              <span className="rounded-full border border-[#decfbd] bg-white/70 px-4 py-2">2-hour booking cutoff</span>
              <span className="rounded-full border border-[#decfbd] bg-white/70 px-4 py-2">4-hour cancellation policy</span>
            </div>
          </div>
          <div className="relative min-h-[320px] overflow-hidden rounded-lg border border-[#decfbd] bg-[#231f1b] p-8 text-white shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(190,132,84,0.35),transparent_35%),linear-gradient(135deg,rgba(47,79,63,0.55),rgba(35,31,27,0.95))]" />
            <div className="relative flex h-full flex-col justify-between">
              <Sparkles className="h-8 w-8 text-[#d6a76c]" />
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[#d6c2a6]">Today’s mood</p>
                <h2 className="mt-3 font-serif text-4xl">Quiet luxury, precise timing.</h2>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showBooking ? (
      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.key} className={`rounded-lg border px-4 py-3 ${index <= activeStep ? "border-[#b8794d] bg-white" : "border-[#decfbd] bg-white/50"}`}>
              <step.icon className="mb-2 h-4 w-4 text-[#b8794d]" />
              <p className="text-sm font-medium">{step.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-lg border border-[#decfbd] bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-serif text-2xl">Select Service</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {services.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedService(item.id)}
                    className={`rounded-lg border p-4 text-left transition hover:border-[#b8794d] ${selectedService === item.id ? "border-[#b8794d] bg-[#fbf8f2]" : "border-[#decfbd]"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="mt-1 text-sm text-[#6f6459]">{item.description}</p>
                      </div>
                      {selectedService === item.id && <Check className="h-5 w-5 text-[#2f4f3f]" />}
                    </div>
                    <div className="mt-4 flex gap-2 text-xs text-[#6f6459]">
                      <span>{item.durationMinutes} min</span>
                      <span>{money(item.price)}</span>
                      <span>{money(item.deposit)} deposit</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[#decfbd] bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-serif text-2xl">Select Staff</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {staff.map((item) => {
                  const canDoService = !service || item.specialties.includes(service.category);
                  return (
                    <button
                      key={item.id}
                      disabled={!canDoService}
                      onClick={() => setSelectedStaff(item.id)}
                      className={`rounded-lg border p-4 text-left transition hover:border-[#b8794d] disabled:cursor-not-allowed disabled:opacity-40 ${selectedStaff === item.id ? "border-[#b8794d] bg-[#fbf8f2]" : "border-[#decfbd]"}`}
                    >
                      <UserRound className="mb-3 h-5 w-5 text-[#b8794d]" />
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-[#6f6459]">{item.title}</p>
                      <p className="mt-3 text-xs leading-5 text-[#6f6459]">{item.bio}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-[#decfbd] bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="font-serif text-2xl">Select Date & Time</h2>
                <Input type="date" min={todayInputValue()} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="max-w-[220px]" />
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
                {slots.map((slot) => (
                  <button
                    key={slot.startAt}
                    onClick={() => slot.available ? holdSlot(slot) : joinWaitlist(slot)}
                    disabled={!selectedService || !selectedStaff || loading}
                    className={`min-h-[58px] rounded-lg border px-3 py-2 text-sm transition ${selectedSlot?.startAt === slot.startAt ? "border-[#2f4f3f] bg-[#2f4f3f] text-white" : slot.available ? "border-[#decfbd] bg-[#fbf8f2] hover:border-[#b8794d]" : "border-[#eadfd1] bg-[#f4eee6] text-[#9b8b7d]"}`}
                  >
                    <span className="block font-medium">{slot.label}</span>
                    <span className="text-xs">{slot.available ? "Available" : slot.blockedBy === "cutoff" ? "Too soon" : "Waitlist"}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-lg border border-[#decfbd] bg-white p-5 shadow-sm">
            <h2 className="font-serif text-2xl">Confirm</h2>
            <div className="mt-4 space-y-3 text-sm">
              <p><span className="text-[#6f6459]">Service:</span> {service?.name || "Choose service"}</p>
              <p><span className="text-[#6f6459]">Artist:</span> {artist?.name || "Choose staff"}</p>
              <p><span className="text-[#6f6459]">Time:</span> {selectedSlot ? `${selectedSlot.label} on ${selectedDate}` : "Choose slot"}</p>
              <p className="flex items-center gap-2 rounded-lg bg-[#fbf8f2] p-3 text-[#5c5045]">
                <Clock className="h-4 w-4" />
                Deposit protects against no-shows. Stripe checkout is stubbed for now.
              </p>
            </div>
            <div className="mt-5 space-y-3">
              <Input placeholder="Full name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              <Input type="email" placeholder="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
              <Button className="w-full bg-[#2f4f3f] hover:bg-[#263f33]" disabled={!selectedSlot || loading} onClick={confirmBooking}>
                Confirm & Pay Deposit
              </Button>
            </div>
          </aside>
        </div>
      </section>
      ) : (
        <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {["Live artist availability", "Deposit-protected booking", "Easy reschedule policy"].map((item) => (
              <div key={item} className="rounded-lg border border-[#decfbd] bg-white p-6 shadow-sm">
                <p className="font-serif text-2xl">{item}</p>
                <p className="mt-3 text-sm leading-6 text-[#6f6459]">A calm, premium salon flow built for real operating hours and real staff schedules.</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
