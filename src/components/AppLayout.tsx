import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
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
  {
    label: "System",
    items: [
      { title: "Settings", icon: Settings, path: "/admin/settings" },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { profile, role, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

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
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-350 ease-out-expo lg:translate-x-0 lg:static lg:z-auto",
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

        {/* User + Sign Out */}
        <div className="p-3 border-t border-sidebar-border flex-shrink-0 space-y-1">
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
            {/* Notification bell */}
            <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-fast">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-card" />
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-border mx-1" />

            {/* User chip */}
            <div className="flex items-center gap-2.5 cursor-default">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">{initials}</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground leading-none mb-0.5">
                  {profile?.full_name || "User"}
                </p>
                <p className="text-[11px] text-muted-foreground capitalize leading-none">{role || "Staff"}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
            </div>
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
