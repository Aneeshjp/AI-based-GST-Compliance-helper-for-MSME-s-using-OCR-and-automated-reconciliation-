// Reconcile user invoices with mock GSTR-2B records.
// Matches on (vendor_gstin, invoice_number) loosely; detects mismatches and missing entries.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const norm = (s: string | null | undefined) => (s || "").trim().toUpperCase().replace(/\s+/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: invoices } = await supabase.from("invoices").select("*").eq("user_id", user.id);
    const { data: gstRecords } = await supabase.from("gst_records").select("*").eq("user_id", user.id);

    // Clear previous results
    await supabase.from("reconciliation_results").delete().eq("user_id", user.id);

    const matched: any[] = [];
    const mismatched: any[] = [];
    const missingInGst: any[] = [];
    const missingInBooks: any[] = [];

    const gstByKey = new Map<string, any>();
    for (const g of gstRecords || []) gstByKey.set(`${norm(g.vendor_gstin)}|${norm(g.invoice_number)}`, g);
    const matchedGstIds = new Set<string>();

    for (const inv of invoices || []) {
      if (!inv.vendor_gstin || !inv.invoice_number) {
        missingInGst.push(inv);
        await supabase.from("invoices").update({ status: "missing" }).eq("id", inv.id);
        await supabase.from("reconciliation_results").insert({ user_id: user.id, invoice_id: inv.id, match_type: "missing_in_gst" });
        continue;
      }
      const key = `${norm(inv.vendor_gstin)}|${norm(inv.invoice_number)}`;
      const g = gstByKey.get(key);
      if (!g) {
        missingInGst.push(inv);
        await supabase.from("invoices").update({ status: "missing" }).eq("id", inv.id);
        await supabase.from("reconciliation_results").insert({ user_id: user.id, invoice_id: inv.id, match_type: "missing_in_gst" });
        continue;
      }
      matchedGstIds.add(g.id);
      const diff: Record<string, { invoice: number; gst: number }> = {};
      const fields: Array<keyof typeof inv> = ["taxable_amount", "cgst", "sgst", "igst", "total_amount"] as any;
      let isMismatch = false;
      for (const f of fields) {
        const a = Number(inv[f] || 0); const b = Number(g[f] || 0);
        if (Math.abs(a - b) > 1) { diff[f as string] = { invoice: a, gst: b }; isMismatch = true; }
      }
      if (isMismatch) {
        mismatched.push({ inv, g, diff });
        await supabase.from("invoices").update({ status: "mismatched" }).eq("id", inv.id);
        await supabase.from("reconciliation_results").insert({ user_id: user.id, invoice_id: inv.id, gst_record_id: g.id, match_type: "mismatched", difference: diff });
      } else {
        matched.push({ inv, g });
        await supabase.from("invoices").update({ status: "matched" }).eq("id", inv.id);
        await supabase.from("reconciliation_results").insert({ user_id: user.id, invoice_id: inv.id, gst_record_id: g.id, match_type: "matched" });
      }
    }

    for (const g of gstRecords || []) {
      if (!matchedGstIds.has(g.id)) {
        missingInBooks.push(g);
        await supabase.from("reconciliation_results").insert({ user_id: user.id, gst_record_id: g.id, match_type: "missing_in_books" });
      }
    }

    return new Response(JSON.stringify({
      summary: {
        matched: matched.length,
        mismatched: mismatched.length,
        missing_in_gst: missingInGst.length,
        missing_in_books: missingInBooks.length,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
