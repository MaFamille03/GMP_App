import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, LayoutDashboard, Stethoscope, AlertTriangle, Wrench, Package, FileBarChart2, Settings, Users, LifeBuoy, ArrowRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AccountMenu } from "@/components/account-menu";
import { SignOutButton } from "@/components/sign-out-button";
import { GmpCalendar } from "@/components/gmp-calendar";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: initialDate } = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const [{ data: profile }, { data: equipment }, { data: breakdowns }, { data: workOrders }] = await Promise.all([
    supabase.from("profiles").select("display_name,job_title,role,is_active").eq("id", user.id).maybeSingle(),
    supabase.from("equipment").select("id,designation,next_maintenance_at,operational_status").neq("operational_status", "retired").limit(3000),
    supabase.from("breakdowns").select("id,breakdown_number,status,reported_at,resolved_at,equipment_id,symptom_description").order("reported_at", { ascending: false }).limit(2000),
    supabase.from("work_orders").select("id,work_order_number,title,status,order_type,planned_start_at,started_at,completed_at,next_due_date,equipment_id").order("created_at", { ascending: false }).limit(3000),
  ]);
  if (profile?.is_active === false) redirect("/access-disabled");
  const equipmentRows = equipment || [];
  const equipmentName = (id: string | null) => equipmentRows.find(item => item.id === id)?.designation || "Équipement non précisé";
  const events: { id: string; title: string; date: string; kind: "maintenance" | "breakdown" | "equipment" | "intervention"; href: string; detail?: string }[] = [];
  for (const item of equipmentRows) if (item.next_maintenance_at) events.push({ id: `equip-next-${item.id}`, title: `Maintenance préventive — ${item.designation}`, date: String(item.next_maintenance_at).slice(0,10), kind: "equipment", href: `/equipment/${item.id}`, detail: "Échéance préventive" });
  for (const item of breakdowns || []) {
    const title = `Panne PAN-${String(item.breakdown_number || item.id.slice(0,6)).toUpperCase()} — ${equipmentName(item.equipment_id)}`;
    if (item.reported_at) events.push({ id: `breakdown-reported-${item.id}`, title, date: String(item.reported_at).slice(0,10), kind: "breakdown", href: `/breakdowns/${item.id}`, detail: "Signalement" });
    if (item.resolved_at) events.push({ id: `breakdown-resolved-${item.id}`, title: `Résolution — ${equipmentName(item.equipment_id)}`, date: String(item.resolved_at).slice(0,10), kind: "breakdown", href: `/breakdowns/${item.id}`, detail: "Panne résolue" });
  }
  for (const item of workOrders || []) {
    if (item.planned_start_at) events.push({ id: `work-planned-${item.id}`, title: item.title || `Ordre de travail OT-${item.work_order_number}`, date: String(item.planned_start_at).slice(0,10), kind: item.order_type === "corrective" ? "intervention" : "maintenance", href: "/maintenance", detail: `${equipmentName(item.equipment_id)} · Planifié` });
    if (item.completed_at) events.push({ id: `work-completed-${item.id}`, title: `Terminé — ${item.title || `OT-${item.work_order_number}`}`, date: String(item.completed_at).slice(0,10), kind: "intervention", href: "/maintenance", detail: equipmentName(item.equipment_id) });
    if (item.next_due_date) events.push({ id: `work-due-${item.id}`, title: `Échéance — ${item.title || `OT-${item.work_order_number}`}`, date: String(item.next_due_date).slice(0,10), kind: "maintenance", href: "/maintenance", detail: equipmentName(item.equipment_id) });
  }
  const displayName = profile?.display_name || user.user_metadata?.full_name || user.email || "Utilisateur";
  const isAdmin = profile?.role === "admin";
  const navItems = [
    { href: "/dashboard", label: "Vue d’ensemble", icon: LayoutDashboard }, { href: "/equipment", label: "Parc biomédical", icon: Stethoscope }, { href: "/breakdowns", label: "Pannes & interventions", icon: AlertTriangle }, { href: "/maintenance", label: "Maintenance", icon: Wrench }, { href: "/calendar", label: "Calendrier", icon: CalendarDays }, { href: "/stock", label: "Pièces & stock", icon: Package }, { href: "/reports", label: "Rapports & statistiques", icon: FileBarChart2 },
  ];
  return <div className="gmp-app-layout"><aside className="gmp-sidebar"><Link href="/dashboard" className="gmp-brand" aria-label="GMP Polyclinique — Vue d’ensemble"><span className="gmp-brand-logo"><Image src="/images/gmp-polyclinique-logo.png" alt="Logo GMP Polyclinique" width={384} height={178} priority /></span><span className="gmp-brand-copy"><small>PARC BIOMÉDICAL</small></span></Link><div className="gmp-sidebar-label">ESPACE DE TRAVAIL</div><nav className="gmp-nav" aria-label="Navigation principale">{navItems.map(({ href,label,icon:Icon }) => <Link key={href} href={href} className={`gmp-nav-link ${href === "/calendar" ? "is-active" : ""}`}><Icon size={18} strokeWidth={1.8}/><span>{label}</span></Link>)}</nav><div className="gmp-sidebar-spacer"/>{isAdmin && <Link href="/users" className="gmp-nav-link"><Users size={18}/><span>Utilisateurs</span></Link>}<Link href="/settings" className="gmp-nav-link"><Settings size={18}/><span>Paramètres</span></Link><div className="gmp-sidebar-help"><div className="gmp-help-icon"><LifeBuoy size={18}/></div><strong>Suivi du parc</strong><p>Centralisez les opérations et gardez une trace de chaque intervention.</p><Link href="/reports">Consulter les rapports <ArrowRight size={14}/></Link></div><div className="gmp-sidebar-user"><div className="gmp-user-avatar">{displayName.trim().charAt(0).toUpperCase() || "G"}</div><div className="gmp-user-info"><strong>{displayName}</strong><span>{isAdmin ? "Administrateur-technicien" : "Observateur"}</span></div><SignOutButton compact/></div></aside><main className="gmp-main-content"><header className="gmp-topbar"><div><p className="gmp-breadcrumb">GMP <span>/</span> Calendrier</p><p className="gmp-topbar-subtitle">Polyclinique Groupe Médical du Plateau</p></div><div className="gmp-topbar-actions"><span className="gmp-secure-indicator"><ShieldCheck size={15}/> Espace sécurisé</span><AccountMenu displayName={displayName} email={user.email || "Adresse e-mail non renseignée"} isAdmin={isAdmin}/></div></header><GmpCalendar events={events} initialDate={initialDate}/><footer className="gmp-footer"><span>GMP · Gestion du parc biomédical</span><span><ShieldCheck size={13}/> Données visibles selon les droits du compte</span></footer></main></div>;
}
