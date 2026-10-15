import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="auth-layout">
      <div className="auth-side">
        <div className="auth-brand">
          <img className="auth-logo" src="/images/gmp-polyclinique-logo.jpg" alt="Logo officiel GMP Polyclinique" />
          <span className="auth-brand-tag">Gestion du parc biomédical</span>
        </div>
        <div className="auth-side-copy">
          <p className="eyebrow">ESPACE BIOMÉDICAL</p>
          <h2>Des équipements maîtrisés. Des soins mieux accompagnés.</h2>
          <p>Inventaire, maintenance, interventions et traçabilité technique réunis dans un même espace.</p>
        </div>
        <span className="auth-side-footer">Accès réservé aux utilisateurs autorisés.</span>
      </div>
      <section className="auth-main"><AuthForm mode="login" /></section>
    </main>
  );
}
