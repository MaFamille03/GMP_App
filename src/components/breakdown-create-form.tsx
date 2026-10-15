"use client";
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Equipment = { id: string; internal_code: string; designation: string };

export function BreakdownCreateForm({ equipment, preselected }: { equipment: Equipment[]; preselected: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault(); setBusy(true); setError('');
    const form = new FormData(ev.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Session expirée. Reconnecte-toi avant de déclarer la panne.'); setBusy(false); return; }
    const payload = {
      equipment_id: String(form.get('equipment_id')),
      symptom_description: String(form.get('symptom_description')).trim(),
      circumstances: String(form.get('circumstances') || '').trim() || null,
      priority: String(form.get('priority')),
      initial_risk: String(form.get('initial_risk') || '').trim() || null,
      equipment_taken_out_of_service: form.get('equipment_taken_out_of_service') === 'on',
      reported_by: user.id,
      notes: String(form.get('notes') || '').trim() || null,
    };
    const { data, error: insertError } = await supabase.from('breakdowns').insert(payload).select('id').single();
    if (insertError) { setError(`Déclaration impossible : ${insertError.message}`); setBusy(false); return; }

    // Règle GMP : un équipement déclaré en panne passe automatiquement à l'état « broken ».
    const { error: equipmentError } = await supabase.from('equipment')
      .update({ operational_status: 'out_of_service', updated_by: user.id })
      .eq('id', payload.equipment_id);
    if (equipmentError) {
      setError(`Le signalement est enregistré, mais le passage automatique de l’équipement hors service a échoué : ${equipmentError.message}. Corrige l’état de l’équipement avant de continuer.`);
      setBusy(false); return;
    }
    router.push(`/breakdowns/${data.id}`); router.refresh();
  }

  return <form className="maintenance-form" onSubmit={submit}>
    <h2>Déclarer une panne</h2>
    {error && <div className="form-alert form-alert-error">{error}</div>}
    <label>Équipement concerné *
      <select name="equipment_id" required defaultValue={preselected}>
        <option value="">Sélectionner</option>
        {equipment.map(item => <option key={item.id} value={item.id}>{item.internal_code} — {item.designation}</option>)}
      </select>
    </label>
    <label>Description des symptômes *<textarea name="symptom_description" rows={4} required placeholder="Décrire précisément le problème constaté…" /></label>
    <label>Circonstances / contexte<textarea name="circumstances" rows={3} /></label>
    <label>Priorité
      <select name="priority" defaultValue="normal">
        <option value="critical">Critique — risque immédiat</option><option value="high">Élevée</option>
        <option value="normal">Normale</option><option value="low">Faible</option>
      </select>
    </label>
    <label>Risque ou conséquence identifiée<textarea name="initial_risk" rows={2} placeholder="Ex. équipement nécessaire aux urgences…" /></label>
    <label className="checkbox-label"><input type="checkbox" name="equipment_taken_out_of_service" /> J’ai physiquement isolé / mis hors service l’équipement</label>
    <label>Notes complémentaires<textarea name="notes" rows={2} /></label>
    <p className="helper-text">Le signalement fait passer l’équipement en statut hors service dans le registre. Si l’appareil présente un danger, applique aussi immédiatement la procédure de sécurisation physique du GMP.</p>
    <button className="primary-button" disabled={busy || equipment.length === 0}>{busy ? 'Enregistrement…' : 'Enregistrer le signalement'}</button>
    {equipment.length === 0 && <p className="helper-text">Il faut d’abord enregistrer un équipement dans l’inventaire.</p>}
  </form>;
}
