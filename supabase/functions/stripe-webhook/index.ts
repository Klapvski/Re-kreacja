import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const body = await req.text();
    const event = JSON.parse(body);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.order_id;

      if (!orderId) {
        console.error("Brak order_id w metadata");
        return new Response("Brak order_id", { status: 400 });
      }

      // Pobierz zamówienie z bazy - w tym listę produktów z kolumny 'items'
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("status, items")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        console.error("Nie znaleziono zamówienia:", orderId, orderError);
        return new Response("Order not found", { status: 404 });
      }

      // Zabezpieczenie przed podwójnym przetworzeniem (Stripe czasem
      // wysyła to samo zdarzenie kilka razy)
      if (order.status === "zaplacone") {
        console.log(`Zamówienie ${orderId} już przetworzone, pomijam.`);
        return new Response("Already processed", { status: 200 });
      }

      // 1. Zmień status zamówienia na 'zaplacone'
      await supabase
        .from("orders")
        .update({ status: "zaplacone" })
        .eq("id", orderId);

      // 2. Odejmij stan magazynowy dla KAŻDEGO produktu z koszyka
      const items = Array.isArray(order.items) ? order.items : [];

      for (const item of items) {
        const productId = item.product_id;
        const quantity = item.quantity || 1;

        if (!productId) {
          console.warn("Pozycja koszyka bez product_id, pomijam:", item);
          continue;
        }

        const { error: stockError } = await supabase.rpc("decrement_stock", {
          p_product_id: productId,
          p_qty: quantity,
        });

        if (stockError) {
          console.error(`Błąd redukcji stanu dla ${productId}:`, stockError);
        } else {
          console.log(`Produkt ${productId}: odjęto ${quantity} szt.`);
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Błąd w webhooku:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});