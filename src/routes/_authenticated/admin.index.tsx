import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, BadgePercent, Sparkles, CheckCircle2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [{ count: total }, { count: sale }, { count: newC }, { count: sold }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_on_sale", true),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_new", true),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "sprzedany"),
      ]);
      return { total: total ?? 0, sale: sale ?? 0, newC: newC ?? 0, sold: sold ?? 0 };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["admin", "recent"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, title, price, created_at, status").order("created_at", { ascending: false }).limit(6);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Witaj z powrotem</h2>
          <p className="text-sm text-muted-foreground">Podgląd katalogu</p>
        </div>
        <Button asChild className="rounded-full"><Link to="/admin/produkty/nowy"><Plus className="mr-1 h-4 w-4" /> Nowy produkt</Link></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Produkty w katalogu" value={stats?.total ?? 0} />
        <StatCard icon={BadgePercent} label="W promocji" value={stats?.sale ?? 0} accent="sale" />
        <StatCard icon={Sparkles} label="Nowości" value={stats?.newC ?? 0} accent="success" />
        <StatCard icon={CheckCircle2} label="Sprzedane" value={stats?.sold ?? 0} accent="primary" />
      </div>

      <div>
        <h3 className="font-display text-lg font-semibold">Ostatnio dodane</h3>
        <div className="mt-3 overflow-hidden rounded-2xl border border-border/60 bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nazwa</th>
                <th className="px-4 py-3">Cena</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dodano</th>
              </tr>
            </thead>
            <tbody>
              {(recent ?? []).map((p) => (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium"><Link to="/admin/produkty/$id" params={{ id: p.id }} className="hover:text-primary">{p.title}</Link></td>
                  <td className="px-4 py-3">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pl-PL")}</td>
                </tr>
              ))}
              {(!recent || recent.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Brak produktów. Dodaj pierwszy!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent = "primary" }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; accent?: "primary" | "sale" | "success" }) {
  const accentBg = accent === "sale" ? "bg-sale/10 text-sale" : accent === "success" ? "bg-success/10 text-success" : "bg-primary/10 text-primary";
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className={"grid h-10 w-10 place-items-center rounded-xl " + accentBg}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 font-display text-3xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}