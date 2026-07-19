import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, CheckCircle2, Clock, XCircle, Truck, RefreshCw, DollarSign, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/zamowienia")({
  head: () => ({
    meta: [{ title: "Zamówienia — Panel — Re-Kreacja" }],
  }),
  component: OrdersPage,
});

type OrderItem = { id?: string; product_id?: string; title: string; price: number; quantity?: number };

type OrderStatus = "oczekuje_na_platnosc" | "zaplacone" | "wyslane" | "anulowane";

type Order = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  paczkomat_id: string | null;
  items: OrderItem[];
  total_price: number;
  status: OrderStatus;
};

type ProductInfo = {
  id: string;
  title: string;
  size: string | null;
  color: string | null;
  condition: string | null;
  brands: { name: string } | null;
};

const CONDITION_LABELS: Record<string, string> = {
  nowe: "Nowy",
  outlet: "Outlet",
  uzywane: "Używane",
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string; icon: typeof Clock }> = {
  oczekuje_na_platnosc: { label: "Oczekuje na płatność", className: "bg-amber-500/10 text-amber-600", icon: Clock },
  zaplacone: { label: "Opłacone", className: "bg-success/10 text-success", icon: CheckCircle2 },
  wyslane: { label: "Wysłane", className: "bg-blue-500/10 text-blue-600", icon: Truck },
  anulowane: { label: "Anulowane", className: "bg-destructive/10 text-destructive", icon: XCircle },
};

const FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Wszystkie" },
  { value: "oczekuje_na_platnosc", label: "Oczekuje" },
  { value: "zaplacone", label: "Do wysyłki" },
  { value: "wyslane", label: "Wysłane" },
  { value: "anulowane", label: "Anulowane" },
];

function OrdersPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  const { data: orders, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  const productIds = useMemo(() => {
    const ids = new Set<string>();
    (orders ?? []).forEach((o) => (o.items ?? []).forEach((it) => {
      if (it.product_id) ids.add(it.product_id);
    }));
    return Array.from(ids);
  }, [orders]);

  const { data: products } = useQuery({
    queryKey: ["admin", "orders-products", productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [] as ProductInfo[];
      const { data, error } = await supabase
        .from("products")
        .select("id, title, size, color, condition, brands(name)")
        .in("id", productIds);
      if (error) throw error;
      return (data ?? []) as unknown as ProductInfo[];
    },
    enabled: productIds.length > 0,
  });

  const productsById = useMemo(() => {
    const map = new Map<string, ProductInfo>();
    (products ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      toast.success("Status zamówienia zaktualizowany");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = useMemo(
    () => (orders ?? []).filter((o) => filter === "all" || o.status === filter),
    [orders, filter],
  );

  const stats = useMemo(() => {
    const list = orders ?? [];
    return {
      revenue: list.filter((o) => o.status === "zaplacone" || o.status === "wyslane").reduce((s, o) => s + Number(o.total_price), 0),
      toShip: list.filter((o) => o.status === "zaplacone").length,
      total: list.length,
    };
  }, [orders]);

  function copyInpostData(order: Order) {
    const text = `Paczkomat: ${order.paczkomat_id ?? "brak"}\nImię i nazwisko: ${order.customer_name}\nTelefon: ${order.customer_phone}\nEmail: ${order.customer_email}`;
    navigator.clipboard.writeText(text);
    toast.success("Skopiowano dane do schowka");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Zamówienia</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Odśwież"
          >
            <RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} /> Odśwież
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Obrót (opłacone)</div>
            <div className="mt-1 font-display text-2xl font-semibold">{formatPrice(stats.revenue)}</div>
          </div>
          <div className="rounded-xl bg-primary/10 p-3 text-primary"><DollarSign className="h-5 w-5" /></div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Do wysłania</div>
            <div className="mt-1 font-display text-2xl font-semibold text-amber-600">{stats.toShip}</div>
          </div>
          <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600"><Truck className="h-5 w-5" /></div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Wszystkie zamówienia</div>
            <div className="mt-1 font-display text-2xl font-semibold">{stats.total}</div>
          </div>
          <div className="rounded-xl bg-blue-500/10 p-3 text-blue-600"><ShoppingBag className="h-5 w-5" /></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
              (filter === f.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Klient</th>
              <th className="px-4 py-3">Wysyłka</th>
              <th className="px-4 py-3">Produkty</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Suma</th>
              <th className="px-4 py-3 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Ładowanie…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Brak zamówień.</td></tr>
            ) : (
              filtered.map((order) => {
                const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.oczekuje_na_platnosc;
                const StatusIcon = status.icon;
                return (
                  <tr key={order.id} className="border-t border-border/60 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground">#{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleDateString("pl-PL")}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{order.customer_phone}</div>
                      <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2">
                        <span className="font-mono text-xs font-semibold text-primary">{order.paczkomat_id || "—"}</span>
                        {order.paczkomat_id && (
                          <button onClick={() => copyInpostData(order)} title="Kopiuj dane do InPost" className="ml-auto text-muted-foreground hover:text-primary">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ul className="space-y-2">
                        {(order.items ?? []).map((item, i) => {
                          const p = item.product_id ? productsById.get(item.product_id) : undefined;
                          return (
                            <li key={i} className="text-xs">
                              <div className="flex items-start gap-2">
                                <span className="rounded bg-secondary px-1.5 font-semibold text-secondary-foreground">{item.quantity ?? 1}x</span>
                                <span className="font-medium">{item.title}</span>
                              </div>
                              {p ? (
                                <div className="ml-6 mt-0.5 flex flex-wrap gap-1">
                                  {p.brands?.name && (
                                    <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[10px] text-muted-foreground">{p.brands.name}</span>
                                  )}
                                  {p.size && (
                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Rozmiar {p.size}</span>
                                  )}
                                  {p.color && (
                                    <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[10px] text-muted-foreground">{p.color}</span>
                                  )}
                                  {p.condition && (
                                    <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[10px] text-muted-foreground">
                                      {CONDITION_LABELS[p.condition] ?? p.condition}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="ml-6 mt-0.5 text-[10px] text-muted-foreground">Brak danych produktu (usunięty z bazy)</div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value as OrderStatus })}
                        className={"rounded-full border-0 px-2.5 py-1 text-xs font-medium " + status.className}
                      >
                        {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                        ))}
                      </select>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <StatusIcon className="h-3 w-3" /> aktualny status
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatPrice(order.total_price)}</td>
                    <td className="px-4 py-3 text-right">
                      {order.status === "zaplacone" && (
                        <Button
                          size="sm" variant="outline" className="rounded-full text-xs"
                          onClick={() => updateStatus.mutate({ id: order.id, status: "wyslane" })}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Wysłano
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
