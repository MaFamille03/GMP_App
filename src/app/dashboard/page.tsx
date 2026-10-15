import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight,
  CalendarClock, CheckCircle2, ClipboardList, FileBarChart2, LayoutDashboard,
  LifeBuoy, Package, Settings, ShieldCheck, Stethoscope, Users, Wrench,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AccountMenu } from "@/components/account-menu";
import { SignOutButton } from "@/components/sign-out-button";

const OPEN_BREAKDOWN_STATUSES = ["new", "to_qualify", "assigned", "in_progress", "waiting_parts", "waiting_provider", "awaiting_validation"];
const ACTIVE_ORDER_STATUSES = ["planned", "assigned", "in_progress", "waiting_parts", "waiting_provider", "awaiting_validation"];
const formatMoney = (value: number) => `${value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;
const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
const operationalStatusLabels: Record<string, string> = { functional: "Fonctionnel", functional_restricted: "Fonctionnement restreint", broken: "En panne", out_of_service: "Hors service", under_maintenance: "En maintenance", retired: "Retiré du parc" };
const operationalStatusClasses: Record<string, string> = { functional: "functional", functional_restricted: "restricted", broken: "broken", out_of_service: "out", under_maintenance: "maintenance", retired: "retired" };

const navItems = [
  { href: "/dashboard", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/equipment", label: "Parc biomédical", icon: Stethoscope },
  { href: "/breakdowns", label: "Pannes & interventions", icon: AlertTriangle },
  { href: "/maintenance", label: "Maintenance", icon: CalendarClock },
  { href: "/stock", label: "Pièces & stock", icon: Package },
  { href: "/movements", label: "Mouvements", icon: Package },
  { href: "/reports", label: "Rapports & statistiques", icon: FileBarChart2 },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("display_name,job_title,role,is_active").eq("id", user.id).maybeSingle();
  if (profile?.is_active === false) redirect("/access-disabled");

  const [{ data: equipment, error: equipmentError }, { data: breakdowns, error: breakdownError }, { data: orders, error: orderError }, { data: serviceRows, error: serviceError }] = await Promise.all([
    supabase.from("equipment").select("id,internal_code,designation,operational_status,criticality,next_maintenance_at,service_id,services(id,name)").order("designation").limit(3000),
    supabase.from("breakdowns").select("id,status,priority,reported_at,cost_amount,resolved_at,equipment_id").order("reported_at", { ascending: false }).limit(1000),
    supabase.from("work_orders").select("id,status,planned_start_at,next_due_date,estimated_cost,actual_cost,order_type").limit(2000),
    supabase.from("services").select("id,name,is_active").order("name").limit(100),
  ]);

  const loadError = equipmentError || breakdownError || orderError || serviceError;
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
  const criticalOpen = openBreakdowns.filter((item) => ["critical", "high"].includes(item.priority));
  const activeOrders = orderRows.filter((item) => ACTIVE_ORDER_STATUSES.includes(item.status));
  const overdueOrders = orderRows.filter((item) => item.next_due_date && item.next_due_date < todayKey && !["completed", "cancelled"].includes(item.status));
  const dueSoon = equipmentRows.filter((item) => item.next_maintenance_at && item.next_maintenance_at >= todayKey && item.next_maintenance_at <= sevenDayKey && item.operational_status !== "retired").length;
  const totalCosts = breakdownRows.reduce((sum, item) => sum + Number(item.cost_amount || 0), 0) + orderRows.reduce((sum, item) => sum + Number(item.actual_cost ?? item.estimated_cost ?? 0), 0);
  const displayName = profile?.display_name || user.user_metadata?.full_name || user.email || "Utilisateur";
  const jobTitle = profile?.job_title || user.user_metadata?.job_title || "Fonction non renseignée";
  const isAdmin = profile?.role === "admin";
  const accountEmail = user.email || "Adresse e-mail non renseignée";
  const serviceCounts = (serviceRows || []).map((service) => ({
    name: service.name,
    count: equipmentRows.filter((item: any) => Array.isArray(item.services) ? item.services.some((s: any) => s.name === service.name) : item.services?.name === service.name).length,
  })).filter((service) => service.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
  const recentBreakdowns = openBreakdowns.slice(0, 5);
  const statusLabels: Record<string, string> = {
    new: "Nouvelle", to_qualify: "À qualifier", assigned: "Affectée", in_progress: "En cours",
    waiting_parts: "Attente de pièces", waiting_provider: "Attente prestataire", awaiting_validation: "À vérifier",
  };
  const priorityLabels: Record<string, string> = { critical: "Critique", high: "Élevée", medium: "Normale", low: "Faible" };

  return (
    <div className="gmp-app-layout">
      <aside className="gmp-sidebar">
        <Link href="/dashboard" className="gmp-brand" aria-label="GMP Polyclinique — Vue d’ensemble">
          <span className="gmp-brand-logo"><Image src="/images/gmp-polyclinique-logo.png" alt="Logo GMP Polyclinique" width={384} height={178} priority /></span>
          <span className="gmp-brand-copy"><small>PARC BIOMÉDICAL</small></span>
        </Link>
        <div className="gmp-sidebar-label">ESPACE DE TRAVAIL</div>
        <nav className="gmp-nav" aria-label="Navigation principale">
          {navItems.map(({ href, label, icon: Icon }, index) => (
            <Link key={href} href={href} className={`gmp-nav-link ${index === 0 ? "is-active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{index === 2 && openBreakdowns.length > 0 ? <b>{openBreakdowns.length}</b> : null}
            </Link>
          ))}
        </nav>
        <div className="gmp-sidebar-spacer" />
        {isAdmin && <Link href="/users" className="gmp-nav-link"><Users size={18} strokeWidth={1.8}/><span>Utilisateurs</span></Link>}
        <Link href="/settings" className="gmp-nav-link"><Settings size={18} strokeWidth={1.8}/><span>Paramètres</span></Link>
        <div className="gmp-sidebar-help"><div className="gmp-help-icon"><LifeBuoy size={18}/></div><strong>Suivi du parc</strong><p>Centralisez les opérations et gardez une trace de chaque intervention.</p><Link href="/reports">Consulter les rapports <ArrowRight size={14}/></Link></div>
        <div className="gmp-sidebar-user">
          <div className="gmp-user-avatar">{displayName.trim().charAt(0).toUpperCase() || "G"}</div>
          <div className="gmp-user-info"><strong>{displayName}</strong><span>{isAdmin ? "Administrateur-technicien" : "Observateur"}</span></div>
          <SignOutButton compact />
        </div>
      </aside>

      <main className="gmp-main-content">
        <header className="gmp-topbar">
          <div><p className="gmp-breadcrumb">GMP <span>/</span> Vue d’ensemble</p><p className="gmp-topbar-subtitle">Polyclinique Groupe Médical du Plateau</p></div>
          <div className="gmp-topbar-actions"><span className="gmp-secure-indicator"><ShieldCheck size={15}/> Espace sécurisé</span><AccountMenu displayName={displayName} email={accountEmail} isAdmin={isAdmin} /></div>
        </header>

        <section className="gmp-page-intro">
          <div><p className="gmp-overline">PILOTAGE BIOMÉDICAL</p><h1>Vue d’ensemble</h1><p>Bonjour {displayName.split(" ")[0]}, voici la situation actuelle du parc et les opérations à suivre.</p></div>
          {isAdmin && <Link href="/equipment/new" className="gmp-primary-action"><span>+</span> Ajouter un équipement</Link>}
        </section>

        {!profile && <div className="form-alert form-alert-error">Le compte est connecté, mais sa fiche profil est introuvable. Vérifie les migrations Supabase.</div>}
        {loadError && <div className="form-alert form-alert-error">Certains indicateurs n’ont pas pu être chargés. Vérifie les migrations et les politiques RLS. {loadError.message}</div>}

        <section className="gmp-kpi-grid" aria-label="Indicateurs du parc">
          <article className="gmp-kpi-card"><div className="gmp-kpi-top"><span>Équipements recensés</span><span className="gmp-kpi-icon blue"><Stethoscope size={18}/></span></div><strong>{equipmentRows.length}</strong><div className="gmp-kpi-foot"><span>{functional} fonctionnels</span><span className="gmp-dot-separator"/><span>{unavailable} hors service</span></div></article>
          <article className="gmp-kpi-card"><div className="gmp-kpi-top"><span>Pannes ouvertes</span><span className="gmp-kpi-icon red"><AlertTriangle size={18}/></span></div><strong>{openBreakdowns.length}</strong><div className="gmp-kpi-foot"><span className={criticalOpen.length ? "gmp-text-danger" : ""}>{criticalOpen.length} priorité haute ou critique</span></div></article>
          <article className="gmp-kpi-card"><div className="gmp-kpi-top"><span>Maintenances actives</span><span className="gmp-kpi-icon amber"><Wrench size={18}/></span></div><strong>{activeOrders.length}</strong><div className="gmp-kpi-foot"><span>{overdueOrders.length} échéance(s) dépassée(s)</span></div></article>
          <article className="gmp-kpi-card"><div className="gmp-kpi-top"><span>À entretenir sous 7 jours</span><span className="gmp-kpi-icon green"><CalendarClock size={18}/></span></div><strong>{dueSoon}</strong><div className="gmp-kpi-foot"><span>Échéances préventives à venir</span></div></article>
        </section>

        <section className="gmp-main-grid">
          <article className="gmp-panel gmp-breakdowns-panel">
            <div className="gmp-panel-heading"><div><h2>Pannes à suivre</h2><p>Les dossiers ouverts nécessitant un suivi</p></div><Link href="/breakdowns" className="gmp-text-link">Voir toutes <ArrowRight size={15}/></Link></div>
            {recentBreakdowns.length ? <div className="gmp-table-wrap"><table className="gmp-data-table"><thead><tr><th>Dossier</th><th>Priorité</th><th>Statut</th><th>Signalée le</th></tr></thead><tbody>{recentBreakdowns.map((item) => <tr key={item.id}><td><Link href={`/breakdowns/${item.id}`} className="gmp-record-link">PAN-{item.id.slice(0, 6).toUpperCase()}</Link><small>{equipmentRows.find((eq: any) => eq.id === item.equipment_id)?.designation || "Équipement à identifier"}</small></td><td><span className={`gmp-priority ${item.priority === "critical" ? "critical" : item.priority === "high" ? "high" : "normal"}`}><i/>{priorityLabels[item.priority] || item.priority || "Normale"}</span></td><td><span className="gmp-status-label">{statusLabels[item.status] || item.status}</span></td><td className="gmp-date-cell">{item.reported_at ? formatDate(item.reported_at) : "—"}</td></tr>)}</tbody></table></div> : <div className="gmp-empty-state"><span><CheckCircle2 size={22}/></span><strong>Aucune panne ouverte</strong><p>Les dossiers actifs apparaîtront ici pour faciliter le suivi.</p></div>}
            <div className="gmp-panel-bottom"><span>{openBreakdowns.length} dossier(s) ouvert(s)</span><Link href="/breakdowns">Ouvrir le registre <ArrowRight size={14}/></Link></div>
          </article>

          <article className="gmp-panel gmp-availability-panel">
            <div className="gmp-panel-heading"><div><h2>Disponibilité du parc</h2><p>État opérationnel des équipements</p></div><Activity size={19} className="gmp-muted-icon"/></div>
            <div className="gmp-availability-number"><strong>{equipmentRows.length ? Math.round(functional / equipmentRows.length * 100) : 0}<small>%</small></strong><span>Taux de fonctionnement</span></div>
            <div className="gmp-progress-track"><span style={{ width: `${equipmentRows.length ? functional / equipmentRows.length * 100 : 0}%` }}/></div>
            <div className="gmp-legend-row"><span><i className="green"/> Fonctionnels</span><strong>{functional}</strong></div>
            <div className="gmp-legend-row"><span><i className="red"/> Hors service / indisponibles</span><strong>{unavailable}</strong></div>
            <div className="gmp-legend-row"><span><i className="gray"/> Autres statuts</span><strong>{Math.max(0, equipmentRows.length - functional - unavailable)}</strong></div>
            <div className="gmp-availability-note"><ShieldCheck size={16}/><span>Indicateur calculé à partir des statuts enregistrés dans l’inventaire.</span></div>
          </article>
        </section>

        <section className="gmp-lower-grid">
          <article className="gmp-panel"><div className="gmp-panel-heading"><div><h2>Répartition par service</h2><p>Équipements enregistrés dans les services</p></div><Link href="/equipment" className="gmp-icon-link" aria-label="Ouvrir l’inventaire"><ArrowUpRight size={17}/></Link></div>
            {serviceCounts.length ? <div className="gmp-service-list">{serviceCounts.map((service, index) => <div className="gmp-service-row" key={service.name}><span className={`gmp-service-marker marker-${index + 1}`}/><span className="gmp-service-name">{service.name}</span><div className="gmp-service-bar"><span style={{ width: `${Math.max(6, service.count / Math.max(...serviceCounts.map((s) => s.count)) * 100)}%` }}/></div><strong>{service.count}</strong></div>)}</div> : <div className="gmp-small-empty">Les statistiques par service s’afficheront après la saisie de l’inventaire.</div>}
          </article>
          <article className="gmp-panel gmp-actions-panel"><div className="gmp-panel-heading"><div><h2>Accès rapides</h2><p>Les tâches les plus courantes</p></div></div>
            <div className="gmp-quick-links">
              <Link href="/equipment" className="gmp-quick-link"><span className="gmp-quick-icon blue"><ClipboardList size={18}/></span><span><strong>Consulter l’inventaire</strong><small>Fiches et états des équipements</small></span><ArrowRight size={16}/></Link>
              {isAdmin && <Link href="/breakdowns/new" className="gmp-quick-link"><span className="gmp-quick-icon red"><AlertTriangle size={18}/></span><span><strong>Enregistrer une panne</strong><small>Créer un dossier de diagnostic</small></span><ArrowRight size={16}/></Link>}
              <Link href="/maintenance" className="gmp-quick-link"><span className="gmp-quick-icon amber"><CalendarClock size={18}/></span><span><strong>Suivre la maintenance</strong><small>Échéances et ordres de travail</small></span><ArrowRight size={16}/></Link>
              <Link href="/stock" className="gmp-quick-link"><span className="gmp-quick-icon green"><Package size={18}/></span><span><strong>Pièces détachées & stock</strong><small>Disponibilités et consommations</small></span><ArrowRight size={16}/></Link>
              <Link href="/reports" className="gmp-quick-link"><span className="gmp-quick-icon green"><FileBarChart2 size={18}/></span><span><strong>Consulter les rapports</strong><small>Bilans et données de suivi</small></span><ArrowRight size={16}/></Link>
            </div>
          </article>
        </section>

        <section className="gmp-service-overview">
          <div className="gmp-section-intro">
            <div><p className="gmp-overline">ORGANISATION DU PARC</p><h2>Équipements par service</h2><p>Consulte les appareils de chaque service et leur état opérationnel.</p></div>
            <Link href="/settings" className="gmp-text-link">Gérer les services <ArrowRight size={14}/></Link>
          </div>
          <div className="gmp-service-cards">
            {(serviceRows || []).filter((service: any) => service.is_active !== false).map((service: any, index: number) => {
              const serviceEquipment = equipmentRows.filter((item: any) => {
                const related = item.services;
                return item.service_id === service.id || (Array.isArray(related) ? related.some((row: any) => row.id === service.id || row.name === service.name) : related?.id === service.id || related?.name === service.name);
              });
              const counts = {
                functional: serviceEquipment.filter((item: any) => item.operational_status === "functional").length,
                broken: serviceEquipment.filter((item: any) => item.operational_status === "broken").length,
                out: serviceEquipment.filter((item: any) => item.operational_status === "out_of_service").length,
                maintenance: serviceEquipment.filter((item: any) => item.operational_status === "under_maintenance").length,
                restricted: serviceEquipment.filter((item: any) => item.operational_status === "functional_restricted").length,
                retired: serviceEquipment.filter((item: any) => item.operational_status === "retired").length,
              };
              return <details className="gmp-service-card" key={service.id} open={index === 0}>
                <summary className="gmp-service-card-summary">
                  <span className={`gmp-service-card-icon marker-${(index % 5) + 1}`}><Stethoscope size={19}/></span>
                  <span className="gmp-service-card-title"><strong>{service.name}</strong><small>{serviceEquipment.length} appareil(s) recensé(s)</small></span>
                  <span className="gmp-service-total">{serviceEquipment.length}</span>
                  <span className="gmp-service-expand"><ArrowRight size={15}/></span>
                </summary>
                <div className="gmp-service-status-grid">
                  <div className="gmp-service-status status-functional"><strong>{counts.functional}</strong><span>Fonctionnels</span></div>
                  <div className="gmp-service-status status-broken"><strong>{counts.broken}</strong><span>En panne</span></div>
                  <div className="gmp-service-status status-out"><strong>{counts.out}</strong><span>Hors service</span></div>
                  <div className="gmp-service-status status-maintenance"><strong>{counts.maintenance}</strong><span>En maintenance</span></div>
                </div>
                {(counts.restricted + counts.retired) > 0 && <p className="gmp-service-extra-status">{counts.restricted} en fonctionnement restreint · {counts.retired} retiré(s) du parc</p>}
                {serviceEquipment.length ? <div className="gmp-service-equipment-list"><div className="gmp-service-table-head"><span>Code</span><span>Équipement</span><span>État</span></div>{serviceEquipment.map((item: any) => <Link href={`/equipment/${item.id}`} className="gmp-service-equipment-row" key={item.id}><span>{item.internal_code || "—"}</span><strong>{item.designation}</strong><span className={`gmp-equipment-status-pill ${operationalStatusClasses[item.operational_status] || "out"}`}>{operationalStatusLabels[item.operational_status] || item.operational_status || "Non renseigné"}</span></Link>)}</div> : <p className="gmp-service-empty">Aucun appareil n’est encore affecté à ce service. Ajoute ou modifie un équipement dans l’inventaire pour le rattacher à ce service.</p>}
                <div className="gmp-service-card-footer"><Link href="/equipment">Ouvrir le parc biomédical <ArrowRight size={14}/></Link></div>
              </details>;
            })}
            {!(serviceRows || []).some((service: any) => service.is_active !== false) && <div className="gmp-service-empty gmp-service-empty-global">Aucun service actif n’est renseigné. Ajoute les services dans Paramètres pour organiser les appareils.</div>}
            {(() => { const assigned = new Set(equipmentRows.filter((item: any) => item.service_id || (Array.isArray(item.services) ? item.services.length > 0 : Boolean(item.services?.id))).map((item: any) => item.id)); const unassigned = equipmentRows.filter((item: any) => !assigned.has(item.id)); if (!unassigned.length) return null; return <details className="gmp-service-card gmp-service-unassigned"><summary className="gmp-service-card-summary"><span className="gmp-service-card-icon marker-5"><AlertTriangle size={19}/></span><span className="gmp-service-card-title"><strong>Service non renseigné</strong><small>{unassigned.length} appareil(s) à affecter</small></span><span className="gmp-service-total">{unassigned.length}</span><span className="gmp-service-expand"><ArrowRight size={15}/></span></summary><div className="gmp-service-equipment-list"><div className="gmp-service-table-head"><span>Code</span><span>Équipement</span><span>État</span></div>{unassigned.map((item: any) => <Link href={`/equipment/${item.id}`} className="gmp-service-equipment-row" key={item.id}><span>{item.internal_code || "—"}</span><strong>{item.designation}</strong><span className={`gmp-equipment-status-pill ${operationalStatusClasses[item.operational_status] || "out"}`}>{operationalStatusLabels[item.operational_status] || item.operational_status || "Non renseigné"}</span></Link>)}</div></details>; })()}
          </div>
        </section>

        <section className="gmp-summary-strip"><div className="gmp-summary-icon"><Activity size={19}/></div><div><strong>Suivi financier des opérations</strong><p>Montants cumulés renseignés dans les dossiers de panne et de maintenance.</p></div><strong className="gmp-summary-amount">{formatMoney(totalCosts)}</strong><Link href="/reports" className="gmp-summary-link">Détails <ArrowRight size={14}/></Link></section>
        <footer className="gmp-footer"><span>GMP · Gestion du parc biomédical</span><span><ShieldCheck size={13}/> Données visibles selon les droits du compte</span></footer>
      </main>
    </div>
  );
}
