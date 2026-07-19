import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";

/** Returns a signed URL for a stored object (short-lived). */
export async function getSignedUrl(path: string, expiresIn = 60 * 60): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function uploadProductImage(file: File, productSlug: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${productSlug}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function deleteProductImage(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}

export function getPublicImageUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}