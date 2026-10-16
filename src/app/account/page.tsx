import Link from "next/link";
import { ArrowLeft, BadgeCheck, Building2, Mail, ShieldCheck, UserRound } from "lucide-react";
import { getCurrentAccess } from "@/lib/supabase/access";
import { AccountPasswordForm } from "@/components/account-password-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { supabase, user, profile, isAdmin } = await getCurrentAccess();
  const { data: account } = await supabase.from("profiles").select("display_name,job_title,role,is_active,service_id,services(name)").eq("id", user.id).maybeSingle();
  const serviceRelation = account?.services as { name?: string } | { name?: string }[] | null;
  const serviceName = Array.isArray(serviceRelation) ? serviceRelation[0]?.name : serviceRelation?.name;
  const displayName = account?.display_name || profile.display_name || user.user_metadata?.full_name || "Utilisateur";
  const roleLabel = isAdmin ? "Administrateur" : profile.role === "biomedical_manager" ? "Modification du parc" : "Lecture seule";

  return <main className="dashboard-shell account-page">
    <header className="topbar"><Link className="brand" href="/dashboard"><div className="brand-mark">G</div><div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div></Link><Link className="secondary-button" href="/dashboard"><ArrowLeft size={15}/> Retour au tableau de bord</Link></header>
    <section className="dashboard-welcome"><p className="eyebrow">ESPACE PERSONNEL</p><h1>Mon compte</h1><p>Consulte les informations associées à ta session GMP et les droits de ton compte.</p></section>
    <section className="account-profile-card">
      <div className="account-profile-heading"><div className="account-profile-avatar"><UserRound size={27}/></div><div><h2>{displayName}</h2><p>{user.email || "Adresse e-mail non renseignée"}</p></div><span className={`role-pill ${isAdmin ? "role-pill-admin" : ""}`}>{roleLabel}</span></div>
      <div className="account-detail-grid">
        <div className="account-detail"><span><UserRound size={15}/> Nom affiché</span><strong>{displayName}</strong></div>
        <div className="account-detail"><span><Mail size={15}/> Adresse e-mail</span><strong>{user.email || "Non renseignée"}</strong></div>
        <div className="account-detail"><span><BadgeCheck size={15}/> Fonction</span><strong>{account?.job_title || user.user_metadata?.job_title || "Non renseignée"}</strong></div>
        <div className="account-detail"><span><Building2 size={15}/> Service associé</span><strong>{serviceName || "Aucun service associé"}</strong></div>
        <div className="account-detail"><span><ShieldCheck size={15}/> Droits applicatifs</span><strong>{isAdmin ? "Gestion complète du parc et des accès" : profile.role === "biomedical_manager" ? "Consultation et modification des données du parc" : "Consultation en lecture seule"}</strong></div>
        <div className="account-detail"><span><ShieldCheck size={15}/> État du compte</span><strong>{account?.is_active ? "Actif" : "Désactivé"}</strong></div>
      </div>
      <div className="account-profile-note">Pour modifier les droits ou réactiver un compte, une opération administrateur contrôlée est nécessaire. La fonction professionnelle déclarée ne modifie pas les permissions.</div>
      <div className="account-profile-actions"><Link className="secondary-button" href="/settings">Paramètres de la polyclinique</Link>{isAdmin && <Link className="primary-button" href="/users">Gérer les utilisateurs</Link>}</div>
    </section>
    <AccountPasswordForm />
    <footer className="footer"><span>GMP · Parc biomédical</span><span>Informations du compte connecté</span></footer>
  </main>;
}
