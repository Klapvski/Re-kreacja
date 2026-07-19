import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "";

interface SitemapEntry { path: string; lastmod?: string; changefreq?: string; priority?: string }

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/produkty", changefreq: "daily", priority: "0.9" },
          { path: "/ulubione", changefreq: "monthly", priority: "0.3" },
        ];

        try {
          const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });
          const { data: cats } = await supa.from("categories").select("slug");
          (cats ?? []).forEach((c) => entries.push({ path: `/kategoria/${c.slug}`, changefreq: "weekly", priority: "0.6" }));
          const { data: prods } = await supa.from("products").select("slug, updated_at").eq("hidden", false).limit(2000);
          (prods ?? []).forEach((p) => entries.push({ path: `/produkt/${p.slug}`, lastmod: p.updated_at, changefreq: "weekly", priority: "0.7" }));
        } catch {
          // ignore — fall back to static entries
        }

        const urls = entries.map((e) => [
          `  <url>`,
          `    <loc>${BASE_URL}${e.path}</loc>`,
          e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
          e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
          e.priority ? `    <priority>${e.priority}</priority>` : null,
          `  </url>`,
        ].filter(Boolean).join("\n"));

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});