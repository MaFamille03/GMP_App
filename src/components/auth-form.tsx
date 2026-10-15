"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase = createClient();

      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              job_title: jobTitle.trim()
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (error) throw error;

        if (data.session) {
          router.replace("/dashboard");
          router.refresh();
        } else {
          setSuccessMessage(
            "Inscription enregistrée. Consulte ta boîte e-mail pour confirmer ton adresse avant de te connecter."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        });

        if (error) throw error;
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
      const normalized = rawMessage.toLowerCase();
      if (normalized.includes("invalid api key") || normalized.includes("apikey")) {
        setErrorMessage("Connexion au service d’authentification impossible : la clé API Supabase est invalide. Dans Vercel → Settings → Environment Variables, vérifie NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY. Utilise la clé publique sb_publishable_… du même projet Supabase, jamais la clé secrète sb_secret_…. Puis redéploie l’application.");
      } else if (normalized.includes("invalid login credentials")) {
        setErrorMessage("Adresse e-mail ou mot de passe incorrect. Vérifie tes identifiants et réessaie.");
      } else if (normalized.includes("email not confirmed")) {
        setErrorMessage("Ton adresse e-mail n’a pas encore été confirmée. Consulte ta boîte de réception pour valider ton compte.");
      } else {
        setErrorMessage(rawMessage);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card-icon"><ShieldCheck size={23} /></div>
      <p className="eyebrow">{isRegister ? "CRÉER UN ACCÈS" : "ESPACE SÉCURISÉ"}</p>
      <h1>{isRegister ? "Créer son compte" : "Bon retour"}</h1>
      <p className="auth-intro">
        {isRegister
          ? "Renseigne ton identité et ta fonction au sein du GMP."
          : "Connecte-toi pour accéder à l’espace de gestion biomédicale."}
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        {isRegister && (
          <>
            <label>
              Nom et prénom
              <input
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ex. : Kouassi Jean"
                required
                maxLength={120}
              />
            </label>
            <label>
              Fonction au sein du GMP
              <input
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="Ex. : Technicien biomédical"
                required
                maxLength={120}
              />
              <span className="field-help">
                Cette fonction est déclarative : elle ne donne pas de droits d’administration.
              </span>
            </label>
          </>
        )}

        <label>
          Adresse e-mail
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nom@exemple.com"
            required
            maxLength={254}
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isRegister ? "8 caractères minimum" : "Ton mot de passe"}
            required
            minLength={8}
          />
        </label>

        {errorMessage && <div className="form-alert form-alert-error" role="alert">{errorMessage}</div>}
        {successMessage && <div className="form-alert form-alert-success" role="status">{successMessage}</div>}

        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? <LoaderCircle size={18} className="spin" /> : <>{isRegister ? "Créer mon compte" : "Se connecter"} <ArrowRight size={18} /></>}
        </button>
      </form>

      <p className="auth-switch">
        {isRegister ? "Tu as déjà un compte ?" : "Pas encore de compte ?"}{" "}
        <Link href={isRegister ? "/login" : "/register"}>
          {isRegister ? "Se connecter" : "Créer un compte"}
        </Link>
      </p>
    </div>
  );
}
