import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/statystyki")({
  component: StatsPage,
});

function StatsPage() {
  const { data } = useQuery({
    queryKey: ["admin", "stats-full"],
    queryFn: async () => {
      const [{ count: total }, { count: available }, { count: sold }, { count: promo }, topBrands, topViewed] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "dostepny"),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "sprzedany"),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_on_sale", true),
        supabase.from("products").select("brand:brands(name)").not("brand_id", "is", null).limit(500),
        supabase.from("products").select("id, title, views").order("views", { ascending: false }).limit(6),
      ]);
      const counts = new Map<string, number>();
      (topBrands.data ?? []).forEach((r) => {
        const name = (r as { brand?: { name?: string } }).brand?.name;
        if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
      });
      const brands = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
      return { total, available, sold, promo, brands, topViewed: topViewed.data ?? [] };
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold">Statystyki</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Wszystkie", value: data?.total ?? 0 },
          { label: "Dostępne", value: data?.available ?? 0 },
          { label: "Sprzedane", value: data?.sold ?? 0 },
          { label: "W promocji", value: data?.promo ?? 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="mt-1 font-display text-3xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <h3 className="font-display text-lg font-semibold">Najpopularniejsze marki</h3>
          <ul className="mt-3 space-y-2">
            {(data?.brands ?? []).map(([name, n]) => (
              <li key={name} className="flex justify-between text-sm">
                <span>{name}</span>
                <span className="text-muted-foreground">{n}</span>
              </li>
            ))}
            {(!data || data.brands.length === 0) && <li className="text-sm text-muted-foreground">Brak danych.</li>}
          </ul>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <h3 className="font-display text-lg font-semibold">Najczęściej oglądane</h3>
          <ul className="mt-3 space-y-2">
            {(data?.topViewed ?? []).map((p) => (
              <li key={p.id} className="flex justify-between text-sm">
                <span className="truncate">{p.title}</span>
                <span className="text-muted-foreground">{p.views}</span>
              </li>
            ))}
            {(!data || data.topViewed.length === 0) && <li className="text-sm text-muted-foreground">Brak danych.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}