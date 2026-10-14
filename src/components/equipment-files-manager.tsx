"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type EquipmentFile = {
  id: string;
  equipment_id: string;
  file_kind: string;
  storage_path: string;
  original_filename: string | null;
  content_type: string | null;
  file_size_bytes: number | null;
  caption: string | null;
  created_at: string;
};

const BUCKET = "gmp-equipment-files";
const KINDS = [
  ["main_photo", "Photo principale"],
  ["nameplate_photo", "Photo de la plaque signalétique"],
  ["condition_photo", "Photo de l’état de l’équipement"],
  ["manual", "Manuel technique"],
  ["certificate", "Certificat / rapport de contrôle"],
  ["invoice", "Facture"],
  ["warranty", "Garantie"],
  ["maintenance_report", "Rapport de maintenance"],
  ["other", "Autre document"],
] as const;

function formatSize(size: number | null) {
  if (size == null) return "Taille inconnue";
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} Ko` : `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

export function EquipmentFilesManager({ equipmentId }: { equipmentId: string }) {
  const supabase = createClient();
  const [files, setFiles] = useState<EquipmentFile[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [kind, setKind] = useState<string>("main_photo");
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("equipment_files")
      .select("id,equipment_id,file_kind,storage_path,original_filename,content_type,file_size_bytes,caption,created_at")
      .eq("equipment_id", equipmentId)
      .order("created_at", { ascending: false });
    if (queryError) {
      setError(`Impossible de charger les documents : ${queryError.message}`);
      setLoading(false);
      return;
    }
    const rows = (data || []) as EquipmentFile[];
    setFiles(rows);
    const signed: Record<string, string> = {};
    await Promise.all(rows.map(async (row) => {
      if (row.content_type?.startsWith("image/")) {
        const { data: signedData } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, 60 * 30);
        if (signedData?.signedUrl) signed[row.id] = signedData.signedUrl;
      }
    }));
    setUrls(signed);
    setLoading(false);
  }

  useEffect(() => { void refresh(); /* refresh is intentionally scoped to this equipment */ }, [equipmentId]);

  async function uploadFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    if (!selected) { setError("Choisis un fichier avant de lancer l’envoi."); return; }
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(selected.type)) { setError("Formats autorisés : JPG, PNG, WEBP et PDF."); return; }
    if (selected.size > 15 * 1024 * 1024) { setError("Le fichier dépasse la limite de 15 Mo."); return; }
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Ta session a expiré. Reconnecte-toi."); setUploading(false); return; }
    const safeName = selected.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "document";
    const path = `${equipmentId}/${crypto.randomUUID()}-${safeName}`;
    const { error: storageError } = await supabase.storage.from(BUCKET).upload(path, selected, { contentType: selected.type, upsert: false });
    if (storageError) {
      setError(`Envoi impossible : ${storageError.message}. Vérifie les droits du profil et le bucket Supabase.`);
      setUploading(false); return;
    }
    const { error: insertError } = await supabase.from("equipment_files").insert({
      equipment_id: equipmentId,
      file_kind: kind,
      storage_path: path,
      original_filename: selected.name,
      content_type: selected.type,
      file_size_bytes: selected.size,
      caption: caption.trim() || null,
      uploaded_by: user.id,
    });
    if (insertError) {
      await supabase.storage.from(BUCKET).remove([path]);
      setError(`Fichier envoyé mais enregistrement des informations impossible : ${insertError.message}`);
      setUploading(false); return;
    }
    setSelected(null); setCaption("");
    const input = document.getElementById(`equipment-file-${equipmentId}`) as HTMLInputElement | null;
    if (input) input.value = "";
    setMessage("Fichier ajouté à la fiche équipement.");
    setUploading(false);
    await refresh();
  }

  async function deleteFile(file: EquipmentFile) {
    if (!window.confirm(`Supprimer « ${file.original_filename || "ce fichier"} » ?`)) return;
    setError(""); setMessage("");
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([file.storage_path]);
    if (storageError) { setError(`Suppression du fichier impossible : ${storageError.message}`); return; }
    const { error: rowError } = await supabase.from("equipment_files").delete().eq("id", file.id);
    if (rowError) { setError(`Fichier supprimé du stockage, mais la fiche documentaire n’a pas pu être supprimée : ${rowError.message}`); return; }
    setMessage("Document supprimé.");
    await refresh();
  }

  return <section className="maintenance-list equipment-files-section">
    <div className="section-heading"><div><p className="eyebrow">DOSSIER DOCUMENTAIRE</p><h2>Photos et documents</h2></div><span className="phase-tag">{files.length} fichier(s)</span></div>
    <p className="muted-copy">Ajoute les photos de l’appareil, la plaque signalétique, les manuels, certificats, factures et rapports de maintenance. Formats acceptés : JPG, PNG, WEBP et PDF (15 Mo maximum par fichier).</p>
    <form className="equipment-file-form" onSubmit={uploadFile}>
      <label>Type de fichier<select value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Fichier<input id={`equipment-file-${equipmentId}`} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setSelected(e.target.files?.[0] || null)} required /></label>
      <label className="file-caption-field">Légende / précision (facultatif)<input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={250} placeholder="Ex. Plaque signalétique côté arrière" /></label>
      <button className="primary-button" type="submit" disabled={uploading}>{uploading ? "Envoi en cours…" : "Ajouter le fichier"}</button>
    </form>
    {error && <div className="form-alert form-alert-error" role="alert">{error}</div>}
    {message && <div className="form-alert form-alert-success" role="status">{message}</div>}
    {loading ? <p className="empty-state">Chargement des fichiers…</p> : files.length === 0 ? <p className="empty-state">Aucune photo ni document pour cet équipement.</p> : <div className="equipment-files-grid">{files.map((file) => <article className="equipment-file-card" key={file.id}>
      {urls[file.id] ? <a href={urls[file.id]} target="_blank" rel="noreferrer" className="equipment-file-preview"><img src={urls[file.id]} alt={file.caption || file.original_filename || "Photo de l’équipement"} /></a> : <div className="equipment-file-document">{file.content_type === "application/pdf" ? "PDF" : "FICHIER"}</div>}
      <div className="equipment-file-meta"><strong>{KINDS.find(([value]) => value === file.file_kind)?.[1] || file.file_kind}</strong><span>{file.original_filename || "Fichier sans nom"}</span>{file.caption && <p>{file.caption}</p>}<small>{formatSize(file.file_size_bytes)} · {new Date(file.created_at).toLocaleDateString("fr-FR")}</small>
      <div className="equipment-file-actions">{!urls[file.id] && <button type="button" className="secondary-button" onClick={async () => { const { data } = await supabase.storage.from(BUCKET).createSignedUrl(file.storage_path, 60 * 30); if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer"); else setError("Impossible de générer le lien sécurisé. Vérifie les droits Supabase."); }}>Ouvrir / télécharger</button>}<button type="button" className="text-danger-button" onClick={() => void deleteFile(file)}>Supprimer</button></div></div>
    </article>)}</div>}
  </section>;
}
