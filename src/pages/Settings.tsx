import { useState } from "react";
import { Save, Bell, MessageSquare, CreditCard, ShieldCheck, Building2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function SettingsSection({ title, icon: Icon, children, className }: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={cn("bg-card rounded-2xl border border-border p-6 shadow-card", className)}>
      <div className="flex items-center gap-2.5 mb-5 pb-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary stroke-[1.5]" />
        </div>
        <h3 className="font-editorial text-xl text-foreground tracking-tight">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground block">{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({ title, description, checked, onChange }: {
  title: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/60 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const [salonName, setSalonName] = useState("Glamour Studio");
  const [phone, setPhone] = useState("0300-1234567");
  const [address, setAddress] = useState("Shop 12, F-7 Markaz, Islamabad");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [notifications, setNotifications] = useState({ appointments: true, payroll: true, daily: false });

  const handleSave = () => toast.success("Settings saved successfully!");

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your salon, notifications, and billing preferences." eyebrow="System" />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* Main column */}
        <div className="space-y-6">
          {/* Salon info */}
          <SettingsSection title="Salon Information" icon={Building2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FieldRow label="Salon Name">
                <Input value={salonName} onChange={(e) => setSalonName(e.target.value)} />
              </FieldRow>
              <FieldRow label="Phone Number">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </FieldRow>
              <div className="md:col-span-2">
                <FieldRow label="Address">
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </FieldRow>
              </div>
            </div>
            <div className="pt-5 mt-5 border-t border-border">
              <Button onClick={handleSave}>
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </SettingsSection>

          {/* WhatsApp */}
          <SettingsSection title="WhatsApp Reminders" icon={MessageSquare}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Automated reminders</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Send appointment reminders and no-show nudges via WhatsApp
                </p>
              </div>
              <Switch
                checked={whatsappEnabled}
                onCheckedChange={(v) => {
                  setWhatsappEnabled(v);
                  toast.success(v ? "WhatsApp reminders enabled" : "WhatsApp reminders disabled");
                }}
              />
            </div>
            {whatsappEnabled && (
              <div className="mt-5 p-4 bg-muted/60 rounded-xl border border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.1em] mb-2.5">Preview</p>
                <p className="text-sm text-foreground bg-card rounded-lg p-4 border border-border leading-relaxed">
                  Reminder: Your appointment at <strong>{salonName}</strong> is scheduled for{" "}
                  <strong>5:00 PM</strong> today. We look forward to seeing you. ✨
                </p>
              </div>
            )}
          </SettingsSection>

          {/* Notifications */}
          <SettingsSection title="Notifications" icon={Bell}>
            <ToggleRow
              title="New appointment alerts"
              description="Get notified when a new booking is made"
              checked={notifications.appointments}
              onChange={(v) => { setNotifications({ ...notifications, appointments: v }); toast.success(v ? "Appointment alerts enabled" : "Disabled"); }}
            />
            <ToggleRow
              title="Payroll and expense alerts"
              description="Get notified when payroll or expense records need review"
              checked={notifications.payroll}
              onChange={(v) => { setNotifications({ ...notifications, payroll: v }); toast.success(v ? "Finance alerts enabled" : "Disabled"); }}
            />
            <ToggleRow
              title="Daily summary"
              description="Receive end-of-day revenue summary"
              checked={notifications.daily}
              onChange={(v) => { setNotifications({ ...notifications, daily: v }); toast.success(v ? "Daily summary enabled" : "Disabled"); }}
            />
          </SettingsSection>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          {/* Plan */}
          <SettingsSection title="SaaS Plan" icon={CreditCard}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-editorial text-2xl text-foreground">Scale</span>
              <Badge variant="sage">Active</Badge>
            </div>
            <div className="space-y-3 text-sm border-t border-border pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seats</span>
                <span className="font-medium">12 / 15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Locations</span>
                <span className="font-medium">2 / 3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trial ends</span>
                <span className="font-medium text-warning">Jul 21, 2026</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-5">Manage Billing</Button>
          </SettingsSection>

          {/* Security */}
          <SettingsSection title="Security" icon={ShieldCheck}>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success mt-2 flex-shrink-0" />
                <p>Role-based access enabled via Supabase user roles.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success mt-2 flex-shrink-0" />
                <p>Express API routes ready for auth middleware and audit logs.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mt-2 flex-shrink-0" />
                <p>Billing webhooks — integration pending.</p>
              </div>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
