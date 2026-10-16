"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const statusOptions = [
  ["new", "Nouvelle"], ["to_qualify", "À qualifier"], ["assigned", "Affectée"],
  ["in_progress", "En cours"], ["waiting_parts", "En attente de pièces"],
  ["waiting_provider", "En attente du prestataire"], ["resolved", "Résolue — vérification requise"],
  ["closed", "Clôturée — remise en service validée"], ["not_repairable", "Non réparable / réformée"],
] as const;

type Props = {
  id: string;
  initialStatus: string;
  initialPriority: string;
  initialDiagnosis: string;
  initialResolution: string;
  canValidate: boolean;
  initialMode?: string;
  initialProvider?: string;
  initialProviderReference?: string;
  initialDiagnosisDetails?: string;
  initialCorrectiveActions?: string;
  initialPartsUsed?: string;
  initialSafetyTests?: string;
  initialValidated?: boolean;
  initialCost?: number | string | null;
  initialNotes?: string | null;
};

export function BreakdownUpdateForm(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const form = new FormData(e.currentTarget);
    const status = String(form.get("status"));
    const mode = String(form.get("intervention_mode"));
    const validateReturn = form.get("return_to_service_validated") === "on";
    const safetyNotes = String(form.get("safety_test_notes") || "").trim();
    const resolution = String(form.get("resolution_summary") || "").trim();
    const costRaw = String(form.get("cost_amount") || "").trim();
    const cost = costRaw ? Number(costRaw) : null;

    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      setError("Le coût doit être un montant positif ou nul.");
      setBusy(false);
      return;
    }
    if (status === "closed" && !props.canValidate) {
      setError("Seul l’administrateur-technicien peut clôturer une panne.");
      setBusy(false);
      return;
    }
    if (status === "closed" && (!validateReturn || !safetyNotes || !resolution)) {
      setError("Pour clôturer le dossier, coche la validation de remise en service et renseigne le compte rendu de résolution ainsi que les essais et contrôles réalisés.");
      setBusy(false);
      return;
    }
    if (status === "resolved" && validateReturn) {
      setError("Utilise d’abord le statut « Résolue — vérification requise ». La remise en service est validée au moment de la clôture, après les essais.");
      setBusy(false);
      return;
    }
    if (status === "not_repairable" && validateReturn) {
      setError("Un équipement non réparable ne peut pas être déclaré remis en service.");
      setBusy(false);
      return;
    }
    const provider = String(form.get("external_provider_name") || "").trim();
    if (mode === "external" && !provider && !["new", "to_qualify"].includes(status)) {
      setError("Renseigne le nom du prestataire externe pour suivre cette prise en charge.");
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("Session expirée. Reconnecte-toi avant d’enregistrer.");
      setBusy(false);
      return;
    }

    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      status,
      priority: String(form.get("priority")),
      intervention_mode: mode,
      external_provider_name: provider || null,
      provider_reference: String(form.get("provider_reference") || "").trim() || null,
      root_cause: String(form.get("root_cause") || "").trim() || null,
      diagnosis_details: String(form.get("diagnosis_details") || "").trim() || null,
      corrective_actions: String(form.get("corrective_actions") || "").trim() || null,
      parts_used: String(form.get("parts_used") || "").trim() || null,
      resolution_summary: resolution || null,
      safety_test_notes: safetyNotes || null,
      notes: String(form.get("notes") || "").trim() || null,
      cost_amount: cost,
      updated_at: now,
    };

    if (status === "in_progress" && props.initialStatus !== "in_progress") payload.diagnosed_at = now;
    if (status === "resolved") payload.resolved_at = now;
    if (status === "closed") {
      payload.resolved_at = now;
      payload.closed_at = now;
      payload.return_to_service_recommended = true;
      payload.return_to_service_validated = true;
      payload.return_to_service_validated_by = user.id;
      payload.return_to_service_validated_at = now;
      payload.equipment_restored_at = now;
      payload.equipment_restored_by = user.id;
    }
    if (status === "not_repairable") {
      payload.closed_at = now;
      payload.return_to_service_validated = false;
      payload.return_to_service_validated_by = null;
      payload.return_to_service_validated_at = null;
      payload.equipment_restored_at = null;
      payload.equipment_restored_by = null;
    }

    const { error: updateError } = await supabase.from("breakdowns").update(payload).eq("id", props.id);
    if (updateError) {
      setError(`Mise à jour impossible : ${updateError.message}`);
      setBusy(false);
      return;
    }

    setMessage("Dossier mis à jour. L’état de l’équipement est géré par les règles de la base de données.");
    setBusy(false);
    router.refresh();
  }

  return (
    <form className="maintenance-form breakdown-update-form" onSubmit={submit}>
      <div><p className="eyebrow">SUIVI TECHNIQUE</p><h2>Diagnostic et intervention</h2><p className="form-intro">Documente les actions réalisées et conserve les éléments nécessaires au rapport technique.</p></div>
      {error && <div ref={errorRef} className="form-alert form-alert-error breakdown-sticky-error" role="alert"><strong>Enregistrement impossible</strong><span>{error}</span></div>}
      {message && <div className="form-alert form-alert-success" role="status">{message}</div>}

      <div className="form-grid">
        <label>Statut du dossier<select name="status" defaultValue={props.initialStatus}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Priorité<select name="priority" defaultValue={props.initialPriority}><option value="critical">Critique</option><option value="high">Élevée</option><option value="normal">Normale</option><option value="low">Faible</option></select></label>
        <label>Mode de prise en charge<select name="intervention_mode" defaultValue={props.initialMode || "internal"}><option value="internal">Intervention interne GMP</option><option value="external">Prestataire externe</option><option value="undetermined">À déterminer</option></select></label>
        <label>Prestataire externe<input name="external_provider_name" defaultValue={props.initialProvider || ""} placeholder="Entreprise ou expert"/></label>
        <label>Référence du devis / rapport externe<input name="provider_reference" defaultValue={props.initialProviderReference || ""} placeholder="N° devis, bon d’intervention…"/></label>
        <label>Coût total de l’intervention (FCFA)<input name="cost_amount" type="number" min="0" step="1" defaultValue={props.initialCost ?? ""} placeholder="0"/></label>
      </div>

      <div className="breakdown-form-subheading"><span>01</span><h3>Diagnostic</h3></div>
      <label>Cause identifiée<textarea name="root_cause" rows={2} defaultValue={props.initialDiagnosis} placeholder="Cause probable ou confirmée…"/></label>
      <label>Diagnostic technique détaillé<textarea name="diagnosis_details" rows={3} defaultValue={props.initialDiagnosisDetails || ""} placeholder="Constats, tests, mesures, origine probable…"/></label>

      <div className="breakdown-form-subheading"><span>02</span><h3>Intervention et résolution</h3></div>
      <label>Actions correctives réalisées<textarea name="corrective_actions" rows={3} defaultValue={props.initialCorrectiveActions || ""} placeholder="Dépannage, réglage, remplacement ou intervention externe…"/></label>
      <label>Pièces utilisées ou remplacées<textarea name="parts_used" rows={2} defaultValue={props.initialPartsUsed || ""} placeholder="Référence, quantité, provenance…"/></label>
      <label>Compte rendu de résolution<textarea name="resolution_summary" rows={4} defaultValue={props.initialResolution} placeholder="Travaux réalisés, résultat obtenu, réserves restantes…"/></label>

      <div className="breakdown-form-subheading"><span>03</span><h3>Vérification avant remise en service</h3></div>
      <label>Essais et contrôles réalisés<textarea name="safety_test_notes" rows={4} defaultValue={props.initialSafetyTests || ""} placeholder="Tests fonctionnels, alarmes, contrôles de sécurité adaptés, résultats et réserves…"/></label>
      {props.canValidate && <label className="checkbox-label breakdown-validation-checkbox"><input type="checkbox" name="return_to_service_validated" defaultChecked={props.initialValidated || false}/> Je confirme que les contrôles requis ont été réalisés et que l’équipement peut être remis en service.</label>}
      <label>Notes complémentaires<textarea name="notes" rows={3} defaultValue={props.initialNotes || ""}/></label>

      <div className="detail-actions"><button className="primary-button" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer le suivi"}</button></div>
    </form>
  );
}
