"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Ref = { id: string; name: string };
type Equipment = {
  id: string; internal_code: string; designation: string; brand: string | null; model: string | null;
  manufacturer: string | null; serial_number: string | null; service_id: string | null; location_id: string | null;
  operational_status: string; criticality: string; acquisition_date: string | null; commissioning_date: string | null;
  acquisition_cost: number | null; theoretical_lifetime_years: number | null; next_maintenance_at: string | null; notes: string | null;
};

export function EquipmentEditForm({ equipment, services, locations }: { equipment: Equipment; services: Ref[]; locations: Ref[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Session expirée. Reconnecte-toi puis réessaie."); setBusy(false); return; }
    const payload = {
      internal_code: String(form.get("internal_code") || "").trim(),
      designation: String(form.get("designation") || "").trim(),
      brand: String(form.get("brand") || "").trim() || null,
      model: String(form.get("model") || "").trim() || null,
      manufacturer: String(form.get("manufacturer") || "").trim() || null,
      serial_number: String(form.get("serial_number") || "").trim() || null,
      service_id: String(form.get("service_id") || "") || null,
      location_id: String(form.get("location_id") || "") || null,
      operational_status: String(form.get("operational_status")),
      criticality: String(form.get("criticality")),
      acquisition_date: String(form.get("acquisition_date") || "") || null,
      commissioning_date: String(form.get("commissioning_date") || "") || null,
      acquisition_cost: form.get("acquisition_cost") ? Number(form.get("acquisition_cost")) : null,
      theoretical_lifetime_years: form.get("lifetime") ? Number(form.get("lifetime")) : null,
      next_maintenance_at: String(form.get("next_maintenance_at") || "") || null,
      notes: String(form.get("notes") || "").trim() || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };
    if (!payload.internal_code || !payload.designation) { setError("Le code interne et la désignation sont obligatoires."); setBusy(false); return; }
    if (payload.acquisition_cost !== null && (!Number.isFinite(payload.acquisition_cost) || payload.acquisition_cost < 0)) { setError("Le coût d’acquisition doit être un montant positif ou nul."); setBusy(false); return; }
    const { error: updateError } = await supabase.from("equipment").update(payload).eq("id", equipment.id);
    if (updateError) { setError(`Modification impossible : ${updateError.message}`); setBusy(false); return; }
    setSuccess("Fiche équipement mise à jour."); setBusy(false); router.refresh();
  }

  return <form className="maintenance-form equipment-form" onSubmit={submit}>
    <section className="form-section"><div className="form-section-heading"><span>01</span><div><h2>Identification</h2><p>Informations qui permettent d’identifier l’appareil sans ambiguïté.</p></div></div><div className="form-grid">
      <label>Code interne *<input name="internal_code" required defaultValue={equipment.internal_code} maxLength={80}/></label>
      <label>Désignation *<input name="designation" required defaultValue={equipment.designation} maxLength={180}/></label>
      <label>Marque<input name="brand" defaultValue={equipment.brand || ""}/></label><label>Modèle<input name="model" defaultValue={equipment.model || ""}/></label>
      <label>Fabricant<input name="manufacturer" defaultValue={equipment.manufacturer || ""}/></label><label>Numéro de série<input name="serial_number" defaultValue={equipment.serial_number || ""}/></label>
    </div></section>
    <section className="form-section"><div className="form-section-heading"><span>02</span><div><h2>Affectation et état</h2><p>Service, emplacement et état opérationnel connu.</p></div></div><div className="form-grid">
      <label>Service<select name="service_id" defaultValue={equipment.service_id || ""}><option value="">Non renseigné</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Emplacement<select name="location_id" defaultValue={equipment.location_id || ""}><option value="">Non renseigné</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>État opérationnel<select name="operational_status" defaultValue={equipment.operational_status}><option value="functional">Fonctionnel</option><option value="functional_restricted">Fonctionnement restreint</option><option value="broken">En panne</option><option value="under_maintenance">En maintenance</option><option value="out_of_service">Hors service</option><option value="retired">Réformé</option></select></label>
      <label>Criticité<select name="criticality" defaultValue={equipment.criticality || "normal"}><option value="critical">Critique</option><option value="high">Élevée</option><option value="normal">Normale</option><option value="low">Faible</option></select></label>
    </div></section>
    <section className="form-section"><div className="form-section-heading"><span>03</span><div><h2>Cycle de vie et suivi</h2><p>Dates et informations administratives utiles au suivi du parc.</p></div></div><div className="form-grid">
      <label>Date d’acquisition<input name="acquisition_date" type="date" defaultValue={equipment.acquisition_date || ""}/></label><label>Date de mise en service<input name="commissioning_date" type="date" defaultValue={equipment.commissioning_date || ""}/></label>
      <label>Coût d’acquisition (FCFA)<input name="acquisition_cost" type="number" min="0" step="1" defaultValue={equipment.acquisition_cost ?? ""}/></label><label>Durée de vie théorique (années)<input name="lifetime" type="number" min="0.1" step="0.1" defaultValue={equipment.theoretical_lifetime_years ?? ""}/></label>
      <label>Prochaine maintenance<input name="next_maintenance_at" type="date" defaultValue={equipment.next_maintenance_at || ""}/></label>
    </div><label className="form-notes-label">Notes / informations techniques<textarea name="notes" rows={5} defaultValue={equipment.notes || ""} maxLength={10000}/></label></section>
    {error && <div className="form-alert form-alert-error" role="alert">{error}</div>}{success && <div className="form-alert form-alert-success" role="status">{success}</div>}
    <div className="detail-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer les modifications"}</button><button className="secondary-button" type="button" onClick={() => router.push(`/equipment/${equipment.id}`)}>Annuler</button></div>
  </form>;
}
