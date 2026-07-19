import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useQuery, useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Filter, X } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { listProducts, listBrands, listCategories, type ProductFilters } from "@/lib/products";
// 🔥 WAŻNE: Zaimportuj instancję supabase (uaktualnij ścieżkę, jeśli masz ją w innym miejscu)
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  q: fallback(z.string().optional(), undefined),
  category: fallback(z.string().optional(), undefined),
  brand: fallback(z.string().optional(), undefined),
  size: fallback(z.string().optional(), undefined),
  color: fallback(z.string().optional(), undefined),
  minPrice: fallback(z.number().optional(), undefined),
  maxPrice: fallback(z.number().optional(), undefined),
  condition: fallback(z.string().optional(), undefined),
  gender: fallback(z.string().optional(), undefined),
  onSale: fallback(z.boolean().optional(), undefined),
  isNew: fallback(z.boolean().optional(), undefined),
  isPremium: fallback(z.boolean().optional(), undefined),
  sort: fallback(z.enum(["newest", "cheapest", "expensive", "biggest-sale"]).optional(), "newest").default("newest"),
});

const refOpts = queryOptions({
  queryKey: ["catalog-refs"],
  queryFn: async () => {
    const [brands, categories] = await Promise.all([listBrands(), listCategories()]);
    return { brands, categories };
  },
});

export const Route = createFileRoute("/produkty")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Produkty — Re-Kreacja" },
      { name: "description", content: "Katalog produktów Re-Kreacja: odzież outlet i używana marek premium." },
      { property: "og:title", content: "Produkty — Re-Kreacja" },
      { property: "og:url", content: "/produkty" },
    ],
    links: [{ rel: "canonical", href: "/produkty" }],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(refOpts);
  },
  component: ProductsPage,
});

function toFilters(s: z.infer<typeof searchSchema>): ProductFilters {
  return {
    search: s.q,
    categorySlug: s.category,
    brandIds: s.brand ? [s.brand] : undefined,
    sizes: s.size ? [s.size] : undefined,
    colors: s.color ? [s.color] : undefined,
    minPrice: s.minPrice,
    maxPrice: s.maxPrice,
    conditions: s.condition ? [s.condition] : undefined,
    gender: s.gender,
    onSale: s.onSale,
    isNew: s.isNew,
    isPremium: s.isPremium,
    sort: s.sort,
  };
}

// Pamiętaj, aby Twoja funkcja `listProducts` w `lib/products.ts` miała dopisany filtr bazy:
// .eq('hidden', false) lub status = 'available', żeby schowane elementy nie ładowały się z powrotem.

function ProductsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // 🔥 Potrzebne do czyszczenia cache React Query
  const { data: refs } = useSuspenseQuery(refOpts);
  
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: () => listProducts(toFilters(search)),
  });
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [search]);

  // 🔥 SYSTEM REALTIME SUPABASE
  useEffect(() => {
    // Subskrybujemy się pod stół produktów
    const channel = supabase
      .channel("catalog-realtime-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload) => {
          // Jeśli produkt został ukryty (hidden = true)
          if (payload.new.hidden === true) {
            // Unieważniamy cache React Query, zmuszając listę produktów do natychmiastowego pobrania świeżych danych bez przeładowania strony
            queryClient.invalidateQueries({ queryKey: ["products"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  function update(patch: Partial<z.infer<typeof searchSchema>>) {
    navigate({ to: "/produkty", search: ((prev: Record<string, unknown>) => ({ ...prev, ...patch })) as never });
  }

  const filters = (
    <div className="space-y-5 text-sm">
      <FilterGroup label="Kategoria">
        <select className="filter-select" value={search.category ?? ""} onChange={(e) => update({ category: e.target.value || undefined })}>
          <option value="">Wszystkie</option>
          {refs.categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
      </FilterGroup>
      <FilterGroup label="Marka">
        <select className="filter-select" value={search.brand ?? ""} onChange={(e) => update({ brand: e.target.value || undefined })}>
          <option value="">Wszystkie</option>
          {refs.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </FilterGroup>
      <FilterGroup label="Rozmiar">
        <input className="filter-input" placeholder="np. M, 38, 42" value={search.size ?? ""} onChange={(e) => update({ size: e.target.value || undefined })} />
      </FilterGroup>
      <FilterGroup label="Kolor">
        <input className="filter-input" placeholder="np. czarny" value={search.color ?? ""} onChange={(e) => update({ color: e.target.value || undefined })} />
      </FilterGroup>
      <FilterGroup label="Cena (zł)">
        <div className="flex gap-2">
          <input className="filter-input" type="number" placeholder="od" value={search.minPrice ?? ""} onChange={(e) => update({ minPrice: e.target.value ? Number(e.target.value) : undefined })} />
          <input className="filter-input" type="number" placeholder="do" value={search.maxPrice ?? ""} onChange={(e) => update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </FilterGroup>
      <FilterGroup label="Stan">
        <select className="filter-select" value={search.condition ?? ""} onChange={(e) => update({ condition: e.target.value || undefined })}>
          <option value="">Wszystkie</option>
          <option value="nowe">Nowe</option>
          <option value="outlet">Outlet</option>
          <option value="uzywane">Używane</option>
        </select>
      </FilterGroup>
      <FilterGroup label="Płeć">
        <select className="filter-select" value={search.gender ?? ""} onChange={(e) => update({ gender: e.target.value || undefined })}>
          <option value="">Wszystkie</option>
          <option value="damskie">Damskie</option>
          <option value="meskie">Męskie</option>
          <option value="dzieciece">Dziecięce</option>
          <option value="uniseks">Uniseks</option>
        </select>
      </FilterGroup>
      <FilterGroup label="Oznaczenia">
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!search.onSale} onChange={(e) => update({ onSale: e.target.checked || undefined })} /> Promocje</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!search.isNew} onChange={(e) => update({ isNew: e.target.checked || undefined })} /> Nowości</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!search.isPremium} onChange={(e) => update({ isPremium: e.target.checked || undefined })} /> Premium</label>
      </FilterGroup>
      <Button variant="outline" size="sm" className="w-full rounded-full" onClick={() => navigate({ to: "/produkty", search: { sort: "newest" } as never })}>
        Wyczyść filtry
      </Button>
    </div>
  );

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Wszystkie produkty</h1>
            {search.q && <p className="mt-1 text-sm text-muted-foreground">Wyniki dla „{search.q}"</p>}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Sortuj</label>
            <select className="rounded-full border border-input bg-background px-3 py-1.5 text-sm"
              value={search.sort}
              onChange={(e) => update({ sort: e.target.value as z.infer<typeof searchSchema>["sort"] })}>
              <option value="newest">Najnowsze</option>
              <option value="cheapest">Najtańsze</option>
              <option value="expensive">Najdroższe</option>
              <option value="biggest-sale">Największa promocja</option>
            </select>
            <Button variant="outline" size="sm" className="lg:hidden rounded-full" onClick={() => setSidebarOpen(true)}>
              <Filter className="mr-1 h-4 w-4" /> Filtry
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block sticky top-24 self-start rounded-2xl border border-border/60 bg-card p-5">
            {filters}
          </aside>

          {sidebarOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <div className="absolute inset-0 bg-foreground/40" onClick={() => setSidebarOpen(false)} />
              <aside className="relative ml-auto h-full w-80 max-w-full overflow-y-auto bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold">Filtry</h2>
                  <button onClick={() => setSidebarOpen(false)} aria-label="Zamknij"><X className="h-5 w-5" /></button>
                </div>
                {filters}
              </aside>
            </div>
          )}

          <section>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-secondary" />
                ))}
              </div>
            ) : !products || products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-16 text-center text-sm text-muted-foreground">
                Brak produktów spełniających kryteria.
              </div>
            ) : (
              <>
                <div className="mb-4 text-xs text-muted-foreground">{products.length} produkt(ów)</div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </SiteLayout>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

const _styles = () => null;