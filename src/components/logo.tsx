import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("group inline-flex items-center gap-2", className)} aria-label="Re-Kreacja — strona główna">
      <img
        src="/logo.jpg"
        alt="Re-Kreacja"
        className="h-11 w-11 rounded-full object-cover ring-1 ring-border/20 shadow-sm transition-transform group-hover:scale-105"
      />
      <span className="flex flex-col leading-tight">
        <span className="font-display text-lg font-semibold tracking-tight">Re-Kreacja</span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Premium Outlet</span>
      </span>
    </Link>
  );
}