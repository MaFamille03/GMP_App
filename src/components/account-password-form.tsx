"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AccountPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError(`Modification impossible : ${updateError.message}`);
    else {
      setMessage("Mot de passe modifié avec succès.");
      setPassword("");
      setConfirmation("");
    }
    setBusy(false);
  }

  return <section className="account-password-panel">
    <div className="account-password-heading"><span><KeyRound size={18}/></span><div><h2>Sécurité du compte</h2><p>Modifie le mot de passe de ton compte GMP.</p></div></div>
    <form onSubmit={submit} className="account-password-form">
      <label>Nouveau mot de passe<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 caractères minimum" /></label>
      <label>Confirmer le nouveau mot de passe<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Saisis-le une seconde fois" /></label>
      {error && <div className="form-alert form-alert-error" role="alert">{error}</div>}
      {message && <div className="form-alert form-alert-success" role="status">{message}</div>}
      <button className="primary-button" type="submit" disabled={busy}>{busy ? "Modification…" : "Modifier le mot de passe"}</button>
    </form>
  </section>;
}
