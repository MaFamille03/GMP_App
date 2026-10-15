import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="auth-layout auth-layout-premium">
      <aside className="auth-side auth-side-premium">
        <div className="auth-brand-panel">
          <img className="auth-logo" src="/images/gmp-polyclinique-logo.jpg" alt="Logo officiel GMP Polyclinique" />
        </div>
        <div className="auth-service-label">Gestion du parc biomédical</div>
        <div className="auth-side-copy">
          <p className="eyebrow">ESPACE PROFESSIONNEL</p>
          <h2>La gestion biomédicale, claire et maîtrisée.</h2>
          <p>Inventaire, maintenance et traçabilité des équipements réunis dans un espace sécurisé.</p>
        </div>
        <span className="auth-side-footer">Accès réservé aux utilisateurs autorisés</span>
      </aside>
      <section className="auth-main auth-main-premium"><AuthForm mode="login" /></section>
    </main>
  );
}
