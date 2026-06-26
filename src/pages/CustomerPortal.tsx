import { type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { Armchair, CalendarDays, Check, Clock, CreditCard, Menu, PlayCircle, Scissors, ShieldCheck, Sparkles, Star, UserRound, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const heroHighlights = [
  { title: "Expert Stylists", copy: "Trained Professionals", icon: UserRound },
  { title: "Premium Products", copy: "Quality You Can Trust", icon: ShieldCheck },
  { title: "On-Time Service", copy: "Your Time Matters", icon: Clock },
];

const heroStats = [
  { value: "5+", label: "Years of Excellence", icon: Scissors },
  { value: "2,500+", label: "Happy Clients", icon: Users },
  { value: "4.9", label: "Client Rating", icon: Star },
  { value: "15+", label: "Expert Stylists", icon: Armchair },
];

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "About Us", href: "#about-us" },
  { label: "Stylists", href: "#stylists" },
  { label: "Gallery", href: "#gallery" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const service = useMemo(() => services.find((item) => item.id === selectedService), [selectedService, services]);
  const artist = useMemo(() => staff.find((item) => item.id === selectedStaff), [selectedStaff, staff]);
  const activeStep = !selectedService ? 0 : !selectedStaff ? 1 : !selectedSlot ? 2 : 3;

  const scrollToSection = (href: string) => {
    window.setTimeout(() => {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    setShowBooking(false);
    setMobileNavOpen(false);
    scrollToSection(href);
  };

  const openBooking = () => {
    setShowBooking(true);
    setMobileNavOpen(false);
    scrollToSection("#services");
  };

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
    <main className="min-h-screen bg-[#f9f5ef] text-[#071d21]">
      <section id="home" className="relative isolate min-h-[820px] scroll-mt-28 overflow-hidden bg-[#f7f2ea] md:min-h-[760px]">
        <div
          className="absolute inset-0 bg-cover bg-[66%_center] md:bg-center"
          style={{ backgroundImage: "url('/Hero_sec.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(249,247,243,0.98)_0%,rgba(249,247,243,0.9)_27%,rgba(249,247,243,0.38)_50%,rgba(249,247,243,0)_72%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f9f5ef] via-[#f9f5ef]/70 to-transparent" />

        <header className="fixed inset-x-0 top-4 z-50 px-4 md:px-8">
          <div className="mx-auto flex max-w-[1660px] items-center justify-between rounded-full border border-white/55 bg-white/45 px-4 py-3 shadow-2xl shadow-[#092f31]/10 backdrop-blur-xl md:px-6">
            <Link href="/" className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#005a57] text-white shadow-lg shadow-[#005a57]/20 md:h-14 md:w-14">
                <Scissors className="h-6 w-6 md:h-7 md:w-7" />
              </span>
              <span>
                <span className="block text-lg font-black leading-none tracking-[-0.01em] text-[#071d21] md:text-2xl">Glamour Studio</span>
                <span className="mt-1 hidden text-sm font-medium text-[#526066] sm:block md:text-base">Premium Men&apos;s Salon</span>
              </span>
            </Link>

            <nav className="hidden items-center gap-10 text-sm font-semibold text-[#071d21] lg:flex">
              {navItems.map((item, index) => (
                <a key={item.href} href={item.href} onClick={(event) => handleNavClick(event, item.href)} className={index === 0 ? "border-b-2 border-[#005a57] pb-2 pt-2 text-[#005a57]" : "pb-2 pt-2 hover:text-[#005a57]"}>
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Button onClick={openBooking} className="hidden rounded-full border border-white/60 bg-[#005a57] px-6 py-6 text-white shadow-lg shadow-[#005a57]/20 hover:bg-[#004845] md:inline-flex">
                Book Appointment
                <CalendarDays className="h-5 w-5" />
              </Button>
              <Link href="/login?portal=admin" className="hidden text-sm font-semibold text-[#071d21] hover:text-[#005a57] md:block">Admin</Link>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d7cdc2] bg-white/70 text-[#071d21] lg:hidden"
                aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen((open) => !open)}
              >
                {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {mobileNavOpen && (
            <div className="mx-auto mt-3 max-w-[1660px] rounded-3xl border border-white/60 bg-white/90 p-3 shadow-2xl shadow-[#092f31]/10 backdrop-blur-xl lg:hidden">
              <nav className="grid gap-1 text-sm font-bold text-[#071d21]">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-2xl px-4 py-3 hover:bg-[#e5efed] hover:text-[#005a57]"
                    onClick={(event) => handleNavClick(event, item.href)}
                  >
                    {item.label}
                  </a>
                ))}
                <button
                  type="button"
                  className="mt-1 rounded-2xl bg-[#005a57] px-4 py-3 text-left text-white"
                  onClick={openBooking}
                >
                  Book Appointment
                </button>
              </nav>
            </div>
          )}
        </header>

        <div className="relative z-10 mx-auto flex max-w-[1660px] flex-col px-5 pb-10 pt-36 md:px-10 lg:pt-44 xl:px-16">
          <div className="max-w-[660px] animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e5efed] px-4 py-2 text-sm font-semibold text-[#005a57]">
              <Sparkles className="h-4 w-4" />
              Premium Men&apos;s Grooming
            </div>

            <h1 className="mt-6 text-6xl font-black leading-[0.95] tracking-[-0.02em] text-[#071d21] md:text-7xl lg:text-8xl">
              Sharp Style.
              <span className="block">Confident You.</span>
            </h1>

            <p className="mt-8 max-w-[620px] text-lg font-medium leading-8 text-[#526066] md:text-xl">
              Expert haircuts, beard grooming, and premium treatments crafted for the modern man.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Button onClick={openBooking} className="h-16 rounded-lg bg-[#005a57] px-8 text-base font-bold text-white shadow-xl shadow-[#005a57]/20 hover:bg-[#004845]">
                <CalendarDays className="h-5 w-5" />
                Book Your Appointment
              </Button>
              <Button variant="outline" onClick={() => {
                setShowBooking(false);
                scrollToSection("#services");
              }} className="h-16 rounded-lg border-[#d7cdc2] bg-white/80 px-8 text-base font-bold text-[#071d21] hover:bg-white">
                <PlayCircle className="h-5 w-5" />
                View Services
              </Button>
            </div>

            <div className="mt-10 grid max-w-[720px] grid-cols-1 gap-5 sm:grid-cols-3">
              {heroHighlights.map((item) => (
                <div key={item.title} className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#e5efed] text-[#005a57]">
                    <item.icon className="h-7 w-7" />
                  </span>
                  <span>
                    <span className="block text-base font-black text-[#071d21]">{item.title}</span>
                    <span className="mt-1 block text-sm font-medium text-[#526066]">{item.copy}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-4 rounded-xl border border-[#ded7cf] bg-white/85 p-5 shadow-2xl shadow-[#6c5b4d]/10 backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4 lg:p-7">
            {heroStats.map((item, index) => (
              <div key={item.label} className={`flex items-center gap-5 ${index > 0 ? "lg:border-l lg:border-[#ded7cf] lg:pl-12" : ""}`}>
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#6ea097] text-white">
                  <item.icon className="h-8 w-8" />
                </span>
                <span>
                  <span className="block text-3xl font-black text-[#071d21]">{item.value}</span>
                  <span className="block text-sm font-medium text-[#526066] md:text-base">{item.label}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showBooking ? (
      <section id="services" className="mx-auto max-w-7xl scroll-mt-28 px-6 py-8 lg:px-10">
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
            <section id="pricing" className="scroll-mt-28 rounded-lg border border-[#decfbd] bg-white p-5 shadow-sm">
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

            <section id="stylists" className="scroll-mt-28 rounded-lg border border-[#decfbd] bg-white p-5 shadow-sm">
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

          <aside id="contact" className="h-fit scroll-mt-28 rounded-lg border border-[#decfbd] bg-white p-5 shadow-sm">
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
        <section id="services" className="mx-auto max-w-7xl scroll-mt-28 px-6 py-12 lg:px-10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {["Live artist availability", "Deposit-protected booking", "Easy reschedule policy"].map((item) => (
              <div key={item} className="rounded-lg border border-[#decfbd] bg-white p-6 shadow-sm">
                <p className="font-serif text-2xl">{item}</p>
                <p className="mt-3 text-sm leading-6 text-[#6f6459]">A calm, premium salon flow built for real operating hours and real staff schedules.</p>
              </div>
            ))}
          </div>
          <div id="about-us" className="scroll-mt-28 pt-10">
            <div className="rounded-lg border border-[#decfbd] bg-white p-6 shadow-sm">
              <p className="font-serif text-2xl">About Glamour Studio</p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6f6459]">Premium grooming, precise appointments, and dependable salon service for clients who want a polished experience from booking to checkout.</p>
            </div>
          </div>
          <div id="stylists" className="scroll-mt-28 pt-10">
            <div className="rounded-lg border border-[#decfbd] bg-white p-6 shadow-sm">
              <p className="font-serif text-2xl">Stylists</p>
              <p className="mt-3 text-sm leading-6 text-[#6f6459]">Choose a specialist during booking and see live availability before confirming your visit.</p>
            </div>
          </div>
          <div id="gallery" className="scroll-mt-28 pt-10">
            <div className="rounded-lg border border-[#decfbd] bg-white p-6 shadow-sm">
              <p className="font-serif text-2xl">Gallery</p>
              <p className="mt-3 text-sm leading-6 text-[#6f6459]">A polished men&apos;s salon atmosphere with premium finishes, sharp cuts, and tailored grooming.</p>
            </div>
          </div>
          <div id="pricing" className="scroll-mt-28 pt-10">
            <div className="rounded-lg border border-[#decfbd] bg-white p-6 shadow-sm">
              <p className="font-serif text-2xl">Pricing</p>
              <p className="mt-3 text-sm leading-6 text-[#6f6459]">Service pricing and deposits are shown inside the appointment flow before you confirm.</p>
            </div>
          </div>
          <div id="contact" className="scroll-mt-28 pt-10">
            <div className="rounded-lg border border-[#decfbd] bg-white p-6 shadow-sm">
              <p className="font-serif text-2xl">Contact</p>
              <p className="mt-3 text-sm leading-6 text-[#6f6459]">Book online anytime, or use the client flow to choose the service, stylist, and appointment slot that suits you.</p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
