import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImagePlaceholderProps {
  className?: string;
  label?: string;
  aspect?: "square" | "portrait" | "wide" | "auto";
}

const aspectClass: Record<NonNullable<ImagePlaceholderProps["aspect"]>, string> = {
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  wide: "aspect-[16/9]",
  auto: "",
};

export function ImagePlaceholder({
  className,
  label = "Tutaj będzie zdjęcie",
  aspect = "portrait",
}: ImagePlaceholderProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-muted to-secondary text-muted-foreground",
        aspectClass[aspect],
        className,
      )}
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-background/70 shadow-sm">
          <ImageIcon className="h-6 w-6 opacity-60" strokeWidth={1.5} />
        </div>
        <span className="text-xs font-medium tracking-wide">{label}</span>
      </div>
    </div>
  );
}