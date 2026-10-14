import Link from "next/link";
import { Activity, ClipboardList, HeartPulse, ShieldCheck, Wrench, ArrowRight } from "lucide-react";

const pillars = [
  {
    icon: ClipboardList,
    title: "Inventaire centralisé",
    text: "Une fiche unique par équipement, avec photo, caractéristiques, service et emplacement."
  },
  {
    icon: Wrench,
    title: "Pannes et maintenance",
    text: "Des workflows traçables pour les interventions internes et les prestataires externes."
  },
  {
    icon: Activity,
    title: "Suivi du cycle de vie",
    text: "Garanties, historique, indisponibilités, coûts et durée de vie estimée."
  }
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">G</div>
          <div><strong>GMP POLYCLINIQUE</strong><span>Gestion du parc biomédical</span></div>
        </div>
        <Link className="topbar-link" href="/login">Se connecter <ArrowRight size={15} /></Link>
      </header>

      <section className="hero">
        <div className="eyebrow"><HeartPulse size={16} /> GROUPE MÉDICAL DU PLATEAU</div>
        <h1>Le patrimoine biomédical,<br /><span>maîtrisé et traçable.</span></h1>
        <p className="hero-copy">
          Une plateforme centralisée pour identifier les équipements, suivre leur état,
          organiser les interventions et fiabiliser l’historique technique.
        </p>
        <div className="hero-actions">
          <Link className="primary-button hero-button" href="/login">Accéder à mon espace <ArrowRight size={18} /></Link>
          <Link className="hero-secondary-link" href="/register">Créer un compte</Link>
        </div>
        <div className="hero-note">
          <ShieldCheck size={20} />
          <div><strong>Accès contrôlé</strong><p>Chaque utilisateur renseigne son nom et sa fonction. Le rôle administrateur est attribué séparément.</p></div>
        </div>
      </section>

      <section className="section-heading">
        <div><p className="eyebrow">VISION DU PROJET</p><h2>Les piliers du parc biomédical</h2></div>
        <span className="phase-tag">Étape 2 / 9</span>
      </section>

      <section className="pillar-grid">
        {pillars.map(({ icon: Icon, title, text }) => (
          <article className="pillar-card" key={title}>
            <div className="pillar-icon"><Icon size={22} /></div>
            <h3>{title}</h3><p>{text}</p>
          </article>
        ))}
      </section>

      <footer className="footer"><span>GMP · Parc biomédical</span><span>Application interne · Version initiale</span></footer>
    </main>
  );
}
