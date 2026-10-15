import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const statusLabels: Record<string, string> = { new: "Nouvelle", to_qualify: "À qualifier", assigned: "Affectée", in_progress: "En cours", waiting_parts: "En attente de pièces", waiting_provider: "Chez prestataire", resolved: "Résolue", closed: "Clôturée", not_repairable: "Non réparable" };
const priorityLabels: Record<string, string> = { critical: "Critique", high: "Élevée", normal: "Normale", low: "Faible" };

export default async function BreakdownsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const [{ data: profile }, { data: breakdowns, error }] = await Promise.all([
    supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle(),
    supabase.from("breakdowns").select("id,breakdown_number,reported_at,priority,status,symptom_description,equipment(internal_code,designation)").order("reported_at", { ascending: false }).limit(2000),
  ]);
  if (!profile || !profile.is_active) redirect("/access-disabled");
  const isAdmin = profile.role === "admin";

  return <main className="dashboard-shell">
    <header className="topbar"><Link className="brand" href="/dashboard"><div className="brand-mark">G</div><div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div></Link><Link className="secondary-button" href="/dashboard">Retour au tableau de bord</Link></header>
    <section className="dashboard-welcome"><p className="eyebrow">INCIDENTS BIOMÉDICAUX</p><h1>Suivi des pannes</h1><p>Consulte les signalements et leur état de traitement. La documentation des incidents est réservée à l’administrateur-technicien.</p></section>
    <section className="maintenance-list"><div className="section-heading"><div><p className="eyebrow">HISTORIQUE DES INCIDENTS</p><h2>Dossiers ({breakdowns?.length || 0})</h2></div>{isAdmin && <Link className="primary-button" href="/breakdowns/new">Déclarer une panne</Link>}</div>
      {error ? <div className="form-alert form-alert-error">Impossible de charger les pannes : {error.message}</div> : !breakdowns?.length ? <p className="empty-state">Aucun signalement enregistré pour le moment.</p> : <div className="table-scroll"><table className="data-table"><thead><tr><th>N° dossier</th><th>Date</th><th>Équipement</th><th>Symptômes</th><th>Priorité</th><th>Statut</th><th>Détail</th></tr></thead><tbody>{breakdowns.map((item: any) => <tr key={item.id}><td><strong>{item.breakdown_number || "—"}</strong></td><td>{new Date(item.reported_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td><td>{item.equipment?.internal_code || "—"}<br/><span className="field-help">{item.equipment?.designation || "Équipement non précisé"}</span></td><td>{item.symptom_description}</td><td><span className="role-pill">{priorityLabels[item.priority] || item.priority}</span></td><td>{statusLabels[item.status] || item.status}</td><td><Link className="secondary-button" href={`/breakdowns/${item.id}`}>Consulter</Link></td></tr>)}</tbody></table></div>}
    </section>
    <footer className="footer"><span>GMP · Parc biomédical</span><span>{isAdmin ? "Accès administrateur" : "Consultation en lecture seule"}</span></footer>
  </main>;
}
