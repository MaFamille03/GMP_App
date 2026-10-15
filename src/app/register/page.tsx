import { AuthForm } from "@/components/auth-form";
import styles from "./register-page.module.css";

export default function RegisterPage() {
  return (
    <main className={`auth-layout auth-layout-premium ${styles.registerLayout}`}>
      <aside className={`auth-side auth-side-premium ${styles.registerSide}`}>
        <div className={`auth-brand-panel ${styles.brandPanel}`}>
          <img
            className={`auth-logo ${styles.logo}`}
            src="/images/gmp-polyclinique-logo.jpg"
            alt="GMP Polyclinique"
          />
        </div>

        <div className="auth-service-label">Gestion du parc biomédical</div>

        <div className={`auth-side-copy ${styles.sideCopy}`}>
          <p className="eyebrow">CRÉATION DE COMPTE</p>
          <h2>Un suivi biomédical fiable, au service des soins.</h2>
          <p>
            Centralisez les équipements, les maintenances et les interventions
            techniques dans un espace professionnel, clair et sécurisé.
          </p>
          <ul className={styles.featureList} aria-label="Fonctionnalités de la plateforme">
            <li><span aria-hidden="true">✓</span> Inventaire des équipements</li>
            <li><span aria-hidden="true">✓</span> Suivi des pannes et maintenances</li>
            <li><span aria-hidden="true">✓</span> Historique des interventions</li>
          </ul>
        </div>

        <span className={`auth-side-footer ${styles.sideFooter}`}>
          Accès réservé aux utilisateurs autorisés
        </span>
      </aside>

      <section className={`auth-main auth-main-premium ${styles.registerMain}`}>
        <div className={styles.formHeading}>
          <span className={styles.secureLabel}>ESPACE PROFESSIONNEL SÉCURISÉ</span>
          <AuthForm mode="register" />
          <p className={styles.privacyNote}>
            Les informations de compte sont utilisées pour identifier l’utilisateur
            au sein de la plateforme GMP.
          </p>
        </div>
      </section>
    </main>
  );
}
