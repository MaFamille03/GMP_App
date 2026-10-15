import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { EquipmentFilesManager } from "@/components/equipment-files-manager";

const statusLabels: Record<string, string> = {
  functional: "Fonctionnel", functional_restricted: "Fonctionnement restreint", broken: "En panne",
  under_maintenance: "En maintenance", out_of_service: "Hors service", retired: "Réformé",
};
const criticalityLabels: Record<string, string> = { critical: "Critique", high: "Élevée", normal: "Normale", low: "Faible" };
const complexityLabels: Record<string, string> = { simple: "Fonctionnement simple", complex: "Fonctionnement complexe" };
const verificationLabels: Record<string, string> = { confirmed: "Confirmé sur site", to_verify: "À vérifier physiquement", not_provided: "Informations non disponibles" };
const breakdownLabels: Record<string, string> = {
  new: "Nouvelle", to_qualify: "À qualifier", assigned: "Affectée", in_progress: "En cours",
  waiting_parts: "En attente de pièces", waiting_provider: "En attente du prestataire",
  awaiting_validation: "En attente de validation", resolved: "Résolue", closed: "Clôturée", not_repairable: "Non réparable",
};
const workOrderLabels: Record<string, string> = {
  planned: "Planifié", assigned: "Affecté", in_progress: "En cours", waiting_parts: "En attente de pièces",
  waiting_provider: "En attente du prestataire", awaiting_validation: "En attente de validation",
  completed: "Terminé", cancelled: "Annulé",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Non renseigné";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR");
}
function formatMoney(value: number | string | null | undefined) {
  if (value == null || value === "") return "Non renseigné";
  return `${Number(value).toLocaleString("fr-FR")} FCFA`;
}

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const [
    { data: equipment, error: equipmentError },
    { data: profile },
    { data: files },
    { data: breakdowns },
    { data: workOrders },
  ] = await Promise.all([
    supabase.from("equipment").select("*,services(name),locations(name),equipment_categories(name)").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle(),
    supabase.from("equipment_files").select("id,file_kind,storage_path,original_filename,content_type,caption,created_at").eq("equipment_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("breakdowns").select("id,breakdown_number,reported_at,priority,status,symptom_description,resolution_summary,cost_amount").eq("equipment_id", id).order("reported_at", { ascending: false }).limit(20),
    supabase.from("work_orders").select("id,work_order_number,order_type,status,title,planned_start_at,completed_at,next_due_date,actual_cost").eq("equipment_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  if (!profile || !profile.is_active) redirect("/access-disabled");
  if (!equipment && !equipmentError) notFound();

  let mainPhotoUrl: string | null = null;
  const mainPhoto = (files || []).find((file) => file.file_kind === "main_photo" && file.content_type?.startsWith("image/"));
  if (mainPhoto) {
    const { data } = await supabase.storage.from("gmp-equipment-files").createSignedUrl(mainPhoto.storage_path, 60 * 30);
    mainPhotoUrl = data?.signedUrl || null;
  }

  const isAdmin = profile.role === "admin";
  const e = equipment as any;
  const fields: [string, string][] = [
    ["Code d’inventaire", e?.internal_code],
    ["Désignation", e?.designation],
    ["Catégorie", e?.equipment_categories?.name],
    ["Marque", e?.brand],
    ["Modèle", e?.model],
    ["Fabricant", e?.manufacturer],
    ["Numéro de série", e?.serial_number],
    ["Service", e?.services?.name],
    ["Emplacement", e?.locations?.name],
    ["Complexité technique", complexityLabels[e?.complexity] || "À déterminer"],
    ["État opérationnel", statusLabels[e?.operational_status] || e?.operational_status],
    ["Criticité", criticalityLabels[e?.criticality] || e?.criticality],
    ["Vérification d’inventaire", verificationLabels[e?.data_verification] || e?.data_verification],
    ["Date d’acquisition", formatDate(e?.acquisition_date)],
    ["Mise en service", formatDate(e?.commissioning_date)],
    ["Coût d’acquisition", formatMoney(e?.acquisition_cost)],
    ["Durée de vie théorique", e?.theoretical_lifetime_years ? `${e.theoretical_lifetime_years} ans` : "Non renseigné"],
    ["Dernière maintenance", formatDate(e?.last_maintenance_at)],
    ["Prochaine maintenance", formatDate(e?.next_maintenance_at)],
  ];

  return (
    <main className="dashboard-shell equipment-detail-page">
      <header className="topbar">
        <Link className="brand" href="/dashboard"><div className="brand-mark">G</div><div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div></Link>
        <div className="detail-header-actions"><Link className="secondary-button" href="/equipment">Retour à l’inventaire</Link>{isAdmin && <Link className="primary-button" href={`/equipment/${id}/edit`}>Modifier la fiche</Link>}</div>
      </header>

      <section className="equipment-detail-hero">
        <div className="equipment-detail-visual">
          {mainPhotoUrl ? <img src={mainPhotoUrl} alt={`Photo de ${e?.designation || "l’équipement"}`} /> : <div className="equipment-detail-no-photo"><span>GMP</span><small>Photo principale non renseignée</small></div>}
        </div>
        <div className="equipment-detail-heading">
          <p className="eyebrow">FICHE TECHNIQUE · {e?.internal_code}</p>
          <h1>{e?.designation || "Fiche équipement"}</h1>
          <p>{[e?.brand, e?.model].filter(Boolean).join(" · ") || "Marque et modèle à renseigner"}</p>
          <div className="equipment-detail-badges">
            <span className={`status-badge status-${e?.operational_status === "functional" ? "functional" : ["broken", "out_of_service"].includes(e?.operational_status) ? "out" : e?.operational_status === "retired" ? "retired" : "maintenance"}`}>{statusLabels[e?.operational_status] || e?.operational_status}</span>
            <span className={`complexity-tag ${e?.complexity || "unclassified"}`}>{complexityLabels[e?.complexity] || "Complexité à déterminer"}</span>
            {e?.data_verification !== "confirmed" && <span className="verification-tag">Inventaire à vérifier</span>}
          </div>
          <div className="equipment-detail-quick-meta"><span><small>Service</small><strong>{e?.services?.name || "Non renseigné"}</strong></span><span><small>Emplacement</small><strong>{e?.locations?.name || "Non renseigné"}</strong></span></div>
          <div className="detail-actions">
            {isAdmin && <Link className="primary-button" href={`/breakdowns/new?equipment=${id}`}>Signaler une panne</Link>}
            {isAdmin && <Link className="secondary-button" href={`/maintenance?equipment=${id}`}>Planifier / suivre une maintenance</Link>}
            <Link className="secondary-button" href="/movements">Mouvements</Link><PrintButton/>
          </div>
        </div>
      </section>

      {equipmentError && <div className="form-alert form-alert-error">Lecture impossible : {equipmentError.message}</div>}
      <section className="maintenance-list">
        <div className="section-heading"><div><p className="eyebrow">IDENTIFICATION ET SUIVI</p><h2>Informations de la fiche</h2></div><span className="phase-tag">Dossier technique</span></div>
        <div className="detail-grid">{fields.map(([label, value]) => <div className="detail-field" key={label}><span>{label}</span><strong>{value || "Non renseigné"}</strong></div>)}</div>
        {e?.verification_notes && <div className="equipment-notes-block"><strong>Précisions sur la vérification</strong><p>{e.verification_notes}</p></div>}
        {e?.notes && <div className="equipment-notes-block"><strong>Notes et caractéristiques techniques</strong><p>{e.notes}</p></div>}
      </section>

      <section className="maintenance-list">
        <div className="section-heading"><div><p className="eyebrow">HISTORIQUE</p><h2>Pannes enregistrées</h2></div><span className="phase-tag">{(breakdowns || []).length} dossier(s)</span></div>
        {(breakdowns || []).length ? <div className="gmp-table-wrap"><table className="gmp-data-table"><thead><tr><th>Dossier</th><th>Date</th><th>Symptôme</th><th>Priorité</th><th>Statut</th></tr></thead><tbody>{breakdowns!.map((b: any) => <tr key={b.id}><td><Link className="gmp-record-link" href={`/breakdowns/${b.id}`}>PAN-{String(b.breakdown_number).padStart(5, "0")}</Link></td><td>{formatDate(b.reported_at)}</td><td>{b.symptom_description}</td><td>{criticalityLabels[b.priority] || b.priority}</td><td><span className="gmp-status-label">{breakdownLabels[b.status] || b.status}</span></td></tr>)}</tbody></table></div> : <p className="empty-state">Aucun dossier de panne enregistré pour cet équipement.</p>}
      </section>

      <section className="maintenance-list">
        <div className="section-heading"><div><p className="eyebrow">ENTRETIEN</p><h2>Ordres de maintenance</h2></div><span className="phase-tag">{(workOrders || []).length} opération(s)</span></div>
        {(workOrders || []).length ? <div className="gmp-table-wrap"><table className="gmp-data-table"><thead><tr><th>Ordre</th><th>Type</th><th>Opération</th><th>Statut</th><th>Échéance</th><th>Coût réel</th></tr></thead><tbody>{workOrders!.map((w: any) => <tr key={w.id}><td>OT-{String(w.work_order_number).padStart(5, "0")}</td><td>{w.order_type === "preventive" ? "Préventive" : w.order_type === "corrective" ? "Corrective" : w.order_type}</td><td>{w.title}</td><td><span className="gmp-status-label">{workOrderLabels[w.status] || w.status}</span></td><td>{formatDate(w.next_due_date || w.planned_start_at)}</td><td>{formatMoney(w.actual_cost)}</td></tr>)}</tbody></table></div> : <p className="empty-state">Aucun ordre de maintenance enregistré pour cet équipement.</p>}
      </section>

      <EquipmentFilesManager equipmentId={id} canManage={isAdmin}/>
      <footer className="gmp-footer"><span>GMP · Dossier technique de l’équipement</span><span>Consultation réservée aux comptes actifs</span></footer>
    </main>
  );
}
