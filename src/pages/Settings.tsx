import { useCallback, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { API_UNAVAILABLE_MESSAGE, API_URL, SOCKET_OPTIONS } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type NotificationSettings = {
  appointments: boolean;
  payroll: boolean;
  dailySummary: boolean;
  leaveRequests: boolean;
};

type SalonSettings = {
  id: string;
  salonName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  timezone: string;
  currency: string;
  openingTime: string;
  closingTime: string;
  bookingCutoffMinutes: number;
  cancellationCutoffMinutes: number;
  whatsapp: {
    enabled: boolean;
    reminderHours: number;
    template: string;
  };
  notifications: NotificationSettings;
  updatedAt?: string;
};

type Tenant = {
  id: string;
  name: string;
  plan: string;
  trialEndsAt?: string;
  locations?: number;
  seats?: number;
};

type Plan = {
  id: string;
  name: string;
  priceMonthly: number;
  seats: number;
  locations: number;
  features: string[];
};

type SettingsResponse = {
  tenant: Tenant;
  settings: SalonSettings;
  plans: Plan[];
  counts: {
    staff: number;
    services: number;
    locations: number;
    seats: number;
  };
};

type HealthResponse = {
  ok: boolean;
  database?: {
    connected: boolean;
    mode: string;
    tables: Record<string, { ok: boolean; table: string; error?: string | null }>;
  };
};

const emptySettings: SalonSettings = {
  id: "salon-settings",
  salonName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  timezone: "Asia/Karachi",
  currency: "PKR",
  openingTime: "10:00",
  closingTime: "02:00",
  bookingCutoffMinutes: 120,
  cancellationCutoffMinutes: 240,
  whatsapp: {
    enabled: false,
    reminderHours: 24,
    template: "Reminder: your appointment at {salon} is scheduled for {time}.",
  },
  notifications: {
    appointments: true,
    payroll: true,
    dailySummary: false,
    leaveRequests: true,
  },
};

const timezoneOptions = [
  { value: "Asia/Karachi", label: "Pakistan Standard Time" },
  { value: "Europe/London", label: "United Kingdom" },
  { value: "Asia/Dubai", label: "Gulf Standard Time" },
];

const currencyOptions = [
  { value: "PKR", label: "PKR - Pakistani Rupee" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "USD", label: "USD - US Dollar" },
];

async function getApiError(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-card">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="font-editorial text-xl tracking-tight">{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}

function FieldRow({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5 text-muted-foreground" /> : null}
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SalonSettings>(emptySettings);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [counts, setCounts] = useState<SettingsResponse["counts"]>({ staff: 0, services: 0, locations: 0, seats: 0 });
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const currentPlan = useMemo(() => {
    if (!tenant) return null;
    return plans.find((plan) => plan.name.toLowerCase() === tenant.plan.toLowerCase() || plan.id === selectedPlanId) || null;
  }, [plans, selectedPlanId, tenant]);

  const databaseReady = Boolean(health?.database?.connected);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, healthRes] = await Promise.all([
        fetch(`${API_URL}/api/settings`, { headers: { "x-role": "admin" } }),
        fetch(`${API_URL}/api/health`),
      ]);
      if (!settingsRes.ok) throw new Error(await getApiError(settingsRes, "Could not load settings"));
      const settingsData: SettingsResponse = await settingsRes.json();
      const healthData: HealthResponse = await healthRes.json();
      setSettings({ ...emptySettings, ...settingsData.settings });
      setTenant(settingsData.tenant);
      setPlans(settingsData.plans || []);
      setCounts(settingsData.counts || { staff: 0, services: 0, locations: 0, seats: 0 });
      setHealth(healthData);
      const matchingPlan = (settingsData.plans || []).find((plan) => plan.name.toLowerCase() === settingsData.tenant.plan.toLowerCase());
      setSelectedPlanId(matchingPlan?.id || settingsData.plans?.[0]?.id || "");
    } catch (error) {
      toast.error(error instanceof TypeError ? API_UNAVAILABLE_MESSAGE : error instanceof Error ? error.message : "Could not load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const socket: Socket = io(API_URL, SOCKET_OPTIONS);
    socket.on("settings:update", loadSettings);
    socket.on("staff:update", loadSettings);
    socket.on("services:update", loadSettings);
    return () => {
      socket.disconnect();
    };
  }, [loadSettings]);

  const updateSettings = (patch: Partial<SalonSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const updateWhatsapp = (patch: Partial<SalonSettings["whatsapp"]>) => {
    setSettings((current) => ({ ...current, whatsapp: { ...current.whatsapp, ...patch } }));
  };

  const updateNotifications = (patch: Partial<NotificationSettings>) => {
    setSettings((current) => ({ ...current, notifications: { ...current.notifications, ...patch } }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(await getApiError(res, "Could not save settings"));
      const data = await res.json();
      setSettings({ ...emptySettings, ...data.settings });
      setTenant(data.tenant);
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof TypeError ? API_UNAVAILABLE_MESSAGE : error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const startCheckout = async () => {
    if (!selectedPlanId) return;
    setCheckingOut(true);
    try {
      const res = await fetch(`${API_URL}/api/subscription/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      if (!res.ok) throw new Error(await getApiError(res, "Could not start checkout"));
      const data = await res.json();
      toast.success("Checkout link ready");
      if (data.checkoutUrl) window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof TypeError ? API_UNAVAILABLE_MESSAGE : error instanceof Error ? error.message : "Could not start checkout");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage salon profile, booking rules, reminders, notifications, plan usage, and database health."
        eyebrow="System"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadSettings} disabled={loading || saving}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button onClick={saveSettings} disabled={saving || loading}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Settings
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SettingsSection title="Salon Profile" description="These details appear across receipts, reminders, and admin screens." icon={Building2}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FieldRow id="salonName" label="Salon name" icon={Building2}>
                <Input id="salonName" value={settings.salonName} onChange={(event) => updateSettings({ salonName: event.target.value })} disabled={loading} />
              </FieldRow>
              <FieldRow id="phone" label="Phone number" icon={Phone}>
                <Input id="phone" value={settings.phone} onChange={(event) => updateSettings({ phone: event.target.value })} disabled={loading} />
              </FieldRow>
              <FieldRow id="email" label="Business email" icon={Mail}>
                <Input id="email" type="email" value={settings.email} onChange={(event) => updateSettings({ email: event.target.value })} disabled={loading} />
              </FieldRow>
              <FieldRow id="city" label="City" icon={MapPin}>
                <Input id="city" value={settings.city} onChange={(event) => updateSettings({ city: event.target.value })} disabled={loading} />
              </FieldRow>
              <div className="md:col-span-2">
                <FieldRow id="address" label="Address" icon={MapPin}>
                  <Input id="address" value={settings.address} onChange={(event) => updateSettings({ address: event.target.value })} disabled={loading} />
                </FieldRow>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="Booking Rules" description="Control business hours and booking safety windows used by the public booking flow." icon={Clock}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FieldRow id="timezone" label="Timezone" icon={Globe2}>
                <Select value={settings.timezone} onValueChange={(value) => updateSettings({ timezone: value })} disabled={loading}>
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow id="currency" label="Currency" icon={CreditCard}>
                <Select value={settings.currency} onValueChange={(value) => updateSettings({ currency: value })} disabled={loading}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow id="openingTime" label="Opening time">
                <Input id="openingTime" type="time" value={settings.openingTime} onChange={(event) => updateSettings({ openingTime: event.target.value })} disabled={loading} />
              </FieldRow>
              <FieldRow id="closingTime" label="Closing time">
                <Input id="closingTime" type="time" value={settings.closingTime} onChange={(event) => updateSettings({ closingTime: event.target.value })} disabled={loading} />
              </FieldRow>
              <FieldRow id="bookingCutoff" label="Booking cutoff minutes">
                <Input id="bookingCutoff" type="number" min="0" value={settings.bookingCutoffMinutes} onChange={(event) => updateSettings({ bookingCutoffMinutes: Number(event.target.value) })} disabled={loading} />
              </FieldRow>
              <FieldRow id="cancelCutoff" label="Cancellation cutoff minutes">
                <Input id="cancelCutoff" type="number" min="0" value={settings.cancellationCutoffMinutes} onChange={(event) => updateSettings({ cancellationCutoffMinutes: Number(event.target.value) })} disabled={loading} />
              </FieldRow>
            </div>
          </SettingsSection>

          <SettingsSection title="WhatsApp Reminders" description="Prepare reminder text for customers before their appointments." icon={MessageSquare}>
            <ToggleRow
              title="Automated reminders"
              description="Enable reminder workflow for upcoming appointments."
              checked={settings.whatsapp.enabled}
              onChange={(value) => updateWhatsapp({ enabled: value })}
            />
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-[180px_1fr]">
              <FieldRow id="reminderHours" label="Send before">
                <Input id="reminderHours" type="number" min="1" value={settings.whatsapp.reminderHours} onChange={(event) => updateWhatsapp({ reminderHours: Number(event.target.value) })} disabled={loading || !settings.whatsapp.enabled} />
              </FieldRow>
              <FieldRow id="template" label="Reminder template">
                <Textarea id="template" value={settings.whatsapp.template} onChange={(event) => updateWhatsapp({ template: event.target.value })} disabled={loading || !settings.whatsapp.enabled} />
              </FieldRow>
            </div>
            <div className="mt-5 rounded-xl border border-border bg-muted/50 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Preview</p>
              <p className="rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-foreground">
                {settings.whatsapp.template
                  .replace("{salon}", settings.salonName || "your salon")
                  .replace("{time}", "5:00 PM")}
              </p>
            </div>
          </SettingsSection>

          <SettingsSection title="Notifications" description="Choose which admin events should surface alerts." icon={Bell}>
            <ToggleRow title="New appointment alerts" description="Alert admins when a new customer booking is created." checked={settings.notifications.appointments} onChange={(value) => updateNotifications({ appointments: value })} />
            <ToggleRow title="Payroll alerts" description="Alert admins when salary status or adjustments need review." checked={settings.notifications.payroll} onChange={(value) => updateNotifications({ payroll: value })} />
            <ToggleRow title="Leave request alerts" description="Alert admins when staff submit leave requests." checked={settings.notifications.leaveRequests} onChange={(value) => updateNotifications({ leaveRequests: value })} />
            <ToggleRow title="Daily summary" description="Prepare an end-of-day revenue and operations summary." checked={settings.notifications.dailySummary} onChange={(value) => updateNotifications({ dailySummary: value })} />
          </SettingsSection>
        </div>

        <aside className="space-y-6">
          <SettingsSection title="Plan Usage" description="Live usage from staff and service records." icon={CreditCard}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="font-editorial text-2xl text-foreground">{tenant?.plan || "No plan"}</p>
                <p className="text-xs text-muted-foreground">Trial ends {formatDate(tenant?.trialEndsAt)}</p>
              </div>
              <Badge variant="sage">Active</Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between rounded-lg bg-muted/60 px-3 py-2">
                <span className="text-muted-foreground">Staff</span>
                <span className="font-medium">{counts.staff} / {currentPlan?.seats || "Unlimited"}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-muted/60 px-3 py-2">
                <span className="text-muted-foreground">Locations</span>
                <span className="font-medium">{counts.locations || tenant?.locations || 0} / {currentPlan?.locations || "Unlimited"}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-muted/60 px-3 py-2">
                <span className="text-muted-foreground">Services</span>
                <span className="font-medium">{counts.services}</span>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={plans.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.name} - ${plan.priceMonthly}/mo</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" className="w-full" onClick={startCheckout} disabled={!selectedPlanId || checkingOut}>
                {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Open Checkout
              </Button>
            </div>
          </SettingsSection>

          <SettingsSection title="Database Health" description="Supabase operational table status." icon={Database}>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Connection</span>
              <Badge variant={databaseReady ? "sage" : "destructive"}>{databaseReady ? "Connected" : "Needs attention"}</Badge>
            </div>
            <div className="space-y-2">
              {health?.database?.tables ? Object.entries(health.database.tables).map(([key, table]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</span>
                  <span className={cn("flex items-center gap-1.5 font-medium", table.ok ? "text-success" : "text-destructive")}>
                    {table.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {table.ok ? "OK" : "Error"}
                  </span>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">Database status has not loaded yet.</p>
              )}
            </div>
          </SettingsSection>

          <SettingsSection title="Security" description="Controls protecting admin and staff actions." icon={ShieldCheck}>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <p>Staff add, edit, and delete actions require the configured security PIN.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <p>Operational records are written through the Express API using the server-side Supabase secret.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <p>Admin, staff, and customer routes remain separated by role checks.</p>
              </div>
            </div>
          </SettingsSection>
        </aside>
      </div>
    </div>
  );
}
