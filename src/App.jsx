import React, { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const SB_URL = "https://paagozsbjjwznrbuytvr.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYWdvenNiamp3em5yYnV5dHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjcxNzUsImV4cCI6MjA5MDcwMzE3NX0.WWQeWjDEq6r3HgSYRAtE8eXk34YQYXc5UZ07cvR_b1I";
const ADMIN_EMAIL = "robin.kowalczuk@gmail.com";
const FINNHUB_KEY = "d79a0r9r01qqpmhg0acgd79a0r9r01qqpmhg0ad0";

const authHeaders = (token) => ({
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": `Bearer ${token || SB_KEY}`,
});

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
    await fetch(`${SB_URL}/auth/v1/logout`, { method: "POST", headers: authHeaders(token) });
  },
};

const sb = (token, onUnauthorized) => ({
  get: async (table, query = "") => {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, { headers: authHeaders(token) });
    if (r.status === 401) { onUnauthorized?.(); return []; }
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  post: async (table, body) => {
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: "POST", headers: { ...authHeaders(token), "Prefer": "return=representation" },
      body: JSON.stringify(body),
    });
    if (r.status === 401) { onUnauthorized?.(); throw new Error("Session expirée"); }
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  patch: async (table, id, body) => {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH", headers: { ...authHeaders(token), "Prefer": "return=representation" },
      body: JSON.stringify(body),
    });
    if (r.status === 401) { onUnauthorized?.(); throw new Error("Session expirée"); }
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  del: async (table, id) => {
    const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE", headers: authHeaders(token),
    });
    if (r.status === 401) { onUnauthorized?.(); throw new Error("Session expirée"); }
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
const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "--";
const initials = n => n ? n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?";
const pct = (a, b) => b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0;

const EMPTY_CLIENT = { nom: "", statut: "En bonne voie", date_debut: "", patrimoine_cible: "" };
const EMPTY_PRODUIT = { nom: "", categorie: "Épargne" };
const EMPTY_AVOIR = { montant: "", date: new Date().toISOString().split("T")[0] };
const EMPTY_OBJECTIF = { nom: "", montant_cible: "", description: "" };
const EMPTY_JALON = { nom: "", montant_cible: "", produit_lie: "", moyens: "" };
const EMPTY_BUDGET = { nom: "", montant: "" };

const ALL_TABS = ["identification","synthese","objectifs","immobilier","impots","bourse","dividendes","budget","simulateur","notes","informations"];
const TAB_LABELS = { identification:"Identification", synthese:"Synthèse", objectifs:"Objectifs", simulateur:"Simulateur", immobilier:"Immobilier", impots:"Impôts", bourse:"Bourse", dividendes:"Dividendes", budget:"Budget", notes:"Notes", informations:"Informations" };
const CLIENT_TAB_LABELS = { identification:"Mon profil", synthese:"Mon patrimoine", objectifs:"Mes objectifs", simulateur:"Simulateur", immobilier:"Immobilier", impots:"Impôts", bourse:"Ma bourse", dividendes:"Mes dividendes", budget:"Mon budget", notes:"Notes", informations:"Informations" };

function getAge(dateNaissance) {
  if (!dateNaissance) return null;
  const today = new Date();
  const birth = new Date(dateNaissance);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ══════════════════════════════════════
//  SHARED STYLES
// ══════════════════════════════════════
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Cormorant+Garamond:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#2A2A2A;border-radius:2px}
  .cr:hover{background:#181818!important}.tb:hover{color:#E2DDD6!important}.btn:hover{opacity:0.8}.row:hover{background:#1A1A1E!important}
  input,select,textarea{font-family:inherit;font-size:16px!important}input:focus,select:focus,textarea:focus{outline:none;border-color:#444!important}
  .tag{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:500}
  .app-layout{display:flex;min-height:100vh}
  .sidebar{width:240px;flex-shrink:0;transition:transform 0.3s ease}
  .main-content{flex:1;overflow-y:auto;min-width:0;display:flex;flex-direction:column}
  .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
  .grid-split{display:grid;grid-template-columns:1fr 2fr;gap:16px}
  .grid-budget{display:grid;grid-template-columns:2fr 1fr;gap:16px}
  .tabs-row{display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .tabs-row::-webkit-scrollbar{display:none}
  .page-pad{padding:24px 32px}
  .header-pad{padding:18px 32px}
  .mob-btn{display:none;background:none;border:none;cursor:pointer;color:#C9A96E;font-size:22px;padding:4px 8px;font-family:inherit}
  .overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:40}
  .recharts-tooltip-label { color: #E2DDD6 !important; }
  .recharts-tooltip-item { color: #E2DDD6 !important; }
  .recharts-default-tooltip { color: #E2DDD6 !important; }
  @media(max-width:768px){
    .app-layout{flex-direction:column}
    .sidebar{position:fixed;left:0;top:0;bottom:0;z-index:50;transform:translateX(-100%);width:260px}
    .sidebar.open{transform:translateX(0)!important}
    .overlay.open{display:block}
    .mob-btn{display:block}
    .main-content{width:100%}
    .grid-3{grid-template-columns:1fr}
    .grid-2{grid-template-columns:1fr}
    .grid-split{grid-template-columns:1fr}
    .grid-budget{grid-template-columns:1fr}
    .page-pad{padding:14px 16px}
    .header-pad{padding:12px 16px}
    .hide-mob{display:none!important}
    .show-mob{display:block!important}
    .show-mob-flex{display:flex!important}
    .modal-box{width:92vw!important;max-width:420px!important}
  }
`;

// ══════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try { const s = await auth.login(email, password); onLogin(s); }
    catch (err) { setError(err.message); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0C0C0E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{CSS + `input:focus{border-color:#C9A96E!important}`}</style>
      <div style={{ width: 380, padding: 40, background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 16 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.25em", color: "#444", textTransform: "uppercase", marginBottom: 6 }}>Bienvenue sur</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, color: "#C9A96E", letterSpacing: "0.05em", marginBottom: 8 }}>Rob'Invest</div>
          <div style={{ fontSize: 12, color: "#555" }}>Connecte-toi pour accéder à ton espace</div>
        </div>
        <form onSubmit={handleLogin}>
          {[["email","Email","email","toi@email.fr"],["password","Mot de passe","password","••••••••"]].map(([k,l,t,ph]) => (
            <div key={k} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 6 }}>{l}</div>
              <input type={t} placeholder={ph} required value={k==="email"?email:password} onChange={e => k==="email"?setEmail(e.target.value):setPassword(e.target.value)}
                style={{ width:"100%",background:"#141416",border:"1px solid #222",borderRadius:8,padding:"11px 14px",color:"#CCC",fontSize:13,transition:"border-color 0.2s" }} />
            </div>
          ))}
          {error && <div style={{ background:"#2F1010",border:"1px solid #E07A7A30",borderRadius:8,padding:"10px 14px",color:"#E07A7A",fontSize:12,marginBottom:16 }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ width:"100%",padding:12,background:"#C9A96E",border:"none",borderRadius:8,cursor:loading?"not-allowed":"pointer",color:"#0C0C0E",fontSize:13,fontWeight:600,opacity:loading?0.7:1 }}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  ROOT
// ══════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  function handleLogin(s) {
    setSession(s);
    setIsAdmin((s.user?.email || "") === ADMIN_EMAIL);
    localStorage.setItem("rb_session", JSON.stringify(s));
  }

  function handleLogout() {
    setSession(null); setIsAdmin(false);
    localStorage.removeItem("rb_session");
  }

  // Vérifier si la session est encore valide
  function isSessionValid(s) {
    if (!s?.access_token || !s?.expires_at) return false;
    // expires_at est en secondes Unix
    const expiresAt = s.expires_at * 1000;
    return Date.now() < expiresAt;
  }

  useEffect(() => {
    const saved = localStorage.getItem("rb_session");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (isSessionValid(s)) {
          setSession(s);
          setIsAdmin((s.user?.email || "") === ADMIN_EMAIL);
        } else {
          // Session expirée → nettoyer et afficher le login
          localStorage.removeItem("rb_session");
        }
      } catch {
        localStorage.removeItem("rb_session");
      }
    }
  }, []);

  // Vérifier périodiquement si la session a expiré (toutes les minutes)
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      if (!isSessionValid(session)) {
        handleLogout();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [session]);

  // Intercepter les erreurs 401 pour déconnecter automatiquement
  const db = session ? sb(session.access_token, handleLogout) : null;

  if (!session) return <LoginPage onLogin={handleLogin} />;
  return isAdmin
    ? <AdminApp db={db} session={session} onLogout={handleLogout} />
    : <ClientApp db={db} userId={session.user?.id} onLogout={handleLogout} />;
}

// ══════════════════════════════════════
//  BUDGET SECTION (réutilisable)
// ══════════════════════════════════════
function BudgetSection({ db, clientId, isReadOnly }) {
  const [budgets, setBudgets] = useState([]);
  const [budgetType, setBudgetType] = useState("actuel");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_BUDGET);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (clientId) loadBudgets(); }, [clientId]);

  async function loadBudgets() {
    try { const b = await db.get("budgets", `select=*&client_id=eq.${clientId}`); setBudgets(b); } catch (e) { console.error(e); }
  }

  async function saveBudget() {
    if (!form.nom.trim() || !form.montant) return;
    setSaving(true);
    try {
      await db.post("budgets", { client_id: clientId, type: budgetType, categorie: modal.categorie, nom: form.nom, montant: parseFloat(form.montant) });
      await loadBudgets();
      setModal(null); setForm(EMPTY_BUDGET);
    } catch (e) { alert("Erreur : " + e.message); }
    setSaving(false);
  }

  async function delBudget(id) {
    try { await db.del("budgets", id); await loadBudgets(); } catch (e) { alert("Erreur : " + e.message); }
  }

  const b = budgets.filter(x => x.type === budgetType);
  const revenus = b.filter(x => x.categorie === "revenu");
  const fixes = b.filter(x => x.categorie === "depense_fixe");
  const variables = b.filter(x => x.categorie === "depense_variable");
  const virements = b.filter(x => x.categorie === "virement");
  const totalRevenus = revenus.reduce((s, x) => s + x.montant, 0);
  const totalFixes = fixes.reduce((s, x) => s + x.montant, 0);
  const totalVariables = variables.reduce((s, x) => s + x.montant, 0);
  const totalDepenses = totalFixes + totalVariables;
  const totalVirements = virements.reduce((s, x) => s + x.montant, 0);
  const epargne = totalRevenus - totalDepenses;

  const sectionColor = { "revenu": "#7C9B8A", "depense_fixe": "#E07A7A", "depense_variable": "#C9A96E", "virement": "#8B7BAB" };
  const sectionLabel = { "revenu": "Revenus", "depense_fixe": "Dépenses fixes", "depense_variable": "Dépenses variables", "virement": "Virements épargne / investissement" };

  function BudgetGroup({ categorie, items }) {
    const col = sectionColor[categorie];
    return (
      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: col }} />
            <span style={{ fontSize: 11, color: col, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500 }}>{sectionLabel[categorie]}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: col }}>{fmt(items.reduce((s,x)=>s+x.montant,0))}</span>
            {!isReadOnly && <button onClick={() => { setModal({ categorie }); setForm(EMPTY_BUDGET); }}
              style={{ padding:"4px 10px",background:`${col}20`,border:1px solid ${col}40`,borderRadius:6,cursor:"pointer",color:col,fontSize:10 }}>+ Ajouter</button>}
          </div>
        </div>
        {items.length === 0 && <div style={{ fontSize: 11, color: "#444", fontStyle: "italic" }}>Aucun élément</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map(item => (
            <div key={item.id} className="row" style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"#141416",borderRadius:8,transition:"background 0.15s" }}>
              <span style={{ fontSize: 12, color: "#CCC" }}>{item.nom}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#E2DDD6" }}>{fmt(item.montant)}</span>
                {!isReadOnly && <button onClick={() => delBudget(item.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#555",fontSize:11 }}>✕</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Bar chart data
  const chartData = [
    { name: "Revenus", val: totalRevenus, color: "#7C9B8A" },
    { name: "Dép. fixes", val: totalFixes, color: "#E07A7A" },
    { name: "Dép. var.", val: totalVariables, color: "#C9A96E" },
    { name: "Virements", val: totalVirements, color: "#8B7BAB" },
    { name: "Épargne dispo.", val: Math.max(0, epargne - totalVirements), color: "#6AAED4" },
  ];

  return (
    <div>
      {/* Toggle actuel / cible */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["actuel","cible"].map(t => (
          <button key={t} onClick={() => setBudgetType(t)}
            style={{ padding:"8px 20px",background:budgetType===t?"#C9A96E":"#141416",border:`1px solid ${budgetType===t?"#C9A96E":"#222"}`,borderRadius:8,cursor:"pointer",color:budgetType===t?"#0C0C0E":"#777",fontSize:12,fontWeight:budgetType===t?600:400,fontFamily:"inherit" }}>
            Budget {t === "actuel" ? "actuel" : "cible"}
          </button>
        ))}
      </div>

      <div className="grid-budget">
        <div>
          <BudgetGroup categorie="revenu" items={revenus} />
          <BudgetGroup categorie="depense_fixe" items={fixes} />
          <BudgetGroup categorie="depense_variable" items={variables} />

          {/* Épargne disponible */}
          <div style={{ background: epargne >= 0 ? "#1A2F1F" : "#2F1010", border: `1px solid ${epargne>=0?"#5EBF7A30":"#E07A7A30"}`, borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 9, color: epargne>=0?"#5EBF7A":"#E07A7A", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4 }}>Épargne disponible mensuelle</div>
              <div style={{ fontSize: 11, color: "#666" }}>Revenus ({fmt(totalRevenus)}) − Dépenses ({fmt(totalDepenses)})</div>
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, color: epargne>=0?"#5EBF7A":"#E07A7A" }}>{fmt(epargne)}</div>
          </div>

          {/* Virements épargne */}
          <BudgetGroup categorie="virement" items={virements} />

          {/* Épargne nette après virements */}
          {virements.length > 0 && (
            <div style={{ background: "#1A1A2F", border: "1px solid #8B7BAB30", borderRadius: 12, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <div>
                <div style={{ fontSize: 9, color: "#8B7BAB", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 3 }}>Épargne restante après virements</div>
                <div style={{ fontSize: 11, color: "#555" }}>{fmt(epargne)} − {fmt(totalVirements)} virements</div>
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: (epargne - totalVirements) >= 0 ? "#8B7BAB" : "#E07A7A" }}>
                {fmt(epargne - totalVirements)}
              </div>
            </div>
          )}
        </div>

        {/* Graphique */}
        <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>Visualisation</div>
          {totalRevenus > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={28}>
                <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#555", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v=>fmt(v)} contentStyle={{ background:"#1A1A1E",border:"none",borderRadius:6,fontSize:11,color:"#E2DDD6" }} />
                <Bar dataKey="val" radius={[4,4,0,0]}>{chartData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ color:"#444",fontSize:12,textAlign:"center",paddingTop:40 }}>Ajoute des revenus pour voir le graphique</div>}

          {/* Résumé chiffres */}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Total revenus", val: totalRevenus, color: "#7C9B8A" },
              { label: "Dépenses fixes", val: totalFixes, color: "#E07A7A" },
              { label: "Dépenses variables", val: totalVariables, color: "#C9A96E" },
              { label: "Virements épargne", val: totalVirements, color: "#8B7BAB" },
              { label: "Épargne nette dispo.", val: epargne - totalVirements, color: (epargne-totalVirements)>=0?"#6AAED4":"#E07A7A" },
            ].map((r,i) => (
              <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #1A1A1E" }}>
                <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:r.color }} />
                  <span style={{ fontSize:11,color:"#666" }}>{r.label}</span>
                </div>
                <span style={{ fontSize:12,fontWeight:500,color:r.color }}>{fmt(r.val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal ajout */}
      {modal && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200 }}>
          <div style={{ background:"#0F0F11",border:"1px solid #222",borderRadius:14,padding:28,width:360 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:20,marginBottom:20 }}>
              Ajouter -- {sectionLabel[modal.categorie]}
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10,color:"#555",marginBottom:5 }}>Libellé *</div>
              <input placeholder={modal.categorie==="revenu"?"Salaire, freelance...":"Loyer, abonnement..."} value={form.nom} onChange={e=>setForm(p=>({...p,nom:e.target.value}))}
                style={{ width:"100%",background:"#141416",border:"1px solid #222",borderRadius:7,padding:"9px 11px",color:"#CCC",fontSize:12 }} />
            </div>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:10,color:"#555",marginBottom:5 }}>Montant mensuel (€) *</div>
              <input type="number" placeholder="0" value={form.montant} onChange={e=>setForm(p=>({...p,montant:e.target.value}))}
                style={{ width:"100%",background:"#141416",border:"1px solid #222",borderRadius:7,padding:"9px 11px",color:"#CCC",fontSize:12 }} />
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={saveBudget} disabled={saving}
                style={{ flex:1,padding:10,background:"#C9A96E",border:"none",borderRadius:8,cursor:"pointer",color:"#0C0C0E",fontSize:12,fontWeight:600 }}>
                {saving?"...":"Enregistrer"}
              </button>
              <button onClick={()=>setModal(null)}
                style={{ padding:"10px 16px",background:"#141416",border:"1px solid #222",borderRadius:8,cursor:"pointer",color:"#777",fontSize:12 }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════
//  BOURSE SECTION
// ══════════════════════════════════════
function BourseSection({ db, clientId, isReadOnly }) {
  const [actions, setActions] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [modal, setModal] = useState(null); // null | "new" | "edit"
  const [editAction, setEditAction] = useState(null);
  const [form, setForm] = useState({ ticker: "", nom: "", nombre: "", prix_achat: "", date_achat: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [sortCol, setSortCol] = useState("nom");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => { if (clientId) loadActions(); }, [clientId]);

  async function loadActions() {
    try {
      const a = await db.get("actions", `select=*&client_id=eq.${clientId}`);
      setActions(a);
      if (a.length > 0) fetchQuotes(a);
    } catch(e) { console.error(e); }
  }

  async function fetchQuotes(acts) {
    setLoadingQuotes(true);
    const q = {};
    await Promise.all(acts.map(async (a) => {
      try {
        const ticker = encodeURIComponent(a.ticker);
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
        const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const r = await fetch(proxy);
        const raw = await r.json();
        const data = JSON.parse(raw.contents);
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) {
          const price = meta.regularMarketPrice;
          const prev = meta.chartPreviousClose || meta.previousClose || price;
          const change = prev > 0 ? ((price - prev) / prev * 100) : 0;
          q[a.ticker] = { price, change, prev };
        }
      } catch(e) { console.error("Quote error for", a.ticker, e); }
    }));
    setQuotes(q);
    setLoadingQuotes(false);
  }

  async function saveAction() {
    if (!form.ticker || !form.nombre) return;
    setSaving(true);
    try {
      if (modal === "edit" && editAction) {
        await db.patch("actions", editAction.id, {
          ticker: form.ticker.toUpperCase().trim(),
          nom: form.nom,
          nombre: parseFloat(form.nombre),
          prix_achat: parseFloat(form.prix_achat) || 0,
          date_achat: form.date_achat,
        });
      } else {
        await db.post("actions", {
          client_id: clientId,
          ticker: form.ticker.toUpperCase().trim(),
          nom: form.nom,
          nombre: parseFloat(form.nombre),
          prix_achat: parseFloat(form.prix_achat) || 0,
          date_achat: form.date_achat,
        });
      }
      await loadActions();
      setModal(null); setEditAction(null);
      setForm({ ticker: "", nom: "", nombre: "", prix_achat: "", date_achat: new Date().toISOString().split("T")[0] });
    } catch(e) { alert("Erreur : " + e.message); }
    setSaving(false);
  }

  function openEdit(a) {
    setEditAction(a);
    setForm({ ticker: a.ticker, nom: a.nom || "", nombre: a.nombre, prix_achat: a.prix_achat, date_achat: a.date_achat || new Date().toISOString().split("T")[0] });
    setModal("edit");
  }

  async function delAction(id) {
    if (!window.confirm("Supprimer cette position ?")) return;
    try { await db.del("actions", id); await loadActions(); } catch(e) { alert(e.message); }
  }

  const totalInvesti = actions.reduce((s, a) => s + a.nombre * a.prix_achat, 0);
  const totalValorise = actions.reduce((s, a) => {
    const q = quotes[a.ticker];
    return s + a.nombre * (q ? q.price : a.prix_achat);
  }, 0);
  const totalPV = totalValorise - totalInvesti;
  const totalPVPct = totalInvesti > 0 ? ((totalPV / totalInvesti) * 100).toFixed(2) : 0;
  const totalDividendes = 0; // moved to DividendesSection

  // Filter + sort
  const toggleSort = (col) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
  };
  const actionsFiltrees = actions
    .filter(a => filterText === "" ||
      (a.nom || "").toLowerCase().includes(filterText.toLowerCase()) ||
      a.ticker.toLowerCase().includes(filterText.toLowerCase())
    )
    .sort((a, b) => {
      let va, vb;
      if (sortCol === "nom") { va = a.nom || a.ticker; vb = b.nom || b.ticker; return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va); }
      if (sortCol === "ticker") { va = a.ticker; vb = b.ticker; return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va); }
      if (sortCol === "nombre") { va = a.nombre; vb = b.nombre; }
      if (sortCol === "prix_achat") { va = a.prix_achat; vb = b.prix_achat; }
      if (sortCol === "prix_actuel") { va = quotes[a.ticker]?.price || 0; vb = quotes[b.ticker]?.price || 0; }
      if (sortCol === "valeur") { va = a.nombre * (quotes[a.ticker]?.price || a.prix_achat); vb = b.nombre * (quotes[b.ticker]?.price || b.prix_achat); }
      if (sortCol === "pv") { va = (quotes[a.ticker]?.price || a.prix_achat) - a.prix_achat; vb = (quotes[b.ticker]?.price || b.prix_achat) - b.prix_achat; }
      return sortAsc ? va - vb : vb - va;
    });
  const SortBtn = ({ col, label }) => (
    <div onClick={() => toggleSort(col)} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 3, userSelect: "none" }}>
      <span style={{ fontSize: 9, color: sortCol === col ? "#C9A96E" : "#444", textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</span>
      <span style={{ fontSize: 8, color: sortCol === col ? "#C9A96E" : "#333" }}>{sortCol === col ? (sortAsc ? "↑" : "↓") : "↕"}</span>
    </div>
  );

  const pvColor = (pv) => pv >= 0 ? "#5EBF7A" : "#E07A7A";
  const fmt = n => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n || 0);
  const fmtPct = n => `${n >= 0 ? "+" : ""}${parseFloat(n).toFixed(2)}%`;

  return (
    <div>
      {/* KPIs */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: "Valeur investie", val: fmt(totalInvesti), color: "#E2DDD6" },
          { label: "Valorisation actuelle", val: fmt(totalValorise), color: totalPV >= 0 ? "#5EBF7A" : "#E07A7A" },
          { label: "Plus/Moins value", val: `${fmt(totalPV)} (${fmtPct(totalPVPct)})`, color: pvColor(totalPV) },
        ].map((k, i) => (
          <div key={i} style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>



      {/* Header table */}
      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #1A1A1E" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em" }}>
              Positions ({actionsFiltrees.length}/{actions.length}) {loadingQuotes && <span style={{ color: "#C9A96E", marginLeft: 8 }}>↻ Actualisation...</span>}
            </div>
            <input placeholder="🔍 Filtrer par nom ou ticker..." value={filterText} onChange={e => setFilterText(e.target.value)}
              style={{ padding: "5px 10px", background: "#0F0F11", border: "1px solid #222", borderRadius: 6, color: "#CCC", fontSize: 11, fontFamily: "inherit", width: 200 }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => fetchQuotes(actions)} style={{ padding: "5px 12px", background: "#141416", border: "1px solid #222", borderRadius: 6, cursor: "pointer", color: "#888", fontSize: 10 }}>↻ Actualiser</button>
            {!isReadOnly && <button onClick={() => { setEditAction(null); setForm({ ticker: "", nom: "", nombre: "", prix_achat: "", date_achat: new Date().toISOString().split("T")[0] }); setModal("new"); }} style={{ padding: "5px 12px", background: "#C9A96E", border: "none", borderRadius: 6, cursor: "pointer", color: "#0C0C0E", fontSize: 10, fontWeight: 600 }}>+ Ajouter</button>}
          </div>
        </div>

        {actions.length === 0 && (
          <div style={{ padding: 28, color: "#444", fontSize: 13, textAlign: "center" }}>
            Aucune position. {!isReadOnly && "Ajoute ta première action."}
          </div>
        )}

        {/* Desktop table header */}
        {actions.length > 0 && (
          <div className="hide-mob" style={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.5fr", padding: "8px 20px", borderBottom: "1px solid #1A1A1E" }}>
            {["Titre", "Ticker", "Qté", "Px achat", "Px actuel", "Valeur", "+/- Value"].map((h, i) => (
              <div key={i} style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.12em" }}>{h}</div>
            ))}
          </div>
        )}

        {actionsFiltrees.map((a) => {
          const q = quotes[a.ticker];
          const prixActuel = q ? q.price : null;
          const valeur = prixActuel ? a.nombre * prixActuel : null;
          const pv = prixActuel ? (prixActuel - a.prix_achat) * a.nombre : null;
          const pvPct = prixActuel ? ((prixActuel - a.prix_achat) / a.prix_achat * 100) : null;
          const col = pv !== null ? pvColor(pv) : "#888";

          return (
            <div key={a.id} className="row" style={{ borderBottom: "1px solid #1A1A1E", transition: "background 0.15s" }}>
              {/* Desktop row */}
              <div className="hide-mob" style={{ display: "grid", gridTemplateColumns: "1fr 0.6fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.5fr", padding: "12px 20px", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#E2DDD6" }}>{a.nom || a.ticker}</div>
                <div style={{ fontSize: 11, color: "#C9A96E", fontWeight: 600 }}>{a.ticker}</div>
                <div style={{ fontSize: 12, color: "#CCC" }}>{a.nombre}</div>
                <div style={{ fontSize: 12, color: "#CCC" }}>{fmt(a.prix_achat)}</div>
                <div style={{ fontSize: 12, color: prixActuel ? "#E2DDD6" : "#555" }}>{prixActuel ? fmt(prixActuel) : "--"}{q && <span style={{ fontSize: 9, color: pvColor(q.change), marginLeft: 4 }}>{fmtPct(q.change)}</span>}</div>
                <div style={{ fontSize: 12, color: "#E2DDD6" }}>{valeur ? fmt(valeur) : "--"}</div>
                <div style={{ fontSize: 12, color: col, fontWeight: 500 }}>{pv !== null ? `${fmt(pv)} (${fmtPct(pvPct)})` : "--"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {!isReadOnly && <>
                    <button onClick={() => openEdit(a)} style={{ padding: "3px 8px", background: "#1A1A1E", border: "1px solid #2A2A2A", borderRadius: 5, cursor: "pointer", color: "#888", fontSize: 10 }}>✏️</button>
                    <button onClick={() => delAction(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 11 }}>✕</button>
                  </>}
                </div>
              </div>

              {/* Mobile row */}
              <div className="show-mob-flex" style={{ padding: "12px 16px", flexDirection: "column" }}>
                <div style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#E2DDD6" }}>{a.nom || a.ticker}</div>
                      <div style={{ fontSize: 10, color: "#C9A96E" }}>{a.ticker} · {a.nombre} actions</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: prixActuel ? "#E2DDD6" : "#555" }}>{valeur ? fmt(valeur) : "--"}</div>
                      {pv !== null && <div style={{ fontSize: 11, color: col }}>{fmt(pv)} ({fmtPct(pvPct)})</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555" }}>
                    <span>Px achat : {fmt(a.prix_achat)}</span>
                    <span>Px actuel : {prixActuel ? fmt(prixActuel) : "--"}</span>

                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Note ticker */}
      <div style={{ fontSize: 10, color: "#444", marginTop: 10, fontStyle: "italic" }}>
        Exemples de tickers : AAPL (Apple), MC.PA (LVMH), TTE.PA (TotalEnergies), MSFT (Microsoft), AIR.PA (Airbus)
      </div>

      {/* Modal ajout/edit */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="modal-box" style={{ background: "#0F0F11", border: "1px solid #222", borderRadius: 14, padding: 28, width: 420, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 20 }}>{modal === "edit" ? "Modifier la position" : "Nouvelle position"}</div>
            {[
              ["ticker", "Ticker * (ex: AAPL, MC.PA)", "text", "AAPL"],
              ["nom", "Nom de l'entreprise", "text", "Apple Inc."],
              ["nombre", "Nombre d'actions *", "number", "10"],
              ["prix_achat", "Prix d'achat unitaire (€) *", "number", "150.00"],
            ].map(([k, l, t, ph]) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>{l}</div>
                <input type={t} placeholder={ph} value={form[k] || ""} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Date d'achat</div>
              <input type="date" value={form.date_achat} onChange={e => setForm(p => ({ ...p, date_achat: e.target.value }))}
                style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveAction} disabled={saving} style={{ flex: 1, padding: 10, background: "#C9A96E", border: "none", borderRadius: 8, cursor: "pointer", color: "#0C0C0E", fontSize: 12, fontWeight: 600 }}>{saving ? "..." : "Enregistrer"}</button>
              <button onClick={() => setModal(false)} style={{ padding: "10px 16px", background: "#141416", border: "1px solid #222", borderRadius: 8, cursor: "pointer", color: "#777", fontSize: 12 }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
//  IDENTIFICATION SECTION
// ══════════════════════════════════════
function IdentificationSection({ db, clientId, isReadOnly }) {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const formRef = React.useRef({});

  useEffect(() => { if (clientId) loadData(); }, [clientId]);

  async function loadData() {
    try {
      const d = await db.get("identification", `select=*&client_id=eq.${clientId}`);
      if (d.length > 0) { setData(d[0]); formRef.current = { ...d[0] }; }
      else { setData(null); formRef.current = { client_id: clientId }; }
    } catch(e) { console.error(e); }
  }

  async function saveData() {
    setSaving(true);
    try {
      // Exclure id et client_id du payload pour éviter l'erreur Supabase
      const { id, client_id, ...payload } = formRef.current;
      if (data) {
        await db.patch("identification", data.id, payload);
      } else {
        await db.post("identification", { ...payload, client_id: clientId });
      }
      await loadData();
      setEditing(false);
    } catch(e) { alert("Erreur : " + e.message); }
    setSaving(false);
  }

  const f = (k, v) => { formRef.current = { ...formRef.current, [k]: v }; };
  const fv = (k) => formRef.current[k] || "";
  const PROFILS = ["Prudent", "Modéré", "Équilibré", "Dynamique", "Agressif"];
  const HORIZONS = ["Court terme (< 3 ans)", "Moyen terme (3-7 ans)", "Long terme (> 7 ans)"];

  const Field = ({ label, value, icon = "" }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4 }}>{icon} {label}</div>
      <div style={{ fontSize: 13, color: value ? "#E2DDD6" : "#444", fontStyle: value ? "normal" : "italic" }}>{value || "Non renseigné"}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20 }}>Identification</div>
        <button onClick={() => setEditing(!editing)}
          style={{ padding: "7px 16px", background: editing ? "#1A1A1E" : "#C9A96E", border: editing ? "1px solid #333" : "none", borderRadius: 8, cursor: "pointer", color: editing ? "#777" : "#0C0C0E", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>
          {editing ? "Annuler" : "✏️ Modifier"}
        </button>
      </div>

      {editing ? (
        <div key="ident-edit">
          <div className="grid-2" style={{ marginBottom: 0 }}>
            <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, color: "#C9A96E", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>Informations personnelles</div>
              <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Date de naissance</div>
              <input type="date" placeholder="" defaultValue={fv("date_naissance")} onChange={e => f("date_naissance", e.target.value)}
                style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
            </div>
              <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Profession</div>
              <input type="text" placeholder="Ingénieur, Chef d'entreprise..." defaultValue={fv("profession")} onChange={e => f("profession", e.target.value)}
                style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
            </div>
              <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Situation personnelle</div>
              <input type="text" placeholder="Marié, 2 enfants..." defaultValue={fv("situation_personnelle")} onChange={e => f("situation_personnelle", e.target.value)}
                style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
            </div>
              <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Nombre d'enfants</div>
              <input type="number" placeholder="0" defaultValue={fv("nb_enfants")} onChange={e => f("nb_enfants", e.target.value)}
                style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
            </div>
              <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Téléphone</div>
              <input type="text" placeholder="+33 6 00 00 00 00" defaultValue={fv("telephone")} onChange={e => f("telephone", e.target.value)}
                style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
            </div>
              <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Email</div>
              <input type="email" placeholder="prenom@email.fr" defaultValue={fv("email")} onChange={e => f("email", e.target.value)}
                style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
            </div>
            </div>
            <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, color: "#C9A96E", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>Adresse</div>
              <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Adresse</div>
              <input type="text" placeholder="12 rue de la Paix" defaultValue={fv("adresse")} onChange={e => f("adresse", e.target.value)}
                style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
            </div>
              <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Code postal</div>
              <input type="text" placeholder="75001" defaultValue={fv("code_postal")} onChange={e => f("code_postal", e.target.value)}
                style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
            </div>
              <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Ville</div>
              <input type="text" placeholder="Paris" defaultValue={fv("ville")} onChange={e => f("ville", e.target.value)}
                style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
            </div>
              <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Pays</div>
              <input type="text" placeholder="France" defaultValue={fv("pays")} onChange={e => f("pays", e.target.value)}
                style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
            </div>
            </div>
          </div>

          <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20, marginTop: 14 }}>
            <div style={{ fontSize: 10, color: "#C9A96E", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>Profil investisseur</div>
            <div className="grid-2">
              <div>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Profil de risque</div>
                <select defaultValue={fv("profil_risque") || "Modéré"} onChange={e => f("profil_risque", e.target.value)}
                  style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit", marginBottom: 14 }}>
                  {PROFILS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Horizon d'investissement</div>
                <select defaultValue={fv("horizon_investissement")} onChange={e => f("horizon_investissement", e.target.value)}
                  style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit", marginBottom: 14 }}>
                  <option value="">Sélectionner...</option>
                  {HORIZONS.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Objectif global</div>
              <textarea defaultValue={fv("objectif_global")} onChange={e => f("objectif_global", e.target.value)} placeholder="Construire un patrimoine pour la retraite, financer les études des enfants..."
                style={{ width: "100%", minHeight: 70, background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, lineHeight: 1.5, resize: "none", fontFamily: "inherit" }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Description / Notes libres</div>
              <textarea defaultValue={fv("description")} onChange={e => f("description", e.target.value)} placeholder="Informations complémentaires..."
                style={{ width: "100%", minHeight: 80, background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, lineHeight: 1.5, resize: "none", fontFamily: "inherit" }} />
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button onClick={saveData} disabled={saving}
              style={{ padding: "10px 24px", background: "#C9A96E", border: "none", borderRadius: 8, cursor: "pointer", color: "#0C0C0E", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button onClick={() => setEditing(false)}
              style={{ padding: "10px 16px", background: "#141416", border: "1px solid #222", borderRadius: 8, cursor: "pointer", color: "#777", fontSize: 12, fontFamily: "inherit" }}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid-2" style={{ marginBottom: 14 }}>
            <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, color: "#C9A96E", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>Informations personnelles</div>
              <Field label="Date de naissance" value={data?.date_naissance ? new Date(data.date_naissance).toLocaleDateString("fr-FR") : null} />
              <Field label="Profession" value={data?.profession} />
              <Field label="Situation personnelle" value={data?.situation_personnelle} />
              <Field label="Nombre d'enfants" value={data?.nb_enfants !== undefined ? data.nb_enfants : null} />
              <Field label="Téléphone" value={data?.telephone} />
              <Field label="Email" value={data?.email} />
            </div>
            <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, color: "#C9A96E", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>Adresse</div>
              <Field label="Adresse" value={data?.adresse} />
              <Field label="Code postal" value={data?.code_postal} />
              <Field label="Ville" value={data?.ville} />
              <Field label="Pays" value={data?.pays} />
              <div style={{ marginTop: 16, borderTop: "1px solid #1A1A1E", paddingTop: 14 }}>
                <div style={{ fontSize: 10, color: "#C9A96E", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>Profil investisseur</div>
                <Field label="Profil de risque" value={data?.profil_risque} />
                <Field label="Horizon d'investissement" value={data?.horizon_investissement} />
              </div>
            </div>
          </div>
          {(data?.objectif_global || data?.description) && (
            <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
              {data?.objectif_global && <><div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>Objectif global</div><div style={{ fontSize: 13, color: "#E2DDD6", lineHeight: 1.6, marginBottom: 14 }}>{data.objectif_global}</div></>}
              {data?.description && <><div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>Notes</div><div style={{ fontSize: 13, color: "#AAA", lineHeight: 1.6 }}>{data.description}</div></>}
            </div>
          )}
          {!data && <div style={{ color: "#444", fontSize: 13, textAlign: "center", padding: "30px 0" }}>Aucune information renseignée. Clique sur "Modifier" pour commencer.</div>}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
// ══════════════════════════════════════
//  DIVIDENDES SECTION
// ══════════════════════════════════════
function DividendesSection({ db, clientId, isReadOnly }) {
  const [dividendes, setDividendes] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ entreprise: "", support: "", annee: new Date().getFullYear(), montant: "" });
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState("nom");
  const [filterText, setFilterText] = useState("");
  const [editingObjectif, setEditingObjectif] = useState(false);
  const CURRENT_YEAR = new Date().getFullYear();
  const PREV_YEAR = CURRENT_YEAR - 1;
  const objKey = `div_objectif_${clientId}`;
  const [objectifAnnuel, setObjectifAnnuel] = useState(() => {
    try { return parseFloat(localStorage.getItem(objKey)) || 0; } catch { return 0; }
  });
  const [objectifInput, setObjectifInput] = useState("");

  function saveObjectif() {
    const val = parseFloat(objectifInput) || 0;
    setObjectifAnnuel(val);
    try { localStorage.setItem(objKey, val); } catch {}
    setEditingObjectif(false);
  }

  useEffect(() => { if (clientId) loadDividendes(); }, [clientId]);

  async function loadDividendes() {
    try {
      const d = await db.get("dividendes", `select=*&client_id=eq.${clientId}&order=annee.desc,entreprise`);
      setDividendes(d);
    } catch(e) { console.error(e); }
  }

  async function saveDividende() {
    if (!form.entreprise.trim() || !form.montant || !form.annee) return;
    setSaving(true);
    try {
      await db.post("dividendes", { client_id: clientId, entreprise: form.entreprise, support: form.support, annee: parseInt(form.annee), montant: parseFloat(form.montant) });
      await loadDividendes();
      setModal(false);
      setForm({ entreprise: "", support: "", annee: CURRENT_YEAR, montant: "" });
    } catch(e) { alert("Erreur : " + e.message); }
    setSaving(false);
  }

  async function delDividende(id) {
    try { await db.del("dividendes", id); await loadDividendes(); } catch(e) { alert(e.message); }
  }

  const fmt = n => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n || 0);

  // Totaux
  const totalGlobal = dividendes.reduce((s, d) => s + d.montant, 0);
  const totalAnneeEnCours = dividendes.filter(d => d.annee === CURRENT_YEAR).reduce((s, d) => s + d.montant, 0);
  const totalAnneePrecedente = dividendes.filter(d => d.annee === PREV_YEAR).reduce((s, d) => s + d.montant, 0);
  const pctObjectif = objectifAnnuel > 0 ? Math.min(100, (totalAnneePrecedente / objectifAnnuel) * 100) : 0;
  const objectifAtteint = objectifAnnuel > 0 && totalAnneePrecedente >= objectifAnnuel;

  // Années distinctes triées desc
  const annees = [...new Set(dividendes.map(d => d.annee))].sort((a, b) => b - a);

  // Entreprises distinctes
  const entreprises = [...new Set(dividendes.map(d => d.entreprise))].sort();

  // Supports distincts
  const supports = [...new Set(dividendes.map(d => d.support || "Non défini"))].sort();

  // Matrice entreprise x année
  const matrix = {};
  entreprises.forEach(e => {
    matrix[e] = {};
    annees.forEach(a => { matrix[e][a] = 0; });
  });
  dividendes.forEach(d => {
    if (!matrix[d.entreprise]) matrix[d.entreprise] = {};
    matrix[d.entreprise][d.annee] = (matrix[d.entreprise][d.annee] || 0) + d.montant;
  });

  // Support de chaque entreprise (prend le premier trouvé)
  const entrepriseSupport = {};
  dividendes.forEach(d => {
    if (!entrepriseSupport[d.entreprise]) entrepriseSupport[d.entreprise] = d.support || "Non défini";
  });

  // Total par année
  const totalParAnnee = {};
  annees.forEach(a => {
    totalParAnnee[a] = dividendes.filter(d => d.annee === a).reduce((s, d) => s + d.montant, 0);
  });

  // Total par entreprise
  const totalParEntreprise = {};
  entreprises.forEach(e => {
    totalParEntreprise[e] = dividendes.filter(d => d.entreprise === e).reduce((s, d) => s + d.montant, 0);
  });

  // Total par support x année (pour sous-totaux)
  const totalParSupportAnnee = {};
  supports.forEach(s => {
    totalParSupportAnnee[s] = {};
    annees.forEach(a => {
      totalParSupportAnnee[s][a] = dividendes
        .filter(d => (d.support || "Non défini") === s && d.annee === a)
        .reduce((sum, d) => sum + d.montant, 0);
    });
  });
  const totalParSupport = {};
  supports.forEach(s => {
    totalParSupport[s] = dividendes.filter(d => (d.support || "Non défini") === s).reduce((sum, d) => sum + d.montant, 0);
  });

  // Grouper les entreprises par support pour le tableau
  const entreprisesParSupport = {};
  supports.forEach(s => {
    entreprisesParSupport[s] = entreprises.filter(e => entrepriseSupport[e] === s);
  });

  // Chart data - par année croissant
  const chartData = [...annees].reverse().map(a => ({ annee: String(a), total: totalParAnnee[a] }));

  // Sorted/filtered entreprises for table
  const entreprisesFiltrees = entreprises
    .filter(e => filterText === "" || e.toLowerCase().includes(filterText.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "nom") return a.localeCompare(b);
      if (sortBy === "total_desc") return totalParEntreprise[b] - totalParEntreprise[a];
      if (sortBy === "total_asc") return totalParEntreprise[a] - totalParEntreprise[b];
      if (sortBy === "annee_desc") return (totalParAnnee[annees[0]]||0) > 0 ? (matrix[b][annees[0]]||0) - (matrix[a][annees[0]]||0) : 0;
      return a.localeCompare(b);
    });

  return (
    <div>
      {/* KPIs */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div style={{ background: "#1A2A1F", border: "1px solid #5EBF7A30", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 9, color: "#5EBF7A", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 5 }}>Dividendes {CURRENT_YEAR}</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: "#5EBF7A" }}>{fmt(totalAnneeEnCours)}</div>
        </div>
        <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 5 }}>Total global</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: "#E2DDD6" }}>{fmt(totalGlobal)}</div>
        </div>
        <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 5 }}>Dividendes {PREV_YEAR}</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: "#E2DDD6" }}>{fmt(totalAnneePrecedente)}</div>
        </div>
      </div>

      {/* Objectif annuel */}
      <div style={{ background: objectifAtteint ? "#1A2F1F" : "#0F0F11", border: `1px solid ${objectifAtteint ? "#5EBF7A40" : objectifAnnuel > 0 ? "#C9A96E30" : "#1A1A1E"}`, borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: objectifAnnuel > 0 ? 14 : 0 }}>
          <div>
            <div style={{ fontSize: 9, color: objectifAtteint ? "#5EBF7A" : "#C9A96E", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4 }}>
              🎯 Objectif dividendes annuel
            </div>
            {objectifAnnuel > 0 && !editingObjectif && (
              <div style={{ fontSize: 11, color: "#666" }}>
                Basé sur {PREV_YEAR} · {fmt(totalAnneePrecedente)} reçus sur {fmt(objectifAnnuel)} visés
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!editingObjectif && objectifAnnuel > 0 && (
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, color: objectifAtteint ? "#5EBF7A" : "#C9A96E" }}>
                {fmt(objectifAnnuel)}
              </div>
            )}
            {!editingObjectif && (
              <button onClick={() => { setObjectifInput(objectifAnnuel || ""); setEditingObjectif(true); }}
                style={{ padding: "5px 12px", background: "#141416", border: "1px solid #222", borderRadius: 6, cursor: "pointer", color: "#888", fontSize: 11, fontFamily: "inherit" }}>
                {objectifAnnuel > 0 ? "✏️ Modifier" : "+ Définir un objectif"}
              </button>
            )}
          </div>
        </div>

        {editingObjectif && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="number" placeholder="Ex: 5000" value={objectifInput} onChange={e => setObjectifInput(e.target.value)}
              autoFocus
              style={{ flex: 1, background: "#141416", border: "1px solid #C9A96E50", borderRadius: 7, padding: "9px 12px", color: "#CCC", fontSize: 13, fontFamily: "inherit" }} />
            <span style={{ fontSize: 12, color: "#555" }}>€/an</span>
            <button onClick={saveObjectif} style={{ padding: "9px 16px", background: "#C9A96E", border: "none", borderRadius: 7, cursor: "pointer", color: "#0C0C0E", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>Enregistrer</button>
            <button onClick={() => setEditingObjectif(false)} style={{ padding: "9px 12px", background: "#141416", border: "1px solid #222", borderRadius: 7, cursor: "pointer", color: "#777", fontSize: 12, fontFamily: "inherit" }}>Annuler</button>
          </div>
        )}

        {objectifAnnuel > 0 && !editingObjectif && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", marginBottom: 6 }}>
              <span>{fmt(totalAnneePrecedente)} ({PREV_YEAR})</span>
              <span style={{ color: objectifAtteint ? "#5EBF7A" : "#C9A96E", fontWeight: 600 }}>
                {objectifAtteint ? "✅ Objectif atteint !" : `${pctObjectif.toFixed(1)}% de l'objectif`}
              </span>
            </div>
            <div style={{ background: "#1A1A1E", borderRadius: 4, height: 8, overflow: "hidden" }}>
              <div style={{ width: `${pctObjectif}%`, height: "100%", background: objectifAtteint ? "#5EBF7A" : "#C9A96E", borderRadius: 4, transition: "width 0.6s ease" }} />
            </div>
            {!objectifAtteint && objectifAnnuel > 0 && (
              <div style={{ fontSize: 10, color: "#555", marginTop: 5 }}>
                Il manque {fmt(objectifAnnuel - totalAnneePrecedente)} pour atteindre l'objectif
              </div>
            )}
          </div>
        )}
      </div>

      {/* Graphique */}
      {chartData.length > 0 && (
        <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>Évolution annuelle</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barSize={36}>
              <XAxis dataKey="annee" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
              <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1A1A1E", border: "none", borderRadius: 6, fontSize: 11, color: "#E2DDD6" }} />
              <Bar dataKey="total" fill="#5EBF7A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tableau croisé entreprise x année */}
      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #1A1A1E", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em" }}>Récapitulatif par entreprise & année</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input placeholder="🔍 Filtrer..." value={filterText} onChange={e => setFilterText(e.target.value)}
              style={{ padding: "5px 10px", background: "#0F0F11", border: "1px solid #222", borderRadius: 6, color: "#CCC", fontSize: 11, fontFamily: "inherit", width: 130 }} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ padding: "5px 10px", background: "#0F0F11", border: "1px solid #222", borderRadius: 6, color: "#CCC", fontSize: 11, fontFamily: "inherit" }}>
              <option value="nom">Trier : A→Z</option>
              <option value="total_desc">Total décroissant</option>
              <option value="total_asc">Total croissant</option>
              <option value="annee_desc">Année en cours ↓</option>
            </select>
            {!isReadOnly && (
              <button onClick={() => setModal(true)} style={{ padding: "5px 14px", background: "#5EBF7A", border: "none", borderRadius: 6, cursor: "pointer", color: "#0C0C0E", fontSize: 10, fontWeight: 600, fontFamily: "inherit" }}>+ Ajouter</button>
            )}
          </div>
        </div>

        {entreprises.length === 0 ? (
          <div style={{ padding: 28, color: "#444", fontSize: 13, textAlign: "center" }}>Aucun dividende enregistré.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1A1A1E" }}>
                  <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500, whiteSpace: "nowrap" }}>Entreprise</th>
                  {annees.map(a => (
                    <th key={a} style={{ padding: "10px 16px", textAlign: "right", fontSize: 9, color: a === CURRENT_YEAR ? "#5EBF7A" : "#444", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500, whiteSpace: "nowrap" }}>{a}</th>
                  ))}
                  <th style={{ padding: "10px 20px", textAlign: "right", fontSize: 9, color: "#C9A96E", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500, whiteSpace: "nowrap" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {supports.map(support => {
                  const entreprisesSupport = (entreprisesParSupport[support] || [])
                    .filter(e => filterText === "" || e.toLowerCase().includes(filterText.toLowerCase()))
                    .sort((a, b) => {
                      if (sortBy === "nom") return a.localeCompare(b);
                      if (sortBy === "total_desc") return totalParEntreprise[b] - totalParEntreprise[a];
                      if (sortBy === "total_asc") return totalParEntreprise[a] - totalParEntreprise[b];
                      return a.localeCompare(b);
                    });
                  if (entreprisesSupport.length === 0) return null;
                  return (
                    <React.Fragment key={support}>
                      {/* Support header row */}
                      <tr style={{ background: "#141416", borderBottom: "1px solid #1A1A1E", borderTop: "2px solid #2A2A2A" }}>
                        <td colSpan={annees.length + 2} style={{ padding: "8px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#8B7BAB" }} />
                            <span style={{ fontSize: 10, color: "#8B7BAB", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em" }}>{support}</span>
                          </div>
                        </td>
                      </tr>
                      {/* Entreprises rows */}
                      {entreprisesSupport.map((e, ei) => (
                        <tr key={e} style={{ borderBottom: "1px solid #1A1A1E", background: ei % 2 === 0 ? "transparent" : "#0A0A0C" }}>
                          <td style={{ padding: "9px 20px 9px 30px", color: "#CCC", whiteSpace: "nowrap" }}>{e}</td>
                          {annees.map(a => (
                            <td key={a} style={{ padding: "9px 16px", textAlign: "right", color: (matrix[e]?.[a] || 0) > 0 ? "#E2DDD6" : "#333", fontWeight: (matrix[e]?.[a] || 0) > 0 ? 500 : 400 }}>
                              {(matrix[e]?.[a] || 0) > 0 ? fmt(matrix[e][a]) : "--"}
                            </td>
                          ))}
                          <td style={{ padding: "9px 20px", textAlign: "right", color: "#C9A96E", fontWeight: 600, fontFamily: "'Cormorant Garamond',serif", fontSize: 14 }}>{fmt(totalParEntreprise[e])}</td>
                        </tr>
                      ))}
                      {/* Support subtotal row */}
                      <tr style={{ borderBottom: "1px solid #2A2A2A", background: "#0A0A0C" }}>
                        <td style={{ padding: "8px 20px", fontSize: 11, color: "#8B7BAB", fontWeight: 600 }}>Sous-total {support}</td>
                        {annees.map(a => (
                          <td key={a} style={{ padding: "8px 16px", textAlign: "right", color: "#8B7BAB", fontFamily: "'Cormorant Garamond',serif", fontSize: 13, fontWeight: 600 }}>
                            {totalParSupportAnnee[support]?.[a] > 0 ? fmt(totalParSupportAnnee[support][a]) : "--"}
                          </td>
                        ))}
                        <td style={{ padding: "8px 20px", textAlign: "right", color: "#8B7BAB", fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontWeight: 600 }}>{fmt(totalParSupport[support])}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #2A2A2A" }}>
                  <td style={{ padding: "10px 20px", fontSize: 11, color: "#888", fontWeight: 600 }}>Total général</td>
                  {annees.map(a => (
                    <td key={a} style={{ padding: "10px 16px", textAlign: "right", color: a === CURRENT_YEAR ? "#5EBF7A" : "#C9A96E", fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontWeight: 600 }}>{fmt(totalParAnnee[a])}</td>
                  ))}
                  <td style={{ padding: "10px 20px", textAlign: "right", color: "#5EBF7A", fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600 }}>{fmt(totalGlobal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal ajout */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="modal-box" style={{ background: "#0F0F11", border: "1px solid #222", borderRadius: 14, padding: 28, width: 400, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 20 }}>Nouveau dividende</div>
            {[
              ["entreprise", "Entreprise *", "text", "Apple, LVMH..."],
              ["support", "Support (PEA, CTO, AV...)", "text", "PEA"],
              ["annee", "Année *", "number", String(CURRENT_YEAR)],
              ["montant", "Montant perçu (€) *", "number", "150.00"],
            ].map(([k, l, t, ph]) => (
              <div key={k} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>{l}</div>
                <input type={t} placeholder={ph} value={form[k] || ""} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={saveDividende} disabled={saving} style={{ flex: 1, padding: 10, background: "#5EBF7A", border: "none", borderRadius: 8, cursor: "pointer", color: "#0C0C0E", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>{saving ? "..." : "Enregistrer"}</button>
              <button onClick={() => setModal(false)} style={{ padding: "10px 16px", background: "#141416", border: "1px solid #222", borderRadius: 8, cursor: "pointer", color: "#777", fontSize: 12, fontFamily: "inherit" }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
//  SIMULATEUR DE PROJECTION
// ══════════════════════════════════════
function SimulateurSection({ patrimoineActuel }) {
  const [params, setParams] = useState({
    capital: patrimoineActuel || 0,
    epargne: 500,
    duree: 20,
    taux_pessimiste: 3,
    taux_realiste: 6,
    taux_optimiste: 9,
    epargne_supplementaire: 200,
  });
  const [afficherSupp, setAfficherSupp] = useState(true);

  const p = (k, v) => setParams(prev => ({ ...prev, [k]: parseFloat(v) || 0 }));
  const fmt = n => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
  const fmtK = n => {
    if (n >= 1000000) return `${(n/1000000).toFixed(2)}M€`;
    if (n >= 1000) return `${(n/1000).toFixed(0)}k€`;
    return fmt(n);
  };

  // Calcul projection mensuelle
  function calcProjection(capital, epargne, tauxAnnuel, dureeAns) {
    const tauxMensuel = tauxAnnuel / 100 / 12;
    const mois = dureeAns * 12;
    const data = [];
    let valeur = capital;
    for (let i = 0; i <= mois; i++) {
      if (i % 12 === 0) {
        data.push({ annee: i / 12, valeur: Math.round(valeur) });
      }
      valeur = valeur * (1 + tauxMensuel) + epargne;
    }
    return data;
  }

  const projPessimiste = calcProjection(params.capital, params.epargne, params.taux_pessimiste, params.duree);
  const projRealiste = calcProjection(params.capital, params.epargne, params.taux_realiste, params.duree);
  const projOptimiste = calcProjection(params.capital, params.epargne, params.taux_optimiste, params.duree);
  const projSuppPessimiste = calcProjection(params.capital, params.epargne + params.epargne_supplementaire, params.taux_pessimiste, params.duree);
  const projSuppRealiste = calcProjection(params.capital, params.epargne + params.epargne_supplementaire, params.taux_realiste, params.duree);
  const projSuppOptimiste = calcProjection(params.capital, params.epargne + params.epargne_supplementaire, params.taux_optimiste, params.duree);

  const finalPessimiste = projPessimiste[projPessimiste.length - 1]?.valeur || 0;
  const finalRealiste = projRealiste[projRealiste.length - 1]?.valeur || 0;
  const finalOptimiste = projOptimiste[projOptimiste.length - 1]?.valeur || 0;
  const finalSuppRealiste = projSuppRealiste[projSuppRealiste.length - 1]?.valeur || 0;
  const gainSupp = finalSuppRealiste - finalRealiste;

  // Merge data for chart
  const chartData = projRealiste.map((r, i) => ({
    annee: `${r.annee} ans`,
    pessimiste: projPessimiste[i]?.valeur,
    realiste: r.valeur,
    optimiste: projOptimiste[i]?.valeur,
    ...(afficherSupp ? {
      supp_pessimiste: projSuppPessimiste[i]?.valeur,
      supp_realiste: projSuppRealiste[i]?.valeur,
      supp_optimiste: projSuppOptimiste[i]?.valeur,
    } : {})
  }));

  const inpStyle = { width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "8px 11px", color: "#CCC", fontSize: 13, fontFamily: "inherit" };
  const labelStyle = { fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 5 };

  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 20 }}>Simulateur de projection</div>

      {/* Paramètres */}
      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "#C9A96E", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>Paramètres</div>
        <div className="grid-3" style={{ marginBottom: 16 }}>
          <div>
            <div style={labelStyle}>Capital de départ (€)</div>
            <input type="number" value={params.capital} onChange={e => p("capital", e.target.value)} style={inpStyle} />
          </div>
          <div>
            <div style={labelStyle}>Épargne mensuelle (€)</div>
            <input type="number" value={params.epargne} onChange={e => p("epargne", e.target.value)} style={inpStyle} />
          </div>
          <div>
            <div style={labelStyle}>Durée (années)</div>
            <input type="number" value={params.duree} onChange={e => p("duree", e.target.value)} style={inpStyle} />
          </div>
        </div>
        <div className="grid-3" style={{ marginBottom: 16 }}>
          <div>
            <div style={{ ...labelStyle, color: "#E07A7A" }}>Taux pessimiste (%/an)</div>
            <input type="number" step="0.5" value={params.taux_pessimiste} onChange={e => p("taux_pessimiste", e.target.value)} style={{ ...inpStyle, borderColor: "#E07A7A30" }} />
          </div>
          <div>
            <div style={{ ...labelStyle, color: "#C9A96E" }}>Taux réaliste (%/an)</div>
            <input type="number" step="0.5" value={params.taux_realiste} onChange={e => p("taux_realiste", e.target.value)} style={{ ...inpStyle, borderColor: "#C9A96E30" }} />
          </div>
          <div>
            <div style={{ ...labelStyle, color: "#5EBF7A" }}>Taux optimiste (%/an)</div>
            <input type="number" step="0.5" value={params.taux_optimiste} onChange={e => p("taux_optimiste", e.target.value)} style={{ ...inpStyle, borderColor: "#5EBF7A30" }} />
          </div>
        </div>

        {/* Épargne supplémentaire */}
        <div style={{ borderTop: "1px solid #1A1A1E", paddingTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div onClick={() => setAfficherSupp(!afficherSupp)}
              style={{ width: 32, height: 18, borderRadius: 9, background: afficherSupp ? "#C9A96E" : "#222", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: afficherSupp ? 16 : 2, transition: "left 0.2s" }} />
            </div>
            <span style={{ fontSize: 12, color: afficherSupp ? "#E2DDD6" : "#555" }}>Comparer avec épargne supplémentaire</span>
          </div>
          {afficherSupp && (
            <div style={{ maxWidth: 220 }}>
              <div style={{ ...labelStyle, color: "#8B7BAB" }}>Épargne supplémentaire (€/mois)</div>
              <input type="number" value={params.epargne_supplementaire} onChange={e => p("epargne_supplementaire", e.target.value)}
                style={{ ...inpStyle, borderColor: "#8B7BAB30" }} />
            </div>
          )}
        </div>
      </div>

      {/* KPIs résultats */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: `Scénario pessimiste (${params.taux_pessimiste}%)`, val: fmtK(finalPessimiste), color: "#E07A7A", bg: "#2F1010" },
          { label: `Scénario réaliste (${params.taux_realiste}%)`, val: fmtK(finalRealiste), color: "#C9A96E", bg: "#1A1712" },
          { label: `Scénario optimiste (${params.taux_optimiste}%)`, val: fmtK(finalOptimiste), color: "#5EBF7A", bg: "#1A2F1F" },
        ].map((k, i) => (
          <div key={i} style={{ background: k.bg, border: `1px solid ${k.color}25`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, color: k.color, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: k.color }}>
              {k.val}
            </div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>dans {params.duree} ans</div>
          </div>
        ))}
      </div>

      {/* Gain épargne supplémentaire */}
      {afficherSupp && (
        <div style={{ background: "#1A1A2F", border: "1px solid #8B7BAB30", borderRadius: 10, padding: "14px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: "#8B7BAB", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 3 }}>
              Gain avec +{fmt(params.epargne_supplementaire)}/mois supplémentaires (scénario réaliste)
            </div>
            <div style={{ fontSize: 11, color: "#555" }}>
              {fmt(params.epargne + params.epargne_supplementaire)}/mois → {fmtK(finalSuppRealiste)} dans {params.duree} ans
            </div>
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: "#8B7BAB" }}>+{fmtK(gainSupp)}</div>
        </div>
      )}

      {/* Graphique */}
      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 20 }}>Courbes de projection</div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <XAxis dataKey="annee" tick={{ fill: "#444", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#444", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtK(v)} width={70} />
            <Tooltip formatter={(v, name) => {
              const labels = { pessimiste: "Pessimiste", realiste: "Réaliste", optimiste: "Optimiste", supp_pessimiste: "Pessimiste +épargne", supp_realiste: "Réaliste +épargne", supp_optimiste: "Optimiste +épargne" };
              return [fmtK(v), labels[name] || name];
            }} contentStyle={{ background: "#1A1A1E", border: "none", borderRadius: 6, fontSize: 11, color: "#E2DDD6" }} />
            <Line type="monotone" dataKey="pessimiste" stroke="#E07A7A" strokeWidth={2} dot={false} strokeDasharray="4 4" />
            <Line type="monotone" dataKey="realiste" stroke="#C9A96E" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="optimiste" stroke="#5EBF7A" strokeWidth={2} dot={false} strokeDasharray="4 4" />
            {afficherSupp && <>
              <Line type="monotone" dataKey="supp_pessimiste" stroke="#E07A7A" strokeWidth={1.5} dot={false} strokeDasharray="2 4" opacity={0.5} />
              <Line type="monotone" dataKey="supp_realiste" stroke="#8B7BAB" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="supp_optimiste" stroke="#5EBF7A" strokeWidth={1.5} dot={false} strokeDasharray="2 4" opacity={0.5} />
            </>}
          </LineChart>
        </ResponsiveContainer>

        {/* Légende */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, justifyContent: "center" }}>
          {[
            { color: "#E07A7A", label: `Pessimiste (${params.taux_pessimiste}%)`, dash: true },
            { color: "#C9A96E", label: `Réaliste (${params.taux_realiste}%)` },
            { color: "#5EBF7A", label: `Optimiste (${params.taux_optimiste}%)`, dash: true },
            ...(afficherSupp ? [{ color: "#8B7BAB", label: `Réaliste +${fmt(params.epargne_supplementaire)}/mois` }] : []),
          ].map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 20, height: 2, background: l.color, opacity: l.dash ? 0.7 : 1 }} />
              <span style={{ fontSize: 10, color: "#666" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tableau récapitulatif */}
      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #1A1A1E", fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em" }}>Tableau de projection détaillé</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1A1A1E" }}>
                {["Année", `Pessimiste (${params.taux_pessimiste}%)`, `Réaliste (${params.taux_realiste}%)`, `Optimiste (${params.taux_optimiste}%)`, ...(afficherSupp ? [`Réaliste +${fmt(params.epargne_supplementaire)}/mois`] : [])].map((h, i) => (
                  <th key={i} style={{ padding: "10px 16px", textAlign: i === 0 ? "left" : "right", fontSize: 9, color: ["#888","#E07A7A","#C9A96E","#5EBF7A","#8B7BAB"][i], textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projRealiste.filter((_, i) => i % 5 === 0 || i === projRealiste.length - 1).map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1A1A1E", background: i % 2 === 0 ? "transparent" : "#0A0A0C" }}>
                  <td style={{ padding: "9px 16px", color: "#888", fontWeight: 500 }}>{r.annee === 0 ? "Aujourd'hui" : `${r.annee} ans`}</td>
                  <td style={{ padding: "9px 16px", textAlign: "right", color: "#E07A7A" }}>{fmtK(projPessimiste[projPessimiste.findIndex(x => x.annee === r.annee)]?.valeur)}</td>
                  <td style={{ padding: "9px 16px", textAlign: "right", color: "#C9A96E", fontWeight: 500 }}>{fmtK(r.valeur)}</td>
                  <td style={{ padding: "9px 16px", textAlign: "right", color: "#5EBF7A" }}>{fmtK(projOptimiste[projOptimiste.findIndex(x => x.annee === r.annee)]?.valeur)}</td>
                  {afficherSupp && <td style={{ padding: "9px 16px", textAlign: "right", color: "#8B7BAB", fontWeight: 500 }}>{fmtK(projSuppRealiste[projSuppRealiste.findIndex(x => x.annee === r.annee)]?.valeur)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  IMMOBILIER LOCATIF
// ══════════════════════════════════════
function ImmoLocatifSection() {
  const [p, setP] = useState({
    prix_achat: 200000, frais_notaire_pct: 7.5, travaux: 10000,
    apport: 40000, taux_credit: 3.5, duree_credit: 20,
    loyer_mensuel: 900, charges_proprietaire: 150, taxe_fonciere: 1200,
    assurance_prl: 300, vacance_locative: 4, revenus_fonciers_annuels: 0,
    tmi: 30, regime: "reel",
  });
  const up = (k, v) => setP(prev => ({ ...prev, [k]: parseFloat(v) || 0 }));
  const fmt = n => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
  const fmtPct = n => `${parseFloat(n).toFixed(2)}%`;

  const cout_total = p.prix_achat * (1 + p.frais_notaire_pct / 100) + p.travaux;
  const capital_emprunte = cout_total - p.apport;
  const taux_mensuel = p.taux_credit / 100 / 12;
  const n_mois = p.duree_credit * 12;
  const mensualite_credit = capital_emprunte > 0 && taux_mensuel > 0
    ? (capital_emprunte * taux_mensuel) / (1 - Math.pow(1 + taux_mensuel, -n_mois))
    : capital_emprunte / n_mois;

  const loyers_annuels = p.loyer_mensuel * 12 * (1 - p.vacance_locative / 100);
  const charges_annuelles = p.charges_proprietaire * 12 + p.taxe_fonciere + p.assurance_prl;
  const interets_annuels = capital_emprunte * (p.taux_credit / 100);

  // Fiscalité
  const revenu_imposable_reel = Math.max(0, loyers_annuels - charges_annuelles - interets_annuels);
  const revenu_imposable_micro = loyers_annuels * 0.7; // abattement 30%
  const revenu_imposable = p.regime === "reel" ? revenu_imposable_reel : revenu_imposable_micro;
  const impots_fonciers = revenu_imposable * (p.tmi / 100 + 0.172); // TMI + PS 17.2%

  const cashflow_brut = loyers_annuels - charges_annuelles - mensualite_credit * 12;
  const cashflow_net = cashflow_brut - impots_fonciers;
  const cashflow_mensuel = cashflow_net / 12;

  const rendement_brut = (loyers_annuels / cout_total) * 100;
  const rendement_net = ((loyers_annuels - charges_annuelles) / cout_total) * 100;
  const rendement_net_net = ((loyers_annuels - charges_annuelles - impots_fonciers) / cout_total) * 100;

  const inpS = { width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "8px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" };
  const labS = { fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 };
  const Field = ({ label, val, color = "#E2DDD6", big = false }) => (
    <div style={{ padding: "10px 0", borderBottom: "1px solid #1A1A1E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "#777" }}>{label}</span>
      <span style={{ fontFamily: big ? "'Cormorant Garamond',serif" : "inherit", fontSize: big ? 20 : 13, color, fontWeight: big ? 400 : 500 }}>{val}</span>
    </div>
  );

  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 20 }}>Rentabilité locative</div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        {/* Paramètres acquisition */}
        <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: "#C9A96E", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>Acquisition & financement</div>
          {[
            ["prix_achat","Prix d'achat (€)","number"],
            ["frais_notaire_pct","Frais de notaire (%)","number"],
            ["travaux","Travaux (€)","number"],
            ["apport","Apport personnel (€)","number"],
            ["taux_credit","Taux crédit (%/an)","number"],
            ["duree_credit","Durée crédit (ans)","number"],
          ].map(([k,l,t]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={labS}>{l}</div>
              <input type={t} step="0.1" value={p[k]} onChange={e => up(k, e.target.value)} style={inpS} />
            </div>
          ))}
        </div>

        {/* Paramètres exploitation */}
        <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: "#C9A96E", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>Exploitation & fiscalité</div>
          {[
            ["loyer_mensuel","Loyer mensuel (€)","number"],
            ["charges_proprietaire","Charges propriétaire/mois (€)","number"],
            ["taxe_fonciere","Taxe foncière/an (€)","number"],
            ["assurance_prl","Assurance PNO/an (€)","number"],
            ["vacance_locative","Vacance locative (%)","number"],
            ["tmi","Tranche marginale d'imposition (%)","number"],
          ].map(([k,l,t]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={labS}>{l}</div>
              <input type={t} step="0.1" value={p[k]} onChange={e => up(k, e.target.value)} style={inpS} />
            </div>
          ))}
          <div style={{ marginBottom: 10 }}>
            <div style={labS}>Régime fiscal</div>
            <select value={p.regime} onChange={e => setP(prev => ({ ...prev, regime: e.target.value }))}
              style={{ ...inpS }}>
              <option value="reel">Réel (charges déductibles)</option>
              <option value="micro">Micro-foncier (abattement 30%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPIs rendement */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        {[
          { label: "Rendement brut", val: fmtPct(rendement_brut), color: "#E07A7A", bg: "#2F1010" },
          { label: "Rendement net de charges", val: fmtPct(rendement_net), color: "#C9A96E", bg: "#1A1712" },
          { label: "Rendement net-net (après impôts)", val: fmtPct(rendement_net_net), color: "#5EBF7A", bg: "#1A2F1F" },
        ].map((k, i) => (
          <div key={i} style={{ background: k.bg, border: `1px solid ${k.color}25`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, color: k.color, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Détail calculs */}
      <div className="grid-2">
        <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: "#C9A96E", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 }}>Financement</div>
          <Field label="Coût total projet" val={fmt(cout_total)} />
          <Field label="Capital emprunté" val={fmt(capital_emprunte)} />
          <Field label="Mensualité crédit" val={fmt(mensualite_credit)} color="#E07A7A" big />
        </div>
        <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: "#C9A96E", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 }}>Cashflow annuel</div>
          <Field label="Loyers perçus" val={fmt(loyers_annuels)} color="#5EBF7A" />
          <Field label="Charges & taxes" val={fmt(charges_annuelles)} color="#E07A7A" />
          <Field label="Remboursement crédit" val={fmt(mensualite_credit * 12)} color="#E07A7A" />
          <Field label="Impôts fonciers estimés" val={fmt(impots_fonciers)} color="#E07A7A" />
          <Field label="Cashflow net mensuel" val={fmt(cashflow_mensuel)} color={cashflow_mensuel >= 0 ? "#5EBF7A" : "#E07A7A"} big />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  LOUER VS ACHETER
// ══════════════════════════════════════
function LouerAcheterSection() {
  const [p, setP] = useState({
    prix_bien: 300000, apport: 60000, taux_credit: 3.5, duree_credit: 20,
    frais_notaire_pct: 7.5, charges_copro: 200, taxe_fonciere: 1500,
    assurance_hab_achat: 50, entretien_annuel: 1500,
    loyer_equiv: 1200, assurance_hab_loc: 30, depot_garantie: 2400,
    taux_placement: 4, hausse_immo_annuelle: 2, hausse_loyers_annuelle: 1.5,
    duree_simulation: 20,
  });
  const up = (k, v) => setP(prev => ({ ...prev, [k]: parseFloat(v) || 0 }));
  const fmt = n => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

  // Calcul achat
  const frais_notaire = p.prix_bien * (p.frais_notaire_pct / 100);
  const capital_emprunte = p.prix_bien - p.apport;
  const taux_mensuel = p.taux_credit / 100 / 12;
  const n_mois = p.duree_credit * 12;
  const mensualite = capital_emprunte > 0 && taux_mensuel > 0
    ? (capital_emprunte * taux_mensuel) / (1 - Math.pow(1 + taux_mensuel, -n_mois))
    : capital_emprunte / n_mois;

  // Simulation année par année
  const simData = [];
  let capital_restant = capital_emprunte;
  let valeur_bien = p.prix_bien;
  let loyer_actuel = p.loyer_equiv;
  let cout_cumul_achat = p.apport + frais_notaire;
  let cout_cumul_location = p.depot_garantie;
  let patrimoine_achat = 0;
  let patrimoine_location = p.apport - p.depot_garantie; // apport placé - dépôt

  for (let annee = 1; annee <= p.duree_simulation; annee++) {
    // Achat
    const charges_achat_annuelles = p.charges_copro * 12 + p.taxe_fonciere + p.assurance_hab_achat * 12 + p.entretien_annuel;
    const interets_annee = capital_restant * (p.taux_credit / 100);
    const amortissement_annee = Math.min(mensualite * 12 - interets_annee, capital_restant);
    capital_restant = Math.max(0, capital_restant - amortissement_annee);
    valeur_bien *= (1 + p.hausse_immo_annuelle / 100);
    const cout_achat_annee = (annee <= p.duree_credit ? mensualite * 12 : 0) + charges_achat_annuelles;
    cout_cumul_achat += cout_achat_annee;
    patrimoine_achat = valeur_bien - capital_restant;

    // Location
    loyer_actuel *= (1 + p.hausse_loyers_annuelle / 100);
    const cout_loc_annee = loyer_actuel * 12 + p.assurance_hab_loc * 12;
    const diff_cout = cout_achat_annee - cout_loc_annee;
    const epargne_locataire = diff_cout > 0 ? diff_cout : 0; // si location moins chère, le locataire épargne la diff
    patrimoine_location = patrimoine_location * (1 + p.taux_placement / 100) + epargne_locataire;
    cout_cumul_location += cout_loc_annee;

    if (annee % 5 === 0 || annee === p.duree_simulation) {
      simData.push({ annee: `${annee} ans`, achat: Math.round(patrimoine_achat), location: Math.round(patrimoine_location), cout_achat: Math.round(cout_cumul_achat), cout_location: Math.round(cout_cumul_location) });
    }
  }

  const finalAchat = simData[simData.length - 1]?.achat || 0;
  const finalLocation = simData[simData.length - 1]?.location || 0;
  const achatGagnant = finalAchat >= finalLocation;

  const inpS = { width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "8px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" };
  const labS = { fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 };

  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 20 }}>Louer vs Acheter</div>

      {/* Verdict */}
      <div style={{ background: achatGagnant ? "#1A2F1F" : "#1A2A3F", border: `1px solid ${achatGagnant ? "#5EBF7A" : "#5BA3E0"}30`, borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: achatGagnant ? "#5EBF7A" : "#5BA3E0", marginBottom: 3 }}>
            {achatGagnant ? "🏠 Acheter est plus avantageux" : "🏡 Louer est plus avantageux"} sur {p.duree_simulation} ans
          </div>
          <div style={{ fontSize: 11, color: "#666" }}>
            Patrimoine estimé : Achat {fmt(finalAchat)} vs Location {fmt(finalLocation)}
          </div>
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: achatGagnant ? "#5EBF7A" : "#5BA3E0" }}>
          {achatGagnant ? "+" : ""}{fmt(finalAchat - finalLocation)}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        {/* Params achat */}
        <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: "#C9A96E", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>0 Scénario achat</div>
          {[
            ["prix_bien","Prix du bien (€)"],["apport","Apport (€)"],["taux_credit","Taux crédit (%/an)"],
            ["duree_credit","Durée crédit (ans)"],["frais_notaire_pct","Frais notaire (%)"],
            ["charges_copro","Charges copro/mois (€)"],["taxe_fonciere","Taxe foncière/an (€)"],
            ["entretien_annuel","Entretien/an (€)"],
          ].map(([k,l]) => (
            <div key={k} style={{ marginBottom: 8 }}>
              <div style={labS}>{l}</div>
              <input type="number" step="0.1" value={p[k]} onChange={e => up(k, e.target.value)} style={inpS} />
            </div>
          ))}
        </div>
        {/* Params location */}
        <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: "#5BA3E0", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>1 Scénario location</div>
          {[
            ["loyer_equiv","Loyer équivalent/mois (€)"],["depot_garantie","Dépôt de garantie (€)"],
            ["assurance_hab_loc","Assurance hab/mois (€)"],
          ].map(([k,l]) => (
            <div key={k} style={{ marginBottom: 8 }}>
              <div style={labS}>{l}</div>
              <input type="number" step="0.1" value={p[k]} onChange={e => up(k, e.target.value)} style={inpS} />
            </div>
          ))}
          <div style={{ fontSize: 10, color: "#7C9B8A", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10, marginTop: 14 }}>Hypothèses</div>
          {[
            ["taux_placement","Rendement épargne placée (%/an)"],
            ["hausse_immo_annuelle","Hausse immobilier/an (%)"],
            ["hausse_loyers_annuelle","Hausse loyers/an (%)"],
            ["duree_simulation","Durée simulation (ans)"],
          ].map(([k,l]) => (
            <div key={k} style={{ marginBottom: 8 }}>
              <div style={labS}>{l}</div>
              <input type="number" step="0.1" value={p[k]} onChange={e => up(k, e.target.value)} style={inpS} />
            </div>
          ))}
        </div>
      </div>

      {/* Tableau comparatif */}
      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #1A1A1E", fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em" }}>Évolution du patrimoine net</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1A1A1E" }}>
                {["Période","Patrimoine achat","Patrimoine location","Avantage"].map((h,i) => (
                  <th key={i} style={{ padding: "10px 16px", textAlign: i===0?"left":"right", fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {simData.map((r, i) => {
                const avantage = r.achat - r.location;
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #1A1A1E", background: i%2===0?"transparent":"#0A0A0C" }}>
                    <td style={{ padding: "9px 16px", color: "#888" }}>{r.annee}</td>
                    <td style={{ padding: "9px 16px", textAlign: "right", color: "#C9A96E" }}>{fmt(r.achat)}</td>
                    <td style={{ padding: "9px 16px", textAlign: "right", color: "#5BA3E0" }}>{fmt(r.location)}</td>
                    <td style={{ padding: "9px 16px", textAlign: "right", color: avantage >= 0 ? "#5EBF7A" : "#E07A7A", fontWeight: 600 }}>{avantage >= 0 ? "+" : ""}{fmt(avantage)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  SIMULATEUR IMPÔTS
// ══════════════════════════════════════
function ImpotsSection({ clientId }) {
  const storageKey = `impots_${clientId || "default"}`;
  const savedData = (() => { try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { return {}; } })();
  const [p, setP] = useState({
    salaire_net: 40000, revenus_fonciers: "", revenus_capitaux: "", autres_revenus: "",
    parts: 1, pension_alimentaire_versee: "", frais_reels: "",
    dons: "", investissement_pinel: "", sofica: "",
    per_versements: "", compte_epargne_retraite: "",
    regime_frais: "forfait",
    ...savedData,
  });
  const up = (k, v) => {
    const val = k === "regime_frais" || k === "parts" ? v : v; // keep as string for display
    setP(prev => {
      const next = { ...prev, [k]: val };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  // Helper to get numeric value (empty string = 0)
  const pv = (k) => parseFloat(p[k]) || 0;
  const fmt = n => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
  const fmtPct = n => `${parseFloat(n).toFixed(1)}%`;

  // Barème 2025
  const BAREME = [
    { min: 0, max: 11497, taux: 0 },
    { min: 11497, max: 29315, taux: 0.11 },
    { min: 29315, max: 83823, taux: 0.30 },
    { min: 83823, max: 180294, taux: 0.41 },
    { min: 180294, max: Infinity, taux: 0.45 },
  ];

  function calcImpot(revenu_imposable, parts) {
    const qi = revenu_imposable / parts;
    let impot_part = 0;
    for (const tranche of BAREME) {
      if (qi > tranche.min) {
        impot_part += (Math.min(qi, tranche.max) - tranche.min) * tranche.taux;
      }
    }
    return impot_part * parts;
  }

  // Calcul direct depuis salaire NET imposable (sans passer par le brut)
  // Le salaire net fiscal = salaire net après déduction des frais professionnels
  const deduction_frais = p.regime_frais === "forfait"
    ? Math.min(p.salaire_net * 0.10, 14426) // plafond 2025
    : pv("frais_reels");
  const salaire_net_imposable = Math.max(0, p.salaire_net - deduction_frais);

  const revenu_brut_global = salaire_net_imposable + pv("revenus_fonciers") + pv("revenus_capitaux") * 0.6 + pv("autres_revenus") - pv("pension_alimentaire_versee");

  // Déductions (charges déductibles du revenu imposable)
  const deductions = pv("per_versements") + pv("compte_epargne_retraite");
  const revenu_net_imposable = Math.max(0, revenu_brut_global - deductions);

  // Calcul impôt progressif
  const impot_brut = calcImpot(revenu_net_imposable, p.parts);

  // Réductions d'impôt
  const reduction_dons = Math.min(pv("dons") * 0.66, revenu_net_imposable * 0.20);
  const reduction_pinel = pv("investissement_pinel") * 0.12;
  const reduction_sofica = pv("sofica") * 0.36;
  const total_reductions = reduction_dons + reduction_pinel + reduction_sofica;

  const impot_net = Math.max(0, impot_brut - total_reductions);
  const taux_moyen = revenu_net_imposable > 0 ? (impot_net / revenu_net_imposable) * 100 : 0;
  // Taux à la source = taux moyen arrondi (utilisé par l'administration fiscale)
  const taux_source = Math.round(taux_moyen * 10) / 10;

  // TMI
  const qi_final = revenu_net_imposable / p.parts;
  const tmi_tranche = BAREME.reduce((acc, t) => qi_final > t.min ? t : acc, BAREME[0]);
  const tmi = tmi_tranche.taux * 100;

  const inpS = { width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "8px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" };
  const labS = { fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 };
  const Row = ({ label, val, color = "#777", bold = false }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1A1A1E" }}>
      <span style={{ fontSize: 12, color: "#777" }}>{label}</span>
      <span style={{ fontSize: 13, color, fontWeight: bold ? 600 : 400 }}>{val}</span>
    </div>
  );

  // Données barème visuel
  const baremeData = BAREME.filter(t => t.max !== Infinity).map(t => ({
    tranche: `${(t.min/1000).toFixed(0)}k-${(t.max/1000).toFixed(0)}k`,
    taux: t.taux * 100,
    actif: qi_final > t.min,
  }));

  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 6 }}>Estimation impôt sur le revenu</div>
      <div style={{ fontSize: 11, color: "#555", marginBottom: 20 }}>⚠️ Estimation indicative -- barème 2025. Consultez un expert-comptable pour votre situation exacte.</div>

      {/* KPIs */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: "Impôt estimé", val: fmt(impot_net), color: "#E07A7A", bg: "#2F1010" },
          { label: "Taux prélèvement à la source", val: fmtPct(taux_source), color: "#7C9B8A", bg: "#0F1A12" },
          { label: "Tranche marginale (TMI)", val: fmtPct(tmi), color: "#8B7BAB", bg: "#1A1A2F" },
        ].map((k,i) => (
          <div key={i} style={{ background: k.bg, border: `1px solid ${k.color}25`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, color: k.color, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        {/* Revenus */}
        <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: "#C9A96E", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>Revenus & situation</div>
          <div style={{ marginBottom: 10 }}>
            <div style={labS}>Salaire net annuel (€)</div>
            <input type="number" value={p.salaire_net} onChange={e => up("salaire_net", e.target.value)} style={inpS} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={labS}>Revenus fonciers annuels (€)</div>
            <input type="number" value={p.revenus_fonciers} onChange={e => up("revenus_fonciers", e.target.value)} style={inpS} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={labS}>Revenus de capitaux mobiliers (€)</div>
            <input type="number" value={p.revenus_capitaux} onChange={e => up("revenus_capitaux", e.target.value)} style={inpS} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={labS}>Autres revenus (€)</div>
            <input type="number" value={p.autres_revenus} onChange={e => up("autres_revenus", e.target.value)} style={inpS} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={labS}>Nombre de parts fiscales</div>
            <input type="number" step="0.5" value={p.parts} onChange={e => up("parts", e.target.value)} style={inpS} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={labS}>Frais professionnels</div>
            <select value={p.regime_frais} onChange={e => up("regime_frais", e.target.value)} style={inpS}>
              <option value="forfait">Forfait 10% (plafonné à 14 171€)</option>
              <option value="reel">Frais réels</option>
            </select>
          </div>
          {p.regime_frais === "reel" && (
            <div style={{ marginBottom: 10 }}>
              <div style={labS}>Frais réels (€)</div>
              <input type="number" value={p.frais_reels} onChange={e => up("frais_reels", e.target.value)} style={inpS} />
            </div>
          )}
          <div style={{ marginBottom: 10 }}>
            <div style={labS}>Pension alimentaire versée (€)</div>
            <input type="number" value={p.pension_alimentaire_versee} onChange={e => up("pension_alimentaire_versee", e.target.value)} style={inpS} />
          </div>
        </div>

        {/* Déductions & réductions */}
        <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: "#5EBF7A", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>Déductions & réductions d'impôt</div>
          <div style={{ fontSize: 9, color: "#555", marginBottom: 10 }}>DÉDUCTIONS (réduisent le revenu imposable)</div>
          <div style={{ marginBottom: 10 }}>
            <div style={labS}>Versements PER (€)</div>
            <input type="number" value={p.per_versements} onChange={e => up("per_versements", e.target.value)} style={{ ...inpS, borderColor: "#5EBF7A30" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={labS}>Épargne retraite (PERCO, article 83...) (€)</div>
            <input type="number" value={p.compte_epargne_retraite} onChange={e => up("compte_epargne_retraite", e.target.value)} style={{ ...inpS, borderColor: "#5EBF7A30" }} />
          </div>
          <div style={{ fontSize: 9, color: "#555", marginBottom: 10 }}>RÉDUCTIONS (réduisent directement l'impôt)</div>
          <div style={{ marginBottom: 10 }}>
            <div style={labS}>Dons aux associations (€) → réduction 66%</div>
            <input type="number" value={p.dons} onChange={e => up("dons", e.target.value)} style={{ ...inpS, borderColor: "#C9A96E30" }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={labS}>Investissement Pinel (€) → réduction 12%</div>
            <input type="number" value={p.investissement_pinel} onChange={e => up("investissement_pinel", e.target.value)} style={{ ...inpS, borderColor: "#C9A96E30" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={labS}>SOFICA (€) → réduction 36%</div>
            <input type="number" value={p.sofica} onChange={e => up("sofica", e.target.value)} style={{ ...inpS, borderColor: "#C9A96E30" }} />
          </div>

          {/* Récap calcul */}
          <div style={{ borderTop: "1px solid #1A1A1E", paddingTop: 14 }}>
            <Row label="Revenu net imposable (base)" val={fmt(revenu_brut_global)} />
            <Row label="Déductions (PER, retraite...)" val={`- ${fmt(deductions)}`} color="#5EBF7A" />
            <Row label="Revenu net imposable" val={fmt(revenu_net_imposable)} color="#E2DDD6" bold />
            <Row label="Impôt brut" val={fmt(impot_brut)} color="#E07A7A" />
            <Row label="Réductions d'impôt" val={`- ${fmt(total_reductions)}`} color="#5EBF7A" />
            <Row label="Impôt net estimé" val={fmt(impot_net)} color="#E07A7A" bold />
          </div>
        </div>
      </div>

      {/* Barème visuel */}
      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>Barème progressif 2025 -- votre position</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {BAREME.map((t, i) => (
            <div key={i} style={{
              flex: 1, minWidth: 80, padding: "12px 10px", borderRadius: 8, textAlign: "center",
              background: qi_final > t.min ? (t.taux === tmi/100 ? "#2F1018" : "#1A1A2F") : "#141416",
              border: `1px solid ${qi_final > t.min ? (t.taux === tmi/100 ? "#E07A7A40" : "#8B7BAB30") : "#1A1A1E"}`,
            }}>
              <div style={{ fontSize: 18, fontFamily: "'Cormorant Garamond',serif", color: qi_final > t.min ? (t.taux === tmi/100 ? "#E07A7A" : "#8B7BAB") : "#333" }}>
                {(t.taux * 100)}%
              </div>
              <div style={{ fontSize: 9, color: "#444", marginTop: 4 }}>
                {t.min === 0 ? `0 - ${(t.max/1000).toFixed(0)}k` : t.max === Infinity ? `>${(t.min/1000).toFixed(0)}k` : `${(t.min/1000).toFixed(0)}k-${(t.max/1000).toFixed(0)}k`}
              </div>
              {t.taux === tmi/100 && qi_final > t.min && (
                <div style={{ fontSize: 8, color: "#E07A7A", marginTop: 3 }}>← votre TMI</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  SYNTHESE + EVOLUTION (sous-onglets)
// ══════════════════════════════════════
function SyntheseEvolSection({ produits, avoirs, parCategorie, patrimoineActuel, timeline, color, activeClient, fmt, fmtDate, onAddProduit, onAddAvoir, onDelProduit, isAdmin, db, clientId }) {
  const [subTab, setSubTab] = useState("synthese");
  const CAT_COLORS = { "Épargne": "#7C9B8A", "Investissement": "#C9A96E", "Immobilier": "#8B7BAB", "Autre": "#888" };

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #1A1A1E" }}>
        {[["synthese", "Synthèse"], ["evolution", "Évolution"], ["revenus", "Revenus"]].map(([k, l]) => (
          <button key={k} onClick={() => setSubTab(k)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 20px", fontSize: 12, fontWeight: 500, color: subTab === k ? color : "#555", borderBottom: subTab === k ? `2px solid ${color}` : "2px solid transparent", fontFamily: "inherit" }}>
            {l}
          </button>
        ))}
      </div>

      {subTab === "synthese" && (
        <div>
          <div className="grid-3" style={{ marginBottom: 20 }}>
            {[
              { label: "Patrimoine total", val: fmt(patrimoineActuel) },
              { label: "Patrimoine cible", val: fmt(activeClient?.patrimoine_cible) },
              { label: "Produits", val: produits.length },
            ].map((k, i) => (
              <div key={i} style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 5 }}>{k.label}</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24 }}>{k.val}</div>
              </div>
            ))}
          </div>

          <div className="grid-split" style={{ marginBottom: 16 }}>
            {/* Pie */}
            <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 14 }}>Répartition</div>
              {parCategorie.length > 0 ? <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart><Pie data={parCategorie} dataKey="value" innerRadius={40} outerRadius={62} paddingAngle={3}>{parCategorie.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie>
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1A1A1E", border: "none", borderRadius: 6, fontSize: 11, color: "#E2DDD6" }} />
                  </PieChart>
                </ResponsiveContainer>
                {parCategorie.map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: c.color }} /><span style={{ fontSize: 11, color: "#777" }}>{c.name}</span></div>
                    <span style={{ fontSize: 11, color: "#999" }}>{fmt(c.value)}</span>
                  </div>
                ))}
              </> : <div style={{ color: "#444", fontSize: 12, textAlign: "center", paddingTop: 20 }}>Aucun produit</div>}
            </div>

            {/* Produits */}
            <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em" }}>Produits</div>
                <button onClick={onAddProduit} style={{ padding: "5px 12px", background: color, border: "none", borderRadius: 6, cursor: "pointer", color: "#0C0C0E", fontSize: 10, fontWeight: 600 }}>+ Ajouter</button>
              </div>
              {produits.length === 0 && <div style={{ color: "#444", fontSize: 12 }}>Aucun produit</div>}
              {["Épargne","Investissement","Immobilier","Autre"].map(cat => {
                const prods = produits.filter(p => p.categorie === cat);
                if (!prods.length) return null;
                return (
                  <div key={cat} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: CAT_COLORS[cat], textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 }}>{cat}</div>
                    {prods.map(p => {
                      const last = avoirs.filter(a => a.produit_id === p.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                      return (
                        <div key={p.id} className="row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "#141416", borderRadius: 8, marginBottom: 3, transition: "background 0.15s" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: CAT_COLORS[cat] }} />
                            <span style={{ fontSize: 12, color: "#CCC" }}>{p.nom}</span>
                            {last && <span style={{ fontSize: 10, color: "#555" }}>· {fmtDate(last.date)}</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{last ? fmt(last.montant) : "--"}</span>
                            <button onClick={() => onAddAvoir(p)} style={{ padding: "3px 8px", background: `${color}20`, border: `1px solid ${color}40`, borderRadius: 5, cursor: "pointer", color, fontSize: 10 }}>+ Avoir</button>
                            <button onClick={() => onDelProduit(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#E07A7A", fontSize: 11 }}>✕</button>
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
      )}

      {subTab === "evolution" && (
        <div>
          {timeline.length < 2
            ? <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 28, color: "#555", fontSize: 13, textAlign: "center" }}>Ajoute des avoirs à différentes dates pour voir l'évolution</div>
            : <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 24, marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 18 }}>Patrimoine total</div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={timeline}>
                    <defs><linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.25} /><stop offset="95%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
                    <XAxis
                      dataKey="ts"
                      type="number"
                      scale="time"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={ts => { const d = new Date(ts); return `${d.toLocaleString("fr-FR", { month: "short" })} ${d.getFullYear()}`; }}
                      tick={{ fill: "#444", fontSize: 9 }} axisLine={false} tickLine={false}
                      minTickGap={40}
                    />
                    <YAxis tick={{ fill: "#444", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      labelFormatter={ts => { const d = new Date(ts); return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); }}
                      formatter={v => fmt(v)}
                      contentStyle={{ background: "#1A1A1E", border: "none", borderRadius: 6, fontSize: 11, color: "#E2DDD6" }}
                    />
                    <Area type="monotone" dataKey="total" stroke={color} strokeWidth={2} fill="url(#grad2)" dot={{ fill: color, r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
          }
          {produits.length > 0 && (
            <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>Par produit</div>
              {produits.map((p, pi) => {
                const pA = avoirs.filter(a => a.produit_id === p.id).sort((a, b) => new Date(a.date) - new Date(b.date));
                if (!pA.length) return null;
                const pc = ["#C9A96E","#7C9B8A","#8B7BAB","#E07A7A","#6AAED4","#E0A03A"][pi % 6];
                return (
                  <div key={p.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: pc }} />
                      <span style={{ fontSize: 11, color: "#888" }}>{p.nom}</span>
                      <span style={{ padding: "2px 8px", background: `${CAT_COLORS[p.categorie]}15`, borderRadius: 20, fontSize: 10, color: CAT_COLORS[p.categorie] }}>{p.categorie}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {pA.map((a, ai) => (
                        <div key={ai} style={{ padding: "6px 12px", background: "#141416", borderRadius: 8 }}>
                          <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>{fmtDate(a.date)}</div>
                          <div style={{ fontSize: 12, color: pc, fontWeight: 500 }}>{fmt(a.montant)}</div>
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
      {subTab === "revenus" && (
        <RevenusSection db={db} clientId={activeClient?.id || clientId} color={color} fmt={fmt} />
      )}
    </div>
  );
}

// ══════════════════════════════════════
//  REVENUS SECTION
// ══════════════════════════════════════
function RevenusSection({ db, clientId, color, fmt }) {
  const [revenus, setRevenus] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ categorie: "", annee: new Date().getFullYear(), montant: "" });
  const [saving, setSaving] = useState(false);
  const CURRENT_YEAR = new Date().getFullYear();
  const CATEGORIES_REV = ["Salaire", "Revenus fonciers", "Dividendes", "Plus-values", "Revenus indépendant", "Pension / Retraite", "Autres revenus"];

  useEffect(() => { if (clientId) load(); }, [clientId]);

  async function load() {
    try {
      const d = await db.get("revenus", `select=*&client_id=eq.${clientId}&order=annee.desc,categorie`);
      setRevenus(d);
    } catch(e) { console.error(e); }
  }

  async function save() {
    if (!form.categorie || !form.montant || !form.annee) return;
    setSaving(true);
    try {
      await db.post("revenus", { client_id: clientId, categorie: form.categorie, annee: parseInt(form.annee), montant: parseFloat(form.montant) });
      await load();
      setModal(false);
      setForm({ categorie: "", annee: CURRENT_YEAR, montant: "" });
    } catch(e) { alert("Erreur : " + e.message); }
    setSaving(false);
  }

  async function del(id) {
    try { await db.del("revenus", id); await load(); } catch(e) { alert(e.message); }
  }

  // Années distinctes
  const annees = [...new Set(revenus.map(d => d.annee))].sort((a, b) => b - a);
  // Catégories distinctes
  const categories = [...new Set(revenus.map(d => d.categorie))].sort();
  // Total par année
  const totalParAnnee = {};
  annees.forEach(a => { totalParAnnee[a] = revenus.filter(r => r.annee === a).reduce((s, r) => s + r.montant, 0); });
  // Matrice catégorie x année
  const matrix = {};
  categories.forEach(c => { matrix[c] = {}; annees.forEach(a => { matrix[c][a] = 0; }); });
  revenus.forEach(r => { if (!matrix[r.categorie]) matrix[r.categorie] = {}; matrix[r.categorie][r.annee] = (matrix[r.categorie][r.annee] || 0) + r.montant; });
  // Total par catégorie
  const totalParCat = {};
  categories.forEach(c => { totalParCat[c] = revenus.filter(r => r.categorie === c).reduce((s, r) => s + r.montant, 0); });
  // Total global
  const totalGlobal = revenus.reduce((s, r) => s + r.montant, 0);
  // Chart data
  const chartData = [...annees].reverse().map(a => ({ annee: String(a), total: totalParAnnee[a] }));
  // Catégorie colors
  const catColors = ["#C9A96E","#7C9B8A","#8B7BAB","#6AAED4","#E07A7A","#5EBF7A","#E0A03A"];

  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 20 }}>Suivi des revenus</div>

      {/* KPIs */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: `Revenus ${CURRENT_YEAR}`, val: fmt(totalParAnnee[CURRENT_YEAR] || 0), color: color || "#C9A96E", bg: "#1A1712" },
          { label: `Revenus ${CURRENT_YEAR - 1}`, val: fmt(totalParAnnee[CURRENT_YEAR - 1] || 0), color: "#E2DDD6", bg: "#0F0F11" },
          { label: "Total saisi", val: fmt(totalGlobal), color: "#E2DDD6", bg: "#0F0F11" },
        ].map((k, i) => (
          <div key={i} style={{ background: k.bg, border: `1px solid ${k.color === "#E2DDD6" ? "#1A1A1E" : k.color + "30"}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, color: k.color === "#E2DDD6" ? "#444" : k.color, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Graphique + tableau côte à côte */}
      <div className="grid-budget" style={{ marginBottom: 20 }}>
        {/* Graphique */}
        <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>Évolution annuelle</div>
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={32}>
                  <XAxis dataKey="annee" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1A1A1E", border: "none", borderRadius: 6, fontSize: 11, color: "#E2DDD6" }} />
                  <Bar dataKey="total" radius={[4,4,0,0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={i === chartData.length - 1 ? (color || "#C9A96E") : "#555"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Variation YoY */}
              {annees.length >= 2 && (() => {
                const last = totalParAnnee[annees[0]] || 0;
                const prev = totalParAnnee[annees[1]] || 0;
                const diff = last - prev;
                const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : 0;
                return (
                  <div style={{ marginTop: 12, padding: "10px 14px", background: diff >= 0 ? "#1A2F1F" : "#2F1010", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#AAA" }}>vs {annees[1]}</span>
                    <span style={{ fontSize: 13, color: diff >= 0 ? "#5EBF7A" : "#E07A7A", fontWeight: 600 }}>
                      {diff >= 0 ? "+" : ""}{fmt(diff)} ({pct}%)
                    </span>
                  </div>
                );
              })()}
            </>
          ) : <div style={{ color: "#444", fontSize: 12, textAlign: "center", paddingTop: 40 }}>Aucune donnée</div>}
        </div>

        {/* Répartition par catégorie */}
        <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>Répartition {annees[0] || CURRENT_YEAR}</div>
          {categories.length === 0 ? <div style={{ color: "#444", fontSize: 12 }}>Aucune donnée</div> : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categories.map((c, i) => ({ name: c, value: matrix[c][annees[0]] || 0, color: catColors[i % catColors.length] })).filter(d => d.value > 0)}
                    dataKey="value" innerRadius={40} outerRadius={65} paddingAngle={3}>
                    {categories.filter(c => (matrix[c][annees[0]] || 0) > 0).map((c, i) => <Cell key={i} fill={catColors[i % catColors.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#1A1A1E", border: "none", borderRadius: 6, fontSize: 11, color: "#E2DDD6" }} />
                </PieChart>
              </ResponsiveContainer>
              {categories.filter(c => (matrix[c][annees[0]] || 0) > 0).map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: catColors[i % catColors.length] }} />
                    <span style={{ fontSize: 11, color: "#777" }}>{c}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#999" }}>{fmt(matrix[c][annees[0]] || 0)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Tableau récapitulatif */}
      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #1A1A1E" }}>
          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em" }}>Détail par catégorie & année</div>
          <button onClick={() => setModal(true)} style={{ padding: "5px 14px", background: color || "#C9A96E", border: "none", borderRadius: 6, cursor: "pointer", color: "#0C0C0E", fontSize: 10, fontWeight: 600, fontFamily: "inherit" }}>+ Ajouter</button>
        </div>

        {revenus.length === 0 ? (
          <div style={{ padding: 28, color: "#444", fontSize: 13, textAlign: "center" }}>Aucun revenu enregistré.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1A1A1E" }}>
                  <th style={{ padding: "10px 20px", textAlign: "left", fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500 }}>Catégorie</th>
                  {annees.map(a => (
                    <th key={a} style={{ padding: "10px 16px", textAlign: "right", fontSize: 9, color: a === CURRENT_YEAR ? (color || "#C9A96E") : "#444", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500, whiteSpace: "nowrap" }}>{a}</th>
                  ))}
                  <th style={{ padding: "10px 20px", textAlign: "right", fontSize: 9, color: color || "#C9A96E", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 500 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c, ci) => (
                  <tr key={c} style={{ borderBottom: "1px solid #1A1A1E", background: ci % 2 === 0 ? "transparent" : "#0A0A0C" }}>
                    <td style={{ padding: "10px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: catColors[ci % catColors.length], flexShrink: 0 }} />
                        <span style={{ color: "#CCC" }}>{c}</span>
                      </div>
                    </td>
                    {annees.map(a => (
                      <td key={a} style={{ padding: "10px 16px", textAlign: "right", color: (matrix[c][a] || 0) > 0 ? "#E2DDD6" : "#333", fontWeight: (matrix[c][a] || 0) > 0 ? 500 : 400 }}>
                        {(matrix[c][a] || 0) > 0 ? fmt(matrix[c][a]) : "--"}
                      </td>
                    ))}
                    <td style={{ padding: "10px 20px", textAlign: "right", color: color || "#C9A96E", fontWeight: 600, fontFamily: "'Cormorant Garamond',serif", fontSize: 14 }}>{fmt(totalParCat[c])}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #2A2A2A" }}>
                  <td style={{ padding: "10px 20px", fontSize: 11, color: "#888", fontWeight: 600 }}>Total</td>
                  {annees.map(a => (
                    <td key={a} style={{ padding: "10px 16px", textAlign: "right", color: a === CURRENT_YEAR ? (color || "#C9A96E") : "#C9A96E", fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontWeight: 600 }}>{fmt(totalParAnnee[a])}</td>
                  ))}
                  <td style={{ padding: "10px 20px", textAlign: "right", color: "#5EBF7A", fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600 }}>{fmt(totalGlobal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Détail lignes par année sélectionnée */}
      </div>

      {/* Modal ajout */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="modal-box" style={{ background: "#0F0F11", border: "1px solid #222", borderRadius: 14, padding: 28, width: 400 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 20 }}>Nouveau revenu</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Catégorie *</div>
              <select value={form.categorie === form.categorie_custom ? "Autres revenus" : form.categorie} onChange={e => {
                if (e.target.value === "Autres revenus") setForm(p => ({ ...p, categorie: "", categorie_custom: true }));
                else setForm(p => ({ ...p, categorie: e.target.value, categorie_custom: false }));
              }}
                style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: form.categorie ? "#CCC" : "#555", fontSize: 12, fontFamily: "inherit" }}>
                <option value="">Sélectionner...</option>
                {CATEGORIES_REV.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {(form.categorie_custom || form.categorie === "") && form.categorie !== undefined && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Préciser le type de revenu *</div>
                <input placeholder="Ex: Droits d'auteur, Prime, Indemnité..." value={typeof form.categorie === 'string' && !CATEGORIES_REV.includes(form.categorie) ? form.categorie : ""}
                  onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))}
                  style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Année *</div>
              <input type="number" value={form.annee} onChange={e => setForm(p => ({ ...p, annee: e.target.value }))}
                style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 5 }}>Montant annuel (€) *</div>
              <input type="number" placeholder="Ex: 45000" value={form.montant} onChange={e => setForm(p => ({ ...p, montant: e.target.value }))}
                style={{ width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={save} disabled={saving} style={{ flex: 1, padding: 10, background: color || "#C9A96E", border: "none", borderRadius: 8, cursor: "pointer", color: "#0C0C0E", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>{saving ? "..." : "Enregistrer"}</button>
              <button onClick={() => setModal(false)} style={{ padding: "10px 16px", background: "#141416", border: "1px solid #222", borderRadius: 8, cursor: "pointer", color: "#777", fontSize: 12, fontFamily: "inherit" }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
//  IMMOBILIER (onglet principal avec sous-sections)
// ══════════════════════════════════════
function ImmobilierSection({ db, clientId, isReadOnly }) {
  const [subTab, setSubTab] = useState("biens");
  const color = "#8B7BAB";

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #1A1A1E" }}>
        {[["biens","Mes biens"], ["locatif","Rentabilité locative"], ["louer_acheter","Louer vs Acheter"]].map(([k, l]) => (
          <button key={k} onClick={() => setSubTab(k)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 20px", fontSize: 12, fontWeight: 500, color: subTab === k ? color : "#555", borderBottom: subTab === k ? `2px solid ${color}` : "2px solid transparent", fontFamily: "inherit" }}>
            {l}
          </button>
        ))}
      </div>
      {subTab === "biens" && <BiensImmobiliersSection db={db} clientId={clientId} isReadOnly={isReadOnly} />}
      {subTab === "locatif" && <ImmoLocatifSection />}
      {subTab === "louer_acheter" && <LouerAcheterSection />}
    </div>
  );
}

// ══════════════════════════════════════
//  BIENS IMMOBILIERS (suivi patrimoine)
// ══════════════════════════════════════
function BiensImmobiliersSection({ db, clientId, isReadOnly }) {
  const [biens, setBiens] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const TYPES = ["Résidence principale", "Résidence secondaire", "Locatif", "Terrain", "Parking", "Autre"];
  const fmt = n => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
  const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR") : "--";

  useEffect(() => { if (clientId) loadBiens(); }, [clientId]);

  async function loadBiens() {
    try {
      const b = await db.get("biens_immobiliers", `select=*&client_id=eq.${clientId}&order=date_achat`);
      setBiens(b);
    } catch(e) { console.error(e); }
  }

  async function saveBien() {
    setSaving(true);
    try {
      const { id, client_id, ...payload } = form;
      const cleanPayload = {
        ...payload,
        client_id: clientId,
        prix_achat: parseFloat(form.prix_achat) || 0,
        valorisation_actuelle: parseFloat(form.valorisation_actuelle) || 0,
        capital_restant_du: parseFloat(form.capital_restant_du) || 0,
        mensualite_credit: parseFloat(form.mensualite_credit) || 0,
        taux_credit: parseFloat(form.taux_credit) || 0,
        loyer_mensuel: parseFloat(form.loyer_mensuel) || 0,
        charges_annuelles: parseFloat(form.charges_annuelles) || 0,
      };
      if (modal === "edit" && form.id) {
        await db.patch("biens_immobiliers", form.id, cleanPayload);
      } else {
        await db.post("biens_immobiliers", cleanPayload);
      }
      await loadBiens();
      setModal(null);
    } catch(e) { alert("Erreur : " + e.message); }
    setSaving(false);
  }

  async function delBien(id) {
    if (!window.confirm("Supprimer ce bien ?")) return;
    try { await db.del("biens_immobiliers", id); await loadBiens(); } catch(e) { alert(e.message); }
  }

  const totalPatrimoine = biens.reduce((s, b) => s + (b.valorisation_actuelle || b.prix_achat || 0), 0);
  const totalDette = biens.reduce((s, b) => s + (b.capital_restant_du || 0), 0);
  const patrimoineNet = totalPatrimoine - totalDette;
  const plusValues = biens.reduce((s, b) => s + ((b.valorisation_actuelle || 0) - (b.prix_achat || 0)), 0);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inpS = { width: "100%", background: "#141416", border: "1px solid #222", borderRadius: 7, padding: "9px 11px", color: "#CCC", fontSize: 12, fontFamily: "inherit", marginBottom: 12 };
  const labS = { fontSize: 10, color: "#555", marginBottom: 4 };

  return (
    <div>
      {/* KPIs */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: "Valeur totale des biens", val: fmt(totalPatrimoine), color: "#E2DDD6", bg: "#0F0F11" },
          { label: "Dettes immobilières", val: fmt(totalDette), color: "#E07A7A", bg: "#2F1010" },
          { label: "Patrimoine immobilier net", val: fmt(patrimoineNet), color: "#5EBF7A", bg: "#1A2F1F" },
        ].map((k, i) => (
          <div key={i} style={{ background: k.bg, border: `1px solid ${k.color === "#E2DDD6" ? "#1A1A1E" : k.color+"25"}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, color: k.color === "#E2DDD6" ? "#444" : k.color, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Liste biens */}
      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #1A1A1E" }}>
          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em" }}>Biens immobiliers ({biens.length})</div>
          {!isReadOnly && (
            <button onClick={() => { setForm({ type_bien: "Résidence principale" }); setModal("new"); }}
              style={{ padding: "5px 14px", background: "#8B7BAB", border: "none", borderRadius: 6, cursor: "pointer", color: "#fff", fontSize: 10, fontWeight: 600, fontFamily: "inherit" }}>
              + Ajouter un bien
            </button>
          )}
        </div>

        {biens.length === 0 && (
          <div style={{ padding: 28, color: "#444", fontSize: 13, textAlign: "center" }}>Aucun bien immobilier enregistré.</div>
        )}

        {biens.map((b, i) => {
          const valeur = b.valorisation_actuelle || b.prix_achat || 0;
          const pv = valeur - (b.prix_achat || 0);
          const pvPct = b.prix_achat > 0 ? (pv / b.prix_achat * 100) : 0;
          const patrimoineNetBien = valeur - (b.capital_restant_du || 0);
          return (
            <div key={b.id} style={{ borderBottom: "1px solid #1A1A1E", padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#E2DDD6", marginBottom: 3 }}>{b.nom}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ padding: "2px 8px", background: "#8B7BAB20", border: "1px solid #8B7BAB30", borderRadius: 20, fontSize: 10, color: "#8B7BAB" }}>{b.type_bien}</span>
                    {b.adresse && <span style={{ fontSize: 10, color: "#555" }}>📍 {b.adresse}</span>}
                    {b.date_achat && <span style={{ fontSize: 10, color: "#555" }}>🗓 Achat : {fmtDate(b.date_achat)}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {!isReadOnly && <>
                    <button onClick={() => { setForm({ ...b }); setModal("edit"); }}
                      style={{ padding: "5px 12px", background: "#141416", border: "1px solid #222", borderRadius: 6, cursor: "pointer", color: "#888", fontSize: 10, fontFamily: "inherit" }}>Modifier</button>
                    <button onClick={() => delBien(b.id)}
                      style={{ padding: "5px 12px", background: "#141416", border: "1px solid #222", borderRadius: 6, cursor: "pointer", color: "#E07A7A", fontSize: 10, fontFamily: "inherit" }}>✕</button>
                  </>}
                </div>
              </div>

              <div className="grid-3">
                <div style={{ background: "#141416", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Prix d'achat</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: "#E2DDD6" }}>{fmt(b.prix_achat)}</div>
                </div>
                <div style={{ background: "#141416", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Valorisation actuelle</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: "#E2DDD6" }}>{fmt(valeur)}</div>
                  <div style={{ fontSize: 10, color: pv >= 0 ? "#5EBF7A" : "#E07A7A", marginTop: 2 }}>{pv >= 0 ? "+" : ""}{fmt(pv)} ({pvPct.toFixed(1)}%)</div>
                </div>
                <div style={{ background: "#141416", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Patrimoine net</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: "#5EBF7A" }}>{fmt(patrimoineNetBien)}</div>
                  {b.capital_restant_du > 0 && <div style={{ fontSize: 10, color: "#E07A7A", marginTop: 2 }}>Dette : {fmt(b.capital_restant_du)}</div>}
                </div>
              </div>

              {(b.capital_restant_du > 0 || b.loyer_mensuel > 0) && (
                <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  {b.mensualite_credit > 0 && <span style={{ fontSize: 11, color: "#E07A7A", background: "#E07A7A10", padding: "4px 10px", borderRadius: 20 }}>💳 {fmt(b.mensualite_credit)}/mois · {b.taux_credit}%</span>}
                  {b.loyer_mensuel > 0 && <span style={{ fontSize: 11, color: "#5EBF7A", background: "#5EBF7A10", padding: "4px 10px", borderRadius: 20 }}>0 Loyer {fmt(b.loyer_mensuel)}/mois</span>}
                  {b.date_fin_credit && <span style={{ fontSize: 11, color: "#555", padding: "4px 10px" }}>Fin crédit : {fmtDate(b.date_fin_credit)}</span>}
                </div>
              )}
              {b.notes && <div style={{ fontSize: 11, color: "#555", marginTop: 8, fontStyle: "italic" }}>{b.notes}</div>}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="modal-box" style={{ background: "#0F0F11", border: "1px solid #222", borderRadius: 14, padding: 28, width: 500, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 20 }}>{modal === "edit" ? "Modifier le bien" : "Nouveau bien immobilier"}</div>

            <div style={labS}>Nom du bien *</div>
            <input placeholder="Appartement Paris 11e, Maison Bordeaux..." defaultValue={form.nom || ""} onChange={e => f("nom", e.target.value)} style={inpS} />

            <div style={labS}>Type de bien</div>
            <select defaultValue={form.type_bien || "Résidence principale"} onChange={e => f("type_bien", e.target.value)} style={inpS}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>

            <div style={labS}>Adresse</div>
            <input placeholder="12 rue de la Paix, 75001 Paris" defaultValue={form.adresse || ""} onChange={e => f("adresse", e.target.value)} style={inpS} />

            <div className="grid-2" style={{ gap: 10 }}>
              <div>
                <div style={labS}>Date d'achat</div>
                <input type="date" defaultValue={form.date_achat || ""} onChange={e => f("date_achat", e.target.value)} style={inpS} />
              </div>
              <div>
                <div style={labS}>Prix d'achat (€)</div>
                <input type="number" defaultValue={form.prix_achat || ""} onChange={e => f("prix_achat", e.target.value)} style={inpS} />
              </div>
            </div>

            <div style={labS}>Valorisation actuelle (€)</div>
            <input type="number" defaultValue={form.valorisation_actuelle || ""} onChange={e => f("valorisation_actuelle", e.target.value)} style={inpS} />

            <div style={{ fontSize: 10, color: "#8B7BAB", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10, marginTop: 4 }}>Crédit immobilier</div>
            <div className="grid-2" style={{ gap: 10 }}>
              <div>
                <div style={labS}>Capital restant dû (€)</div>
                <input type="number" defaultValue={form.capital_restant_du || ""} onChange={e => f("capital_restant_du", e.target.value)} style={inpS} />
              </div>
              <div>
                <div style={labS}>Mensualité (€)</div>
                <input type="number" defaultValue={form.mensualite_credit || ""} onChange={e => f("mensualite_credit", e.target.value)} style={inpS} />
              </div>
              <div>
                <div style={labS}>Taux (%)</div>
                <input type="number" step="0.1" defaultValue={form.taux_credit || ""} onChange={e => f("taux_credit", e.target.value)} style={inpS} />
              </div>
              <div>
                <div style={labS}>Date fin crédit</div>
                <input type="date" defaultValue={form.date_fin_credit || ""} onChange={e => f("date_fin_credit", e.target.value)} style={inpS} />
              </div>
            </div>

            <div style={{ fontSize: 10, color: "#7C9B8A", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10, marginTop: 4 }}>Locatif (optionnel)</div>
            <div className="grid-2" style={{ gap: 10 }}>
              <div>
                <div style={labS}>Loyer mensuel (€)</div>
                <input type="number" defaultValue={form.loyer_mensuel || ""} onChange={e => f("loyer_mensuel", e.target.value)} style={inpS} />
              </div>
              <div>
                <div style={labS}>Charges annuelles (€)</div>
                <input type="number" defaultValue={form.charges_annuelles || ""} onChange={e => f("charges_annuelles", e.target.value)} style={inpS} />
              </div>
            </div>

            <div style={labS}>Notes</div>
            <textarea defaultValue={form.notes || ""} onChange={e => f("notes", e.target.value)} placeholder="Informations complémentaires..."
              style={{ ...inpS, minHeight: 60, resize: "none" }} />

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={saveBien} disabled={saving} style={{ flex: 1, padding: 10, background: "#8B7BAB", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>{saving ? "..." : "Enregistrer"}</button>
              <button onClick={() => setModal(null)} style={{ padding: "10px 16px", background: "#141416", border: "1px solid #222", borderRadius: 8, cursor: "pointer", color: "#777", fontSize: 12, fontFamily: "inherit" }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
//  NOTES SECTION (Supabase-backed)
// ══════════════════════════════════════
function NotesSection({ db, clientId, auteur, color }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (clientId) loadNotes(); }, [clientId]);

  async function loadNotes() {
    setLoading(true);
    try {
      const n = await db.get("notes", `select=*&client_id=eq.${clientId}&order=created_at.desc`);
      setNotes(n);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      await db.post("notes", { client_id: clientId, texte: newNote, auteur });
      setNewNote("");
      await loadNotes();
    } catch(e) { alert("Erreur : " + e.message); }
    setSaving(false);
  }

  async function delNote(id) {
    if (auteur !== "admin") return; // seul l'admin peut supprimer
    try { await db.del("notes", id); await loadNotes(); } catch(e) { alert(e.message); }
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "--";

  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 20 }}>Notes & suivi</div>

      {/* Saisie */}
      <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 }}>
          {auteur === "admin" ? "Note du conseiller" : "Ma note"}
        </div>
        <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
          placeholder={auteur === "admin" ? "Résumé du rendez-vous, décision prise, ajustement stratégique..." : "Ma question, mon commentaire, mon observation..."}
          style={{ width: "100%", minHeight: 90, background: "#141416", border: "1px solid #222", borderRadius: 8, padding: "10px 12px", color: "#CCC", fontSize: 13, lineHeight: 1.6, resize: "none", fontFamily: "inherit" }} />
        <button onClick={addNote} disabled={saving}
          style={{ marginTop: 10, padding: "9px 20px", background: color || "#C9A96E", border: "none", borderRadius: 7, cursor: "pointer", color: "#0C0C0E", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
          {saving ? "..." : "Enregistrer"}
        </button>
      </div>

      {/* Liste des notes */}
      {loading && <div style={{ color: "#444", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Chargement...</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {!loading && notes.length === 0 && (
          <div style={{ color: "#444", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Aucune note pour l'instant</div>
        )}
        {notes.map((n) => {
          const isAdmin = n.auteur === "admin";
          const noteColor = isAdmin ? (color || "#C9A96E") : "#6AAED4";
          return (
            <div key={n.id} style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderLeft: `3px solid ${noteColor}50`, borderRadius: "0 10px 10px 0", padding: "14px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 10, color: noteColor }}>{isAdmin ? "👤 Conseiller" : "🙋 Client"}</div>
                  <div style={{ fontSize: 10, color: "#444" }}>{fmtDate(n.created_at)}</div>
                </div>
                {auteur === "admin" && (
                  <button onClick={() => delNote(n.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 11, fontFamily: "inherit" }}>✕</button>
                )}
              </div>
              <div style={{ fontSize: 13, color: "#AAA", lineHeight: 1.6 }}>{n.texte}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  INFORMATIONS SECTION
// ══════════════════════════════════════
const INFO_DATA = {
  epargne: {
    label: "Produits d'épargne",
    color: "#7C9B8A",
    icon: "6",
    items: [
      {
        nom: "Livret Jeune",
        badge: "Épargne réglementée -- Jeunes",
        details: [
          { label: "Taux", val: "Minimum 2,4% net -- souvent supérieur selon la banque (2025)" },
          { label: "Plafond", val: "1 600 €" },
          { label: "Conditions", val: "Réservé aux 12-25 ans résidant en France" },
          { label: "Fiscalité", val: "100% exonéré d'impôt et de prélèvements sociaux" },
          { label: "Liquidité", val: "Immédiate" },
          { label: "Garantie", val: "Capital garanti" },
          { label: "Fermeture", val: "Automatique au 25e anniversaire" },
        ],
        note: "Taux au moins égal au Livret A, souvent supérieur selon les banques. À ouvrir en priorité si vous avez entre 12 et 25 ans -- il se cumule avec le Livret A.",
      },
      {
        nom: "Livret A",
        badge: "Épargne réglementée",
        details: [
          { label: "Taux", val: "1,7% net (depuis février 2026)" },
          { label: "Plafond", val: "22 950 € (particulier)" },
          { label: "Fiscalité", val: "100% exonéré d'impôt et de prélèvements sociaux" },
          { label: "Liquidité", val: "Immédiate" },
          { label: "Garantie", val: "Capital garanti par l'État" },
          { label: "Qui peut ouvrir", val: "Toute personne physique résidente en France (1 par personne)" },
        ],
        note: "Idéal pour l'épargne de précaution. Taux révisé 2 fois par an (février et août). Taux abaissé à 1,7% en février 2026.",
      },
      {
        nom: "LDDS (Livret Développement Durable et Solidaire)",
        badge: "Épargne réglementée",
        details: [
          { label: "Taux", val: "1,7% net (depuis février 2026)" },
          { label: "Plafond", val: "12 000 €" },
          { label: "Fiscalité", val: "100% exonéré" },
          { label: "Liquidité", val: "Immédiate" },
          { label: "Garantie", val: "Capital garanti" },
        ],
        note: "Complément du Livret A. Même taux, plafond plus bas. Fonds orientés vers l'économie sociale et solidaire.",
      },
      {
        nom: "LEP (Livret Épargne Populaire)",
        badge: "Épargne réglementée",
        details: [
          { label: "Taux", val: "2,4% net (depuis février 2026)" },
          { label: "Plafond", val: "10 000 €" },
          { label: "Fiscalité", val: "100% exonéré" },
          { label: "Liquidité", val: "Immédiate" },
          { label: "Conditions d'éligibilité", val: "RFR ≤ 22 419 € pour 1 part fiscale (2025)" },
        ],
        note: "Meilleur taux garanti de l'épargne sans risque. À ouvrir en priorité si vous êtes éligible.",
      },
      {
        nom: "PEL (Plan Épargne Logement)",
        badge: "Épargne logement",
        details: [
          { label: "Taux", val: "1,75% brut (ouvertures depuis janv. 2025)" },
          { label: "Plafond", val: "61 200 €" },
          { label: "Fiscalité", val: "Intérêts soumis au PFU 30% dès la 1ère année (depuis 2018)" },
          { label: "Durée minimale", val: "4 ans (sinon clôture)" },
          { label: "Versement minimum", val: "540 €/an, 45 €/mois" },
          { label: "Prime État", val: "Supprimée depuis 2018" },
        ],
        note: "Permet d'obtenir un prêt immobilier à taux préférentiel après 4 ans. Moins attractif depuis la hausse des taux.",
      },
      {
        nom: "Dépôt à terme (DAT)",
        badge: "Épargne bloquée",
        details: [
          { label: "Taux", val: "3 à 4% brut selon durée et banque (2025)" },
          { label: "Plafond", val: "Aucun plafond réglementaire" },
          { label: "Durée", val: "De 1 mois à 5 ans -- capital bloqué jusqu'à échéance" },
          { label: "Fiscalité", val: "PFU 30% sur les intérêts (ou option barème IR)" },
          { label: "Garantie", val: "Capital garanti par la banque (couvert par le FGDR jusqu'à 100 000€)" },
          { label: "Liquidité", val: "Très faible -- pénalités en cas de retrait anticipé" },
        ],
        note: "Intéressant quand les taux sont élevés pour sécuriser un rendement fixe sur une durée définie. À comparer avec le fonds euros en assurance vie après 8 ans.",
      },
    ],
  },
  investissement: {
    label: "Supports d'investissement",
    color: "#C9A96E",
    icon: "📈",
    items: [
      {
        nom: "PEA (Plan Épargne en Actions)",
        badge: "Actions françaises / européennes",
        details: [
          { label: "Plafond versements", val: "150 000 € (PEA classique)" },
          { label: "Fiscalité < 5 ans", val: "PFU 30% sur les gains" },
          { label: "Fiscalité > 5 ans", val: "Exonéré d'IR -- 17,2% PS uniquement" },
          { label: "Univers", val: "Actions éligibles UE, ETF éligibles" },
          { label: "Dividendes", val: "Capitalisés sans imposition dans l'enveloppe" },
        ],
        note: "La meilleure enveloppe pour investir en actions européennes sur le long terme.",
      },
      {
        nom: "PEA-PME",
        badge: "Actions PME/ETI",
        details: [
          { label: "Plafond versements", val: "225 000 € (cumulé PEA + PEA-PME = 225 000 € max)" },
          { label: "Fiscalité > 5 ans", val: "Identique au PEA (exonéré IR)" },
          { label: "Univers", val: "PME et ETI françaises et européennes" },
          { label: "Risque", val: "Plus élevé (valeurs moins liquides)" },
        ],
        note: "Complément du PEA pour diversifier sur des valeurs de croissance plus petites.",
      },
      {
        nom: "CTO (Compte Titre Ordinaire)",
        badge: "Tous marchés",
        details: [
          { label: "Plafond", val: "Aucun" },
          { label: "Fiscalité", val: "PFU 30% sur dividendes et plus-values (ou option barème IR)" },
          { label: "Univers", val: "Actions mondiales, ETF, obligations, matières premières, options..." },
          { label: "Liquidité", val: "Très haute" },
        ],
        note: "Aucune contrainte géographique ni de plafond. Moins avantageux fiscalement que le PEA.",
      },
      {
        nom: "Assurance Vie",
        badge: "Épargne long terme",
        details: [
          { label: "Fonds euros", val: "~2,5 à 4% selon assureur (2024)" },
          { label: "Plafond", val: "Aucun" },
          { label: "Fiscalité rachats < 8 ans", val: "PFU 30% ou barème IR" },
          { label: "Fiscalité rachats > 8 ans", val: "Abattement 4 600€/an (9 200€ couple) puis 24,7%" },
          { label: "Succession", val: "Abattement 152 500€ par bénéficiaire hors succession" },
          { label: "Liquidité", val: "Disponible à tout moment (rachat partiel ou total)" },
        ],
        note: "Enveloppe fiscale très avantageuse après 8 ans. Meilleur outil de transmission patrimoniale.",
      },
      {
        nom: "PER (Plan Épargne Retraite)",
        badge: "Retraite",
        details: [
          { label: "Versements déductibles", val: "Oui, dans la limite de 10% des revenus N-1 (max ~35 094€ en 2025)" },
          { label: "Fiscalité sortie", val: "Imposable à l'IR (capital + rentes) sauf si pas de déduction à l'entrée" },
          { label: "Disponibilité", val: "Bloqué jusqu'à la retraite (sauf cas exceptionnels)" },
          { label: "Supports", val: "Fonds euros + Unités de Compte" },
          { label: "Déblocage anticipé", val: "Décès conjoint, invalidité, surendettement, achat résidence principale" },
        ],
        note: "Très efficace si TMI élevée. L'économie d'impôt à l'entrée peut représenter 30 à 45% de l'effort d'épargne.",
      },
    ],
  },
  sous_jacents: {
    label: "Sous-jacents & classes d'actifs",
    color: "#6AAED4",
    icon: "🌐",
    items: [
      {
        nom: "Actions",
        badge: "Haute volatilité / Fort potentiel",
        details: [
          { label: "Rendement historique", val: "~7-10%/an (actions mondiales, long terme)" },
          { label: "Risque", val: "Élevé à court terme, réduit sur 10+ ans" },
          { label: "Liquidité", val: "Haute" },
          { label: "Horizon recommandé", val: "5 ans minimum, idéalement 10+" },
        ],
        note: "Moteur principal de la création de richesse sur le long terme.",
      },
      {
        nom: "Obligations",
        badge: "Faible à moyenne volatilité",
        details: [
          { label: "Rendement actuel", val: "3 à 5% (obligations d'État Europe, 2025)" },
          { label: "Risque", val: "Risque de taux + risque de crédit" },
          { label: "Liquidité", val: "Bonne" },
          { label: "Rôle", val: "Stabilisation du portefeuille, diversification" },
        ],
        note: "Revenu fixe. Sensibles aux variations de taux d'intérêt. Inverses aux actions en cas de crise.",
      },
      {
        nom: "Monétaire",
        badge: "Très faible risque",
        details: [
          { label: "Rendement actuel", val: "~3,5% (fonds monétaires €, 2025)" },
          { label: "Risque", val: "Très faible -- proche du taux directeur BCE" },
          { label: "Liquidité", val: "Très haute" },
          { label: "Instruments", val: "Bons du Trésor, billets de trésorerie, dépôts court terme" },
          { label: "Horizon", val: "Court terme (< 1 an)" },
        ],
        note: "Alternative au fonds euros dans un contexte de taux élevés. Profite de la hausse des taux directeurs. Accessible via ETF monétaires (ex: Amundi €STR).",
      },
      {
        nom: "Immobilier",
        badge: "Actif réel",
        details: [
          { label: "Rendement locatif brut", val: "3 à 7% selon localisation" },
          { label: "Levier", val: "Possible via crédit immobilier" },
          { label: "Liquidité", val: "Très faible" },
          { label: "Protection inflation", val: "Bonne (loyers indexés)" },
        ],
        note: "Actif tangible avec effet de levier. Contraintes de gestion et illiquidité à anticiper.",
      },
      {
        nom: "SCPI (Société Civile de Placement Immobilier)",
        badge: "Immobilier indirect",
        details: [
          { label: "Rendement moyen", val: "4 à 6% brut/an" },
          { label: "Ticket d'entrée", val: "Dès 1 000 € selon les SCPI" },
          { label: "Fiscalité", val: "Revenus fonciers soumis à l'IR + PS (17,2%)" },
          { label: "Liquidité", val: "Faible (marché secondaire)" },
          { label: "Frais d'entrée", val: "8 à 12% selon les SCPI" },
        ],
        note: "Permet d'investir dans l'immobilier sans gestion locative directe. Horizon 8+ ans recommandé.",
      },
      {
        nom: "ETF (Exchange Traded Fund)",
        badge: "Fonds indiciel coté",
        details: [
          { label: "Frais", val: "0,05% à 0,5%/an (vs 1,5-2% pour fonds actifs)" },
          { label: "Liquidité", val: "Haute (coté en bourse en temps réel)" },
          { label: "Diversification", val: "Un seul ETF peut contenir 500+ entreprises" },
          { label: "Exemples", val: "MSCI World, S&P 500, CAC 40, NASDAQ-100, ETF monétaires" },
          { label: "Logeable", val: "PEA (ETF éligibles), CTO, Assurance Vie" },
        ],
        note: "Stratégie la plus efficiente prouvée sur long terme pour l'investisseur particulier.",
      },
      {
        nom: "Or & Matières premières",
        badge: "Valeur refuge",
        details: [
          { label: "Rendement", val: "~4-5%/an sur 20 ans (or)" },
          { label: "Rôle", val: "Protection contre l'inflation et les crises" },
          { label: "Allocation recommandée", val: "5 à 10% du portefeuille" },
          { label: "Accès", val: "ETF or, trackers, pièces physiques" },
        ],
        note: "Valeur refuge en temps de crise. Ne produit pas de revenus.",
      },
      {
        nom: "Crypto-actifs",
        badge: "Très haute volatilité",
        details: [
          { label: "Risque", val: "Très élevé" },
          { label: "Fiscalité France", val: "PFU 30% sur les plus-values (depuis 2023)" },
          { label: "Liquidité", val: "Haute (24h/24, 7j/7)" },
          { label: "Allocation max suggérée", val: "5% du patrimoine maximum" },
        ],
        note: "Classe d'actif spéculative. Ne pas y investir ce qu'on ne peut pas se permettre de perdre.",
      },
    ],
  },
  principes: {
    label: "Grands principes d'investissement",
    color: "#8B7BAB",
    icon: "💡",
    items: [
      {
        nom: "Couple Rendement / Risque",
        badge: "Principe fondamental",
        details: [
          { label: "Règle", val: "Tout rendement supplémentaire s'accompagne d'un risque plus élevé" },
          { label: "Implication", val: "Méfiance envers les promesses de rendement garanti élevé" },
          { label: "Application", val: "Définir son profil de risque avant d'investir (Prudent, Modéré, Dynamique...)" },
        ],
        note: "La diversification permet de réduire le risque sans sacrifier le rendement espéré.",
      },
      {
        nom: "Liquidité",
        badge: "Principe de précaution",
        details: [
          { label: "Définition", val: "Capacité à convertir un actif en cash rapidement sans perte de valeur" },
          { label: "Règle d'or", val: "Toujours conserver 3 à 6 mois de dépenses en épargne liquide avant d'investir" },
          { label: "Échelle", val: "Livret A (max) > Actions (haute) > Immobilier (faible) > SCPI (très faible)" },
        ],
        note: "Ne jamais investir en actifs illiquides de l'argent dont vous pourriez avoir besoin à court terme.",
      },
      {
        nom: "DCA (Dollar Cost Averaging)",
        badge: "Stratégie d'investissement régulier",
        details: [
          { label: "Principe", val: "Investir un montant fixe à intervalles réguliers (ex: 200€/mois)" },
          { label: "Avantage", val: "Lisse le prix d'achat moyen -- on achète plus quand les marchés baissent" },
          { label: "Psychologie", val: "Elimine le stress de chercher le bon moment pour investir" },
          { label: "Idéal pour", val: "ETF, actions, sur PEA ou CTO" },
        ],
        note: "Stratégie recommandée pour les investisseurs qui ne peuvent pas ou ne veulent pas timer le marché.",
      },
      {
        nom: "Lump Sum (Investissement en une fois)",
        badge: "Stratégie d'investissement global",
        details: [
          { label: "Principe", val: "Investir un capital important en une seule fois" },
          { label: "Performance", val: "Statistiquement supérieure au DCA dans ~65% des cas sur marchés haussiers" },
          { label: "Risque", val: "Exposition immédiate à la volatilité court terme" },
          { label: "Idéal pour", val: "Héritage, prime, vente d'actif -- quand l'horizon est long (10+ ans)" },
        ],
        note: "Si vous avez un capital disponible et un horizon long, le lump sum est souvent plus performant. La peur de mal timer coûte souvent plus cher que le mauvais timing lui-même.",
      },
      {
        nom: "Diversification",
        badge: "Gestion du risque",
        details: [
          { label: "Géographique", val: "Monde entier (Europe, USA, Émergents)" },
          { label: "Sectorielle", val: "Technologie, santé, finance, énergie, consommation..." },
          { label: "Par classes d'actifs", val: "Actions, obligations, immobilier, or" },
          { label: "Temporelle", val: "Investissements étalés dans le temps (DCA)" },
        ],
        note: "Ne pas mettre tous ses oeufs dans le même panier. Un ETF MSCI World offre une diversification sur 1 500+ entreprises en un seul produit.",
      },
      {
        nom: "Intérêts composés",
        badge: "La 8e merveille du monde",
        details: [
          { label: "Principe", val: "Les intérêts génèrent eux-mêmes des intérêts" },
          { label: "Exemple", val: "10 000 à 7%/an = 19 672 apres 10 ans, 76 123 apres 30 ans" },
          { label: "Clé", val: "Le temps est le facteur le plus important -- commencer tôt prime sur le montant investi" },
          { label: "Règle des 72", val: "Divisez 72 par le taux = nombre d'années pour doubler le capital (72/7% = ~10 ans)" },
        ],
        note: "Albert Einstein : Les intérêts composés sont la 8e merveille du monde. Celui qui les comprend les gagne, celui qui ne les comprend pas les paie.",
      },
    ],
  },
};

function InformationsSection() {
  const [activeCategory, setActiveCategory] = useState("epargne");
  const [openItem, setOpenItem] = useState(null);

  const cat = INFO_DATA[activeCategory];
  const catKeys = Object.keys(INFO_DATA);

  return (
    <div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 6 }}>Centre d'informations financières</div>
      <div style={{ fontSize: 11, color: "#555", marginBottom: 20 }}>
        Sources : Banque de France, AMF, impots.gouv.fr, BPCE, Crédit Agricole, JustETF, MoneyVox, Meilleure Banque
      </div>

      {/* Category tabs */}
      <div className="tabs-row" style={{ borderBottom: "1px solid #1A1A1E", marginBottom: 24 }}>
        {catKeys.map(k => {
          const c = INFO_DATA[k];
          return (
            <button key={k} onClick={() => { setActiveCategory(k); setOpenItem(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 20px", fontSize: 12, fontWeight: 500, color: activeCategory === k ? c.color : "#555", borderBottom: activeCategory === k ? `2px solid ${c.color}` : "2px solid transparent", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cat.items.map((item, i) => {
          const isOpen = openItem === i;
          return (
            <div key={i} style={{ background: "#0F0F11", border: `1px solid ${isOpen ? cat.color + "40" : "#1A1A1E"}`, borderRadius: 12, overflow: "hidden", transition: "border-color 0.2s" }}>
              {/* Header */}
              <div onClick={() => setOpenItem(isOpen ? null : i)}
                style={{ padding: "16px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#E2DDD6", marginBottom: 3 }}>{item.nom}</div>
                    <span style={{ padding: "2px 8px", background: `${cat.color}15`, border: `1px solid ${cat.color}30`, borderRadius: 20, fontSize: 10, color: cat.color }}>{item.badge}</span>
                  </div>
                </div>
                <div style={{ fontSize: 16, color: "#555", transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</div>
              </div>

              {/* Details */}
              {isOpen && (
                <div style={{ padding: "0 20px 20px" }}>
                  <div style={{ borderTop: "1px solid #1A1A1E", paddingTop: 16, marginBottom: 14 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        {item.details.map((d, di) => (
                          <tr key={di} style={{ borderBottom: "1px solid #1A1A1E" }}>
                            <td style={{ padding: "8px 16px 8px 0", fontSize: 11, color: "#666", width: "35%", verticalAlign: "top" }}>{d.label}</td>
                            <td style={{ padding: "8px 0", fontSize: 12, color: "#E2DDD6", fontWeight: 500 }}>{d.val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {item.note && (
                    <div style={{ background: `${cat.color}10`, border: `1px solid ${cat.color}25`, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10 }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                      <span style={{ fontSize: 12, color: "#AAA", lineHeight: 1.6 }}>{item.note}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Graphique Rendement / Risque */}
      {activeCategory === "principes" && (
        <div style={{ background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12, padding: 24, marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>Carte Rendement / Risque / Liquidité</div>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 20 }}>Positionnement indicatif des principales classes d'actifs</div>

          {/* Legend liquidité */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            {[
              { label: "Liquidité immédiate", color: "#5EBF7A" },
              { label: "Liquidité haute", color: "#6AAED4" },
              { label: "Liquidité moyenne", color: "#C9A96E" },
              { label: "Liquidité faible", color: "#E07A7A" },
            ].map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: l.color, border: `2px solid ${l.color}` }} />
                <span style={{ fontSize: 10, color: "#666" }}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div style={{ position: "relative", height: 380, background: "#0A0A0C", borderRadius: 10, border: "1px solid #1A1A1E", overflow: "hidden" }}>

            {/* Grid lines */}
            {[0,25,50,75,100].map(v => (
              <div key={v} style={{ position: "absolute", left: "8%", right: "4%", top: `${4 + (100-v) * 0.88}%`, height: 1, background: "#1A1A1E" }}>
                <span style={{ position: "absolute", left: -28, top: -8, fontSize: 9, color: "#333" }}>{v}%</span>
              </div>
            ))}
            {[0,25,50,75,100].map(v => (
              <div key={v} style={{ position: "absolute", top: "4%", bottom: "12%", left: `${8 + v * 0.88}%`, width: 1, background: "#1A1A1E" }}>
                <span style={{ position: "absolute", bottom: -18, left: -8, fontSize: 9, color: "#333" }}>{v}%</span>
              </div>
            ))}

            {/* Axis labels */}
            <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" }}>Risque →</div>
            <div style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%) rotate(-90deg)", fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>← Rendement</div>

            {/* Efficient frontier curve (decorative) */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              <path d={`M ${8+2*0.88}% ${4+(100-2)*0.88}% Q ${8+30*0.88}% ${4+(100-25)*0.88}% ${8+55*0.88}% ${4+(100-55)*0.88}% T ${8+90*0.88}% ${4+(100-85)*0.88}%`}
                stroke="#C9A96E" strokeWidth="1" strokeDasharray="4 4" fill="none" opacity="0.3" />
            </svg>

            {/* Data points */}
            {[
              { label: "Livret A", x: 2, y: 2.4, color: "#5EBF7A", size: 10 },
              { label: "Livret Jeune", x: 2, y: 3.5, color: "#5EBF7A", size: 10 },
              { label: "LEP", x: 2, y: 3.5, color: "#5EBF7A", size: 10 },
              { label: "DAT", x: 5, y: 4, color: "#C9A96E", size: 10 },
              { label: "PEL", x: 6, y: 1.75, color: "#C9A96E", size: 10 },
              { label: "Monétaire", x: 8, y: 3.5, color: "#5EBF7A", size: 10 },
              { label: "Fonds €", x: 10, y: 3, color: "#6AAED4", size: 11 },
              { label: "Obligations", x: 25, y: 4, color: "#6AAED4", size: 11 },
              { label: "SCPI", x: 40, y: 5, color: "#E07A7A", size: 12 },
              { label: "Or", x: 45, y: 5, color: "#C9A96E", size: 11 },
              { label: "Immobilier", x: 42, y: 6, color: "#E07A7A", size: 12 },
              { label: "ETF World", x: 55, y: 8, color: "#6AAED4", size: 13 },
              { label: "Actions", x: 65, y: 9, color: "#6AAED4", size: 13 },
              { label: "Private Equity", x: 75, y: 14, color: "#E07A7A", size: 12 },
              { label: "Crypto", x: 90, y: 20, color: "#E07A7A", size: 11 },
            ].map((pt, i) => {
              // Scale: x=risk 0-100%, y=rendement 0-25%
              const left = `${8 + pt.x * 0.88}%`;
              const top = `${4 + (100 - (pt.y / 25 * 100)) * 0.88}%`;
              return (
                <div key={i} style={{ position: "absolute", left, top, transform: "translate(-50%, -50%)" }}>
                  <div style={{ position: "relative" }}>
                    <div style={{
                      width: pt.size, height: pt.size, borderRadius: "50%",
                      background: pt.color, opacity: 0.9,
                      boxShadow: `0 0 8px ${pt.color}60`,
                    }} />
                    <div style={{
                      position: "absolute", left: pt.size + 3, top: "50%", transform: "translateY(-50%)",
                      fontSize: 9, color: "#AAA", whiteSpace: "nowrap",
                      background: "rgba(10,10,12,0.75)", padding: "1px 4px", borderRadius: 3,
                    }}>{pt.label}</div>
                  </div>
                </div>
              );
            })}

            {/* Zone labels */}
            <div style={{ position: "absolute", left: "10%", bottom: "14%", fontSize: 9, color: "#1A3020", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Zone sécurité</div>
            <div style={{ position: "absolute", right: "5%", top: "10%", fontSize: 9, color: "#2F1010", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Zone spéculative</div>
          </div>

          <div style={{ marginTop: 10, fontSize: 10, color: "#444", fontStyle: "italic" }}>
            ⚠️ Positionnement indicatif à titre éducatif. Les rendements passés ne présagent pas des rendements futurs.
          </div>
        </div>
      )}

      {/* Sources footer */}
      <div style={{ marginTop: 24, padding: "14px 20px", background: "#0F0F11", border: "1px solid #1A1A1E", borderRadius: 12 }}>
        <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>Sources & références</div>
        <div style={{ fontSize: 11, color: "#555", lineHeight: 1.8 }}>
          • <span style={{ color: "#666" }}>Banque de France</span> -- banque-france.fr (taux réglementés)<br/>
          • <span style={{ color: "#666" }}>AMF (Autorité des Marchés Financiers)</span> -- amf-france.org (réglementation, éducation financière)<br/>
          • <span style={{ color: "#666" }}>Direction Générale des Finances Publiques</span> -- impots.gouv.fr (fiscalité de l'épargne)<br/>
          • <span style={{ color: "#666" }}>MoneyVox</span> -- moneyvox.fr (comparatifs produits épargne)<br/>
          • <span style={{ color: "#666" }}>JustETF</span> -- justetf.com (données ETF)<br/>
          • <span style={{ color: "#666" }}>IEIF</span> -- ieif.fr (données immobilier et SCPI)<br/>
          • <span style={{ color: "#666" }}>Vanguard Research</span> -- "Dollar Cost Averaging Just Means Taking Risk Later" (2012)
        </div>
        <div style={{ fontSize: 10, color: "#444", marginTop: 10, fontStyle: "italic" }}>
          ⚠️ Ces informations sont fournies à titre indicatif et éducatif. Elles ne constituent pas un conseil en investissement. Consultez un conseiller financier agréé pour votre situation personnelle. Taux et plafonds susceptibles d'évoluer.
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
//  ADMIN APP
// ══════════════════════════════════════
function AdminApp({ db, onLogout }) {
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [produits, setProduits] = useState([]);
  const [avoirs, setAvoirs] = useState([]);
  const [objectifs, setObjectifs] = useState([]);
  const [jalons, setJalons] = useState([]);
  const [objProduits, setObjProduits] = useState([]);
  const [identifications, setIdentifications] = useState({});
  const [page, setPage] = useState("global");
  const [tab, setTab] = useState("identification");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [openProgObj, setOpenProgObj] = useState(null);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (activeClient) loadClientData(activeClient.id); }, [activeClient?.id]);

  async function loadAll() {
    setLoading(true);
    try { const c = await db.get("clients","select=*&order=nom"); setClients(c); if (c.length>0&&!activeClient) setActiveClient(c[0]); } catch(e){console.error(e);}
    setLoading(false);
  }

  async function loadClientData(cid) {
    try {
      const [p,a,o,ident] = await Promise.all([
        db.get("produits",`select=*&client_id=eq.${cid}`),
        db.get("avoirs",`select=*&client_id=eq.${cid}&order=date`),
        db.get("objectifs",`select=*&client_id=eq.${cid}`),
        db.get("identification",`select=*&client_id=eq.${cid}`),
      ]);
      setProduits(p); setAvoirs(a); setObjectifs(o);
      if(ident.length>0) setIdentifications(prev=>({...prev,[cid]:ident[0]}));
      if (o.length>0) {
        const ids = o.map(x=>x.id).join(",");
        const [j,op] = await Promise.all([
          db.get("jalons",`select=*&objectif_id=in.(${ids})`),
          db.get("objectif_produits",`select=*&objectif_id=in.(${ids})`),
        ]);
        setJalons(j); setObjProduits(op);
      } else { setJalons([]); setObjProduits([]); }
    } catch(e){console.error(e);}
  }

  const clientColor = idx => COLORS[idx%COLORS.length];
  const activeIdx = clients.findIndex(c=>c.id===activeClient?.id);
  const color = clientColor(activeIdx>=0?activeIdx:0);
  const lastAvoir = pid => { const a=avoirs.filter(a=>a.produit_id===pid).sort((a,b)=>new Date(b.date)-new Date(a.date)); return a[0]?.montant||0; };
  const patrimoineActuel = produits.reduce((s,p)=>s+lastAvoir(p.id),0);
  const patrimoineObjectif = oid => { const ids=objProduits.filter(op=>op.objectif_id===oid).map(op=>op.produit_id); return produits.filter(p=>ids.includes(p.id)).reduce((s,p)=>s+lastAvoir(p.id),0); };
  const parCategorie = CATEGORIES.map(cat=>({ name:cat, value:produits.filter(p=>p.categorie===cat).reduce((s,p)=>s+lastAvoir(p.id),0), color:CAT_COLORS[cat] })).filter(c=>c.value>0);
  const timeline = (() => {
    const byDate={}; avoirs.forEach(a=>{ if(!byDate[a.date])byDate[a.date]={}; byDate[a.date][a.produit_id]=a.montant; });
    const dates=Object.keys(byDate).sort(); const lk={};
    return dates.map(d=>{ produits.forEach(p=>{ if(byDate[d][p.id]!==undefined)lk[p.id]=byDate[d][p.id]; }); return { date:fmtDate(d), rawDate: d, ts: new Date(d).getTime(), total:Object.values(lk).reduce((s,v)=>s+v,0) }; });
  })();


  async function save() {
    setSaving(true);
    try {
      if (modal.type==="client_new") { const c=await db.post("clients",{ ...form, patrimoine_cible: parseFloat(form.patrimoine_cible)||0 }); await loadAll(); setActiveClient(c[0]); setPage("client"); setTab("synthese"); }
      else if (modal.type==="client_edit") { await db.patch("clients",activeClient.id,{ ...form, patrimoine_cible:parseFloat(form.patrimoine_cible)||0 }); setActiveClient({...activeClient,...form}); await loadAll(); }
      else if (modal.type==="produit_new") { await db.post("produits",{...form,client_id:activeClient.id}); await loadClientData(activeClient.id); }
      else if (modal.type==="avoir_new") { await db.post("avoirs",{montant:parseFloat(form.montant),date:form.date,client_id:activeClient.id,produit_id:modal.produit_id}); await loadClientData(activeClient.id); }
      else if (modal.type==="objectif_new") { await db.post("objectifs",{nom:form.nom,montant_cible:parseFloat(form.montant_cible),description:form.description,client_id:activeClient.id}); await loadClientData(activeClient.id); }
      else if (modal.type==="objectif_edit") { await db.patch("objectifs",modal.objectif_id,{nom:form.nom,montant_cible:parseFloat(form.montant_cible),description:form.description}); await loadClientData(activeClient.id); }
      else if (modal.type==="jalon_new") { await db.post("jalons",{...form,montant_cible:parseFloat(form.montant_cible)||null,objectif_id:modal.objectif_id}); await loadClientData(activeClient.id); }
      else if (modal.type==="lier_produit") {
        const already=objProduits.filter(op=>op.objectif_id===modal.objectif_id).map(op=>op.produit_id);
        for (const pid of modal.selectedProduits.filter(id=>!already.includes(id))) await db.post("objectif_produits",{objectif_id:modal.objectif_id,produit_id:pid});
        for (const pid of already.filter(id=>!modal.selectedProduits.includes(id))) { const op=objProduits.find(x=>x.objectif_id===modal.objectif_id&&x.produit_id===pid); if(op) await db.del("objectif_produits",op.id); }
        await loadClientData(activeClient.id);
      }
      setModal(null);
    } catch(e){ alert("Erreur : "+e.message); }
    setSaving(false);
  }

  async function delClient() { if(!window.confirm(`Supprimer ${activeClient.nom} ?`))return; await db.del("clients",activeClient.id); setActiveClient(null); await loadAll(); setPage("global"); }
  async function delProduit(id) { if(!window.confirm("Supprimer ce produit ?"))return; await db.del("produits",id); await loadClientData(activeClient.id); }
  async function delObjectif(id) { if(!window.confirm("Supprimer cet objectif ?"))return; await db.del("objectifs",id); await loadClientData(activeClient.id); }
  async function delJalon(id) { await db.del("jalons",id); await loadClientData(activeClient.id); }

  function openModal(type,extra={}) {
    const d = {
      client_new: EMPTY_CLIENT,
      client_edit: { nom:activeClient?.nom||"", statut:activeClient?.statut||"En bonne voie", date_debut:activeClient?.date_debut||"", patrimoine_cible:activeClient?.patrimoine_cible||"", onglets_actifs:activeClient?.onglets_actifs||ALL_TABS },
      produit_new: EMPTY_PRODUIT, avoir_new: EMPTY_AVOIR, objectif_new: EMPTY_OBJECTIF, objectif_edit: { nom:extra.nom||"", montant_cible:extra.montant_cible||"", description:extra.description||"" }, jalon_new: EMPTY_JALON, lier_produit: {},
    };
    setForm(d[type]||{}); setModal({type,...extra});
  }



  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const inp=(k,l,t="text",ph="")=>(
    <div style={{marginBottom:14}}>
      <div style={{fontSize:10,color:"#555",marginBottom:5}}>{l}</div>
      <input type={t} placeholder={ph} value={form[k]||""} onChange={e=>f(k,e.target.value)}
        style={{width:"100%",background:"#141416",border:"1px solid #222",borderRadius:7,padding:"9px 11px",color:"#CCC",fontSize:12}} />
    </div>
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const Logo = () => (
    <div style={{padding:"24px 20px 16px",borderBottom:"1px solid #1A1A1E"}}>
      <div style={{fontSize:9,letterSpacing:"0.25em",color:"#444",textTransform:"uppercase",marginBottom:3}}>Espace admin</div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#C9A96E",letterSpacing:"0.08em"}}>Rob'Invest</div>
    </div>
  );

  return (
    <div className="app-layout" style={{background:"#0C0C0E",fontFamily:"'DM Sans',sans-serif",color:"#E2DDD6"}}>
      <style>{CSS}</style>
      <div className={"overlay"+(sidebarOpen?" open":"")} onClick={()=>setSidebarOpen(false)}/>

      {/* SIDEBAR */}
      <div className={"sidebar"+(sidebarOpen?" open":"")} style={{background:"#0F0F11",borderRight:"1px solid #1A1A1E",display:"flex",flexDirection:"column"}}>
        <Logo />
        <div style={{padding:"10px 10px 0"}}>
          <div onClick={()=>{setPage("global");setSidebarOpen(false);}} className="cr"
            style={{padding:"9px 12px",borderRadius:8,cursor:"pointer",fontSize:12,color:page==="global"?"#C9A96E":"#555",background:page==="global"?"#1A1712":"transparent",marginBottom:2}}>
            ⬡ Vue globale
          </div>
        </div>
        <div style={{padding:"16px 10px 8px",flex:1,overflowY:"auto"}}>
          <div style={{fontSize:9,letterSpacing:"0.15em",color:"#333",textTransform:"uppercase",padding:"0 10px",marginBottom:8}}>Clients</div>
          {loading&&<div style={{color:"#444",fontSize:12,padding:12}}>Chargement...</div>}
          {clients.map((c,idx)=>{
            const active=page==="client"&&activeClient?.id===c.id;
            const col=clientColor(idx);
            return (
              <div key={c.id} className="cr" onClick={()=>{setActiveClient(c);setPage("client");setTab("synthese");setSidebarOpen(false);}}
                style={{padding:"10px 12px",borderRadius:8,cursor:"pointer",marginBottom:2,background:active?"#1A1712":"transparent",border:active?`1px solid ${col}25`:"1px solid transparent"}}>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:`${col}18`,border:1.5px solid ${col}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:600,color:col,flexShrink:0}}>{initials(c.nom)}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:500,color:active?"#E2DDD6":"#888"}}>{c.nom}</div>
                    <div style={{fontSize:10,color:"#444"}}>Client</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{padding:"12px 10px",borderTop:"1px solid #1A1A1E"}}>
          <button className="btn" onClick={()=>openModal("client_new")}
            style={{width:"100%",padding:"9px",background:"#C9A96E",border:"none",borderRadius:8,cursor:"pointer",color:"#0C0C0E",fontSize:11,fontWeight:600,marginBottom:8}}>
            + Nouveau client
          </button>
          <button className="btn" onClick={onLogout}
            style={{width:"100%",padding:"7px",background:"none",border:"1px solid #222",borderRadius:8,cursor:"pointer",color:"#555",fontSize:11}}>
            Déconnexion
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="main-content">

        {page==="global"&&(
          <div style={{padding:"32px 36px"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
              <button className="mob-btn" onClick={()=>setSidebarOpen(true)}>☰</button>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28}}>Vue d'ensemble</div>
            </div>
            <div style={{fontSize:12,color:"#555",marginBottom:28}}>{clients.length} clients accompagnés</div>
            <div className="grid-2">
              {clients.map((c,idx)=>{
                const col=clientColor(idx);
                const st=statutStyle[c.statut]||statutStyle["En bonne voie"];
                return (
                  <div key={c.id} className="cr" onClick={()=>{setActiveClient(c);setPage("client");setTab("synthese");}}
                    style={{background:"#0F0F11",border:"1px solid #1A1A1E",borderRadius:12,padding:20,cursor:"pointer"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:34,height:34,borderRadius:"50%",background:`${col}18`,border:1.5px solid ${col}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:600,color:col}}>{initials(c.nom)}</div>
                        <div>
                          <div style={{fontSize:14,fontWeight:500}}>{c.nom}</div>
                          <div style={{fontSize:10,color:"#555"}}>Client</div>
                        </div>
                      </div>
                      <div className="tag" style={{background:st.bg,color:st.text}}><div style={{width:4,height:4,borderRadius:"50%",background:st.dot,marginRight:5}}/>{c.statut}</div>
                    </div>
                    <div style={{fontSize:11,color:"#555"}}>Patrimoine cible : <span style={{color:col}}>{fmt(c.patrimoine_cible)}</span></div>
                  </div>
                );
              })}
              {clients.length===0&&<div style={{color:"#444",fontSize:13,gridColumn:"1/-1"}}>Aucun client.</div>}
            </div>
          </div>
        )}

        {page==="client"&&activeClient&&(()=>{
          const st=statutStyle[activeClient.statut]||statutStyle["En bonne voie"];
          return (
            <>
              <div className="header-pad" style={{borderBottom:"1px solid #1A1A1E",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"#0C0C0E",zIndex:10}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <button className="mob-btn" onClick={()=>setSidebarOpen(true)} style={{marginRight:4}}>☰</button>
                  <div style={{width:38,height:38,borderRadius:"50%",background:`${color}18`,border:2px solid ${color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color}}>{initials(activeClient.nom)}</div>
                  <div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20}}>{activeClient.nom}</div>
                    <div style={{fontSize:10,color:"#555"}}>{activeClient.date_debut?` · Suivi depuis ${activeClient.date_debut}`:""}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div className="tag" style={{background:st.bg,color:st.text}}><div style={{width:4,height:4,borderRadius:"50%",background:st.dot,marginRight:5}}/>{activeClient.statut}</div>
                  <button className="btn" onClick={()=>openModal("client_edit")} style={{padding:"5px 12px",background:"#141416",border:"1px solid #222",borderRadius:7,cursor:"pointer",color:"#777",fontSize:11}}>Modifier</button>
                  <button className="btn" onClick={delClient} style={{padding:"5px 12px",background:"#141416",border:"1px solid #222",borderRadius:7,cursor:"pointer",color:"#E07A7A",fontSize:11}}>Supprimer</button>
                </div>
              </div>

              <div className="tabs-row" style={{padding:"0 16px",borderBottom:"1px solid #1A1A1E"}}>
                {ALL_TABS.filter(k => !activeClient.onglets_actifs || activeClient.onglets_actifs.includes(k)).map(k => [k, TAB_LABELS[k]]).map(([k,l])=>(
                  <button key={k} className="tb" onClick={()=>setTab(k)}
                    style={{background:"none",border:"none",cursor:"pointer",padding:"13px 18px",fontSize:12,fontWeight:500,color:tab===k?color:"#444",borderBottom:tab===k?`2px solid ${color}`:"2px solid transparent"}}>
                    {l}
                  </button>
                ))}
              </div>

              <div className="page-pad" style={{flex:1}}>

                {tab==="synthese"&&(
                  <SyntheseEvolSection
                    produits={produits} avoirs={avoirs} parCategorie={parCategorie}
                    patrimoineActuel={patrimoineActuel} timeline={timeline} color={color}
                    activeClient={activeClient} fmt={fmt} fmtDate={fmtDate}
                    onAddProduit={()=>openModal("produit_new")}
                    onAddAvoir={(prod)=>openModal("avoir_new",{produit_id:prod.id,produit_nom:prod.nom})}
                    onDelProduit={delProduit}
                    isAdmin={true} db={db} clientId={activeClient?.id}
                  />
                )}
                {tab==="synthese_OLD"&&(
                  <div>
                    <div className="grid-3" style={{marginBottom:20}}>
                      {[
                        {label:"Patrimoine total",val:fmt(patrimoineActuel)},
                        {label:"Patrimoine cible",val:fmt(activeClient.patrimoine_cible)},
                        {label:"Nb produits",val:produits.length},
                      ].map((k,i)=>(
                        <div key={i} style={{background:"#0F0F11",border:"1px solid #1A1A1E",borderRadius:10,padding:"14px 16px"}}>
                          <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:5}}>{k.label}</div>
                          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24}}>{k.val}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid-split" style={{marginBottom:16}}>
                      <div style={{background:"#0F0F11",border:"1px solid #1A1A1E",borderRadius:12,padding:20}}>
                        <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:14}}>Répartition</div>
                        {parCategorie.length>0?<>
                          <ResponsiveContainer width="100%" height={140}><PieChart><Pie data={parCategorie} dataKey="value" innerRadius={40} outerRadius={62} paddingAngle={3}>{parCategorie.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1A1A1E",border:"none",borderRadius:6,fontSize:11,color:"#E2DDD6"}}/></PieChart></ResponsiveContainer>
                          {parCategorie.map((c,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:6,height:6,borderRadius:"50%",background:c.color}}/><span style={{fontSize:11,color:"#777"}}>{c.name}</span></div><span style={{fontSize:11,color:"#999"}}>{fmt(c.value)}</span></div>)}
                        </>:<div style={{color:"#444",fontSize:12,textAlign:"center",paddingTop:20}}>Aucun produit</div>}
                      </div>
                      <div style={{background:"#0F0F11",border:"1px solid #1A1A1E",borderRadius:12,padding:20}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                          <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.15em"}}>Produits</div>
                          <button className="btn" onClick={()=>openModal("produit_new")} style={{padding:"5px 12px",background:color,border:"none",borderRadius:6,cursor:"pointer",color:"#0C0C0E",fontSize:10,fontWeight:600}}>+ Ajouter</button>
                        </div>
                        {produits.length===0&&<div style={{color:"#444",fontSize:12}}>Aucun produit</div>}
                        {CATEGORIES.map(cat=>{const prods=produits.filter(p=>p.categorie===cat);if(!prods.length)return null;return(
                          <div key={cat} style={{marginBottom:10}}>
                            <div style={{fontSize:9,color:CAT_COLORS[cat],textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:5}}>{cat}</div>
                            {prods.map(p=>{const last=avoirs.filter(a=>a.produit_id===p.id).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];return(
                              <div key={p.id} className="row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",background:"#141416",borderRadius:8,marginBottom:3,transition:"background 0.15s"}}>
                                <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:6,height:6,borderRadius:"50%",background:CAT_COLORS[cat]}}/><span style={{fontSize:12,color:"#CCC"}}>{p.nom}</span>{last&&<span style={{fontSize:10,color:"#555"}}>· {fmtDate(last.date)}</span>}</div>
                                <div style={{display:"flex",alignItems:"center",gap:8}}>
                                  <span style={{fontSize:13,fontWeight:500}}>{last?fmt(last.montant):"--"}</span>
                                  <button onClick={()=>openModal("avoir_new",{produit_id:p.id,produit_nom:p.nom})} style={{padding:"3px 8px",background:`${color}20`,border:1px solid ${color}40`,borderRadius:5,cursor:"pointer",color,fontSize:10}}>+ Avoir</button>
                                  <button onClick={()=>delProduit(p.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#E07A7A",fontSize:11}}>✕</button>
                                </div>
                              </div>
                            );})}
                          </div>
                        );})}
                      </div>
                    </div>
                  </div>
                )}

                {tab==="objectifs"&&(
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20}}>Objectifs</div>
                      <button className="btn" onClick={()=>openModal("objectif_new")} style={{padding:"8px 16px",background:color,border:"none",borderRadius:8,cursor:"pointer",color:"#0C0C0E",fontSize:11,fontWeight:600}}>+ Nouvel objectif</button>
                    </div>
                    {objectifs.length===0&&<div style={{color:"#444",fontSize:13}}>Aucun objectif défini.</div>}
                    <div style={{display:"flex",flexDirection:"column",gap:16}}>
                      {objectifs.map((obj,oi)=>{
                        const objJalons=jalons.filter(j=>j.objectif_id===obj.id);
                        const likedIds=objProduits.filter(op=>op.objectif_id===obj.id).map(op=>op.produit_id);
                        const likedProds=produits.filter(p=>likedIds.includes(p.id));
                        const patObj=patrimoineObjectif(obj.id);
                        const prog=pct(patObj,obj.montant_cible);
                        const ocol=COLORS[(oi+1)%COLORS.length];
                        return(
                          <div key={obj.id} style={{background:"#0F0F11",border:"1px solid #1A1A1E",borderRadius:12,overflow:"hidden"}}>
                            <div style={{padding:"18px 20px",borderBottom:"1px solid #1A1A1E"}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                                <div><div style={{fontSize:15,fontWeight:500,marginBottom:3}}>{obj.nom}</div>{obj.description&&<div style={{fontSize:11,color:"#666"}}>{obj.description}</div>}</div>
                                <div style={{display:"flex",alignItems:"center",gap:8}}>
                                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:ocol}}>{fmt(obj.montant_cible)}</div>
                                  <button onClick={()=>openModal("objectif_edit",{objectif_id:obj.id,nom:obj.nom,montant_cible:obj.montant_cible,description:obj.description||""})} style={{padding:"4px 8px",background:"none",border:"1px solid #2A2A2A",borderRadius:6,cursor:"pointer",color:"#888",fontSize:10}}>✏️</button>
                                  <button onClick={()=>delObjectif(obj.id)} style={{padding:"4px 8px",background:"none",border:"1px solid #2A2A2A",borderRadius:6,cursor:"pointer",color:"#E07A7A",fontSize:10}}>✕</button>
                                </div>
                              </div>
                              <div style={{marginBottom:10}}>
                                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                                  <span style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.12em"}}>Produits liés</span>
                                  <button onClick={()=>openModal("lier_produit",{objectif_id:obj.id,selectedProduits:likedIds})} style={{padding:"2px 8px",background:`${ocol}15`,border:1px solid ${ocol}30`,borderRadius:5,cursor:"pointer",color:ocol,fontSize:10}}>Gérer</button>
                                </div>
                                {likedProds.length===0?<div style={{fontSize:11,color:"#444",fontStyle:"italic"}}>Aucun produit lié</div>:
                                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{likedProds.map(p=><div key={p.id} style={{padding:"3px 10px",background:`${CAT_COLORS[p.categorie]}15`,border:1px solid ${CAT_COLORS[p.categorie]}30`,borderRadius:20,fontSize:11,color:CAT_COLORS[p.categorie]}}>{p.nom} -- {fmt(lastAvoir(p.id))}</div>)}</div>}
                              </div>
                              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#555",marginBottom:5}}>
                                <span>{fmt(patObj)} liés</span>
                                <button onClick={()=>setOpenProgObj(openProgObj===obj.id?null:obj.id)} style={{background:"none",border:"none",cursor:"pointer",color:ocol,fontSize:10,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                                  <span style={{fontWeight:600}}>{prog}%</span>
                                  <span style={{fontSize:8}}>{openProgObj===obj.id?"▲":"▼"}</span>
                                </button>
                              </div>
                              <div style={{background:"#1A1A1E",borderRadius:3,height:5,marginBottom:openProgObj===obj.id?10:0}}><div style={{width:`${prog}%`,height:"100%",background:ocol,borderRadius:3,transition:"width 0.4s"}}/></div>
                              {openProgObj===obj.id&&(()=>{
                                const likedProdIds=objProduits.filter(op=>op.objectif_id===obj.id).map(op=>op.produit_id);
                                const allAvoirsLiked=avoirs.filter(a=>likedProdIds.includes(a.produit_id)).sort((a,b)=>new Date(a.date)-new Date(b.date));
                                if(!allAvoirsLiked.length) return <div style={{fontSize:11,color:"#444",fontStyle:"italic",marginBottom:8}}>Aucun avoir renseigné sur les produits liés.</div>;
                                const byDate={};
                                const lkProg={};
                                allAvoirsLiked.forEach(a=>{if(!byDate[a.date])byDate[a.date]={};byDate[a.date][a.produit_id]=a.montant;});
                                const progData=Object.keys(byDate).sort().map(d=>{
                                  produits.filter(p=>likedProdIds.includes(p.id)).forEach(p=>{if(byDate[d][p.id]!==undefined)lkProg[p.id]=byDate[d][p.id];});
                                  const tot=Object.values(lkProg).reduce((s,v)=>s+v,0);
                                  return{date:fmtDate(d),ts:new Date(d).getTime(),pct:obj.montant_cible>0?Math.min(100,Math.round((tot/obj.montant_cible)*100)):0,total:tot};
                                });
                                return(
                                  <div style={{background:"#141416",borderRadius:8,padding:"12px 14px",marginBottom:10}}>
                                    <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:10}}>Progression vers l'objectif</div>
                                    <ResponsiveContainer width="100%" height={120}>
                                      <AreaChart data={progData} margin={{top:4,right:4,bottom:0,left:0}}>
                                        <defs><linearGradient id={`g${obj.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={ocol} stopOpacity={0.3}/><stop offset="95%" stopColor={ocol} stopOpacity={0}/></linearGradient></defs>
                                        <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin","dataMax"]} tickFormatter={ts=>{const d=new Date(ts);return`${d.toLocaleString("fr-FR",{month:"short"})} ${d.getFullYear()}`;}} tick={{fill:"#444",fontSize:9}} axisLine={false} tickLine={false} minTickGap={40}/>
                                        <YAxis domain={[0,100]} tick={{fill:"#444",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} width={30}/>
                                        <Tooltip labelFormatter={ts=>new Date(ts).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})} formatter={(v,n,props)=>[`${v}% (${fmt(props?.payload?.total||0)})`,""]} contentStyle={{background:"#1A1A1E",border:"none",borderRadius:6,fontSize:11,color:"#E2DDD6"}}/>
                                        <Area type="monotone" dataKey="pct" stroke={ocol} strokeWidth={2} fill={`url(#g${obj.id})`} dot={{fill:ocol,r:3}}/>
                                      </AreaChart>
                                    </ResponsiveContainer>
                                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#555",marginTop:6}}>
                                      <span>Départ : {progData[0]?.pct}%</span>
                                      <span>Actuel : <span style={{color:ocol,fontWeight:600}}>{prog}%</span></span>
                                      <span>Objectif : {fmt(obj.montant_cible)}</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            <div style={{padding:"14px 20px"}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                                <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.15em"}}>Jalons ({objJalons.length})</div>
                                <button className="btn" onClick={()=>openModal("jalon_new",{objectif_id:obj.id})} style={{padding:"4px 10px",background:`${ocol}15`,border:1px solid ${ocol}30`,borderRadius:6,cursor:"pointer",color:ocol,fontSize:10}}>+ Jalon</button>
                              </div>
                              {objJalons.length===0&&<div style={{color:"#444",fontSize:11}}>Aucun jalon</div>}
                              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                                {objJalons.map((j,ji)=>{const done=patObj>=(j.montant_cible||0);return(
                                  <div key={j.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 12px",background:"#141416",borderRadius:8}}>
                                    <div style={{width:20,height:20,borderRadius:"50%",background:done?`${ocol}20`:"#1A1A1E",border:1.`5px solid ${done?ocol:"#2A2A2A"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:done?ocol:"#555",flexShrink:0,marginTop:1}}>{done?"✓":ji+1}</div>
                                    <div style={{flex:1}}>
                                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                        <span style={{fontSize:12,color:done?"#E2DDD6":"#888"}}>{j.nom}</span>
                                        <div style={{display:"flex",alignItems:"center",gap:8}}>{j.montant_cible>0&&<span style={{fontSize:11,color:ocol}}>{fmt(j.montant_cible)}</span>}<button onClick={()=>delJalon(j.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#555",fontSize:11}}>✕</button></div>
                                      </div>
                                      {j.produit_lie&&<div style={{fontSize:10,color:"#555",marginTop:2}}>📦 {j.produit_lie}</div>}
                                      {j.moyens&&<div style={{fontSize:10,color:"#555",marginTop:2,fontStyle:"italic"}}>→ {j.moyens}</div>}
                                    </div>
                                  </div>
                                );})}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}


                {tab==="budget"&&<BudgetSection db={db} clientId={activeClient.id} isReadOnly={false}/>}
                {tab==="simulateur"&&<SimulateurSection patrimoineActuel={patrimoineActuel}/>}
                {tab==="immobilier"&&<ImmobilierSection db={db} clientId={activeClient.id} isReadOnly={false}/>}
                {tab==="impots"&&<ImpotsSection clientId={activeClient.id}/>}
                {tab==="bourse"&&<BourseSection db={db} clientId={activeClient.id} isReadOnly={false}/>}
                {tab==="dividendes"&&<DividendesSection db={db} clientId={activeClient.id} isReadOnly={false}/>}
                {tab==="identification"&&<IdentificationSection db={db} clientId={activeClient.id} isReadOnly={false}/>}

                {tab==="notes"&&<NotesSection db={db} clientId={activeClient.id} auteur="admin" color={color}/>}
                {tab==="informations"&&<InformationsSection/>}
              </div>
            </>
          );
        })()}
      </div>

      {/* MODALS */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
          <div className="modal-box" style={{background:"#0F0F11",border:"1px solid #222",borderRadius:14,padding:28,width:modal.type==="lier_produit"?380:420,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,marginBottom:20}}>{{client_new:"Nouveau client",client_edit:"Modifier",produit_new:"Nouveau produit",avoir_new:`Avoir -- ${modal.produit_nom||""}`,objectif_new:"Nouvel objectif",objectif_edit:"Modifier l'objectif",jalon_new:"Nouveau jalon",lier_produit:"Produits liés"}[modal.type]}</div>
            {(modal.type==="client_new"||modal.type==="client_edit")&&<>
  {inp("nom","Nom complet *","text","Sophie Martin")}
  {inp("patrimoine_cible","Patrimoine cible (€)","number","250000")}
  {inp("date_debut","Suivi depuis","text","Jan 2024")}
  <div style={{marginBottom:14}}>
    <div style={{fontSize:10,color:"#555",marginBottom:5}}>Statut</div>
    <select value={form.statut||"En bonne voie"} onChange={e=>f("statut",e.target.value)} style={{width:"100%",background:"#141416",border:"1px solid #222",borderRadius:7,padding:"9px 11px",color:"#CCC",fontSize:12}}>{STATUTS.map(s=><option key={s}>{s}</option>)}</select>
  </div>
  <div style={{marginBottom:20}}>
    <div style={{fontSize:10,color:"#555",marginBottom:8}}>Onglets accessibles</div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {ALL_TABS.map(tab=>{
        const active=(form.onglets_actifs||ALL_TABS).includes(tab);
        return(
          <div key={tab} onClick={()=>{
            const cur=form.onglets_actifs||ALL_TABS;
            const next=active?cur.filter(t=>t!==tab):[...cur,tab];
            f("onglets_actifs",next);
          }} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:active?"#1A2F1F":"#141416",border:`1px solid ${active?"#5EBF7A30":"#1A1A1E"}`,borderRadius:8,cursor:"pointer"}}>
            <div style={{width:16,height:16,borderRadius:4,background:active?"#5EBF7A":"#1A1A1E",border:1.`5px solid ${active?"#5EBF7A":"#333"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#0C0C0E",flexShrink:0}}>{active?"✓":""}</div>
            <span style={{fontSize:12,color:active?"#E2DDD6":"#777"}}>{TAB_LABELS[tab]}</span>
          </div>
        );
      })}
    </div>
  </div>
</>
            }
            {modal.type==="produit_new"&&<>{inp("nom","Nom *","text","Livret A, PEA...")}<div style={{marginBottom:20}}><div style={{fontSize:10,color:"#555",marginBottom:5}}>Catégorie</div><select value={form.categorie||"Épargne"} onChange={e=>f("categorie",e.target.value)} style={{width:"100%",background:"#141416",border:"1px solid #222",borderRadius:7,padding:"9px 11px",color:"#CCC",fontSize:12}}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div></>}
            {modal.type==="avoir_new"&&<>{inp("montant","Montant (€) *","number","12000")}<div style={{marginBottom:20}}><div style={{fontSize:10,color:"#555",marginBottom:5}}>Date *</div><input type="date" value={form.date||""} onChange={e=>f("date",e.target.value)} style={{width:"100%",background:"#141416",border:"1px solid #222",borderRadius:7,padding:"9px 11px",color:"#CCC",fontSize:12,fontFamily:"inherit"}}/></div></>}
            {(modal.type==="objectif_new"||modal.type==="objectif_edit")&&<>{inp("nom","Nom *","text","Retraite anticipée")}{inp("montant_cible","Montant cible (€) *","number","300000")}{inp("description","Description","text","Partir à 55 ans")}</>}
            {modal.type==="jalon_new"&&<>{inp("nom","Nom *","text","Ouvrir un PEA")}{inp("montant_cible","Montant cible (€)","number","10000")}{inp("produit_lie","Produit associé","text","PEA Bourse Direct")}{inp("moyens","Moyens","text","200€/mois dès janvier")}</>}
            {modal.type==="lier_produit"&&(
              <div style={{marginBottom:20}}>
                <div style={{fontSize:12,color:"#888",marginBottom:14}}>Coche les produits qui contribuent à cet objectif :</div>
                {CATEGORIES.map(cat=>{const prods=produits.filter(p=>p.categorie===cat);if(!prods.length)return null;return(
                  <div key={cat} style={{marginBottom:12}}>
                    <div style={{fontSize:9,color:CAT_COLORS[cat],textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:6}}>{cat}</div>
                    {prods.map(p=>{const checked=(modal.selectedProduits||[]).includes(p.id);return(
                      <div key={p.id} onClick={()=>{const cur=modal.selectedProduits||[];const next=checked?cur.filter(id=>id!==p.id):[...cur,p.id];setModal(m=>({...m,selectedProduits:next}));}}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:checked?`${CAT_COLORS[cat]}10`:"#141416",border:`1px solid ${checked?CAT_COLORS[cat]+"40":"#1A1A1E"}`,borderRadius:8,marginBottom:4,cursor:"pointer"}}>
                        <div style={{width:16,height:16,borderRadius:4,background:checked?CAT_COLORS[cat]:"#1A1A1E",border:1.`5px solid ${checked?CAT_COLORS[cat]:"#333"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#0C0C0E",flexShrink:0}}>{checked?"✓":""}</div>
                        <span style={{fontSize:12,color:checked?"#E2DDD6":"#888"}}>{p.nom}</span>
                        <span style={{fontSize:11,color:"#555",marginLeft:"auto"}}>{fmt(lastAvoir(p.id))}</span>
                      </div>
                    );})}
                  </div>
                );})}
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button className="btn" onClick={save} disabled={saving} style={{flex:1,padding:10,background:"#C9A96E",border:"none",borderRadius:8,cursor:"pointer",color:"#0C0C0E",fontSize:12,fontWeight:600}}>{saving?"...":"Enregistrer"}</button>
              <button onClick={()=>setModal(null)} style={{padding:"10px 16px",background:"#141416",border:"1px solid #222",borderRadius:8,cursor:"pointer",color:"#777",fontSize:12}}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
//  CLIENT APP
// ══════════════════════════════════════
function ClientApp({ db, userId, onLogout }) {
  const [client, setClient] = useState(null);
  const [produits, setProduits] = useState([]);
  const [avoirs, setAvoirs] = useState([]);
  const [objectifs, setObjectifs] = useState([]);
  const [jalons, setJalons] = useState([]);
  const [objProduits, setObjProduits] = useState([]);
  const [tab, setTab] = useState("identification");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [openProgObj, setOpenProgObj] = useState(null);

  useEffect(() => { loadClientProfile(); }, [userId]);

  async function loadClientProfile() {
    setLoading(true);
    try {
      const c = await db.get("clients",`select=*&user_id=eq.${userId}`);
      if (c.length>0) { setClient(c[0]); await loadData(c[0].id); }
    } catch(e){console.error(e);}
    setLoading(false);
  }

  async function loadData(cid) {
    try {
      const [p,a,o] = await Promise.all([
        db.get("produits",`select=*&client_id=eq.${cid}`),
        db.get("avoirs",`select=*&client_id=eq.${cid}&order=date`),
        db.get("objectifs",`select=*&client_id=eq.${cid}`),
      ]);
      setProduits(p); setAvoirs(a); setObjectifs(o);
      if (o.length>0) {
        const ids=o.map(x=>x.id).join(",");
        const [j,op]=await Promise.all([
          db.get("jalons",`select=*&objectif_id=in.(${ids})`),
          db.get("objectif_produits",`select=*&objectif_id=in.(${ids})`),
        ]);
        setJalons(j); setObjProduits(op);
      }
    } catch(e){console.error(e);}
  }

  const reload = () => { if (client) loadData(client.id); };
  const color = "#C9A96E";
  const lastAvoir = pid => { const a=avoirs.filter(a=>a.produit_id===pid).sort((a,b)=>new Date(b.date)-new Date(a.date)); return a[0]?.montant||0; };
  const patrimoineTotal = produits.reduce((s,p)=>s+lastAvoir(p.id),0);
  const patrimoineObj = oid => { const ids=objProduits.filter(op=>op.objectif_id===oid).map(op=>op.produit_id); return produits.filter(p=>ids.includes(p.id)).reduce((s,p)=>s+lastAvoir(p.id),0); };
  const parCategorie = CATEGORIES.map(cat=>({name:cat,value:produits.filter(p=>p.categorie===cat).reduce((s,p)=>s+lastAvoir(p.id),0),color:CAT_COLORS[cat]})).filter(c=>c.value>0);
  const timeline = (() => {
    const byDate={}; avoirs.forEach(a=>{if(!byDate[a.date])byDate[a.date]={};byDate[a.date][a.produit_id]=a.montant;});
    const dates=Object.keys(byDate).sort(); const lk={};
    return dates.map(d=>{produits.forEach(p=>{if(byDate[d][p.id]!==undefined)lk[p.id]=byDate[d][p.id];});return{date:fmtDate(d),rawDate:d,ts:new Date(d).getTime(),total:Object.values(lk).reduce((s,v)=>s+v,0)};});
  })();

  async function saveModal() {
    setSaving(true);
    try {
      if (modal.type==="produit_new") { await db.post("produits",{...form,client_id:client.id}); }
      else if (modal.type==="avoir_new") { await db.post("avoirs",{montant:parseFloat(form.montant),date:form.date,client_id:client.id,produit_id:modal.produit_id}); }
      else if (modal.type==="objectif_new") { await db.post("objectifs",{nom:form.nom,montant_cible:parseFloat(form.montant_cible),description:form.description,client_id:client.id}); }
      else if (modal.type==="objectif_edit") { await db.patch("objectifs",modal.objectif_id,{nom:form.nom,montant_cible:parseFloat(form.montant_cible),description:form.description}); }
      else if (modal.type==="jalon_new") { await db.post("jalons",{...form,montant_cible:parseFloat(form.montant_cible)||null,objectif_id:modal.objectif_id}); }
      else if (modal.type==="lier_produit") {
        const already=objProduits.filter(op=>op.objectif_id===modal.objectif_id).map(op=>op.produit_id);
        for (const pid of modal.selectedProduits.filter(id=>!already.includes(id))) await db.post("objectif_produits",{objectif_id:modal.objectif_id,produit_id:pid});
        for (const pid of already.filter(id=>!modal.selectedProduits.includes(id))) { const op=objProduits.find(x=>x.objectif_id===modal.objectif_id&&x.produit_id===pid); if(op) await db.del("objectif_produits",op.id); }
      }
      await reload(); setModal(null);
    } catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  }

  async function delProduit(id) { if(!window.confirm("Supprimer ?"))return; await db.del("produits",id); reload(); }
  async function delObjectif(id) { if(!window.confirm("Supprimer ?"))return; await db.del("objectifs",id); reload(); }
  async function delJalon(id) { await db.del("jalons",id); reload(); }

  function openModal(type,extra={}) {
    const d={produit_new:EMPTY_PRODUIT,avoir_new:EMPTY_AVOIR,objectif_new:EMPTY_OBJECTIF,objectif_edit:{nom:extra.nom||"",montant_cible:extra.montant_cible||"",description:extra.description||""},jalon_new:EMPTY_JALON,lier_produit:{}};
    setForm(d[type]||{}); setModal({type,...extra});
  }

  const f=(k,v)=>setForm(p=>({...p,[k]:v}));
  const inp=(k,l,t="text",ph="")=>(
    <div style={{marginBottom:14}}>
      <div style={{fontSize:10,color:"#555",marginBottom:5}}>{l}</div>
      <input type={t} placeholder={ph} value={form[k]||""} onChange={e=>f(k,e.target.value)}
        style={{width:"100%",background:"#141416",border:"1px solid #222",borderRadius:7,padding:"9px 11px",color:"#CCC",fontSize:12}} />
    </div>
  );

  if (loading) return <div style={{minHeight:"100vh",background:"#0C0C0E",display:"flex",alignItems:"center",justifyContent:"center",color:"#555",fontFamily:"'DM Sans',sans-serif"}}>Chargement...</div>;
  if (!client) return (
    <div style={{minHeight:"100vh",background:"#0C0C0E",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",color:"#555",flexDirection:"column",gap:16}}>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"#C9A96E",letterSpacing:"0.08em"}}>Rob'Invest</div>
      <div style={{fontSize:13}}>Aucun profil trouvé. Contacte ton conseiller.</div>
      <button onClick={onLogout} style={{padding:"8px 20px",background:"#141416",border:"1px solid #222",borderRadius:8,cursor:"pointer",color:"#777",fontSize:12,fontFamily:"inherit"}}>Déconnexion</button>
    </div>
  );

  const st = statutStyle[client.statut]||statutStyle["En bonne voie"];

  return (
    <div style={{minHeight:"100vh",background:"#0C0C0E",fontFamily:"'DM Sans',sans-serif",color:"#E2DDD6"}}>
      <style>{CSS}</style>

      {/* Header */}
      <div className="header-pad" style={{borderBottom:"1px solid #1A1A1E",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0F0F11"}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#C9A96E",letterSpacing:"0.08em"}}>Rob'Invest</div>
          <div style={{width:1,height:20,background:"#222"}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:`${color}18`,border:1.5px solid ${color}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:600,color}}>{initials(client.nom)}</div>
            <div>
              <div style={{fontSize:13,fontWeight:500}}>{client.nom}</div>
              <div style={{fontSize:10,color:"#555"}}>Mon espace patrimonial</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div className="tag" style={{background:st.bg,color:st.text}}><div style={{width:4,height:4,borderRadius:"50%",background:st.dot,marginRight:5}}/>{client.statut}</div>
          <button onClick={onLogout} style={{padding:"6px 14px",background:"#141416",border:"1px solid #222",borderRadius:8,cursor:"pointer",color:"#666",fontSize:11,fontFamily:"inherit"}} className="hide-mob">Déconnexion</button>
          <button onClick={onLogout} style={{padding:"6px 10px",background:"#141416",border:"1px solid #222",borderRadius:8,cursor:"pointer",color:"#666",fontSize:11,fontFamily:"inherit",display:"none"}} className="show-mob">↩</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-row" style={{borderBottom:"1px solid #1A1A1E",background:"#0F0F11"}}>
        {ALL_TABS.filter(k => !client.onglets_actifs || client.onglets_actifs.includes(k)).map(k => [k, CLIENT_TAB_LABELS[k]]).map(([k,l])=>(
          <button key={k} className="tb" onClick={()=>setTab(k)}
            style={{background:"none",border:"none",cursor:"pointer",padding:"13px 18px",fontSize:12,fontWeight:500,color:tab===k?color:"#444",borderBottom:tab===k?`2px solid ${color}`:"2px solid transparent",fontFamily:"inherit"}}>
            {l}
          </button>
        ))}
      </div>

      <div className="page-pad" style={{maxWidth:960,margin:"0 auto"}}>

        {tab==="synthese"&&(
          <SyntheseEvolSection
            produits={produits} avoirs={avoirs} parCategorie={parCategorie}
            patrimoineActuel={patrimoineTotal} timeline={timeline} color={color}
            activeClient={client} fmt={fmt} fmtDate={fmtDate}
            onAddProduit={()=>openModal("produit_new")}
            onAddAvoir={(prod)=>openModal("avoir_new",{produit_id:prod.id,produit_nom:prod.nom})}
            onDelProduit={delProduit}
            isAdmin={false} db={db} clientId={client?.id}
          />
        )}
        {tab==="synthese_OLD"&&(
          <div>
            <div className="grid-2" style={{marginBottom:20}}>
              {[{label:"Patrimoine total",val:fmt(patrimoineTotal)},{label:"Patrimoine cible",val:fmt(client.patrimoine_cible)}].map((k,i)=>(
                <div key={i} style={{background:"#0F0F11",border:"1px solid #1A1A1E",borderRadius:12,padding:"18px 20px"}}>
                  <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:6}}>{k.label}</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28}}>{k.val}</div>
                </div>
              ))}
            </div>
            <div className="grid-split">
              <div style={{background:"#0F0F11",border:"1px solid #1A1A1E",borderRadius:12,padding:20}}>
                <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:14}}>Répartition</div>
                {parCategorie.length>0?<>
                  <ResponsiveContainer width="100%" height={140}><PieChart><Pie data={parCategorie} dataKey="value" innerRadius={40} outerRadius={62} paddingAngle={3}>{parCategorie.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1A1A1E",border:"none",borderRadius:6,fontSize:11,color:"#E2DDD6"}}/></PieChart></ResponsiveContainer>
                  {parCategorie.map((c,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:6,height:6,borderRadius:"50%",background:c.color}}/><span style={{fontSize:11,color:"#777"}}>{c.name}</span></div><span style={{fontSize:11,color:"#999"}}>{fmt(c.value)}</span></div>)}
                </>:<div style={{color:"#444",fontSize:12,textAlign:"center",paddingTop:20}}>Aucun produit</div>}
              </div>
              <div style={{background:"#0F0F11",border:"1px solid #1A1A1E",borderRadius:12,padding:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.15em"}}>Mes produits</div>
                  <button className="btn" onClick={()=>openModal("produit_new")} style={{padding:"5px 12px",background:color,border:"none",borderRadius:6,cursor:"pointer",color:"#0C0C0E",fontSize:10,fontWeight:600}}>+ Ajouter</button>
                </div>
                {CATEGORIES.map(cat=>{const prods=produits.filter(p=>p.categorie===cat);if(!prods.length)return null;return(
                  <div key={cat} style={{marginBottom:10}}>
                    <div style={{fontSize:9,color:CAT_COLORS[cat],textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:5}}>{cat}</div>
                    {prods.map(p=>{const last=avoirs.filter(a=>a.produit_id===p.id).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];return(
                      <div key={p.id} className="row" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",background:"#141416",borderRadius:8,marginBottom:3,transition:"background 0.15s"}}>
                        <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:6,height:6,borderRadius:"50%",background:CAT_COLORS[cat]}}/><span style={{fontSize:12,color:"#CCC"}}>{p.nom}</span>{last&&<span style={{fontSize:10,color:"#555"}}>· {fmtDate(last.date)}</span>}</div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:13,fontWeight:500}}>{last?fmt(last.montant):"--"}</span>
                          <button onClick={()=>openModal("avoir_new",{produit_id:p.id,produit_nom:p.nom})} style={{padding:"3px 8px",background:`${color}20`,border:1px solid ${color}40`,borderRadius:5,cursor:"pointer",color,fontSize:10}}>+ Avoir</button>
                          <button onClick={()=>delProduit(p.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#E07A7A",fontSize:11}}>✕</button>
                        </div>
                      </div>
                    );})}
                  </div>
                );})}
              </div>
            </div>
          </div>
        )}

        {tab==="objectifs"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20}}>Mes objectifs</div>
              <button className="btn" onClick={()=>openModal("objectif_new")} style={{padding:"8px 16px",background:color,border:"none",borderRadius:8,cursor:"pointer",color:"#0C0C0E",fontSize:11,fontWeight:600}}>+ Ajouter</button>
            </div>
            {objectifs.length===0&&<div style={{color:"#444",fontSize:13}}>Aucun objectif défini.</div>}
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {objectifs.map((obj,oi)=>{
                const objJalons=jalons.filter(j=>j.objectif_id===obj.id);
                const likedIds=objProduits.filter(op=>op.objectif_id===obj.id).map(op=>op.produit_id);
                const likedProds=produits.filter(p=>likedIds.includes(p.id));
                const patObj=patrimoineObj(obj.id);
                const prog=pct(patObj,obj.montant_cible);
                const ocol=COLORS[(oi+1)%COLORS.length];
                return(
                  <div key={obj.id} style={{background:"#0F0F11",border:"1px solid #1A1A1E",borderRadius:12,overflow:"hidden"}}>
                    <div style={{padding:"18px 20px",borderBottom:"1px solid #1A1A1E"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                        <div><div style={{fontSize:15,fontWeight:500,marginBottom:3}}>{obj.nom}</div>{obj.description&&<div style={{fontSize:11,color:"#666"}}>{obj.description}</div>}</div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:ocol}}>{fmt(obj.montant_cible)}</div>
                          <button onClick={()=>openModal("objectif_edit",{objectif_id:obj.id,nom:obj.nom,montant_cible:obj.montant_cible,description:obj.description||""})} style={{padding:"4px 8px",background:"none",border:"1px solid #2A2A2A",borderRadius:6,cursor:"pointer",color:"#888",fontSize:10}}>✏️</button>
                          <button onClick={()=>delObjectif(obj.id)} style={{padding:"4px 8px",background:"none",border:"1px solid #2A2A2A",borderRadius:6,cursor:"pointer",color:"#E07A7A",fontSize:10}}>✕</button>
                        </div>
                      </div>
                      <div style={{marginBottom:10}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <span style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.12em"}}>Produits liés</span>
                          <button onClick={()=>openModal("lier_produit",{objectif_id:obj.id,selectedProduits:likedIds})} style={{padding:"2px 8px",background:`${ocol}15`,border:1px solid ${ocol}30`,borderRadius:5,cursor:"pointer",color:ocol,fontSize:10}}>Gérer</button>
                        </div>
                        {likedProds.length===0?<div style={{fontSize:11,color:"#444",fontStyle:"italic"}}>Aucun produit lié</div>:
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{likedProds.map(p=><div key={p.id} style={{padding:"3px 10px",background:`${CAT_COLORS[p.categorie]}15`,border:1px solid ${CAT_COLORS[p.categorie]}30`,borderRadius:20,fontSize:11,color:CAT_COLORS[p.categorie]}}>{p.nom} -- {fmt(lastAvoir(p.id))}</div>)}</div>}
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#555",marginBottom:5}}>
                        <span>{fmt(patObj)} accumulés</span>
                        <button onClick={()=>setOpenProgObj(openProgObj===obj.id?null:obj.id)} style={{background:"none",border:"none",cursor:"pointer",color:ocol,fontSize:10,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                          <span style={{fontWeight:600}}>{prog}%</span>
                          <span style={{fontSize:8}}>{openProgObj===obj.id?"▲":"▼"}</span>
                        </button>
                      </div>
                      <div style={{background:"#1A1A1E",borderRadius:3,height:6,marginBottom:openProgObj===obj.id?10:0}}><div style={{width:`${prog}%`,height:"100%",background:ocol,borderRadius:3}}/></div>
                      {openProgObj===obj.id&&(()=>{
                        const likedProdIds=objProduits.filter(op=>op.objectif_id===obj.id).map(op=>op.produit_id);
                        const allAvoirsLiked=avoirs.filter(a=>likedProdIds.includes(a.produit_id)).sort((a,b)=>new Date(a.date)-new Date(b.date));
                        if(!allAvoirsLiked.length) return <div style={{fontSize:11,color:"#444",fontStyle:"italic",marginBottom:8}}>Aucun avoir renseigné sur les produits liés.</div>;
                        const byDate={};
                        const lkProg={};
                        allAvoirsLiked.forEach(a=>{if(!byDate[a.date])byDate[a.date]={};byDate[a.date][a.produit_id]=a.montant;});
                        const progData=Object.keys(byDate).sort().map(d=>{
                          produits.filter(p=>likedProdIds.includes(p.id)).forEach(p=>{if(byDate[d][p.id]!==undefined)lkProg[p.id]=byDate[d][p.id];});
                          const tot=Object.values(lkProg).reduce((s,v)=>s+v,0);
                          return{date:fmtDate(d),ts:new Date(d).getTime(),pct:obj.montant_cible>0?Math.min(100,Math.round((tot/obj.montant_cible)*100)):0,total:tot};
                        });
                        return(
                          <div style={{background:"#141416",borderRadius:8,padding:"12px 14px",marginBottom:10}}>
                            <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:10}}>Progression vers l'objectif</div>
                            <ResponsiveContainer width="100%" height={120}>
                              <AreaChart data={progData} margin={{top:4,right:4,bottom:0,left:0}}>
                                <defs><linearGradient id={`gc${obj.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={ocol} stopOpacity={0.3}/><stop offset="95%" stopColor={ocol} stopOpacity={0}/></linearGradient></defs>
                                <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin","dataMax"]} tickFormatter={ts=>{const d=new Date(ts);return`${d.toLocaleString("fr-FR",{month:"short"})} ${d.getFullYear()}`;}} tick={{fill:"#444",fontSize:9}} axisLine={false} tickLine={false} minTickGap={40}/>
                                <YAxis domain={[0,100]} tick={{fill:"#444",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} width={30}/>
                                <Tooltip labelFormatter={ts=>new Date(ts).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})} formatter={v=>[`${v}%`,""]} contentStyle={{background:"#1A1A1E",border:"none",borderRadius:6,fontSize:11,color:"#E2DDD6"}}/>
                                <Area type="monotone" dataKey="pct" stroke={ocol} strokeWidth={2} fill={`url(#gc${obj.id})`} dot={{fill:ocol,r:3}}/>
                              </AreaChart>
                            </ResponsiveContainer>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#555",marginTop:6}}>
                              <span>Départ : {progData[0]?.pct}%</span>
                              <span>Actuel : <span style={{color:ocol,fontWeight:600}}>{prog}%</span></span>
                              <span>Objectif : {fmt(obj.montant_cible)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    {objJalons.length>0&&(
                      <div style={{padding:"14px 20px"}}>
                        <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:10}}>Jalons</div>
                        <div style={{display:"flex",flexDirection:"column",gap:5}}>
                          {objJalons.map((j,ji)=>{const done=patObj>=(j.montant_cible||0);return(
                            <div key={j.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 12px",background:"#141416",borderRadius:8}}>
                              <div style={{width:20,height:20,borderRadius:"50%",background:done?`${ocol}20`:"#1A1A1E",border:1.`5px solid ${done?ocol:"#2A2A2A"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:done?ocol:"#555",flexShrink:0,marginTop:1}}>{done?"✓":ji+1}</div>
                              <div style={{flex:1}}>
                                <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,color:done?"#E2DDD6":"#888"}}>{j.nom}</span>{j.montant_cible>0&&<span style={{fontSize:11,color:ocol}}>{fmt(j.montant_cible)}</span>}</div>
                                {j.produit_lie&&<div style={{fontSize:10,color:"#555",marginTop:2}}>📦 {j.produit_lie}</div>}
                                {j.moyens&&<div style={{fontSize:10,color:"#555",marginTop:2,fontStyle:"italic"}}>→ {j.moyens}</div>}
                              </div>
                            </div>
                          );})}
                        </div>
                      </div>
                    )}
                    <div style={{padding:"10px 20px",borderTop:"1px solid #1A1A1E",display:"flex",gap:8}}>
                      <button className="btn" onClick={()=>openModal("jalon_new",{objectif_id:obj.id})} style={{padding:"5px 12px",background:`${ocol}15`,border:1px solid ${ocol}30`,borderRadius:6,cursor:"pointer",color:ocol,fontSize:10}}>+ Jalon</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {tab==="budget"&&<BudgetSection db={db} clientId={client.id} isReadOnly={false}/>}
        {tab==="simulateur"&&<SimulateurSection patrimoineActuel={patrimoineTotal}/>}
        {tab==="immobilier"&&<ImmobilierSection db={db} clientId={client.id} isReadOnly={false}/>}
        {tab==="impots"&&<ImpotsSection clientId={client.id}/>}
        {tab==="bourse"&&<BourseSection db={db} clientId={client.id} isReadOnly={false}/>}
        {tab==="dividendes"&&<DividendesSection db={db} clientId={client.id} isReadOnly={false}/>}
        {tab==="identification"&&<IdentificationSection db={db} clientId={client.id} isReadOnly={false}/>}
        {tab==="notes"&&<NotesSection db={db} clientId={client.id} auteur="client" color={color}/>}
        {tab==="informations"&&<InformationsSection/>}
      </div>

      {/* MODALS CLIENT */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
          <div className="modal-box" style={{background:"#0F0F11",border:"1px solid #222",borderRadius:14,padding:28,width:modal.type==="lier_produit"?380:400,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,marginBottom:20}}>{{produit_new:"Nouveau produit",avoir_new:`Avoir -- ${modal.produit_nom||""}`,objectif_new:"Nouvel objectif",objectif_edit:"Modifier l'objectif",jalon_new:"Nouveau jalon",lier_produit:"Produits liés"}[modal.type]}</div>
            {modal.type==="produit_new"&&<>{inp("nom","Nom *","text","Livret A, PEA...")}<div style={{marginBottom:20}}><div style={{fontSize:10,color:"#555",marginBottom:5}}>Catégorie</div><select value={form.categorie||"Épargne"} onChange={e=>f("categorie",e.target.value)} style={{width:"100%",background:"#141416",border:"1px solid #222",borderRadius:7,padding:"9px 11px",color:"#CCC",fontSize:12}}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div></>}
            {modal.type==="avoir_new"&&<>{inp("montant","Montant (€) *","number","12000")}<div style={{marginBottom:20}}><div style={{fontSize:10,color:"#555",marginBottom:5}}>Date *</div><input type="date" value={form.date||""} onChange={e=>f("date",e.target.value)} style={{width:"100%",background:"#141416",border:"1px solid #222",borderRadius:7,padding:"9px 11px",color:"#CCC",fontSize:12,fontFamily:"inherit"}}/></div></>}
            {(modal.type==="objectif_new"||modal.type==="objectif_edit")&&<>{inp("nom","Nom *","text","Mon objectif")}{inp("montant_cible","Montant cible (€) *","number","50000")}{inp("description","Description","text","Description de mon objectif")}</>}
            {modal.type==="jalon_new"&&<>{inp("nom","Nom *","text","Étape 1")}{inp("montant_cible","Montant cible (€)","number","10000")}{inp("produit_lie","Produit associé","text","PEA")}{inp("moyens","Comment y arriver","text","200€/mois")}</>}
            {modal.type==="lier_produit"&&(
              <div style={{marginBottom:20}}>
                <div style={{fontSize:12,color:"#888",marginBottom:14}}>Coche les produits liés à cet objectif :</div>
                {CATEGORIES.map(cat=>{const prods=produits.filter(p=>p.categorie===cat);if(!prods.length)return null;return(
                  <div key={cat} style={{marginBottom:12}}>
                    <div style={{fontSize:9,color:CAT_COLORS[cat],textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:6}}>{cat}</div>
                    {prods.map(p=>{const checked=(modal.selectedProduits||[]).includes(p.id);return(
                      <div key={p.id} onClick={()=>{const cur=modal.selectedProduits||[];const next=checked?cur.filter(id=>id!==p.id):[...cur,p.id];setModal(m=>({...m,selectedProduits:next}));}}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:checked?`${CAT_COLORS[cat]}10`:"#141416",border:`1px solid ${checked?CAT_COLORS[cat]+"40":"#1A1A1E"}`,borderRadius:8,marginBottom:4,cursor:"pointer"}}>
                        <div style={{width:16,height:16,borderRadius:4,background:checked?CAT_COLORS[cat]:"#1A1A1E",border:1.`5px solid ${checked?CAT_COLORS[cat]:"#333"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#0C0C0E",flexShrink:0}}>{checked?"✓":""}</div>
                        <span style={{fontSize:12,color:checked?"#E2DDD6":"#888"}}>{p.nom}</span>
                        <span style={{fontSize:11,color:"#555",marginLeft:"auto"}}>{fmt(lastAvoir(p.id))}</span>
                      </div>
                    );})}
                  </div>
                );})}
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button className="btn" onClick={saveModal} disabled={saving} style={{flex:1,padding:10,background:"#C9A96E",border:"none",borderRadius:8,cursor:"pointer",color:"#0C0C0E",fontSize:12,fontWeight:600}}>{saving?"...":"Enregistrer"}</button>
              <button onClick={()=>setModal(null)} style={{padding:"10px 16px",background:"#141416",border:"1px solid #222",borderRadius:8,cursor:"pointer",color:"#777",fontSize:12}}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
