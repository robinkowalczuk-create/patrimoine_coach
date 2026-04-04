import React, { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
 
const SB_URL = "https://paagozsbjjwznrbuytvr.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYWdvenNiamp3em5yYnV5dHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjcxNzUsImV4cCI6MjA5MDcwMzE3NX0.WWQeWjDEq6r3HgSYRAtE8eXk34YQYXc5UZ07cvR_b1I";
const H = { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` };
 
const sb = {
  get: async (table, query = "") => { const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, { headers: H }); if (!r.ok) throw new Error(await r.text()); return r.json(); },
  post: async (table, body) => { const r = await fetch(`${SB_URL}/rest/v1/${table}`, { method: "POST", headers: { ...H, "Prefer": "return=representation" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.json(); },
  patch: async (table, id, body) => { const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: { ...H, "Prefer": "return=representation" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(await r.text()); return r.json(); },
  del: async (table, id) => { const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: H }); if (!r.ok) throw new Error(await r.text()); },
};
 
const COLORS = ["#C9A96E", "#7C9B8A", "#8B7BAB", "#E07A7A", "#6AAED4", "#E0A03A"];
const CAT_COLORS = { "Épargne": "#7C9B8A", "Investissement": "#C9A96E", "Immobilier": "#8B7BAB", "Autre": "#888" };
const CATEGORIES = ["Épargne", "Investissement", "Immobilier", "Autre"];
const STATUTS = ["En bonne voie", "En avance", "À surveiller"];
const statutStyle = { "En bonne voie": { bg: "#1A2F1F", text: "#5EBF7A", dot: "#5EBF7A" }, "En avance": { bg: "#1A2A3F", text: "#5BA3E0", dot: "#5BA3E0" }, "À surveiller": { bg: "#2F2010", text: "#E09A3A", dot: "#E09A3A" } };
 
const fmt = n => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
const initials = n => n ? n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?";
const pct = (a, b) => b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0;
 
const EMPTY_CLIENT = { nom: "", age: "", objectif: "", patrimoine_cible: "", mensualite: "", statut: "En bonne voie", date_debut: "" };
const EMPTY_PRODUIT = { nom: "", categorie: "Épargne" };
const EMPTY_AVOIR = { montant: "", date: new Date().toISOString().split("T")[0] };
const EMPTY_OBJECTIF = { nom: "", montant_cible: "", description: "" };
const EMPTY_JALON = { nom: "", montant_cible: "", produit_lie: "", moyens: "" };
 
export default function App() {
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [produits, setProduits] = useState([]);
  const [avoirs, setAvoirs] = useState([]);
  const [objectifs, setObjectifs] = useState([]);
  const [jalons, setJalons] = useState([]);
  const [page, setPage] = useState("global");
  const [tab, setTab] = useState("synthese");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { type, data }
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
 
  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (activeClient) loadClientData(activeClient.id); }, [activeClient]);
 
  async function loadAll() {
    setLoading(true);
    try {
      const c = await sb.get("clients", "select=*&order=nom");
      setClients(c);
      if (c.length > 0 && !activeClient) setActiveClient(c[0]);
    } catch (e) { console.error(e); }
    setLoading(false);
  }
 
  async function loadClientData(cid) {
    try {
      const [p, a, o, j] = await Promise.all([
        sb.get("produits", `select=*&client_id=eq.${cid}`),
        sb.get("avoirs", `select=*&client_id=eq.${cid}&order=date`),
        sb.get("objectifs", `select=*&client_id=eq.${cid}`),
        sb.get("jalons", `select=*&objectif_id=in.(${(await sb.get("objectifs", `select=id&client_id=eq.${cid}`)).map(o => o.id).join(",") || "0"})`),
      ]);
      setProduits(p); setAvoirs(a); setObjectifs(o); setJalons(j);
    } catch (e) { console.error(e); }
  }
 
  const clientColor = idx => COLORS[idx % COLORS.length];
  const activeIdx = clients.findIndex(c => c.id === activeClient?.id);
  const color = clientColor(activeIdx >= 0 ? activeIdx : 0);
 
  // ── Patrimoine total actuel = dernier avoir de chaque produit
  const patrimoineActuel = produits.reduce((sum, p) => {
    const pAvoirs = avoirs.filter(a => a.produit_id === p.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    return sum + (pAvoirs[0]?.montant || 0);
  }, 0);
 
  // ── Par catégorie
  const parCategorie = CATEGORIES.map(cat => {
    const prods = produits.filter(p => p.categorie === cat);
    const total = prods.reduce((sum, p) => {
      const last = avoirs.filter(a => a.produit_id === p.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      return sum + (last?.montant || 0);
    }, 0);
    return { name: cat, value: total, color: CAT_COLORS[cat] };
  }).filter(c => c.value > 0);
 
  // ── Timeline globale (tous produits confondus par date)
  const timeline = (() => {
    const byDate = {};
    avoirs.forEach(a => {
      const d = a.date;
      if (!byDate[d]) byDate[d] = {};
      byDate[d][a.produit_id] = a.montant;
    });
    const dates = Object.keys(byDate).sort();
    const lastKnown = {};
    return dates.map(d => {
      produits.forEach(p => { if (byDate[d][p.id] !== undefined) lastKnown[p.id] = byDate[d][p.id]; });
      const total = Object.values(lastKnown).reduce((s, v) => s + v, 0);
      return { date: fmtDate(d), total };
    });
  })();
 
  // ── Sauvegarde
  async function save() {
    setSaving(true);
    try {
      if (modal.type === "client_new") {
        const c = await sb.post("clients", form);
        await loadAll();
        setActiveClient(c[0]);
      } else if (modal.type === "client_edit") {
        await sb.patch("clients", activeClient.id, form);
        await loadAll();
      } else if (modal.type === "produit_new") {
        await sb.post("produits", { ...form, client_id: activeClient.id });
        await loadClientData(activeClient.id);
      } else if (modal.type === "avoir_new") {
        await sb.post("avoirs", { ...form, client_id: activeClient.id, produit_id: modal.produit_id, montant: parseFloat(form.montant) });
        await loadClientData(activeClient.id);
      } else if (modal.type === "objectif_new") {
        await sb.post("objectifs", { ...form, client_id: activeClient.id, montant_cible: parseFloat(form.montant_cible) });
        await loadClientData(activeClient.id);
      } else if (modal.type === "jalon_new") {
        await sb.post("jalons", { ...form, objectif_id: modal.objectif_id, montant_cible: parseFloat(form.montant_cible) || null });
        await loadClientData(activeClient.id);
      }
      setModal(null);
    } catch (e) { alert("Erreur : " + e.message); }
    setSaving(false);
  }
 
  async function delClient() {
    if (!window.confirm(`Supprimer ${activeClient.nom} ?`)) return;
    await sb.del("clients", activeClient.id);
    setActiveClient(null);
    await loadAll();
  }
  async function delProduit(id) {
    if (!window.confirm("Supprimer ce produit et tous ses avoirs ?")) return;
    await sb.del("produits", id);
    await loadClientData(activeClient.id);
  }
  async function delObjectif(id) {
    if (!window.confirm("Supprimer cet objectif ?")) return;
    await sb.del("objectifs", id);
    await loadClientData(activeClient.id);
  }
  async function delJalon(id) {
    await sb.del("jalons", id);
    await loadClientData(activeClient.id);
  }
 
  function openModal(type, extra = {}) {
    const defaults = {
      client_new: EMPTY_CLIENT, client_edit: { nom: activeClient?.nom || "", age: activeClient?.age || "", objectif: activeClient?.objectif || "", patrimoine_cible: activeClient?.patrimoine_cible || "", mensualite: activeClient?.mensualite || "", statut: activeClient?.statut || "En bonne voie", date_debut: activeClient?.date_debut || "" },
      produit_new: EMPTY_PRODUIT, avoir_new: EMPTY_AVOIR, objectif_new: EMPTY_OBJECTIF, jalon_new: EMPTY_JALON,
    };
    setForm(defaults[type] || {});
    setModal({ type, ...extra });
  }
 
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
 
  // ─── GLOBAL DASHBOARD ───
  const globalPatrimoine = clients.reduce((sum, c) => {
    const dernierAvoirs = avoirs; // simplified - use client avoirs
    return sum;
  }, 0);
 
  const ss = { minHeight: "100vh", background: "#0C0C0E", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: "#E2DDD6", display: "flex" };
 
  return (
    <div style={ss}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Cormorant+Garamond:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#2A2A2A;border-radius:2px}
        .cr:hover{background:#181818!important}.tb:hover{color:#E2DDD6!important}
        .btn:hover{opacity:0.8}.ib:hover{background:#222!important}
        input,select,textarea{font-family:inherit}input:focus,select:focus,textarea:focus{outline:none;border-color:#444!important}
        .tag{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:500}
      `}</style>
 
      {/* SIDEBAR */}
      <div style={{ width: 240, background: "#0F0F11", borderRight: "1px solid #1A1A1E", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px", borderBottom: "1px solid #1A1A1E" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.25em", color: "#444", textTransform: "uppercase", marginBottom: 3 }}>Gestion</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: "#C9A96E", letterSpacing: "0.03em" }}>Patrimoine</div>
        </div>
 
        {/* Nav global */}
        <div style={{ padding: "10px 10px 0" }}>
          <div onClick={() => setPage("global")}
            style={{ padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, color: page === "global" ? "#C9A96E" : "#555", background: page === "global" ? "#1A1712" : "transparent", marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>⬡</span> Vue globale
          </div>
        </div>
 
        <div style={{ padding: "16px 10px 8px" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "#333", textTransform: "uppercase", padding: "0 10px", marginBottom: 8 }}>Clients</div>
          {loading && <div style={{ color: "#444", fontSize: 12, padding: 12 }}>Chargement...</div>}
          {clients.map((c, idx) => {
            const active = page === "client" && activeClient?.id === c.id;
            const col = clientColor(idx);
            return (
              <div key={c.id} className="cr" onClick={() => { setActiveClient(c); setPage("client"); setTab("synthese"); }}
                style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2, background: active ? "#1A1712" : "transparent", border: active ? `1px solid ${col}25` : "1px solid transparent", transition: "all 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${col}18`, border: `1.5px solid ${col}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: col, flexShrink: 0 }}>{initials(c.nom)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: active ? "#E2DDD6" : "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.nom}</div>
                    <div style={{ fontSize: 10, color: "#444", marginTop: 1 }}>{c.age ? `${c.age} ans` : "—"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
 
        <div style={{ marginTop: "auto", padding: "12px 10px", borderTop: "1px solid #1A1A1E" }}>
          <button className="btn" onClick={() => openModal("client_new")}
            style={{ width: "100%", padding: "9px", background: "#C9A96E", border: "none", borderRadius: 8, cursor: "pointer", color: "#0C0C0E", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>
            + Nouveau client
          </button>
          <div style={{ fontSize: 10, color: "#333", marginTop: 8, textAlign: "center" }}>{clients.length} client{clients.length > 1 ? "s" : ""}</div>
        </div>
      </div>
 
      {/* MAIN */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
 
        {/* ═══ PAGE GLOBALE ═══ */}
        {page === "global" && (
          <div style={{ padding: "32px 36px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: "#E2DDD6", marginBottom: 6 }}>Vue d'ensemble</div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 32 }}>{clients.length} clients accompagnés</div>
 
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Clients actifs", val: clients.length, unit: "" },
                { label: "Total patrimoine suivi", val: fmt(clients.reduce((s, c) => s + (c.patrimoine_actuel || 0), 0)), unit: "" },
                { label: "Épargne mensuelle totale", val: fmt(clients.reduce((s, c) => s + (c.mensualite || 0), 0)), unit: "/mois" },
              ].map((k, i) => (
                <div key={i} style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: "#E2DDD6" }}>{k.val}<span style={{ fontSize: 13, color: "#555" }}>{k.unit}</span></div>
                </div>
              ))}
            </div>
 
            {/* Clients cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
              {clients.map((c, idx) => {
                const col = clientColor(idx);
                const p = pct(c.patrimoine_actuel || 0, c.patrimoine_cible || 0);
                const st = statutStyle[c.statut] || statutStyle["En bonne voie"];
                return (
                  <div key={c.id} className="cr" onClick={() => { setActiveClient(c); setPage("client"); setTab("synthese"); }}
                    style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: "20px", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${col}18`, border: `1.5px solid ${col}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: col }}>{initials(c.nom)}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{c.nom}</div>
                          <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{c.objectif || "—"}</div>
                        </div>
                      </div>
                      <div className="tag" style={{ background: st.bg, color: st.text }}>
                        <div style={{ width: 4, height: 4, borderRadius: "50%", background: st.dot, marginRight: 5 }} />{c.statut}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666", marginBottom: 8 }}>
                      <span>{fmt(c.patrimoine_actuel || 0)}</span>
                      <span>{fmt(c.patrimoine_cible || 0)}</span>
                    </div>
                    <div style={{ background: "#1A1A1E", borderRadius: 3, height: 3 }}>
                      <div style={{ width: `${p}%`, height: "100%", background: col, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 10, color: "#444", marginTop: 6, textAlign: "right" }}>{p}% atteint</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
 
        {/* ═══ PAGE CLIENT ═══ */}
        {page === "client" && activeClient && (() => {
          const st = statutStyle[activeClient.statut] || statutStyle["En bonne voie"];
          const prog = pct(patrimoineActuel, activeClient.patrimoine_cible || 0);
          return (
            <>
              {/* Header */}
              <div style={{ padding: "20px 32px", borderBottom: "1px solid #1A1A1E", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#0C0C0E", zIndex: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${color}18`, border: `2px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color }}>{initials(activeClient.nom)}</div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20 }}>{activeClient.nom}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{activeClient.age ? `${activeClient.age} ans` : ""}{activeClient.date_debut ? ` · Suivi depuis ${activeClient.date_debut}` : ""}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="tag" style={{ background: st.bg, color: st.text }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: st.dot, marginRight: 5 }} />{activeClient.statut}
                  </div>
                  <button className="btn ib" onClick={() => openModal("client_edit")} style={{ padding: "6px 12px", background: "#141416", border: "1px solid #222", borderRadius: 7, cursor: "pointer", color: "#777", fontSize: 11 }}>Modifier</button>
                  <button className="btn" onClick={delClient} style={{ padding: "6px 12px", background: "#141416", border: "1px solid #222", borderRadius: 7, cursor: "pointer", color: "#E07A7A", fontSize: 11 }}>Supprimer</button>
                </div>
              </div>
 
              {/* Tabs */}
              <div style={{ padding: "0 32px", borderBottom: "1px solid #1A1A1E", display: "flex" }}>
                {[["synthese", "Synthèse patrimoniale"], ["objectifs", "Objectifs"], ["evolution", "Évolution"]].map(([k, l]) => (
                  <button key={k} className="tb" onClick={() => setTab(k)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "14px 18px", fontSize: 12, fontWeight: 500, color: tab === k ? color : "#444", borderBottom: tab === k ? `2px solid ${color}` : "2px solid transparent", transition: "all 0.15s" }}>
                    {l}
                  </button>
                ))}
              </div>
 
              <div style={{ padding: "24px 32px", flex: 1 }}>
 
                {/* ── SYNTHÈSE ── */}
                {tab === "synthese" && (
                  <div>
                    {/* KPIs */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
                      {[
                        { label: "Patrimoine total", val: fmt(patrimoineActuel) },
                        { label: "Objectif global", val: fmt(activeClient.patrimoine_cible) },
                        { label: "Mensualité", val: fmt(activeClient.mensualite) },
                        { label: "Progression", val: `${prog}%` },
                      ].map((k, i) => (
                        <div key={i} style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 10, padding: "14px 16px" }}>
                          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 5 }}>{k.label}</div>
                          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: i === 3 ? color : "#E2DDD6" }}>{k.val}</div>
                        </div>
                      ))}
                    </div>
 
                    {/* Répartition pie + produits */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 20 }}>
                      {/* Pie */}
                      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: "20px" }}>
                        <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>Répartition</div>
                        {parCategorie.length > 0 ? (
                          <>
                            <ResponsiveContainer width="100%" height={160}>
                              <PieChart>
                                <Pie data={parCategorie} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3}>
                                  {parCategorie.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1A1A1E", border: "none", borderRadius: 6, fontSize: 11 }} />
                              </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                              {parCategorie.map((c, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.color }} />
                                    <span style={{ fontSize: 11, color: "#777" }}>{c.name}</span>
                                  </div>
                                  <span style={{ fontSize: 11, color: "#999" }}>{fmt(c.value)}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : <div style={{ color: "#444", fontSize: 12, textAlign: "center", paddingTop: 20 }}>Aucun produit</div>}
                      </div>
 
                      {/* Produits list */}
                      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em" }}>Produits d'épargne</div>
                          <button className="btn" onClick={() => openModal("produit_new")}
                            style={{ padding: "5px 12px", background: color, border: "none", borderRadius: 6, cursor: "pointer", color: "#0C0C0E", fontSize: 10, fontWeight: 600 }}>+ Ajouter</button>
                        </div>
                        {produits.length === 0 && <div style={{ color: "#444", fontSize: 12, padding: "10px 0" }}>Aucun produit encore</div>}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {CATEGORIES.map(cat => {
                            const prods = produits.filter(p => p.categorie === cat);
                            if (prods.length === 0) return null;
                            return (
                              <div key={cat}>
                                <div style={{ fontSize: 9, color: CAT_COLORS[cat], textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>{cat}</div>
                                {prods.map(p => {
                                  const pAvoirs = avoirs.filter(a => a.produit_id === p.id).sort((a, b) => new Date(b.date) - new Date(a.date));
                                  const last = pAvoirs[0];
                                  return (
                                    <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "#141416", borderRadius: 8, marginBottom: 4 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: CAT_COLORS[cat] }} />
                                        <span style={{ fontSize: 12, color: "#CCC" }}>{p.nom}</span>
                                        {last && <span style={{ fontSize: 10, color: "#555" }}>· {fmtDate(last.date)}</span>}
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 13, fontWeight: 500, color: "#E2DDD6" }}>{last ? fmt(last.montant) : "—"}</span>
                                        <button onClick={() => openModal("avoir_new", { produit_id: p.id, produit_nom: p.nom })}
                                          style={{ padding: "3px 8px", background: `${color}20`, border: `1px solid ${color}40`, borderRadius: 5, cursor: "pointer", color, fontSize: 10 }}>+ Avoir</button>
                                        <button onClick={() => delProduit(p.id)} style={{ padding: "3px 6px", background: "none", border: "none", cursor: "pointer", color: "#E07A7A", fontSize: 11 }}>✕</button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
 
                    {/* Bar par catégorie */}
                    {parCategorie.length > 0 && (
                      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: "20px" }}>
                        <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>Répartition par catégorie</div>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={parCategorie} barSize={32}>
                            <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1A1A1E", border: "none", borderRadius: 6, fontSize: 11 }} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {parCategorie.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
 
                {/* ── OBJECTIFS ── */}
                {tab === "objectifs" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: "#E2DDD6" }}>Objectifs financiers</div>
                      <button className="btn" onClick={() => openModal("objectif_new")}
                        style={{ padding: "8px 16px", background: color, border: "none", borderRadius: 8, cursor: "pointer", color: "#0C0C0E", fontSize: 11, fontWeight: 600 }}>+ Nouvel objectif</button>
                    </div>
                    {objectifs.length === 0 && <div style={{ color: "#444", fontSize: 13, padding: "20px 0" }}>Aucun objectif défini. Commence par en créer un.</div>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {objectifs.map((obj, oi) => {
                        const objJalons = jalons.filter(j => j.objectif_id === obj.id);
                        const totalJalons = objJalons.reduce((s, j) => s + (j.montant_cible || 0), 0);
                        const prog = pct(patrimoineActuel, obj.montant_cible);
                        const ocol = COLORS[(oi + 2) % COLORS.length];
                        return (
                          <div key={obj.id} style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, overflow: "hidden" }}>
                            <div style={{ padding: "18px 20px", borderBottom: "1px solid #1A1A1E" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{obj.nom}</div>
                                  {obj.description && <div style={{ fontSize: 11, color: "#666" }}>{obj.description}</div>}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: ocol }}>{fmt(obj.montant_cible)}</div>
                                  <button onClick={() => delObjectif(obj.id)} style={{ padding: "4px 8px", background: "none", border: "1px solid #2A2A2A", borderRadius: 6, cursor: "pointer", color: "#E07A7A", fontSize: 10 }}>Supprimer</button>
                                </div>
                              </div>
                              <div style={{ marginTop: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", marginBottom: 5 }}>
                                  <span>{fmt(patrimoineActuel)} actuels</span><span>{prog}%</span>
                                </div>
                                <div style={{ background: "#1A1A1E", borderRadius: 3, height: 4 }}>
                                  <div style={{ width: `${prog}%`, height: "100%", background: ocol, borderRadius: 3 }} />
                                </div>
                              </div>
                            </div>
 
                            {/* Jalons */}
                            <div style={{ padding: "14px 20px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em" }}>Jalons ({objJalons.length})</div>
                                <button className="btn" onClick={() => openModal("jalon_new", { objectif_id: obj.id })}
                                  style={{ padding: "4px 10px", background: `${ocol}20`, border: `1px solid ${ocol}40`, borderRadius: 6, cursor: "pointer", color: ocol, fontSize: 10 }}>+ Jalon</button>
                              </div>
                              {objJalons.length === 0 && <div style={{ color: "#444", fontSize: 11 }}>Aucun jalon</div>}
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {objJalons.map((j, ji) => {
                                  const done = patrimoineActuel >= (j.montant_cible || 0);
                                  return (
                                    <div key={j.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "#141416", borderRadius: 8 }}>
                                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? `${ocol}20` : "#1A1A1E", border: `1.5px solid ${done ? ocol : "#2A2A2A"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: done ? ocol : "#555", flexShrink: 0, marginTop: 1 }}>
                                        {done ? "✓" : ji + 1}
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <span style={{ fontSize: 12, color: done ? "#E2DDD6" : "#888" }}>{j.nom}</span>
                                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            {j.montant_cible && <span style={{ fontSize: 11, color: ocol }}>{fmt(j.montant_cible)}</span>}
                                            <button onClick={() => delJalon(j.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 11 }}>✕</button>
                                          </div>
                                        </div>
                                        {j.produit_lie && <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>📦 {j.produit_lie}</div>}
                                        {j.moyens && <div style={{ fontSize: 10, color: "#555", marginTop: 2, fontStyle: "italic" }}>→ {j.moyens}</div>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
 
                {/* ── ÉVOLUTION ── */}
                {tab === "evolution" && (
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: "#E2DDD6", marginBottom: 20 }}>Évolution dans le temps</div>
 
                    {timeline.length < 2 ? (
                      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 28, color: "#555", fontSize: 13, textAlign: "center" }}>
                        Ajoute des avoirs à différentes dates pour voir l'évolution
                      </div>
                    ) : (
                      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: "24px", marginBottom: 16 }}>
                        <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 20 }}>Patrimoine total</div>
                        <ResponsiveContainer width="100%" height={260}>
                          <AreaChart data={timeline}>
                            <defs>
                              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{ fill: "#444", fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "#444", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1A1A1E", border: "none", borderRadius: 6, fontSize: 11 }} />
                            <Area type="monotone" dataKey="total" stroke={color} strokeWidth={2} fill="url(#grad)" dot={{ fill: color, r: 3 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
 
                    {/* Évolution par produit */}
                    {produits.length > 0 && (
                      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: "24px" }}>
                        <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>Historique par produit</div>
                        {produits.map((p, pi) => {
                          const pAvoirs = avoirs.filter(a => a.produit_id === p.id).sort((a, b) => new Date(a.date) - new Date(b.date));
                          if (pAvoirs.length === 0) return null;
                          const pcol = COLORS[pi % COLORS.length];
                          return (
                            <div key={p.id} style={{ marginBottom: 20 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: pcol }} />
                                <span style={{ fontSize: 11, color: "#888" }}>{p.nom}</span>
                                <span className="tag" style={{ background: `${CAT_COLORS[p.categorie]}15`, color: CAT_COLORS[p.categorie], marginLeft: 4 }}>{p.categorie}</span>
                              </div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {pAvoirs.map((a, ai) => (
                                  <div key={ai} style={{ padding: "6px 12px", background: "#141416", borderRadius: 8, fontSize: 11 }}>
                                    <div style={{ color: "#555", marginBottom: 2 }}>{fmtDate(a.date)}</div>
                                    <div style={{ color: pcol, fontWeight: 500 }}>{fmt(a.montant)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>
 
      {/* ═══ MODALS ═══ */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#0F0F11", border: "1px solid #222", borderRadius: 14, padding: "28px", width: 420, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 20, color: "#E2DDD6" }}>
              {{ client_new: "Nouveau client", client_edit: "Modifier le client", produit_new: "Nouveau produit", avoir_new: `Saisir un avoir — ${modal.produit_nom || ""}`, objectif_new: "Nouvel objectif", jalon_new: "Nouveau jalon" }[modal.type]}
            </div>
 
            {/* Client form */}
            {(modal.type === "client_new" || modal.type === "client_edit") && (
              <div>
                {[["nom", "Nom complet *", "text", "Sophie Martin"], ["age", "Âge", "number", "32"], ["objectif", "Objectif principal", "text", "Retraite à 50 ans"], ["patrimoine_cible", "Patrimoine cible (€)", "number", "250000"], ["mensualite", "Mensualité (€)", "number", "800"], ["date_debut", "Date de début", "text", "Jan 2024"]].map(([k, l, t, ph]) => (
                  <div key={k} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>{l}</div>
                    <input type={t} placeholder={ph} value={form[k] || ""} onChange={e => f(k, e.target.value)}
                      style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12 }} />
                  </div>
                ))}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Statut</div>
                  <select value={form.statut || "En bonne voie"} onChange={e => f("statut", e.target.value)}
                    style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12 }}>
                    {STATUTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}
 
            {/* Produit form */}
            {modal.type === "produit_new" && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Nom du produit *</div>
                  <input placeholder="Livret A, PEA, SCPI..." value={form.nom || ""} onChange={e => f("nom", e.target.value)}
                    style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12 }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Catégorie</div>
                  <select value={form.categorie || "Épargne"} onChange={e => f("categorie", e.target.value)}
                    style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12 }}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}
 
            {/* Avoir form */}
            {modal.type === "avoir_new" && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Montant (€) *</div>
                  <input type="number" placeholder="12000" value={form.montant || ""} onChange={e => f("montant", e.target.value)}
                    style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12 }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Date *</div>
                  <input type="date" value={form.date || ""} onChange={e => f("date", e.target.value)}
                    style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12 }} />
                </div>
              </div>
            )}
 
            {/* Objectif form */}
            {modal.type === "objectif_new" && (
              <div>
                {[["nom", "Nom de l'objectif *", "text", "Retraite anticipée"], ["montant_cible", "Montant cible (€) *", "number", "300000"], ["description", "Description", "text", "Partir à la retraite à 55 ans"]].map(([k, l, t, ph]) => (
                  <div key={k} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>{l}</div>
                    <input type={t} placeholder={ph} value={form[k] || ""} onChange={e => f(k, e.target.value)}
                      style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12 }} />
                  </div>
                ))}
              </div>
            )}
 
            {/* Jalon form */}
            {modal.type === "jalon_new" && (
              <div>
                {[["nom", "Nom du jalon *", "text", "Ouvrir un PEA"], ["montant_cible", "Montant cible (€)", "number", "10000"], ["produit_lie", "Produit d'épargne associé", "text", "PEA Bourse Direct"], ["moyens", "Moyens pour y arriver", "text", "Virer 200€/mois dès janvier"]].map(([k, l, t, ph]) => (
                  <div key={k} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>{l}</div>
                    <input type={t} placeholder={ph} value={form[k] || ""} onChange={e => f(k, e.target.value)}
                      style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12 }} />
                  </div>
                ))}
              </div>
            )}
 
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={save} disabled={saving}
                style={{ flex: 1, padding: "10px", background: "#C9A96E", border: "none", borderRadius: 8, cursor: "pointer", color: "#0C0C0E", fontSize: 12, fontWeight: 600 }}>
                {saving ? "..." : "Enregistrer"}
              </button>
              <button onClick={() => setModal(null)}
                style={{ padding: "10px 16px", background: "#141416", border: "1px solid #222", borderRadius: 8, cursor: "pointer", color: "#777", fontSize: 12 }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
