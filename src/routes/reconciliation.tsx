import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { GitCompare, Loader2, CheckCircle2, AlertTriangle, FileX, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reconciliation")({
  component: () => <ProtectedRoute><Reconciliation /></ProtectedRoute>,
});

const inr = (n: number) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

function Reconciliation() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [tab, setTab] = useState<"matched"|"mismatched"|"missing_in_gst"|"missing_in_books">("mismatched");
  const [summary, setSummary] = useState({ matched: 0, mismatched: 0, missing_in_gst: 0, missing_in_books: 0 });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("reconciliation_results").select("*, invoices(*), gst_records(*)").eq("user_id", user.id);
    setResults(data || []);
    const s = { matched: 0, mismatched: 0, missing_in_gst: 0, missing_in_books: 0 };
    for (const r of data || []) (s as any)[r.match_type]++;
    setSummary(s);
  };
  useEffect(() => { load(); }, [user]);

  const run = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("reconcile");
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      await supabase.functions.invoke("fraud-scan");
      await supabase.functions.invoke("vendor-score");
      toast.success(`Reconciled: ${data.summary.matched} matched, ${data.summary.mismatched} mismatched, ${data.summary.missing_in_gst} missing.`);
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const filtered = results.filter(r => r.match_type === tab);

  return (
    <AppLayout title="Reconciliation" subtitle="Match your invoices with GSTR-2B records"
      actions={<button onClick={run} disabled={busy} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-card disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Run reconciliation
      </button>}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card icon={CheckCircle2} tone="success" label="Matched" value={summary.matched} active={tab==="matched"} onClick={()=>setTab("matched")} />
        <Card icon={AlertTriangle} tone="warning" label="Mismatched" value={summary.mismatched} active={tab==="mismatched"} onClick={()=>setTab("mismatched")} />
        <Card icon={FileX} tone="destructive" label="Missing in GSTR-2B" value={summary.missing_in_gst} active={tab==="missing_in_gst"} onClick={()=>setTab("missing_in_gst")} />
        <Card icon={ShieldAlert} tone="info" label="Missing in books" value={summary.missing_in_books} active={tab==="missing_in_books"} onClick={()=>setTab("missing_in_books")} />
      </div>

      <div className="bg-card border rounded-2xl shadow-card overflow-hidden">
        <div className="p-4 border-b font-semibold capitalize flex items-center gap-2">
          <GitCompare className="h-4 w-4" />{tab.replace(/_/g," ")}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Invoice #</th>
                <th className="px-4 py-3 text-left">Vendor</th>
                <th className="px-4 py-3 text-left">GSTIN</th>
                <th className="px-4 py-3 text-right">Books</th>
                <th className="px-4 py-3 text-right">GSTR-2B</th>
                <th className="px-4 py-3">Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(r => {
                const inv = r.invoices; const g = r.gst_records;
                const ref = inv || g;
                return (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{ref?.invoice_number || "—"}</td>
                    <td className="px-4 py-3">{ref?.vendor_name || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{ref?.vendor_gstin || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{inv ? inr(inv.total_amount) : "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{g ? inr(g.total_amount) : "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {r.difference && Object.keys(r.difference).length > 0 ? (
                        <div className="space-y-0.5">
                          {Object.entries(r.difference).map(([k, v]: any) => (
                            <div key={k} className="text-warning"><span className="font-mono">{k}:</span> {inr(v.invoice)} → {inr(v.gst)}</div>
                          ))}
                        </div>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Nothing here. {summary.matched + summary.mismatched + summary.missing_in_gst === 0 && <button onClick={run} className="text-primary underline ml-1">Run reconciliation</button>}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

function Card({ icon: Icon, tone, label, value, active, onClick }: any) {
  const c = { success: "text-success bg-success/10", warning: "text-warning bg-warning/10", destructive: "text-destructive bg-destructive/10", info: "text-primary bg-primary/10" }[tone as string];
  return (
    <button onClick={onClick} className={`text-left bg-card border rounded-2xl p-4 shadow-card transition-all hover:shadow-elegant ${active ? "ring-2 ring-primary border-primary" : ""}`}>
      <div className="flex items-center justify-between">
        <div className={`h-9 w-9 rounded-lg grid place-items-center ${c}`}><Icon className="h-4 w-4" /></div>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{label}</p>
    </button>
  );
}
