import { useEffect, useState } from "react";
import type { ProductWithRelations } from "./products";

export interface CartItem {
  id: string;
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  image_url?: string;
  slug: string;
}

const CART_STORAGE_KEY = "dorawa_cart";

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Załaduj koszyk z localStorage przy starcie aplikacji
  useEffect(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch {
        setItems([]);
      }
    }
    setIsLoaded(true);
  }, []);

  // 2. Automatyczny zapis do localStorage przy każdej zmianie stanu 'items'
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isLoaded]);

  // Synchronizacja koszyka: usuwa produkty, których ID nie ma już w bazie (np. usunięte przez admina LUB wyprzedane do zera)
  const validateCart = (availableProductIds: string[]) => {
    setItems((prevItems) =>
      prevItems.filter((item) => availableProductIds.includes(item.product_id))
    );
  };

  // Dodaj produkt do koszyka (maksymalnie 1 sztuka)
  const addToCart = (product: ProductWithRelations) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.product_id === product.id);

      // Jeśli produkt już jest w koszyku, ignorujemy ponowne dodanie
      if (existingItem) {
        return prevItems;
      }

      // Dodajemy nowy produkt ze sztywną ilością 1
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        product_id: product.id,
        title: product.title,
        price: Number(product.price),
        quantity: 1,
        image_url: product.product_images[0]?.url,
        slug: product.slug,
      };
      return [...prevItems, newItem];
    });
  };

  // Usuń produkt z koszyka
  const removeFromCart = (cartItemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== cartItemId));
  };

  // Zaktualizuj ilość produktu (zabezpieczone przed przekroczeniem 1)
  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    // Skoro limit wynosi 1, każda wartość większa od 0 po prostu wymusza 1
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === cartItemId ? { ...item, quantity: 1 } : item
      )
    );
  };

  // Wyczyść cały koszyk
  const clearCart = () => {
    setItems([]);
  };

  // Oblicz sumę wartości koszyka
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Oblicz łączną liczbę sztuk w koszyku
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    total,
    itemCount,
    isLoaded,
    validateCart, // Eksportujemy funkcję do walidacji
  };
}