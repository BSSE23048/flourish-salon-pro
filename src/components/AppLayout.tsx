import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { io, Socket } from "socket.io-client";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCog,
  Scissors,
  Receipt,
  Wallet,
  BarChart3,
  Settings,
  ClipboardCheck,
  Menu,
  X,
  LogOut,
  Bell,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { API_URL, SOCKET_OPTIONS } from "@/lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const navGroups = [
  {
    label: "Operations",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/admin" },
      { title: "Appointments", icon: Calendar, path: "/admin/appointments" },
      { title: "Customers", icon: Users, path: "/admin/customers" },
    ],
  },
  {
    label: "Team",
    items: [
      { title: "Staff", icon: UserCog, path: "/admin/staff" },
      { title: "Attendance", icon: ClipboardCheck, path: "/admin/attendance" },
      { title: "Payroll", icon: Wallet, path: "/admin/payroll" },
    ],
  },
  {
    label: "Business",
    items: [
      { title: "Services", icon: Scissors, path: "/admin/services" },
      { title: "Billing", icon: Receipt, path: "/admin/billing" },
      { title: "Reports", icon: BarChart3, path: "/admin/reports" },
    ],
  },
];

type Notification = { id: string; title: string; message: string; read: boolean; createdAt: string };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();
  const { profile, role, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications`, { headers: { "x-role": "admin" } });
      const data = await res.json();
      if (res.ok) setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const socket: Socket = io(API_URL, SOCKET_OPTIONS);
    socket.on("notifications:update", loadNotifications);
    socket.on("appointments:update", loadNotifications);
    socket.on("staff:update", loadNotifications);
    socket.on("payroll:update", loadNotifications);
    return () => {
      socket.disconnect();
    };
  }, [loadNotifications]);

  const unreadNotifications = useMemo(() => notifications.filter((item) => !item.read), [notifications]);

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SA";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-screen w-64 flex flex-col justify-between transition-transform duration-350 ease-out-expo lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto",
          "bg-sidebar border-r border-sidebar-border",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sidebar-primary border border-sidebar-primary flex items-center justify-center shadow-md">
              <Sparkles className="w-[18px] h-[18px] text-white" />
            </div>
            <div>
              <span className="font-sans font-bold text-[22px] text-sidebar-foreground tracking-tight leading-none">
                Flourish
              </span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/50 leading-none mt-0.5">
                Salon Pro
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-fast"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] uppercase tracking-[0.18em] font-medium text-sidebar-foreground/40 px-3 mb-2">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    item.path === "/admin"
                      ? router.pathname === "/admin"
                      : router.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-full text-[14.5px] transition-all duration-200",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-4 h-4 flex-shrink-0 stroke-[1.5]",
                          isActive ? "opacity-100" : "opacity-60"
                        )}
                      />
                      {item.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3 flex-shrink-0 space-y-2">
          <Link
            href="/admin/settings"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-full text-[14.5px] transition-all duration-200",
              router.pathname.startsWith("/admin/settings")
                ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <Settings className="w-4 h-4 flex-shrink-0 stroke-[1.5]" />
            Settings
          </Link>
          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-sidebar-primary">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate leading-none mb-0.5">
                {profile?.full_name || "User"}
              </p>
              <p className="text-[11px] text-sidebar-foreground/50 capitalize leading-none">
                {role || "Staff"}
              </p>
            </div>
          </div>
          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full transition-fast"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 stroke-[1.5]" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-fast"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Breadcrumb / Page title will be provided by children */}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-fast">
                  <Bell className="w-4.5 h-4.5" />
                  {unreadNotifications.length > 0 && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-card" />}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="border-b border-border p-4">
                  <p className="text-sm font-semibold">Notifications</p>
                  <p className="text-xs text-muted-foreground">{unreadNotifications.length} unread alerts</p>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No alerts yet.</p>
                  ) : notifications.slice(0, 8).map((item) => (
                    <div key={item.id} className={cn("rounded-lg p-3 text-sm", item.read ? "text-muted-foreground" : "bg-primary/10 text-foreground")}>
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.message}</p>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Divider */}
            <div className="w-px h-6 bg-border mx-1" />

            {/* User chip */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">{initials}</span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-foreground leading-none mb-0.5">
                      {profile?.full_name || "User"}
                    </p>
                    <p className="text-[11px] text-muted-foreground capitalize leading-none">{role || "Staff"}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="px-4 lg:px-8 py-8 max-w-[1600px] mx-auto animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
