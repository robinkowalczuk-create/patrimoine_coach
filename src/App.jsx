import React from "react";
import { useState, useEffect } from "react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
const SUPABASE_URL = "https://paagozsbjjwznrbuytvr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYWdvenNiamp3em5yYnV5dHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjcxNzUsImV4cCI6MjA5MDcwMzE3NX0.WWQeWjDEq6r3HgSYRAtE8eXk34YQYXc5UZ07cvR_b1I";
const headers = {
 "Content-Type": "application/json",
 "apikey": SUPABASE_KEY,
 "Authorization": `Bearer ${SUPABASE_KEY}`,
};
async function fetchClients() {
 const res = await fetch(`${SUPABASE_URL}/rest/v1/clients?select=*`, { headers });
 if (!res.ok) throw new Error("Erreur chargement clients");
 return res.json();
}
async function insertClient(client) {
 const res = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
   method: "POST",
   headers: { ...headers, "Prefer": "return=representation" },
   body: JSON.stringify(client),
 });
 if (!res.ok) throw new Error("Erreur création client");
 return res.json();
}
async function updateClient(id, data) {
 const res = await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${id}`, {
   method: "PATCH",
   headers: { ...headers, "Prefer": "return=representation" },
   body: JSON.stringify(data),
 });
 if (!res.ok) throw new Error("Erreur mise à jour client");
 return res.json();
}
async function deleteClient(id) {
 const res = await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${id}`, {
   method: "DELETE",
   headers,
 });
 if (!res.ok) throw new Error("Erreur suppression client");
}
const COLORS = ["#C9A96E", "#7C9B8A", "#8B7BAB", "#E07A7A", "#6AAED4"];
const STATUTS = ["En bonne voie", "En avance", "À surveiller"];
const fmt = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const pct = (cur, target) => target > 0 ? Math.min(100, Math.round(((cur || 0) / target) * 100)) : 0;
const initials = (nom) => nom ? nom.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?";
const statutColors = {
 "En bonne voie": { bg: "#1A2F1F", text: "#5EBF7A", dot: "#5EBF7A" },
 "En avance": { bg: "#1A2A3F", text: "#5BA3E0", dot: "#5BA3E0" },
 "À surveiller": { bg: "#2F2010", text: "#E09A3A", dot: "#E09A3A" },
};
const EMPTY_FORM = { nom: "", age: "", objectif: "", patrimoine_actuel: "", patrimoine_cible: "", mensualite: "", statut: "En bonne voie", date_debut: "" };
export default function App() {
 const [clients, setClients] = useState([]);
 const [activeClient, setActiveClient] = useState(null);
 const [tab, setTab] = useState("dashboard");
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [showForm, setShowForm] = useState(false);
 const [editMode, setEditMode] = useState(false);
 const [form, setForm] = useState(EMPTY_FORM);
 const [saving, setSaving] = useState(false);
 const [newNote, setNewNote] = useState("");
 const [localNotes, setLocalNotes] = useState({});
 useEffect(() => { loadClients(); }, []);
 async function loadClients() {
   try {
     setLoading(true);
     setError(null);
     const data = await fetchClients();
     setClients(data);
     if (data.length > 0 && !activeClient) setActiveClient(data[0]);
     else if (data.length > 0 && activeClient) {
       const updated = data.find(c => c.id === activeClient.id);
       if (updated) setActiveClient(updated);
     } else if (data.length === 0) setActiveClient(null);
   } catch (e) {
     setError("Impossible de charger les clients. Vérifie les colonnes de ta table Supabase.");
   } finally {
     setLoading(false);
   }
 }
 const clientIndex = clients.findIndex(c => c.id === activeClient?.id);
 const color = COLORS[clientIndex >= 0 ? clientIndex % COLORS.length : 0];
 const progress = activeClient ? pct(activeClient.patrimoine_actuel, activeClient.patrimoine_cible) : 0;
 const s = activeClient ? (statutColors[activeClient.statut] || statutColors["En bonne voie"]) : statutColors["En bonne voie"];
 const clientNotes = activeClient ? (localNotes[activeClient.id] || []) : [];
 const sparkline = activeClient ? Array.from({ length: 8 }, (_, i) => ({
   mois: ["Sep", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr"][i],
   val: Math.round((activeClient.patrimoine_actuel || 0) * (0.55 + i * 0.07))
 })) : [];
 async function handleSaveClient() {
   if (!form.nom.trim()) return;
   setSaving(true);
   try {
     const payload = {
       nom: form.nom,
       age: parseInt(form.age) || null,
       objectif: form.objectif,
       patrimoine_actuel: parseFloat(form.patrimoine_actuel) || 0,
       patrimoine_cible: parseFloat(form.patrimoine_cible) || 0,
       mensualite: parseFloat(form.mensualite) || 0,
       statut: form.statut,
       date_debut: form.date_debut,
     };
     if (editMode && activeClient) await updateClient(activeClient.id, payload);
     else await insertClient(payload);
     await loadClients();
     setShowForm(false);
     setEditMode(false);
     setForm(EMPTY_FORM);
   } catch (e) {
     alert("Erreur : " + e.message);
   } finally {
     setSaving(false);
   }
 }
 async function handleDelete() {
   if (!activeClient || !window.confirm(`Supprimer ${activeClient.nom} ?`)) return;
   try {
     await deleteClient(activeClient.id);
     setActiveClient(null);
     await loadClients();
   } catch (e) { alert("Erreur : " + e.message); }
 }
 function openEdit() {
   if (!activeClient) return;
   setForm({ nom: activeClient.nom || "", age: activeClient.age || "", objectif: activeClient.objectif || "", patrimoine_actuel: activeClient.patrimoine_actuel || "", patrimoine_cible: activeClient.patrimoine_cible || "", mensualite: activeClient.mensualite || "", statut: activeClient.statut || "En bonne voie", date_debut: activeClient.date_debut || "" });
   setEditMode(true);
   setShowForm(true);
 }
 function addNote() {
   if (!newNote.trim() || !activeClient) return;
   const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
   setLocalNotes(prev => ({ ...prev, [activeClient.id]: [{ date: today, texte: newNote }, ...(prev[activeClient.id] || [])] }));
   setNewNote("");
 }
 return (
<div style={{ minHeight: "100vh", background: "#0D0D0D", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: "#E8E0D4", display: "flex" }}>
<style>{`
       @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@400;600&display=swap');
       *{box-sizing:border-box;margin:0;padding:0}
       ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
       .crow:hover{background:#1A1A1A!important}.tab-btn:hover{color:#E8E0D4!important}
       input,select,textarea{font-family:inherit}input:focus,select:focus,textarea:focus{outline:none}
     `}</style>
     {/* SIDEBAR */}
<div style={{ width: 260, background: "#111", borderRight: "1px solid #1E1E1E", display: "flex", flexDirection: "column", flexShrink: 0 }}>
<div style={{ padding: "28px 24px 20px", borderBottom: "1px solid #1E1E1E" }}>
<div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#555", textTransform: "uppercase", marginBottom: 4 }}>Patrimoine</div>
<div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#C9A96E" }}>Coach</div>
</div>
<div style={{ padding: "16px 12px", flex: 1, overflowY: "auto" }}>
<div style={{ fontSize: 10, letterSpacing: "0.15em", color: "#444", textTransform: "uppercase", padding: "0 12px", marginBottom: 10 }}>Mes clients</div>
         {loading && <div style={{ color: "#555", fontSize: 12, padding: 12 }}>Chargement...</div>}
         {error && <div style={{ color: "#E07A7A", fontSize: 11, padding: 12, lineHeight: 1.5 }}>{error}</div>}
         {!loading && !error && clients.length === 0 && <div style={{ color: "#444", fontSize: 12, padding: 12, lineHeight: 1.6 }}>Aucun client encore.<br />Ajoute ton premier client 👇</div>}
         {clients.map((c, idx) => {
           const active = activeClient?.id === c.id;
           const col = COLORS[idx % COLORS.length];
           const p = pct(c.patrimoine_actuel, c.patrimoine_cible);
           return (
<div key={c.id} className="crow" onClick={() => { setActiveClient(c); setTab("dashboard"); }}
               style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", marginBottom: 4, background: active ? "#1C1C1C" : "transparent", border: active ? `1px solid ${col}30` : "1px solid transparent", transition: "all 0.2s" }}>
<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
<div style={{ width: 32, height: 32, borderRadius: "50%", background: `${col}20`, border: `1.5px solid ${col}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: col, flexShrink: 0 }}>{initials(c.nom)}</div>
<div>
<div style={{ fontSize: 13, fontWeight: 500, color: active ? "#E8E0D4" : "#AAA" }}>{c.nom}</div>
<div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{c.age ? `${c.age} ans` : "—"}</div>
</div>
</div>
<div style={{ background: "#1A1A1A", borderRadius: 3, height: 3, overflow: "hidden" }}>
<div style={{ width: `${p}%`, height: "100%", background: col, borderRadius: 3 }} />
</div>
<div style={{ fontSize: 10, color: "#555", marginTop: 4, textAlign: "right" }}>{p}% de l'objectif</div>
</div>
           );
         })}
</div>
<div style={{ padding: 16, borderTop: "1px solid #1E1E1E" }}>
<button onClick={() => { setForm(EMPTY_FORM); setEditMode(false); setShowForm(true); }}
           style={{ width: "100%", padding: 10, background: "#C9A96E", border: "none", borderRadius: 8, cursor: "pointer", color: "#0D0D0D", fontSize: 12, fontWeight: 600 }}>
           + Nouveau client
</button>
<div style={{ fontSize: 10, color: "#444", marginTop: 10, textAlign: "center" }}>
           {clients.length} client{clients.length > 1 ? "s" : ""} · {fmt(clients.reduce((a, c) => a + (c.patrimoine_actuel || 0), 0))} gérés
</div>
</div>
</div>
     {/* MAIN */}
<div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
       {!activeClient ? (
<div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
<div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: "#333" }}>Bienvenue</div>
<div style={{ color: "#444", fontSize: 14 }}>Ajoute ton premier client pour commencer</div>
<button onClick={() => { setForm(EMPTY_FORM); setEditMode(false); setShowForm(true); }}
             style={{ padding: "12px 28px", background: "#C9A96E", border: "none", borderRadius: 8, cursor: "pointer", color: "#0D0D0D", fontSize: 13, fontWeight: 600 }}>
             + Ajouter un client
</button>
</div>
       ) : (
<>
           {/* Header */}
<div style={{ padding: "24px 32px", borderBottom: "1px solid #1A1A1A", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#0D0D0D", zIndex: 10 }}>
<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
<div style={{ width: 44, height: 44, borderRadius: "50%", background: `${color}15`, border: `2px solid ${color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color }}>{initials(activeClient.nom)}</div>
<div>
<div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20 }}>{activeClient.nom}</div>
<div style={{ fontSize: 12, color: "#555", marginTop: 1 }}>{activeClient.objectif || "Aucun objectif défini"}</div>
</div>
</div>
<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
<div style={{ padding: "6px 14px", borderRadius: 20, background: s.bg, color: s.text, fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
<div style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot }} />{activeClient.statut || "—"}
</div>
<button onClick={openEdit} style={{ padding: "6px 14px", background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 8, cursor: "pointer", color: "#888", fontSize: 11 }}>Modifier</button>
<button onClick={handleDelete} style={{ padding: "6px 14px", background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 8, cursor: "pointer", color: "#E07A7A", fontSize: 11 }}>Supprimer</button>
</div>
</div>
           {/* Tabs */}
<div style={{ padding: "0 32px", borderBottom: "1px solid #1A1A1A", display: "flex" }}>
             {[["dashboard", "Vue d'ensemble"], ["progression", "Progression"], ["notes", "Notes"]].map(([key, label]) => (
<button key={key} className="tab-btn" onClick={() => setTab(key)}
                 style={{ background: "none", border: "none", cursor: "pointer", padding: "16px 20px", fontSize: 12, fontWeight: 500, color: tab === key ? color : "#555", borderBottom: tab === key ? `2px solid ${color}` : "2px solid transparent", transition: "all 0.2s" }}>
                 {label}
</button>
             ))}
</div>
<div style={{ padding: "28px 32px", flex: 1 }}>
             {tab === "dashboard" && (
<div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
                   {[
                     { label: "Patrimoine actuel", val: fmt(activeClient.patrimoine_actuel), sub: `Depuis ${activeClient.date_debut || "—"}` },
                     { label: "Objectif", val: fmt(activeClient.patrimoine_cible), sub: "Cible finale" },
                     { label: "Mensualité", val: fmt(activeClient.mensualite), sub: "Épargne mensuelle" },
                   ].map((k, i) => (
<div key={i} style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: 14, padding: "20px 22px" }}>
<div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>{k.label}</div>
<div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, marginBottom: 4 }}>{k.val}</div>
<div style={{ fontSize: 11, color: "#444" }}>{k.sub}</div>
</div>
                   ))}
</div>
<div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
<div style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
<div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 20 }}>Progression</div>
<div style={{ position: "relative", width: 140, height: 140 }}>
<svg width="140" height="140" viewBox="0 0 140 140">
<circle cx="70" cy="70" r="58" fill="none" stroke="#1E1E1E" strokeWidth="10" />
<circle cx="70" cy="70" r="58" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
                           strokeDasharray={`${2 * Math.PI * 58}`}
                           strokeDashoffset={`${2 * Math.PI * 58 * (1 - progress / 100)}`}
                           transform="rotate(-90 70 70)" />
</svg>
<div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
<div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, color }}>{progress}%</div>
<div style={{ fontSize: 9, color: "#555", marginTop: 2 }}>atteint</div>
</div>
</div>
<div style={{ marginTop: 16, fontSize: 12, color: "#666", textAlign: "center" }}>
                       {fmt((activeClient.patrimoine_cible || 0) - (activeClient.patrimoine_actuel || 0))} restants
</div>
</div>
<div style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: 14, padding: 24 }}>
<div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 20 }}>Projection estimée</div>
<ResponsiveContainer width="100%" height={220}>
<AreaChart data={sparkline}>
<defs>
<linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
<stop offset="5%" stopColor={color} stopOpacity={0.3} />
<stop offset="95%" stopColor={color} stopOpacity={0} />
</linearGradient>
</defs>
<XAxis dataKey="mois" tick={{ fill: "#444", fontSize: 10 }} axisLine={false} tickLine={false} />
<YAxis tick={{ fill: "#444", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
<Tooltip contentStyle={{ background: "#1A1A1A", border: `1px solid ${color}40`, borderRadius: 8, fontSize: 12 }} formatter={v => [fmt(v), "Patrimoine"]} />
<Area type="monotone" dataKey="val" stroke={color} strokeWidth={2} fill="url(#grad)" dot={false} />
</AreaChart>
</ResponsiveContainer>
</div>
</div>
</div>
             )}
             {tab === "progression" && (
<div>
<div style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: 14, padding: 28, marginBottom: 16 }}>
<div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 24 }}>Trajectoire</div>
<ResponsiveContainer width="100%" height={260}>
<LineChart data={sparkline}>
<XAxis dataKey="mois" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
<YAxis tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k€`} />
<Tooltip contentStyle={{ background: "#1A1A1A", border: `1px solid ${color}40`, borderRadius: 8, fontSize: 12 }} formatter={v => [fmt(v), "Patrimoine"]} />
<Line type="monotone" dataKey="val" stroke={color} strokeWidth={2.5} dot={{ fill: color, r: 4 }} activeDot={{ r: 6 }} />
</LineChart>
</ResponsiveContainer>
</div>
<div style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: 14, padding: 28 }}>
<div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 20 }}>Jalons</div>
                   {[25, 50, 75, 100].map(p => {
                     const montant = Math.round((activeClient.patrimoine_cible || 0) * p / 100);
                     const atteint = (activeClient.patrimoine_actuel || 0) >= montant;
                     return (
<div key={p} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
<div style={{ width: 36, height: 36, borderRadius: "50%", background: atteint ? `${color}20` : "#1A1A1A", border: `2px solid ${atteint ? color : "#2A2A2A"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: atteint ? color : "#444", flexShrink: 0 }}>
                           {atteint ? "✓" : `${p}%`}
</div>
<div style={{ flex: 1 }}>
<div style={{ fontSize: 13, color: atteint ? "#E8E0D4" : "#555" }}>Atteindre {fmt(montant)}</div>
<div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{p}% de l'objectif</div>
</div>
                         {atteint && <div style={{ fontSize: 10, color, background: `${color}10`, padding: "3px 10px", borderRadius: 20 }}>Atteint ✓</div>}
</div>
                     );
                   })}
</div>
</div>
             )}
             {tab === "notes" && (
<div>
<div style={{ background: "#111", border: "1px solid #1E1E1E", borderRadius: 14, padding: 24, marginBottom: 16 }}>
<div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>Ajouter une note</div>
<textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                     placeholder="Résumé du rendez-vous, décision prise..."
                     style={{ width: "100%", minHeight: 90, background: "#0D0D0D", border: "1px solid #252525", borderRadius: 8, padding: "12px 14px", color: "#CCC", fontSize: 13, lineHeight: 1.6, resize: "none" }} />
<button onClick={addNote} style={{ marginTop: 10, padding: "10px 22px", background: color, border: "none", borderRadius: 8, cursor: "pointer", color: "#0D0D0D", fontSize: 12, fontWeight: 600 }}>Enregistrer</button>
</div>
<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                   {clientNotes.length === 0 && <div style={{ color: "#444", fontSize: 13, padding: "20px 0", textAlign: "center" }}>Aucune note pour ce client</div>}
                   {clientNotes.map((n, i) => (
<div key={i} style={{ background: "#111", border: "1px solid #1E1E1E", borderLeft: `3px solid ${color}60`, borderRadius: "0 12px 12px 0", padding: "18px 20px" }}>
<div style={{ fontSize: 10, color, marginBottom: 8 }}>{n.date}</div>
<div style={{ fontSize: 13, color: "#AAA", lineHeight: 1.6 }}>{n.texte}</div>
</div>
                   ))}
</div>
</div>
             )}
</div>
</>
       )}
</div>
     {/* MODAL */}
     {showForm && (
<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
<div style={{ background: "#111", border: "1px solid #252525", borderRadius: 16, padding: 32, width: 480, maxHeight: "90vh", overflowY: "auto" }}>
<div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, marginBottom: 24 }}>{editMode ? "Modifier le client" : "Nouveau client"}</div>
           {[
             { label: "Nom complet *", key: "nom", type: "text", placeholder: "Sophie Martin" },
             { label: "Âge", key: "age", type: "number", placeholder: "32" },
             { label: "Objectif financier", key: "objectif", type: "text", placeholder: "Retraite anticipée à 50 ans" },
             { label: "Patrimoine actuel (€)", key: "patrimoine_actuel", type: "number", placeholder: "28400" },
             { label: "Objectif cible (€)", key: "patrimoine_cible", type: "number", placeholder: "250000" },
             { label: "Mensualité (€)", key: "mensualite", type: "number", placeholder: "800" },
             { label: "Date de début", key: "date_debut", type: "text", placeholder: "Jan 2024" },
           ].map(field => (
<div key={field.key} style={{ marginBottom: 16 }}>
<div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>{field.label}</div>
<input type={field.type} placeholder={field.placeholder} value={form[field.key]}
                 onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                 style={{ width: "100%", background: "#0D0D0D", border: "1px solid #252525", borderRadius: 8, padding: "10px 12px", color: "#CCC", fontSize: 13 }} />
</div>
           ))}
<div style={{ marginBottom: 24 }}>
<div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>Statut</div>
<select value={form.statut} onChange={e => setForm(prev => ({ ...prev, statut: e.target.value }))}
               style={{ width: "100%", background: "#0D0D0D", border: "1px solid #252525", borderRadius: 8, padding: "10px 12px", color: "#CCC", fontSize: 13 }}>
               {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
</select>
</div>
<div style={{ display: "flex", gap: 10 }}>
<button onClick={handleSaveClient} disabled={saving}
               style={{ flex: 1, padding: 12, background: "#C9A96E", border: "none", borderRadius: 8, cursor: "pointer", color: "#0D0D0D", fontSize: 13, fontWeight: 600 }}>
               {saving ? "Enregistrement..." : "Enregistrer"}
</button>
<button onClick={() => { setShowForm(false); setEditMode(false); setForm(EMPTY_FORM); }}
               style={{ padding: "12px 20px", background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 8, cursor: "pointer", color: "#888", fontSize: 13 }}>
               Annuler
</button>
</div>
</div>
</div>
     )}
</div>
 );
}
