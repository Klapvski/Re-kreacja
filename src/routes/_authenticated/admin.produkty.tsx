import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Eye, EyeOff, CheckCircle2, Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, slugify } from "@/lib/format";
import { getPublicImageUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { ImagePlaceholder } from "@/components/image-placeholder";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/produkty")({
  component: () => {
    const path = useRouterState({ select: (s) => s.location.pathname });
    // Show list only on the exact route; child routes render via <Outlet />
    return path === "/admin/produkty" ? <ProductsList /> : <Outlet />;
  },
});

function ProductsList() {
  const qc = useQueryClient();
  const { data: products, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, brand:brands(name), product_images(url, sort_order)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function updateProduct(id: string, patch: Partial<{ status: "dostepny" | "sprzedany" | "ukryty"; hidden: boolean; sold_count: number }>, msg: string) {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  async function remove(id: string) {
    if (!confirm("Usunąć produkt?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Usunięto");
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  async function duplicate(id: string) {
    const { data: p } = await supabase.from("products").select("*").eq("id", id).single();
    if (!p) return;
    const { id: _id, created_at, updated_at, slug, views, sold_count, ...rest } = p;
    let newSlug = `${slug}-kopia-${Date.now().toString(36).slice(-4)}`;
    const { error } = await supabase.from("products").insert({ ...rest, slug: newSlug, title: p.title + " (kopia)" });
    if (error) return toast.error(error.message);
    toast.success("Zduplikowano");
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">Produkty</h2>
        <Button asChild className="rounded-full"><Link to="/admin/produkty/nowy"><Plus className="mr-1 h-4 w-4" /> Nowy</Link></Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Zdjęcie</th>
              <th className="px-4 py-3">Nazwa</th>
              <th className="px-4 py-3">Marka</th>
              <th className="px-4 py-3">Cena</th>
              <th className="px-4 py-3">Rozmiar</th>
              <th className="px-4 py-3">Stan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Dodano</th>
              <th className="px-4 py-3 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Ładowanie…</td></tr>
            ) : (products?.length ?? 0) === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Brak produktów.</td></tr>
            ) : products!.map((p) => {
              const cover = p.product_images?.[0]?.url;
              return (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="px-4 py-2">
                    {cover ? (
                      <img src={cover.startsWith("http") ? cover : getPublicImageUrl(cover)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <ImagePlaceholder aspect="square" className="h-12 w-12 rounded-lg" label="" />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Link to="/admin/produkty/$id" params={{ id: p.id }} className="font-medium hover:text-primary">{p.title}</Link>
                    <div className="text-xs text-muted-foreground">
                      {p.is_new && "Nowość · "}{p.is_premium && "Premium · "}{p.is_on_sale && "Promocja"}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{(p as { brand?: { name?: string } }).brand?.name ?? "—"}</td>
                  <td className="px-4 py-2">
                    <div>{formatPrice(p.price)}</div>
                    {p.old_price && <div className="text-xs text-muted-foreground line-through">{formatPrice(p.old_price)}</div>}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{p.size ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{p.condition}</td>
                  <td className="px-4 py-2">
                    <span className={"rounded-full px-2 py-0.5 text-xs " + (p.status === "dostepny" ? "bg-success/10 text-success" : p.status === "sprzedany" ? "bg-muted text-muted-foreground" : "bg-secondary text-muted-foreground")}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pl-PL")}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <IconBtn label="Edytuj"><Link to="/admin/produkty/$id" params={{ id: p.id }}><Edit className="h-4 w-4" /></Link></IconBtn>
                      <IconBtn label="Sprzedany" onClick={() => updateProduct(p.id, { status: "sprzedany", sold_count: p.sold_count + 1 }, "Oznaczono jako sprzedany")}><CheckCircle2 className="h-4 w-4" /></IconBtn>
                      <IconBtn label={p.hidden ? "Pokaż" : "Ukryj"} onClick={() => updateProduct(p.id, { hidden: !p.hidden }, p.hidden ? "Pokazano" : "Ukryto")}>
                        {p.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </IconBtn>
                      <IconBtn label="Duplikuj" onClick={() => duplicate(p.id)}><Copy className="h-4 w-4" /></IconBtn>
                      <IconBtn label="Usuń" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></IconBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: () => void }) {
  if (onClick) {
    return <button type="button" onClick={onClick} title={label} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary">{children}</button>;
  }
  return <span title={label} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary">{children}</span>;
}