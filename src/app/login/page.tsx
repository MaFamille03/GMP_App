import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="auth-layout">
      <div className="auth-side">
        <div className="brand auth-brand">
          <img className="gmp-logo" src="/gmp-polyclinique-logo.jpg" alt="Logo officiel GMP Polyclinique" />
          <div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div>
        </div>
        <div className="auth-side-copy">
          <p className="eyebrow">GROUPE MÉDICAL DU PLATEAU</p>
          <h2>Un parc biomédical mieux suivi, pour des équipements mieux maîtrisés.</h2>
          <p>Inventaire, maintenance, interventions et traçabilité technique réunis dans un même espace.</p>
        </div>
        <span className="auth-side-footer">Accès réservé aux utilisateurs autorisés.</span>
      </div>
      <section className="auth-main"><AuthForm mode="login" /></section>
    </main>
  );
}
