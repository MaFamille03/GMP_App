import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  return <main className="auth-layout auth-layout-premium">
    <aside className="auth-side auth-side-premium">
      <div className="auth-brand-panel"><img className="auth-logo" src="/images/gmp-polyclinique-logo.jpg" alt="Logo officiel GMP Polyclinique" /></div>
      <div className="auth-service-label">Gestion du parc biomédical</div>
      <div className="auth-side-copy"><p className="eyebrow">ACCÈS RÉSERVÉ</p><h2>Un accès contrôlé au parc biomédical.</h2><p>Les comptes sont créés sur invitation de l’administrateur GMP.</p></div>
      <span className="auth-side-footer">Polyclinique Groupe Médical du Plateau</span>
    </aside>
    <section className="auth-main auth-main-premium"><div className="auth-card"><div className="auth-card-icon"><ShieldCheck size={23} /></div><p className="eyebrow">CRÉATION DE COMPTE</p><h1>Compte sur invitation</h1><p className="auth-intro">Pour garantir la confidentialité des informations de la polyclinique, l’inscription libre est désactivée. Demande à l’administrateur GMP de t’envoyer une invitation à ton adresse e-mail professionnelle.</p><Link href="/login" className="primary-button">Retour à la connexion</Link></div></section>
  </main>;
}
