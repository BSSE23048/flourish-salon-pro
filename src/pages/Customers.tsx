import { useCallback, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { CalendarDays, Clock, Plus, RefreshCw, Search, Star, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import FormDialog from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { API_UNAVAILABLE_MESSAGE, API_URL, SOCKET_OPTIONS } from "@/lib/api";
import { toast } from "sonner";

type Customer = {
  id: string | number;
  name: string;
  phone?: string;
  email?: string;
  totalBookings: number;
  visits: number;
  lastVisitedDate?: string;
  notes?: string;
  vip: boolean;
  createdAt?: string;
  source?: string;
};

function CustomerAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-semibold text-primary">{initials || "CU"}</span>
    </div>
  );
}

function formatDate(value?: string, fallback = "No visits yet") {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function CustomerSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid grid-cols-[minmax(180px,1fr)_120px_90px_120px] gap-4 rounded-xl border border-border/60 p-4">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
          <div className="h-4 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      setLoadError(null);
      const res = await fetch(`${API_URL}/api/customers`, { headers: { "x-role": "admin" } });
      const data = await res.json();
      if (!res.ok) {
        setCustomers(Array.isArray(data.fallback) ? data.fallback : []);
        throw new Error(data.error || "Could not load customers");
      }
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : API_UNAVAILABLE_MESSAGE;
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    const socket: Socket = io(API_URL, SOCKET_OPTIONS);
    socket.on("customers:update", () => loadCustomers());
    return () => { socket.disconnect(); };
  }, [loadCustomers]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-customers")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadCustomers())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => loadCustomers())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCustomers]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(query) ||
      String(customer.email || "").toLowerCase().includes(query) ||
      String(customer.phone || "").includes(query)
    );
  }, [customers, search]);
  const totalBookings = useMemo(() => customers.reduce((sum, customer) => sum + Number(customer.totalBookings || 0), 0), [customers]);
  const totalVisits = useMemo(() => customers.reduce((sum, customer) => sum + Number(customer.visits || 0), 0), [customers]);
  const recentlyVisited = useMemo(() => customers.filter((customer) => customer.lastVisitedDate).length, [customers]);

  const addCustomer = async (data: Record<string, string>) => {
    try {
      const res = await fetch(`${API_URL}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not add customer");
      toast.success(`${body.name || data.name} added to customers.`);
      await loadCustomers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add customer");
    }
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Live customer profiles with booking totals, real visit counts, and last visit dates."
        eyebrow="Operations"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadCustomers} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button onClick={() => setShowAdd(true)}><Plus />Add Customer</Button>
          </div>
        }
      />

      <FormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Customer"
        description="Add a walk-in or manually managed customer record."
        fields={[
          { key: "name",  label: "Full Name",  required: true, placeholder: "e.g. Ayesha Khan" },
          { key: "phone", label: "Phone",      type: "tel",    placeholder: "0300-1234567" },
          { key: "email", label: "Email",      type: "email",  placeholder: "client@email.com" },
          { key: "notes", label: "Notes",      type: "textarea", placeholder: "Preferences, allergies, notes..." },
        ]}
        onSubmit={addCustomer}
        submitLabel="Add Customer"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Customer Profiles", value: customers.length, icon: Users, helper: "live CRM records" },
          { label: "Total Bookings", value: totalBookings, icon: CalendarDays, helper: "all appointment statuses" },
          { label: "Completed Visits", value: totalVisits, icon: Clock, helper: `${recentlyVisited} customers visited at least once` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <stat.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="font-editorial text-4xl text-foreground">{stat.value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{stat.helper}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground stroke-[1.5]" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11"
            />
          </div>
          <div className="text-xs text-muted-foreground flex-shrink-0">
            {filtered.length} registered customers
          </div>
          {loadError && (
            <Badge variant="warning" className="ml-auto">Using fallback data</Badge>
          )}
        </div>

        {loading ? (
          <CustomerSkeleton />
        ) : (
          <DataTable
            columns={[
              {
                key: "name", label: "Customer",
                render: (row) => (
                  <div className="flex items-center gap-3">
                    <CustomerAvatar name={row.name as string} />
                    <div>
                      <p className="font-medium text-foreground leading-none">{row.name as string}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{(row.email as string) || "No email"}</p>
                    </div>
                  </div>
                ),
              },
              { key: "phone", label: "Phone", render: (row) => <span className="text-muted-foreground font-mono text-xs">{(row.phone as string) || "Not added"}</span> },
              {
                key: "totalBookings", label: "Bookings / Visits",
                render: (row) => (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">Bookings: {row.totalBookings as number}</span>
                    <span className="text-muted-foreground">|</span>
                    <span className="font-medium text-primary">Visits: {row.visits as number}</span>
                    {(row.vip as boolean) && (
                      <Badge variant="warning">
                        <Star className="w-2.5 h-2.5" />
                        VIP
                      </Badge>
                    )}
                  </div>
                ),
              },
              { key: "createdAt", label: "Registered", render: (row) => <span className="text-muted-foreground">{formatDate(row.createdAt as string, "Not recorded")}</span> },
              { key: "lastVisitedDate", label: "Last Visited", render: (row) => <span className="text-muted-foreground">{formatDate(row.lastVisitedDate as string)}</span> },
              {
                key: "notes", label: "Notes",
                render: (row) => (
                  <span className="text-muted-foreground text-xs max-w-[180px] truncate block">
                    {(row.notes as string) || "-"}
                  </span>
                ),
              },
            ]}
            data={filtered as unknown as Record<string, unknown>[]}
            emptyIcon={<Users />}
            emptyMessage={search ? "No customers match your search" : "No customers registered yet"}
          />
        )}
      </div>
    </div>
  );
}
