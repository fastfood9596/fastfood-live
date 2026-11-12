import { checkPhotoFile } from "./menu";

/**
 * Read a chosen photo in the browser and shrink it so it stays light to save with the menu:
 * longest side capped at `maxSide`, re-encoded as JPEG. Call from event handlers only.
 */
export async function readPhotoFile(file: File, maxSide = 800): Promise<string> {
  const error = checkPhotoFile(file);
  if (error) throw new Error(error);

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file couldn't be opened as a photo."));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser couldn't process this photo.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}
