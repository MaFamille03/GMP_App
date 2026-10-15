import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="auth-layout auth-layout-premium">
      <aside className="auth-side auth-side-premium">
        <div className="auth-brand-panel">
          <img className="auth-logo" src="/images/gmp-polyclinique-logo.jpg" alt="Logo officiel GMP Polyclinique" />
        </div>
        <div className="auth-service-label">Gestion du parc biomédical</div>
        <div className="auth-side-copy">
          <p className="eyebrow">CRÉATION DE COMPTE</p>
          <h2>Un suivi biomédical fiable, au service des soins.</h2>
          <p>Centralisez les équipements, les maintenances et les interventions techniques dans un espace professionnel.</p>
        </div>
        <span className="auth-side-footer">Accès réservé aux utilisateurs autorisés</span>
      </aside>
      <section className="auth-main auth-main-premium"><AuthForm mode="register" /></section>
    </main>
  );
}
