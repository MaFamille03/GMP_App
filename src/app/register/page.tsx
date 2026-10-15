import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="auth-layout">
      <div className="auth-side">
        <div className="brand auth-brand">
          <img className="gmp-logo" src="/gmp-polyclinique-logo.jpg" alt="Logo officiel GMP Polyclinique" />
          <div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div>
        </div>
        <div className="auth-side-copy">
          <p className="eyebrow">CRÉATION DE COMPTE</p>
          <h2>Chaque utilisateur renseigne son identité et sa fonction.</h2>
          <p>Le statut administrateur reste réservé et n’est jamais accordé par le formulaire d’inscription.</p>
        </div>
        <span className="auth-side-footer">Les accès sont soumis aux règles de sécurité du GMP.</span>
      </div>
      <section className="auth-main"><AuthForm mode="register" /></section>
    </main>
  );
}
