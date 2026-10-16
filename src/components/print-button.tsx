"use client";

type PdfField = { label: string; value: string };
type Props = { title?: string; subtitle?: string; fields?: PdfField[]; filename?: string };

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// Encode characters in Windows-1252, the encoding supported by the standard PDF Helvetica font.
function winAnsiHex(value: string) {
  const special: Record<string, number> = { '€':0x80,'‚':0x82,'ƒ':0x83,'„':0x84,'…':0x85,'†':0x86,'‡':0x87,'ˆ':0x88,'‰':0x89,'Š':0x8a,'‹':0x8b,'Œ':0x8c,'Ž':0x8e,'‘':0x91,'’':0x92,'“':0x93,'”':0x94,'•':0x95,'–':0x96,'—':0x97,'˜':0x98,'™':0x99,'š':0x9a,'›':0x9b,'œ':0x9c,'ž':0x9e,'Ÿ':0x9f };
  return Array.from(value).map((char) => {
    const code = special[char] ?? char.codePointAt(0)!;
    return (code >= 32 && code <= 255 ? code : 63).toString(16).padStart(2, "0").toUpperCase();
  }).join("");
}

function wrapText(value: string, maxChars: number) {
  const words = String(value || "Non renseigné").replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if ((line + " " + word).length <= maxChars) line += " " + word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ["Non renseigné"];
}

function makePdf(title: string, subtitle: string, fields: PdfField[]) {
  const rows: { text: string; heading?: boolean }[] = [{ text: "GMP POLYCLINIQUE · PARC BIOMÉDICAL", heading: true }, { text: title, heading: true }];
  if (subtitle) rows.push({ text: subtitle });
  rows.push({ text: `Document exporté le ${new Date().toLocaleDateString("fr-FR")}` });
  rows.push({ text: "────────────────────────────────────────────────────────────────" });
  const usableChars = 94;
  for (const field of fields) {
    const value = `${field.label} : ${field.value || "Non renseigné"}`;
    wrapText(value, usableChars).forEach((line) => rows.push({ text: line }));
  }
  // Fit every field on a single A4 page; reduce the font only when the data is unusually long.
  const top = 800, bottom = 28;
  const fontSize = Math.max(6.2, Math.min(9, (top - bottom) / Math.max(rows.length * 1.22, 1)));
  const leading = fontSize * 1.22;
  const commands = ["BT", "/F1 " + fontSize.toFixed(2) + " Tf", `${leading.toFixed(2)} TL`, `40 ${top} Td`];
  rows.forEach((row, index) => {
    if (index) commands.push("T*");
    const text = row.text;
    commands.push(`<${winAnsiHex(text)}> Tj`);
  });
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n% GMP PDF\n";
  const offsets = [0];
  objects.forEach((obj, index) => { offsets.push(new TextEncoder().encode(pdf).length); pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`; });
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([new TextEncoder().encode(pdf)], { type: "application/pdf" });
}

export function PrintButton({ title = "Fiche technique", subtitle = "", fields = [], filename = "GMP_fiche.pdf" }: Props) {
  function exportPdf() {
    const blob = makePdf(title, subtitle, fields);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
  return <button className="secondary-button" type="button" onClick={exportPdf}>Exporter en PDF</button>;
}
