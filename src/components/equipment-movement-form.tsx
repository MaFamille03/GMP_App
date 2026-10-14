"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Option = { id: string; name: string };
type Equipment = { id: string; internal_code: string; designation: string; service_id: string | null; location_id: string | null };

export function EquipmentMovementForm({ equipment, services, locations }: { equipment: Equipment[]; services: Option[]; locations: Option[] }) {
  const [equipmentId, setEquipmentId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!equipmentId || !reason.trim()) {
      setMessage({ ok: false, text: "Sélectionne un équipement et renseigne le motif." });
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("record_equipment_movement", {
      p_equipment_id: equipmentId,
      p_to_service_id: serviceId || null,
      p_to_location_id: locationId || null,
      p_reason: reason.trim(),
      p_notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) {
      setMessage({ ok: false, text: `Transfert non enregistré : ${error.message}` });
      return;
    }
    setMessage({ ok: true, text: "Transfert enregistré et fiche équipement mise à jour." });
    setEquipmentId(""); setServiceId(""); setLocationId(""); setReason(""); setNotes("");
    router.refresh();
  }

  return <form className="auth-form movement-form" onSubmit={submit}>
    <label>Équipement à déplacer
      <select required value={equipmentId} onChange={(e) => {
        const id = e.target.value; setEquipmentId(id);
        const item = equipment.find((row) => row.id === id);
        setServiceId(item?.service_id || ""); setLocationId(item?.location_id || "");
      }}>
        <option value="">Choisir un équipement</option>
        {equipment.map((item) => <option key={item.id} value={item.id}>{item.internal_code} — {item.designation}</option>)}
      </select>
    </label>
    <div className="movement-grid">
      <label>Nouveau service
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          <option value="">Non renseigné</option>
          {services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label>Nouvel emplacement
        <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">Non renseigné</option>
          {locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
    </div>
    <label>Motif du transfert
      <input required maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. : réorganisation du service, prêt temporaire…" />
    </label>
    <label>Observations
      <textarea rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="État au départ, accessoires remis, personne destinataire…" />
    </label>
    {message && <div className={`form-alert ${message.ok ? "form-alert-success" : "form-alert-error"}`} role="status">{message.text}</div>}
    <button className="primary-button" type="submit" disabled={busy || equipment.length === 0}>{busy ? "Enregistrement…" : "Enregistrer le transfert"}</button>
    {equipment.length === 0 && <p className="field-help">Aucun équipement disponible. Enregistre d’abord un équipement dans l’inventaire.</p>}
  </form>;
}
