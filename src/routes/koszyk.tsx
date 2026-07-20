import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { supabase } from "@/integrations/supabase/client"
import { ArrowLeft, Trash2 } from 'lucide-react'

export const Route = createFileRoute('/koszyk')({
  component: KoszykPage,
})

// Bezpieczny generator UUID działający na każdym IP i urządzeniu
const generateSafeUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

function KoszykPage() {
  const [cartItems, setCartItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [paczkomatAdres, setPaczkomatAdres] = useState<string>("")
  const [isMapReady, setIsMapReady] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    paczkomat_id: '', 
    delivery_method: 'paczkomat',
    payment_method: 'stripe', 
  })

  // 1. ŁADOWANIE KOSZYKA Z WALIDACJĄ BAZY DANYCH (SUPABASE)
  useEffect(() => {
    const checkAndLoadCart = async () => {
      const saved = localStorage.getItem('dorawa_cart')
      if (!saved) return

      try {
        const parsedItems = JSON.parse(saved)
        if (parsedItems.length === 0) return

        const productIds = parsedItems.map((item: any) => item.product_id).filter(Boolean)

        if (productIds.length === 0) {
          setCartItems(parsedItems)
          return
        }

        const { data: existingProducts, error } = await supabase
          .from('products')
          .select('id')
          .in('id', productIds)
          .eq('hidden', false)
          .neq('status', 'sprzedany')

        if (!error && existingProducts) {
          const existingIds = existingProducts.map((p: any) => p.id)
          
          const validatedItems = parsedItems.filter((item: any) => 
            existingIds.includes(item.product_id)
          )

          setCartItems(validatedItems)
          localStorage.setItem('dorawa_cart', JSON.stringify(validatedItems))
          if (validatedItems.length !== parsedItems.length) {
            window.dispatchEvent(new Event('cart-updated'))
          }
        } else {
          setCartItems(parsedItems)
        }
      } catch (err) {
        console.error("Błąd podczas walidacji koszyka:", err)
      }
    }

    checkAndLoadCart()
  }, [])

  // 2. DYNAMICZNE ŁADOWANIE MAPY INPOST
  useEffect(() => {
    const cssLink = document.createElement('link')
    cssLink.rel = 'stylesheet'
    cssLink.href = "https://geowidget.inpost.pl/inpost-geowidget.css"
    document.head.appendChild(cssLink)

    const script = document.createElement('script')
    script.src = "https://geowidget.inpost.pl/inpost-geowidget.js"
    script.defer = true
    
    script.onload = async () => {
      await customElements.whenDefined("inpost-geowidget");

      window.onInPostPointSelected = (point: any) => {
        setFormData(prev => ({
          ...prev,
          paczkomat_id: point.name
        }))

        if (point.address?.line1 && point.address?.line2) {
          setPaczkomatAdres(`${point.address.line1}, ${point.address.line2}`)
        } else if (point.address_details) {
          setPaczkomatAdres(
            `${point.address_details.street} ${point.address_details.building_number}, ${point.address_details.city}`
          )
        }
      }

      if (mapContainerRef.current) {
        const widgetElement = document.createElement("inpost-geowidget")
        
        widgetElement.setAttribute("token", import.meta.env.VITE_INPOST_TOKEN);
        widgetElement.setAttribute("config", "parcelCollect")
        widgetElement.setAttribute("onpoint", "onInPostPointSelected")

        widgetElement.style.width = "100%"
        widgetElement.style.height = "100%"
        widgetElement.style.display = "block"

        mapContainerRef.current.replaceChildren(widgetElement)
        setIsMapReady(true)
      }
    }
    
    document.body.appendChild(script)

    return () => {
      if (document.head.contains(cssLink)) document.head.removeChild(cssLink)
      if (document.body.contains(script)) document.body.removeChild(script)
    }
  }, [])

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0)
  const deliveryCost = cartItems.length > 0 ? 22.50 : 0
  const total = subtotal + deliveryCost

  const handleRemoveItem = (index: number) => {
    const updatedCart = cartItems.filter((_, i) => i !== index)
    setCartItems(updatedCart)
    localStorage.setItem('dorawa_cart', JSON.stringify(updatedCart))
  }

  // OBSŁUGA DANYCH ZGODNA Z TWOIMI KOLUMNAMI W SUPABASE
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (cartItems.length === 0) {
      alert("Twój koszyk jest pusty!")
      return
    }

    if (!formData.paczkomat_id) {
      alert("Wybierz paczkomat z mapy!")
      return
    }

    setLoading(true)
    
    try {
      const orderId = generateSafeUUID()

      // Zapis do tabeli 'orders' idealnie pod Twoje kolumny
      const { error: dbError } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          paczkomat_id: formData.paczkomat_id,
          total_price: total,
          items: cartItems, // zapisujemy tablicę koszyka w kolumnie jsonb
          status: 'oczekuje_na_platnosc'
        })

      if (dbError) throw dbError

      // Wywołanie Edge Function do Stripe
      const productName = cartItems.map(item => item.name || item.title).join(', ')
      
      const { data: functionData, error: functionError } = await supabase.functions.invoke('create-checkout', {
        body: {
          amount: total,
          product_name: productName,
          orderId: orderId,
        }
      })

      if (functionError) throw functionError

      // Przekierowanie do Stripe
      if (functionData?.url) {
        window.location.href = functionData.url
      } else {
        throw new Error("Nie otrzymano linku przekierowania ze Stripe.")
      }

    } catch (error: any) {
      console.error("Błąd procesu zamówienia:", error)
      alert(`Wystąpił błąd: ${error.message || 'Problem z bazą lub płatnością.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 lg:py-12 font-sans">
      <Link to="/produkty" className="flex items-center text-xs tracking-widest mb-12 hover:underline text-gray-500">
        <ArrowLeft className="mr-2" size={14}/> POWRÓT DO SKLEPU
      </Link>

      <form onSubmit={handleOrderSubmit} className="grid lg:grid-cols-2 gap-16">
        <div className="space-y-8">
          <div>
            <h2 className="text-sm font-bold tracking-widest uppercase border-b pb-4 mb-6">DANE ROZLICZENIOWE</h2>
            <div className="space-y-4">
              <input required placeholder="IMIĘ I NAZWISKO" className="border p-3 w-full text-sm outline-none focus:border-black transition" onChange={e => setFormData({...formData, customer_name: e.target.value})} />
              <input required type="email" placeholder="ADRES EMAIL" className="border p-3 w-full text-sm outline-none focus:border-black transition" onChange={e => setFormData({...formData, customer_email: e.target.value})} />
              <input required type="tel" placeholder="NUMER TELEFONU" className="border p-3 w-full text-sm outline-none focus:border-black transition" onChange={e => setFormData({...formData, customer_phone: e.target.value})} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold tracking-widest uppercase border-b pb-4 mb-4">WYBIERZ PACZKOMAT</h3>
            {formData.paczkomat_id ? (
              <div className="p-4 bg-gray-100 border text-sm mb-4 font-mono">
                <div className="font-bold text-black mb-1">WYBRANY PUNKT: {formData.paczkomat_id}</div>
                {paczkomatAdres && <div className="text-xs text-gray-600">{paczkomatAdres}</div>}
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 text-sm mb-4 text-yellow-800">
                Wybierz swój punkt na mapie poniżej, aby złożyć zamówienie.
              </div>
            )}
            <div className="w-full h-[450px] border bg-gray-50 overflow-hidden flex items-center justify-center">
              <div ref={mapContainerRef} className="w-full h-full" style={{ display: isMapReady ? 'block' : 'none' }} />
              {!isMapReady && <div className="text-sm text-gray-400 animate-pulse">Inicjalizacja mapy dostaw...</div>}
            </div>
          </div>
        </div>

        <div className="bg-[#fcfcfc] border p-8 h-fit space-y-6">
          <h2 className="text-sm font-bold tracking-widest uppercase border-b pb-4">TWOJE ZAMÓWIENIE</h2>
          <div className="divide-y text-sm">
            {cartItems.length === 0 ? (
              <p className="text-gray-400 py-4 text-center">Koszyk jest pusty.</p>
            ) : (
              cartItems.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-3">
                  <span className="text-gray-600">{item.name || item.title} <span className="text-xs">x{item.quantity || 1}</span></span>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{(item.price * (item.quantity || 1)).toFixed(2)} PLN</span>
                    <button 
                      type="button"
                      onClick={() => handleRemoveItem(i)}
                      className="text-red-500 hover:text-red-700 transition p-1"
                      title="Usuń z koszyka"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500"><span>DOSTAWA (INPOST)</span><span>{deliveryCost.toFixed(2)} PLN</span></div>
            <div className="flex justify-between text-base font-bold pt-4 border-t"><span>DO ZAPŁATY</span><span>{total.toFixed(2)} PLN</span></div>
          </div>
          <button 
            type="submit" 
            disabled={loading || cartItems.length === 0} 
            className="w-full bg-black text-white py-4 text-xs tracking-widest font-bold hover:bg-neutral-800 transition disabled:opacity-50 uppercase"
          >
            {loading ? 'Przekierowanie...' : 'Zamów i zapłać'}
          </button>
        </div>
      </form>
    </div>
  )
}

declare global {
  interface Window {
    onInPostPointSelected: (point: any) => void
  }
}
