import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, MinusCircle, PlusCircle, RefreshCw, Trash2, Wallet } from "lucide-react";
import { io, Socket } from "socket.io-client";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_URL, SOCKET_OPTIONS } from "@/lib/api";
import { toast } from "sonner";

type Adjustment = { id: string; type: "deduction" | "bonus"; amount: number; reason: string };
type PayrollRow = {
  staffId: string;
  name: string;
  title: string;
  baseSalary: number;
  commission: number;
  revenue: number;
  deductions: number;
  bonuses: number;
  payable: number;
  paid: boolean;
  paidAt: string | null;
  attendancePercentage: number;
  adjustments: Adjustment[];
};
type Summary = {
  grossRevenue: number;
  discounts: number;
  netRevenue: number;
  payrollPayable: number;
  payrollPaid: number;
  payrollUnpaid: number;
  profitAfterPayroll: number;
  invoiceCount: number;
};

const emptySummary: Summary = {
  grossRevenue: 0,
  discounts: 0,
  netRevenue: 0,
  payrollPayable: 0,
  payrollPaid: 0,
  payrollUnpaid: 0,
  profitAfterPayroll: 0,
  invoiceCount: 0,
};

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString()}`;
}

export default function Payroll() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(false);
  const [adjusting, setAdjusting] = useState<PayrollRow | null>(null);
  const [adjustment, setAdjustment] = useState({ type: "deduction", amount: "", reason: "" });

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payroll?month=${month}`, { headers: { "x-role": "admin" } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load payroll");
      setRows(data.rows || []);
      setSummary(data.summary || emptySummary);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load payroll");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  useEffect(() => {
    const socket: Socket = io(API_URL, SOCKET_OPTIONS);
    socket.on("payroll:update", loadPayroll);
    socket.on("staff:commission:update", loadPayroll);
    socket.on("invoices:update", loadPayroll);
    return () => {
      socket.disconnect();
    };
  }, [loadPayroll]);

  const totals = useMemo(() => [
    { label: "Net Revenue", value: money(summary.netRevenue), sub: `${summary.invoiceCount} paid invoices` },
    { label: "Payroll Payable", value: money(summary.payrollPayable), sub: "salary + commission - deductions" },
    { label: "Payroll Paid", value: money(summary.payrollPaid), sub: `${money(summary.payrollUnpaid)} unpaid` },
    { label: "Profit After Payroll", value: money(summary.profitAfterPayroll), sub: "net revenue minus payroll" },
  ], [summary]);

  const markPaid = async (row: PayrollRow, paid: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/payroll/${row.staffId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify({ month, paid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update payroll status");
      toast.success(`${row.name} marked ${paid ? "paid" : "unpaid"}`);
      await loadPayroll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update payroll status");
    }
  };

  const saveAdjustment = async () => {
    if (!adjusting) return;
    try {
      const res = await fetch(`${API_URL}/api/payroll/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify({ staffId: adjusting.staffId, month, ...adjustment, amount: Number(adjustment.amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save adjustment");
      toast.success(adjustment.type === "deduction" ? "Deduction added" : "Bonus added");
      setAdjusting(null);
      setAdjustment({ type: "deduction", amount: "", reason: "" });
      await loadPayroll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save adjustment");
    }
  };

  const deleteAdjustment = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/payroll/adjustments/${id}`, { method: "DELETE", headers: { "x-role": "admin" } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove adjustment");
      toast.success("Adjustment removed");
      await loadPayroll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove adjustment");
    }
  };

  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Month-wise salary, commission, deductions, and profit after payroll"
        actions={<Button variant="outline" onClick={loadPayroll} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}
      />

      <div className="mb-6 flex max-w-xs items-center gap-2">
        <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {totals.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-foreground">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Wallet className="h-4 w-4" />Payroll for {month}</h3>
        </div>
        <DataTable
          columns={[
            { key: "name", label: "Staff", render: (row) => <span className="font-medium">{row.name}</span> },
            { key: "baseSalary", label: "Salary", render: (row) => money(row.baseSalary) },
            { key: "commission", label: "Commission", render: (row) => money(row.commission) },
            { key: "bonuses", label: "Bonus", render: (row) => money(row.bonuses) },
            { key: "deductions", label: "Deductions", render: (row) => row.deductions > 0 ? <span className="text-destructive">{money(row.deductions)}</span> : "-" },
            { key: "payable", label: "Total Payable", render: (row) => <span className="font-semibold">{money(row.payable)}</span> },
            { key: "attendancePercentage", label: "Attendance", render: (row) => `${row.attendancePercentage}%` },
            { key: "paid", label: "Status", render: (row) => <Badge className={row.paid ? "bg-success/10 text-success hover:bg-success/10" : "bg-warning/10 text-warning hover:bg-warning/10"}>{row.paid ? "Paid" : "Unpaid"}</Badge> },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={row.paid ? "outline" : "default"} onClick={() => markPaid(row, !row.paid)}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />{row.paid ? "Mark Unpaid" : "Mark Paid"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setAdjusting(row); setAdjustment({ type: "deduction", amount: "", reason: "" }); }}>
                    <MinusCircle className="mr-1 h-3.5 w-3.5" />Deduct
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setAdjusting(row); setAdjustment({ type: "bonus", amount: "", reason: "" }); }}>
                    <PlusCircle className="mr-1 h-3.5 w-3.5" />Bonus
                  </Button>
                </div>
              ),
            },
            {
              key: "adjustments",
              label: "Notes",
              render: (row) => row.adjustments.length === 0 ? "-" : (
                <div className="space-y-1">
                  {row.adjustments.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.type}: {money(item.amount)} {item.reason && `- ${item.reason}`}</span>
                      <button onClick={() => deleteAdjustment(item.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
          data={rows}
          emptyMessage="No payroll rows found"
        />
      </div>

      <Dialog open={Boolean(adjusting)} onOpenChange={(open) => !open && setAdjusting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{adjustment.type === "deduction" ? "Add Deduction / Penalty" : "Add Bonus"}</DialogTitle>
            <DialogDescription>Adjust the selected staff member&apos;s payroll for this month.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={adjustment.type} onValueChange={(value) => setAdjustment({ ...adjustment, type: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="deduction">Deduction / penalty</SelectItem>
                <SelectItem value="bonus">Bonus</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Amount" value={adjustment.amount} onChange={(event) => setAdjustment({ ...adjustment, amount: event.target.value })} />
            <Input placeholder="Reason" value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdjusting(null)}>Cancel</Button>
              <Button onClick={saveAdjustment}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
