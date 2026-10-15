"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/access";
const v = (f: FormData, k: string) => { const x=f.get(k); return typeof x === "string" ? x.trim() : ""; };
const opt = (f: FormData, k: string) => v(f,k) || null;
const ensure = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const refresh = (...paths: string[]) => paths.forEach((p)=>revalidatePath(p));

export async function updateSiteSettings(f: FormData) {
  const {supabase,user}=await requireAdmin(); const clinic_name=v(f,"clinic_name"), short_name=v(f,"short_name");
  ensure(clinic_name && short_name,"Le nom de la polyclinique et son sigle sont obligatoires.");
  const {error}=await supabase.from("site_settings").upsert({id:1,clinic_name,short_name,address:opt(f,"address"),phone:opt(f,"phone"),email:opt(f,"email"),website:opt(f,"website"),report_footer:opt(f,"report_footer"),updated_by:user.id},{onConflict:"id"});
  ensure(!error,`Enregistrement impossible : ${error?.message}`); refresh("/settings","/dashboard","/reports");
}
export async function createService(f: FormData) {
  const {supabase}=await requireAdmin(); const name=v(f,"name"); ensure(name,"Le nom du service est obligatoire.");
  const {error}=await supabase.from("services").insert({name,code:opt(f,"code"),description:opt(f,"description"),is_active:true}); ensure(!error,`Création du service impossible : ${error?.message}`); refresh("/settings","/equipment");
}
export async function createLocation(f: FormData) {
  const {supabase}=await requireAdmin(); const name=v(f,"name"); ensure(name,"Le nom de l'emplacement est obligatoire.");
  const {error}=await supabase.from("locations").insert({name,location_type:v(f,"location_type")||"room",parent_id:opt(f,"parent_id"),service_id:opt(f,"service_id"),description:opt(f,"description"),is_active:true}); ensure(!error,`Création de l'emplacement impossible : ${error?.message}`); refresh("/settings","/equipment");
}
export async function createCategory(f: FormData) {
  const {supabase}=await requireAdmin(); const name=v(f,"name"); ensure(name,"Le nom de la catégorie est obligatoire.");
  const {error}=await supabase.from("equipment_categories").insert({name,description:opt(f,"description"),is_active:true}); ensure(!error,`Création de la catégorie impossible : ${error?.message}`); refresh("/settings","/equipment");
}
export async function createVendor(f: FormData) {
  const {supabase}=await requireAdmin(); const name=v(f,"name"); ensure(name,"Le nom du prestataire est obligatoire.");
  const {error}=await supabase.from("vendors").insert({name,vendor_type:v(f,"vendor_type")||"maintenance_provider",contact_name:opt(f,"contact_name"),email:opt(f,"email"),phone:opt(f,"phone"),address:opt(f,"address"),notes:opt(f,"notes"),is_active:true}); ensure(!error,`Création du prestataire impossible : ${error?.message}`); refresh("/settings","/maintenance");
}
export async function setReferenceActive(f: FormData) {
  const {supabase}=await requireAdmin(); const kind=v(f,"kind") as "service" | "location" | "category" | "vendor", id=v(f,"id"), active=v(f,"active")==="true";
  ensure(["service", "location", "category", "vendor"].includes(kind) && id,"Référence invalide.");
  let error: { message: string } | null = null;
  if (kind === "service") ({ error } = await supabase.from("services").update({ is_active: active }).eq("id", id));
  else if (kind === "location") ({ error } = await supabase.from("locations").update({ is_active: active }).eq("id", id));
  else if (kind === "category") ({ error } = await supabase.from("equipment_categories").update({ is_active: active }).eq("id", id));
  else if (kind === "vendor") ({ error } = await supabase.from("vendors").update({ is_active: active }).eq("id", id));
  else throw new Error("Type de référence non autorisé.");
  ensure(!error,`Mise à jour impossible : ${error?.message}`); refresh("/settings","/equipment","/maintenance");
}


/** Updates an existing reference without deleting historical links to equipment or interventions. */
export async function updateReference(f: FormData) {
  const { supabase } = await requireAdmin();
  const kind = v(f, "kind");
  const id = v(f, "id");
  const name = v(f, "name");
  ensure(["service", "location", "category", "vendor"].includes(kind) && id, "Référence invalide.");
  ensure(name, "Le nom est obligatoire.");
  let error: { message: string } | null = null;
  if (kind === "service") {
    ({ error } = await supabase.from("services").update({ name, code: opt(f,"code"), description: opt(f,"description") }).eq("id", id));
  } else if (kind === "location") {
    ({ error } = await supabase.from("locations").update({ name, location_type: v(f,"location_type") || "room", description: opt(f,"description") }).eq("id", id));
  } else if (kind === "category") {
    ({ error } = await supabase.from("equipment_categories").update({ name, description: opt(f,"description") }).eq("id", id));
  } else if (kind === "vendor") {
    const vendorType = v(f,"vendor_type") || "other";
    ensure(["supplier", "maintenance_provider", "manufacturer", "other"].includes(vendorType), "Type de fournisseur invalide.");
    ({ error } = await supabase.from("vendors").update({ name, vendor_type: vendorType, contact_name: opt(f,"contact_name"), phone: opt(f,"phone"), email: opt(f,"email"), address: opt(f,"address"), notes: opt(f,"notes") }).eq("id", id));
  } else {
    throw new Error("Type de référence non autorisé.");
  }
  ensure(!error, `Modification impossible : ${error?.message}. Vérifie notamment que le nom ou le code n'est pas déjà utilisé.`);
  refresh("/settings", "/equipment", "/maintenance", "/stock", "/reports");
}
