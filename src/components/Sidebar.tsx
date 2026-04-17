import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, FileText, Upload, GitCompare, Users, FileBarChart, Bell, MessageSquare, ShieldCheck, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/upload", label: "Upload & OCR", icon: Upload },
  { to: "/reconciliation", label: "Reconciliation", icon: GitCompare },
  { to: "/vendors", label: "Vendors", icon: Users },
  { to: "/returns", label: "GST Returns", icon: FileBarChart },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/assistant", label: "AI Assistant", icon: MessageSquare },
];

export function Sidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 h-16 flex items-center gap-2 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-lg gradient-primary grid place-items-center shadow-glow">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight">GST<span className="text-saffron">Sahayak</span></div>
          <div className="text-[10px] text-sidebar-foreground/60 -mt-0.5 flex items-center gap-1"><Sparkles className="h-2.5 w-2.5" />AI Compliance</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(item => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="px-3 py-2 mb-2">
          <div className="text-xs text-sidebar-foreground/60">Signed in as</div>
          <div className="text-sm truncate">{user?.email}</div>
        </div>
        <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
