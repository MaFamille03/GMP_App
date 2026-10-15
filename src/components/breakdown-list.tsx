"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type BreakdownItem = {
  id: string;
  breakdown_number: number;
  reported_at: string;
  priority: string;
  status: string;
  symptom_description: string;
  equipment: { internal_code: string; designation: string } | null;
};

const statusLabels: Record<string, string> = {
  new: "Nouvelle", to_qualify: "À qualifier", assigned: "Affectée", in_progress: "En cours",
  waiting_parts: "En attente de pièces", waiting_provider: "En attente du prestataire",
  resolved: "À vérifier", closed: "Clôturée", not_repairable: "Non réparable",
};
const priorityLabels: Record<string, string> = { critical: "Critique", high: "Élevée", normal: "Normale", low: "Faible" };

export function BreakdownList({ items, isAdmin }: { items: BreakdownItem[]; isAdmin: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("all");

  const filtered = useMemo(() => items.filter((item) => {
    const text = `${item.breakdown_number} ${item.symptom_description} ${item.equipment?.internal_code || ""} ${item.equipment?.designation || ""}`.toLowerCase();
    const matchesQuery = text.includes(query.trim().toLowerCase());
    const matchesStatus = status === "all" || (status === "open"
      ? !["closed", "not_repairable"].includes(item.status)
      : status === "resolved" ? item.status === "resolved" : item.status === status);
    const matchesPriority = priority === "all" || item.priority === priority;
    return matchesQuery && matchesStatus && matchesPriority;
  }), [items, query, status, priority]);

  const openCount = items.filter((item) => !["closed", "not_repairable"].includes(item.status)).length;
  const criticalCount = items.filter((item) => !["closed", "not_repairable"].includes(item.status) && ["critical", "high"].includes(item.priority)).length;
  const waitingProvider = items.filter((item) => item.status === "waiting_provider").length;
  const needsValidation = items.filter((item) => item.status === "resolved").length;

  return <div className="breakdown-workspace">
    <div className="breakdown-kpis">
      <article><span>Dossiers ouverts</span><strong>{openCount}</strong><small>Incidents non clôturés</small></article>
      <article className={criticalCount ? "breakdown-kpi-alert" : ""}><span>Priorité élevée / critique</span><strong>{criticalCount}</strong><small>À examiner en priorité</small></article>
      <article><span>Chez prestataire</span><strong>{waitingProvider}</strong><small>Suivi externe nécessaire</small></article>
      <article><span>À vérifier</span><strong>{needsValidation}</strong><small>Résolution à contrôler</small></article>
    </div>

    <section className="maintenance-list breakdown-list-panel">
      <div className="section-heading"><div><p className="eyebrow">REGISTRE DES INCIDENTS</p><h2>{filtered.length} dossier(s)</h2></div>{isAdmin && <Link className="primary-button" href="/breakdowns/new">+ Déclarer une panne</Link>}</div>
      <div className="breakdown-filters">
        <label>Recherche<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="N° dossier, équipement, symptôme…"/></label>
        <label>État du dossier<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="open">Dossiers ouverts</option><option value="all">Tous les dossiers</option><option value="new">Nouveaux</option><option value="to_qualify">À qualifier</option><option value="in_progress">En cours</option><option value="waiting_parts">En attente de pièces</option><option value="waiting_provider">En attente du prestataire</option><option value="resolved">Résolus — à vérifier</option><option value="closed">Clôturés</option><option value="not_repairable">Non réparables</option></select></label>
        <label>Priorité<select value={priority} onChange={(e) => setPriority(e.target.value)}><option value="all">Toutes les priorités</option><option value="critical">Critique</option><option value="high">Élevée</option><option value="normal">Normale</option><option value="low">Faible</option></select></label>
      </div>
      {filtered.length === 0 ? <p className="empty-state">Aucun dossier ne correspond à ces filtres.</p> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Dossier</th><th>Date</th><th>Équipement</th><th>Symptômes</th><th>Priorité</th><th>État</th><th></th></tr></thead><tbody>
        {filtered.map((item) => <tr key={item.id}>
          <td><Link className="breakdown-record-number" href={`/breakdowns/${item.id}`}>PAN-{String(item.breakdown_number).padStart(5, "0")}</Link></td>
          <td>{new Date(item.reported_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
          <td><strong>{item.equipment?.internal_code || "—"}</strong><span className="table-secondary-text">{item.equipment?.designation || "Équipement non précisé"}</span></td>
          <td className="breakdown-symptom-cell">{item.symptom_description}</td>
          <td><span className={`breakdown-priority priority-${item.priority}`}>{priorityLabels[item.priority] || item.priority}</span></td>
          <td><span className={`breakdown-status status-${item.status}`}>{statusLabels[item.status] || item.status}</span></td>
          <td><Link className="secondary-button" href={`/breakdowns/${item.id}`}>Ouvrir</Link></td>
        </tr>)}
      </tbody></table></div>}
      <div className="breakdown-list-footer">Les observateurs consultent les dossiers sans pouvoir les modifier. La clôture nécessite les contrôles et la validation du technicien GMP.</div>
    </section>
  </div>;
}
