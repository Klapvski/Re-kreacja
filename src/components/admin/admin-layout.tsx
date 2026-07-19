import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
// Importujemy dodatkowo ikonę ShoppingBag dla zamówień
import { LayoutDashboard, Package, Tag, Store, BadgePercent, BarChart3, Settings, LogOut, Menu, X, ExternalLink, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean };

const ITEMS: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/produkty", label: "Produkty", icon: Package },
  { to: "/admin/zamowienia", label: "Zamówienia", icon: ShoppingBag }, // <-- NOWA ZAKŁADKA
  { to: "/admin/kategorie", label: "Kategorie", icon: Tag },
  { to: "/admin/marki", label: "Marki", icon: Store },
  { to: "/admin/promocje", label: "Promocje", icon: BadgePercent },
  { to: "/admin/statystyki", label: "Statystyki", icon: BarChart3 },
  { to: "/admin/ustawienia", label: "Ustawienia", icon: Settings },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/authorize", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-64 border-r border-border/60 bg-card p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between">
          <Logo />
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Zamknij"><X className="h-5 w-5" /></button>
        </div>
        <nav className="mt-6 space-y-0.5 text-sm">
          {ITEMS.map((item) => {
            const active = item.exact ? path === item.to : path === item.to || path.startsWith(item.to + "/");
            return (
              <Link key={item.to} to={item.to as never} onClick={() => setOpen(false)}
                className={cn("flex items-center gap-3 rounded-xl px-3 py-2 transition-colors", active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                <item.icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-4 bottom-4 space-y-2">
          <Button asChild variant="outline" size="sm" className="w-full rounded-full">
            <Link to="/"><ExternalLink className="mr-1 h-4 w-4" /> Otwórz sklep</Link>
          </Button>
          <Button onClick={signOut} variant="ghost" size="sm" className="w-full rounded-full text-muted-foreground">
            <LogOut className="mr-1 h-4 w-4" /> Wyloguj
          </Button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
          <h1 className="font-display text-lg font-semibold">Panel administratora</h1>
        </header>
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}