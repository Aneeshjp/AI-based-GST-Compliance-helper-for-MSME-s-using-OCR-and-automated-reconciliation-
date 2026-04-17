import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Bell, AlertTriangle, Info, ShieldAlert, CheckCircle2, CalendarClock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/alerts")({
  component: () => <ProtectedRoute><Alerts /></ProtectedRoute>,
});

const sevStyles: Record<string, { icon: any; cls: string }> = {
  critical: { icon: ShieldAlert, cls: "text-destructive bg-destructive/10 border-destructive/30" },
  warning: { icon: AlertTriangle, cls: "text-warning bg-warning/10 border-warning/30" },
  info: { icon: Info, cls: "text-primary bg-primary/10 border-primary/30" },
};
const catIcon: Record<string, any> = { deadline: CalendarClock, mismatch: AlertTriangle, compliance: ShieldAlert, fraud: ShieldAlert, itc: Info };

function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("alerts").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setAlerts(data || []));
  }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("alerts").update({ is_read: true }).eq("id", id);
    setAlerts(alerts.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  const unread = alerts.filter(a => !a.is_read).length;

  return (
    <AppLayout title="Alerts & Notifications" subtitle={`${unread} unread · ${alerts.length} total`}>
      <div className="space-y-3 max-w-3xl">
        {alerts.map(a => {
          const sev = sevStyles[a.severity] || sevStyles.info;
          const SevIcon = sev.icon;
          const CatIcon = catIcon[a.category] || Bell;
          return (
            <div key={a.id} className={`bg-card border rounded-xl p-4 shadow-card ${a.is_read ? "opacity-60" : ""}`}>
              <div className="flex gap-4">
                <div className={`h-10 w-10 rounded-lg grid place-items-center border ${sev.cls}`}><SevIcon className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold">{a.title}</h4>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{a.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground capitalize"><CatIcon className="h-3 w-3" />{a.category}</span>
                    {!a.is_read && <button onClick={() => markRead(a.id)} className="text-xs text-primary font-medium hover:underline flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Mark read</button>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!alerts.length && <div className="text-center py-12 text-muted-foreground"><Bell className="h-10 w-10 mx-auto mb-3 opacity-40" />All clear — no alerts.</div>}
      </div>
    </AppLayout>
  );
}
