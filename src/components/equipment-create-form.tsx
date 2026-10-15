"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Ref = { id: string; name: string };

export function EquipmentCreateForm({ services, locations }: { services: Ref[]; locations: Ref[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Ta session a expiré. Reconnecte-toi avant d’enregistrer la fiche.");
      setBusy(false);
      return;
    }

    const acquisitionCost = form.get("acquisition_cost") ? Number(form.get("acquisition_cost")) : null;
    const lifetime = form.get("lifetime") ? Number(form.get("lifetime")) : null;
    if (acquisitionCost !== null && (!Number.isFinite(acquisitionCost) || acquisitionCost < 0)) {
      setError("Le coût d’acquisition doit être un montant positif ou nul.");
      setBusy(false);
      return;
    }
    if (lifetime !== null && (!Number.isFinite(lifetime) || lifetime <= 0)) {
      setError("La durée de vie théorique doit être supérieure à zéro.");
      setBusy(false);
      return;
    }

    const payload = {
      internal_code: String(form.get("internal_code") || "").trim(),
      designation: String(form.get("designation") || "").trim(),
      brand: String(form.get("brand") || "").trim() || null,
      model: String(form.get("model") || "").trim() || null,
      manufacturer: String(form.get("manufacturer") || "").trim() || null,
      serial_number: String(form.get("serial_number") || "").trim() || null,
      service_id: String(form.get("service_id") || "") || null,
      location_id: String(form.get("location_id") || "") || null,
      complexity: String(form.get("complexity") || "") || null,
      data_verification: String(form.get("data_verification") || "to_verify"),
      verification_notes: String(form.get("verification_notes") || "").trim() || null,
      operational_status: String(form.get("operational_status")),
      criticality: String(form.get("criticality")),
      acquisition_date: String(form.get("acquisition_date") || "") || null,
      commissioning_date: String(form.get("commissioning_date") || "") || null,
      acquisition_cost: acquisitionCost,
      theoretical_lifetime_years: lifetime,
      next_maintenance_at: String(form.get("next_maintenance_at") || "") || null,
      notes: String(form.get("notes") || "").trim() || null,
      created_by: user.id,
      updated_by: user.id,
    };

    if (!payload.internal_code || !payload.designation) {
      setError("Le code interne et la désignation sont obligatoires.");
      setBusy(false);
      return;
    }

    const { data, error: insertError } = await supabase.from("equipment").insert(payload).select("id").single();
    if (insertError) {
      setError(insertError.code === "23505"
        ? "Ce code interne existe déjà. Chaque équipement doit avoir un code unique."
        : `Enregistrement impossible : ${insertError.message}`);
      setBusy(false);
      return;
    }
    router.push(`/equipment/${data.id}`);
    router.refresh();
  }

  return (
    <form className="maintenance-form equipment-form" onSubmit={submit}>
      <div className="form-section-heading"><span>01</span><div><h2>Identification de l’équipement</h2><p>Les informations permettant d’identifier précisément l’appareil.</p></div></div>
      {error && <div className="form-alert form-alert-error" role="alert">{error}</div>}
      <div className="form-grid">
        <label>Code d’inventaire *<input name="internal_code" required maxLength={80} placeholder="GMP-RESP-001"/></label>
        <label>Désignation *<input name="designation" required maxLength={180} placeholder="Respirateur de réanimation"/></label>
        <label>Marque<input name="brand" maxLength={120} placeholder="Marque constructeur"/></label>
        <label>Modèle<input name="model" maxLength={120} placeholder="Référence du modèle"/></label>
        <label>Fabricant<input name="manufacturer" maxLength={160}/></label>
        <label>Numéro de série<input name="serial_number" maxLength={160}/></label>
      </div>

      <div className="form-section-heading"><span>02</span><div><h2>Affectation et classification</h2><p>Où se trouve l’appareil et quel niveau de complexité a été confirmé ?</p></div></div>
      <div className="form-grid">
        <label>Service de localisation<select name="service_id" defaultValue=""><option value="">Non renseigné</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Emplacement précis<select name="location_id" defaultValue=""><option value="">Non renseigné</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Complexité technique<select name="complexity" defaultValue=""><option value="">À déterminer</option><option value="simple">Fonctionnement simple</option><option value="complex">Fonctionnement complexe</option></select></label>
        <label>Criticité<select name="criticality" defaultValue="normal"><option value="critical">Critique</option><option value="high">Élevée</option><option value="normal">Normale</option><option value="low">Faible</option></select></label>
        <label>État opérationnel initial<select name="operational_status" defaultValue="out_of_service"><option value="functional">Fonctionnel — vérifié</option><option value="functional_restricted">Fonctionnement restreint</option><option value="broken">En panne</option><option value="under_maintenance">En maintenance</option><option value="out_of_service">Hors service / à vérifier</option><option value="retired">Réformé</option></select><small className="field-help">Par défaut, l’équipement reste hors service tant que son état n’a pas été vérifié.</small></label>
        <label>Vérification de l’inventaire<select name="data_verification" defaultValue="to_verify"><option value="to_verify">À vérifier physiquement</option><option value="confirmed">Confirmé sur site</option><option value="not_provided">Informations non disponibles</option></select></label>
        <label className="form-notes-label">Précisions sur la vérification<input name="verification_notes" maxLength={1000} placeholder="Ex. plaque signalétique contrôlée le…"/></label>
      </div>

      <div className="form-section-heading"><span>03</span><div><h2>Cycle de vie et maintenance</h2><p>Dates et données administratives disponibles.</p></div></div>
      <div className="form-grid">
        <label>Date d’acquisition<input name="acquisition_date" type="date"/></label>
        <label>Date de mise en service<input name="commissioning_date" type="date"/></label>
        <label>Coût d’acquisition (FCFA)<input name="acquisition_cost" type="number" min="0" step="1"/></label>
        <label>Durée de vie théorique (années)<input name="lifetime" type="number" min="0.1" step="0.1"/></label>
        <label>Prochaine maintenance prévue<input name="next_maintenance_at" type="date"/></label>
      </div>
      <label className="form-notes-label">Notes et caractéristiques techniques<textarea name="notes" rows={5} maxLength={10000} placeholder="Caractéristiques, accessoires, état constaté, observations…"/></label>
      <div className="security-note"><span>ℹ</span><p><strong>Photos et documents :</strong> après l’enregistrement, ouvre la fiche pour ajouter la photo principale, la plaque signalétique, les notices et les rapports. Les fichiers sont conservés dans le stockage privé Supabase.</p></div>
      <div className="detail-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer l’équipement"}</button><button className="secondary-button" type="button" onClick={() => router.push("/equipment")}>Annuler</button></div>
    </form>
  );
}
