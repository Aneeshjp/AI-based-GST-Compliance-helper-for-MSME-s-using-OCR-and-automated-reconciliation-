import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Users, AlertTriangle, ShieldCheck, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vendors")({
  component: () => <ProtectedRoute><Vendors /></ProtectedRoute>,
});

function Vendors() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("vendors").select("*").eq("user_id", user.id).order("risk_score", { ascending: false });
    setVendors(data || []);
  };
  useEffect(() => { load(); }, [user]);

  const recompute = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("vendor-score");
      if (error) throw error;
      toast.success("Vendor scores updated");
      await load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const levelStyles: Record<string, string> = {
    high: "bg-destructive/10 text-destructive border-destructive/30",
    medium: "bg-warning/15 text-warning border-warning/30",
    low: "bg-success/10 text-success border-success/30",
  };

  return (
    <AppLayout title="Vendors" subtitle="Risk scoring based on filing consistency and mismatches"
      actions={<button onClick={recompute} disabled={busy} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-card disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Recompute scores
      </button>}>
      <div className="bg-card border rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Vendor</th>
                <th className="px-4 py-3 text-left">GSTIN</th>
                <th className="px-4 py-3 text-right">Invoices</th>
                <th className="px-4 py-3 text-right">Mismatch %</th>
                <th className="px-4 py-3 text-right">Filing %</th>
                <th className="px-4 py-3 text-right">Risk score</th>
                <th className="px-4 py-3">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {vendors.map(v => (
                <tr key={v.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center text-xs font-bold">{v.name?.[0] || "?"}</div>
                    {v.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{v.gstin || "—"}</td>
                  <td className="px-4 py-3 text-right">{v.matched_invoices}/{v.total_invoices}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(v.mismatch_rate).toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(v.filing_consistency).toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{v.risk_score}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize ${levelStyles[v.risk_level]}`}>
                    {v.risk_level === "high" ? <AlertTriangle className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}{v.risk_level}
                  </span></td>
                </tr>
              ))}
              {!vendors.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-40" />No vendors yet. Run reconciliation, then recompute.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
