import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, Download, Plus, Receipt, Smartphone, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_UNAVAILABLE_MESSAGE, API_URL, getAuthHeaders } from "@/lib/api";
import { toast } from "sonner";

type Service = { id: string; name: string; price: number };
type Staff = { id: string; name: string };
type InvoiceItem = { serviceId: string; name: string; staffId: string; quantity: number; unitPrice: number; total: number; custom: boolean };
type Invoice = { id: string; date: string; customer: string; items: InvoiceItem[]; subtotal: number; discount: number; total: number; payment: string; status: string };

const paymentIcons: Record<string, React.ReactNode> = {
  Cash: <Banknote className="h-3.5 w-3.5" />,
  Card: <CreditCard className="h-3.5 w-3.5" />,
  JazzCash: <Smartphone className="h-3.5 w-3.5" />,
  Easypaisa: <Smartphone className="h-3.5 w-3.5" />,
};

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

function downloadInvoice(invoice: Invoice) {
  const lines = invoice.items.map((item) =>
    `${item.name} x ${item.quantity} @ ${money(item.unitPrice)} = ${money(item.total)}`
  ).join("\n");
  const discountLine = invoice.discount > 0 ? `\nDiscount:       -${money(invoice.discount)}` : "";
  const content = `
=======================================
         GLAMOUR STUDIO
       INVOICE ${invoice.id}
=======================================

Date: ${invoice.date}
Customer: ${invoice.customer}

Services:
${lines}

---------------------------------------
Subtotal:        ${money(invoice.subtotal)}${discountLine}
Total:           ${money(invoice.total)}
Payment Method: ${invoice.payment}
Status:          ${invoice.status}
---------------------------------------

Thank you for choosing Glamour Studio!
=======================================
  `.trim();

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice-${invoice.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Invoice ${invoice.id} downloaded`);
}

export default function Billing() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [customer, setCustomer] = useState("");
  const [payment, setPayment] = useState("Cash");
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discount, setDiscount] = useState("0");
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
  const discountAmount = discountEnabled ? Math.max(0, Number(discount || 0)) : 0;
  const total = Math.max(0, subtotal - discountAmount);

  const loadData = async () => {
    const headers = await getAuthHeaders();
    const [invoiceRes, serviceRes, staffRes] = await Promise.all([
      fetch(`${API_URL}/api/invoices`, { headers }),
      fetch(`${API_URL}/api/services`, { headers }),
      fetch(`${API_URL}/api/staff?includeUnavailable=true`, { headers }),
    ]);
    const [invoiceData, serviceData, staffData] = await Promise.all([invoiceRes.json(), serviceRes.json(), staffRes.json()]);
    if (!invoiceRes.ok) throw new Error(invoiceData.error || "Could not load invoices");
    if (!serviceRes.ok) throw new Error(serviceData.error || "Could not load services");
    if (!staffRes.ok) throw new Error(staffData.error || "Could not load staff");
    if (!Array.isArray(invoiceData) || !Array.isArray(serviceData) || !Array.isArray(staffData)) {
      throw new Error("The API returned an unexpected billing payload");
    }
    setInvoices(invoiceData);
    setServices(serviceData);
    setStaff(staffData);
  };

  useEffect(() => {
    loadData().catch((error) => {
      toast.error(error instanceof TypeError ? API_UNAVAILABLE_MESSAGE : error instanceof Error ? error.message : "Could not load billing data");
    });
  }, []);

  const addItem = () => {
    const service = services[0];
    setItems((current) => [
      ...current,
      {
        serviceId: service?.id || "other",
        name: service?.name || "Other service",
        staffId: staff[0]?.id || "",
        quantity: 1,
        unitPrice: Number(service?.price || 0),
        total: Number(service?.price || 0),
        custom: !service,
      },
    ]);
  };

  const updateItem = (index: number, patch: Partial<InvoiceItem>) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, ...patch };
      next.total = Math.max(1, Number(next.quantity || 1)) * Math.max(0, Number(next.unitPrice || 0));
      return next;
    }));
  };

  const selectService = (index: number, serviceId: string) => {
    if (serviceId === "other") {
      updateItem(index, { serviceId: "other", name: "Other service", unitPrice: 0, custom: true });
      return;
    }
    const service = services.find((item) => item.id === serviceId);
    if (service) updateItem(index, { serviceId: service.id, name: service.name, unitPrice: Number(service.price), custom: false });
  };

  const createInvoice = async () => {
    try {
      const res = await fetch(`${API_URL}/api/invoices`, {
        method: "POST",
        headers: await getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ customer, payment, discount: discountAmount, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create invoice");
      toast.success(`Invoice ${data.id} created for ${money(data.total)}`);
      setShowAdd(false);
      setCustomer("");
      setDiscount("0");
      setDiscountEnabled(false);
      setItems([]);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create invoice");
    }
  };

  return (
    <div>
      <PageHeader
        title="Billing & Invoices"
        subtitle="Service-linked invoices that feed staff commission"
        actions={<Button onClick={() => { setShowAdd(true); if (items.length === 0) addItem(); }}><Plus className="mr-2 h-4 w-4" />New Invoice</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Today's Sales", value: money(invoices.filter((invoice) => invoice.date === new Date().toISOString().slice(0, 10)).reduce((sum, invoice) => sum + invoice.total, 0)), sub: "paid today" },
          { label: "All Sales", value: money(invoices.reduce((sum, invoice) => sum + invoice.total, 0)), sub: `${invoices.length} invoices` },
          { label: "Cash", value: money(invoices.filter((invoice) => invoice.payment === "Cash").reduce((sum, invoice) => sum + invoice.total, 0)), sub: "cash payments" },
          { label: "Digital", value: money(invoices.filter((invoice) => invoice.payment !== "Cash").reduce((sum, invoice) => sum + invoice.total, 0)), sub: "card/mobile payments" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-foreground">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Receipt className="h-4 w-4" />Invoice History</h3>
        </div>
        <DataTable
          columns={[
            { key: "id", label: "Invoice", render: (row) => <span className="font-mono text-xs font-medium">{row.id}</span> },
            { key: "date", label: "Date" },
            { key: "customer", label: "Customer", render: (row) => <span className="font-medium">{row.customer}</span> },
            { key: "items", label: "Services", render: (row) => row.items.map((item) => `${item.name} x${item.quantity}`).join(", ") },
            { key: "discount", label: "Discount", render: (row) => row.discount > 0 ? money(row.discount) : "-" },
            { key: "total", label: "Total", render: (row) => <span className="font-semibold text-foreground">{money(row.total)}</span> },
            { key: "payment", label: "Payment", render: (row) => <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{paymentIcons[row.payment]} {row.payment}</span> },
            { key: "actions", label: "", render: (row) => <button onClick={() => downloadInvoice(row)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Download className="h-4 w-4" /></button> },
          ]}
          data={invoices}
        />
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-3">
            <Input placeholder="Customer name" value={customer} onChange={(event) => setCustomer(event.target.value)} />
            <Select value={payment} onValueChange={setPayment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Cash", "Card", "Easypaisa", "JazzCash"].map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={discountEnabled} onChange={(event) => setDiscountEnabled(event.target.checked)} />
              Apply discount
            </label>
          </div>
          {discountEnabled && <Input type="number" placeholder="Discount amount" value={discount} onChange={(event) => setDiscount(event.target.value)} />}

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_1fr_90px_130px_110px_40px]">
                <Select value={item.serviceId} onValueChange={(value) => selectService(index, value)}>
                  <SelectTrigger><SelectValue placeholder="Service" /></SelectTrigger>
                  <SelectContent>
                    {services.map((service) => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}
                    <SelectItem value="other">Other service</SelectItem>
                  </SelectContent>
                </Select>
                {item.custom ? (
                  <Input value={item.name} onChange={(event) => updateItem(index, { name: event.target.value })} placeholder="Service name" />
                ) : (
                  <div className="flex items-center rounded-md border border-border px-3 text-sm">{item.name}</div>
                )}
                <Input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} />
                <Input type="number" min="0" value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: Number(event.target.value) })} disabled={!item.custom} />
                <Select value={item.staffId} onValueChange={(value) => updateItem(index, { staffId: value })}>
                  <SelectTrigger><SelectValue placeholder="Staff" /></SelectTrigger>
                  <SelectContent>{staff.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent>
                </Select>
                <button className="flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={addItem}>Add Service Line</Button>

          <div className="rounded-lg bg-muted p-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            {discountEnabled && discountAmount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{money(discountAmount)}</span></div>}
            <div className="mt-2 flex justify-between text-base font-bold"><span>Total</span><span>{money(total)}</span></div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={createInvoice}>Generate Invoice</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
