"use client";
import {
  type MouseEvent, useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import type { Session } from "@supabase/supabase-js";
import {
  motion, useScroll, useTransform, useInView, useMotionValueEvent,
  AnimatePresence,
} from "framer-motion";
import type { Variants } from "framer-motion";
import {
  CalendarDays, Check, Clock, MapPin, Menu, Phone,
  Scissors, ShieldCheck, Sparkles, Star, UserRound, Users, X,
  ArrowRight, ArrowDown, ChevronRight, ChevronLeft, Play, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import Carousel from "@/components/Carousel";
import StickyScrollGallery from '@/components/StickyScrollGallery';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { API_UNAVAILABLE_MESSAGE, API_URL, SOCKET_OPTIONS } from "@/lib/api";
import { syncSupabaseCustomerProfile } from "@/lib/customerProfile";
import { localDateKey } from "@/lib/date";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────────────── */
type Service = {
  id: string; name: string; category: string;
  durationMinutes: number; price: number;
  description: string; imageUrl?: string;
};
type StaffMember = { id: string; name: string; title: string; specialties: string[]; bio: string };
type Slot = { time: string; label: string; startAt: string; endAt: string; available: boolean; blockedBy: "cutoff" | "appointment" | "hold" | null };

/* ────────────────────────────────────────────────────────────────────────────
   Static Data
   ──────────────────────────────────────────────────────────────────────────── */
const BOOKING_STEPS = [
  { key: "service", label: "Service", icon: Scissors },
  { key: "staff",   label: "Artist",  icon: Users },
  { key: "time",    label: "Time",    icon: CalendarDays },
  { key: "confirm", label: "Confirm", icon: Check },
];

const NAV_ITEMS = [
  { label: "Services",  href: "#treatments" },
  { label: "About",     href: "#about" },
  { label: "Stylists",  href: "#stylists" },
  { label: "Gallery",   href: "#gallery" },
  { label: "Contact",   href: "#contact" },
];

const STATS = [
  { end: 2500, suffix: "+",  label: "Happy Clients",      sub: "and growing" },
  { end: 15,   suffix: "+",  label: "Expert Stylists",    sub: "certified professionals" },
  { end: 4.9,  suffix: "",   label: "Client Rating",      sub: "out of 5 stars" },
  { end: 5,    suffix: "yr", label: "Years of Excellence", sub: "since 2021" },
];

const TESTIMONIALS = [
  { name: "Ayesha Khan",     role: "Loyal Client · 3 years",     text: "The most refined salon experience I've had anywhere. The precision and care is unlike anything else in the city.", rating: 5, image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=800&fit=crop" },
  { name: "Zainab Raza",     role: "Bridal Package Client",      text: "For my wedding, I trusted Flourish with everything — hair, makeup, skincare. They exceeded every expectation.", rating: 5, image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=800&fit=crop" },
  { name: "Fatima Siddiqui", role: "Monthly Facial Client",      text: "What sets Flourish apart isn't just the skill — it's the atmosphere. Every visit feels like a retreat.", rating: 5, image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=800&fit=crop" },
  { name: "Sana Malik",      role: "Hair Colour Client",         text: "I've tried every premium salon in Karachi. None come close to Flourish's attention to detail.", rating: 5, image: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=600&h=800&fit=crop" },
];

const WHY_ITEMS = [
  { icon: ShieldCheck, title: "Premium products only",   body: "Internationally sourced, professional-grade products curated for local hair and skin types." },
  { icon: Clock,       title: "Your time is sacred",      body: "Appointments start on time, every time. We respect your schedule as much as ours." },
  { icon: Star,        title: "Certified specialists",    body: "Every stylist is certified and continuously trained at international workshops." },
  { icon: Users,       title: "Live staff availability",  body: "See real-time openings. Offline stylists are automatically removed from the schedule." },
];

const GALLERY_ITEMS = [
  { label: "Precision Colour",     pos: "50% 30%" },
  { label: "Bridal Styling",       pos: "60% 40%" },
  { label: "Skincare Ritual",      pos: "40% 50%" },
  { label: "Signature Cut",        pos: "55% 35%" },
  { label: "Finishing Touch",      pos: "45% 45%" },
  { label: "Studio Atmosphere",    pos: "50% 60%" },
];

/* ────────────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────────────── */
function money(v: number) { return `Rs. ${v.toLocaleString()}`; }
function todayInputValue() { return localDateKey(); }
function initials(name: string) { return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(); }

/* ────────────────────────────────────────────────────────────────────────────
   Animated Counter — scrolls into view then counts up
   ──────────────────────────────────────────────────────────────────────────── */
function Counter({ end, suffix }: { end: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf: number;
    const start = performance.now();
    const duration = 2200;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setVal(parseFloat((eased * end).toFixed(Number.isInteger(end) ? 0 : 1)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end]);

  return (
    <span ref={ref} className="tabular-nums">
      {Number.isInteger(end) ? Math.round(val) : val}
      {suffix && <span className="text-white/40 ml-0.5">{suffix}</span>}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   ScrollReveal — triggers on scroll with configurable transforms
   ──────────────────────────────────────────────────────────────────────────── */
function ScrollReveal({
  children,
  className = "",
  y = 60,
  x = 0,
  scale = 1,
  rotate = 0,
  delay = 0,
  duration = 0.9,
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
  x?: number;
  scale?: number;
  rotate?: number;
  delay?: number;
  duration?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, x, scale, rotate }}
      animate={inView ? { opacity: 1, y: 0, x: 0, scale: 1, rotate: 0 } : {}}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Stagger container
   ──────────────────────────────────────────────────────────────────────────── */
function StaggerContainer({ children, className = "", staggerDelay = 0.08 }: {
  children: React.ReactNode; className?: string; staggerDelay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{ visible: { transition: { staggerChildren: staggerDelay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const childFadeUp: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════════ */
export default function CustomerPortal() {
  /* State */
  const [services, setServices]   = useState<Service[]>([]);
  const [staff, setStaff]         = useState<StaffMember[]>([]);
  const [slots, setSlots]         = useState<Slot[]>([]);
  const [selectedService, setSelectedService] = useState("");
  const [selectedStaff, setSelectedStaff]     = useState("");
  const [selectedDate, setSelectedDate]       = useState(todayInputValue());
  const [selectedSlot, setSelectedSlot]       = useState<Slot | null>(null);
  const [holdId, setHoldId]       = useState<string | null>(null);
  const [customerName, setCustomerName]   = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [loading, setLoading]     = useState(false);
  const [showBooking, setShowBooking]     = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [session, setSession]     = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [apiReady, setApiReady]   = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [scrolled, setScrolled]   = useState(false);

  /* Derived */
  const service = useMemo(() => services.find((s) => s.id === selectedService), [selectedService, services]);
  const artist  = useMemo(() => staff.find((s) => s.id === selectedStaff), [selectedStaff, staff]);
  const categories = useMemo(() => ["All", ...Array.from(new Set(services.map((s) => s.category).filter(Boolean))).sort()], [services]);
  const visibleServices = useMemo(() => activeCategory === "All" ? services : services.filter((s) => s.category === activeCategory), [activeCategory, services]);
  const activeStep = !selectedService ? 0 : !selectedStaff ? 1 : !selectedSlot ? 2 : 3;
  const userInitials = session?.user.user_metadata?.full_name
    ? initials(String(session.user.user_metadata.full_name))
    : session?.user.email?.slice(0, 2).toUpperCase() || "FP";

  /* Hero parallax */
  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroImgY    = useTransform(heroProgress, [0, 1], ["0%", "35%"]);
  const heroImgScale = useTransform(heroProgress, [0, 1], [1.1, 1.3]);
  const heroTextY   = useTransform(heroProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(heroProgress, [0, 0.65], [1, 0]);

  /* Scroll detection for navbar */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* ── Auth ────────────────────────────────────────────────────────────────── */
  function openPendingBooking() {
    setShowBooking(true); setMobileNavOpen(false);
    window.setTimeout(() => document.querySelector("#booking")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session); setAuthReady(true);
      if (data.session?.user) {
        await syncSupabaseCustomerProfile(data.session.user).catch(() => undefined);
      }
      if (data.session && window.localStorage.getItem("flourish-pending-booking") === "true") {
        window.localStorage.removeItem("flourish-pending-booking");
        openPendingBooking();
      }
    }).catch(() => setAuthReady(true));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, next) => {
      setSession(next);
      if (next?.user) {
        syncSupabaseCustomerProfile(next.user).catch(() => undefined);
      }
      if (next && window.localStorage.getItem("flourish-pending-booking") === "true") {
        window.localStorage.removeItem("flourish-pending-booking");
        setAuthModalOpen(false); openPendingBooking();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ── Data ────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/services`).then((r) => r.json()),
      fetch(`${API_URL}/api/staff`).then((r) => r.json()),
    ]).then(([sd, std]) => { setServices(sd); setStaff(std); setApiReady(true); })
      .catch(() => { setApiReady(false); toast.error(API_UNAVAILABLE_MESSAGE); });
  }, []);

  useEffect(() => {
    if (!apiReady) return;
    const socket: Socket = io(API_URL, SOCKET_OPTIONS);
    socket.on("staff:update", () => {
      fetch(`${API_URL}/api/staff`).then((r) => r.json()).then((std: StaffMember[]) => {
        setStaff(std);
        if (selectedStaff && !std.some((s) => s.id === selectedStaff)) {
          setSelectedStaff(""); setSlots([]);
          toast.info("That artist is offline. Please choose another.");
        }
      });
    });
    return () => { socket.disconnect(); };
  }, [apiReady, selectedStaff]);

  const fetchAvailability = useCallback(async () => {
    if (!selectedService || !selectedStaff || !selectedDate) return;
    const params = new URLSearchParams({ serviceId: selectedService, staffId: selectedStaff, date: selectedDate });
    const res = await fetch(`${API_URL}/api/availability?${params}`);
    const data = await res.json();
    setSlots(data.slots || []);
  }, [selectedDate, selectedService, selectedStaff]);

  useEffect(() => { fetchAvailability(); setSelectedSlot(null); setHoldId(null); }, [fetchAvailability]);

  useEffect(() => {
    if (!apiReady || !selectedStaff || !selectedDate) return;
    const socket: Socket = io(API_URL, SOCKET_OPTIONS);
    socket.emit("schedule:join", { staffId: selectedStaff, date: selectedDate });
    socket.on("schedule:update", fetchAvailability);
    return () => { socket.disconnect(); };
  }, [apiReady, fetchAvailability, selectedStaff, selectedDate, selectedService]);

  useEffect(() => { if (session?.user.email && !customerEmail) setCustomerEmail(session.user.email); }, [customerEmail, session]);

  /* ── Actions ─────────────────────────────────────────────────────────────── */
  const scrollTo = (href: string) =>
    window.setTimeout(() => document.querySelector(href)?.scrollIntoView({ behavior: "smooth" }), 0);

  const handleNavClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault(); setShowBooking(false); setMobileNavOpen(false); scrollTo(href);
  };

  const openBooking = () => {
    if (!authReady) return;
    if (!session) { setAuthModalOpen(true); setMobileNavOpen(false); return; }
    openPendingBooking();
  };

  const completeBookingAuth = (nextSession: Session | null) => {
    if (nextSession) setSession(nextSession);
    setAuthModalOpen(false);
    setAuthEmail("");
    setAuthPassword("");
    setAuthName("");
    openPendingBooking();
  };

  const handleBookingAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthSubmitting(true);
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: { data: { full_name: authName } },
        });
        if (error) throw error;
        if (data.session) {
          await syncSupabaseCustomerProfile(data.session.user, authName).catch(() => undefined);
          toast.success("Account created. Let's book your appointment.");
          completeBookingAuth(data.session);
        } else {
          toast.success("Account created. Please check your email to confirm your account.");
        }
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) throw error;
      if (data.session?.user) await syncSupabaseCustomerProfile(data.session.user).catch(() => undefined);
      toast.success("Signed in. Let's book your appointment.");
      completeBookingAuth(data.session);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const signInWithGoogle = async () => {
    window.localStorage.setItem("flourish-pending-booking", "true");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined } });
    if (error) toast.error(error.message);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(error.message); return; }
    setSession(null); setShowBooking(false); toast.success("Signed out");
  };

  const holdSlot = async (slot: Slot) => {
    if (!slot.available || !service || !artist) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/holds`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, time: slot.time, staffId: artist.id, serviceId: service.id, customerEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not hold slot");
      setSelectedSlot(slot); setHoldId(data.id);
      toast.success("Slot held for 7 minutes — complete your booking.");
      await fetchAvailability();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Slot unavailable");
      await fetchAvailability();
    } finally { setLoading(false); }
  };

  const joinWaitlist = async (slot: Slot) => {
    if (!service || !artist) return;
    if (!customerEmail || !customerName) { toast.error("Add your name and email first."); return; }
    const res = await fetch(`${API_URL}/api/waitlist`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerName, customerEmail, staffId: artist.id, serviceId: service.id, startAt: slot.startAt }),
    });
    if (res.ok) toast.success("You're on the waitlist — we'll notify you.");
  };

  const confirmBooking = async () => {
    if (!service || !artist || !selectedSlot) return;
    if (!customerName || !customerEmail) { toast.error("Name and email are required."); return; }
    if (customerPhone.replace(/\D/g, "").length < 7) { toast.error("A valid phone number is required."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdId, customerName, customerEmail, customerPhone, staffId: artist.id, serviceId: service.id, date: selectedDate, time: selectedSlot.time }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      toast.success(`${service.name} with ${artist.name} — confirmed!`);
      setSelectedSlot(null); setHoldId(null);
      await fetchAvailability();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Booking failed");
    } finally { setLoading(false); }
  };

  const prevTestimonial = () => setTestimonialIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const nextTestimonial = () => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length);

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════════ */
  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#1a1a18] overflow-x-hidden selection:bg-[#2c5545]/20 selection:text-[#1a1a18]">

      {/* ═══════════════════════ NAVBAR ═══════════════════════ */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-0 z-[100] bg-[#05150e] border-b border-white/5 shadow-sm"
      >
        <div className="mx-auto max-w-[1560px] px-6 md:px-10 h-[76px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#485341] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
              <Sparkles className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="font-sans font-bold text-[22px] tracking-tight text-white">
              Flourish
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={cn(
                  "text-[13.5px] font-medium tracking-wide transition-colors duration-300 px-5 py-2.5 rounded-full",
                  scrolled 
                    ? "text-white/80 hover:text-white hover:bg-[#485341]" 
                    : "text-white/80 hover:text-white hover:bg-[#485341]"
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {session ? (
              <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-[#16211c] py-1.5 pl-1.5 pr-4">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={session.user.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-[#485341] text-[10px] font-bold text-white">{userInitials}</AvatarFallback>
                </Avatar>
                <button onClick={signOut} className={cn("text-[13px] transition-colors", scrolled ? "text-white/70 hover:text-white" : "text-white/60 hover:text-white")}>
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className={cn("hidden md:block text-[13px] font-medium transition-colors", scrolled ? "text-white/70 hover:text-white" : "text-white/60 hover:text-white")}
              >
                Log in
              </Link>
            )}

            {/* CTA button with minimal hover */}
            <button
              onClick={openBooking}
              disabled={!authReady}
              className={cn(
                "hidden md:flex items-center gap-2 rounded-full px-6 h-10 text-[13px] font-semibold transition-all duration-400 group",
                scrolled
                  ? "bg-[#485341] text-white hover:bg-[#384232]"
                  : "bg-[#485341] text-white hover:bg-[#384232]"
              )}
            >
              <span>Book appointment</span>
              <ArrowRight className="w-3.5 h-3.5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
            </button>

            <button
              className={cn("w-10 h-10 rounded-xl flex items-center justify-center lg:hidden transition-colors bg-[#485341] hover:bg-[#384232] text-white")}
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden border-t border-[#e8e0d4] bg-[#FAF7F2] overflow-hidden"
            >
              <div className="px-6 py-5 space-y-1">
                {NAV_ITEMS.map((item, i) => (
                  <motion.a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className="flex items-center justify-between px-4 py-3.5 rounded-xl text-[14px] text-[#7a7168] hover:bg-[#f0ebe3] hover:text-[#1a1a18] transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    {item.label}
                    <ChevronRight className="w-4 h-4 opacity-30" />
                  </motion.a>
                ))}
                <div className="pt-4 space-y-2 border-t border-[#e8e0d4] mt-3">
                  <button onClick={openBooking} disabled={!authReady} className="w-full h-12 rounded-full bg-[#2c5545] text-white text-[13px] font-semibold flex items-center justify-center gap-2">
                    <CalendarDays className="w-4 h-4" /> Book Appointment
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      {!showBooking && (
        <section ref={heroRef} className="relative min-h-[100svh] flex items-end lg:items-center overflow-hidden">
          {/* Parallax background image */}
          <motion.div className="absolute inset-0 will-change-transform" style={{ y: heroImgY, scale: heroImgScale }}>
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/Hero_sec.png')" }} />
          </motion.div>

          {/* Dark cinematic overlays */}
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/20 to-black/90" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/90" />

          {/* Hero content */}
          <motion.div
            className="relative z-10 w-full pt-[80px] pb-10 lg:pt-0 lg:pb-0"
            style={{ y: heroTextY, opacity: heroOpacity }}
          >
            <div className="mx-auto max-w-[1560px] px-6 md:px-10 flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-8 min-h-[60vh] py-12">
              
              {/* Left side text */}
              <div className="max-w-[600px] text-center lg:text-left flex-1 w-full order-2 lg:order-1">
                <ScrollReveal y={30} delay={0.2}>
                  <h1 className="text-[clamp(3.2rem,6vw,5.5rem)] font-bold text-white leading-[1.05] tracking-tight mb-6 font-sans">
                    Where craft<br className="hidden md:block"/> meets elegance.
                  </h1>
                </ScrollReveal>
                <ScrollReveal y={30} delay={0.35}>
                  <p className="text-[16px] md:text-[18px] text-white/80 font-medium mb-10 max-w-[520px] mx-auto lg:mx-0">
                    Expert haircare, skincare, and grooming rituals designed for women who appreciate precision and luxury.
                  </p>
                </ScrollReveal>
                <ScrollReveal y={30} delay={0.5}>
                  <div className="flex justify-center lg:justify-start">
                    <button onClick={openBooking} className="group flex items-center gap-3 rounded-full border border-white/20 bg-white/5 backdrop-blur-md px-8 h-[54px] text-white font-medium text-[14px] hover:bg-white/10 hover:border-white/30 transition-all duration-400">
                      Book your appointment
                      <ArrowRight className="w-4 h-4 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                    </button>
                  </div>
                </ScrollReveal>
              </div>

              {/* Center spacer for portrait visibility */}
              <div className="hidden lg:block flex-[0.8] xl:flex-1 h-full order-1 lg:order-2"></div>

              {/* Right side list */}
              <div className="flex-1 w-full flex flex-col lg:items-end order-3">
                <ScrollReveal y={30} delay={0.6}>
                  <ul className="space-y-5 text-white/90 text-[15px] md:text-[16px] font-medium text-center lg:text-left">
                    <li className="flex items-center justify-center lg:justify-start gap-4 hover:text-white transition-colors cursor-default">
                      <span className="w-8 h-[1px] bg-white/40"></span>
                      Precision cuts
                    </li>
                    <li className="flex items-center justify-center lg:justify-start gap-4 hover:text-white transition-colors cursor-default">
                      <span className="w-8 h-[1px] bg-white/40"></span>
                      Luxury coloring
                    </li>
                    <li className="flex items-center justify-center lg:justify-start gap-4 hover:text-white transition-colors cursor-default">
                      <span className="w-8 h-[1px] bg-white/40"></span>
                      Bridal & editorial
                    </li>
                  </ul>
                </ScrollReveal>
              </div>

            </div>
          </motion.div>

        </section>
      )}
 
      {/* ═══════════════════════ BOOKING WIZARD ═══════════════════════ */}
      {showBooking && (
        <section id="booking" className="min-h-screen pt-28 pb-20 bg-[#FAF7F2]">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <ScrollReveal y={30}>
              <div className="flex items-center justify-between mb-10">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-[#7a7168] mb-2">Your booking</p>
                  <h2 className="font-editorial text-4xl text-[#1a1a18]">Reserve your appointment</h2>
                </div>
                <button onClick={() => setShowBooking(false)} className="flex items-center gap-2 text-[13px] text-[#7a7168] hover:text-[#1a1a18] transition-colors">
                  <X className="w-4 h-4" /> Back to site
                </button>
              </div>
            </ScrollReveal>

            {/* Step progress */}
            <div className="flex items-center gap-2 mb-10">
              {BOOKING_STEPS.map((step, i) => {
                const done = i < activeStep, current = i === activeStep;
                return (
                  <div key={step.key} className="flex items-center gap-2">
                    <motion.div layout className={cn(
                      "flex items-center gap-2.5 rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
                      current ? "bg-[#2c5545] text-white" : done ? "bg-[#2c5545]/10 text-[#2c5545]" : "bg-[#f0ebe3] text-[#7a7168]"
                    )}>
                      {done ? <Check className="w-3.5 h-3.5" /> : <step.icon className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{step.label}</span>
                    </motion.div>
                    {i < BOOKING_STEPS.length - 1 && <div className={cn("h-px w-6", done ? "bg-[#2c5545]/25" : "bg-[#e8e0d4]")} />}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
              <div className="space-y-5">
                {/* Step 1 — Services */}
                <div className="bg-white rounded-[28px] border border-[#e8e0d4] p-7">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-[#2c5545]/8 flex items-center justify-center"><Scissors className="w-4 h-4 text-[#2c5545]" /></div>
                    <h3 className="font-editorial text-2xl">Choose a Service</h3>
                  </div>
                  <div className="flex gap-2 flex-wrap mb-5">
                    {categories.map((cat) => (
                      <button key={cat} onClick={() => setActiveCategory(cat)}
                        className={cn("rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200",
                          activeCategory === cat ? "bg-[#2c5545] text-white" : "bg-[#f0ebe3] text-[#7a7168] hover:text-[#1a1a18]"
                        )}>
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {visibleServices.map((item) => {
                      const sel = selectedService === item.id;
                      return (
                        <motion.button key={item.id} onClick={() => setSelectedService(item.id)}
                          className={cn("text-left rounded-2xl border p-5 transition-all duration-200 group",
                            sel ? "border-[#2c5545] bg-[#2c5545]/[0.03]" : "border-[#e8e0d4] hover:border-[#2c5545]/40"
                          )}
                          whileHover={{ y: -2, boxShadow: "0 8px 24px -8px rgba(0,0,0,0.08)" }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[#1a1a18]">{item.name}</p>
                              <p className="text-xs text-[#7a7168] mt-1 leading-relaxed">{item.description || "Premium salon service."}</p>
                            </div>
                            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                              sel ? "border-[#2c5545] bg-[#2c5545]" : "border-[#e8e0d4] group-hover:border-[#2c5545]/50"
                            )}>
                              {sel && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <div className="mt-4 flex items-center gap-3 text-xs text-[#7a7168]">
                            <span>{item.durationMinutes} min</span>
                            <span className="w-1 h-1 rounded-full bg-[#e8e0d4]" />
                            <span className="font-semibold text-[#2c5545]">{money(item.price)}</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2 — Staff */}
                <div className="bg-white rounded-[28px] border border-[#e8e0d4] p-7">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-[#2c5545]/8 flex items-center justify-center"><Users className="w-4 h-4 text-[#2c5545]" /></div>
                    <h3 className="font-editorial text-2xl">Choose an Artist</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {staff.map((item) => {
                      const can = !service || item.specialties.includes(service.category), sel = selectedStaff === item.id;
                      return (
                        <motion.button key={item.id} disabled={!can} onClick={() => setSelectedStaff(item.id)}
                          className={cn("text-left rounded-2xl border p-4 transition-all duration-200",
                            sel ? "border-[#2c5545] bg-[#2c5545]/[0.03]" : "border-[#e8e0d4] hover:border-[#2c5545]/40",
                            !can && "opacity-35 cursor-not-allowed"
                          )}
                          whileHover={can ? { y: -2 } : {}}
                        >
                          <div className="w-10 h-10 rounded-full bg-[#2c5545]/8 border border-[#2c5545]/15 flex items-center justify-center mb-3">
                            <span className="text-xs font-bold text-[#2c5545]">{initials(item.name)}</span>
                          </div>
                          <p className="font-semibold text-[13px]">{item.name}</p>
                          <p className="text-xs text-[#2c5545] mt-0.5">{item.title}</p>
                          <p className="text-xs text-[#7a7168] mt-2 leading-relaxed line-clamp-2">{item.bio}</p>
                          {sel && <p className="mt-3 text-xs font-semibold text-[#2c5545] flex items-center gap-1"><Check className="w-3 h-3" /> Selected</p>}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3 — Time */}
                <div className="bg-white rounded-[28px] border border-[#e8e0d4] p-7">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#2c5545]/8 flex items-center justify-center"><CalendarDays className="w-4 h-4 text-[#2c5545]" /></div>
                      <h3 className="font-editorial text-2xl">Pick a Time</h3>
                    </div>
                    <Input type="date" min={todayInputValue()} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto max-w-[180px] text-[13px] h-9" />
                  </div>
                  {!selectedService || !selectedStaff ? (
                    <p className="py-8 text-center text-[13px] text-[#7a7168]">Choose a service and artist to see times.</p>
                  ) : slots.length === 0 ? (
                    <p className="py-8 text-center text-[13px] text-[#7a7168]">No slots available. Try another date.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {slots.map((slot) => {
                        const isSel = selectedSlot?.startAt === slot.startAt;
                        return (
                          <motion.button key={slot.startAt} onClick={() => slot.available ? holdSlot(slot) : joinWaitlist(slot)}
                            disabled={!selectedService || !selectedStaff || loading}
                            className={cn("rounded-2xl border px-2 py-3 text-center text-xs transition-all duration-150",
                              isSel ? "border-[#2c5545] bg-[#2c5545] text-white" :
                              slot.available ? "border-[#e8e0d4] hover:border-[#2c5545]/50 hover:bg-[#2c5545]/[0.03]" :
                              "border-[#e8e0d4]/60 bg-[#f0ebe3] text-[#7a7168]"
                            )}
                            whileHover={slot.available ? { scale: 1.06 } : {}}
                          >
                            <span className="block font-semibold text-[13px] mb-0.5">{slot.label}</span>
                            <span className={cn("text-[10px]", isSel ? "text-white/70" : slot.available ? "text-emerald-600" : "")}>
                              {slot.available ? "Open" : slot.blockedBy === "cutoff" ? "Too soon" : "Waitlist"}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div>
                <div className="sticky top-28 bg-white rounded-[28px] border border-[#e8e0d4] p-7">
                  <h3 className="font-editorial text-2xl mb-5 pb-5 border-b border-[#e8e0d4]">Summary</h3>
                  <div className="bg-[#f0ebe3] rounded-2xl p-4 space-y-3 text-[13px] mb-5">
                    {[["Service", service?.name || "—"], ["Artist", artist?.name || "—"], ["Time", selectedSlot?.label || "—"], ...(selectedSlot ? [["Date", selectedDate]] : [])].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-[#7a7168]">{k}</span>
                        <span className="font-medium text-right">{v}</span>
                      </div>
                    ))}
                    {service && (<>
                      <div className="h-px bg-[#e8e0d4]" />
                      <div className="flex justify-between"><span className="text-[#7a7168]">Price</span><span className="font-semibold text-[#2c5545]">{money(service.price)}</span></div>
                    </>)}
                  </div>
                  {selectedSlot && (
                    <div className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700 leading-relaxed mb-5">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> Slot held 7 min. Complete before it expires.
                    </div>
                  )}
                  <div className="space-y-3 mb-5">
                    <Input placeholder="Full name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-11" />
                    <Input type="email" placeholder="Email address" value={customerEmail} readOnly disabled className="h-11 bg-[#f0ebe3] text-[#7a7168]" />
                    <Input type="tel" placeholder="Phone number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="h-11" required />
                  </div>
                  <motion.button onClick={confirmBooking} disabled={!selectedSlot || loading || !customerName || !customerEmail || customerPhone.replace(/\D/g, "").length < 7}
                    className="w-full h-12 rounded-full bg-[#2c5545] text-white text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-35 disabled:cursor-not-allowed group relative overflow-hidden"
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  >
                    <span className="absolute inset-0 bg-[#1e3d30] origin-bottom scale-y-0 group-hover:scale-y-100 transition-transform duration-500" />
                    <span className="relative z-10">{loading ? "Confirming..." : "Confirm Booking"}</span>
                    {!loading && <ArrowRight className="w-4 h-4 relative z-10" />}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════ MARKETING SECTIONS ═══════════════════════ */}
      {!showBooking && (<>

        {/* ─── TREATMENTS — Alternating editorial cards  ─── */}
        <section id="treatments" className="py-32 lg:py-40">
          <div className="mx-auto max-w-[1560px] px-6 md:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-12 lg:gap-20 items-end mb-20">
              <ScrollReveal x={-40} y={0}>
                <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-[#2c5545] mb-5">Our treatments</p>
                <h2 className="font-sans font-bold text-[clamp(2.8rem,5.5vw,5rem)] text-[#1a1a18] leading-[1.05] tracking-tight">
                  Rituals designed for<br className="hidden md:block" />
                  <span className="italic text-[#7a7168]">every woman.</span>
                </h2>
              </ScrollReveal>
              <ScrollReveal x={40} y={0} delay={0.15}>
                <p className="text-[16px] text-[#7a7168] leading-[1.8] max-w-md">
                  Every treatment is engineered for visible results with a ceremonial experience. Our menu evolves with the latest advances in beauty science.
                </p>
                <motion.button onClick={openBooking}
                  className="group inline-flex items-center gap-2 text-[13px] font-semibold text-[#2c5545] mt-5 relative"
                  whileHover={{ x: 4 }}
                >
                  Book a treatment
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  <span className="absolute -bottom-1 left-0 h-[1.5px] w-0 bg-[#2c5545] group-hover:w-full transition-all duration-400" />
                </motion.button>
              </ScrollReveal>
            </div>

            {/* 3D Carousel of Services */}
            <div className="w-full">
              {visibleServices.length > 0 ? (
                <Carousel 
                  items={visibleServices.slice(0, 10)} 
                  onBook={openBooking} 
                />
              ) : (
                <div className="py-16 text-center text-[14px] text-[#7a7168]">
                  {services.length === 0 ? "Start the API server to see services." : "No services in this category."}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ─── WHY FLOURISH — Light modern 3-card grid ─── */}
        <section id="about" className="py-32 lg:py-40 bg-white overflow-hidden">
          <div className="mx-auto max-w-[1560px] px-6 md:px-10">
            
            {/* Header */}
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-20">
              <ScrollReveal y={20}>
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1a1a18]"></span>
                  <p className="text-[14px] font-medium text-[#1a1a18]">Who we are</p>
                </div>
              </ScrollReveal>
              <ScrollReveal y={20} delay={0.1}>
                <h2 className="text-[clamp(2.5rem,4vw,3.5rem)] font-bold text-[#1a1a18] leading-[1.1] tracking-tight mb-6">
                  Expert stylists providing advanced hair & beauty treatments with professional care.
                </h2>
              </ScrollReveal>
              <ScrollReveal y={20} delay={0.2}>
                <p className="text-[16px] text-[#7a7168] mb-10">
                  Expert care delivering luxurious hair and beauty solutions
                </p>
              </ScrollReveal>
              <ScrollReveal y={20} delay={0.3}>
                <button onClick={() => scrollTo("#stylists")} className="group flex items-center gap-2 rounded-full bg-[#2a3028] px-7 h-[46px] text-white text-[14px] font-medium transition-all duration-300 hover:bg-[#1a1e19]">
                  About us
                  <ArrowRight className="w-4 h-4 -rotate-45 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </ScrollReveal>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Card 1: Image + Text */}
              <ScrollReveal y={30} delay={0.1}>
                <div className="relative rounded-[24px] overflow-hidden h-[420px] group cursor-default">
                  <img src="https://images.unsplash.com/photo-1562322140-8baeececf3df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="Salon experience" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-8 flex items-end gap-5">
                    <span className="text-white text-[4rem] font-medium leading-none tracking-tight">53k</span>
                    <p className="text-white/80 text-[14px] leading-tight pb-2 font-medium">Trusted clients<br/>worldwide</p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Card 2: Pale Green */}
              <ScrollReveal y={30} delay={0.2}>
                <div className="rounded-[24px] bg-[#e6e9de] h-[420px] p-8 flex flex-col justify-between group cursor-default transition-all duration-500 hover:bg-[#dfe3d6]">
                  <div>
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-10 shadow-sm">
                      <Sparkles className="w-5 h-5 text-[#2a3028]" />
                    </div>
                    <h3 className="text-[#1a1a18] text-[4.5rem] font-medium leading-none tracking-tight mb-2">95%</h3>
                  </div>
                  <p className="text-[#5a6157] text-[15px] leading-relaxed max-w-[200px] font-medium">
                    Clinically tested skin treatments for lasting health
                  </p>
                </div>
              </ScrollReveal>

              {/* Card 3: Pale Sand */}
              <ScrollReveal y={30} delay={0.3}>
                <div className="rounded-[24px] bg-[#efeae6] h-[420px] p-8 flex flex-col justify-between group cursor-default transition-all duration-500 hover:bg-[#e8e1dc]">
                  <div>
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-10 shadow-sm">
                      <ShieldCheck className="w-5 h-5 text-[#3a3532]" />
                    </div>
                    <h3 className="text-[#1a1a18] text-[4.5rem] font-medium leading-none tracking-tight mb-2">38k</h3>
                  </div>
                  <p className="text-[#6a625e] text-[15px] leading-relaxed max-w-[220px] font-medium">
                    Advanced dermatology treatments for healthier skin
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ─── STYLISTS ─── */}
        <section id="stylists" className="py-32 lg:py-40 bg-white">
          <div className="mx-auto max-w-[1560px] px-6 md:px-10">
            <ScrollReveal>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-20">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="w-1.5 h-1.5 bg-[#485341] block" />
                    <h3 className="text-[14px] font-medium text-[#485341] tracking-widest uppercase">
                      Our experts
                    </h3>
                  </div>
                  <h2 className="font-sans font-bold text-4xl md:text-[4.5rem] text-[#1a1a18] leading-[1.05] tracking-tight">
                    Specialists for<br className="hidden md:block" />
                    <span className="italic font-editorial text-[#7a7168]">your vision.</span>
                  </h2>
                </div>
                <p className="text-[15px] md:text-[16px] text-[#7a7168] max-w-[320px] leading-relaxed pb-2">
                  Every artist is certified, trained, and personally committed to their craft.
                </p>
              </div>
            </ScrollReveal>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12" staggerDelay={0.15}>
              {(staff.length > 0 ? staff.slice(0, 3) : [
                { id: "s1", name: "Sara Ahmed",    title: "Creative Director",    specialties: [], bio: "Sharp cuts, textured styling, and signature finishing." },
                { id: "s2", name: "Nadia Hussain", title: "Skin & Grooming Lead", specialties: [], bio: "Facials, skincare rituals, and camera-ready finish." },
                { id: "s3", name: "Hina Rashid",   title: "Detail Specialist",    specialties: [], bio: "Colour, creative styling, and bridal packages." },
              ]).map((member, i) => {
                const STYLIST_IMAGES = [
                  "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&h=1000&fit=crop",
                  "https://images.unsplash.com/photo-1605406575497-015ab0d21b9b?w=800&h=1000&fit=crop",
                  "https://images.unsplash.com/photo-1520635360276-f33182b88137?w=800&h=1000&fit=crop"
                ];

                return (
                  <motion.article
                    key={member.id}
                    variants={childFadeUp}
                    className="group cursor-pointer flex flex-col"
                    onClick={openBooking}
                  >
                    {/* Portrait */}
                    <div className="relative w-full aspect-[3/4] rounded-[24px] overflow-hidden mb-6 bg-[#FAF7F2]">
                      <motion.img
                        src={STYLIST_IMAGES[i % 3]}
                        alt={member.name}
                        className="w-full h-full object-cover"
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      />
                      
                      {/* Hover Overlay CTA */}
                      <div className="absolute inset-0 bg-[#1a1a18]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="bg-white text-[#1a1a18] px-6 py-3.5 rounded-full font-medium text-[14px] flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 shadow-xl">
                          Book {member.name.split(" ")[0]} <ArrowRight className="w-3.5 h-3.5 -rotate-45" />
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-2">
                      <h4 className="text-[22px] font-bold text-[#1a1a18] tracking-tight">{member.name}</h4>
                      <p className="text-[14px] text-[#485341] font-medium mt-1 mb-3">{member.title}</p>
                      <p className="text-[14px] text-[#7a7168] leading-relaxed line-clamp-2">
                        {member.bio}
                      </p>
                    </div>
                  </motion.article>
                );
              })}
            </StaggerContainer>
          </div>
        </section>

        {/* ─── TESTIMONIALS — New Design Language ─── */}
        <section className="py-24 lg:py-32 bg-[#FAF7F2]">
          <div className="mx-auto max-w-[1560px] px-6 md:px-10">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-[#1a1a18] block" />
                <h3 className="text-[14px] md:text-[15px] font-medium text-[#1a1a18] tracking-wide">
                  What our clients say
                </h3>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const container = document.getElementById('testimonials-scroll');
                    if (container) container.scrollBy({ left: -container.clientWidth / 2, behavior: 'smooth' });
                  }}
                  className="w-11 h-11 bg-[#485341] text-white flex items-center justify-center hover:bg-[#384232] transition-colors rounded"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => {
                    const container = document.getElementById('testimonials-scroll');
                    if (container) container.scrollBy({ left: container.clientWidth / 2, behavior: 'smooth' });
                  }}
                  className="w-11 h-11 bg-[#485341] text-white flex items-center justify-center hover:bg-[#384232] transition-colors rounded"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Horizontal Scroll Container */}
            <div 
              id="testimonials-scroll"
              className="flex overflow-x-auto snap-x snap-mandatory gap-8 md:gap-16 pb-12 -mx-6 px-6 md:-mx-10 md:px-10"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style dangerouslySetInnerHTML={{ __html: `#testimonials-scroll::-webkit-scrollbar { display: none; }` }} />
              
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-4 md:gap-6 w-[85vw] md:w-[800px] lg:w-[950px] shrink-0 snap-start">
                  
                  {/* Image Card */}
                  <div className="w-full md:w-[350px] lg:w-[400px] h-[400px] md:h-[480px] lg:h-[520px] rounded-[16px] overflow-hidden shrink-0">
                    <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Text Card */}
                  <div className="flex-1 h-auto md:h-[480px] lg:h-[520px] bg-white rounded-[16px] p-8 md:p-12 lg:p-16 flex flex-col justify-center">
                    {/* Large Quote Icon */}
                    <svg className="w-10 h-10 md:w-16 md:h-16 text-[#d5cfc4]/60 mb-6 md:mb-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>

                    <p className="text-[1.25rem] md:text-[1.5rem] lg:text-[1.75rem] font-bold font-sans text-[#1a1a18] leading-[1.3] mb-8 md:mb-10 tracking-tight">
                      “{t.text}”
                    </p>

                    <div>
                      <p className="font-semibold text-[#1a1a18] text-[15px]">{t.name}</p>
                      <p className="text-[13px] text-[#7a7168] mt-1.5">{t.role}</p>
                    </div>
                  </div>

                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ─── GALLERY — Sticky Scroll ─── */}
        <StickyScrollGallery />

        {/* ─── BOOKING CTA — Dark cinematic ─── */}
        {/* ─── BOOKING CTA — Dark cinematic ─── */}
        <section id="contact" className="relative py-24 lg:py-32 bg-[#FAF7F2]">
          <div className="mx-auto max-w-[1560px] px-6 md:px-10 flex flex-col gap-8">
            
            {/* The Main Olive Banner */}
            <ScrollReveal y={20}>
              <div className="bg-[#485341] rounded-[40px] px-6 py-20 md:py-28 relative overflow-hidden">
                {/* Subtle radial gradient background effect inside the banner (optional, matches screenshot vibe) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50 pointer-events-none" />
                
                <div className="relative z-10">
                  <h2 className="font-sans font-bold text-3xl md:text-[3rem] text-white text-center mb-10 tracking-tight leading-[1.1] max-w-3xl mx-auto">
                    Begin your <span className="italic font-editorial text-white/90">Flourish</span> experience
                  </h2>

                  {/* 6 Square Portraits */}
                  <div className="flex flex-wrap justify-center gap-3 md:gap-5 mb-8">
                    {[
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop"
                    ].map((src, i) => (
                      <div key={i} className="w-[72px] h-[72px] md:w-[100px] md:h-[100px] overflow-hidden bg-white/10">
                        <img src={src} alt="Portrait" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>

                  <p className="text-[14px] md:text-[16px] text-white/80 text-center max-w-[600px] mx-auto leading-relaxed mb-10">
                    Real-time booking. Live staff availability. Free slot confirmation. Your appointment, exactly as planned.
                  </p>

                  <div className="flex justify-center">
                    <motion.button onClick={openBooking}
                      className="group flex items-center gap-2 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-colors px-7 h-12 text-white font-medium text-[14px]"
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    >
                      <span>Book your appointment</span>
                      <ArrowRight className="w-3.5 h-3.5 -rotate-45" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* The Map / Contact Section (retained as requested) */}
            <ScrollReveal y={20} delay={0.1}>
              <div className="rounded-[40px] border border-[#e8e0d4] bg-white p-8 md:p-12 max-w-[1560px] mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div className="space-y-6">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7a7168] mb-1">Visit us</p>
                  {[
                    { icon: Clock,  text: "Monday – Saturday, 10:00 AM – 10:00 PM" },
                    { icon: MapPin, text: "22 Clifton Lane, Karachi, Pakistan" },
                    { icon: Phone,  text: "+92 300 555 0101" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-4 text-[14px] text-[#1a1a18] font-medium group transition-colors duration-300">
                      <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-[18px] h-[18px] text-[#7a7168] stroke-[1.5]" />
                      </div>
                      {text}
                    </div>
                  ))}
                </div>

                <div className="rounded-3xl bg-[#FAF7F2] border border-[#e8e0d4] h-48 flex items-center justify-center overflow-hidden relative">
                   {/* Decorative map background placeholder */}
                   <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')]" />
                   <div className="text-center relative z-10">
                    <MapPin className="w-7 h-7 text-[#2c5545] mx-auto mb-3 stroke-[1.5]" />
                    <p className="text-[14px] font-semibold text-[#1a1a18]">22 Clifton Lane</p>
                    <p className="text-[12px] text-[#7a7168]">Karachi, Pakistan</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="bg-[#05150e] pt-20 pb-8 text-white font-sans border-t border-[#05150e]">
          <div className="mx-auto max-w-[1560px] px-6 md:px-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 mb-20">
              
              {/* Left Column */}
              <div className="flex flex-col gap-6">
                <h3 className="text-xl md:text-2xl font-bold max-w-[300px] leading-tight">
                  Stay updated with Flourish Salon experts
                </h3>
                <div className="relative w-full max-w-[280px]">
                  <input 
                    type="email" 
                    placeholder="Enter email"
                    className="w-full bg-white text-black h-11 rounded-full pl-5 pr-12 text-[13px] focus:outline-none"
                  />
                  <button className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-black hover:bg-black/5 transition-colors">
                    <ArrowRight className="w-3.5 h-3.5 -rotate-45" />
                  </button>
                </div>
              </div>

              {/* Middle Column */}
              <div className="flex flex-col items-start md:items-center md:text-center gap-3">
                <p className="text-sm font-semibold">Speak with our experts</p>
                <p className="text-3xl md:text-[2.5rem] font-bold tracking-tight my-1">(888) 1234-567</p>
                <p className="text-[13px] text-white/80">info@flourishsalon.com</p>
                <div className="flex gap-3 mt-4">
                  <a href="#" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    {/* Facebook Icon */}
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                  </a>
                  <a href="#" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    {/* Instagram Icon */}
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col md:items-end">
                <div className="w-full max-w-[240px]">
                  <p className="text-[15px] font-semibold mb-6">Useful links</p>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-[13px] text-white/80">
                    <a href="#contact" className="hover:text-white transition-colors">Booking</a>
                    <a href="#" className="hover:text-white transition-colors">Privacy</a>
                    <a href="#" className="hover:text-white transition-colors">Terms</a>
                    <Link href="/login" className="hover:text-white transition-colors">Admin</Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6 flex justify-center text-[12px] text-white/50">
              <p>Designed by <span className="text-white hover:underline cursor-pointer">Flourish Salon Pro</span>, Powered by <span className="text-white hover:underline cursor-pointer">Next.js</span></p>
            </div>
          </div>
        </footer>
      </>)}

      {/* ═══════════════════════ AUTH MODAL ═══════════════════════ */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="overflow-hidden rounded-[32px] border-0 bg-[#FAF7F2] p-0 shadow-[0_30px_90px_rgba(5,21,14,0.28)] sm:max-w-[460px]">
          <div className="relative overflow-hidden bg-[#05150e] px-8 pb-8 pt-9">
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }}
            />
            <DialogHeader className="relative z-10">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#485341] shadow-lg shadow-black/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <DialogTitle className="font-sans text-[30px] font-bold tracking-tight text-white">
                {authMode === "login" ? "Sign in to book" : "Create your account"}
              </DialogTitle>
              <DialogDescription className="mt-2 text-[14px] leading-relaxed text-white/60">
                {authMode === "login"
                  ? "Log in to reserve your stylist, hold a live slot, and confirm your appointment."
                  : "Create a client profile so your booking details stay safe and easy to manage."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.form
                key={authMode}
                onSubmit={handleBookingAuth}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="space-y-4"
              >
                {authMode === "signup" && (
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-[#1a1a18]">Full name</label>
                    <Input
                      value={authName}
                      onChange={(event) => setAuthName(event.target.value)}
                      placeholder="Ayesha Khan"
                      required
                      className="h-12 rounded-2xl border-[#e0d8cc] bg-white px-4 text-[14px] focus-visible:ring-[#2c5545]"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#1a1a18]">Email address</label>
                  <Input
                    type="email"
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    className="h-12 rounded-2xl border-[#e0d8cc] bg-white px-4 text-[14px] focus-visible:ring-[#2c5545]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#1a1a18]">Password</label>
                  <div className="relative">
                    <Input
                      type={showAuthPassword ? "text" : "password"}
                      value={authPassword}
                      onChange={(event) => setAuthPassword(event.target.value)}
                      placeholder="Enter your password"
                      required
                      minLength={6}
                      className="h-12 rounded-2xl border-[#e0d8cc] bg-white px-4 pr-12 text-[14px] focus-visible:ring-[#2c5545]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthPassword((visible) => !visible)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7a7168] transition-colors hover:text-[#1a1a18]"
                      aria-label={showAuthPassword ? "Hide password" : "Show password"}
                    >
                      {showAuthPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={authSubmitting}
                  className="h-12 w-full rounded-2xl bg-[#2c5545] text-[14px] font-semibold text-white shadow-lg shadow-[#2c5545]/20 hover:bg-[#244638]"
                >
                  {authSubmitting ? "Please wait..." : authMode === "login" ? "Login" : "Create Account"}
                  {!authSubmitting && <ArrowRight className="h-4 w-4" />}
                </Button>
              </motion.form>
            </AnimatePresence>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e0d8cc]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9a9084]">or</span>
              <div className="h-px flex-1 bg-[#e0d8cc]" />
            </div>

            <motion.button
              type="button"
              onClick={signInWithGoogle}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#e0d8cc] bg-white px-5 text-[14px] font-semibold text-[#1a1a18] shadow-[0_1px_4px_rgba(0,0,0,0.03)] transition-colors hover:border-[#cfc4b4] hover:bg-[#f7f1e8]"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0ebe3] text-[12px] font-black text-[#2c5545]">G</span>
              Sign in with Google
            </motion.button>

            <button
              type="button"
              onClick={() => setAuthMode((mode) => mode === "login" ? "signup" : "login")}
              className="mt-6 w-full text-center text-[13px] font-medium text-[#7a7168] transition-colors hover:text-[#2c5545]"
            >
              {authMode === "login" ? "Don't have an account? Create an Account" : "Already have an account? Log in"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`html { scroll-behavior: smooth; }`}</style>
    </main>
  );
}
