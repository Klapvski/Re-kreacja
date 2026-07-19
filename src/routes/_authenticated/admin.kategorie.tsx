import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, Save, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/kategorie")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  async function add() {
    if (!name.trim()) return;
    const slug = slugify(name);
    const maxOrder = Math.max(0, ...(data ?? []).map((c) => c.sort_order));
    const { error } = await supabase.from("categories").insert({ name: name.trim(), slug, sort_order: maxOrder + 10 });
    if (error) return toast.error(error.message);
    setName("");
    qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
    toast.success("Dodano kategorię");
  }

  async function rename(id: string, newName: string) {
    const { error } = await supabase.from("categories").update({ name: newName, slug: slugify(newName) }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    toast.success("Zapisano");
  }

  async function remove(id: string) {
    if (!confirm("Usunąć kategorię?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "categories"] });
  }

  async function move(id: string, delta: number) {
    const c = (data ?? []).find((x) => x.id === id);
    if (!c) return;
    await supabase.from("categories").update({ sort_order: c.sort_order + delta }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin", "categories"] });
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold">Kategorie</h2>

      <div className="flex gap-2 rounded-2xl border border-border/60 bg-card p-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nowa kategoria" className="admin-input flex-1" />
        <Button onClick={add} className="rounded-full"><Plus className="mr-1 h-4 w-4" /> Dodaj</Button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card">
        {(data ?? []).map((c) => (
          <CategoryRow key={c.id} category={c} onRename={rename} onRemove={remove} onMove={move} />
        ))}
      </div>
    </div>
  );
}

function CategoryRow({ category, onRename, onRemove, onMove }: {
  category: { id: string; name: string; slug: string; sort_order: number };
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, delta: number) => void;
}) {
  const [name, setName] = useState(category.name);
  const dirty = name !== category.name;
  return (
    <div className="flex items-center gap-2 border-t border-border/60 p-3 first:border-t-0">
      <input value={name} onChange={(e) => setName(e.target.value)} className="admin-input flex-1" />
      <span className="hidden sm:block text-xs text-muted-foreground w-40 truncate">/{category.slug}</span>
      <button onClick={() => onMove(category.id, -15)} className="rounded-lg p-2 hover:bg-secondary" title="W górę"><ArrowUp className="h-4 w-4" /></button>
      <button onClick={() => onMove(category.id, 15)} className="rounded-lg p-2 hover:bg-secondary" title="W dół"><ArrowDown className="h-4 w-4" /></button>
      {dirty && <button onClick={() => onRename(category.id, name)} className="rounded-lg bg-primary p-2 text-primary-foreground" title="Zapisz"><Save className="h-4 w-4" /></button>}
      <button onClick={() => onRemove(category.id)} className="rounded-lg p-2 hover:bg-destructive/10" title="Usuń"><Trash2 className="h-4 w-4 text-destructive" /></button>
    </div>
  );
}