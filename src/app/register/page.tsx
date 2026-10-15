import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="auth-layout">
      <div className="auth-side">
        <div className="auth-brand">
          <img className="auth-logo" src="/images/gmp-polyclinique-logo.jpg" alt="Logo officiel GMP Polyclinique" />
          <span className="auth-brand-tag">Gestion du parc biomédical</span>
        </div>
        <div className="auth-side-copy">
          <p className="eyebrow">CRÉATION DE COMPTE</p>
          <h2>Chaque utilisateur renseigne son identité et sa fonction.</h2>
          <p>Un espace dédié au suivi des équipements et à la continuité des opérations biomédicales.</p>
        </div>
        <span className="auth-side-footer">Les accès sont soumis aux règles de sécurité du GMP.</span>
      </div>
      <section className="auth-main"><AuthForm mode="register" /></section>
    </main>
  );
}
