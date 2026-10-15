"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Equipment = {
  id: string; internal_code: string; designation: string; brand: string | null; model: string | null;
  operational_status: string; criticality: string | null; next_maintenance_at: string | null;
  services: { name: string } | null; locations: { name: string } | null; photo_url: string | null;
};

const statusLabels: Record<string, string> = {
  functional: "Fonctionnel", functional_restricted: "Fonctionnement restreint", broken: "En panne",
  under_maintenance: "En maintenance", out_of_service: "Hors service", retired: "Réformé",
};
const statusClasses: Record<string, string> = {
  functional: "status-functional", functional_restricted: "status-restricted", broken: "status-broken",
  under_maintenance: "status-maintenance", out_of_service: "status-out", retired: "status-retired",
};

export function EquipmentInventory({ items, isAdmin }: { items: Equipment[]; isAdmin: boolean }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [service, setService] = useState("all");
  const services = useMemo(() => Array.from(new Set(items.map((item) => item.services?.name).filter((name): name is string => Boolean(name)))).sort((a, b) => a.localeCompare(b, "fr")), [items]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return items.filter((item) => {
      const matchesQuery = !needle || [item.internal_code, item.designation, item.brand, item.model, item.services?.name, item.locations?.name].some((value) => value?.toLocaleLowerCase("fr").includes(needle));
      return matchesQuery && (status === "all" || item.operational_status === status) && (service === "all" || item.services?.name === service);
    });
  }, [items, query, status, service]);
  const functionalCount = items.filter((item) => item.operational_status === "functional").length;
  const unavailableCount = items.filter((item) => ["broken", "out_of_service", "under_maintenance"].includes(item.operational_status)).length;

  function exportCsv() {
    const headers = ["Code interne", "Désignation", "Marque", "Modèle", "Service", "Emplacement", "État", "Criticité", "Prochaine maintenance"];
    const rows = filtered.map((item) => [item.internal_code, item.designation, item.brand || "", item.model || "", item.services?.name || "", item.locations?.name || "", statusLabels[item.operational_status] || item.operational_status, item.criticality || "", item.next_maintenance_at || ""]);
    const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(escape).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "inventaire_biomedical_gmp.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  return <>
    <section className="inventory-stats" aria-label="Résumé du parc">
      <article className="inventory-stat"><span>Équipements enregistrés</span><strong>{items.length}</strong><small>Ensemble du parc référencé</small></article>
      <article className="inventory-stat"><span>Fonctionnels</span><strong>{functionalCount}</strong><small>{items.length ? Math.round(functionalCount / items.length * 100) : 0}% du parc</small></article>
      <article className="inventory-stat"><span>Indisponibles ou en maintenance</span><strong>{unavailableCount}</strong><small>À surveiller en priorité</small></article>
    </section>
    <div className="inventory-toolbar">
      <label className="search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher code, appareil, marque…" aria-label="Rechercher un équipement" /></label>
      <label className="filter-field"><span>État</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tous les états</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="filter-field"><span>Service</span><select value={service} onChange={(event) => setService(event.target.value)}><option value="all">Tous les services</option>{services.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      <button className="secondary-button" type="button" onClick={exportCsv}>Exporter CSV</button>
      {isAdmin && <Link className="primary-button inventory-add" href="/equipment/new">Ajouter un équipement</Link>}
    </div>
    <p className="inventory-result-count">{filtered.length} résultat(s) affiché(s) sur {items.length} équipement(s).</p>
    {filtered.length === 0 ? <div className="empty-state"><div className="empty-state-icon">⌕</div><h3>Aucun équipement trouvé</h3><p>Modifie les critères de recherche ou les filtres. Si le parc est vide, ajoute une première fiche équipement.</p>{isAdmin && items.length === 0 && <Link className="primary-button" href="/equipment/new">Enregistrer un équipement</Link>}</div> : <div className="equipment-grid">{filtered.map((item) => <Link className="equipment-card" href={`/equipment/${item.id}`} key={item.id}>
      <div className="equipment-card-image">{item.photo_url ? <img src={item.photo_url} alt={`Photo de ${item.designation}`} loading="lazy" /> : <div className="equipment-image-placeholder"><span aria-hidden="true">▧</span><span>Photo non renseignée</span></div>}<span className={`status-badge ${statusClasses[item.operational_status] || "status-out"}`}>{statusLabels[item.operational_status] || item.operational_status}</span></div>
      <div className="equipment-card-body"><span className="equipment-code">{item.internal_code}</span><h3>{item.designation}</h3><p>{[item.brand, item.model].filter(Boolean).join(" · ") || "Marque et modèle non renseignés"}</p><div className="equipment-card-meta"><span>{item.services?.name || "Service non renseigné"}</span><span>{item.locations?.name || "Emplacement non renseigné"}</span></div><div className="equipment-card-footer"><span>{item.next_maintenance_at ? `Maintenance : ${item.next_maintenance_at}` : "Maintenance non planifiée"}</span><span>Voir la fiche →</span></div></div>
    </Link>)}</div>}
  </>;
}
