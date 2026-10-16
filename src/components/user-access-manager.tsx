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
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState("service_manager");
  const [selectedActive, setSelectedActive] = useState(true);
  const [savingAccess, setSavingAccess] = useState(false);

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

  function openAccessEditor(profile: UserProfile) {
    setEditingProfile(profile);
    setSelectedRole(profile.role === "admin" ? "admin" : profile.role === "biomedical_manager" ? "biomedical_manager" : "service_manager");
    setSelectedActive(profile.is_active);
    setError(""); setMessage("");
  }

  async function saveAccessChanges() {
    if (!editingProfile) return;
    if (editingProfile.id === currentUserId && (!selectedActive || selectedRole !== "admin")) {
      setError("Pour éviter de perdre l’accès administrateur, tu ne peux pas modifier ou désactiver ton propre compte ici.");
      return;
    }
    if (editingProfile.role === "admin" && editingProfile.id !== currentUserId && selectedRole !== "admin") {
      setError("Le rôle d’un autre administrateur ne peut pas être modifié depuis cette fenêtre.");
      return;
    }
    setSavingAccess(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: editingProfile.id, role: selectedRole, isActive: selectedActive }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Modification des accès impossible.");
      setMessage(`Accès mis à jour pour ${editingProfile.display_name || "l’utilisateur"}.`);
      setEditingProfile(null);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Une erreur est survenue.");
    } finally { setSavingAccess(false); }
  }

  return <section className="maintenance-list">
    <div className="section-heading"><div><p className="eyebrow">CONTRÔLE DES ACCÈS</p><h2>Comptes utilisateurs ({profiles.length})</h2></div></div>
    <p className="muted-copy">Choisis le niveau d’accès de chaque compte : lecture seule, modification des données du parc ou administration. Tu peux également désactiver puis réactiver un compte depuis la même fenêtre.</p>
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
    {profiles.length === 0 ? <p className="empty-state">Aucun compte trouvé.</p> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Nom</th><th>Fonction</th><th>Accès</th><th>État du compte</th><th>Créé le</th><th>Gestion des accès</th></tr></thead><tbody>{profiles.map((profile) => {
      const isAdmin = profile.role === "admin";
      return <tr key={profile.id}>
        <td><strong>{profile.display_name || "Nom non renseigné"}</strong>{profile.id === currentUserId && <><br/><span className="field-help">Ton compte</span></>}</td>
        <td>{profile.job_title || "Non renseignée"}</td>
        <td><span className={`role-pill ${isAdmin ? "role-pill-admin" : ""}`}>{isAdmin ? "Administrateur" : profile.role === "biomedical_manager" ? "Modification" : "Lecture seule"}</span></td>
        <td>{profile.is_active ? "Actif" : "Désactivé"}</td>
        <td>{new Date(profile.created_at).toLocaleDateString("fr-FR")}</td>
        <td>{isAdmin ? <span className="field-help">Compte protégé</span> : <button className="secondary-button user-access-open" disabled={busyId !== null} onClick={() => openAccessEditor(profile)}>{profile.is_active ? "Gérer les accès" : "Réactiver / gérer"}</button>}</td>
      </tr>;
    })}</tbody></table></div>}
    {editingProfile && <div className="user-access-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingAccess) setEditingProfile(null); }}>
      <section className="user-access-dialog" role="dialog" aria-modal="true" aria-labelledby="user-access-dialog-title">
        <div className="user-access-dialog-header"><div><p className="eyebrow">GESTION DES AUTORISATIONS</p><h2 id="user-access-dialog-title">{editingProfile.display_name || "Utilisateur"}</h2><p>{editingProfile.job_title || "Fonction non renseignée"}</p></div><button type="button" className="user-access-close" aria-label="Fermer" onClick={() => setEditingProfile(null)} disabled={savingAccess}>×</button></div>
        <div className="user-access-options"><label>Niveau d’accès<select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} disabled={editingProfile.id === currentUserId || savingAccess}><option value="service_manager">Lecture seule — consulter les informations</option><option value="biomedical_manager">Modification — gérer les données du parc</option></select><span className="field-help">La lecture seule permet de consulter les données sans les modifier. Le niveau Modification est destiné à une personne de confiance qui te remplace.</span></label>
        <div className="user-access-status"><div><strong>État du compte</strong><span>{selectedActive ? "Le compte peut se connecter à GMP." : "La connexion à GMP sera bloquée."}</span></div><label className="user-access-switch"><input type="checkbox" checked={selectedActive} onChange={(event) => setSelectedActive(event.target.checked)} disabled={editingProfile.id === currentUserId || savingAccess}/><span>{selectedActive ? "Actif" : "Désactivé"}</span></label></div></div>
        {error && <div className="form-alert form-alert-error" role="alert">{error}</div>}
        <div className="user-access-dialog-footer"><button type="button" className="secondary-button" onClick={() => setEditingProfile(null)} disabled={savingAccess}>Annuler</button><button type="button" className="primary-button" onClick={() => void saveAccessChanges()} disabled={savingAccess}>{savingAccess ? "Enregistrement…" : "Enregistrer les autorisations"}</button></div>
      </section>
    </div>}
  </section>;
}
