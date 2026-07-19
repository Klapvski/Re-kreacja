import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/lib/favorites";
import { supabase } from "@/integrations/supabase/client";
import { getPublicImageUrl } from "@/lib/storage";
import type { ProductWithRelations } from "@/lib/products";

export const Route = createFileRoute("/ulubione")({
  head: () => ({
    meta: [
      { title: "Ulubione — Re-Kreacja" },
      { name: "description", content: "Twoje ulubione produkty w katalogu Re-Kreacja." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { ids } = useFavorites();
  const { data: products, isLoading } = useQuery({
    queryKey: ["favorites", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, brand:brands(*), category:categories(*), product_images(id, url, sort_order)")
        .in("id", ids);
      if (error) throw error;
      return (data ?? []).map((r) => {
        const row = r as unknown as ProductWithRelations;
        return {
          ...row,
          product_images: (row.product_images ?? [])
            .slice()
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((img) => ({ ...img, url: img.url.startsWith("http") ? img.url : getPublicImageUrl(img.url) })),
        };
      });
    },
  });

  return (
    <SiteLayout>
      <div className="container-page py-8">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Ulubione</h1>
        <p className="mt-2 text-muted-foreground">Twoja prywatna lista — zapisana lokalnie w przeglądarce.</p>

        {ids.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-dashed p-16 text-center">
            <Heart className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Nie masz jeszcze ulubionych produktów.</p>
            <Button asChild className="mt-6 rounded-full"><Link to="/produkty">Przeglądaj katalog</Link></Button>
          </div>
        ) : isLoading ? (
          <div className="mt-8 text-muted-foreground">Ładowanie…</div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {(products ?? []).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}