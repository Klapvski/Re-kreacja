import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

// Service role, bo musimy odczytać zamówienie niezależnie od tego, kto
// woła tę funkcję (klient nie jest zalogowany podczas checkoutu).
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Dozwolona domena sklepu — ustaw jako sekret funkcji
// (supabase secrets set ALLOWED_ORIGIN=https://twoja-domena.pl)
const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = allowedOrigin === "*" ? "*" : (origin === allowedOrigin ? origin : allowedOrigin);
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const { orderId, customer_email } = await req.json();

    if (!orderId || typeof orderId !== "string") {
      return new Response(JSON.stringify({ error: "Brak orderId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    console.log("Tworzenie sesji dla orderId:", orderId);

    // KLUCZOWE: nigdy nie ufamy kwocie przysłanej przez klienta — każdy mógłby
    // ją podmienić i zapłacić grosze za drogie zamówienie. Kwotę pobieramy
    // z zamówienia, które zostało wcześniej zapisane w bazie.
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status, total_price")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Nie znaleziono zamówienia:", orderId, orderError);
      return new Response(JSON.stringify({ error: "Zamówienie nie istnieje" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    if (order.status !== "oczekuje_na_platnosc") {
      return new Response(JSON.stringify({ error: "Zamówienie nie oczekuje na płatność" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    const amount = Number(order.total_price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Nieprawidłowa kwota zamówienia" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "blik"],
      line_items: [
        {
          price_data: {
            currency: "pln",
            product_data: {
              name: `Zamówienie #${orderId}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/zamowienie-potwierdzone`,
      cancel_url: `${req.headers.get("origin")}/koszyk`,
      customer_email,

      metadata: {
        order_id: orderId,
      },
    });

    console.log("Metadata zapisane w Stripe:", session.metadata);

    return new Response(
      JSON.stringify({
        url: session.url,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...cors },
      }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        // Nie zwracamy surowego error.message do klienta w produkcji —
        // mogłoby to ujawnić szczegóły implementacji/stack trace.
        error: "Nie udało się utworzyć sesji płatności.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      }
    );
  }
});
