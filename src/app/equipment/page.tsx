import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EquipmentInventory } from "@/components/equipment-inventory";

export default async function EquipmentPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const [{ data: profile }, { data: equipment, error }, { data: photos }] = await Promise.all([
    supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle(),
    supabase.from("equipment").select("id,internal_code,designation,brand,model,operational_status,criticality,complexity,data_verification,next_maintenance_at,services(name),locations(name)").order("designation").limit(2000),
    supabase.from("equipment_files").select("equipment_id,storage_path,created_at").eq("file_kind", "main_photo").order("created_at", { ascending: false }).limit(4000),
  ]);
  if (!profile || !profile.is_active) redirect("/access-disabled");
  const isAdmin = profile.role === "admin";
  const photoByEquipment = new Map<string, string>();
  const firstPhotoByEquipment = new Map<string, string>();
  for (const photo of photos || []) {
    if (!firstPhotoByEquipment.has(photo.equipment_id)) firstPhotoByEquipment.set(photo.equipment_id, photo.storage_path);
  }
  await Promise.all(Array.from(firstPhotoByEquipment.entries()).map(async ([equipmentId, path]) => {
    const { data } = await supabase.storage.from("gmp-equipment-files").createSignedUrl(path, 60 * 30);
    if (data?.signedUrl) photoByEquipment.set(equipmentId, data.signedUrl);
  }));
  const items = (equipment || []).map((item: any) => ({ ...item, photo_url: photoByEquipment.get(item.id) || null }));

  return <main className="dashboard-shell">
    <header className="topbar"><Link className="brand" href="/dashboard"><div className="brand-mark">G</div><div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div></Link><Link className="secondary-button" href="/dashboard">Retour au tableau de bord</Link></header>
    <section className="dashboard-welcome inventory-welcome"><p className="eyebrow">PARC BIOMÉDICAL</p><h1>Inventaire des équipements</h1><p>Registre central du matériel biomédical de la Polyclinique Groupe Médical du Plateau.</p></section>
    {error ? <div className="form-alert form-alert-error">Impossible de charger l’inventaire : {error.message}</div> : <EquipmentInventory items={items} isAdmin={isAdmin} />}
    <footer className="footer"><span>GMP · Parc biomédical</span><span>{isAdmin ? "Accès administrateur" : "Consultation en lecture seule"}</span></footer>
  </main>;
}
