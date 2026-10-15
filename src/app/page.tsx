import { redirect } from "next/navigation";
import Link from "next/link";
import { FileBarChart2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ReportsWorkspace } from "@/components/reports-workspace";

export default async function ReportsPage(){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("is_active").eq("id",user.id).maybeSingle();
 if(profile?.is_active===false)redirect("/access-disabled");
 const [{data:equipment,error:eqError},{data:breakdowns,error:breakError},{data:orders,error:ordersError},{data:interventions,error:interventionError}]=await Promise.all([
  supabase.from("equipment").select("id,internal_code,designation,operational_status,criticality,brand,model,serial_number,acquisition_date,acquisition_cost,next_maintenance_at,created_at").order("designation").limit(5000),
  supabase.from("breakdowns").select("id,breakdown_number,equipment_id,reported_at,symptom_description,priority,status,cost_amount,resolved_at").order("reported_at",{ascending:false}).limit(5000),
  supabase.from("work_orders").select("id,work_order_number,equipment_id,order_type,status,title,planned_start_at,completed_at,next_due_date,estimated_cost,actual_cost").order("created_at",{ascending:false}).limit(5000),
  supabase.from("interventions").select("id,work_order_id,performed_at,diagnosis,actions_taken,time_spent_minutes,labor_cost,external_cost").order("performed_at",{ascending:false}).limit(5000)
 ]);
 const loadError=eqError||breakError||ordersError||interventionError;
 return <main className="dashboard-shell"><header className="topbar"><Link className="brand" href="/dashboard"><div className="brand-mark">G</div><div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div></Link><Link className="secondary-button" href="/dashboard">Retour au tableau de bord</Link></header>
 <section className="dashboard-welcome"><p className="eyebrow">ÉTAPE 7 · PILOTAGE</p><h1>Rapports et indicateurs</h1><p>Vue synthétique de l’inventaire, des pannes, des échéances et des coûts enregistrés. Les exports sont disponibles au format CSV.</p></section>
 <section className="pillar-card report-intro"><div className="pillar-icon"><FileBarChart2 size={24}/></div><div><h3>Rapports opérationnels GMP</h3><p>Utilise les filtres de période, imprime le rapport ou exporte les tableaux pour Excel.</p></div></section>
 {loadError&&<div className="form-alert form-alert-error">Une partie des données n’a pas pu être chargée. Vérifie les migrations et les politiques RLS Supabase. {loadError.message}</div>}
 <ReportsWorkspace equipment={equipment||[]} breakdowns={breakdowns||[]} orders={orders||[]} interventions={interventions||[]}/>
 <footer className="footer"><span>GMP · Parc biomédical</span><span>Étape 7 — Rapports et indicateurs</span></footer></main>;
}
