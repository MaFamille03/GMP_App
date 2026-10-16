import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BreakdownUpdateForm } from "@/components/breakdown-update-form";
import { PrintButton } from "@/components/print-button";

const statuses: Record<string, string> = {
  new: "Nouvelle", to_qualify: "À qualifier", assigned: "Affectée", in_progress: "En cours",
  waiting_parts: "En attente de pièces", waiting_provider: "En attente du prestataire",
  resolved: "Résolue — vérification requise", closed: "Clôturée", not_repairable: "Non réparable",
};
const priorities: Record<string, string> = { critical: "Critique", high: "Élevée", normal: "Normale", low: "Faible" };
const eventLabels: Record<string, string> = {
  reported: "Signalement créé", status_changed: "Statut modifié", priority_changed: "Priorité modifiée",
  assignment_changed: "Affectation modifiée", intervention_mode_changed: "Prise en charge modifiée",
  provider_changed: "Prestataire mis à jour", diagnosis_updated: "Diagnostic mis à jour",
  resolution_updated: "Résolution / contrôles mis à jour", return_validated: "Remise en service validée",
  cost_updated: "Coût mis à jour", details_updated: "Dossier mis à jour",
};
function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "Non renseigné";
}
function formatMoney(value: number | string | null | undefined) {
  return value == null || value === "" ? "Non renseigné" : `${Number(value).toLocaleString("fr-FR")} FCFA`;
}

export default async function BreakdownDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; date?: string }> }) {
  const { id } = await params;
  const { from, date } = await searchParams;
  const calendarReturnHref = from === "calendar" ? `/calendar${date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `?date=${date}` : ""}` : null;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const [{ data: breakdown, error: loadError }, { data: profile }, { data: events, error: eventsError }] = await Promise.all([
    supabase.from("breakdowns").select("*,equipment(id,internal_code,designation,operational_status,services(name),locations(name))").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle(),
    supabase.from("breakdown_events").select("id,event_type,from_status,to_status,summary,created_at,details").eq("breakdown_id", id).order("created_at", { ascending: false }).limit(100),
  ]);
  if (!profile || !profile.is_active) redirect("/access-disabled");
  if (!breakdown && !loadError) notFound();
  const b = breakdown as any;
  const isAdmin = (profile.role === "admin" || profile.role === "biomedical_manager");

  return <main className="dashboard-shell breakdown-detail-page">
    <header className="topbar"><Link className="brand" href="/dashboard"><div className="brand-mark">G</div><div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div></Link><div className="detail-header-actions">{calendarReturnHref && <Link className="secondary-button" href={calendarReturnHref}>← Retour au calendrier</Link>}<Link className="secondary-button" href="/breakdowns">Retour aux pannes</Link><PrintButton title="Fiche de suivi technique de panne" subtitle={`PAN-${String(b?.breakdown_number || "").padStart(5, "0")} · ${b?.equipment?.designation || "Équipement non identifié"}`} filename={`GMP_PAN-${String(b?.breakdown_number || "dossier").padStart(5, "0")}.pdf`} fields={[{label:"Équipement",value:`${b?.equipment?.internal_code || "Code non renseigné"} — ${b?.equipment?.designation || "Non renseigné"}`},{label:"Date du signalement",value:formatDate(b?.reported_at)},{label:"Priorité",value:priorities[b?.priority] || b?.priority || "Non renseigné"},{label:"Statut",value:statuses[b?.status] || b?.status || "Non renseigné"},{label:"Service",value:b?.equipment?.services?.name || "Non renseigné"},{label:"Emplacement",value:b?.equipment?.locations?.name || "Non renseigné"},{label:"Symptômes constatés",value:b?.symptom_description || "Non renseigné"},{label:"Circonstances",value:b?.circumstances || "Non renseigné"},{label:"Risque initial",value:b?.initial_risk || "Non renseigné"},{label:"Cause identifiée",value:b?.root_cause || "Non renseigné"},{label:"Diagnostic détaillé",value:b?.diagnosis_details || "Non renseigné"},{label:"Mode de prise en charge",value:b?.intervention_mode === "external" ? "Prestataire externe" : b?.intervention_mode === "internal" ? "Intervention interne GMP" : "À déterminer"},{label:"Prestataire",value:b?.external_provider_name || "Non renseigné"},{label:"Référence externe",value:b?.provider_reference || "Non renseigné"},{label:"Actions correctives",value:b?.corrective_actions || "Non renseigné"},{label:"Pièces utilisées",value:b?.parts_used || "Non renseigné"},{label:"Compte rendu de résolution",value:b?.resolution_summary || "Non renseigné"},{label:"Essais et contrôles",value:b?.safety_test_notes || "Non renseigné"},{label:"Coût (FCFA)",value:formatMoney(b?.cost_amount)},{label:"Notes complémentaires",value:b?.notes || "Non renseigné"},{label:"Diagnostic commencé",value:formatDate(b?.diagnosed_at)},{label:"Résolution enregistrée",value:formatDate(b?.resolved_at)},{label:"Clôture",value:formatDate(b?.closed_at)},{label:"Remise en service validée",value:b?.return_to_service_validated ? formatDate(b?.return_to_service_validated_at) : "Non validée"}]}/>{b?.equipment?.id && <Link className="secondary-button" href={`/equipment/${b.equipment.id}${from === "calendar" ? `?from=calendar${date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `&date=${date}` : ""}` : ""}`}>Fiche équipement</Link>}</div></header>
    <section className="dashboard-welcome"><p className="eyebrow">DOSSIER DE PANNE · PAN-{String(b?.breakdown_number || "").padStart(5, "0")}</p><h1>{b?.equipment?.designation || "Incident biomédical"}</h1><p>{b?.equipment?.internal_code || "Équipement non identifié"} · Signalé le {formatDate(b?.reported_at)}</p></section>
    {loadError && <div className="form-alert form-alert-error">Lecture impossible : {loadError.message}</div>}

    {b && <div className="breakdown-detail-kpis">
      <article><span>État du dossier</span><strong>{statuses[b.status] || b.status}</strong></article>
      <article className={["critical", "high"].includes(b.priority) ? "breakdown-kpi-alert" : ""}><span>Priorité</span><strong>{priorities[b.priority] || b.priority}</strong></article>
      <article><span>État de l’équipement</span><strong>{b.equipment?.operational_status === "functional" ? "Fonctionnel" : b.equipment?.operational_status === "retired" ? "Réformé" : "Hors service / à contrôler"}</strong></article>
      <article><span>Coût renseigné</span><strong>{formatMoney(b.cost_amount)}</strong></article>
    </div>}

    <section className="maintenance-columns breakdown-detail-columns">
      <div className="maintenance-list breakdown-initial-card">
        <div className="section-heading"><div><p className="eyebrow">DÉCLARATION INITIALE</p><h2>Constat de panne</h2></div></div>
        <div className="detail-grid">
          <div className="detail-field"><span>Date du signalement</span><strong>{formatDate(b?.reported_at)}</strong></div>
          <div className="detail-field"><span>Priorité</span><strong>{priorities[b?.priority] || b?.priority}</strong></div>
          <div className="detail-field"><span>Service</span><strong>{b?.equipment?.services?.name || "Non renseigné"}</strong></div>
          <div className="detail-field"><span>Emplacement</span><strong>{b?.equipment?.locations?.name || "Non renseigné"}</strong></div>
        </div>
        <h3>Symptômes constatés</h3><p className="breakdown-long-text">{b?.symptom_description || "Non renseigné"}</p>
        {b?.circumstances && <><h3>Circonstances / contexte</h3><p className="breakdown-long-text">{b.circumstances}</p></>}
        {b?.initial_risk && <><h3>Risque initial</h3><p className="breakdown-long-text">{b.initial_risk}</p></>}
        <div className="breakdown-date-list"><div><span>Diagnostic commencé</span><strong>{formatDate(b?.diagnosed_at)}</strong></div><div><span>Résolution enregistrée</span><strong>{formatDate(b?.resolved_at)}</strong></div><div><span>Clôture</span><strong>{formatDate(b?.closed_at)}</strong></div><div><span>Remise en service validée</span><strong>{b?.return_to_service_validated ? formatDate(b?.return_to_service_validated_at) : "Non validée"}</strong></div></div>
        {b?.return_to_service_validated && <div className="form-alert form-alert-success">La remise en service a été validée par le technicien.</div>}
        {b?.status === "not_repairable" && <div className="form-alert form-alert-error">Dossier classé non réparable. Ne pas remettre l’équipement en service.</div>}
      </div>

      {isAdmin && b ? <BreakdownUpdateForm
        id={id} initialStatus={b.status} initialPriority={b.priority}
        initialDiagnosis={b.root_cause || ""} initialResolution={b.resolution_summary || ""}
        canValidate initialMode={b.intervention_mode || "internal"}
        initialProvider={b.external_provider_name || ""}
        initialProviderReference={b.provider_reference || ""}
        initialDiagnosisDetails={b.diagnosis_details || ""}
        initialCorrectiveActions={b.corrective_actions || ""}
        initialPartsUsed={b.parts_used || ""} initialSafetyTests={b.safety_test_notes || ""}
        initialValidated={b.return_to_service_validated || false}
        initialCost={b.cost_amount} initialNotes={b.notes || ""}
      /> : <div className="security-note"><p>Consultation en lecture seule. La mise à jour et la validation de remise en service sont réservées à l’administrateur-technicien.</p></div>}
    </section>

    <section className="maintenance-list breakdown-history-panel">
      <div className="section-heading"><div><p className="eyebrow">TRAÇABILITÉ</p><h2>Historique du dossier</h2></div><span className="phase-tag">{events?.length || 0} événement(s)</span></div>
      {eventsError ? <div className="form-alert form-alert-error">Historique indisponible. Vérifie que la migration Étape 4 est appliquée : {eventsError.message}</div>
        : !events?.length ? <p className="empty-state">Aucun événement d’historique. Les prochaines modifications seront enregistrées après application de la migration de l’étape 4.</p>
        : <ol className="breakdown-timeline">{events.map((event: any) => <li key={event.id}><span className={`breakdown-timeline-dot event-${event.event_type}`}></span><div className="breakdown-timeline-content"><div className="breakdown-timeline-head"><strong>{eventLabels[event.event_type] || event.event_type}</strong><time>{formatDate(event.created_at)}</time></div><p>{event.summary}</p>{event.from_status && event.to_status && event.from_status !== event.to_status && <small>{statuses[event.from_status] || event.from_status} → {statuses[event.to_status] || event.to_status}</small>}</div></li>)}</ol>}
    </section>
    <footer className="footer"><span>GMP · Traçabilité des pannes biomédicales</span></footer>
  </main>;
}
