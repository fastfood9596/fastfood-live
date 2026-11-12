import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { money } from "@/lib/kds-store";
import type { MenuItem } from "@/lib/menu";
import {
  INSTRUCTION_TAGS,
  PORTIONS,
  SAUCES,
  customizedUnitPrice,
  toggleTag,
  type Customization,
  type PortionId,
  type SauceId,
} from "@/lib/orders";
import { DishPhoto } from "./DishPhoto";

/** Bottom sheet with a large dish photo and portion / sauce / note choices. */
export function ItemSheet({
  item,
  icon,
  onClose,
  onAdd,
}: {
  item: MenuItem | null;
  icon: typeof Plus;
  onClose: () => void;
  onAdd: (item: MenuItem, customization: Customization, qty: number) => void;
}) {
  return (
    <Drawer open={item !== null} onOpenChange={(open) => !open && onClose()} shouldScaleBackground={false}>
      <DrawerContent className="mx-auto max-h-[94dvh] max-w-lg border-border bg-card">
        {item && <SheetBody key={item.id} item={item} icon={icon} onAdd={onAdd} />}
      </DrawerContent>
    </Drawer>
  );
}

function SheetBody({
  item,
  icon,
  onAdd,
}: {
  item: MenuItem;
  icon: typeof Plus;
  onAdd: (item: MenuItem, customization: Customization, qty: number) => void;
}) {
  const [portion, setPortion] = useState<PortionId>("regular");
  const [sauces, setSauces] = useState<SauceId[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  const customization: Customization = {
    portion,
    sauces,
    notes: [...tags, ...(note.trim() ? [note.trim()] : [])],
  };
  const unit = customizedUnitPrice(item.price, customization);

  return (
    <>
      <div className="overflow-y-auto overscroll-contain">
        <div className="px-4 pt-3">
          <DishPhoto src={item.image} icon={icon} className="aspect-[16/10] rounded-2xl" iconSize="size-14" eager />
        </div>
        <div className="space-y-6 p-5">
          <div>
            <DrawerTitle className="text-2xl font-extrabold tracking-tight">{item.name}</DrawerTitle>
            <DrawerDescription className="mt-1 font-mono text-base tabular text-primary">
              {money(item.price)}
            </DrawerDescription>
          </div>

          <fieldset>
            <Legend>Portion size</Legend>
            <div role="radiogroup" aria-label="Portion size" className="grid grid-cols-2 gap-2">
              {PORTIONS.map((p) => {
                const on = portion === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setPortion(p.id)}
                    className={cn(
                      "flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors",
                      on ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50",
                    )}
                  >
                    <span className="font-semibold">{p.label}</span>
                    <span className="font-mono text-xs tabular text-muted-foreground">
                      {p.extra ? `+ ${money(p.extra)}` : "Included"}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <Legend>Extra sauce</Legend>
            <div className="grid grid-cols-2 gap-2">
              {SAUCES.map((s) => {
                const on = sauces.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSauces((list) => (on ? list.filter((x) => x !== s.id) : [...list, s.id]))}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                      on ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-md border",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {on && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-tight">{s.label}</span>
                      <span className="font-mono text-xs tabular text-muted-foreground">
                        {s.extra ? `+ ${money(s.extra)}` : "Free"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <Legend>Special instructions</Legend>
            <div className="mb-2.5 flex flex-wrap gap-2">
              {INSTRUCTION_TAGS.map((tag) => {
                const on = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTags((t) => toggleTag(t, tag))}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                      on ? "border-warning bg-warning/15 text-warning" : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {on ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
                    {tag}
                  </button>
                );
              })}
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={60}
              placeholder="Anything else? e.g. No onions"
              aria-label="Other instructions"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-base outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </fieldset>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center rounded-xl border border-border bg-background">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="One less"
            className="grid size-12 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-6 text-center font-mono text-lg font-bold tabular" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(20, q + 1))}
            aria-label="One more"
            className="grid size-12 place-items-center text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => onAdd(item, customization, qty)}
          className="flex h-12 flex-1 items-center justify-between rounded-xl bg-gradient-primary px-4 font-bold text-primary-foreground shadow-glow transition-all hover:brightness-110 active:scale-[0.99]"
        >
          <span>Add to order</span>
          <span className="font-mono tabular">{money(unit * qty)}</span>
        </button>
      </div>
    </>
  );
}

function Legend({ children }: { children: string }) {
  return <legend className="mb-2.5 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{children}</legend>;
}
