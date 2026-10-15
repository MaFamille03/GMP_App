import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BreakdownList } from "@/components/breakdown-list";

export default async function BreakdownsPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const [{ data: profile }, { data: breakdowns, error }] = await Promise.all([
    supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle(),
    supabase.from("breakdowns").select("id,breakdown_number,reported_at,priority,status,symptom_description,equipment(internal_code,designation)").order("reported_at", { ascending: false }).limit(2000),
  ]);
  if (!profile || !profile.is_active) redirect("/access-disabled");

  return <main className="dashboard-shell">
    <header className="topbar"><Link className="brand" href="/dashboard"><div className="brand-mark">G</div><div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div></Link><Link className="secondary-button" href="/dashboard">Retour au tableau de bord</Link></header>
    <section className="dashboard-welcome"><p className="eyebrow">INCIDENTS BIOMÉDICAUX</p><h1>Gestion des pannes</h1><p>Du signalement initial à la vérification technique, chaque dossier conserve son historique et ses rapports.</p></section>
    {error ? <div className="form-alert form-alert-error">Impossible de charger les pannes : {error.message}</div> : <BreakdownList items={(breakdowns || []) as any} isAdmin={profile.role === "admin"} />}
    <footer className="footer"><span>GMP · Parc biomédical</span><span>{profile.role === "admin" ? "Administrateur-technicien" : "Consultation en lecture seule"}</span></footer>
  </main>;
}
