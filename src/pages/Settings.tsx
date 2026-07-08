import { useCallback, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Bell, Building2, Clock, Globe2, Loader2, Mail, MapPin, Phone, RefreshCw, Save, Send } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { API_UNAVAILABLE_MESSAGE, API_URL, SOCKET_OPTIONS } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type NotificationSettings = {
  appointments: boolean;
  payroll: boolean;
  dailySummary: boolean;
  leaveRequests: boolean;
};

type GmailAlertSettings = {
  enabled: boolean;
  bookingConfirmations: boolean;
  staffUpdates: boolean;
  senderName: string;
  replyTo: string;
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
  gmailAlerts: GmailAlertSettings;
  notifications: NotificationSettings;
  updatedAt?: string;
};

type SettingsResponse = {
  tenant: { id: string; name: string; plan: string };
  settings: SalonSettings;
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
  gmailAlerts: {
    enabled: true,
    bookingConfirmations: true,
    staffUpdates: false,
    senderName: "Flourish Salon Pro",
    replyTo: "",
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
];

async function getApiError(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
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

function FieldRow({ id, label, icon: Icon, children }: { id: string; label: string; icon?: React.ElementType; children: React.ReactNode }) {
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

function ToggleRow({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/settings`, { headers: { "x-role": "admin" } });
      if (!res.ok) throw new Error(await getApiError(res, "Could not load settings"));
      const data: SettingsResponse = await res.json();
      setSettings({
        ...emptySettings,
        ...data.settings,
        gmailAlerts: { ...emptySettings.gmailAlerts, ...data.settings.gmailAlerts },
        notifications: { ...emptySettings.notifications, ...data.settings.notifications },
      });
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
    return () => {
      socket.disconnect();
    };
  }, [loadSettings]);

  const updateSettings = (patch: Partial<SalonSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const updateGmailAlerts = (patch: Partial<GmailAlertSettings>) => {
    setSettings((current) => ({ ...current, gmailAlerts: { ...current.gmailAlerts, ...patch } }));
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
      setSettings({ ...emptySettings, ...data.settings, gmailAlerts: { ...emptySettings.gmailAlerts, ...data.settings.gmailAlerts } });
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof TypeError ? API_UNAVAILABLE_MESSAGE : error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage salon profile, booking rules, Gmail alerts, and operational notifications."
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SettingsSection title="Salon Profile" description="These details appear across receipts, emails, and admin screens." icon={Building2}>
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
                <SelectTrigger id="timezone"><SelectValue /></SelectTrigger>
                <SelectContent>{timezoneOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow id="currency" label="Currency">
              <Select value={settings.currency} onValueChange={(value) => updateSettings({ currency: value })} disabled={loading}>
                <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                <SelectContent>{currencyOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
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

        <SettingsSection title="Gmail Notification Alerts" description="Configure email notifications for automated booking confirmations and team updates." icon={Mail}>
          <ToggleRow title="Enable Gmail alerts" description="Prepare outgoing Gmail notifications from the backend email stub." checked={settings.gmailAlerts.enabled} onChange={(value) => updateGmailAlerts({ enabled: value })} />
          <ToggleRow title="Booking confirmations" description="Send confirmation emails after a client creates an appointment." checked={settings.gmailAlerts.bookingConfirmations} onChange={(value) => updateGmailAlerts({ bookingConfirmations: value })} />
          <ToggleRow title="Staff update alerts" description="Notify staff when assigned appointments change." checked={settings.gmailAlerts.staffUpdates} onChange={(value) => updateGmailAlerts({ staffUpdates: value })} />
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <FieldRow id="senderName" label="Sender name" icon={Send}>
              <Input id="senderName" value={settings.gmailAlerts.senderName} onChange={(event) => updateGmailAlerts({ senderName: event.target.value })} disabled={loading || !settings.gmailAlerts.enabled} />
            </FieldRow>
            <FieldRow id="replyTo" label="Reply-to email" icon={Mail}>
              <Input id="replyTo" type="email" value={settings.gmailAlerts.replyTo} onChange={(event) => updateGmailAlerts({ replyTo: event.target.value })} disabled={loading || !settings.gmailAlerts.enabled} />
            </FieldRow>
          </div>
        </SettingsSection>

        <SettingsSection title="Admin Notifications" description="Choose which operational events should surface admin alerts." icon={Bell}>
          <ToggleRow title="New appointment alerts" description="Alert admins when a new customer booking is created." checked={settings.notifications.appointments} onChange={(value) => updateNotifications({ appointments: value })} />
          <ToggleRow title="Payroll alerts" description="Alert admins when salary status or adjustments need review." checked={settings.notifications.payroll} onChange={(value) => updateNotifications({ payroll: value })} />
          <ToggleRow title="Leave request alerts" description="Alert admins when staff submit leave requests." checked={settings.notifications.leaveRequests} onChange={(value) => updateNotifications({ leaveRequests: value })} />
          <ToggleRow title="Daily summary" description="Prepare an end-of-day revenue and operations summary." checked={settings.notifications.dailySummary} onChange={(value) => updateNotifications({ dailySummary: value })} />
        </SettingsSection>
      </div>
    </div>
  );
}
