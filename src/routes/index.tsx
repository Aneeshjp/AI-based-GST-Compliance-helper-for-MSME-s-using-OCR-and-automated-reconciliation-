import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, FileText, GitCompare, AlertTriangle, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg gradient-primary grid place-items-center shadow-glow">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold tracking-tight">GST<span className="text-saffron">Sahayak</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm font-medium hover:text-primary">Sign in</Link>
            <Link to="/auth" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-card">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-[0.03]" />
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-24 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saffron/10 text-saffron-foreground text-xs font-medium mb-5 border border-saffron/20">
              <Sparkles className="h-3 w-3 text-saffron" />
              <span>Built for Indian MSMEs · GSTR-2B reconciliation</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Automate <span className="text-primary">GST compliance</span><br/>with AI you can trust.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              Upload invoices, let AI extract every field, reconcile against GSTR-2B, catch mismatches and fraud — and file returns with confidence. Built for businesses that don't have a full-time CA.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium shadow-elegant hover:opacity-90 transition">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border bg-card font-medium hover:bg-accent transition">
                View live demo
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" />No setup</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" />Demo data included</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" />Bank-grade security</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: FileText, title: "AI Invoice OCR", desc: "Snap any GST invoice — Gemini Vision extracts GSTIN, HSN, taxes and totals with confidence scoring." },
            { icon: GitCompare, title: "GSTR-2B Reconciliation", desc: "One-click match against vendor filings. Spot mismatches, missing entries, and ITC opportunities instantly." },
            { icon: AlertTriangle, title: "Fraud & Anomaly Detection", desc: "Catch duplicate invoices, suspicious GSTINs, and abnormal tax ratios before they cost you." },
            { icon: BarChart3, title: "Vendor Risk Scoring", desc: "Know which vendors file on time and which put your ITC at risk." },
            { icon: Sparkles, title: "GSTR-1 / 3B Drafts", desc: "Auto-generate return summaries. Cut filing prep from hours to minutes." },
            { icon: ShieldCheck, title: "GST AI Assistant", desc: "Ask anything: 'Can I claim ITC on this?' Get clear answers grounded in Indian GST law." },
          ].map(f => (
            <div key={f.title} className="p-6 rounded-2xl border bg-card shadow-card hover:shadow-elegant transition">
              <div className="h-10 w-10 rounded-lg gradient-primary grid place-items-center mb-4">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 pb-20">
        <div className="rounded-3xl gradient-hero p-10 lg:p-14 text-white shadow-elegant">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight max-w-2xl">Compliance shouldn't be a full-time job.</h2>
          <p className="mt-3 text-white/80 max-w-xl">Sign up in 30 seconds. We seed sample invoices and GSTR-2B data so you see the product in action immediately.</p>
          <Link to="/auth" className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-saffron text-saffron-foreground font-semibold hover:opacity-90 transition">
            Create free account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} GST Sahayak · An AI compliance assistant for Indian MSMEs
      </footer>
    </div>
  );
}
