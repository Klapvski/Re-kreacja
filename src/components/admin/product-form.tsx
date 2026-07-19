import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadProductImage, deleteProductImage, getPublicImageUrl } from "@/lib/storage";
import { slugify } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ImagePlaceholder } from "@/components/image-placeholder";
import { toast } from "sonner";
import { z } from "zod";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Image = Tables<"product_images">;

const formSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().max(4000).optional(),
  price: z.number().min(0),
  old_price: z.number().min(0).nullable(),
  brand_id: z.string().uuid().nullable(),
  category_id: z.string().uuid().nullable(),
  size: z.string().max(30).optional(),
  color: z.string().max(30).optional(),
  gender: z.enum(["damskie", "meskie", "dzieciece", "uniseks"]),
  condition: z.enum(["nowe", "outlet", "uzywane"]),
  stock: z.number().int().min(0),
  status: z.enum(["dostepny", "sprzedany", "ukryty"]),
  is_new: z.boolean(),
  is_premium: z.boolean(),
  is_on_sale: z.boolean(),
  sale_percent: z.number().int().min(0).max(100).nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  productId?: string;
}

export function ProductForm({ productId }: ProductFormProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: refs } = useQuery({
    queryKey: ["form-refs"],
    queryFn: async () => {
      const [b, c] = await Promise.all([
        supabase.from("brands").select("*").order("name"),
        supabase.from("categories").select("*").order("sort_order"),
      ]);
      return { brands: b.data ?? [], categories: c.data ?? [] };
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["product", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data: p } = await supabase.from("products").select("*").eq("id", productId!).maybeSingle();
      const { data: imgs } = await supabase.from("product_images").select("*").eq("product_id", productId!).order("sort_order");
      return { product: p as Product | null, images: (imgs ?? []) as Image[] };
    },
  });

  const [v, setV] = useState<FormValues>({
    title: "", description: "", price: 0, old_price: null, brand_id: null, category_id: null,
    size: "", color: "", gender: "uniseks", condition: "uzywane", stock: 1,
    status: "dostepny", is_new: true, is_premium: false, is_on_sale: false, sale_percent: null,
  });
  const [images, setImages] = useState<Image[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing?.product) {
      const p = existing.product;
      setV({
        title: p.title, description: p.description ?? "",
        price: Number(p.price), old_price: p.old_price ? Number(p.old_price) : null,
        brand_id: p.brand_id, category_id: p.category_id,
        size: p.size ?? "", color: p.color ?? "",
        gender: p.gender, condition: p.condition, stock: p.stock,
        status: p.status, is_new: p.is_new, is_premium: p.is_premium,
        is_on_sale: p.is_on_sale, sale_percent: p.sale_percent,
      });
      setImages(existing.images);
    }
  }, [existing]);

  function u<K extends keyof FormValues>(k: K, val: FormValues[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const slug = productId ?? slugify(v.title || "produkt");
      const uploaded: Image[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024) { toast.error(`${file.name}: max 8MB`); continue; }
        const path = await uploadProductImage(file, slug);
        if (productId) {
          const { data, error } = await supabase.from("product_images")
            .insert({ product_id: productId, url: path, sort_order: images.length + uploaded.length }).select().single();
          if (error) throw error;
          uploaded.push(data);
        } else {
          uploaded.push({ id: crypto.randomUUID(), product_id: "", url: path, sort_order: uploaded.length, created_at: new Date().toISOString() } as Image);
        }
      }
      setImages((prev) => [...prev, ...uploaded]);
      toast.success(`Dodano ${uploaded.length} zdjęcie(a)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(img: Image) {
    try {
      if (img.product_id) await supabase.from("product_images").delete().eq("id", img.id);
      await deleteProductImage(img.url);
      setImages((prev) => prev.filter((i) => i.id !== img.id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const parsed = formSchema.parse(v);
      const payload = {
        ...parsed,
        description: parsed.description || null,
        size: parsed.size || null,
        color: parsed.color || null,
      };
      if (productId) {
        const { error } = await supabase.from("products").update(payload).eq("id", productId);
        if (error) throw error;
        toast.success("Produkt zaktualizowany");
      } else {
        let slug = slugify(parsed.title);
        // ensure uniqueness
        const { data: exists } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
        if (exists) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
        const { data: created, error } = await supabase.from("products")
          .insert({ ...payload, slug }).select().single();
        if (error) throw error;
        // attach any pending images
        if (images.length > 0) {
          await supabase.from("product_images").insert(
            images.map((img, i) => ({ product_id: created.id, url: img.url, sort_order: i })),
          );
        }
        toast.success("Produkt dodany");
      }
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin"] });
      navigate({ to: "/admin/produkty" });
    } catch (err) {
      const msg = err instanceof z.ZodError ? "Sprawdź wypełnione pola." : (err as Error).message;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-6">
          <Field label="Tytuł" required>
            <input required value={v.title} onChange={(e) => u("title", e.target.value)} className="admin-input" maxLength={160} />
          </Field>
          <Field label="Opis">
            <textarea value={v.description} onChange={(e) => u("description", e.target.value)} rows={5} className="admin-input" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cena (zł)" required>
              <input type="number" step="0.01" min={0} required value={v.price} onChange={(e) => u("price", Number(e.target.value))} className="admin-input" />
            </Field>
            <Field label="Cena przed promocją">
              <input type="number" step="0.01" min={0} value={v.old_price ?? ""} onChange={(e) => u("old_price", e.target.value ? Number(e.target.value) : null)} className="admin-input" />
            </Field>
            <Field label="Marka">
              <select value={v.brand_id ?? ""} onChange={(e) => u("brand_id", e.target.value || null)} className="admin-input">
                <option value="">— brak —</option>
                {refs?.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Kategoria">
              <select value={v.category_id ?? ""} onChange={(e) => u("category_id", e.target.value || null)} className="admin-input">
                <option value="">— brak —</option>
                {refs?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Rozmiar"><input value={v.size} onChange={(e) => u("size", e.target.value)} className="admin-input" /></Field>
            <Field label="Kolor"><input value={v.color} onChange={(e) => u("color", e.target.value)} className="admin-input" /></Field>
            <Field label="Płeć">
              <select value={v.gender} onChange={(e) => u("gender", e.target.value as FormValues["gender"])} className="admin-input">
                <option value="damskie">Damskie</option>
                <option value="meskie">Męskie</option>
                <option value="dzieciece">Dziecięce</option>
                <option value="uniseks">Uniseks</option>
              </select>
            </Field>
            <Field label="Stan">
              <select value={v.condition} onChange={(e) => u("condition", e.target.value as FormValues["condition"])} className="admin-input">
                <option value="nowe">Nowe</option>
                <option value="outlet">Outlet</option>
                <option value="uzywane">Używane</option>
              </select>
            </Field>
            <Field label="Ilość"><input type="number" min={0} value={v.stock} onChange={(e) => u("stock", Number(e.target.value))} className="admin-input" /></Field>
            <Field label="Status">
              <select value={v.status} onChange={(e) => u("status", e.target.value as FormValues["status"])} className="admin-input">
                <option value="dostepny">Dostępny</option>
                <option value="sprzedany">Sprzedany</option>
                <option value="ukryty">Ukryty</option>
              </select>
            </Field>
            <Field label="Procent promocji">
              <input type="number" min={0} max={100} value={v.sale_percent ?? ""} onChange={(e) => u("sale_percent", e.target.value ? Number(e.target.value) : null)} className="admin-input" />
            </Field>
          </div>
          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.is_new} onChange={(e) => u("is_new", e.target.checked)} /> Nowość</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.is_premium} onChange={(e) => u("is_premium", e.target.checked)} /> Premium</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.is_on_sale} onChange={(e) => u("is_on_sale", e.target.checked)} /> Promocja</label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <h3 className="font-display text-base font-semibold">Zdjęcia</h3>
            <p className="mt-1 text-xs text-muted-foreground">Do 8MB / plik. Pierwsze zdjęcie to okładka.</p>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground hover:border-primary hover:text-primary">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
              <span>Kliknij lub upuść pliki</span>
              <input type="file" accept="image/*" multiple hidden onChange={(e) => handleUpload(e.target.files)} />
            </label>
            {images.length === 0 ? (
              <ImagePlaceholder className="mt-4 rounded-xl" aspect="square" />
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {images.map((img) => (
                  <div key={img.id} className="group relative overflow-hidden rounded-xl">
                    <img src={img.url.startsWith("http") ? img.url : getPublicImageUrl(img.url)} alt="" className="aspect-square w-full object-cover" />
                    <button type="button" onClick={() => removeImage(img)}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-destructive opacity-0 transition-opacity group-hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="flex-1 rounded-full">
              {saving ? "Zapisywanie…" : productId ? "Zapisz zmiany" : "Dodaj produkt"}
            </Button>
            {productId && (
              <Button type="button" variant="outline" className="rounded-full"
                onClick={async () => {
                  if (!confirm("Usunąć produkt?")) return;
                  await supabase.from("products").delete().eq("id", productId);
                  toast.success("Produkt usunięty");
                  navigate({ to: "/admin/produkty" });
                }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}{required && " *"}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}