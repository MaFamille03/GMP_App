import { redirect } from "next/navigation";
import { CalendarClock, ClipboardList, ShieldCheck, Wrench, FileBarChart2, ArrowLeftRight, Users, Activity, AlertTriangle, CheckCircle2, Clock3, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import Link from "next/link";

const OPEN_BREAKDOWN_STATUSES = ["new", "to_qualify", "assigned", "in_progress", "waiting_parts", "waiting_provider"];
const ACTIVE_ORDER_STATUSES = ["planned", "assigned", "in_progress", "waiting_parts", "waiting_provider", "awaiting_validation"];
const money = (value: number) => `${value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("display_name, job_title, role, is_active").eq("id", user.id).maybeSingle();
  if (profile?.is_active === false) redirect("/access-disabled");

  const [{ data: equipment, error: equipmentError }, { data: breakdowns, error: breakdownError }, { data: orders, error: orderError }] = await Promise.all([
    supabase.from("equipment").select("id,operational_status,criticality,next_maintenance_at"),
    supabase.from("breakdowns").select("id,status,priority,reported_at,cost_amount,resolved_at"),
    supabase.from("work_orders").select("id,status,planned_start_at,next_due_date,estimated_cost,actual_cost,order_type")
  ]);

  const loadError = equipmentError || breakdownError || orderError;
  const equipmentRows = equipment || [];
  const breakdownRows = breakdowns || [];
  const orderRows = orders || [];
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const inSevenDays = new Date(today);
  inSevenDays.setDate(inSevenDays.getDate() + 7);
  const sevenDayKey = inSevenDays.toISOString().slice(0, 10);
  const functional = equipmentRows.filter((item) => item.operational_status === "functional").length;
  const unavailable = equipmentRows.filter((item) => ["broken", "under_maintenance", "out_of_service"].includes(item.operational_status)).length;
  const openBreakdowns = breakdownRows.filter((item) => OPEN_BREAKDOWN_STATUSES.includes(item.status));
  const criticalOpenBreakdowns = openBreakdowns.filter((item) => ["critical", "high"].includes(item.priority));
  const activeOrders = orderRows.filter((item) => ACTIVE_ORDER_STATUSES.includes(item.status));
  const overdueOrders = orderRows.filter((item) => item.next_due_date && item.next_due_date < todayKey && !["completed", "cancelled"].includes(item.status));
  const dueSoon = equipmentRows.filter((item) => item.next_maintenance_at && item.next_maintenance_at >= todayKey && item.next_maintenance_at <= sevenDayKey && item.operational_status !== "retired").length;
  const totalCosts = breakdownRows.reduce((sum, item) => sum + Number(item.cost_amount || 0), 0) + orderRows.reduce((sum, item) => sum + Number(item.actual_cost ?? item.estimated_cost ?? 0), 0);
  const displayName = profile?.display_name || user.user_metadata?.full_name || user.email || "Utilisateur";
  const jobTitle = profile?.job_title || user.user_metadata?.job_title || "Fonction non renseignée";
  const isAdmin = profile?.role === "admin";

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark">G</div><div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div></div>
        <SignOutButton />
      </header>

      <section className="dashboard-welcome">
        <p className="eyebrow">TABLEAU DE BORD · PILOTAGE DU PARC</p>
        <h1>Bonjour, {displayName.split(" ")[0]}</h1>
        <p>Vue d’ensemble du parc biomédical, des pannes et des opérations de maintenance du Groupe Médical du Plateau.</p>
      </section>

      <section className="profile-summary">
        <div className="profile-avatar">{displayName.trim().charAt(0).toUpperCase() || "G"}</div>
        <div className="profile-data"><strong>{displayName}</strong><span>{jobTitle}</span><span className="profile-email">{user.email}</span></div>
        <span className={`role-pill ${isAdmin ? "role-pill-admin" : ""}`}>{isAdmin ? "Administrateur-technicien" : "Observateur"}</span>
      </section>

      {!profile && <div className="form-alert form-alert-error">Le compte est connecté, mais sa fiche profil n’a pas été trouvée. Vérifie les migrations et la configuration des profils.</div>}
      {loadError && <div className="form-alert form-alert-error">Les indicateurs n’ont pas tous pu être chargés. Vérifie les migrations Supabase et les politiques RLS. {loadError.message}</div>}

      <div className="section-heading dashboard-heading"><div><p className="eyebrow">INDICATEURS DU PARC</p><h2>Situation actuelle</h2></div><Link href="/reports" className="secondary-button">Voir les rapports</Link></div>
      <section className="report-kpis dashboard-kpis">
        <article><span><Activity size={16} /> Équipements recensés</span><strong>{equipmentRows.length}</strong><small>{functional} fonctionnels · {unavailable} indisponibles</small></article>
        <article><span><AlertTriangle size={16} /> Pannes ouvertes</span><strong>{openBreakdowns.length}</strong><small>{criticalOpenBreakdowns.length} prioritaires ou critiques</small></article>
        <article><span><Clock3 size={16} /> Ordres en cours</span><strong>{activeOrders.length}</strong><small>{overdueOrders.length} échéances dépassées</small></article>
        <article><span><CalendarClock size={16} /> Entretiens à venir</span><strong>{dueSoon}</strong><small>Maintenance prévue dans les 7 prochains jours</small></article>
      </section>
      <section className="dashboard-financial-strip"><div><span>Coûts enregistrés (cumul des montants saisis)</span><strong>{money(totalCosts)}</strong></div><div><span>Taux fonctionnel indicatif</span><strong>{equipmentRows.length ? `${Math.round((functional / equipmentRows.length) * 100)} %` : "—"}</strong></div><p>Indicateurs calculés à partir des données accessibles. Ils ne remplacent pas un inventaire vérifié ni une comptabilité exhaustive.</p></section>

      <div className="section-heading dashboard-heading"><div><p className="eyebrow">ACCÈS AUX MODULES</p><h2>Gestion du parc biomédical</h2></div><span className="phase-tag">{isAdmin ? "Accès administrateur" : "Lecture seule"}</span></div>
      <section className="pillar-grid">
        {isAdmin && <Link href="/users" className="pillar-card dashboard-module-link"><div className="pillar-icon"><Users size={22} /></div><h3>Accès utilisateurs</h3><p>Consulter les comptes et activer ou désactiver les accès observateurs.</p><span className="coming-soon">Gérer les accès ↗</span></Link>}
        <Link href="/settings" className="pillar-card dashboard-module-link"><div className="pillar-icon"><Settings size={22} /></div><h3>Paramètres</h3><p>Informations de la polyclinique, services, emplacements, catégories et prestataires.</p><span className="coming-soon">Configurer le site ↗</span></Link>
        <Link href="/equipment" className="pillar-card dashboard-module-link"><div className="pillar-icon"><ClipboardList size={22} /></div><h3>Inventaire biomédical</h3><p>Registre des équipements, photos, fiches techniques et emplacements.</p><span className="coming-soon">Ouvrir le registre ↗</span></Link>
        <Link href="/breakdowns" className="pillar-card dashboard-module-link"><div className="pillar-icon"><Wrench size={22} /></div><h3>Pannes et interventions</h3><p>Signalements, diagnostics, interventions internes ou externes et validation de remise en service.</p><span className="coming-soon">Ouvrir les pannes ↗</span></Link>
        <Link href="/maintenance" className="pillar-card dashboard-module-link"><div className="pillar-icon"><CalendarClock size={22} /></div><h3>Maintenance préventive</h3><p>Plans périodiques, ordres de travail et suivi des échéances.</p><span className="coming-soon">Ouvrir la maintenance ↗</span></Link>
        <Link href="/movements" className="pillar-card dashboard-module-link"><div className="pillar-icon"><ArrowLeftRight size={22} /></div><h3>Mouvements des équipements</h3><p>Transferts entre services et emplacements, avec historique et motif de déplacement.</p><span className="coming-soon">Ouvrir les mouvements ↗</span></Link>
        <Link href="/reports" className="pillar-card dashboard-module-link"><div className="pillar-icon"><FileBarChart2 size={22} /></div><h3>Rapports et indicateurs</h3><p>Exports d’inventaire, pannes, ordres de travail et coûts enregistrés pour Excel.</p><span className="coming-soon">Consulter les rapports ↗</span></Link>
      </section>

      <div className="security-note"><ShieldCheck size={19} /><p><strong>Accès sécurisé.</strong> La fonction déclarée dans le profil ne confère pas de droits d’administration. Les opérations de modification sont réservées au compte autorisé.</p></div>
      <footer className="footer"><span>GMP · Parc biomédical</span><span>GMP · Version cumulative — Étape 7</span></footer>
    </main>
  );
}
