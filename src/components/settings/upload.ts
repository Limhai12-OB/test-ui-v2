/**
 * Reads an image chosen in the browser and checks it against the rules shown
 * in the design (type, size, minimum dimensions). The result is a data URL
 * kept in this tab's session storage; nothing is uploaded.
 */
export async function readImage(file: File, rules: { types: string[]; maxBytes: number; minSide?: number }): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!rules.types.includes(file.type)) return { ok: false, error: `Choose a ${rules.types.map((t) => t.split("/")[1].replace("svg+xml", "SVG").replace("jpeg", "JPG").toUpperCase()).join(" or ")} file.` };
  if (file.size > rules.maxBytes) return { ok: false, error: `The file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${rules.maxBytes / 1048576} MB.` };
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  if (rules.minSide && file.type !== "image/svg+xml") {
    const size = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = url;
    });
    if (!size.w) return { ok: false, error: "This file could not be read as an image." };
    if (size.w < rules.minSide || size.h < rules.minSide) return { ok: false, error: `The image is ${size.w} × ${size.h} px. Use at least ${rules.minSide} × ${rules.minSide} px.` };
  }
  return { ok: true, url };
}
