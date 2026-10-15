import { redirect } from "next/navigation";
import { Activity, CalendarClock, ClipboardList, ShieldCheck, Wrench, FileBarChart2, ArrowLeftRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, job_title, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_active === false) {
    redirect("/access-disabled");
  }

  const displayName = profile?.display_name || user.user_metadata?.full_name || user.email || "Utilisateur";
  const jobTitle = profile?.job_title || user.user_metadata?.job_title || "Fonction non renseignée";
  const isAdmin = profile?.role === "admin";

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">G</div>
          <div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div>
        </div>
        <SignOutButton />
      </header>

      <section className="dashboard-welcome">
        <p className="eyebrow">ESPACE DE TRAVAIL</p>
        <h1>Bonjour, {displayName.split(" ")[0]}</h1>
        <p>Bienvenue dans l’espace de gestion du parc biomédical du Groupe Médical du Plateau.</p>
      </section>

      <section className="profile-summary">
        <div className="profile-avatar">{displayName.trim().charAt(0).toUpperCase() || "G"}</div>
        <div className="profile-data">
          <strong>{displayName}</strong>
          <span>{jobTitle}</span>
          <span className="profile-email">{user.email}</span>
        </div>
        <span className={`role-pill ${isAdmin ? "role-pill-admin" : ""}`}>
          {isAdmin ? "Administrateur" : "Utilisateur"}
        </span>
      </section>

      {!profile && (
        <div className="form-alert form-alert-error">
          Le compte est connecté, mais sa fiche profil n’a pas été trouvée. Vérifie que la migration SQL de l’étape 2 a bien été exécutée.
        </div>
      )}

      <div className="section-heading dashboard-heading">
        <div><p className="eyebrow">VUE GÉNÉRALE</p><h2>Modules prévus</h2></div>
        <span className="phase-tag">Étape 9 — Traçabilité</span>
      </div>

      <section className="pillar-grid">
        <Link href="/equipment" className="pillar-card dashboard-module-link">
          <div className="pillar-icon"><ClipboardList size={22} /></div>
          <h3>Inventaire biomédical</h3>
          <p>Registre des équipements, photos, fiches techniques et emplacements.</p>
          <span className="coming-soon">Ouvrir le registre ↗</span>
        </Link>
        <Link href="/breakdowns" className="pillar-card dashboard-module-link">
          <div className="pillar-icon"><Wrench size={22} /></div>
          <h3>Pannes et maintenance</h3>
          <p>Déclaration, affectation, interventions et validation de remise en service.</p>
          <span className="coming-soon">Ouvrir la gestion des pannes ↗</span>
        </Link>
        <Link href="/maintenance" className="pillar-card dashboard-module-link">
          <div className="pillar-icon"><CalendarClock size={22} /></div>
          <h3>Maintenance préventive</h3>
          <p>Plans périodiques, ordres de travail et suivi des échéances.</p>
          <span className="coming-soon">Ouvrir la maintenance ↗</span>
        </Link>
        <Link href="/movements" className="pillar-card dashboard-module-link">
          <div className="pillar-icon"><ArrowLeftRight size={22} /></div>
          <h3>Mouvements des équipements</h3>
          <p>Transferts entre services et emplacements, avec historique et motif de déplacement.</p>
          <span className="coming-soon">Ouvrir les mouvements ↗</span>
        </Link>
        <Link href="/reports" className="pillar-card dashboard-module-link">
          <div className="pillar-icon"><FileBarChart2 size={22} /></div>
          <h3>Rapports et indicateurs</h3>
          <p>État du parc, suivi des pannes, retards, coûts enregistrés et exports CSV pour Excel.</p>
          <span className="coming-soon">Ouvrir les rapports ↗</span>
        </Link>
      </section>

      <div className="security-note">
        <ShieldCheck size={19} />
        <p>
          <strong>Accès sécurisé.</strong> Ta fonction est déclarative. Les droits d’administration sont attribués séparément et ne peuvent pas être obtenus par auto-inscription.
        </p>
      </div>

      <footer className="footer">
        <span>GMP · Parc biomédical</span>
        <span>Connecté en tant que {isAdmin ? "administrateur" : "utilisateur"}</span>
      </footer>
    </main>
  );
}
