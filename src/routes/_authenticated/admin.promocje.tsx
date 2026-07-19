import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/promocje")({
  component: PromosPage,
});

function PromosPage() {
  const qc = useQueryClient();
  const { data: promoted } = useQuery({
    queryKey: ["admin", "promoted"],
    queryFn: async () => (await supabase.from("products").select("*").eq("is_on_sale", true).order("created_at", { ascending: false })).data ?? [],
  });

  async function clearSale(id: string) {
    await supabase.from("products").update({ is_on_sale: false, sale_percent: null, sale_starts_at: null, sale_ends_at: null, old_price: null }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin"] });
    toast.success("Usunięto promocję");
  }

  async function setPercent(id: string, percent: number) {
    const { data: p } = await supabase.from("products").select("price, old_price").eq("id", id).single();
    if (!p) return;
    const base = Number(p.old_price ?? p.price);
    const newPrice = Math.round(base * (1 - percent / 100) * 100) / 100;
    await supabase.from("products").update({
      is_on_sale: true, sale_percent: percent,
      old_price: base, price: newPrice,
    }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin"] });
    toast.success(`Ustawiono -${percent}%`);
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold">Promocje</h2>
      <p className="text-sm text-muted-foreground">Zarządzaj promocjami produktów w katalogu.</p>

      <div className="rounded-2xl border border-border/60 bg-card">
        {(promoted ?? []).length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Brak aktywnych promocji. Edytuj produkt i zaznacz „Promocja".
          </div>
        )}
        {(promoted ?? []).map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 border-t border-border/60 p-4 first:border-t-0">
            <div className="min-w-0 flex-1">
              <Link to="/admin/produkty/$id" params={{ id: p.id }} className="font-medium hover:text-primary">{p.title}</Link>
              <div className="text-xs text-muted-foreground">
                {formatPrice(p.price)} {p.old_price && <span className="line-through">/ {formatPrice(p.old_price)}</span>}
                {p.sale_percent && ` · -${p.sale_percent}%`}
              </div>
            </div>
            <div className="flex gap-2">
              {[20, 30, 50].map((pct) => (
                <Button key={pct} size="sm" variant="outline" className="rounded-full" onClick={() => setPercent(p.id, pct)}>
                  -{pct}%
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => clearSale(p.id)}>Wyłącz</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}