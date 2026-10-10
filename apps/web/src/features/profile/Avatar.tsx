import { useRef, useState } from "react";

export function Avatar({ name, photo, size = 72 }: { name: string; photo?: string; size?: number }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return photo
    ? <img className="tp-avatar" src={photo} alt="" width={size} height={size} />
    : <span className="tp-avatar tp-avatar-initial" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">{initial}</span>;
}

const MAX_BYTES = 8 * 1024 * 1024;

/** Shrinks the chosen image to a 192px square in the browser. The original file is never kept. */
function downscale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const side = Math.min(image.width, image.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 192;
      const context = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!context) { reject(new Error("no canvas")); return; }
      context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 192, 192);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
    image.src = url;
  });
}

export function PhotoEditor({ name, photo, onChange }: { name: string; photo?: string; onChange: (photo?: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();

  async function choose(file?: File) {
    setError(undefined);
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("That file isn't an image. Choose a JPG or PNG photo."); return; }
    if (file.size > MAX_BYTES) { setError("That photo is over 8 MB. Choose a smaller one."); return; }
    try { onChange(await downscale(file)); } catch { setError("That image couldn't be read. Try a different photo."); }
    if (input.current) input.current.value = "";
  }

  return (
    <div className="tp-photo">
      <Avatar name={name} photo={photo} size={88} />
      <div>
        <div className="tp-inline">
          <button type="button" className="tp-button tp-button-quiet" onClick={() => input.current?.click()}>
            {photo ? "Change photo" : "Add a photo"}
          </button>
          {photo && <button type="button" className="tp-button tp-button-text" onClick={() => onChange(undefined)}>Remove photo</button>}
        </div>
        <input ref={input} type="file" accept="image/*" className="tp-visually-hidden" tabIndex={-1} aria-label="Choose a profile photo"
          onChange={(event) => choose(event.target.files?.[0])} />
        <p className="tp-hint">Your photo is public. Avoid one that shows your home, workplace or documents.</p>
        {error && <p className="tp-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
