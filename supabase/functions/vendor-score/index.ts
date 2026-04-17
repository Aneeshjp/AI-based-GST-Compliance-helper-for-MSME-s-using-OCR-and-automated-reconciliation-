// Score vendors based on filing consistency + mismatch rate.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const uid = u.user.id;

    const { data: invoices } = await supabase.from("invoices").select("*").eq("user_id", uid);
    const { data: gstRecords } = await supabase.from("gst_records").select("*").eq("user_id", uid);

    const map = new Map<string, { name: string; gstin: string; total: number; matched: number; mismatched: number; missing: number; gstFiled: number }>();
    for (const inv of invoices || []) {
      const k = inv.vendor_gstin || inv.vendor_name || "unknown";
      const v = map.get(k) || { name: inv.vendor_name || "Unknown", gstin: inv.vendor_gstin || "", total: 0, matched: 0, mismatched: 0, missing: 0, gstFiled: 0 };
      v.total += 1;
      if (inv.status === "matched") v.matched += 1;
      else if (inv.status === "mismatched") v.mismatched += 1;
      else if (inv.status === "missing" || inv.status === "flagged") v.missing += 1;
      map.set(k, v);
    }
    for (const g of gstRecords || []) {
      const k = g.vendor_gstin;
      const v = map.get(k) || { name: g.vendor_name || "Unknown", gstin: k, total: 0, matched: 0, mismatched: 0, missing: 0, gstFiled: 0 };
      v.gstFiled += 1;
      map.set(k, v);
    }

    const upserts: any[] = [];
    for (const [, v] of map.entries()) {
      if (!v.gstin) continue;
      const total = v.total || 1;
      const mismatchRate = ((v.mismatched + v.missing) / total) * 100;
      const filingConsistency = v.gstFiled === 0 ? 0 : Math.min(100, (v.matched / v.gstFiled) * 100);
      // Risk: weighted
      const risk = Math.round(0.6 * mismatchRate + 0.4 * (100 - filingConsistency));
      const level = risk >= 60 ? "high" : risk >= 30 ? "medium" : "low";
      upserts.push({
        user_id: uid, name: v.name, gstin: v.gstin,
        total_invoices: v.total, matched_invoices: v.matched,
        mismatch_rate: Number(mismatchRate.toFixed(2)),
        filing_consistency: Number(filingConsistency.toFixed(2)),
        risk_score: risk, risk_level: level,
      });
    }
    if (upserts.length) {
      await supabase.from("vendors").upsert(upserts, { onConflict: "user_id,gstin" });
    }
    return new Response(JSON.stringify({ vendors: upserts.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
