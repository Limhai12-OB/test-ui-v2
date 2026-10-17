/**
 * Minimal A4 PDF writer for report exports: Helvetica text, filled
 * rectangles and rules, several pages. Built-in PDF fonts only cover
 * Latin text, so other characters are replaced (៛ → "KHR ").
 */

const W = 595.28;
const H = 841.89;

type Rgb = [number, number, number];
const hex = (color: string): Rgb => {
  const n = parseInt(color.replace("#", ""), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

function latin(text: string) {
  return text
    .replace(/៛/g, "KHR ")
    .replace(/[−–—]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[·•]/g, "·")
    .replace(/≈/g, "~")
    .replace(/[^\x20-\x7e -ÿ]/g, "")
    .replace(/[\\()]/g, (c) => `\\${c}`);
}

// Helvetica advance widths (per 1000 em) for the characters numbers are made of; others use an average.
const NARROW: Record<string, number> = { " ": 278, ",": 278, ".": 278, ":": 278, "-": 333, "(": 333, ")": 333, "%": 889, "+": 584, "$": 556, "~": 584 };
const widthOf = (text: string, size: number, bold = false) => {
  let w = 0;
  for (const ch of latin(text).replace(/\\/g, "")) {
    w += NARROW[ch] ?? (/\d/.test(ch) ? 556 : /[A-Z]/.test(ch) ? 667 : /[il]/.test(ch) ? 222 : 520);
  }
  return (w / 1000) * size * (bold ? 1.04 : 1);
};

export class PdfDoc {
  private pages: string[][] = [[]];
  /** Distance from the top of the current page, in points. */
  y = 56;
  readonly left = 48;
  readonly right = W - 48;

  private get ops() {
    return this.pages[this.pages.length - 1];
  }

  get pageCount() {
    return this.pages.length;
  }

  addPage() {
    this.pages.push([]);
    this.y = 56;
  }

  /** Starts a new page when fewer than `space` points are left. */
  ensure(space: number) {
    if (this.y + space > H - 56) this.addPage();
  }

  text(value: string, opts: { x?: number; size?: number; bold?: boolean; color?: string; align?: "left" | "right"; advance?: boolean } = {}) {
    const size = opts.size ?? 10;
    const clean = latin(value);
    const x = opts.align === "right" ? (opts.x ?? this.right) - widthOf(value, size, opts.bold) : opts.x ?? this.left;
    const [r, g, b] = hex(opts.color ?? "#111827");
    this.ops.push(`BT /${opts.bold ? "F2" : "F1"} ${size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${(H - this.y - size).toFixed(2)} Td (${clean}) Tj ET`);
    if (opts.advance !== false) this.y += size * 1.45;
  }

  /** Wraps a paragraph to the page width. */
  paragraph(value: string, opts: { size?: number; color?: string; width?: number; x?: number } = {}) {
    const size = opts.size ?? 10;
    const max = Math.floor((opts.width ?? this.right - (opts.x ?? this.left)) / (size * 0.5));
    const lines: string[] = [];
    let line = "";
    for (const word of value.split(/\s+/)) {
      if ((line + " " + word).trim().length > max) {
        lines.push(line);
        line = word;
      } else line = `${line} ${word}`.trim();
    }
    if (line) lines.push(line);
    for (const l of lines) {
      this.ensure(size * 1.5);
      this.text(l, { size, color: opts.color, x: opts.x });
    }
  }

  rect(x: number, top: number, w: number, h: number, color: string) {
    const [r, g, b] = hex(color);
    this.ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${(H - top - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }

  rule(color = "#e5e7eb") {
    this.rect(this.left, this.y, this.right - this.left, 0.75, color);
    this.y += 8;
  }

  /** One table row: cells at fixed x positions; numeric columns right-aligned at their x. */
  row(cells: { text: string; x: number; align?: "left" | "right"; bold?: boolean; color?: string }[], size = 9) {
    this.ensure(size * 2);
    for (const cell of cells) this.text(cell.text, { x: cell.x, align: cell.align, size, bold: cell.bold, color: cell.color, advance: false });
    this.y += size * 1.9;
  }

  /** Footer on every page, then the finished file. */
  toBlob(footer: (page: number, total: number) => string) {
    const total = this.pages.length;
    this.pages.forEach((ops, index) => {
      ops.push(`BT /F1 8 Tf 0.42 0.45 0.5 rg ${this.left} 32 Td (${latin(footer(index + 1, total))}) Tj ET`);
    });

    const objects: string[] = [];
    const add = (body: string) => objects.push(body) - 1 + 1;
    const catalog = add("<< /Type /Catalog /Pages 2 0 R >>");
    add(""); // pages tree, filled in below
    const font1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const font2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const kids: number[] = [];
    for (const ops of this.pages) {
      const stream = ops.join("\n");
      const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${content} 0 R >>`));
    }
    objects[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;

    let out = "%PDF-1.4\n";
    const offsets: number[] = [];
    objects.forEach((body, index) => {
      offsets.push(out.length);
      out += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = out.length;
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n `).join("\n")}\n`;
    out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;

    // Text is Latin-1 after `latin()`, so each char maps to one byte.
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return new Blob([bytes], { type: "application/pdf" });
  }
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
