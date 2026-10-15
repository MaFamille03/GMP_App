"use client";
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const statusOptions = [
  ['new', 'Nouvelle'], ['to_qualify', 'À qualifier'], ['assigned', 'Affectée'],
  ['in_progress', 'En cours'], ['waiting_parts', 'En attente de pièces'],
  ['waiting_provider', 'Chez prestataire'], ['resolved', 'Résolue'],
  ['closed', 'Clôturée'], ['not_repairable', 'Non réparable'],
];

type Props = {
  id: string; initialStatus: string; initialPriority: string;
  initialDiagnosis: string; initialResolution: string; canValidate: boolean;
  initialMode?: string; initialProvider?: string; initialProviderReference?: string;
  initialDiagnosisDetails?: string; initialCorrectiveActions?: string;
  initialPartsUsed?: string; initialSafetyTests?: string;
  initialValidated?: boolean;
};

export function BreakdownUpdateForm(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(e.currentTarget);
    const status = String(form.get('status'));
    const mode = String(form.get('intervention_mode'));
    const validateReturn = form.get('return_to_service_validated') === 'on';
    const safetyNotes = String(form.get('safety_test_notes') || '').trim();
    if (status === 'closed' && !props.initialValidated && (!validateReturn || !safetyNotes)) {
      setError('Avant de clôturer, coche la validation de remise en service et renseigne les contrôles de sécurité. Si l’équipement ne peut pas être remis en service, utilise le statut approprié et documente la situation.');
      setBusy(false); return;
    }
    if (mode === 'external' && !String(form.get('external_provider_name') || '').trim() && status !== 'new' && status !== 'to_qualify') {
      setError('Indique le nom du prestataire externe pour documenter cette prise en charge.'); setBusy(false); return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      status, priority: String(form.get('priority')), intervention_mode: mode,
      external_provider_name: String(form.get('external_provider_name') || '').trim() || null,
      provider_reference: String(form.get('provider_reference') || '').trim() || null,
      root_cause: String(form.get('root_cause') || '').trim() || null,
      diagnosis_details: String(form.get('diagnosis_details') || '').trim() || null,
      corrective_actions: String(form.get('corrective_actions') || '').trim() || null,
      parts_used: String(form.get('parts_used') || '').trim() || null,
      resolution_summary: String(form.get('resolution_summary') || '').trim() || null,
      safety_test_notes: safetyNotes || null,
      notes: String(form.get('notes') || '').trim() || null,
      updated_at: now,
    };
    if (status === 'in_progress' && props.initialStatus !== 'in_progress') payload.diagnosed_at = now;
    if (status === 'resolved') { payload.resolved_at = now; payload.return_to_service_recommended = validateReturn; }
    if (status === 'closed') {
      payload.closed_at = now;
      payload.return_to_service_validated = validateReturn;
      if (validateReturn && props.canValidate) {
        payload.return_to_service_validated_by = user?.id || null;
        payload.return_to_service_validated_at = now;
        payload.equipment_restored_at = now;
        payload.equipment_restored_by = user?.id || null;
      }
    }
    const { error: updateError } = await supabase.from('breakdowns').update(payload).eq('id', props.id);
    if (updateError) { setError(`Mise à jour impossible : ${updateError.message}`); setBusy(false); return; }

    // L'état de l'équipement ne revient à fonctionnel qu'après validation explicite.
    if (status === 'closed' && validateReturn && props.canValidate) {
      const { data: breakdown } = await supabase.from('breakdowns').select('equipment_id').eq('id', props.id).single();
      if (breakdown?.equipment_id) {
        const { error: equipmentError } = await supabase.from('equipment')
          .update({ operational_status: 'functional', updated_by: user?.id || null })
          .eq('id', breakdown.equipment_id);
        if (equipmentError) {
          setError(`Le dossier est enregistré, mais la mise à jour de l’état de l’équipement a échoué : ${equipmentError.message}`);
          setBusy(false); router.refresh(); return;
        }
      }
    }
    setMessage('Dossier de panne mis à jour. Vérifie les informations et les essais consignés avant toute remise en service.');
    setBusy(false); router.refresh();
  }

  return <form className="maintenance-form" onSubmit={submit}>
    <h2>Suivi, intervention et résolution</h2>
    {error && <div className="form-alert form-alert-error">{error}</div>}
    {message && <div className="form-alert form-alert-success">{message}</div>}
    <label>Statut du dossier<select name="status" defaultValue={props.initialStatus}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label>Priorité<select name="priority" defaultValue={props.initialPriority}><option value="critical">Critique</option><option value="high">Élevée</option><option value="normal">Normale</option><option value="low">Faible</option></select></label>
    <label>Mode de prise en charge<select name="intervention_mode" defaultValue={props.initialMode || 'internal'}><option value="internal">Intervention interne</option><option value="external">Prestataire externe</option><option value="undetermined">À déterminer</option></select></label>
    <label>Prestataire externe (si applicable)<input name="external_provider_name" defaultValue={props.initialProvider || ''} placeholder="Nom de l'entreprise / expert" /></label>
    <label>Référence du rapport / devis prestataire<input name="provider_reference" defaultValue={props.initialProviderReference || ''} placeholder="Référence du document" /></label>
    <label>Cause identifiée<textarea name="root_cause" rows={2} defaultValue={props.initialDiagnosis} /></label>
    <label>Diagnostic technique détaillé<textarea name="diagnosis_details" rows={3} defaultValue={props.initialDiagnosisDetails || ''} placeholder="Constats, tests, mesures, origine probable…" /></label>
    <label>Actions correctives réalisées<textarea name="corrective_actions" rows={3} defaultValue={props.initialCorrectiveActions || ''} placeholder="Dépannage, réglage, remplacement, intervention du prestataire…" /></label>
    <label>Pièces utilisées / remplacées<textarea name="parts_used" rows={2} defaultValue={props.initialPartsUsed || ''} /></label>
    <label>Compte rendu de résolution<textarea name="resolution_summary" rows={3} defaultValue={props.initialResolution} /></label>
    <label>Essais et contrôles avant remise en service<textarea name="safety_test_notes" rows={3} defaultValue={props.initialSafetyTests || ''} placeholder="Tests fonctionnels, alarmes, sécurité électrique si applicable, résultat et réserves…" /></label>
    {props.canValidate && <label className="checkbox-label"><input type="checkbox" name="return_to_service_validated" defaultChecked={props.initialValidated || false} /> Je confirme que les contrôles requis ont été réalisés et que l’équipement peut être remis en service</label>}
    <label>Notes complémentaires<textarea name="notes" rows={2} /></label>
    <p className="helper-text">Ne valide la remise en service qu'après les contrôles adaptés à l'équipement et la documentation de leurs résultats. Une intervention externe ne remplace pas ta validation finale au GMP.</p>
    <button className="primary-button" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer le suivi'}</button>
  </form>;
}
