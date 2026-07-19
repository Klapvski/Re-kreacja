import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/ustawienia")({
  component: SettingsPage,
});

function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold">Ustawienia</h2>
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <h3 className="font-display text-base font-semibold">Konto</h3>
        <p className="mt-1 text-sm text-muted-foreground">Zalogowany jako <span className="font-medium text-foreground">{email ?? "…"}</span></p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <h3 className="font-display text-base font-semibold">Katalog</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Ten katalog prezentuje produkty dostępne w sklepie stacjonarnym. Zarządzanie produktami,
          markami, kategoriami i promocjami odbywa się z tego panelu.
        </p>
      </div>
    </div>
  );
}