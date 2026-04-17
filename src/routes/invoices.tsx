import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Search, FileText, Filter } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/invoices")({
  component: () => <ProtectedRoute><Invoices /></ProtectedRoute>,
});

const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const statusStyles: Record<string, string> = {
  matched: "bg-success/10 text-success border-success/20",
  mismatched: "bg-warning/10 text-warning border-warning/20",
  missing: "bg-destructive/10 text-destructive border-destructive/20",
  flagged: "bg-saffron/15 text-saffron border-saffron/30",
  pending: "bg-muted text-muted-foreground border-border",
};

function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    supabase.from("invoices").select("*").eq("user_id", user.id).order("invoice_date", { ascending: false })
      .then(({ data }) => setInvoices(data || []));
  }, [user]);

  const filtered = invoices.filter(i => {
    if (filter !== "all" && i.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (i.invoice_number || "").toLowerCase().includes(q) || (i.vendor_name || "").toLowerCase().includes(q) || (i.vendor_gstin || "").toLowerCase().includes(q);
  });

  return (
    <AppLayout title="Invoices" subtitle={`${invoices.length} total · ${filtered.length} shown`}>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by invoice #, vendor, GSTIN…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {["all","matched","mismatched","missing","flagged"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border whitespace-nowrap ${filter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">GSTIN</th>
                <th className="px-4 py-3 text-right">Taxable</th>
                <th className="px-4 py-3 text-right">Tax</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(i => (
                <tr key={i.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{i.invoice_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">{i.invoice_date ? format(new Date(i.invoice_date), "dd MMM yy") : "—"}</td>
                  <td className="px-4 py-3 font-medium">{i.vendor_name || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{i.vendor_gstin || <span className="text-destructive">missing</span>}</td>
                  <td className="px-4 py-3 text-right font-mono">{inr(i.taxable_amount)}</td>
                  <td className="px-4 py-3 text-right font-mono">{inr(Number(i.cgst)+Number(i.sgst)+Number(i.igst))}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{inr(i.total_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusStyles[i.status] || statusStyles.pending}`}>{i.status}</span>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />No invoices match your filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
