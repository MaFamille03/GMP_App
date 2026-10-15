import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

export default function AccessDisabledPage() {
  return (
    <main className="auth-main">
      <section className="auth-card">
        <div className="auth-card-icon"><ShieldAlert size={23} /></div>
        <p className="eyebrow">ACCÈS SUSPENDU</p>
        <h1>Compte désactivé</h1>
        <p className="auth-intro">
          Ce compte n’est pas autorisé à accéder à l’application pour le moment.
          Contacte l’administrateur GMP si tu penses qu’il s’agit d’une erreur.
        </p>
        <div className="auth-actions-inline"><SignOutButton /><Link href="/" className="hero-secondary-link">Retour à l’accueil</Link></div>
      </section>
    </main>
  );
}
