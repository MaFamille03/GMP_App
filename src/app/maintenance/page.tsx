import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarClock, ClipboardCheck, Wrench, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MaintenanceWorkspace } from "@/components/maintenance-workspace";

export default async function MaintenancePage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (!profile || profile.is_active === false) redirect("/access-disabled");
  const isAdmin = profile.role === "admin";

  const [{ data: equipment }, { data: plans, error: plansError }, { data: orders, error: ordersError }, { data: profiles }, { data: interventions, error: interventionsError }, { data: vendors, error: vendorsError }] = await Promise.all([
    supabase.from("equipment").select("id,internal_code,designation,operational_status").order("designation"),
    supabase.from("maintenance_plans").select("id,name,description,interval_months,interval_days,is_active,equipment_id,category_id,provider_id,created_at").order("created_at", { ascending: false }),
    supabase.from("work_orders").select("id,work_order_number,equipment_id,order_type,status,title,planned_start_at,completed_at,next_due_date,estimated_cost,actual_cost,assigned_to,description,provider_id,maintenance_plan_id,validation_notes,validated_at").order("planned_start_at", { ascending: true, nullsFirst: false }).limit(100),
    supabase.from("profiles").select("id,display_name,job_title").eq("is_active", true).order("display_name"),
    supabase.from("interventions").select("id,work_order_id,performed_at,diagnosis,actions_taken,tests_and_results,outcome,time_spent_minutes,labor_cost,intervention_kind,performed_by").order("performed_at", { ascending: false }).limit(300),
    supabase.from("vendors").select("id,name,vendor_type,is_active").eq("is_active", true).in("vendor_type", ["maintenance_provider", "manufacturer", "other"]).order("name")
  ]);
  return <main className="dashboard-shell">
    <header className="topbar"><Link className="brand" href="/dashboard"><div className="brand-mark">G</div><div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div></Link><Link className="secondary-button" href="/dashboard">Retour au tableau de bord</Link></header>
    <section className="dashboard-welcome"><p className="eyebrow">ÉTAPE 5 · MAINTENANCE</p><h1>Gestion des maintenances et interventions</h1><p>Planifier les entretiens préventifs et correctifs, coordonner les prestataires, suivre les coûts et documenter la validation technique.</p></section>
    <section className="pillar-grid">
      <article className="pillar-card"><div className="pillar-icon"><CalendarClock size={22}/></div><h3>Plans d’entretien</h3><p>Définir une périodicité en jours ou en mois, par équipement.</p></article>
      <article className="pillar-card"><div className="pillar-icon"><ClipboardCheck size={22}/></div><h3>Ordres de travail</h3><p>Préparer et planifier les opérations préventives ou correctives.</p></article>
      <article className="pillar-card"><div className="pillar-icon"><AlertTriangle size={22}/></div><h3>Échéances</h3><p>Repérer les opérations en retard et celles à venir.</p></article>
    </section>
    {(plansError || ordersError || interventionsError || vendorsError) && <div className="form-alert form-alert-error">Impossible de charger une partie des données. Vérifie que la migration SQL de l’étape 1 est appliquée et que les politiques RLS autorisent la lecture. {plansError?.message || ordersError?.message || interventionsError?.message || vendorsError?.message}</div>}
    {isAdmin ? <MaintenanceWorkspace equipment={equipment || []} profiles={profiles || []} plans={plans || []} orders={orders || []} interventions={interventions || []} vendors={vendors || []}/> : <section className="maintenance-list"><div className="security-note"><p>Consultation en lecture seule. Seul l’administrateur-technicien peut créer ou modifier les plans, ordres de travail et comptes rendus.</p></div><h2>Plans de maintenance ({plans?.length || 0})</h2>{!plans?.length ? <p className="empty-state">Aucun plan enregistré.</p> : plans.map((plan: any) => <article className="maintenance-item" key={plan.id}><div className="maintenance-item-head"><strong>{plan.name}</strong><span className="status-pill">{plan.is_active ? "Actif" : "Suspendu"}</span></div><p>{equipment?.find((item: any) => item.id === plan.equipment_id)?.designation || "Équipement à préciser"} · Périodicité : {plan.interval_months ? `${plan.interval_months} mois` : `${plan.interval_days} jours`}</p>{plan.description && <p>{plan.description}</p>}</article>)}<h2>Ordres de travail ({orders?.length || 0})</h2>{!orders?.length ? <p className="empty-state">Aucun ordre de travail enregistré.</p> : orders.map((order: any) => <article className="maintenance-item" key={order.id}><div className="maintenance-item-head"><strong>OT-{String(order.work_order_number).padStart(5, "0")} · {order.title}</strong><span className="status-pill">{order.status}</span></div><p>{equipment?.find((item: any) => item.id === order.equipment_id)?.designation || "Équipement inconnu"}</p><p className="helper-text">Planifié : {order.planned_start_at ? new Date(order.planned_start_at).toLocaleDateString("fr-FR") : "Date à définir"}{order.next_due_date ? ` · Échéance : ${new Date(`${order.next_due_date}T12:00:00`).toLocaleDateString("fr-FR")}` : ""}</p></article>)}<h2>Comptes rendus récents ({interventions?.length || 0})</h2>{!interventions?.length ? <p className="empty-state">Aucun compte rendu enregistré.</p> : interventions.map((item: any) => <article className="maintenance-item" key={item.id}><strong>{new Date(item.performed_at).toLocaleString("fr-FR")} · {item.intervention_kind === "external" ? "Prestataire externe" : "Intervention interne"}</strong>{item.diagnosis && <p><b>Diagnostic :</b> {item.diagnosis}</p>}<p><b>Actions :</b> {item.actions_taken}</p>{item.tests_and_results && <p><b>Essais :</b> {item.tests_and_results}</p>}{item.outcome && <p><b>Résultat :</b> {item.outcome}</p>}</article>)}</section>}
    <footer className="footer"><span>GMP · Parc biomédical</span><span>Étape 5 — Maintenance</span></footer>
  </main>;
}
