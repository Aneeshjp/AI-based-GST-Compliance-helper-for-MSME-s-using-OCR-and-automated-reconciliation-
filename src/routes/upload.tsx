import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Upload, Loader2, CheckCircle2, AlertTriangle, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/upload")({
  component: () => <ProtectedRoute><UploadPage /></ProtectedRoute>,
});

const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

function UploadPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [extracted, setExtracted] = useState<any>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [preview, setPreview] = useState<string>("");

  const onFile = (f: File | null) => {
    setFile(f); setExtracted(null); setIssues([]);
    if (f && f.type.startsWith("image/")) {
      const r = new FileReader(); r.onload = () => setPreview(r.result as string); r.readAsDataURL(f);
    } else setPreview("");
  };

  const extract = async () => {
    if (!file || !user) return;
    setBusy(true); setExtracted(null);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1]);
        r.onerror = rej; r.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("extract-invoice", {
        body: { imageBase64: base64, mimeType: file.type },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setExtracted(data.extracted); setIssues(data.validation_issues || []); setConfidence(data.confidence_score || 0);
      toast.success("Invoice data extracted!");
    } catch (e: any) {
      toast.error(e.message || "OCR failed");
    } finally { setBusy(false); }
  };

  const save = async () => {
    if (!extracted || !user) return;
    setBusy(true);
    try {
      const filePath = `${user.id}/${Date.now()}-${file?.name || "invoice"}`;
      if (file) await supabase.storage.from("invoices").upload(filePath, file);
      const { error } = await supabase.from("invoices").insert({
        user_id: user.id,
        invoice_number: extracted.invoice_number,
        invoice_date: extracted.invoice_date || null,
        vendor_name: extracted.vendor_name,
        vendor_gstin: extracted.vendor_gstin,
        buyer_gstin: extracted.buyer_gstin,
        taxable_amount: extracted.taxable_amount || 0,
        cgst: extracted.cgst || 0,
        sgst: extracted.sgst || 0,
        igst: extracted.igst || 0,
        total_amount: extracted.total_amount || 0,
        confidence_score: confidence,
        validation_issues: issues,
        raw_ocr_text: extracted.raw_text || null,
        file_path: file ? filePath : null,
        status: issues.length ? "flagged" : "pending",
      });
      if (error) throw error;
      toast.success("Invoice saved. Run reconciliation to match it.");
      setFile(null); setExtracted(null); setPreview(""); setIssues([]);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <AppLayout title="Upload & OCR" subtitle="Drop an invoice — AI extracts every field">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-2xl p-6 shadow-card">
          <label className="block">
            <div className="border-2 border-dashed rounded-xl p-10 text-center hover:border-primary hover:bg-primary/5 transition cursor-pointer">
              {file ? (
                <>
                  <FileText className="h-10 w-10 mx-auto text-primary mb-3" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(file.size/1024).toFixed(1)} KB · click to change</p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">Drop invoice here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF · uses your camera on mobile</p>
                </>
              )}
              <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={e => onFile(e.target.files?.[0] || null)} />
            </div>
          </label>
          {preview && <img src={preview} alt="" className="mt-4 rounded-lg max-h-64 mx-auto border" />}
          <button onClick={extract} disabled={!file || busy}
            className="mt-4 w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-card hover:opacity-90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Extract with AI
          </button>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-card">
          <h3 className="font-semibold mb-4">Extracted data</h3>
          {!extracted ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Upload an invoice and click <span className="font-medium">Extract</span>.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3 p-3 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground">Confidence</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-background rounded-full overflow-hidden">
                    <div className="h-full gradient-primary" style={{ width: `${confidence*100}%` }} />
                  </div>
                  <span className="text-sm font-bold">{Math.round(confidence*100)}%</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <Field label="Invoice #" value={extracted.invoice_number} />
                <Field label="Date" value={extracted.invoice_date} />
                <Field label="Vendor" value={extracted.vendor_name} />
                <Field label="Vendor GSTIN" value={extracted.vendor_gstin} mono />
                <Field label="Taxable" value={inr(extracted.taxable_amount)} mono />
                <Field label="CGST" value={inr(extracted.cgst)} mono />
                <Field label="SGST" value={inr(extracted.sgst)} mono />
                <Field label="IGST" value={inr(extracted.igst)} mono />
                <Field label="Total" value={inr(extracted.total_amount)} mono bold />
              </div>
              {issues.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30">
                  <div className="flex items-center gap-2 text-warning font-medium text-sm mb-1.5"><AlertTriangle className="h-4 w-4" />{issues.length} validation issue(s)</div>
                  <ul className="text-xs space-y-0.5 ml-6 list-disc">{issues.map(i => <li key={i}>{i.replace(/_/g," ")}</li>)}</ul>
                </div>
              )}
              <button onClick={save} disabled={busy} className="mt-4 w-full px-4 py-2.5 rounded-lg bg-success text-success-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save invoice
              </button>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Field({ label, value, mono, bold }: { label: string; value: any; mono?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-dashed last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${mono ? "font-mono" : ""} ${bold ? "font-bold" : ""}`}>{value || <span className="text-destructive text-xs">missing</span>}</span>
    </div>
  );
}
