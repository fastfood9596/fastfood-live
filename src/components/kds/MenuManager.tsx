import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, LayoutGrid, ListPlus, Pencil, Plus, Search, Settings, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { money, useKds } from "@/lib/kds-store";
import { validateCategory, validateItem, type MenuItem } from "@/lib/menu";
import { ICON_KEYS, MENU_ICONS, iconFor, type IconKey } from "@/lib/menu-icons";
import { PhotoField, Thumb } from "./PhotoField";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Confirm = { title: string; description: string; onConfirm: () => void };
type AskConfirm = (c: Confirm) => void;

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

export function MenuManager() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("items");
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            aria-label="Manage Menu"
            title="Manage Menu"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground sm:px-2.5"
          >
            <Settings className="size-4" aria-hidden />
            <span className="hidden whitespace-nowrap 2xl:inline">Manage Menu</span>
          </button>
        </DialogTrigger>
        <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0">
          <DialogHeader className="border-b border-border px-5 py-4 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl font-extrabold">
              <Settings className="size-5 text-primary" aria-hidden />
              Manage Menu
            </DialogTitle>
            <DialogDescription>Changes show on the Cashier Terminal straight away.</DialogDescription>
          </DialogHeader>
          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mx-5 mt-4 grid h-auto grid-cols-2 rounded-xl bg-background p-1">
              <TabsTrigger
                value="categories"
                className="gap-2 rounded-lg py-2 font-semibold data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground"
              >
                <LayoutGrid className="size-4" aria-hidden />
                Manage Categories
              </TabsTrigger>
              <TabsTrigger
                value="items"
                className="gap-2 rounded-lg py-2 font-semibold data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground"
              >
                <ListPlus className="size-4" aria-hidden />
                Manage Menu Items
              </TabsTrigger>
            </TabsList>
            <TabsContent value="categories" className="mt-0 min-h-0 flex-1 overflow-y-auto p-5">
              <CategoriesPanel askConfirm={setConfirm} />
            </TabsContent>
            <TabsContent value="items" className="mt-0 min-h-0 flex-1 overflow-y-auto p-5">
              <ItemsPanel askConfirm={setConfirm} onAddCategory={() => setTab("categories")} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                confirm?.onConfirm();
                setConfirm(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ---------------------------------- Categories ---------------------------------- */

function CategoriesPanel({ askConfirm }: { askConfirm: AskConfirm }) {
  const { categories, items, saveCategory, deleteCategory } = useKds();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState<IconKey>("utensils");
  const [image, setImage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setEditingId(null);
    setLabel("");
    setIcon("utensils");
    setImage("");
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = validateCategory(label, categories, editingId ?? undefined);
    if (err) return setError(err);
    const saved = saveCategory({ id: editingId ?? undefined, label, icon, image });
    setNotice(editingId ? `Updated "${saved.label}".` : `Added "${saved.label}".`);
    reset();
  };

  const startEdit = (id: string) => {
    const c = categories.find((x) => x.id === id);
    if (!c) return;
    setEditingId(c.id);
    setLabel(c.label);
    setIcon(c.icon);
    setImage(c.image ?? "");
    setError(null);
    setNotice(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    nameRef.current?.focus();
  };

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,340px)_1fr]">
      <form ref={formRef} onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-background/60 p-4">
        <h3 className="font-bold">{editingId ? "Edit category" : "Add a category"}</h3>
        <Field label="Category name" htmlFor="cat-name">
          <input
            id="cat-name"
            ref={nameRef}
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setError(null);
              setNotice(null);
            }}
            placeholder="e.g. Kebabs, Soft Drinks"
            className={inputCls}
          />
        </Field>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Icon · <span className="normal-case tracking-normal text-foreground">{MENU_ICONS[icon].label}</span>
          </legend>
          <div className="grid grid-cols-7 gap-1.5">
            {ICON_KEYS.map((key) => {
              const Icon = MENU_ICONS[key].icon;
              const active = icon === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  aria-label={MENU_ICONS[key].label}
                  aria-pressed={active}
                  title={MENU_ICONS[key].label}
                  className={cn(
                    "grid aspect-square place-items-center rounded-lg border transition-colors",
                    active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </button>
              );
            })}
          </div>
        </fieldset>
        <PhotoField
          label="Category Image"
          hint="Shown on the category tabs. Optional — the icon is used without a photo."
          value={image}
          onChange={(v) => {
            setImage(v);
            setError(null);
            setNotice(null);
          }}
        />
        <FormFeedback error={error} notice={notice} />
        <FormButtons editing={!!editingId} addLabel="Add category" onCancel={reset} />
      </form>

      <section aria-label="Categories">
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Categories ({categories.length})</h3>
        {categories.length === 0 ? (
          <Empty>No categories yet. Add your first one.</Empty>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {categories.map((c) => {
              const Icon = iconFor(c.icon);
              const count = items.filter((i) => i.categoryId === c.id).length;
              return (
                <li
                  key={c.id}
                  className={cn("flex items-center gap-3 px-3 py-2.5", editingId === c.id && "bg-primary/10")}
                >
                  <Thumb src={c.image} icon={Icon} className="size-11" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {count} {count === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <RowActions
                    name={c.label}
                    onEdit={() => startEdit(c.id)}
                    onDelete={() =>
                      askConfirm({
                        title: `Delete "${c.label}"?`,
                        description:
                          count > 0
                            ? `This also deletes the ${count} ${count === 1 ? "item" : "items"} in this category from the menu.`
                            : "This category will be removed from the menu.",
                        onConfirm: () => {
                          deleteCategory(c.id);
                          if (editingId === c.id) reset();
                        },
                      })
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------------------------- Items ---------------------------------- */

function ItemsPanel({ askConfirm, onAddCategory }: { askConfirm: AskConfirm; onAddCategory: () => void }) {
  const { categories, items, saveItem, deleteItem, setItemAvailable } = useKds();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [available, setAvailable] = useState(true);
  const [image, setImage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Keep the dropdown pointing at a category that still exists.
  const selectedCategory = categories.some((c) => c.id === categoryId) ? categoryId : (categories[0]?.id ?? "");
  const activeFilter = filter === "all" || categories.some((c) => c.id === filter) ? filter : "all";

  const touch = () => {
    setError(null);
    setNotice(null);
  };

  const reset = () => {
    setEditingId(null);
    setName("");
    setPrice("");
    setAvailable(true);
    setImage("");
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = validateItem({ name, price, categoryId: selectedCategory }, categories);
    if (err) return setError(err);
    const saved = saveItem({
      id: editingId ?? undefined,
      name,
      price: Number(price),
      categoryId: selectedCategory,
      available,
      image,
    });
    setNotice(editingId ? `Updated "${saved.name}".` : `Added "${saved.name}" to the menu.`);
    reset();
  };

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setName(item.name);
    setPrice(String(item.price));
    setCategoryId(item.categoryId);
    setAvailable(item.available);
    setImage(item.image ?? "");
    touch();
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    nameRef.current?.focus();
  };

  const q = query.trim().toLowerCase();
  const shown = items.filter(
    (i) => (activeFilter === "all" || i.categoryId === activeFilter) && (!q || i.name.toLowerCase().includes(q)),
  );
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,340px)_1fr]">
      <form ref={formRef} onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-background/60 p-4">
        <h3 className="font-bold">{editingId ? "Edit item" : "Add a menu item"}</h3>
        {categories.length === 0 ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Add a category before adding menu items.</p>
            <button
              type="button"
              onClick={onAddCategory}
              className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 font-semibold text-foreground hover:bg-accent"
            >
              <Plus className="size-4" aria-hidden />
              Add a category
            </button>
          </div>
        ) : (
          <>
            <Field label="Item name" htmlFor="item-name">
              <input
                id="item-name"
                ref={nameRef}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  touch();
                }}
                placeholder="e.g. Beef Kebab"
                className={inputCls}
              />
            </Field>
            <Field label="Price" htmlFor="item-price">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-sm text-muted-foreground">
                  KSh
                </span>
                <input
                  id="item-price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    touch();
                  }}
                  placeholder="0"
                  className={cn(inputCls, "pl-12 font-mono tabular")}
                />
              </div>
            </Field>
            <Field label="Category" htmlFor="item-category">
              <Select
                value={selectedCategory}
                onValueChange={(v) => {
                  setCategoryId(v);
                  touch();
                }}
              >
                <SelectTrigger id="item-category" className="h-auto rounded-lg border-input bg-background py-2.5">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover">
                  {categories.map((c) => {
                    const Icon = iconFor(c.icon);
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <Icon className="size-4 text-primary" aria-hidden />
                          {c.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>
            <PhotoField
              label="Item Image"
              hint="Shown on the menu item card. Optional."
              value={image}
              onChange={(v) => {
                setImage(v);
                touch();
              }}
            />
            <label
              htmlFor="item-available"
              className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <span>
                <span className="block text-sm font-semibold">{available ? "Available" : "Out of Stock"}</span>
                <span className="block text-xs text-muted-foreground">
                  {available ? "Cashiers can sell this item." : "Shown greyed out, can't be ordered."}
                </span>
              </span>
              <Switch
                id="item-available"
                checked={available}
                onCheckedChange={(v) => {
                  setAvailable(v);
                  touch();
                }}
                className="data-[state=checked]:bg-success"
              />
            </label>
            <FormFeedback error={error} notice={notice} />
            <FormButtons editing={!!editingId} addLabel="Add item" onCancel={reset} />
          </>
        )}
      </form>

      <section aria-label="Menu items" className="min-w-0">
        <div className="mb-3 flex flex-wrap gap-2">
          <div className="relative min-w-40 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items"
              aria-label="Search items"
              className={cn(inputCls, "py-2 pl-9")}
            />
          </div>
          <Select value={activeFilter} onValueChange={setFilter}>
            <SelectTrigger aria-label="Filter by category" className="h-auto w-44 rounded-lg border-input bg-background py-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border bg-popover">
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Items ({shown.length})</h3>
        {shown.length === 0 ? (
          <Empty>{items.length === 0 ? "No menu items yet." : "No items match."}</Empty>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {shown.map((item) => {
              const cat = categoryById.get(item.categoryId);
              const Icon = iconFor(cat?.icon ?? "utensils");
              return (
                <li
                  key={item.id}
                  className={cn("flex items-center gap-3 px-3 py-2.5", editingId === item.id && "bg-primary/10")}
                >
                  <Thumb src={item.image} icon={Icon} className={cn("size-11", !item.available && "opacity-60 grayscale")} />
                  <div className={cn("min-w-0 flex-1", !item.available && "opacity-60")}>
                    <p className="truncate font-semibold">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="font-mono tabular text-foreground">{money(item.price)}</span> · {cat?.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "hidden text-[11px] font-semibold uppercase tracking-wider sm:inline",
                        item.available ? "text-success" : "text-destructive",
                      )}
                    >
                      {item.available ? "In stock" : "Out"}
                    </span>
                    <Switch
                      checked={item.available}
                      onCheckedChange={(v) => setItemAvailable(item.id, v)}
                      aria-label={`${item.name} available`}
                      className="data-[state=checked]:bg-success"
                    />
                  </div>
                  <RowActions
                    name={item.name}
                    onEdit={() => startEdit(item)}
                    onDelete={() =>
                      askConfirm({
                        title: `Delete "${item.name}"?`,
                        description: "This item will be removed from the menu. Orders already sent are not affected.",
                        onConfirm: () => {
                          deleteItem(item.id);
                          if (editingId === item.id) reset();
                        },
                      })
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------------------------- Shared bits ---------------------------------- */

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function FormFeedback({ error, notice }: { error: string | null; notice: string | null }) {
  if (error) return <p role="alert" className="text-sm font-medium text-destructive">{error}</p>;
  if (notice)
    return (
      <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-success">
        <Check className="size-4" aria-hidden />
        {notice}
      </p>
    );
  return null;
}

function FormButtons({ editing, addLabel, onCancel }: { editing: boolean; addLabel: string; onCancel: () => void }) {
  return (
    <div className="flex gap-2">
      <button
        type="submit"
        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-primary py-2.5 font-bold text-primary-foreground shadow-glow transition-all hover:brightness-110"
      >
        {editing ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
        {editing ? "Save changes" : addLabel}
      </button>
      {editing && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

function RowActions({ name, onEdit, onDelete }: { name: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        onClick={onEdit}
        aria-label={`Edit ${name}`}
        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <button
        onClick={onDelete}
        aria-label={`Delete ${name}`}
        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
