import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().trim().email();
const passwordSchema = z.string().min(8);

export const Route = createFileRoute("/authorize")({
  head: () => ({
    meta: [
      { title: "Logowanie administratora — Re-Kreacja" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const em = emailSchema.parse(email);
      const pw = passwordSchema.parse(password);
      const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
      if (error) throw error;
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      const msg = err instanceof z.ZodError
        ? "Sprawdź adres e-mail i hasło (min. 8 znaków)."
        : (err as { message?: string })?.message ?? "Wystąpił błąd.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <div className="container-page flex justify-center py-16">
        <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-8 shadow-[var(--shadow-soft)]">
          <h1 className="font-display text-2xl font-semibold">Logowanie administratora</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dostęp wyłącznie dla administratorów sklepu.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">E-mail</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Hasło</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 outline-none focus:border-primary"
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full rounded-full" size="lg">
              {busy ? "Chwila…" : "Zaloguj się"}
            </Button>
          </form>
        </div>
      </div>
    </SiteLayout>
  );
}
