import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/admin-layout";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Panel — Re-Kreacja" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLayout,
});