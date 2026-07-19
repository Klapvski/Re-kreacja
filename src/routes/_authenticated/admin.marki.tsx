import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/marki")({
  component: BrandsPage,
});

function BrandsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data } = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: async () => (await supabase.from("brands").select("*").order("name")).data ?? [],
  });

  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from("brands").insert({ name: name.trim(), slug: slugify(name) });
    if (error) return toast.error(error.message);
    setName("");
    qc.invalidateQueries({ queryKey: ["admin", "brands"] });
    qc.invalidateQueries({ queryKey: ["catalog-refs"] });
    toast.success("Dodano markę");
  }

  async function remove(id: string) {
    if (!confirm("Usunąć markę?")) return;
    await supabase.from("brands").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin", "brands"] });
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold">Marki</h2>
      <div className="flex gap-2 rounded-2xl border border-border/60 bg-card p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Zara" className="admin-input flex-1" />
        <Button onClick={add} className="rounded-full"><Plus className="mr-1 h-4 w-4" /> Dodaj</Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4">
            <div>
              <div className="font-medium">{b.name}</div>
              <div className="text-xs text-muted-foreground">/{b.slug}</div>
            </div>
            <button onClick={() => remove(b.id)} className="rounded-lg p-2 hover:bg-destructive/10">
              <Trash2 className="h-4 w-4 text-destructive" />
            </button>
          </div>
        ))}
        {(!data || data.length === 0) && (
          <div className="col-span-full rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Nie dodano jeszcze żadnej marki.
          </div>
        )}
      </div>
    </div>
  );
}