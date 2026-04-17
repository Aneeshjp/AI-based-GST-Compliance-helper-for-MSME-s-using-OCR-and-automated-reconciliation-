import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fn = mode === "signin" ? signIn(email, password) : signUp(email, password, businessName || "My Business");
    const { error } = await fn;
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(mode === "signin" ? "Welcome back!" : "Account created — demo data is ready.");
      navigate({ to: "/dashboard" });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left visual */}
      <div className="hidden lg:flex flex-1 gradient-hero text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-white/10 grid place-items-center backdrop-blur"><ShieldCheck className="h-5 w-5" /></div>
          <span className="font-bold">GST<span className="text-saffron">Sahayak</span></span>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold leading-tight">GST compliance,<br/>handled by AI.</h2>
          <p className="mt-4 text-white/80 max-w-md">OCR, reconciliation, fraud detection and return filing — all in one secure dashboard built for Indian MSMEs.</p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[["98%","OCR accuracy"],["3-click","Reconcile 2B"],["₹0","To start"]].map(([v,l]) => (
              <div key={l} className="rounded-xl bg-white/5 p-4 backdrop-blur border border-white/10">
                <div className="text-2xl font-bold">{v}</div>
                <div className="text-xs text-white/70">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-white/50">Bank-grade encryption · RLS-protected data</div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-lg gradient-primary grid place-items-center"><ShieldCheck className="h-5 w-5 text-white" /></div>
            <span className="font-bold">GST<span className="text-saffron">Sahayak</span></span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{mode === "signin" ? "Sign in to your dashboard" : "Free forever for the first 100 invoices/month"}</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Business name</label>
                <input value={businessName} onChange={e => setBusinessName(e.target.value)} required
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Acme Pvt Ltd" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="mt-1 w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="you@business.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="••••••••" />
            </div>
            <button disabled={busy} type="submit" className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium shadow-card hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            {mode === "signin" ? "New here?" : "Have an account?"}{" "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium hover:underline">
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
