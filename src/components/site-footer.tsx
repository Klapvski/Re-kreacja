import { Link } from "@tanstack/react-router";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/30">
      <div className="container-page grid gap-8 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Katalog odzieży outlet i używanej marek premium. Produkty prezentowane w sklepie
            stacjonarnym Re-Kreacja. Zapraszamy do odwiedzin.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Katalog</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/produkty" className="hover:text-primary">Wszystkie produkty</Link></li>
            <li><Link to="/produkty" search={{ onSale: true } as never} className="hover:text-primary">Promocje</Link></li>
            <li><Link to="/produkty" search={{ isNew: true } as never} className="hover:text-primary">Nowości</Link></li>
            <li><Link to="/produkty" search={{ isPremium: true } as never} className="hover:text-primary">Premium</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sklep</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Odbiór osobisty Polkowice Skalników 50</li>
            <li>Kontakt telefoniczny 48+ 537 933 624</li>
            <li>Godziny otwarcia dostępne w Google Maps</li>
          </ul>
        </div>
      </div>
      <div className="container-page pb-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Re-Kreacja. Wszystkie prawa zastrzeżone.
      </div>
    </footer>
  );
}
