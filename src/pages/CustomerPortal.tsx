import { type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import type { Session } from "@supabase/supabase-js";
import { Armchair, CalendarDays, Check, Clock, CreditCard, MapPin, Menu, Phone, PlayCircle, Scissors, ShieldCheck, Sparkles, Star, UserRound, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
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
  imageUrl?: string;
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

const featureCards = [
  {
    title: "Live artist availability",
    copy: "See real appointment openings before you pick a stylist, with offline team members removed automatically.",
    icon: Users,
  },
  {
    title: "Deposit-protected booking",
    copy: "Reserve premium slots with a clear deposit step that protects your time and the stylist's chair.",
    icon: ShieldCheck,
  },
  {
    title: "Easy reschedule policy",
    copy: "Built-in cutoff windows make changes predictable, calm, and fair for clients and the studio.",
    icon: Clock,
  },
];

const stylistCards = [
  { name: "Sara Ahmed", title: "Creative Director", specialty: "Sharp fades and textured executive cuts" },
  { name: "Nadia Hussain", title: "Skin & Grooming Lead", specialty: "Facials, polish, and camera-ready finishes" },
  { name: "Hina Rashid", title: "Detail Specialist", specialty: "Beard lines, finishing, and event grooming" },
];

const galleryCards = [
  "Clean taper fade",
  "Classic beard sculpt",
  "Executive texture",
  "Premium grooming suite",
];

function money(value: number) {
  return `Rs. ${value.toLocaleString()}`;
}

function serviceCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    All: "All services",
    Hair: "Haircut",
  };

  return labels[category] || category;
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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeServiceCategory, setActiveServiceCategory] = useState("All");

  const service = useMemo(() => services.find((item) => item.id === selectedService), [selectedService, services]);
  const artist = useMemo(() => staff.find((item) => item.id === selectedStaff), [selectedStaff, staff]);
  const serviceCategories = useMemo(() => {
    const categories = Array.from(new Set(services.map((item) => item.category).filter(Boolean))).sort();
    return ["All", ...categories];
  }, [services]);
  const visibleServices = useMemo(() => {
    if (activeServiceCategory === "All") return services;
    return services.filter((item) => item.category === activeServiceCategory);
  }, [activeServiceCategory, services]);
  const activeStep = !selectedService ? 0 : !selectedStaff ? 1 : !selectedSlot ? 2 : 3;

  useEffect(() => {
    if (activeServiceCategory !== "All" && !serviceCategories.includes(activeServiceCategory)) {
      setActiveServiceCategory("All");
    }
  }, [activeServiceCategory, serviceCategories]);

  const renderServiceFilters = () => (
    <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-2">
      {serviceCategories.map((category) => {
        const active = activeServiceCategory === category;

        return (
          <button
            key={category}
            type="button"
            onClick={() => setActiveServiceCategory(category)}
            className={`shrink-0 rounded-full border px-5 py-2 text-sm font-black transition ${
              active
                ? "border-[#005a57] bg-[#005a57] text-white shadow-lg shadow-[#005a57]/20"
                : "border-[#decfbd] bg-white/85 text-[#071d21] hover:border-[#005a57] hover:text-[#005a57]"
            }`}
          >
            {serviceCategoryLabel(category)}
          </button>
        );
      })}
    </div>
  );

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

  const showBookingFlow = () => {
    setShowBooking(true);
    setMobileNavOpen(false);
    scrollToSection("#services");
  };

  const openBooking = () => {
    if (!authReady) return;
    if (!session) {
      setAuthModalOpen(true);
      setMobileNavOpen(false);
      return;
    }
    showBookingFlow();
  };

  const signInWithProvider = async (provider: "google" | "apple") => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("glamour-pending-booking", "true");
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });

    if (error) {
      toast.error(error.message);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    setSession(null);
    setShowBooking(false);
    toast.success("Signed out");
  };

  const userInitials = session?.user.user_metadata?.full_name
    ? String(session.user.user_metadata.full_name).split(" ").map((part) => part[0]).join("").slice(0, 2)
    : session?.user.email?.slice(0, 2).toUpperCase() || "GS";

  const fetchAvailability = useCallback(async () => {
    if (!selectedService || !selectedStaff || !selectedDate) return;
    const params = new URLSearchParams({ serviceId: selectedService, staffId: selectedStaff, date: selectedDate });
    const res = await fetch(`${API_URL}/api/availability?${params}`);
    const data = await res.json();
    setSlots(data.slots || []);
  }, [selectedDate, selectedService, selectedStaff]);

  useEffect(() => {
    const openPendingBooking = () => {
      setShowBooking(true);
      setMobileNavOpen(false);
      window.setTimeout(() => {
        document.querySelector("#services")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    };

    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
        setAuthReady(true);

        if (data.session && window.localStorage.getItem("glamour-pending-booking") === "true") {
          window.localStorage.removeItem("glamour-pending-booking");
          openPendingBooking();
        }
      })
      .catch(() => setAuthReady(true));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession && window.localStorage.getItem("glamour-pending-booking") === "true") {
        window.localStorage.removeItem("glamour-pending-booking");
        setAuthModalOpen(false);
        openPendingBooking();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    if (session?.user.email && !customerEmail) {
      setCustomerEmail(session.user.email);
    }
  }, [customerEmail, session]);

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
      <section id="home" className="relative min-h-[820px] scroll-mt-28 overflow-hidden bg-[#f7f2ea] md:min-h-[760px]">
        <div
          className="absolute inset-0 bg-cover bg-[66%_center] md:bg-center"
          style={{ backgroundImage: "url('/Hero_sec.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(249,247,243,0.98)_0%,rgba(249,247,243,0.9)_27%,rgba(249,247,243,0.38)_50%,rgba(249,247,243,0)_72%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f9f5ef] via-[#f9f5ef]/70 to-transparent" />

        <header className="fixed inset-x-0 top-4 z-[100] px-4 md:px-8">
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
              <Button onClick={openBooking} disabled={!authReady} className="hidden rounded-full border border-white/60 bg-[#005a57] px-6 py-6 text-white shadow-lg shadow-[#005a57]/20 hover:bg-[#004845] md:inline-flex">
                Book Appointment
                <CalendarDays className="h-5 w-5" />
              </Button>
              {!session && (
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="hidden text-sm font-semibold text-[#071d21] hover:text-[#005a57] md:block"
                >
                  Login
                </button>
              )}
              {session && (
                <div className="hidden items-center gap-2 rounded-full border border-white/60 bg-white/65 py-1 pl-1 pr-3 shadow-sm backdrop-blur md:flex">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={session.user.user_metadata?.avatar_url} alt="" />
                    <AvatarFallback className="bg-[#005a57] text-xs font-bold text-white">{userInitials}</AvatarFallback>
                  </Avatar>
                  <button type="button" onClick={signOut} className="text-sm font-bold text-[#071d21] hover:text-[#005a57]">
                    Sign Out
                  </button>
                </div>
              )}
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
                  disabled={!authReady}
                >
                  Book Appointment
                </button>
                {!session && (
                  <button
                    type="button"
                    className="rounded-2xl px-4 py-3 text-left hover:bg-[#e5efed] hover:text-[#005a57]"
                    onClick={() => {
                      setAuthModalOpen(true);
                      setMobileNavOpen(false);
                    }}
                  >
                    Login
                  </button>
                )}
                {session && (
                  <button type="button" className="rounded-2xl px-4 py-3 text-left hover:bg-[#e5efed] hover:text-[#005a57]" onClick={signOut}>
                    Sign Out
                  </button>
                )}
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
        <>
          <section id="services" className="mx-auto max-w-7xl scroll-mt-28 px-6 py-16 lg:px-10">
            <div className="mb-8 max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#005a57]">Client-first booking</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.02em] text-[#071d21] md:text-5xl">Premium grooming without the waiting-room guessing.</h2>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {featureCards.map((item) => (
                <article key={item.title} className="rounded-lg border border-[#decfbd] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#e5efed] text-[#005a57]">
                    <item.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-6 text-2xl font-black text-[#071d21]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#6f6459]">{item.copy}</p>
                </article>
              ))}
            </div>
            <div className="mt-12">
              {renderServiceFilters()}
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {visibleServices.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-lg border border-[#decfbd] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="h-48 bg-[#071d21]">
                    <img
                      src={item.imageUrl || "/Hero_sec.png"}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(event) => { event.currentTarget.src = "/Hero_sec.png"; }}
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6ea097]">{item.category}</p>
                    <h3 className="mt-3 text-2xl font-black">{item.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#6f6459]">{item.description || "Premium salon service tailored to your look."}</p>
                    <div className="mt-5 flex items-end justify-between gap-4">
                      <p className="text-2xl font-black text-[#005a57]">{money(item.price)}</p>
                      <p className="text-sm font-bold text-[#526066]">{item.durationMinutes} min</p>
                    </div>
                  </div>
                </article>
              ))}
              {visibleServices.length === 0 && (
                <div className="rounded-lg border border-[#decfbd] bg-white p-7 text-sm font-semibold text-[#6f6459] md:col-span-2 xl:col-span-4">
                  {services.length === 0 ? "Services will appear here when the API server is running." : "No services are available in this category yet."}
                </div>
              )}
            </div>
          </section>

          <section id="about-us" className="mx-auto grid max-w-7xl scroll-mt-28 grid-cols-1 gap-8 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#005a57]">About us</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.02em] md:text-5xl">About Glamour Studio</h2>
            </div>
            <div className="rounded-lg border border-[#decfbd] bg-white p-7 shadow-sm">
              <p className="text-lg leading-8 text-[#526066]">
                Glamour Studio is a premium men&apos;s salon built around sharp craft, quiet comfort, and dependable scheduling. From precise fades to beard architecture and skin resets, every service is designed to feel polished without feeling rushed.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {["Private grooming chairs", "Premium product shelf", "Live appointment holds"].map((item) => (
                  <div key={item} className="rounded-lg bg-[#f4eee6] p-4 text-sm font-bold text-[#071d21]">{item}</div>
                ))}
              </div>
            </div>
          </section>

          <section id="pricing" className="mx-auto max-w-7xl scroll-mt-28 px-6 py-16 lg:px-10">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#005a57]">Services & pricing</p>
                <h2 className="mt-3 text-4xl font-black tracking-[-0.02em] md:text-5xl">Hair, beard, and grooming packages.</h2>
              </div>
              <Button onClick={openBooking} className="w-fit rounded-full bg-[#005a57] px-6 text-white hover:bg-[#004845]">Book a package</Button>
            </div>
            {renderServiceFilters()}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {visibleServices.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-lg border border-[#decfbd] bg-white shadow-sm">
                  <div className="h-44 bg-[#071d21]">
                    <img
                      src={item.imageUrl || "/Hero_sec.png"}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(event) => { event.currentTarget.src = "/Hero_sec.png"; }}
                    />
                  </div>
                  <div className="p-6">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6ea097]">{item.category}</p>
                  <h3 className="mt-4 text-2xl font-black">{item.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#6f6459]">{item.description || "Premium grooming service"}</p>
                  <div className="mt-6 flex items-end justify-between gap-4">
                    <p className="text-2xl font-black text-[#005a57]">{money(item.price)}</p>
                    <p className="text-sm font-bold text-[#526066]">{item.durationMinutes} min</p>
                  </div>
                  {item.deposit > 0 && <p className="mt-2 text-xs font-semibold text-[#6f6459]">Deposit: {money(item.deposit)}</p>}
                  </div>
                </article>
              ))}
              {visibleServices.length === 0 && (
                <div className="rounded-lg border border-[#decfbd] bg-white p-7 text-sm font-semibold text-[#6f6459] md:col-span-2 xl:col-span-4">
                  {services.length === 0 ? "Start the API server to load admin-managed service pricing." : "No services are available in this category yet."}
                </div>
              )}
            </div>
          </section>

          <section id="stylists" className="mx-auto max-w-7xl scroll-mt-28 px-6 py-16 lg:px-10">
            <div className="mb-8 max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#005a57]">Stylists</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.02em] md:text-5xl">Specialists for the finish you want.</h2>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {stylistCards.map((item, index) => (
                <article key={item.name} className="overflow-hidden rounded-lg border border-[#decfbd] bg-white shadow-sm">
                  <div className="h-56 bg-cover bg-center" style={{ backgroundImage: "url('/Hero_sec.png')", backgroundPosition: `${42 + index * 18}% center` }} />
                  <div className="p-6">
                    <h3 className="text-2xl font-black">{item.name}</h3>
                    <p className="mt-1 text-sm font-bold text-[#005a57]">{item.title}</p>
                    <p className="mt-4 text-sm leading-6 text-[#6f6459]">{item.specialty}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="gallery" className="mx-auto max-w-7xl scroll-mt-28 px-6 py-16 lg:px-10">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#005a57]">Gallery</p>
                <h2 className="mt-3 text-4xl font-black tracking-[-0.02em] md:text-5xl">Cuts, details, atmosphere.</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
              {galleryCards.map((item, index) => (
                <article key={item} className={`relative min-h-[260px] overflow-hidden rounded-lg border border-[#decfbd] bg-[#071d21] shadow-sm ${index === 0 ? "md:col-span-2" : ""}`}>
                  <div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: "url('/Hero_sec.png')", backgroundPosition: `${24 + index * 20}% center` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071d21]/90 to-transparent" />
                  <p className="absolute bottom-5 left-5 text-xl font-black text-white">{item}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="contact" className="mx-auto max-w-7xl scroll-mt-28 px-6 py-16 lg:px-10">
            <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-[#decfbd] bg-white shadow-xl lg:grid-cols-[1fr_0.9fr]">
              <div className="p-7 md:p-10">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#005a57]">Contact</p>
                <h2 className="mt-3 text-4xl font-black tracking-[-0.02em] md:text-5xl">Visit the studio.</h2>
                <div className="mt-8 grid gap-5 text-sm text-[#526066]">
                  <p className="flex gap-3"><Clock className="h-5 w-5 text-[#005a57]" /> Mon-Sat, 10:00 AM to 2:00 AM</p>
                  <p className="flex gap-3"><MapPin className="h-5 w-5 text-[#005a57]" /> 22 Clifton Grooming Lane, Karachi</p>
                  <p className="flex gap-3"><Phone className="h-5 w-5 text-[#005a57]" /> +92 300 555 0101</p>
                </div>
                <Button onClick={openBooking} className="mt-8 rounded-full bg-[#005a57] px-7 text-white hover:bg-[#004845]">Book Appointment</Button>
              </div>
              <div className="min-h-[320px] bg-[#e5efed] p-5">
                <div className="flex h-full min-h-[280px] items-center justify-center rounded-lg border border-[#c9d8d4] bg-[linear-gradient(135deg,#dfe9e6,#f8f4ed)] text-center text-sm font-bold text-[#005a57]">
                  Location map placeholder
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="overflow-hidden border-[#d8cdc0] bg-[#fbf8f2] p-0 text-[#071d21] sm:max-w-md">
          <div className="bg-[#071d21] px-6 py-7 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Sign in to book</DialogTitle>
              <DialogDescription className="text-[#c9d8d4]">
                Reserve your stylist, hold a live appointment slot, and manage your booking securely.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-3 p-6">
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-start rounded-lg border-[#d8cdc0] bg-white text-base font-bold text-[#071d21] hover:bg-[#f4eee6]"
              onClick={() => signInWithProvider("google")}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f1f5f3] text-sm font-black text-[#005a57]">G</span>
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-start rounded-lg border-[#d8cdc0] bg-white text-base font-bold text-[#071d21] hover:bg-[#f4eee6]"
              onClick={() => signInWithProvider("apple")}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#071d21] text-sm font-black text-white">A</span>
              Continue with Apple
            </Button>
            <p className="pt-2 text-center text-xs leading-5 text-[#6f6459]">
              Authentication is powered by Supabase. Booking opens automatically after sign-in.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </main>
  );
}
