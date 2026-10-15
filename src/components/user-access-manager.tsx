"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type UserProfile = {
  id: string;
  display_name: string | null;
  job_title: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
};

export function UserAccessManager({ profiles, currentUserId }: { profiles: UserProfile[]; currentUserId: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteJob, setInviteJob] = useState("");
  const [inviting, setInviting] = useState(false);

  async function inviteUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setInviting(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, fullName: inviteName, jobTitle: inviteJob }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Invitation impossible.");
      setMessage(`Invitation envoyée à ${inviteEmail}. Le compte sera observateur à l'activation.`);
      setInviteEmail(""); setInviteName(""); setInviteJob("");
      router.refresh();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Une erreur est survenue pendant l'invitation.");
    } finally { setInviting(false); }
  }

  async function setActive(profile: UserProfile) {
    if (profile.id === currentUserId && profile.is_active) {
      setError("Tu ne peux pas désactiver ton propre compte depuis cette page.");
      return;
    }
    const action = profile.is_active ? "désactiver" : "réactiver";
    if (!window.confirm(`Confirmer : ${action} l'accès de ${profile.display_name || "cet utilisateur"} ?`)) return;
    setBusyId(profile.id); setError(""); setMessage("");
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_active: !profile.is_active, updated_at: new Date().toISOString() })
      .eq("id", profile.id);
    if (updateError) setError(`Modification impossible : ${updateError.message}`);
    else {
      setMessage(`Accès ${profile.is_active ? "désactivé" : "réactivé"} pour ${profile.display_name || "l'utilisateur"}.`);
      router.refresh();
    }
    setBusyId(null);
  }

  return <section className="maintenance-list">
    <div className="section-heading"><div><p className="eyebrow">CONTRÔLE DES ACCÈS</p><h2>Comptes utilisateurs ({profiles.length})</h2></div></div>
    <p className="muted-copy">Tous les comptes non administrateurs sont des observateurs en lecture seule. La fonction professionnelle déclarée ne change jamais les droits applicatifs. La désactivation bloque l'accès à l'application.</p>
    <form className="maintenance-form" onSubmit={inviteUser}>
      <h3>Inviter un observateur</h3>
      <p className="helper-text">Une invitation e-mail sera envoyée. Le compte ne pourra pas modifier les données du parc.</p>
      <label>Nom et prénom<input required value={inviteName} onChange={(event) => setInviteName(event.target.value)} maxLength={120} /></label>
      <label>Fonction au GMP<input required value={inviteJob} onChange={(event) => setInviteJob(event.target.value)} maxLength={120} placeholder="Ex. : Directeur médical" /></label>
      <label>Adresse e-mail<input required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} maxLength={254} /></label>
      <button className="primary-button" disabled={inviting}>{inviting ? "Envoi de l'invitation…" : "Envoyer l'invitation"}</button>
    </form>
    {error && <div className="form-alert form-alert-error" role="alert">{error}</div>}
    {message && <div className="form-alert form-alert-success" role="status">{message}</div>}
    {profiles.length === 0 ? <p className="empty-state">Aucun compte trouvé.</p> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Nom</th><th>Fonction</th><th>Accès</th><th>État du compte</th><th>Créé le</th><th>Action</th></tr></thead><tbody>{profiles.map((profile) => {
      const isAdmin = profile.role === "admin";
      return <tr key={profile.id}>
        <td><strong>{profile.display_name || "Nom non renseigné"}</strong>{profile.id === currentUserId && <><br/><span className="field-help">Ton compte</span></>}</td>
        <td>{profile.job_title || "Non renseignée"}</td>
        <td><span className={`role-pill ${isAdmin ? "role-pill-admin" : ""}`}>{isAdmin ? "Administrateur" : "Observateur"}</span></td>
        <td>{profile.is_active ? "Actif" : "Désactivé"}</td>
        <td>{new Date(profile.created_at).toLocaleDateString("fr-FR")}</td>
        <td>{isAdmin ? <span className="field-help">Rôle administrateur</span> : <button className={profile.is_active ? "text-danger-button" : "secondary-button"} disabled={busyId !== null} onClick={() => void setActive(profile)}>{busyId === profile.id ? "Mise à jour…" : profile.is_active ? "Désactiver" : "Réactiver"}</button>}</td>
      </tr>;
    })}</tbody></table></div>}
  </section>;
}
