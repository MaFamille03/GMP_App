import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EquipmentMovementForm } from "@/components/equipment-movement-form";

export default async function MovementsPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const [{ data: profile }, { data: equipment }, { data: services }, { data: locations }, { data: movements, error: movementError }] = await Promise.all([
    supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle(),
    supabase.from("equipment").select("id,internal_code,designation,service_id,location_id").order("designation"),
    supabase.from("services").select("id,name").eq("is_active", true).order("name"),
    supabase.from("locations").select("id,name").eq("is_active", true).order("name"),
    supabase.from("equipment_movements").select("id,equipment_id,from_service_id,to_service_id,from_location_id,to_location_id,moved_at,reason,notes,equipment(internal_code,designation),from_service:services!equipment_movements_from_service_id_fkey(name),to_service:services!equipment_movements_to_service_id_fkey(name),from_location:locations!equipment_movements_from_location_id_fkey(name),to_location:locations!equipment_movements_to_location_id_fkey(name)").order("moved_at", { ascending: false }).limit(100),
  ]);
  if (profile?.is_active === false) redirect("/access-disabled");

  const serviceName = (id: string | null) => services?.find((item) => item.id === id)?.name || "Non renseigné";
  const locationName = (id: string | null) => locations?.find((item) => item.id === id)?.name || "Non renseigné";

  return <main className="dashboard-shell">
    <header className="topbar"><Link className="brand" href="/dashboard"><div className="brand-mark">G</div><div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div></Link><Link className="secondary-button" href="/dashboard">Retour au tableau de bord</Link></header>
    <section className="dashboard-welcome"><p className="eyebrow">ÉTAPE 9 · TRAÇABILITÉ</p><h1>Mouvements des équipements</h1><p>Enregistre les changements de service ou d’emplacement et conserve l’historique des transferts.</p></section>
    {profile?.role === "admin" ? <section className="maintenance-list"><div className="section-heading"><div><p className="eyebrow">NOUVEAU TRANSFERT</p><h2>Déplacer un équipement</h2></div></div><EquipmentMovementForm equipment={equipment || []} services={services || []} locations={locations || []}/></section> : <div className="security-note"><p>Consultation de l’historique uniquement. Seul un administrateur habilité peut enregistrer un transfert.</p></div>}
    <section className="maintenance-list"><div className="section-heading"><div><p className="eyebrow">HISTORIQUE</p><h2>Derniers mouvements ({movements?.length || 0})</h2></div></div>
      {movementError ? <div className="form-alert form-alert-error">Impossible de charger l’historique : {movementError.message}. Vérifie les migrations et les autorisations Supabase.</div> : !movements?.length ? <p className="empty-state">Aucun mouvement enregistré pour le moment.</p> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Date</th><th>Équipement</th><th>Service</th><th>Emplacement</th><th>Motif / observations</th></tr></thead><tbody>{movements.map((m: any) => <tr key={m.id}><td>{new Date(m.moved_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td><td>{m.equipment?.internal_code || "—"}<br/><span className="field-help">{m.equipment?.designation || "Équipement"}</span></td><td>{m.from_service?.name || serviceName(m.from_service_id)} → {m.to_service?.name || serviceName(m.to_service_id)}</td><td>{m.from_location?.name || locationName(m.from_location_id)} → {m.to_location?.name || locationName(m.to_location_id)}</td><td><strong>{m.reason}</strong>{m.notes && <><br/><span className="field-help">{m.notes}</span></>}</td></tr>)}</tbody></table></div>}
    </section>
    <footer className="footer"><span>GMP · Parc biomédical</span><span>Traçabilité des mouvements</span></footer>
  </main>;
}
