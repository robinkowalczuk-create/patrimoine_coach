import React, { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const SB_URL = "https://paagozsbjjwznrbuytvr.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYWdvenNiamp3em5yYnV5dHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjcxNzUsImV4cCI6MjA5MDcwMzE3NX0.WWQeWjDEq6r3HgSYRAtE8eXk34YQYXc5UZ07cvR_b1I";

// Ton email admin — change cette valeur par ton propre email
const ADMIN_EMAIL = "robin.kowalczuk@gmail.com";

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": `Bearer ${token || SB_KEY}`,
});

// ── Auth ──
const auth = {
  login: async (email, password) => {
    const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SB_KEY },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error_description || d.msg || "Erreur de connexion");
    return d;
  },
  logout: async (token) => {
    await fetch(`${SB_URL}/auth/v1/logout`, {
      method: "POST",
      headers: authHeaders(token),
    });
  },
};

// ── DB ──
const sb = (token) => ({
  get: async (table, query = "") => {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, { headers: authHeaders(token) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  post: async (table, body) => {
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: "POST", headers: { ...authHeaders(token), "Prefer": "return=representation" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  patch: async (table, id, body) => {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH", headers: { ...authHeaders(token), "Prefer": "return=representation" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  del: async (table, id) => {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE", headers: authHeaders(token),
    });
    if (!r.ok) throw new Error(await r.text());
  },
});

const COLORS = ["#C9A96E", "#7C9B8A", "#8B7BAB", "#E07A7A", "#6AAED4", "#E0A03A"];
const CAT_COLORS = { "Épargne": "#7C9B8A", "Investissement": "#C9A96E", "Immobilier": "#8B7BAB", "Autre": "#888" };
const CATEGORIES = ["Épargne", "Investissement", "Immobilier", "Autre"];
const STATUTS = ["En bonne voie", "En avance", "À surveiller"];
const statutStyle = {
  "En bonne voie": { bg: "#1A2F1F", text: "#5EBF7A", dot: "#5EBF7A" },
  "En avance": { bg: "#1A2A3F", text: "#5BA3E0", dot: "#5BA3E0" },
  "À surveiller": { bg: "#2F2010", text: "#E09A3A", dot: "#E09A3A" },
};

const fmt = n => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
const initials = n => n ? n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?";
const pct = (a, b) => b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0;

const EMPTY_CLIENT = { nom: "", age: "", statut: "En bonne voie", date_debut: "", mensualite: "" };
const EMPTY_PRODUIT = { nom: "", categorie: "Épargne" };
const EMPTY_AVOIR = { montant: "", date: new Date().toISOString().split("T")[0] };
const EMPTY_OBJECTIF = { nom: "", montant_cible: "", description: "" };
const EMPTY_JALON = { nom: "", montant_cible: "", produit_lie: "", moyens: "" };

// ════════════════════════════════════
//  PAGE LOGIN
// ════════════════════════════════════
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await auth.login(email, password);
      onLogin(session);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0C0C0E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Cormorant+Garamond:wght@400;500;600&display=swap'); *{box-sizing:border-box;margin:0;padding:0} input:focus{outline:none;border-color:#C9A96E!important}`}</style>
      <div style={{ width: 380, padding: "40px", background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 16 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.25em", color: "#444", textTransform: "uppercase", marginBottom: 6 }}>Gestion</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, color: "#C9A96E", marginBottom: 8 }}>Patrimoine</div>
          <div style={{ fontSize: 12, color: "#555" }}>Connecte-toi pour accéder à ton espace</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#555", marginBottom: 6, letterSpacing: "0.05em" }}>Email</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.fr" required
              style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 8, padding: "11px 14px", color: "#CCC", fontSize: 13, transition: "border-color 0.2s", fontFamily: "inherit" }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: "#555", marginBottom: 6, letterSpacing: "0.05em" }}>Mot de passe</div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
              style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 8, padding: "11px 14px", color: "#CCC", fontSize: 13, transition: "border-color 0.2s", fontFamily: "inherit" }} />
          </div>

          {error && (
            <div style={{ background: "#2F1010", border: "1px solid #E07A7A30", borderRadius: 8, padding: "10px 14px", color: "#E07A7A", fontSize: 12, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "12px", background: "#C9A96E", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", color: "#0C0C0E", fontSize: 13, fontWeight: 600, opacity: loading ? 0.7 : 1, transition: "opacity 0.2s" }}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ════════════════════════════════════
//  APP PRINCIPALE
// ════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myClient, setMyClient] = useState(null); // si client connecté

  // ── Auth state ──
  function handleLogin(s) {
    setSession(s);
    const email = s.user?.email || "";
    setIsAdmin(email === ADMIN_EMAIL);
    localStorage.setItem("sb_session", JSON.stringify(s));
  }

  async function handleLogout() {
    if (session?.access_token) await auth.logout(session.access_token);
    setSession(null);
    setIsAdmin(false);
    setMyClient(null);
    localStorage.removeItem("sb_session");
  }

  useEffect(() => {
    const saved = localStorage.getItem("sb_session");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setSession(s);
        setIsAdmin((s.user?.email || "") === ADMIN_EMAIL);
      } catch {}
    }
  }, []);

  // ── Si client (non admin), charge son profil ──
  const db = session ? sb(session.access_token) : null;

  useEffect(() => {
    if (session && !isAdmin) {
      const uid = session.user?.id;
      if (uid && db) {
        db.get("clients", `select=*&user_id=eq.${uid}`).then(data => {
          if (data.length > 0) setMyClient(data[0]);
        }).catch(console.error);
      }
    }
  }, [session, isAdmin]);

  if (!session) return <LoginPage onLogin={handleLogin} />;

  return isAdmin
    ? <AdminApp db={db} session={session} onLogout={handleLogout} />
    : <ClientApp db={db} client={myClient} onLogout={handleLogout} />;
}

// ════════════════════════════════════
//  VUE ADMIN (toi)
// ════════════════════════════════════
function AdminApp({ db, session, onLogout }) {
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [produits, setProduits] = useState([]);
  const [avoirs, setAvoirs] = useState([]);
  const [objectifs, setObjectifs] = useState([]);
  const [jalons, setJalons] = useState([]);
  const [objProduits, setObjProduits] = useState([]);
  const [notes, setNotes] = useState({});
  const [page, setPage] = useState("global");
  const [tab, setTab] = useState("synthese");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState("");

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (activeClient) loadClientData(activeClient.id); }, [activeClient?.id]);

  async function loadAll() {
    setLoading(true);
    try { const c = await db.get("clients", "select=*&order=nom"); setClients(c); if (c.length > 0 && !activeClient) setActiveClient(c[0]); } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadClientData(cid) {
    try {
      const [p, a, o] = await Promise.all([
        db.get("produits", `select=*&client_id=eq.${cid}`),
        db.get("avoirs", `select=*&client_id=eq.${cid}&order=date`),
        db.get("objectifs", `select=*&client_id=eq.${cid}`),
      ]);
      setProduits(p); setAvoirs(a); setObjectifs(o);
      if (o.length > 0) {
        const ids = o.map(x => x.id).join(",");
        const [j, op] = await Promise.all([
          db.get("jalons", `select=*&objectif_id=in.(${ids})`),
          db.get("objectif_produits", `select=*&objectif_id=in.(${ids})`),
        ]);
        setJalons(j); setObjProduits(op);
      } else { setJalons([]); setObjProduits([]); }
    } catch (e) { console.error(e); }
  }

  const clientColor = idx => COLORS[idx % COLORS.length];
  const activeIdx = clients.findIndex(c => c.id === activeClient?.id);
  const color = clientColor(activeIdx >= 0 ? activeIdx : 0);
  const lastAvoir = pid => { const a = avoirs.filter(a => a.produit_id === pid).sort((a, b) => new Date(b.date) - new Date(a.date)); return a[0]?.montant || 0; };
  const patrimoineActuel = produits.reduce((s, p) => s + lastAvoir(p.id), 0);
  const patrimoineObjectif = oid => { const ids = objProduits.filter(op => op.objectif_id === oid).map(op => op.produit_id); return produits.filter(p => ids.includes(p.id)).reduce((s, p) => s + lastAvoir(p.id), 0); };
  const parCategorie = CATEGORIES.map(cat => ({ name: cat, value: produits.filter(p => p.categorie === cat).reduce((s, p) => s + lastAvoir(p.id), 0), color: CAT_COLORS[cat] })).filter(c => c.value > 0);
  const timeline = (() => {
    const byDate = {}; avoirs.forEach(a => { if (!byDate[a.date]) byDate[a.date] = {}; byDate[a.date][a.produit_id] = a.montant; });
    const dates = Object.keys(byDate).sort(); const lk = {};
    return dates.map(d => { produits.forEach(p => { if (byDate[d][p.id] !== undefined) lk[p.id] = byDate[d][p.id]; }); return { date: fmtDate(d), total: Object.values(lk).reduce((s, v) => s + v, 0) }; });
  })();
  const clientNotes = activeClient ? (notes[activeClient.id] || []) : [];

  async function save() {
    setSaving(true);
    try {
      if (modal.type === "client_new") { const c = await db.post("clients", form); await loadAll(); setActiveClient(c[0]); setPage("client"); setTab("synthese"); }
      else if (modal.type === "client_edit") { await db.patch("clients", activeClient.id, form); setActiveClient({ ...activeClient, ...form }); await loadAll(); }
      else if (modal.type === "produit_new") { await db.post("produits", { ...form, client_id: activeClient.id }); await loadClientData(activeClient.id); }
      else if (modal.type === "avoir_new") { await db.post("avoirs", { montant: parseFloat(form.montant), date: form.date, client_id: activeClient.id, produit_id: modal.produit_id }); await loadClientData(activeClient.id); }
      else if (modal.type === "objectif_new") { await db.post("objectifs", { nom: form.nom, montant_cible: parseFloat(form.montant_cible), description: form.description, client_id: activeClient.id }); await loadClientData(activeClient.id); }
      else if (modal.type === "jalon_new") { await db.post("jalons", { ...form, montant_cible: parseFloat(form.montant_cible) || null, objectif_id: modal.objectif_id }); await loadClientData(activeClient.id); }
      else if (modal.type === "lier_produit") {
        const already = objProduits.filter(op => op.objectif_id === modal.objectif_id).map(op => op.produit_id);
        const toAdd = modal.selectedProduits.filter(id => !already.includes(id));
        const toRemove = already.filter(id => !modal.selectedProduits.includes(id));
        for (const pid of toAdd) await db.post("objectif_produits", { objectif_id: modal.objectif_id, produit_id: pid });
        for (const pid of toRemove) { const op = objProduits.find(x => x.objectif_id === modal.objectif_id && x.produit_id === pid); if (op) await db.del("objectif_produits", op.id); }
        await loadClientData(activeClient.id);
      }
      setModal(null);
    } catch (e) { alert("Erreur : " + e.message); }
    setSaving(false);
  }

  async function delClient() { if (!window.confirm(`Supprimer ${activeClient.nom} ?`)) return; await db.del("clients", activeClient.id); setActiveClient(null); await loadAll(); setPage("global"); }
  async function delProduit(id) { if (!window.confirm("Supprimer ce produit ?")) return; await db.del("produits", id); await loadClientData(activeClient.id); }
  async function delObjectif(id) { if (!window.confirm("Supprimer cet objectif ?")) return; await db.del("objectifs", id); await loadClientData(activeClient.id); }
  async function delJalon(id) { await db.del("jalons", id); await loadClientData(activeClient.id); }

  function openModal(type, extra = {}) {
    const d = { client_new: EMPTY_CLIENT, client_edit: { nom: activeClient?.nom || "", age: activeClient?.age || "", statut: activeClient?.statut || "En bonne voie", date_debut: activeClient?.date_debut || "", mensualite: activeClient?.mensualite || "" }, produit_new: EMPTY_PRODUIT, avoir_new: EMPTY_AVOIR, objectif_new: EMPTY_OBJECTIF, jalon_new: EMPTY_JALON, lier_produit: {} };
    setForm(d[type] || {}); setModal({ type, ...extra });
  }

  function addNote() {
    if (!newNote.trim() || !activeClient) return;
    const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    setNotes(prev => ({ ...prev, [activeClient.id]: [{ date: today, texte: newNote }, ...(prev[activeClient.id] || [])] }));
    setNewNote("");
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inp = (k, l, t = "text", ph = "") => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>{l}</div>
      <input type={t} placeholder={ph} value={form[k] || ""} onChange={e => f(k, e.target.value)}
        style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0C0C0E", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: "#E2DDD6", display: "flex" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Cormorant+Garamond:wght@400;500;600&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:#2A2A2A;border-radius:2px} .cr:hover{background:#181818!important} .tb:hover{color:#E2DDD6!important} .btn:hover{opacity:0.8} .row:hover{background:#1A1A1E!important} input,select,textarea{font-family:inherit} input:focus,select:focus,textarea:focus{outline:none;border-color:#444!important} .tag{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:500}`}</style>

      {/* SIDEBAR */}
      <div style={{ width: 240, background: "#0F0F11", borderRight: "1px solid #1A1A1E", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #1A1A1E" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.25em", color: "#444", textTransform: "uppercase", marginBottom: 3 }}>Admin</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: "#C9A96E" }}>Robinvest</div>
        </div>
        <div style={{ padding: "10px 10px 0" }}>
          <div onClick={() => setPage("global")} className="cr"
            style={{ padding: "9px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, color: page === "global" ? "#C9A96E" : "#555", background: page === "global" ? "#1A1712" : "transparent", marginBottom: 2 }}>
            ⬡ Vue globale
          </div>
        </div>
        <div style={{ padding: "16px 10px 8px", flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "#333", textTransform: "uppercase", padding: "0 10px", marginBottom: 8 }}>Clients</div>
          {loading && <div style={{ color: "#444", fontSize: 12, padding: 12 }}>Chargement...</div>}
          {clients.map((c, idx) => {
            const active = page === "client" && activeClient?.id === c.id;
            const col = clientColor(idx);
            return (
              <div key={c.id} className="cr" onClick={() => { setActiveClient(c); setPage("client"); setTab("synthese"); }}
                style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2, background: active ? "#1A1712" : "transparent", border: active ? `1px solid ${col}25` : "1px solid transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${col}18`, border: `1.5px solid ${col}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: col, flexShrink: 0 }}>{initials(c.nom)}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: active ? "#E2DDD6" : "#888" }}>{c.nom}</div>
                    <div style={{ fontSize: 10, color: "#444" }}>{c.age ? `${c.age} ans` : "—"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: "12px 10px", borderTop: "1px solid #1A1A1E" }}>
          <button className="btn" onClick={() => openModal("client_new")}
            style={{ width: "100%", padding: "9px", background: "#C9A96E", border: "none", borderRadius: 8, cursor: "pointer", color: "#0C0C0E", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
            + Nouveau client
          </button>
          <button className="btn" onClick={onLogout}
            style={{ width: "100%", padding: "7px", background: "none", border: "1px solid #222", borderRadius: 8, cursor: "pointer", color: "#555", fontSize: 11 }}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {page === "global" && (
          <div style={{ padding: "32px 36px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, marginBottom: 6 }}>Vue d'ensemble</div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 28 }}>{clients.length} clients accompagnés</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
              {clients.map((c, idx) => {
                const col = clientColor(idx);
                const st = statutStyle[c.statut] || statutStyle["En bonne voie"];
                return (
                  <div key={c.id} className="cr" onClick={() => { setActiveClient(c); setPage("client"); setTab("synthese"); }}
                    style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${col}18`, border: `1.5px solid ${col}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: col }}>{initials(c.nom)}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{c.nom}</div>
                          <div style={{ fontSize: 10, color: "#555" }}>{c.age ? `${c.age} ans` : "—"}</div>
                        </div>
                      </div>
                      <div className="tag" style={{ background: st.bg, color: st.text }}>
                        <div style={{ width: 4, height: 4, borderRadius: "50%", background: st.dot, marginRight: 5 }} />{c.statut}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#555" }}>Mensualité : <span style={{ color: col }}>{fmt(c.mensualite)}</span></div>
                  </div>
                );
              })}
              {clients.length === 0 && <div style={{ color: "#444", fontSize: 13, gridColumn: "1/-1" }}>Aucun client. Ajoute ton premier client.</div>}
            </div>
          </div>
        )}

        {page === "client" && activeClient && (() => {
          const st = statutStyle[activeClient.statut] || statutStyle["En bonne voie"];
          return (
            <>
              <div style={{ padding: "18px 32px", borderBottom: "1px solid #1A1A1E", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#0C0C0E", zIndex: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${color}18`, border: `2px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color }}>{initials(activeClient.nom)}</div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20 }}>{activeClient.nom}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>{activeClient.age ? `${activeClient.age} ans` : ""}{activeClient.date_debut ? ` · Suivi depuis ${activeClient.date_debut}` : ""}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="tag" style={{ background: st.bg, color: st.text }}><div style={{ width: 4, height: 4, borderRadius: "50%", background: st.dot, marginRight: 5 }} />{activeClient.statut}</div>
                  <button className="btn" onClick={() => openModal("client_edit")} style={{ padding: "5px 12px", background: "#141416", border: "1px solid #222", borderRadius: 7, cursor: "pointer", color: "#777", fontSize: 11 }}>Modifier</button>
                  <button className="btn" onClick={delClient} style={{ padding: "5px 12px", background: "#141416", border: "1px solid #222", borderRadius: 7, cursor: "pointer", color: "#E07A7A", fontSize: 11 }}>Supprimer</button>
                </div>
              </div>

              <div style={{ padding: "0 32px", borderBottom: "1px solid #1A1A1E", display: "flex" }}>
                {[["synthese", "Synthèse"], ["objectifs", "Objectifs"], ["evolution", "Évolution"], ["notes", "Notes"]].map(([k, l]) => (
                  <button key={k} className="tb" onClick={() => setTab(k)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "13px 18px", fontSize: 12, fontWeight: 500, color: tab === k ? color : "#444", borderBottom: tab === k ? `2px solid ${color}` : "2px solid transparent" }}>
                    {l}
                  </button>
                ))}
              </div>

              <div style={{ padding: "24px 32px", flex: 1 }}>
                {tab === "synthese" && (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
                      {[{ label: "Patrimoine total", val: fmt(patrimoineActuel) }, { label: "Mensualité", val: fmt(activeClient.mensualite) }, { label: "Produits", val: produits.length }].map((k, i) => (
                        <div key={i} style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 10, padding: "14px 16px" }}>
                          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 5 }}>{k.label}</div>
                          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24 }}>{k.val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 16 }}>
                      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
                        <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>Répartition</div>
                        {parCategorie.length > 0 ? <>
                          <ResponsiveContainer width="100%" height={140}><PieChart><Pie data={parCategorie} dataKey="value" innerRadius={40} outerRadius={62} paddingAngle={3}>{parCategorie.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1A1A1E", border: "none", borderRadius: 6, fontSize: 11 }} /></PieChart></ResponsiveContainer>
                          {parCategorie.map((c, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: c.color }} /><span style={{ fontSize: 11, color: "#777" }}>{c.name}</span></div><span style={{ fontSize: 11, color: "#999" }}>{fmt(c.value)}</span></div>)}
                        </> : <div style={{ color: "#444", fontSize: 12, textAlign: "center", paddingTop: 20 }}>Aucun produit</div>}
                      </div>
                      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em" }}>Produits</div>
                          <button className="btn" onClick={() => openModal("produit_new")} style={{ padding: "5px 12px", background: color, border: "none", borderRadius: 6, cursor: "pointer", color: "#0C0C0E", fontSize: 10, fontWeight: 600 }}>+ Ajouter</button>
                        </div>
                        {produits.length === 0 && <div style={{ color: "#444", fontSize: 12 }}>Aucun produit</div>}
                        {CATEGORIES.map(cat => { const prods = produits.filter(p => p.categorie === cat); if (!prods.length) return null; return (
                          <div key={cat} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 9, color: CAT_COLORS[cat], textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 }}>{cat}</div>
                            {prods.map(p => { const last = avoirs.filter(a => a.produit_id === p.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0]; return (
                              <div key={p.id} className="row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "#141416", borderRadius: 8, marginBottom: 3, transition: "background 0.15s" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: CAT_COLORS[cat] }} />
                                  <span style={{ fontSize: 12, color: "#CCC" }}>{p.nom}</span>
                                  {last && <span style={{ fontSize: 10, color: "#555" }}>· {fmtDate(last.date)}</span>}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 13, fontWeight: 500 }}>{last ? fmt(last.montant) : "—"}</span>
                                  <button onClick={() => openModal("avoir_new", { produit_id: p.id, produit_nom: p.nom })} style={{ padding: "3px 8px", background: `${color}20`, border: `1px solid ${color}40`, borderRadius: 5, cursor: "pointer", color, fontSize: 10 }}>+ Avoir</button>
                                  <button onClick={() => delProduit(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#E07A7A", fontSize: 11 }}>✕</button>
                                </div>
                              </div>
                            ); })}
                          </div>
                        ); })}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "objectifs" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20 }}>Objectifs</div>
                      <button className="btn" onClick={() => openModal("objectif_new")} style={{ padding: "8px 16px", background: color, border: "none", borderRadius: 8, cursor: "pointer", color: "#0C0C0E", fontSize: 11, fontWeight: 600 }}>+ Nouvel objectif</button>
                    </div>
                    {objectifs.length === 0 && <div style={{ color: "#444", fontSize: 13 }}>Aucun objectif défini.</div>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {objectifs.map((obj, oi) => {
                        const objJalons = jalons.filter(j => j.objectif_id === obj.id);
                        const likedIds = objProduits.filter(op => op.objectif_id === obj.id).map(op => op.produit_id);
                        const likedProds = produits.filter(p => likedIds.includes(p.id));
                        const patObj = patrimoineObjectif(obj.id);
                        const prog = pct(patObj, obj.montant_cible);
                        const ocol = COLORS[(oi + 1) % COLORS.length];
                        return (
                          <div key={obj.id} style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, overflow: "hidden" }}>
                            <div style={{ padding: "18px 20px", borderBottom: "1px solid #1A1A1E" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                                <div><div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>{obj.nom}</div>{obj.description && <div style={{ fontSize: 11, color: "#666" }}>{obj.description}</div>}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: ocol }}>{fmt(obj.montant_cible)}</div>
                                  <button onClick={() => delObjectif(obj.id)} style={{ padding: "4px 8px", background: "none", border: "1px solid #2A2A2A", borderRadius: 6, cursor: "pointer", color: "#E07A7A", fontSize: 10 }}>✕</button>
                                </div>
                              </div>
                              <div style={{ marginBottom: 10 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                  <span style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.12em" }}>Produits liés</span>
                                  <button onClick={() => openModal("lier_produit", { objectif_id: obj.id, selectedProduits: likedIds })} style={{ padding: "2px 8px", background: `${ocol}15`, border: `1px solid ${ocol}30`, borderRadius: 5, cursor: "pointer", color: ocol, fontSize: 10 }}>Gérer</button>
                                </div>
                                {likedProds.length === 0 ? <div style={{ fontSize: 11, color: "#444", fontStyle: "italic" }}>Aucun produit lié</div> :
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{likedProds.map(p => <div key={p.id} style={{ padding: "3px 10px", background: `${CAT_COLORS[p.categorie]}15`, border: `1px solid ${CAT_COLORS[p.categorie]}30`, borderRadius: 20, fontSize: 11, color: CAT_COLORS[p.categorie] }}>{p.nom} — {fmt(lastAvoir(p.id))}</div>)}</div>}
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", marginBottom: 5 }}><span>{fmt(patObj)} liés</span><span style={{ color: ocol }}>{prog}%</span></div>
                              <div style={{ background: "#1A1A1E", borderRadius: 3, height: 5 }}><div style={{ width: `${prog}%`, height: "100%", background: ocol, borderRadius: 3 }} /></div>
                            </div>
                            <div style={{ padding: "14px 20px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em" }}>Jalons ({objJalons.length})</div>
                                <button className="btn" onClick={() => openModal("jalon_new", { objectif_id: obj.id })} style={{ padding: "4px 10px", background: `${ocol}15`, border: `1px solid ${ocol}30`, borderRadius: 6, cursor: "pointer", color: ocol, fontSize: 10 }}>+ Jalon</button>
                              </div>
                              {objJalons.length === 0 && <div style={{ color: "#444", fontSize: 11 }}>Aucun jalon</div>}
                              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                {objJalons.map((j, ji) => { const done = patObj >= (j.montant_cible || 0); return (
                                  <div key={j.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 12px", background: "#141416", borderRadius: 8 }}>
                                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? `${ocol}20` : "#1A1A1E", border: `1.5px solid ${done ? ocol : "#2A2A2A"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: done ? ocol : "#555", flexShrink: 0, marginTop: 1 }}>{done ? "✓" : ji + 1}</div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 12, color: done ? "#E2DDD6" : "#888" }}>{j.nom}</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                          {j.montant_cible > 0 && <span style={{ fontSize: 11, color: ocol }}>{fmt(j.montant_cible)}</span>}
                                          <button onClick={() => delJalon(j.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 11 }}>✕</button>
                                        </div>
                                      </div>
                                      {j.produit_lie && <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>📦 {j.produit_lie}</div>}
                                      {j.moyens && <div style={{ fontSize: 10, color: "#555", marginTop: 2, fontStyle: "italic" }}>→ {j.moyens}</div>}
                                    </div>
                                  </div>
                                ); })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {tab === "evolution" && (
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 20 }}>Évolution</div>
                    {timeline.length < 2
                      ? <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 28, color: "#555", fontSize: 13, textAlign: "center" }}>Ajoute des avoirs à différentes dates pour voir l'évolution</div>
                      : <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 24, marginBottom: 16 }}>
                          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 18 }}>Patrimoine total</div>
                          <ResponsiveContainer width="100%" height={240}><AreaChart data={timeline}><defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.25} /><stop offset="95%" stopColor={color} stopOpacity={0} /></linearGradient></defs><XAxis dataKey="date" tick={{ fill: "#444", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#444", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} /><Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1A1A1E", border: "none", borderRadius: 6, fontSize: 11 }} /><Area type="monotone" dataKey="total" stroke={color} strokeWidth={2} fill="url(#grad)" dot={{ fill: color, r: 3 }} /></AreaChart></ResponsiveContainer>
                        </div>}
                    {produits.length > 0 && (
                      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 24 }}>
                        <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>Par produit</div>
                        {produits.map((p, pi) => { const pA = avoirs.filter(a => a.produit_id === p.id).sort((a, b) => new Date(a.date) - new Date(b.date)); if (!pA.length) return null; const pc = COLORS[pi % COLORS.length]; return (
                          <div key={p.id} style={{ marginBottom: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                              <div style={{ width: 6, height: 6, borderRadius: "50%", background: pc }} />
                              <span style={{ fontSize: 11, color: "#888" }}>{p.nom}</span>
                              <span style={{ padding: "2px 8px", background: `${CAT_COLORS[p.categorie]}15`, borderRadius: 20, fontSize: 10, color: CAT_COLORS[p.categorie] }}>{p.categorie}</span>
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {pA.map((a, ai) => <div key={ai} style={{ padding: "6px 12px", background: "#141416", borderRadius: 8 }}><div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>{fmtDate(a.date)}</div><div style={{ fontSize: 12, color: pc, fontWeight: 500 }}>{fmt(a.montant)}</div></div>)}
                            </div>
                          </div>
                        ); })}
                      </div>
                    )}
                  </div>
                )}

                {tab === "notes" && (
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 20 }}>Notes & suivi</div>
                    <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                      <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Résumé du rendez-vous, décision prise..."
                        style={{ width: "100%", minHeight: 90, background: "#141416", border: "1px solid #222", borderRadius: 8, padding: "10px 12px", color: "#CCC", fontSize: 13, lineHeight: 1.6, resize: "none", fontFamily: "inherit" }} />
                      <button className="btn" onClick={addNote} style={{ marginTop: 10, padding: "9px 20px", background: color, border: "none", borderRadius: 7, cursor: "pointer", color: "#0C0C0E", fontSize: 12, fontWeight: 600 }}>Enregistrer</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {clientNotes.length === 0 && <div style={{ color: "#444", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Aucune note</div>}
                      {clientNotes.map((n, i) => <div key={i} style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderLeft: `3px solid ${color}50`, borderRadius: "0 10px 10px 0", padding: "14px 18px" }}><div style={{ fontSize: 10, color, marginBottom: 6 }}>{n.date}</div><div style={{ fontSize: 13, color: "#AAA", lineHeight: 1.6 }}>{n.texte}</div></div>)}
                    </div>
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* MODALS */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#0F0F11", border: "1px solid #222", borderRadius: 14, padding: 28, width: modal.type === "lier_produit" ? 380 : 420, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 20 }}>{{ client_new: "Nouveau client", client_edit: "Modifier", produit_new: "Nouveau produit", avoir_new: `Avoir — ${modal.produit_nom || ""}`, objectif_new: "Nouvel objectif", jalon_new: "Nouveau jalon", lier_produit: "Produits liés" }[modal.type]}</div>
            {(modal.type === "client_new" || modal.type === "client_edit") && <>{inp("nom", "Nom complet *", "text", "Sophie Martin")}{inp("age", "Âge", "number", "32")}{inp("mensualite", "Mensualité (€)", "number", "800")}{inp("date_debut", "Suivi depuis", "text", "Jan 2024")}<div style={{ marginBottom: 20 }}><div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Statut</div><select value={form.statut || "En bonne voie"} onChange={e => f("statut", e.target.value)} style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12 }}>{STATUTS.map(s => <option key={s}>{s}</option>)}</select></div></>}
            {modal.type === "produit_new" && <>{inp("nom", "Nom du produit *", "text", "Livret A, PEA...")}<div style={{ marginBottom: 20 }}><div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Catégorie</div><select value={form.categorie || "Épargne"} onChange={e => f("categorie", e.target.value)} style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12 }}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div></>}
            {modal.type === "avoir_new" && <>{inp("montant", "Montant (€) *", "number", "12000")}<div style={{ marginBottom: 20 }}><div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Date *</div><input type="date" value={form.date || ""} onChange={e => f("date", e.target.value)} style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} /></div></>}
            {modal.type === "objectif_new" && <>{inp("nom", "Nom *", "text", "Retraite anticipée")}{inp("montant_cible", "Montant cible (€) *", "number", "300000")}{inp("description", "Description", "text", "Partir à 55 ans")}</>}
            {modal.type === "jalon_new" && <>{inp("nom", "Nom *", "text", "Ouvrir un PEA")}{inp("montant_cible", "Montant cible (€)", "number", "10000")}{inp("produit_lie", "Produit associé", "text", "PEA Bourse Direct")}{inp("moyens", "Moyens", "text", "200€/mois dès janvier")}</>}
            {modal.type === "lier_produit" && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>Coche les produits qui contribuent à cet objectif :</div>
                {produits.length === 0 && <div style={{ color: "#555", fontSize: 12 }}>Aucun produit disponible.</div>}
                {CATEGORIES.map(cat => { const prods = produits.filter(p => p.categorie === cat); if (!prods.length) return null; return (
                  <div key={cat} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: CAT_COLORS[cat], textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>{cat}</div>
                    {prods.map(p => { const checked = (modal.selectedProduits || []).includes(p.id); return (
                      <div key={p.id} onClick={() => { const cur = modal.selectedProduits || []; const next = checked ? cur.filter(id => id !== p.id) : [...cur, p.id]; setModal(m => ({ ...m, selectedProduits: next })); }}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: checked ? `${CAT_COLORS[cat]}10` : "#141416", border: `1px solid ${checked ? CAT_COLORS[cat] + "40" : "#1A1A1E"}`, borderRadius: 8, marginBottom: 4, cursor: "pointer" }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: checked ? CAT_COLORS[cat] : "#1A1A1E", border: `1.5px solid ${checked ? CAT_COLORS[cat] : "#333"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#0C0C0E", flexShrink: 0 }}>{checked ? "✓" : ""}</div>
                        <span style={{ fontSize: 12, color: checked ? "#E2DDD6" : "#888" }}>{p.nom}</span>
                        <span style={{ fontSize: 11, color: "#555", marginLeft: "auto" }}>{fmt(lastAvoir(p.id))}</span>
                      </div>
                    ); })}
                  </div>
                ); })}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={save} disabled={saving} style={{ flex: 1, padding: 10, background: "#C9A96E", border: "none", borderRadius: 8, cursor: "pointer", color: "#0C0C0E", fontSize: 12, fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
              <button onClick={() => setModal(null)} style={{ padding: "10px 16px", background: "#141416", border: "1px solid #222", borderRadius: 8, cursor: "pointer", color: "#777", fontSize: 12 }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════
//  VUE CLIENT (lecture seule)
// ════════════════════════════════════
function ClientApp({ db, client, onLogout }) {
  const [produits, setProduits] = useState([]);
  const [avoirs, setAvoirs] = useState([]);
  const [objectifs, setObjectifs] = useState([]);
  const [jalons, setJalons] = useState([]);
  const [objProduits, setObjProduits] = useState([]);
  const [tab, setTab] = useState("synthese");
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (client && db) loadData(); }, [client?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const [p, a, o] = await Promise.all([
        db.get("produits", `select=*&client_id=eq.${client.id}`),
        db.get("avoirs", `select=*&client_id=eq.${client.id}&order=date`),
        db.get("objectifs", `select=*&client_id=eq.${client.id}`),
      ]);
      setProduits(p); setAvoirs(a); setObjectifs(o);
      if (o.length > 0) {
        const ids = o.map(x => x.id).join(",");
        const [j, op] = await Promise.all([
          db.get("jalons", `select=*&objectif_id=in.(${ids})`),
          db.get("objectif_produits", `select=*&objectif_id=in.(${ids})`),
        ]);
        setJalons(j); setObjProduits(op);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (!client) return (
    <div style={{ minHeight: "100vh", background: "#0C0C0E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", color: "#555", flexDirection: "column", gap: 16 }}>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: "#C9A96E" }}>Patrimoine</div>
      <div style={{ fontSize: 13 }}>Aucun profil trouvé. Contacte ton conseiller.</div>
      <button onClick={onLogout} style={{ padding: "8px 20px", background: "#141416", border: "1px solid #222", borderRadius: 8, cursor: "pointer", color: "#777", fontSize: 12, fontFamily: "inherit" }}>Déconnexion</button>
    </div>
  );

  const lastAvoir = pid => { const a = avoirs.filter(a => a.produit_id === pid).sort((a, b) => new Date(b.date) - new Date(a.date)); return a[0]?.montant || 0; };
  const patrimoineTotal = produits.reduce((s, p) => s + lastAvoir(p.id), 0);
  const patrimoineObj = oid => { const ids = objProduits.filter(op => op.objectif_id === oid).map(op => op.produit_id); return produits.filter(p => ids.includes(p.id)).reduce((s, p) => s + lastAvoir(p.id), 0); };
  const parCategorie = CATEGORIES.map(cat => ({ name: cat, value: produits.filter(p => p.categorie === cat).reduce((s, p) => s + lastAvoir(p.id), 0), color: CAT_COLORS[cat] })).filter(c => c.value > 0);
  const timeline = (() => {
    const byDate = {}; avoirs.forEach(a => { if (!byDate[a.date]) byDate[a.date] = {}; byDate[a.date][a.produit_id] = a.montant; });
    const dates = Object.keys(byDate).sort(); const lk = {};
    return dates.map(d => { produits.forEach(p => { if (byDate[d][p.id] !== undefined) lk[p.id] = byDate[d][p.id]; }); return { date: fmtDate(d), total: Object.values(lk).reduce((s, v) => s + v, 0) }; });
  })();
  const st = statutStyle[client.statut] || statutStyle["En bonne voie"];
  const color = "#C9A96E";

  return (
    <div style={{ minHeight: "100vh", background: "#0C0C0E", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: "#E2DDD6" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Cormorant+Garamond:wght@400;500;600&display=swap'); *{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:#2A2A2A;border-radius:2px} .tb:hover{color:#E2DDD6!important} .tag{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:500}`}</style>

      {/* Header */}
      <div style={{ padding: "18px 32px", borderBottom: "1px solid #1A1A1E", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0F0F11" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: "#C9A96E", marginRight: 8 }}>Patrimoine</div>
          <div style={{ width: 1, height: 20, background: "#222" }} />
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${color}18`, border: `1.5px solid ${color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color }}>{initials(client.nom)}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{client.nom}</div>
            <div style={{ fontSize: 10, color: "#555" }}>Mon espace patrimonial</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="tag" style={{ background: st.bg, color: st.text }}><div style={{ width: 4, height: 4, borderRadius: "50%", background: st.dot, marginRight: 5 }} />{client.statut}</div>
          <button onClick={onLogout} style={{ padding: "6px 14px", background: "#141416", border: "1px solid #222", borderRadius: 8, cursor: "pointer", color: "#666", fontSize: 11, fontFamily: "inherit" }}>Déconnexion</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 32px", borderBottom: "1px solid #1A1A1E", display: "flex", background: "#0F0F11" }}>
        {[["synthese", "Mon patrimoine"], ["objectifs", "Mes objectifs"], ["evolution", "Mon évolution"]].map(([k, l]) => (
          <button key={k} className="tb" onClick={() => setTab(k)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "13px 18px", fontSize: 12, fontWeight: 500, color: tab === k ? color : "#444", borderBottom: tab === k ? `2px solid ${color}` : "2px solid transparent", fontFamily: "inherit" }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <div style={{ padding: 32, color: "#555" }}>Chargement...</div> : (
        <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>

          {tab === "synthese" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 20 }}>
                {[{ label: "Patrimoine total", val: fmt(patrimoineTotal) }, { label: "Épargne mensuelle", val: fmt(client.mensualite) }].map((k, i) => (
                  <div key={i} style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: "18px 20px" }}>
                    <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>{k.label}</div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: "#E2DDD6" }}>{k.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
                <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>Répartition</div>
                  {parCategorie.length > 0 ? <>
                    <ResponsiveContainer width="100%" height={140}><PieChart><Pie data={parCategorie} dataKey="value" innerRadius={40} outerRadius={62} paddingAngle={3}>{parCategorie.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1A1A1E", border: "none", borderRadius: 6, fontSize: 11 }} /></PieChart></ResponsiveContainer>
                    {parCategorie.map((c, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: c.color }} /><span style={{ fontSize: 11, color: "#777" }}>{c.name}</span></div><span style={{ fontSize: 11, color: "#999" }}>{fmt(c.value)}</span></div>)}
                  </> : <div style={{ color: "#444", fontSize: 12, textAlign: "center", paddingTop: 20 }}>Aucun produit</div>}
                </div>
                <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>Mes produits</div>
                  {CATEGORIES.map(cat => { const prods = produits.filter(p => p.categorie === cat); if (!prods.length) return null; return (
                    <div key={cat} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 9, color: CAT_COLORS[cat], textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 }}>{cat}</div>
                      {prods.map(p => { const last = avoirs.filter(a => a.produit_id === p.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0]; return (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "#141416", borderRadius: 8, marginBottom: 3 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: CAT_COLORS[cat] }} /><span style={{ fontSize: 12, color: "#CCC" }}>{p.nom}</span>{last && <span style={{ fontSize: 10, color: "#555" }}>· {fmtDate(last.date)}</span>}</div>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{last ? fmt(last.montant) : "—"}</span>
                        </div>
                      ); })}
                    </div>
                  ); })}
                </div>
              </div>
            </div>
          )}

          {tab === "objectifs" && (
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 20 }}>Mes objectifs</div>
              {objectifs.length === 0 && <div style={{ color: "#444", fontSize: 13 }}>Aucun objectif défini par ton conseiller.</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {objectifs.map((obj, oi) => {
                  const objJalons = jalons.filter(j => j.objectif_id === obj.id);
                  const likedIds = objProduits.filter(op => op.objectif_id === obj.id).map(op => op.produit_id);
                  const likedProds = produits.filter(p => likedIds.includes(p.id));
                  const patObj = patrimoineObj(obj.id);
                  const prog = pct(patObj, obj.montant_cible);
                  const ocol = COLORS[(oi + 1) % COLORS.length];
                  return (
                    <div key={obj.id} style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ padding: "18px 20px", borderBottom: "1px solid #1A1A1E" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div><div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>{obj.nom}</div>{obj.description && <div style={{ fontSize: 11, color: "#666" }}>{obj.description}</div>}</div>
                          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: ocol }}>{fmt(obj.montant_cible)}</div>
                        </div>
                        {likedProds.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>{likedProds.map(p => <div key={p.id} style={{ padding: "3px 10px", background: `${CAT_COLORS[p.categorie]}15`, border: `1px solid ${CAT_COLORS[p.categorie]}30`, borderRadius: 20, fontSize: 11, color: CAT_COLORS[p.categorie] }}>{p.nom} — {fmt(lastAvoir(p.id))}</div>)}</div>}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", marginBottom: 5 }}><span>{fmt(patObj)} accumulés</span><span style={{ color: ocol, fontWeight: 600 }}>{prog}%</span></div>
                        <div style={{ background: "#1A1A1E", borderRadius: 3, height: 6 }}><div style={{ width: `${prog}%`, height: "100%", background: ocol, borderRadius: 3 }} /></div>
                      </div>
                      {objJalons.length > 0 && (
                        <div style={{ padding: "14px 20px" }}>
                          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 }}>Jalons</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {objJalons.map((j, ji) => { const done = patObj >= (j.montant_cible || 0); return (
                              <div key={j.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 12px", background: "#141416", borderRadius: 8 }}>
                                <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? `${ocol}20` : "#1A1A1E", border: `1.5px solid ${done ? ocol : "#2A2A2A"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: done ? ocol : "#555", flexShrink: 0, marginTop: 1 }}>{done ? "✓" : ji + 1}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: 12, color: done ? "#E2DDD6" : "#888" }}>{j.nom}</span>
                                    {j.montant_cible > 0 && <span style={{ fontSize: 11, color: ocol }}>{fmt(j.montant_cible)}</span>}
                                  </div>
                                  {j.produit_lie && <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>📦 {j.produit_lie}</div>}
                                  {j.moyens && <div style={{ fontSize: 10, color: "#555", marginTop: 2, fontStyle: "italic" }}>→ {j.moyens}</div>}
                                </div>
                              </div>
                            ); })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "evolution" && (
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 20 }}>Mon évolution</div>
              {timeline.length < 2
                ? <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 28, color: "#555", fontSize: 13, textAlign: "center" }}>Les données d'évolution apparaîtront ici au fil du temps</div>
                : <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 24 }}>
                    <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 18 }}>Évolution du patrimoine</div>
                    <ResponsiveContainer width="100%" height={260}><AreaChart data={timeline}><defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.25} /><stop offset="95%" stopColor={color} stopOpacity={0} /></linearGradient></defs><XAxis dataKey="date" tick={{ fill: "#444", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#444", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} /><Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1A1A1E", border: "none", borderRadius: 6, fontSize: 11 }} /><Area type="monotone" dataKey="total" stroke={color} strokeWidth={2} fill="url(#grad)" dot={{ fill: color, r: 3 }} /></AreaChart></ResponsiveContainer>
                  </div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
