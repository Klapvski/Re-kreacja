import { supabase } from "@/integrations/supabase/client";
import { getPublicImageUrl } from "@/lib/storage";
import type { Tables } from "@/integrations/supabase/types";

export type ProductRow = Tables<"products">;
export type BrandRow = Tables<"brands">;
export type CategoryRow = Tables<"categories">;
export type ProductImageRow = Tables<"product_images">;

export interface ProductWithRelations extends ProductRow {
  brand: BrandRow | null;
  category: CategoryRow | null;
  product_images: Array<Pick<ProductImageRow, "id" | "url" | "sort_order">>;
}

const SELECT = `
  *,
  brand:brands(*),
  category:categories(*),
  product_images(id, url, sort_order)
` as const;

function normalize(row: ProductWithRelations): ProductWithRelations {
  return {
    ...row,
    product_images: (row.product_images ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((img) => ({ ...img, url: img.url.startsWith("http") ? img.url : getPublicImageUrl(img.url) })),
  };
}

export interface ProductFilters {
  search?: string;
  categorySlug?: string;
  brandIds?: string[];
  sizes?: string[];
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  conditions?: string[];
  gender?: string;
  onSale?: boolean;
  isNew?: boolean;
  isPremium?: boolean;
  sort?: "newest" | "cheapest" | "expensive" | "biggest-sale";
  limit?: number;
  includeHidden?: boolean;
}

export async function listProducts(filters: ProductFilters = {}): Promise<ProductWithRelations[]> {
  let query = supabase.from("products").select(SELECT);

  if (!filters.includeHidden) query = query.eq("hidden", false);
  if (filters.categorySlug) {
    const { data: cat } = await supabase.from("categories").select("id").eq("slug", filters.categorySlug).maybeSingle();
    if (cat) query = query.eq("category_id", cat.id);
    else return [];
  }
  if (filters.brandIds?.length) query = query.in("brand_id", filters.brandIds);
  if (filters.sizes?.length) query = query.in("size", filters.sizes);
  if (filters.colors?.length) query = query.in("color", filters.colors);
  if (filters.minPrice != null) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice != null) query = query.lte("price", filters.maxPrice);
  if (filters.conditions?.length) query = query.in("condition", filters.conditions as ("nowe" | "outlet" | "uzywane")[]);
  if (filters.gender) query = query.eq("gender", filters.gender as "damskie" | "meskie" | "dzieciece" | "uniseks");
  if (filters.onSale) query = query.eq("is_on_sale", true);
  if (filters.isNew) query = query.eq("is_new", true);
  if (filters.isPremium) query = query.eq("is_premium", true);
  if (filters.search) {
    const s = filters.search.trim();
    if (s) query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
  }

  switch (filters.sort) {
    case "cheapest":
      query = query.order("price", { ascending: true });
      break;
    case "expensive":
      query = query.order("price", { ascending: false });
      break;
    case "biggest-sale":
      query = query.order("sale_percent", { ascending: false, nullsFirst: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
  }
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => normalize(r as unknown as ProductWithRelations));
}

export async function getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
  const { data, error } = await supabase.from("products").select(SELECT).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? normalize(data as unknown as ProductWithRelations) : null;
}

export async function listBrands(): Promise<BrandRow[]> {
  const { data, error } = await supabase.from("brands").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase.from("categories").select("*").order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  const { data, error } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
}