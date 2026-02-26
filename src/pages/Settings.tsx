import { useState } from "react";
import { Save, Bell, MessageSquare } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const [salonName, setSalonName] = useState("Glamour Studio");
  const [phone, setPhone] = useState("0300-1234567");
  const [address, setAddress] = useState("Shop 12, F-7 Markaz, Islamabad");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your salon preferences" />

      <div className="max-w-2xl space-y-6">
        {/* Salon Info */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Salon Information</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Salon Name</label>
              <Input value={salonName} onChange={(e) => setSalonName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Address</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <Button>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* WhatsApp Reminders */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">WhatsApp Reminders</h3>
                <p className="text-xs text-muted-foreground">Send automated appointment reminders</p>
              </div>
            </div>
            <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
          </div>

          {whatsappEnabled && (
            <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Preview Message</p>
              <p className="text-sm text-foreground bg-card rounded-lg p-3 border border-border">
                📋 Reminder: Your appointment at <strong>{salonName}</strong> is at <strong>5:00 PM</strong> today. We look forward to seeing you! ✨
              </p>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </h3>
          <div className="space-y-4">
            {[
              { label: "New appointment alerts", desc: "Get notified when a new booking is made", default: true },
              { label: "Low stock alerts", desc: "Alert when inventory is running low", default: true },
              { label: "Daily summary", desc: "Receive end-of-day revenue summary", default: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch defaultChecked={item.default} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
