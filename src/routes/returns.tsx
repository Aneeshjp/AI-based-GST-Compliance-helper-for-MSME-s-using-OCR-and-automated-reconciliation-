import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { FileBarChart, Download } from "lucide-react";

export const Route = createFileRoute("/returns")({
  component: () => <ProtectedRoute><Returns /></ProtectedRoute>,
});

const inr = (n: number) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

function Returns() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<string>("");
  const [periods, setPeriods] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("invoices").select("*").eq("user_id", user.id).then(({ data }) => {
      const all = data || [];
      const ps = Array.from(new Set(all.map(i => i.invoice_date?.slice(0, 7)).filter(Boolean))).sort().reverse() as string[];
      setPeriods(ps); setPeriod(ps[0] || "");
      setInvoices(all);
    });
  }, [user]);

  const inPeriod = invoices.filter(i => i.invoice_date?.startsWith(period));
  const sales = inPeriod.filter(i => i.invoice_type === "sales");
  const purchases = inPeriod.filter(i => i.invoice_type === "purchase");

  const sum = (arr: any[], k: string) => arr.reduce((a, x) => a + Number(x[k] || 0), 0);

  // GSTR-3B summary (output liability vs ITC)
  const outputCgst = sum(sales, "cgst"), outputSgst = sum(sales, "sgst"), outputIgst = sum(sales, "igst");
  const itcCgst = sum(purchases.filter(p => p.status === "matched"), "cgst");
  const itcSgst = sum(purchases.filter(p => p.status === "matched"), "sgst");
  const itcIgst = sum(purchases.filter(p => p.status === "matched"), "igst");
  const netCgst = outputCgst - itcCgst, netSgst = outputSgst - itcSgst, netIgst = outputIgst - itcIgst;

  const exportCsv = () => {
    const rows = [["Section","Field","Amount"]];
    rows.push(["Outward","CGST",String(outputCgst)],["Outward","SGST",String(outputSgst)],["Outward","IGST",String(outputIgst)]);
    rows.push(["ITC","CGST",String(itcCgst)],["ITC","SGST",String(itcSgst)],["ITC","IGST",String(itcIgst)]);
    rows.push(["Net Payable","CGST",String(netCgst)],["Net Payable","SGST",String(netSgst)],["Net Payable","IGST",String(netIgst)]);
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `GSTR-3B-${period}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <AppLayout title="GST Returns" subtitle="Auto-drafted GSTR-1 and GSTR-3B summaries"
      actions={
        <div className="flex items-center gap-2">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="px-3 py-2 rounded-lg border bg-card text-sm">
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={exportCsv} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-card">
            <Download className="h-4 w-4" />Export CSV
          </button>
        </div>
      }>
      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="GSTR-3B Draft" subtitle={`Filing period · ${period || "—"}`}>
          <Row3 head label="3.1 Outward taxable supplies" cgst={outputCgst} sgst={outputSgst} igst={outputIgst} />
          <Row3 label="No. of invoices" cgst={sales.length as any} bare />
          <div className="border-t my-2" />
          <Row3 head label="4. Eligible ITC (matched only)" cgst={itcCgst} sgst={itcSgst} igst={itcIgst} />
          <Row3 label="Matched invoices" cgst={purchases.filter(p=>p.status==="matched").length as any} bare />
          <div className="border-t my-2" />
          <Row3 head label="6. Net tax payable" cgst={netCgst} sgst={netSgst} igst={netIgst} highlight />
        </Section>

        <Section title="GSTR-1 Draft" subtitle="Outward supplies summary">
          <div className="space-y-3">
            <Stat label="Total sales invoices" value={sales.length.toString()} />
            <Stat label="Total taxable value" value={inr(sum(sales, "taxable_amount"))} />
            <Stat label="Total tax collected" value={inr(outputCgst + outputSgst + outputIgst)} />
            <Stat label="Total invoice value" value={inr(sum(sales, "total_amount"))} />
          </div>
          <div className="mt-5 p-4 rounded-xl bg-muted/50 text-xs text-muted-foreground">
            <FileBarChart className="h-4 w-4 inline mr-1" />
            Tip: Mark uploaded invoices as <span className="font-mono bg-card px-1 rounded">sales</span> in the database to populate GSTR-1. The seeded demo data is purchase-side only.
          </div>
        </Section>
      </div>
    </AppLayout>
  );
}

function Section({ title, subtitle, children }: any) {
  return (
    <div className="bg-card border rounded-2xl p-5 shadow-card">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      <div>{children}</div>
    </div>
  );
}
function Row3({ label, cgst, sgst, igst, head, highlight, bare }: any) {
  return (
    <div className={`grid grid-cols-4 gap-2 py-1.5 text-sm ${head ? "font-semibold" : ""} ${highlight ? "bg-primary/5 -mx-2 px-2 rounded" : ""}`}>
      <span className="col-span-1 text-muted-foreground text-xs">{label}</span>
      <span className="text-right font-mono">{bare ? cgst : inr(cgst)}</span>
      <span className="text-right font-mono">{bare ? "" : inr(sgst)}</span>
      <span className="text-right font-mono">{bare ? "" : inr(igst)}</span>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between p-3 rounded-lg border">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}
