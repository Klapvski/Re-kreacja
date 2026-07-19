import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/product-form";

export const Route = createFileRoute("/_authenticated/admin/produkty/nowy")({
  component: () => (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold">Nowy produkt</h2>
      <ProductForm />
    </div>
  ),
});