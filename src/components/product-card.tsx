import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { ImagePlaceholder } from "./image-placeholder";
import { formatPrice, calcDiscountPercent } from "@/lib/format";
import { useFavorites } from "@/lib/favorites";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ProductWithRelations } from "@/lib/products";

export function ProductCard({ product }: { product: ProductWithRelations }) {
  const { has, toggle } = useFavorites();
  const favorite = has(product.id);
  const discount = calcDiscountPercent(Number(product.price), product.old_price ? Number(product.old_price) : null) ?? product.sale_percent;
  const cover = product.product_images?.[0]?.url ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="group"
    >
      <Link
        to="/produkt/$slug"
        params={{ slug: product.slug }}
        className="block card-lift rounded-2xl bg-card"
      >
        <div className="relative">
          {cover ? (
            <img
              src={cover}
              alt={product.title}
              loading="lazy"
              className="aspect-[3/4] w-full rounded-2xl object-cover"
            />
          ) : (
            <ImagePlaceholder aspect="portrait" className="rounded-2xl" />
          )}

          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.is_premium && (
              <Badge className="bg-premium text-premium-foreground shadow-sm">Premium</Badge>
            )}
            {product.is_new && (
              <Badge className="bg-success text-success-foreground shadow-sm">Nowość</Badge>
            )}
            {(product.is_on_sale || discount) && (
              <Badge className="bg-sale text-sale-foreground shadow-sm">
                {discount ? `-${discount}%` : "Promocja"}
              </Badge>
            )}
          </div>

          <button
            type="button"
            aria-label={favorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle(product.id);
            }}
            className={cn(
              "absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/90 backdrop-blur shadow-sm transition-colors",
              favorite ? "text-sale" : "text-foreground/70 hover:text-sale",
            )}
          >
            <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
          </button>
        </div>

        <div className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {product.brand?.name ?? "Bez marki"}
          </div>
          <h3 className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{product.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {product.category?.name && <span>{product.category.name}</span>}
            {product.size && <span>· rozm. {product.size}</span>}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-base font-semibold text-foreground">{formatPrice(product.price)}</span>
            {product.old_price && Number(product.old_price) > Number(product.price) && (
              <span className="text-xs text-muted-foreground line-through">{formatPrice(product.old_price)}</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}