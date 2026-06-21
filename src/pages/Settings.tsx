import { useState } from "react";
import { Save, Bell, MessageSquare, CreditCard, ShieldCheck, Building2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SettingsPage() {
  const [salonName, setSalonName] = useState("Glamour Studio");
  const [phone, setPhone] = useState("0300-1234567");
  const [address, setAddress] = useState("Shop 12, F-7 Markaz, Islamabad");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [notifications, setNotifications] = useState({ appointments: true, stock: true, daily: false });

  const handleSave = () => {
    toast.success("Settings saved successfully!");
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your salon, team, billing, and automation preferences" />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <div className="space-y-6">
          <section className="bg-card rounded-xl border border-border p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Salon Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Salon Name</label>
                <Input value={salonName} onChange={(e) => setSalonName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-foreground mb-1.5 block">Address</label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleSave} className="mt-5">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </section>

          <section className="bg-card rounded-xl border border-border p-6 shadow-card">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">WhatsApp Reminders</h3>
                  <p className="text-xs text-muted-foreground">Send automated appointment reminders and no-show nudges</p>
                </div>
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
              <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Preview Message</p>
                <p className="text-sm text-foreground bg-card rounded-lg p-3 border border-border">
                  Reminder: Your appointment at <strong>{salonName}</strong> is at <strong>5:00 PM</strong> today. We look forward to seeing you.
                </p>
              </div>
            )}
          </section>

          <section className="bg-card rounded-xl border border-border p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </h3>
            <div className="space-y-4">
              {[
                ["appointments", "New appointment alerts", "Get notified when a new booking is made"],
                ["stock", "Low stock alerts", "Alert when inventory is running low"],
                ["daily", "Daily summary", "Receive end-of-day revenue summary"],
              ].map(([key, title, description]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    checked={notifications[key as keyof typeof notifications]}
                    onCheckedChange={(v) => {
                      setNotifications({ ...notifications, [key]: v });
                      toast.success(v ? `${title} enabled` : `${title} disabled`);
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-card rounded-xl border border-border p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                SaaS Plan
              </h3>
              <Badge>Scale</Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Seats</span><span className="font-medium">12 / 15</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Locations</span><span className="font-medium">2 / 3</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Trial ends</span><span className="font-medium">Jul 21, 2026</span></div>
            </div>
            <Button variant="outline" className="w-full mt-5">Manage Billing</Button>
          </section>

          <section className="bg-card rounded-xl border border-border p-6 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Security
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Role-based access is enabled through Supabase user roles.</p>
              <p>Express API routes are ready for auth middleware, audit logs, and billing webhooks.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
