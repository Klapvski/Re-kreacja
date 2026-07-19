import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function CheckoutPage() {
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    paczkomat_id: "",
  });
  const [loading, setLoading] = useState(false);

  // Zmień na dane, które masz w koszyku
  const cartItem = { id: "ID_PRODUKTU", title: "Nazwa", price: 1014.99 };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderId = crypto.randomUUID();

      // 1. Zapisujemy zamówienie w bazie (status: oczekuje_na_platnosc)
      const { error: insertError } = await supabase
        .from("orders")
        .insert({
          id: orderId,
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          paczkomat_id: formData.paczkomat_id.toUpperCase(),
          status: "oczekuje_na_platnosc",
          total_price: cartItem.price,
          items: [{ id: cartItem.id, price: cartItem.price, title: cartItem.title }]
        });

      if (insertError) throw insertError;

      // 2. Wywołujemy Stripe (Backend zajmie się resztą po płatności)
      const { data, error: functionError } = await supabase.functions.invoke("create-checkout", {
        body: { 
          amount: cartItem.price, 
          orderId: orderId, 
          customer_email: formData.customer_email,
          metadata: { order_id: orderId, product_id: cartItem.id } // Kluczowe: przekazujemy ID produktu do Webhooka
        }
      });

      if (functionError) throw functionError;

      if (data?.url) {
        window.location.href = data.url;
      }

    } catch (error: any) {
      console.error("Błąd:", error);
      alert("Coś poszło nie tak.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <form onSubmit={handleOrderSubmit} className="space-y-4">
        <input required type="text" placeholder="Imię" onChange={e => setFormData({...formData, customer_name: e.target.value})} />
        <input required type="email" placeholder="Email" onChange={e => setFormData({...formData, customer_email: e.target.value})} />
        <input required type="tel" placeholder="Telefon" onChange={e => setFormData({...formData, customer_phone: e.target.value})} />
        <input required type="text" placeholder="Paczkomat" onChange={e => setFormData({...formData, paczkomat_id: e.target.value})} />
        <button type="submit" disabled={loading} className="w-full bg-yellow-500 p-3 rounded">
          {loading ? "Przekierowanie..." : "Zapłać"}
        </button>
      </form>
    </div>
  );
}