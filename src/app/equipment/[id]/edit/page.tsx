import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/access";
import { EquipmentEditForm } from "@/components/equipment-edit-form";

export default async function EditEquipmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; date?: string }> }) {
  const { id } = await params;
  const { from, date } = await searchParams;
  const calendarReturnHref = from === "calendar" ? `/calendar${date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `?date=${date}` : ""}` : null;
  const originQuery = from === "calendar" ? `?from=calendar${date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `&date=${date}` : ""}` : "";
  const { supabase } = await requireAdmin();
  const [{ data: equipment, error }, { data: services }, { data: locations }] = await Promise.all([
    supabase.from("equipment").select("id,internal_code,designation,brand,model,manufacturer,serial_number,service_id,location_id,operational_status,criticality,complexity,data_verification,verification_notes,acquisition_date,commissioning_date,acquisition_cost,theoretical_lifetime_years,next_maintenance_at,notes").eq("id", id).maybeSingle(),
    supabase.from("services").select("id,name").order("name"),
    supabase.from("locations").select("id,name").order("name"),
  ]);
  if (error) throw new Error(`Impossible de charger la fiche équipement : ${error.message}`);
  if (!equipment) notFound();
  return <main className="dashboard-shell"><header className="topbar"><Link className="brand" href="/dashboard"><div className="brand-mark">G</div><div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div></Link><div className="detail-header-actions">{calendarReturnHref && <Link className="secondary-button" href={calendarReturnHref}>← Retour au calendrier</Link>}<Link className="secondary-button" href={`/equipment/${id}${originQuery}`}>Retour à la fiche</Link></div></header><section className="dashboard-welcome form-welcome"><p className="eyebrow">PARC BIOMÉDICAL · MODIFICATION</p><h1>Modifier l’équipement</h1><p>Code interne : {equipment.internal_code}. Les changements seront conservés dans la fiche du parc.</p></section><EquipmentEditForm equipment={equipment} services={services || []} locations={locations || []}/></main>;
}
