import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Heart, ArrowLeft, MapPin, Plus, Minus, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { ImagePlaceholder } from "@/components/image-placeholder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, calcDiscountPercent } from "@/lib/format";
import { useFavorites } from "@/lib/favorites";
import { getProductBySlug } from "@/lib/products";
import { cn } from "@/lib/utils";

// !!! WAŻNE !!! 
// Dostosuj poniższy import do miejsca, w którym masz logikę koszyka (np. context, hook, zustand)
import { useCart } from "@/lib/cart"; 

const productOpts = (slug: string) => queryOptions({
  queryKey: ["product", slug],
  queryFn: async () => {
    const p = await getProductBySlug(slug);
    if (!p) throw notFound();
    return p;
  },
});

export const Route = createFileRoute("/produkt/$slug")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(productOpts(params.slug)),
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Produkt niedostępny — Re-Kreacja" }, { name: "robots", content: "noindex" }] };
    const p = loaderData;
    return {
      meta: [
        { title: `${p.title} — Re-Kreacja` },
        { name: "description", content: p.description?.slice(0, 155) ?? `${p.title} — dostępne w sklepie stacjonarnym Re-Kreacja.` },
        { property: "og:title", content: `${p.title} — Re-Kreacja` },
        { property: "og:description", content: p.description?.slice(0, 155) ?? "" },
        { property: "og:type", content: "product" },
        { property: "og:url", content: `/produkt/${params.slug}` },
        ...(p.product_images[0]?.url ? [{ property: "og:image", content: p.product_images[0].url }] : []),
      ],
      links: [{ rel: "canonical", href: `/produkt/${params.slug}` }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.title,
          description: p.description ?? undefined,
          brand: p.brand?.name ? { "@type": "Brand", name: p.brand.name } : undefined,
          image: p.product_images.map((i) => i.url),
          offers: {
            "@type": "Offer",
            price: Number(p.price),
            priceCurrency: "PLN",
            availability: p.status === "dostepny" && p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        }),
      }],
    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-page py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">Produkt nie został znaleziony</h1>
        <p className="mt-2 text-muted-foreground">Mógł zostać usunięty lub sprzedany.</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/produkty">Wróć do katalogu</Link></Button>
      </div>
    </SiteLayout>
  ),
  errorComponent: () => (
    <SiteLayout>
      <div className="container-page py-24 text-center text-muted-foreground">Nie udało się załadować produktu.</div>
    </SiteLayout>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { data: p } = useSuspenseQuery(productOpts(slug));
  const { has, toggle } = useFavorites();
  
  // Pobieramy funkcję dodawania do koszyka (dostosuj nazwę funkcji do swojego koszyk.tsx)
  const { addToCart } = useCart();

  const [active, setActive] = useState(0);
  const [quantity, setQuantity] = useState(1); // Stan dla ilości produktu

  const favorite = has(p.id);
  const discount = calcDiscountPercent(Number(p.price), p.old_price ? Number(p.old_price) : null) ?? p.sale_percent;
  const images = p.product_images;
  const available = p.status === "dostepny" && p.stock > 0;

  // Obsługa zmiany ilości
  const handleIncrement = () => {
    if (quantity < p.stock) setQuantity(prev => prev + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) setQuantity(prev => prev - 1);
  };

  // Dodawanie do koszyka
  const handleAddToCart = () => {
    if (!available) return;
    // Dostosuj przekazywane parametry do struktury swojej funkcji w koszyku
    addToCart(p, quantity); 
  };

  // Kup teraz -> Dodaj do koszyka i przekieruj
  const handleBuyNow = () => {
    if (!available) return;
    addToCart(p, quantity);
    navigate({ to: "/koszyk" }); // Przekierowanie na trasę koszyka
  };

  return (
    <SiteLayout>
      <div className="container-page py-6">
        <Link to="/produkty" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Wróć do katalogu
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="overflow-hidden rounded-3xl bg-card">
              {images.length > 0 ? (
                <img src={images[active].url} alt={p.title} className="aspect-[4/5] w-full object-cover" />
              ) : (
                <ImagePlaceholder aspect="portrait" className="rounded-3xl" />
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((img, i) => (
                  <button key={img.id} onClick={() => setActive(i)}
                    className={cn("overflow-hidden rounded-xl border-2 transition-colors", i === active ? "border-primary" : "border-transparent")}>
                    <img src={img.url} alt="" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="flex flex-wrap gap-2">
              {p.is_premium && <Badge className="bg-premium text-premium-foreground">Premium</Badge>}
              {p.is_new && <Badge className="bg-success text-success-foreground">Nowość</Badge>}
              {(p.is_on_sale || discount) && <Badge className="bg-sale text-sale-foreground">{discount ? `-${discount}%` : "Promocja"}</Badge>}
            </div>
            {p.brand?.name && <div className="mt-3 text-sm uppercase tracking-widest text-muted-foreground">{p.brand.name}</div>}
            <h1 className="mt-1 font-display text-3xl font-semibold leading-tight sm:text-4xl">{p.title}</h1>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="font-display text-4xl font-semibold">{formatPrice(p.price)}</span>
              {p.old_price && Number(p.old_price) > Number(p.price) && (
                <span className="text-lg text-muted-foreground line-through">{formatPrice(p.old_price)}</span>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <Detail label="Kategoria" value={p.category?.name} />
              <Detail label="Rozmiar" value={p.size} />
              <Detail label="Kolor" value={p.color} />
              <Detail label="Stan" value={conditionLabel(p.condition)} />
              <Detail label="Płeć" value={genderLabel(p.gender)} />
              <Detail label="Dostępność" value={available ? `Dostępny (${p.stock})` : "Niedostępny"} />
            </div>

            {p.description && (
              <div className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {p.description}
              </div>
            )}

            {/* SEKCJA ZAKUPOWA (Ilość + Przyciski) */}
            {available && (
              <div className="mt-8 space-y-4">
                {/* Wybór Ilości */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground">Ilość:</span>
                  <div className="flex items-center rounded-full border bg-background p-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleDecrement} disabled={quantity <= 1}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleIncrement} disabled={quantity >= p.stock}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Główne przyciski akcji */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" className="flex-1 rounded-full" onClick={handleAddToCart}>
                    <ShoppingCart className="mr-2 h-5 w-5" /> Dodaj do koszyka
                  </Button>
                  <Button size="lg" variant="secondary" className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/95" onClick={handleBuyNow}>
                    Kup teraz
                  </Button>
                </div>
              </div>
            )}

            {/* Polubienia i status sklepu */}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button size="lg" className="w-full rounded-full sm:w-auto" onClick={() => toggle(p.id)} variant={favorite ? "default" : "outline"}>
                <Heart className={cn("mr-2 h-4 w-4", favorite && "fill-current")} />
                {favorite ? "W ulubionych" : "Dodaj do ulubionych"}
              </Button>
            </div>

            <div className="mt-6 rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
              <div className="flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4" /> Produkt dostępny w sklepie stacjonarnym
              </div>
              <p className="mt-1 text-muted-foreground">Zapraszamy po odbiór osobisty w Re-Kreacja.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </SiteLayout>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function conditionLabel(c: string) {
  return c === "nowe" ? "Nowy" : c === "outlet" ? "Outlet" : "Używany";
}
function genderLabel(g: string) {
  return g === "damskie" ? "Damskie" : g === "meskie" ? "Męskie" : g === "dzieciece" ? "Dziecięce" : "Uniseks";
}