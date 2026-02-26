import { useState } from "react";
import { Plus, Receipt, Download, CreditCard, Banknote, Smartphone } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import FormDialog from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const initialInvoices = [
  { id: "#INV-1042", date: "2026-02-26", customer: "Ayesha Khan", services: "Haircut, Blowdry", total: "3500", payment: "Cash", status: "Paid" },
  { id: "#INV-1041", date: "2026-02-26", customer: "Fatima Ali", services: "Facial Treatment", total: "4500", payment: "Card", status: "Paid" },
  { id: "#INV-1040", date: "2026-02-25", customer: "Zainab Raza", services: "Manicure, Pedicure, Gel", total: "5500", payment: "JazzCash", status: "Paid" },
  { id: "#INV-1039", date: "2026-02-25", customer: "Mehak Tariq", services: "Hair Color", total: "4000", payment: "Easypaisa", status: "Paid" },
  { id: "#INV-1038", date: "2026-02-24", customer: "Sana Malik", services: "Bridal Makeup", total: "15000", payment: "Card", status: "Paid" },
  { id: "#INV-1037", date: "2026-02-24", customer: "Rabia Noor", services: "Threading, Facial", total: "3000", payment: "Cash", status: "Pending" },
];

const paymentIcons: Record<string, React.ReactNode> = {
  Cash: <Banknote className="w-3.5 h-3.5" />,
  Card: <CreditCard className="w-3.5 h-3.5" />,
  JazzCash: <Smartphone className="w-3.5 h-3.5" />,
  Easypaisa: <Smartphone className="w-3.5 h-3.5" />,
};

function downloadInvoice(invoice: typeof initialInvoices[0]) {
  const content = `
=======================================
         GLAMOUR STUDIO
       INVOICE ${invoice.id}
=======================================

Date: ${invoice.date}
Customer: ${invoice.customer}

Services: ${invoice.services}

---------------------------------------
Total:          Rs. ${Number(invoice.total).toLocaleString()}
Payment Method: ${invoice.payment}
Status:         ${invoice.status}
---------------------------------------

Thank you for choosing Glamour Studio!
=======================================
  `.trim();

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice-${invoice.id.replace("#", "")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Invoice ${invoice.id} downloaded!`);
}

export default function Billing() {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [showAdd, setShowAdd] = useState(false);

  let nextNum = 1043;

  return (
    <div>
      <PageHeader
        title="Billing & Invoices"
        subtitle="Manage payments and generate invoices"
        actions={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-2" />New Invoice</Button>}
      />

      <FormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Create Invoice"
        fields={[
          { key: "customer", label: "Customer Name", required: true, placeholder: "e.g. Ayesha Khan" },
          { key: "services", label: "Services (comma separated)", required: true, placeholder: "e.g. Haircut, Blowdry" },
          { key: "total", label: "Total Amount (Rs.)", type: "number", required: true, placeholder: "e.g. 3500" },
          { key: "payment", label: "Payment Method", type: "select", options: ["Cash", "Card", "Easypaisa", "JazzCash"], required: true },
        ]}
        onSubmit={(data) => {
          const newInvoice = {
            id: `#INV-${nextNum++}`,
            date: new Date().toISOString().split("T")[0],
            customer: data.customer,
            services: data.services,
            total: data.total,
            payment: data.payment,
            status: "Paid",
          };
          setInvoices([newInvoice, ...invoices]);
          toast.success(`Invoice ${newInvoice.id} created for Rs. ${Number(data.total).toLocaleString()}`);
        }}
        submitLabel="Generate Invoice"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Today's Sales", value: `Rs. ${invoices.filter(i => i.date === "2026-02-26").reduce((s, i) => s + Number(i.total), 0).toLocaleString()}`, sub: `${invoices.filter(i => i.date === "2026-02-26").length} invoices` },
          { label: "This Week", value: `Rs. ${invoices.reduce((s, i) => s + Number(i.total), 0).toLocaleString()}`, sub: `${invoices.length} invoices` },
          { label: "Cash", value: `Rs. ${invoices.filter(i => i.payment === "Cash").reduce((s, i) => s + Number(i.total), 0).toLocaleString()}`, sub: `${invoices.filter(i => i.payment === "Cash").length} transactions` },
          { label: "Digital", value: `Rs. ${invoices.filter(i => i.payment !== "Cash").reduce((s, i) => s + Number(i.total), 0).toLocaleString()}`, sub: `${invoices.filter(i => i.payment !== "Cash").length} transactions` },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 shadow-card">
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Receipt className="w-4 h-4" />Invoice History</h3>
        </div>
        <DataTable
          columns={[
            { key: "id", label: "Invoice", render: (row) => <span className="font-mono text-xs font-medium">{row.id}</span> },
            { key: "date", label: "Date" },
            { key: "customer", label: "Customer", render: (row) => <span className="font-medium">{row.customer}</span> },
            { key: "services", label: "Services" },
            { key: "total", label: "Total", render: (row) => <span className="font-semibold text-foreground">Rs. {Number(row.total).toLocaleString()}</span> },
            { key: "payment", label: "Payment", render: (row) => <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{paymentIcons[row.payment]} {row.payment}</span> },
            { key: "status", label: "Status", render: (row) => <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.status === "Paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{row.status}</span> },
            { key: "actions", label: "", render: (row) => <button onClick={() => downloadInvoice(row)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Download className="w-4 h-4" /></button> },
          ]}
          data={invoices}
        />
      </div>
    </div>
  );
}
