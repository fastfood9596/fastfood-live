import { useEffect, useId, useRef, useState } from "react";
import { ImageOff, ImagePlus, Link2, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { validatePhotoUrl } from "@/lib/menu";
import { readPhotoFile } from "@/lib/photo-upload";

/**
 * Photo picker with an instant preview: upload from the device or paste a web link.
 * `value` is the photo (data URL or https link); empty string means no photo.
 */
export function PhotoField({
  label,
  hint,
  value,
  onChange,
  shape = "landscape",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  shape?: "landscape" | "square";
}) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const isLink = /^https?:\/\//i.test(value);
  const [link, setLink] = useState(isLink ? value : "");
  const [showLink, setShowLink] = useState(isLink);

  // Reset local state when the form loads a different record.
  useEffect(() => {
    setBroken(false);
    setError(null);
    const linkValue = /^https?:\/\//i.test(value);
    setLink(linkValue ? value : "");
    if (linkValue) setShowLink(true);
  }, [value]);

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await readPhotoFile(file));
      setShowLink(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that photo.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const applyLink = () => {
    const err = validatePhotoUrl(link);
    if (err) return setError(err);
    setError(null);
    onChange(link.trim());
  };

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex gap-3">
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-lg border border-border bg-surface",
            shape === "square" ? "size-24" : "h-24 w-32",
          )}
        >
          {value && !broken ? (
            <img
              src={value}
              alt={`${label} preview`}
              className="size-full object-cover"
              onError={() => setBroken(true)}
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              {broken ? <ImageOff className="size-6" aria-hidden /> : <ImagePlus className="size-6" aria-hidden />}
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-background/70">
              <Loader2 className="size-5 animate-spin text-primary" aria-label="Loading photo" />
            </div>
          )}
          {value && !busy && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setLink("");
              }}
              aria-label="Remove photo"
              className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-background/85 text-foreground hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <input
            ref={fileRef}
            id={id}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <label
            htmlFor={id}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <Upload className="size-4" aria-hidden />
            {value ? "Change photo" : "Upload Photo"}
          </label>
          <button
            type="button"
            onClick={() => setShowLink((s) => !s)}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Link2 className="size-3.5" aria-hidden />
            {showLink ? "Hide link field" : "Or use an image link"}
          </button>
        </div>
      </div>

      {showLink && (
        <div className="mt-2 flex gap-2">
          <input
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
            placeholder="https://…/photo.jpg"
            aria-label={`${label} link`}
            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="button"
            onClick={applyLink}
            className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold hover:bg-accent"
          >
            Use link
          </button>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">{error}</p>
      ) : broken ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">That link didn't load a photo. Try another.</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Small square thumbnail for list rows; falls back to the given icon. */
export function Thumb({ src, icon: Icon, className }: { src?: string | undefined; icon: typeof ImagePlus; className?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return (
    <div className={cn("grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface text-primary", className)}>
      {src && !broken ? (
        <img src={src} alt="" loading="lazy" className="size-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <Icon className="size-4" aria-hidden />
      )}
    </div>
  );
}
