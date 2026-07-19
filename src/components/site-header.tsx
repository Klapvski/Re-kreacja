import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Search, Menu, X, LayoutDashboard, ShoppingBag } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/lib/favorites";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/produkty", label: "Wszystkie produkty" },
  { to: "/produkty", label: "Promocje" },
  { to: "/produkty", label: "Nowości" },
  { to: "/produkty", label: "Premium" },
] as const;

export function SiteHeader() {
  const navigate = useNavigate();
  const favorites = useFavorites();
  // Bezpieczne pobranie ids (jeśli hook zwróci coś innego, zabezpieczamy pustą tablicą)
  const ids = favorites && Array.isArray(favorites.ids) ? favorites.ids : [];
  
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const updateCartCount = () => {
    try {
      const storedData = localStorage.getItem("dorawa_cart");
      if (!storedData) {
        setCartCount(0);
        return;
      }
      const cart = JSON.parse(storedData);
      if (Array.isArray(cart)) {
        const totalItems = cart.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
        setCartCount(totalItems);
      } else {
        setCartCount(0);
      }
    } catch (e) {
      setCartCount(0);
    }
  };

  useEffect(() => {
    updateCartCount();

    window.addEventListener("storage", updateCartCount);
    window.addEventListener("cart-updated", updateCartCount);

    let cancelled = false;
    async function check() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return setIsAdmin(false);
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (!cancelled) setIsAdmin(!!data);
      } catch (e) {
        setIsAdmin(false);
      }
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());

    return () => {
      cancelled = true; 
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cart-updated", updateCartCount);
    };
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/produkty", search: { q: q.trim() || undefined } as never });
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="container-page flex items-center gap-4 py-3 md:py-4">
        <Logo />

        <nav className="ml-4 hidden lg:flex items-center gap-1 text-sm">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              activeProps={{ className: "text-primary" }}
              className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden md:flex flex-1 max-w-md">
          <label className="relative flex w-full items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Szukaj marki, kategorii, modelu…"
              className="w-full rounded-full border border-input bg-secondary/50 py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
            />
          </label>
        </form>

        <div className="ml-auto md:ml-2 flex items-center gap-1">
          {/* ULUBIONE */}
          <Link
            to="/ulubione"
            aria-label="Ulubione"
            className="relative grid h-10 w-10 place-items-center rounded-full text-foreground/80 hover:bg-secondary"
          >
            <Heart className="h-5 w-5" />
            {ids.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {ids.length}
              </span>
            )}
          </Link>

          {/* KOSZYK */}
          <Link
            to="/koszyk"
            aria-label="Koszyk"
            className="relative grid h-10 w-10 place-items-center rounded-full text-foreground/80 hover:bg-secondary"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-black px-1 text-[10px] font-semibold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {isAdmin && (
            <Button asChild size="sm" variant="secondary" className="hidden sm:inline-flex rounded-full">
              <Link to="/admin"><LayoutDashboard className="mr-1.5 h-4 w-4" /> Panel</Link>
            </Button>
          )}

          <button
            type="button"
            className="lg:hidden grid h-10 w-10 place-items-center rounded-full hover:bg-secondary"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className={cn("lg:hidden overflow-hidden border-t border-border/60 bg-background transition-[max-height]", open ? "max-h-96" : "max-h-0")}>
        <div className="container-page py-4 space-y-3">
          <form onSubmit={submitSearch} className="flex">
            <label className="relative flex w-full items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Szukaj…"
                className="w-full rounded-full border border-input bg-secondary/50 py-2 pl-10 pr-4 text-sm"
              />
            </label>
          </form>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg bg-secondary px-3 py-2"
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)} className="col-span-2 rounded-lg bg-primary px-3 py-2 text-center text-primary-foreground">
                Panel administratora
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}