import { Activity, BarChart3, ShieldCheck, Wrench } from "lucide-react";
import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="auth-layout auth-layout-premium login-reference-layout">
      <aside className="auth-side auth-side-premium login-reference-side">
        <div className="login-reference-brand">
          <img className="login-reference-logo" src="/images/gmp-polyclinique-logo.png" alt="Logo officiel GMP Polyclinique" />
          <span className="login-reference-brand-rule" />
          <p>Gestion du parc biomédical</p>
        </div>

        <div className="login-reference-copy">
          <h2>Un suivi biomédical fiable,<br /><span>au service des soins.</span></h2>
          <p>Centralisez les équipements, les maintenances et les interventions techniques dans un espace professionnel et sécurisé.</p>
        </div>

        <div className="login-reference-features" aria-label="Fonctionnalités GMP">
          <div className="login-reference-feature"><span className="login-feature-icon"><Activity size={22} /></span><div><strong>Parc d’équipements</strong><small>Inventaire complet et à jour</small></div></div>
          <div className="login-reference-feature"><span className="login-feature-icon blue"><Wrench size={22} /></span><div><strong>Maintenance et interventions</strong><small>Planification et suivi simplifiés</small></div></div>
          <div className="login-reference-feature"><span className="login-feature-icon"><BarChart3 size={22} /></span><div><strong>Rapports et traçabilité</strong><small>Pour une meilleure performance</small></div></div>
        </div>

        <div className="login-reference-secure"><ShieldCheck size={25} /><span>Accès réservé aux utilisateurs autorisés</span></div>
      </aside>
      <section className="auth-main auth-main-premium login-reference-main">
        <AuthForm mode="register" />
      </section>
    </main>
  );
}
