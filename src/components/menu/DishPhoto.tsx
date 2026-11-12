import { useEffect, useState } from "react";
import type { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Dish or category photo; falls back to the category icon when missing or broken. */
export function DishPhoto({
  src,
  icon: Icon,
  className,
  iconSize = "size-9",
  eager = false,
}: {
  src?: string | undefined;
  icon: typeof Plus;
  className?: string;
  iconSize?: string;
  eager?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return (
    <div className={cn("relative w-full overflow-hidden bg-surface", className)}>
      {src && !broken ? (
        <img
          src={src}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setBroken(true)}
          className="size-full object-cover"
        />
      ) : (
        <div className="grid size-full place-items-center text-primary">
          <Icon className={iconSize} aria-hidden />
        </div>
      )}
    </div>
  );
}
