import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/product-form";

export const Route = createFileRoute("/_authenticated/admin/produkty/$id")({
  component: () => {
    const { id } = Route.useParams();
    return (
      <div className="space-y-6">
        <h2 className="font-display text-2xl font-semibold">Edycja produktu</h2>
        <ProductForm productId={id} />
      </div>
    );
  },
});