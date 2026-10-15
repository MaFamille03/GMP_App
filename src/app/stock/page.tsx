import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StockWorkspace } from "@/components/stock-workspace";

export default async function StockPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (!profile || profile.is_active === false) redirect("/access-disabled");

  const [{ data: parts, error: partsError }, { data: movements, error: movementsError }, { data: vendors }, { data: orders }] = await Promise.all([
    supabase.from("spare_parts").select("id,part_code,name,description,category,unit,stock_quantity,minimum_stock,unit_cost,supplier_id,storage_location,is_active,created_at").order("name").limit(2000),
    supabase.from("stock_movements").select("id,spare_part_id,movement_type,quantity,unit_cost,supplier_id,work_order_id,intervention_id,reference_number,notes,created_at,performed_by").order("created_at", { ascending: false }).limit(300),
    supabase.from("vendors").select("id,name").eq("is_active", true).order("name"),
    supabase.from("work_orders").select("id,work_order_number,title,equipment_id,status").not("status", "eq", "cancelled").order("created_at", { ascending: false }).limit(500),
  ]);

  return <main className="dashboard-shell">
    <header className="topbar"><Link className="brand" href="/dashboard"><div className="brand-mark">G</div><div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div></Link><Link className="secondary-button" href="/dashboard"><ArrowLeft size={15}/> Retour au tableau de bord</Link></header>
    <section className="dashboard-welcome"><p className="eyebrow">ÉTAPE 6 · STOCK BIOMÉDICAL</p><h1>Pièces détachées et consommables</h1><p>Suivre les quantités disponibles, tracer les entrées et sorties et rattacher les consommations aux ordres de travail.</p></section>
    {(partsError || movementsError) && <div className="form-alert form-alert-error">Le stock n’a pas pu être chargé. Applique la migration Supabase de l’étape 6. {(partsError || movementsError)?.message}</div>}
    <section className="maintenance-workspace"><div className="maintenance-workspace-heading"><div><Package size={22}/><div><h2>Gestion du stock</h2><p><ShieldCheck size={14}/> Accès en écriture réservé aux responsables biomédicaux et administrateurs.</p></div></div></div>
      <StockWorkspace initialParts={parts || []} initialMovements={movements || []} vendors={vendors || []} orders={orders || []} canManage={profile.role === "admin"}/>
    </section>
  </main>;
}
