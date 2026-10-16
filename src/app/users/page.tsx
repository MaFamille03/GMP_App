import Link from "next/link";
import { requireAdministrator } from "@/lib/supabase/access";
import { UserAccessManager } from "@/components/user-access-manager";

export default async function UsersPage() {
  const { supabase, user } = await requireAdministrator();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id,display_name,job_title,role,is_active,created_at")
    .order("created_at", { ascending: false });

  return <main className="dashboard-shell">
    <header className="topbar"><Link className="brand" href="/dashboard"><div className="brand-mark">G</div><div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div></Link><Link className="secondary-button" href="/dashboard">Retour au tableau de bord</Link></header>
    <section className="dashboard-welcome"><p className="eyebrow">ADMINISTRATION</p><h1>Accès utilisateurs</h1><p>Consulte les comptes, leur fonction déclarée et leur état d’accès.</p></section>
    {error ? <div className="form-alert form-alert-error">Impossible de charger les comptes : {error.message}. Vérifie que la migration de l’étape 2 a été appliquée.</div> : <UserAccessManager profiles={profiles || []} currentUserId={user.id} />}
    <footer className="footer"><span>GMP · Parc biomédical</span><span>Gestion des accès</span></footer>
  </main>;
}
