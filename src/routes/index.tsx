import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ArrowRight, Sparkles, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { SiteLayout } from "@/components/site-layout";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { listProducts, listCategories } from "@/lib/products";
import tShirtImage from "../../t-shirt.png";
import hoodieImage from "../../hoodie.png";
import sweaterImage from "../../sweater.png";
import jacketImage from "../../jacket.png";
import trenchCoatImage from "../../trench-coat.png";
import dressImage from "../../dress.png";
import jeansImage from "../../jeans.png";
import skirtImage from "../../skirt.png";
import runningShoeImage from "../../running-shoe.png";
import spodnieImage from "../../spodnie.png";
import parcelImage from "../../parcel.png";

const newestOpts = queryOptions({
  queryKey: ["products", "newest"],
  queryFn: () => listProducts({ limit: 8, sort: "newest" }),
});
const saleOpts = queryOptions({
  queryKey: ["products", "sale"],
  queryFn: () => listProducts({ limit: 4, onSale: true }),
});
const catsOpts = queryOptions({ queryKey: ["categories"], queryFn: () => listCategories() });

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(newestOpts);
    context.queryClient.ensureQueryData(saleOpts);
    context.queryClient.ensureQueryData(catsOpts);
  },
  component: HomePage,
});

function HomePage() {
  const { data: newest } = useSuspenseQuery(newestOpts);
  const { data: sale } = useSuspenseQuery(saleOpts);
  const { data: categories } = useSuspenseQuery(catsOpts);
  const visibleCategories = categories.filter((category) => category.name !== "Akcesoria" && category.slug !== "akcesoria");

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="container-page pt-8 md:pt-14">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Katalog aktualnie dostępny w sklepie
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Re-Kreacja
            </h1>
            <p className="mt-3 text-lg text-muted-foreground sm:text-xl">
              Odzież <span className="text-foreground font-medium">Outlet</span> i <span className="text-foreground font-medium">Używana</span> Marek Premium
            </p>
            <p className="mt-4 max-w-lg text-sm text-muted-foreground">
              Starannie wyselekcjonowane sztuki. Zaglądaj codziennie po nowości i wybieraj to,
              co odbierzesz z naszego sklepu stacjonarnego.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/produkty">Przeglądaj produkty <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to="/produkty" search={{ onSale: true } as never}>
                  <Tag className="mr-1 h-4 w-4" /> Zobacz promocje
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative"
          >
            <img
              src="/hero.png"
              alt="Hero"
              className="aspect-[16/9] w-full rounded-3xl object-cover shadow-[var(--shadow-elevated)]"
            />
            <div className="absolute -bottom-4 -left-4 hidden rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)] md:block">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Aktualnie</div>
              <div className="font-display text-2xl font-semibold">{newest.length}+</div>
              <div className="text-xs text-muted-foreground">nowych sztuk</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page mt-20">
        <SectionHeader title="Kategorie" subtitle="Wybierz to, czego szukasz" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {visibleCategories.map((c) => (
            <Link
              key={c.id}
              to="/kategoria/$slug"
              params={{ slug: c.slug }}
              className="card-lift group flex flex-col items-center justify-center gap-3 rounded-2xl bg-card p-4 text-center"
            >
              <div className="grid h-16 w-16 overflow-hidden rounded-full border border-border/60 bg-secondary p-2 shadow-sm transition-transform group-hover:scale-105">
                <img
                  src={getCategoryArtwork(c.name, c.slug)}
                  alt={c.name}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
              <span className="text-sm font-medium">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Newest */}
      <section className="container-page mt-20">
        <SectionHeader title="Nowo dodane" subtitle="Świeże produkty w katalogu" action={<Link to="/produkty" className="text-sm font-medium text-primary hover:underline">Zobacz wszystkie →</Link>} />
        {newest.length === 0 ? (
          <EmptyState message="Panel administratora doda tu wkrótce pierwsze produkty." />
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {newest.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Sale */}
      {sale.length > 0 && (
        <section className="container-page mt-20">
          <SectionHeader title="Wyprzedaż" subtitle="Największe okazje" action={<Link to="/produkty" search={{ onSale: true } as never} className="text-sm font-medium text-primary hover:underline">Wszystkie promocje →</Link>} />
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {sale.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Info */}
      <section className="container-page mt-20">
        <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-accent to-secondary p-8 md:p-12">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight">Odbiór w sklepie stacjonarnym</h2>
            <p className="mt-3 text-muted-foreground">
              To katalog produktów dostępnych aktualnie u nas w sklepie. Wybierz, co Cię interesuje
              i odbierz osobiście — bez konieczności zamawiania online.
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function getCategoryArtwork(name: string, slug: string) {
  const key = `${name} ${slug}`.toLowerCase();

  if (key.includes("koszul") || key.includes("t-shirt") || key.includes("tshirt")) return tShirtImage;
  if (key.includes("bluzy") || key.includes("hoodie")) return hoodieImage;
  if (key.includes("swetr") || key.includes("sweater")) return sweaterImage;
  if (key.includes("kurt") || key.includes("jacket")) return jacketImage;
  if (key.includes("trenc") || key.includes("coat")) return trenchCoatImage;
  if (key.includes("sukien") || key.includes("dress")) return dressImage;
  if (key.includes("jeans") || key.includes("dżins") || key.includes("dzins")) return jeansImage;
  if (key.includes("spódnic") || key.includes("spodnic") || key.includes("skirt")) return skirtImage;
  if (key.includes("but") || key.includes("shoe")) return runningShoeImage;
  if (key.includes("spodni")) return spodnieImage;
  if (key.includes("torebk") || key.includes("bag") || key.includes("purse") || key.includes("handbag")) return parcelImage;
  if (key.includes(" kg") || key.includes("kilogram") || key.includes("worek") || key.includes("hurt")) return parcelImage;
  return tShirtImage;
}
