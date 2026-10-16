"use client";

type PdfField = { label: string; value: string };
type Props = { title?: string; subtitle?: string; fields?: PdfField[]; filename?: string };

type Section = { title: string; fields: PdfField[] };

const PAGE_W = 1240;
const PAGE_H = 1754;
const NAVY = "#12385f";
const BLUE = "#075477";
const CYAN = "#12a7cf";
const PALE = "#eaf4fa";
const GRID = "#c8dce9";
const INK = "#1b2c3e";
const MUTED = "#5d6e7d";

function groupFields(title: string, fields: PdfField[]): Section[] {
  const normalized = title.toLowerCase();
  if (normalized.includes("fiche technique de l’équipement") || normalized.includes("fiche technique de l'équipement")) {
    const groups: Section[] = [
      { title: "1. IDENTIFICATION DE L’ÉQUIPEMENT", fields: [] },
      { title: "2. LOCALISATION & ÉTAT", fields: [] },
      { title: "3. DATES & MAINTENANCE", fields: [] },
      { title: "4. INFORMATIONS TECHNIQUES", fields: [] },
      { title: "5. HISTORIQUE DES PANNES", fields: [] },
      { title: "6. ORDRES DE MAINTENANCE", fields: [] },
    ];
    const identify = /code d’inventaire|code d'inventaire|désignation|categorie|catégorie|marque|modèle|fabricant|numéro de série/i;
    const location = /service|emplacement|complexité technique|état opérationnel|criticité|vérification d’inventaire|précisions sur la vérification/i;
    const dates = /date d’acquisition|date d'acquisition|mise en service|coût d’acquisition|coût d'acquisition|durée de vie|dernière maintenance|prochaine maintenance/i;
    const notes = /notes et caractéristiques techniques/i;
    const breakdowns = /pannes enregistrées/i;
    const orders = /ordres de maintenance/i;
    for (const field of fields) {
      if (identify.test(field.label)) groups[0].fields.push(field);
      else if (location.test(field.label)) groups[1].fields.push(field);
      else if (dates.test(field.label)) groups[2].fields.push(field);
      else if (notes.test(field.label)) groups[3].fields.push(field);
      else if (breakdowns.test(field.label)) groups[4].fields.push(field);
      else if (orders.test(field.label)) groups[5].fields.push(field);
      else groups[3].fields.push(field);
    }
    return groups.filter(s => s.fields.length);
  }
  if (normalized.includes("suivi technique de panne")) {
    const buckets: Record<string, PdfField[]> = { "1. ÉQUIPEMENT & SIGNALement": [], "2. DIAGNOSTIC": [], "3. INTERVENTION & RÉSOLUTION": [], "4. CONTRÔLES & CLÔTURE": [] };
    for (const f of fields) {
      const l = f.label.toLowerCase();
      if (/équipement|date du signalement|priorité|statut|service|emplacement|symptômes|circonstances|risque initial/.test(l)) buckets["1. ÉQUIPEMENT & SIGNALement"].push(f);
      else if (/cause identifiée|diagnostic|mode de prise en charge/.test(l)) buckets["2. DIAGNOSTIC"].push(f);
      else if (/prestataire|référence externe|actions correctives|pièces utilisées|coût|notes complémentaires/.test(l)) buckets["3. INTERVENTION & RÉSOLUTION"].push(f);
      else buckets["4. CONTRÔLES & CLÔTURE"].push(f);
    }
    return Object.entries(buckets).map(([title, fields]) => ({ title: title.replace("SIGNALement", "SIGNALEMENT"), fields })).filter(s => s.fields.length);
  }
  if (normalized.includes("rapport")) {
    return [{ title: "SYNTHÈSE DU PARC BIOMÉDICAL", fields }];
  }
  const mid = Math.ceil(fields.length / 2);
  return [
    { title: "INFORMATIONS PRINCIPALES", fields: fields.slice(0, mid) },
    ...(fields.length > mid ? [{ title: "DÉTAILS & SUIVI", fields: fields.slice(mid) }] : []),
  ];
}

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = "/images/gmp-polyclinique-logo.png";
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text || "Non renseigné").replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : ["Non renseigné"];
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}

async function createPdf(title: string, subtitle: string, fields: PdfField[]): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_W; canvas.height = PAGE_H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  // Very subtle, printable geometric watermark: the page remains predominantly white.
  ctx.save(); ctx.globalAlpha = 0.045; ctx.fillStyle = "#6ab6dc";
  ctx.beginPath(); ctx.moveTo(900, 0); ctx.lineTo(PAGE_W, 0); ctx.lineTo(PAGE_W, 700); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(1040, 0); ctx.lineTo(PAGE_W, 0); ctx.lineTo(PAGE_W, 1080); ctx.closePath(); ctx.fill(); ctx.restore();

  const margin = 48; const contentW = PAGE_W - margin * 2;
  const logo = await loadLogo();
  if (logo) {
    const maxW = 285, maxH = 118, scale = Math.min(maxW / logo.width, maxH / logo.height);
    ctx.drawImage(logo, margin, 28, logo.width * scale, logo.height * scale);
  } else {
    ctx.fillStyle = NAVY; ctx.font = "bold 38px Arial"; ctx.fillText("GMP POLYCLINIQUE", margin, 82);
  }
  ctx.fillStyle = "#101820"; ctx.font = "bold 39px Arial"; ctx.fillText("PARC BIOMÉDICAL", 390, 78);
  ctx.strokeStyle = CYAN; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(365, 26); ctx.lineTo(365, 116); ctx.stroke();
  ctx.fillStyle = MUTED; ctx.font = "19px Arial"; ctx.textAlign = "right";
  ctx.fillText(`Date d’édition : ${new Date().toLocaleDateString("fr-FR")}`, PAGE_W - margin, 49);
  ctx.fillText("Document de suivi biomédical", PAGE_W - margin, 79); ctx.textAlign = "left";
  ctx.strokeStyle = GRID; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(margin, 136); ctx.lineTo(PAGE_W - margin, 136); ctx.stroke();

  ctx.fillStyle = NAVY; ctx.font = "bold 31px Arial";
  const titleLines = wrap(ctx, title.toLocaleUpperCase("fr-FR"), contentW - 20);
  let y = 184;
  titleLines.slice(0, 2).forEach(line => { ctx.fillText(line, margin, y); y += 38; });
  if (subtitle) { ctx.fillStyle = BLUE; ctx.font = "bold 24px Arial"; wrap(ctx, subtitle, contentW - 20).slice(0, 2).forEach(line => { ctx.fillText(line, margin, y); y += 30; }); }
  y += 17;

  const sections = groupFields(title, fields);
  const contentStartY = y;
  const footerTop = PAGE_H - 91;
  const availableHeight = footerTop - y - 10;
  const baseSectionGap = 13;
  const fieldCount = Math.max(1, fields.length);
  const fontSize = Math.max(15, Math.min(21, Math.floor(availableHeight / (fieldCount * 2.05 + sections.length * 1.6))));
  const lineH = fontSize * 1.32;
  const labelW = Math.floor(contentW * 0.36);
  const sectionHeaderH = Math.max(37, fontSize * 2.05);
  const rowPadY = Math.max(7, fontSize * 0.48);
  const gap = 13;
  const cols = sections.length > 2 ? 2 : 1;
  const colW = cols === 2 ? (contentW - gap) / 2 : contentW;
  const sectionLayouts: { section: Section; x: number; y: number; w: number; h: number }[] = [];

  // Equipment sheet gets a compact two-column top and full-width technical/history bands.
  if (title.toLowerCase().includes("fiche technique de l’équipement") || title.toLowerCase().includes("fiche technique de l'équipement")) {
    const first = sections.slice(0, 1); const rest = sections.slice(1);
    const firstW = contentW * 0.57;
    const calcSectionH = (s: Section, w: number) => {
      let h = sectionHeaderH;
      for (const f of s.fields) { ctx.font = `${fontSize}px Arial`; const valueLines = wrap(ctx, `${f.label} : ${f.value || "Non renseigné"}`, w - 36); h += Math.max(lineH, valueLines.length * lineH) + rowPadY * 2; }
      return h;
    };
    if (first[0]) {
      const h = calcSectionH(first[0], firstW);
      sectionLayouts.push({ section: first[0], x: margin, y, w: firstW, h });
      const imageX = margin + firstW + gap; const imageW = contentW - firstW - gap;
      ctx.save(); ctx.globalAlpha = 0.11; ctx.fillStyle = PALE; roundedRect(ctx, imageX, y, imageW, h, 10); ctx.fill(); ctx.restore();
      ctx.strokeStyle = GRID; roundedRect(ctx, imageX, y, imageW, h, 10); ctx.stroke();
      ctx.fillStyle = MUTED; ctx.font = "bold 20px Arial"; ctx.textAlign = "center";
      const info = ["FICHE DE RÉFÉRENCE", subtitle || "Équipement biomédical", "Document interne GMP"];
      info.forEach((t, i) => ctx.fillText(t, imageX + imageW / 2, y + h / 2 - 20 + i * 32)); ctx.textAlign = "left";
      y += h + baseSectionGap;
    }
    for (const s of rest) {
      const h = calcSectionH(s, contentW);
      sectionLayouts.push({ section: s, x: margin, y, w: contentW, h }); y += h + baseSectionGap;
    }
  } else {
    // Other documents: two columns for concise sections, full-width for reports with one section.
    const colY = [y, y];
    sections.forEach((s, i) => {
      const col = cols === 2 ? i % 2 : 0;
      const x = margin + (cols === 2 ? col * (colW + gap) : 0);
      const w = cols === 2 ? colW : contentW;
      ctx.font = `${fontSize}px Arial`;
      let h = sectionHeaderH;
      for (const f of s.fields) {
        const labelLines = wrap(ctx, f.label, labelW - 22);
        const valueLines = wrap(ctx, f.value || "Non renseigné", w - labelW - 30);
        h += Math.max(labelLines.length, valueLines.length) * lineH + rowPadY * 2;
      }
      const top = colY[col]; sectionLayouts.push({ section: s, x, y: top, w, h }); colY[col] += h + baseSectionGap;
    });
  }

  // Fit everything to one page with a consistent, legible compact scale.
  const maxBottom = Math.max(contentStartY, ...sectionLayouts.map(s => s.y + s.h));
  const scaleY = maxBottom > footerTop ? Math.max(0.58, (footerTop - contentStartY) / Math.max(1, maxBottom - contentStartY)) : 1;
  ctx.save(); ctx.translate(0, contentStartY); ctx.scale(1, scaleY); ctx.translate(0, -contentStartY);
  for (const layout of sectionLayouts) {
    const { section, x, y: sy, w, h } = layout;
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = GRID; ctx.lineWidth = 1.5;
    roundedRect(ctx, x, sy, w, h, 9); ctx.fill(); ctx.stroke();
    ctx.save(); roundedRect(ctx, x, sy, w, sectionHeaderH, 9); ctx.clip(); ctx.fillStyle = BLUE; ctx.fillRect(x, sy, w, sectionHeaderH); ctx.restore();
    ctx.fillStyle = "#ffffff"; ctx.font = `bold ${fontSize + 1}px Arial`; ctx.fillText(section.title, x + 20, sy + sectionHeaderH * 0.67);
    let ry = sy + sectionHeaderH;
    for (let i = 0; i < section.fields.length; i++) {
      const f = section.fields[i];
      ctx.font = `${fontSize}px Arial`;
      const labelLines = wrap(ctx, f.label, Math.min(labelW - 22, w * 0.42));
      const valueLines = wrap(ctx, f.value || "Non renseigné", w - labelW - 30);
      const lines = Math.max(labelLines.length, valueLines.length);
      const rh = lines * lineH + rowPadY * 2;
      if (i % 2 === 0) { ctx.fillStyle = "#f7fbfd"; ctx.fillRect(x + 1, ry, w - 2, rh); }
      ctx.fillStyle = PALE; ctx.fillRect(x + 1, ry, labelW, rh);
      ctx.strokeStyle = GRID; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + labelW, ry); ctx.lineTo(x + labelW, ry + rh); ctx.moveTo(x, ry + rh); ctx.lineTo(x + w, ry + rh); ctx.stroke();
      ctx.fillStyle = NAVY; ctx.font = `bold ${fontSize}px Arial`;
      labelLines.forEach((line, li) => ctx.fillText(line, x + 17, ry + rowPadY + fontSize + li * lineH));
      ctx.fillStyle = INK; ctx.font = `${fontSize}px Arial`;
      valueLines.forEach((line, li) => ctx.fillText(line, x + labelW + 16, ry + rowPadY + fontSize + li * lineH));
      ry += rh;
    }
  }
  ctx.restore();

  // Restrained footer, no invented contact information.
  ctx.fillStyle = CYAN; ctx.fillRect(margin, PAGE_H - 73, 12, 42);
  ctx.fillStyle = NAVY; ctx.font = "bold 18px Arial"; ctx.fillText("GMP POLYCLINIQUE · PARC BIOMÉDICAL", margin + 28, PAGE_H - 53);
  ctx.fillStyle = MUTED; ctx.font = "16px Arial"; ctx.fillText("Document de gestion et de traçabilité du parc biomédical", margin + 28, PAGE_H - 29);
  ctx.strokeStyle = GRID; ctx.beginPath(); ctx.moveTo(margin + 28, PAGE_H - 16); ctx.lineTo(PAGE_W - margin, PAGE_H - 16); ctx.stroke();
  ctx.fillStyle = NAVY; ctx.font = "bold 17px Arial"; ctx.textAlign = "right"; ctx.fillText("1/1", PAGE_W - margin, PAGE_H - 25); ctx.textAlign = "left";

  const jpeg = canvas.toDataURL("image/jpeg", 0.94).split(",")[1];
  const binary = atob(jpeg); const imageBytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) imageBytes[i] = binary.charCodeAt(i);
  const content = "q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ";
  const enc = new TextEncoder();
  const objects: Uint8Array[] = [];
  const str = (s: string) => enc.encode(s);
  objects.push(str("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.push(str("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
  objects.push(str("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>"));
  objects.push(str(`<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream`));
  const imageHeader = str(`<< /Type /XObject /Subtype /Image /Width ${PAGE_W} /Height ${PAGE_H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`);
  const imageTail = str("\nendstream");
  const imageObject = new Uint8Array(imageHeader.length + imageBytes.length + imageTail.length);
  imageObject.set(imageHeader, 0); imageObject.set(imageBytes, imageHeader.length); imageObject.set(imageTail, imageHeader.length + imageBytes.length);
  objects.push(imageObject);
  const chunks: Uint8Array[] = [str("%PDF-1.4\n% GMP POLYCLINIQUE\n")]; const offsets = [0]; let length = chunks[0].length;
  objects.forEach((obj, i) => { offsets.push(length); const chunk = new Uint8Array([...str(`${i + 1} 0 obj\n`), ...obj, ...str("\nendobj\n")]); chunks.push(chunk); length += chunk.length; });
  const xrefOffset = length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(str(xref));
  // Build a concrete ArrayBuffer so TypeScript accepts it as a BlobPart
  // (Uint8Array<ArrayBufferLike> is not assignable in newer TS DOM typings).
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const pdfBuffer = new ArrayBuffer(totalLength);
  const pdfBytes = new Uint8Array(pdfBuffer);
  let cursor = 0;
  for (const chunk of chunks) {
    pdfBytes.set(chunk, cursor);
    cursor += chunk.length;
  }
  return new Blob([pdfBuffer], { type: "application/pdf" });
}

export function PrintButton({ title = "Fiche technique", subtitle = "", fields = [], filename = "GMP_fiche.pdf" }: Props) {
  async function exportPdf() {
    const blob = await createPdf(title, subtitle, fields);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button className="secondary-button" type="button" onClick={exportPdf}>Exporter en PDF</button>;
}
