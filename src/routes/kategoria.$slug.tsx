import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { getCategoryBySlug, listProducts } from "@/lib/products";

const catOpts = (slug: string) => queryOptions({
  queryKey: ["category", slug],
  queryFn: async () => {
    const cat = await getCategoryBySlug(slug);
    if (!cat) throw notFound();
    const products = await listProducts({ categorySlug: slug, sort: "newest" });
    return { cat, products };
  },
});

export const Route = createFileRoute("/kategoria/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(catOpts(params.slug)),
  head: ({ loaderData, params }) => ({
    meta: loaderData ? [
      { title: `${loaderData.cat.name} — Re-Kreacja` },
      { name: "description", content: `${loaderData.cat.name} — katalog Re-Kreacja.` },
      { property: "og:url", content: `/kategoria/${params.slug}` },
    ] : [{ title: "Kategoria — Re-Kreacja" }, { name: "robots", content: "noindex" }],
    links: [{ rel: "canonical", href: `/kategoria/${params.slug}` }],
  }),
  component: CategoryPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-page py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">Kategoria nie istnieje</h1>
        <Button asChild className="mt-6 rounded-full"><Link to="/produkty">Wróć do katalogu</Link></Button>
      </div>
    </SiteLayout>
  ),
  errorComponent: () => <SiteLayout><div className="container-page py-24 text-center">Błąd ładowania</div></SiteLayout>,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(catOpts(slug));
  return (
    <SiteLayout>
      <div className="container-page py-8">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{data.cat.name}</h1>
        <p className="mt-2 text-muted-foreground">{data.products.length} produkt(ów) w kategorii</p>
        {data.products.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed p-16 text-center text-sm text-muted-foreground">Brak produktów.</div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {data.products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}