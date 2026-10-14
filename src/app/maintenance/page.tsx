import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarClock, ClipboardCheck, Wrench, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MaintenanceWorkspace } from "@/components/maintenance-workspace";

export default async function MaintenancePage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", user.id).maybeSingle();
  if (profile?.is_active === false) redirect("/access-disabled");

  const [{ data: equipment }, { data: plans, error: plansError }, { data: orders, error: ordersError }, { data: profiles }, { data: interventions, error: interventionsError }] = await Promise.all([
    supabase.from("equipment").select("id,internal_code,designation,operational_status").order("designation"),
    supabase.from("maintenance_plans").select("id,name,description,interval_months,interval_days,is_active,equipment_id,category_id,created_at").order("created_at", { ascending: false }),
    supabase.from("work_orders").select("id,work_order_number,equipment_id,order_type,status,title,planned_start_at,completed_at,next_due_date,estimated_cost,actual_cost,assigned_to,description").order("planned_start_at", { ascending: true, nullsFirst: false }).limit(100),
    supabase.from("profiles").select("id,display_name,job_title").eq("is_active", true).order("display_name"),
    supabase.from("interventions").select("id,work_order_id,performed_at,diagnosis,actions_taken,tests_and_results,outcome,time_spent_minutes,labor_cost,intervention_kind,performed_by").order("performed_at", { ascending: false }).limit(300)
  ]);
  return <main className="dashboard-shell">
    <header className="topbar"><Link className="brand" href="/dashboard"><div className="brand-mark">G</div><div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div></Link><Link className="secondary-button" href="/dashboard">Retour au tableau de bord</Link></header>
    <section className="dashboard-welcome"><p className="eyebrow">ÉTAPE 6 · INTERVENTIONS</p><h1>Interventions, affectations et comptes rendus</h1><p>Affecter les ordres de travail, suivre leur statut et conserver les comptes rendus techniques des interventions.</p></section>
    <section className="pillar-grid">
      <article className="pillar-card"><div className="pillar-icon"><CalendarClock size={22}/></div><h3>Plans d’entretien</h3><p>Définir une périodicité en jours ou en mois, par équipement.</p></article>
      <article className="pillar-card"><div className="pillar-icon"><ClipboardCheck size={22}/></div><h3>Ordres de travail</h3><p>Préparer et planifier les opérations préventives ou correctives.</p></article>
      <article className="pillar-card"><div className="pillar-icon"><AlertTriangle size={22}/></div><h3>Échéances</h3><p>Repérer les opérations en retard et celles à venir.</p></article>
    </section>
    {(plansError || ordersError || interventionsError) && <div className="form-alert form-alert-error">Impossible de charger une partie des données. Vérifie que la migration SQL de l’étape 1 est appliquée et que les politiques RLS autorisent la lecture. {plansError?.message || ordersError?.message || interventionsError?.message}</div>}
    <MaintenanceWorkspace equipment={equipment || []} profiles={profiles || []} plans={plans || []} orders={orders || []} interventions={interventions || []}/>
    <footer className="footer"><span>GMP · Parc biomédical</span><span>Étape 6 — Interventions</span></footer>
  </main>;
}
