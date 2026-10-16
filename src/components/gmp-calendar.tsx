"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, ArrowLeft } from "lucide-react";

type CalendarEvent = { id: string; title: string; date: string; kind: "maintenance" | "breakdown" | "equipment" | "intervention"; href: string; detail?: string };
const COLORS: Record<CalendarEvent["kind"], { label: string; color: string; soft: string }> = {
  maintenance: { label: "Maintenance", color: "#2877b7", soft: "#eaf4ff" },
  breakdown: { label: "Panne signalée / clôturée", color: "#c94d4d", soft: "#fff0f0" },
  equipment: { label: "Maintenance préventive", color: "#21865b", soft: "#e9f8f0" },
  intervention: { label: "Intervention", color: "#9a65bd", soft: "#f5edfb" },
};
const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateLabel = (value: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${value.slice(0,10)}T12:00:00`));

export function GmpCalendar({ events, initialDate }: { events: CalendarEvent[]; initialDate?: string }) {
  const [month, setMonth] = useState(() => { const parsed = initialDate ? new Date(`${initialDate.slice(0,10)}T12:00:00`) : new Date(); const d = Number.isNaN(parsed.getTime()) ? new Date() : parsed; return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(() => initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate.slice(0,10)) ? initialDate.slice(0,10) : dayKey(new Date()));
  const [filter, setFilter] = useState<"all" | CalendarEvent["kind"]>("all");
  const visibleEvents = useMemo(() => events.filter(e => filter === "all" || e.kind === filter), [events, filter]);
  const eventMap = useMemo(() => visibleEvents.reduce<Record<string, CalendarEvent[]>>((acc, e) => { const key = e.date.slice(0, 10); (acc[key] ||= []).push(e); return acc; }, {}), [visibleEvents]);
  const firstOffset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(firstOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  while (cells.length % 7) cells.push(null);
  const selectedEvents = (eventMap[selected] || []).slice().sort((a,b) => a.date.localeCompare(b.date));
  const eventHref = (event: CalendarEvent) => `${event.href}${event.href.includes("?") ? "&" : "?"}from=calendar&date=${encodeURIComponent(event.date.slice(0,10))}`;
  const today = dayKey(new Date());
  const goMonth = (step: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + step, 1));
  const changeMonth = (value: string) => { const [y,m] = value.split("-").map(Number); setMonth(new Date(y,m-1,1)); };
  return <div className="gmp-calendar-page">
    <div className="gmp-calendar-heading"><div><p className="gmp-overline">AGENDA BIOMÉDICA</p><h1>Calendrier des événements</h1><p>Retrouvez les opérations passées et à venir du parc biomédical, regroupées par date et par catégorie.</p></div><Link className="gmp-calendar-back" href="/dashboard"><ArrowLeft size={16}/> Retour à la vue d’ensemble</Link></div>
    <div className="gmp-calendar-legend">{Object.entries(COLORS).map(([key, meta]) => <button type="button" key={key} className={`gmp-calendar-filter ${filter === key ? "active" : ""}`} onClick={() => setFilter(filter === key ? "all" : key as CalendarEvent["kind"])}><i style={{ background: meta.color }}/>{meta.label}</button>)}<button type="button" className={`gmp-calendar-filter ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>Tous les événements</button></div>
    <div className="gmp-calendar-layout">
      <section className="gmp-calendar-month-panel">
        <div className="gmp-calendar-month-toolbar"><button type="button" aria-label="Mois précédent" onClick={() => goMonth(-1)}><ChevronLeft size={19}/></button><h2>{MONTHS[month.getMonth()]} {month.getFullYear()}</h2><button type="button" aria-label="Mois suivant" onClick={() => goMonth(1)}><ChevronRight size={19}/></button><button type="button" className="gmp-calendar-today" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(),d.getMonth(),1)); setSelected(dayKey(d)); }}>Aujourd’hui</button><input aria-label="Choisir un mois" type="month" value={`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}`} onChange={e => changeMonth(e.target.value)}/></div>
        <div className="gmp-calendar-grid gmp-calendar-weekdays">{DAYS.map(d => <div key={d}>{d}</div>)}</div>
        <div className="gmp-calendar-grid gmp-calendar-days">{cells.map((date, i) => { if (!date) return <div className="gmp-calendar-day empty" key={`empty-${i}`}/>; const key = dayKey(date); const dayEvents = eventMap[key] || []; return <button type="button" key={key} className={`gmp-calendar-day ${key === selected ? "selected" : ""} ${key === today ? "today" : ""}`} onClick={() => setSelected(key)}><span className="gmp-calendar-day-number">{date.getDate()}</span>{dayEvents.length > 0 && <span className="gmp-calendar-dots">{dayEvents.slice(0,4).map((e,j) => <i key={`${e.id}-${j}`} title={e.title} style={{ background: COLORS[e.kind].color }}/>)}</span>}<span className="gmp-calendar-day-count">{dayEvents.length ? `${dayEvents.length} év.` : ""}</span></button>; })}</div>
        <div className="gmp-calendar-month-foot"><span><i/> Aujourd’hui</span><span>{visibleEvents.length} événement(s) dans l’agenda</span></div>
      </section>
      <aside className="gmp-calendar-day-panel"><div className="gmp-calendar-day-heading"><CalendarDays size={19}/><div><h2>{dateLabel(selected)}</h2><p>{selectedEvents.length} événement(s) ce jour</p></div></div>{selectedEvents.length ? <div className="gmp-calendar-event-list">{selectedEvents.map((event) => <Link href={eventHref(event)} key={event.id} className="gmp-calendar-event"><span className="gmp-calendar-event-mark" style={{ background: COLORS[event.kind].color }}/><span className="gmp-calendar-event-copy"><strong>{event.title}</strong><span>{COLORS[event.kind].label}</span>{event.detail && <small>{event.detail}</small>}<small><Clock3 size={12}/> {dateLabel(event.date)}</small></span><ChevronRight size={16}/></Link>)}</div> : <div className="gmp-calendar-empty"><CalendarDays size={25}/><strong>Aucun événement à cette date</strong><p>Sélectionnez une date marquée d’un point de couleur pour consulter ses événements.</p></div>}</aside>
    </div>
    <section className="gmp-calendar-history"><div><h2>Événements passés et à venir</h2><p>Liste chronologique selon les données déjà enregistrées dans GMP.</p></div><div className="gmp-calendar-upcoming-list">{visibleEvents.slice().sort((a,b) => b.date.localeCompare(a.date)).map(event => <Link key={`history-${event.id}`} href={eventHref(event)} className="gmp-calendar-history-row"><span className="gmp-calendar-event-mark" style={{ background: COLORS[event.kind].color }}/><span><strong>{event.title}</strong><small>{COLORS[event.kind].label}{event.detail ? ` · ${event.detail}` : ""}</small></span><time>{dateLabel(event.date)}</time><ChevronRight size={15}/></Link>)}{visibleEvents.length === 0 && <p className="gmp-calendar-no-events">Aucun événement enregistré pour le filtre choisi.</p>}</div></section>
  </div>;
}
