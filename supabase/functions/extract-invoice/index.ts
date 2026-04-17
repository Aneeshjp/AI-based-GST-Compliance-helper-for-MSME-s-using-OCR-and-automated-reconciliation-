// Extract invoice data from an uploaded image/PDF using Lovable AI (Gemini vision).
// Validates GSTIN format, computes confidence, returns structured JSON.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const tool = {
  type: "function",
  function: {
    name: "extract_invoice",
    description: "Extract structured GST invoice fields.",
    parameters: {
      type: "object",
      properties: {
        invoice_number: { type: "string" },
        invoice_date: { type: "string", description: "ISO YYYY-MM-DD" },
        vendor_name: { type: "string" },
        vendor_gstin: { type: "string", description: "15-char GSTIN of seller" },
        buyer_gstin: { type: "string" },
        taxable_amount: { type: "number" },
        cgst: { type: "number" },
        sgst: { type: "number" },
        igst: { type: "number" },
        total_amount: { type: "number" },
        raw_text: { type: "string", description: "Best-effort raw OCR text" },
      },
      required: ["invoice_number", "vendor_name", "total_amount"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { imageBase64, mimeType } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    if (!imageBase64) throw new Error("imageBase64 required");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract structured data from Indian GST tax invoices. Return numbers without commas. GSTIN is exactly 15 characters." },
          { role: "user", content: [
            { type: "text", text: "Extract all GST invoice fields from this document." },
            { type: "image_url", image_url: { url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}` } },
          ]},
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "extract_invoice" } },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const status = res.status === 429 || res.status === 402 ? res.status : 500;
      const msg = res.status === 429 ? "Rate limit exceeded — please try again shortly."
        : res.status === 402 ? "AI credits exhausted. Please add credits in Workspace → Usage."
        : `AI error: ${text}`;
      return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await res.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("AI returned no structured output");
    const extracted = JSON.parse(args);

    // Validation + confidence
    const issues: string[] = [];
    let confidence = 1;
    if (!extracted.vendor_gstin) { issues.push("missing_gstin"); confidence -= 0.25; }
    else if (!GSTIN_RE.test(extracted.vendor_gstin)) { issues.push("invalid_gstin_format"); confidence -= 0.2; }
    const sumTax = Number(extracted.cgst || 0) + Number(extracted.sgst || 0) + Number(extracted.igst || 0);
    const expectedTotal = Number(extracted.taxable_amount || 0) + sumTax;
    if (extracted.total_amount && Math.abs(expectedTotal - extracted.total_amount) > 5 && expectedTotal > 0) {
      issues.push("tax_total_mismatch"); confidence -= 0.15;
    }
    if (extracted.cgst > 0 && extracted.igst > 0) { issues.push("cgst_and_igst_both_present"); confidence -= 0.1; }
    if (!extracted.invoice_number) { issues.push("missing_invoice_number"); confidence -= 0.15; }

    return new Response(JSON.stringify({
      extracted,
      validation_issues: issues,
      confidence_score: Math.max(0, Math.min(1, confidence)),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("extract-invoice error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
