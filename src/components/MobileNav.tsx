import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, FileText, Upload, GitCompare, Users, FileBarChart, Bell, MessageSquare, Menu, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/reconciliation", label: "Reconcile", icon: GitCompare },
  { to: "/vendors", label: "Vendors", icon: Users },
  { to: "/returns", label: "Returns", icon: FileBarChart },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/assistant", label: "Assistant", icon: MessageSquare },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  return (
    <>
      <header className="lg:hidden h-14 flex items-center justify-between px-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary grid place-items-center"><ShieldCheck className="h-4 w-4 text-white" /></div>
          <div className="text-sm font-bold">GST<span className="text-saffron">Sahayak</span></div>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 rounded-md hover:bg-sidebar-accent"><Menu className="h-5 w-5" /></button>
      </header>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-sidebar text-sidebar-foreground p-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="space-y-1">
              {nav.map(item => {
                const active = location.pathname === item.to;
                const Icon = item.icon;
                return (
                  <Link key={item.to} to={item.to} onClick={() => setOpen(false)}
                    className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                      active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent")}>
                    <Icon className="h-4 w-4" />{item.label}
                  </Link>
                );
              })}
              <button onClick={() => { signOut(); setOpen(false); }} className="w-full mt-4 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-sidebar-accent">Sign out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
