import { useCallback, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Banknote, CreditCard, Download, Plus, Printer, Receipt, Smartphone, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_URL, SOCKET_OPTIONS } from "@/lib/api";
import { localDateKey } from "@/lib/date";
import { money } from "@/lib/format";
import { toast } from "sonner";

type Service = { id: string; name: string; price: number };
type Staff = { id: string; name: string };
type InvoiceItem = { serviceId: string; name: string; staffId: string; quantity: number; unitPrice: number; total: number; custom: boolean };
type Invoice = { id: string; date: string; customer: string; customerEmail?: string; customerPhone?: string; items: InvoiceItem[]; subtotal: number; discount: number; total: number; payment: string; status: string };

const paymentIcons: Record<string, React.ReactNode> = {
  Cash: <Banknote className="h-3.5 w-3.5" />,
  Card: <CreditCard className="h-3.5 w-3.5" />,
  JazzCash: <Smartphone className="h-3.5 w-3.5" />,
  Easypaisa: <Smartphone className="h-3.5 w-3.5" />,
};

function downloadInvoice(invoice: Invoice) {
  const lines = invoice.items.map((item) =>
    `${item.name} x ${item.quantity} @ ${money(item.unitPrice)} = ${money(item.total)}`
  ).join("\n");
  const discountLine = invoice.discount > 0 ? `\nDiscount:       -${money(invoice.discount)}` : "";
  const content = `
=======================================
         FLOURISH SALON PRO
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

Thank you for choosing Flourish Salon Pro!
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

function printReceipt(invoice: Invoice) {
  const rows = invoice.items.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${money(item.unitPrice)}</td>
      <td>${money(item.total)}</td>
    </tr>
  `).join("");
  const discountRow = invoice.discount > 0 ? `<tr><td colspan="3">Discount</td><td>-${money(invoice.discount)}</td></tr>` : "";
  const popup = window.open("", "_blank", "width=440,height=720");
  if (!popup) {
    toast.error("Allow popups to print the receipt");
    return;
  }
  popup.document.write(`
    <html>
      <head>
        <title>Receipt ${invoice.id}</title>
        <style>
          @media print { button { display: none; } body { margin: 0; } }
          body { font-family: Arial, sans-serif; color: #1a1a18; padding: 24px; }
          h1 { font-size: 20px; margin: 0 0 4px; }
          p { margin: 3px 0; font-size: 12px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
          th, td { border-bottom: 1px solid #ddd; padding: 8px 4px; text-align: left; }
          td:last-child, th:last-child { text-align: right; }
          .total { margin-top: 16px; text-align: right; font-size: 18px; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>Flourish Salon Pro</h1>
        <p>Receipt ${invoice.id}</p>
        <p>Date: ${invoice.date}</p>
        <p>Customer: ${invoice.customer}</p>
        ${invoice.customerPhone ? `<p>Phone: ${invoice.customerPhone}</p>` : ""}
        <table>
          <thead><tr><th>Service</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
          <tbody>${rows}${discountRow}</tbody>
        </table>
        <div class="total">Total: ${money(invoice.total)}</div>
        <p>Payment: ${invoice.payment} | Status: ${invoice.status}</p>
        <button onclick="window.print()">Print Receipt</button>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

export default function Billing() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [customer, setCustomer] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [payment, setPayment] = useState("Cash");
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discount, setDiscount] = useState("0");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [deletePin, setDeletePin] = useState("");
  const [deleteInvoiceNumber, setDeleteInvoiceNumber] = useState("");

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
  const discountAmount = discountEnabled ? Math.max(0, Number(discount || 0)) : 0;
  const total = Math.max(0, subtotal - discountAmount);

  const loadData = useCallback(async () => {
    const [invoiceRes, serviceRes, staffRes] = await Promise.all([
      fetch(`${API_URL}/api/invoices`, { headers: { "x-role": "admin" } }),
      fetch(`${API_URL}/api/services`, { headers: { "x-role": "admin" } }),
      fetch(`${API_URL}/api/staff?includeUnavailable=true`, { headers: { "x-role": "admin" } }),
    ]);
    const [invoiceData, serviceData, staffData] = await Promise.all([invoiceRes.json(), serviceRes.json(), staffRes.json()]);
    setInvoices(invoiceData);
    setServices(serviceData);
    setStaff(staffData);
  }, []);

  useEffect(() => {
    loadData().catch(() => toast.error("Could not load billing data"));
  }, [loadData]);

  useEffect(() => {
    const socket: Socket = io(API_URL, SOCKET_OPTIONS);
    socket.on("invoices:update", loadData);
    socket.on("staff:commission:update", loadData);
    return () => {
      socket.disconnect();
    };
  }, [loadData]);

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

  const resetInvoiceForm = () => {
    setCustomer("");
    setCustomerEmail("");
    setCustomerPhone("");
    setPayment("Cash");
    setDiscount("0");
    setDiscountEnabled(false);
    setItems([]);
  };

  const openInvoiceDialog = () => {
    resetInvoiceForm();
    setShowAdd(true);
    window.setTimeout(() => addItem(), 0);
  };

  const createInvoice = async () => {
    try {
      const res = await fetch(`${API_URL}/api/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify({ customer, customerEmail, customerPhone, payment, status: "Paid", discount: discountAmount, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create invoice");
      toast.success(`Invoice ${data.id} created for ${money(data.total)}`);
      setShowAdd(false);
      resetInvoiceForm();
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create invoice");
    }
  };

  const deleteInvoice = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${API_URL}/api/invoices/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-role": "admin", "x-security-pin": deletePin },
        body: JSON.stringify({ invoiceNumber: deleteInvoiceNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete invoice");
      toast.success(`${deleteTarget.id} deleted and invoice numbers adjusted`);
      setDeleteTarget(null);
      setDeletePin("");
      setDeleteInvoiceNumber("");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete invoice");
    }
  };

  return (
    <div>
      <PageHeader
        title="Billing & Invoices"
        subtitle="Manual counter invoices with service lines, staff assignment, discounts, and commission sync."
        actions={<Button onClick={openInvoiceDialog}><Plus className="mr-2 h-4 w-4" />New Invoice</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Today's Sales", value: money(invoices.filter((invoice) => invoice.date === localDateKey()).reduce((sum, invoice) => sum + invoice.total, 0)), sub: "paid today" },
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
            {
              key: "actions",
              label: "",
              render: (row) => (
                <div className="flex items-center gap-1">
                  <button title="Download invoice" onClick={() => downloadInvoice(row)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Download className="h-4 w-4" /></button>
                  <button title="Print receipt" onClick={() => printReceipt(row)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Printer className="h-4 w-4" /></button>
                  <button title="Delete invoice" onClick={() => { setDeleteTarget(row); setDeleteInvoiceNumber(row.id); setDeletePin(""); }} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ),
            },
          ]}
          data={invoices}
        />
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>Build the invoice from the services the client actually received at the counter.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-3">
            <Input placeholder="Customer name" value={customer} onChange={(event) => setCustomer(event.target.value)} />
            <Input placeholder="Email (optional)" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} />
            <Input placeholder="Phone (optional)" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
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

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Enter security PIN and invoice number to delete this invoice. Remaining invoice numbers will be adjusted automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={deleteInvoiceNumber} onChange={(event) => setDeleteInvoiceNumber(event.target.value)} placeholder={`Invoice number, e.g. ${deleteTarget?.id || "INV-001"}`} />
            <Input type="password" value={deletePin} onChange={(event) => setDeletePin(event.target.value)} placeholder="Security PIN" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={deleteInvoice}>Delete Invoice</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
