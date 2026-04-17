// Fraud / anomaly detection: duplicate invoices, suspicious GSTIN, abnormal tax ratios.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: invoices } = await supabase.from("invoices").select("*").eq("user_id", u.user.id);
    const seen = new Map<string, number>();
    let totalFlagged = 0;
    for (const inv of invoices || []) {
      const flags: string[] = [];
      const key = `${(inv.vendor_gstin || "").trim()}|${(inv.invoice_number || "").trim()}`;
      seen.set(key, (seen.get(key) || 0) + 1);

      if (inv.vendor_gstin && !GSTIN_RE.test(inv.vendor_gstin)) flags.push("invalid_gstin");
      if (!inv.vendor_gstin) flags.push("missing_gstin");

      const taxable = Number(inv.taxable_amount || 0);
      const totalTax = Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0);
      if (taxable > 0) {
        const ratio = totalTax / taxable;
        if (ratio > 0.5) flags.push("abnormal_tax_ratio_high");
        if (ratio > 0 && ratio < 0.03) flags.push("abnormal_tax_ratio_low");
      }
      if (Number(inv.cgst || 0) > 0 && Number(inv.igst || 0) > 0) flags.push("cgst_and_igst_both_present");
      if (flags.length) totalFlagged++;
      await supabase.from("invoices").update({ fraud_flags: flags }).eq("id", inv.id);
    }
    // Mark duplicates
    for (const [key, count] of seen.entries()) {
      if (count > 1 && key !== "|") {
        const [gstin, num] = key.split("|");
        const { data: dups } = await supabase.from("invoices").select("id, fraud_flags").eq("user_id", u.user.id).eq("vendor_gstin", gstin).eq("invoice_number", num);
        for (const d of dups || []) {
          const flags = Array.isArray(d.fraud_flags) ? d.fraud_flags : [];
          if (!flags.includes("duplicate")) flags.push("duplicate");
          await supabase.from("invoices").update({ fraud_flags: flags, status: "flagged" }).eq("id", d.id);
        }
      }
    }
    return new Response(JSON.stringify({ flagged: totalFlagged, duplicates: [...seen.values()].filter(c => c > 1).length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
