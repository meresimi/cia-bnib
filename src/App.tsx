import { useState, useRef, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

// ─── Themes ───────────────────────────────────────────────────────────────────
const THEMES: Record<string, any> = {
  daylight: {
    bg:          "#F4F6F9",
    surface:     "#FFFFFF",
    card:        "#FFFFFF",
    border:      "#C5D0DE",
    accent:      "#2E6DB4",
    accentLight: "#1A4F8A",
    teal:        "#1A7A7A",
    text:        "#1A1A2E",
    muted:       "#5A6A7E",
    danger:      "#D93025",
    success:     "#1E8A5E",
    inputBg:     "#FFFFFF",
    topbar:      "#3C6AA3",
    topbarText:  "#FFFFFF",
  },
  night: {
    bg:          "#0D1B2A",
    surface:     "#162032",
    card:        "#1C2B3A",
    border:      "#253A50",
    accent:      "#C8973A",
    accentLight: "#E8B55A",
    teal:        "#2ABFBF",
    text:        "#E8EEF4",
    muted:       "#7A93A8",
    danger:      "#E05C5C",
    success:     "#4CAF86",
    inputBg:     "#0D1B2A",
    topbar:      "#0D1B2A",
    topbarText:  "#FFFFFF",
  },
};

// Active theme — updated via setTheme
let C = THEMES.daylight;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function injectDynamicStyles(theme: any) {
  let el = document.getElementById("cia-styles") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style") as HTMLStyleElement;
    el.id = "cia-styles";
    document.head.appendChild(el);
  }
  el.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body {
  background: ${theme.bg};
  color: ${theme.text};
  font-family: 'Lato', sans-serif;
  min-height: 100vh;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
input[type=number] { -moz-appearance: textfield; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: ${theme.surface}; }
::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
`;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Input({ label, value, onChange, type = "text", placeholder, readOnly, style, T }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      {label && <label style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</label>}
      <input
        type={type}
        value={value ?? ""}
        onChange={(e: any) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{
          background: readOnly ? T.surface : T.inputBg,
          border: `1.5px solid ${T.border}`,
          borderRadius: 6,
          padding: "8px 12px",
          color: readOnly ? T.muted : T.text,
          fontSize: 13,
          outline: "none",
          width: "100%",
          transition: "border-color 0.2s",
          cursor: readOnly ? "default" : "text",
        }}
        onFocus={(e: any) => { if (!readOnly) e.target.style.borderColor = T.accent; }}
        onBlur={(e: any) => { e.target.style.borderColor = T.border; }}
      />
    </div>
  );
}

function RadioGroup({ label, value, onChange, options, T }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</label>}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {options.map((opt: string) => (
          <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <div onClick={() => onChange(opt)} style={{
              width: 18, height: 18, borderRadius: "50%",
              border: `2px solid ${value === opt ? T.accent : T.border}`,
              background: value === opt ? T.accent : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
            }}>
              {value === opt && <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.bg }} />}
            </div>
            <span onClick={() => onChange(opt)} style={{ color: value === opt ? T.text : T.muted }}>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ children, icon, T }: any) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 16px", margin: "24px 0 16px",
      background: `linear-gradient(90deg, ${T.accent}22, transparent)`,
      borderLeft: `3px solid ${T.accent}`,
      borderRadius: "0 6px 6px 0",
    }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: "0.1em", color: T.accentLight, fontWeight: 600 }}>{children}</h3>
    </div>
  );
}

function SubHeader({ children, T }: any) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
      color: T.teal, textTransform: "uppercase",
      borderBottom: `1px solid ${T.border}`,
      paddingBottom: 5, marginBottom: 10, marginTop: 14,
    }}>{children}</div>
  );
}

function ActivityRow({ label, values, onChange, readOnly, T }: any) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "140px 1fr 1fr 1fr",
      gap: 8, alignItems: "center", padding: "6px 0",
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ fontSize: 12, color: readOnly ? T.accent : T.text, fontWeight: readOnly ? 700 : 400 }}>{label}</div>
      {["no", "att", "fof"].map((k) => (
        <input key={k} type="number" value={values[k] ?? ""} onChange={(e: any) => onChange && onChange(k, e.target.value)}
          readOnly={readOnly} placeholder="0"
          style={{
            background: readOnly ? T.surface : T.inputBg,
            border: `1.5px solid ${T.border}`,
            borderRadius: 6, padding: "7px 10px",
            color: readOnly ? T.muted : T.text,
            fontSize: 13, outline: "none", textAlign: "center" as const,
            cursor: readOnly ? "default" : "text",
          }}
        />
      ))}
    </div>
  );
}

// ─── Comments Modal ───────────────────────────────────────────────────────────
function CommentsModal({ value, onClose, T }: any) {
  const [draft, setDraft] = useState(value || "");
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000099", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={() => onClose(null)}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.card, borderRadius: 12, padding: 28, width: "100%", maxWidth: 560,
        border: `1.5px solid ${T.border}`, boxShadow: "0 20px 60px #00000088", animation: "slideUp 0.2s ease",
      }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: T.accentLight, marginBottom: 16, letterSpacing: "0.1em" }}>✏️ Comments</div>
        <textarea autoFocus value={draft} onChange={(e: any) => setDraft(e.target.value)} placeholder="Enter your comments here..."
          style={{
            width: "100%", minHeight: 160, background: T.inputBg,
            border: `1.5px solid ${T.border}`, borderRadius: 8,
            padding: 12, color: T.text, fontSize: 13,
            fontFamily: "'Lato', sans-serif", resize: "vertical" as const, outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={() => onClose(null)} style={{ padding: "8px 20px", borderRadius: 6, border: `1.5px solid ${T.border}`, background: "transparent", color: T.muted, cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={() => onClose(draft)} style={{ padding: "8px 24px", borderRadius: 6, border: "none", background: T.accent, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>OK</button>
        </div>
      </div>
    </div>
  );
}

// ─── Form State ───────────────────────────────────────────────────────────────
const emptyForm = () => ({
  id: Date.now(),
  date: new Date().toISOString().split("T")[0],
  nationalCommunity: "", cluster: "", cia: "", ruralUrban: "",
  generalPopulation: "", totalHouseholds: "", individualsConnected: "", householdsConnected: "",
  activities: {
    children:    { no: "", att: "", fof: "" },
    juniorYouth: { no: "", att: "", fof: "" },
    studyCircle: { no: "", att: "", fof: "" },
    devotional:  { no: "", att: "", fof: "" },
  },
  book1: "", totalRuhi: "", newHumanResources: "", totalHumanResources: "",
  accompany: "", pockets: "", regularUndertakings: "", localAssembly: "",
  socialAction: "", localLeaders: "", spiritualHealth: "", comments: "",
});

function calcTotals(activities: any) {
  const keys = ["children", "juniorYouth", "studyCircle", "devotional"];
  const total = { no: 0, att: 0, fof: 0 };
  keys.forEach((k) => {
    total.no  += parseInt(activities[k].no)  || 0;
    total.att += parseInt(activities[k].att) || 0;
    total.fof += parseInt(activities[k].fof) || 0;
  });
  return total;
}

// ─── Data Collection Form ─────────────────────────────────────────────────────
function DataCollectionForm({ forms, setForms, currentIndex, setCurrentIndex, T }: any) {
  const [showComments, setShowComments] = useState(false);
  const form = forms[currentIndex];

  const update = useCallback((field: string, val: any) => {
    setForms((prev: any[]) => prev.map((f: any, i: number) => i === currentIndex ? { ...f, [field]: val } : f));
  }, [currentIndex, setForms]);

  const updateActivity = useCallback((activity: string, key: string, val: string) => {
    setForms((prev: any[]) => prev.map((f: any, i: number) => i === currentIndex ? {
      ...f, activities: { ...f.activities, [activity]: { ...f.activities[activity], [key]: val } }
    } : f));
  }, [currentIndex, setForms]);

  const totals = calcTotals(form.activities);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 60px" }}>
      {showComments && (
        <CommentsModal T={T} value={form.comments} onClose={(val: any) => {
          if (typeof val === "string") update("comments", val);
          setShowComments(false);
        }} />
      )}

      {/* Record navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: T.muted }}>Record {currentIndex + 1} of {forms.length}</span>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {forms.map((_: any, i: number) => (
            <button key={i} onClick={() => setCurrentIndex(i)} style={{
              width: 28, height: 28, borderRadius: "50%",
              background: i === currentIndex ? T.accent : T.surface,
              border: `1.5px solid ${i === currentIndex ? T.accent : T.border}`,
              color: i === currentIndex ? "#fff" : T.muted,
              fontSize: 11, cursor: "pointer", fontWeight: 700,
            }}>{i + 1}</button>
          ))}
        </div>
        <button onClick={() => { setForms((p: any[]) => [...p, emptyForm()]); setCurrentIndex(forms.length); }}
          style={{ marginLeft: "auto", padding: "7px 16px", borderRadius: 6, background: "transparent", border: `1.5px solid ${T.teal}`, color: T.teal, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
          + New Record
        </button>
      </div>

      <SectionHeader T={T} icon="📋">General Information</SectionHeader>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <Input T={T} label="Date" type="date" value={form.date} onChange={(v: string) => update("date", v)} />
        <Input T={T} label="National Community" value={form.nationalCommunity} onChange={(v: string) => update("nationalCommunity", v)} placeholder="e.g. Solomon Islands" />
        <Input T={T} label="Cluster" value={form.cluster} onChange={(v: string) => update("cluster", v)} placeholder="Cluster name" />
        <Input T={T} label="Centre of Intense Activity" value={form.cia} onChange={(v: string) => update("cia", v)} placeholder="CIA name" />
      </div>
      <div style={{ marginTop: 14 }}>
        <RadioGroup T={T} label="Rural or Urban" value={form.ruralUrban} onChange={(v: string) => update("ruralUrban", v)} options={["Rural", "Urban"]} />
      </div>
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <Input T={T} label="General Population (est.)" type="number" value={form.generalPopulation} onChange={(v: string) => update("generalPopulation", v)} placeholder="0" />
        <Input T={T} label="Total Households" type="number" value={form.totalHouseholds} onChange={(v: string) => update("totalHouseholds", v)} placeholder="0" />
        <Input T={T} label="Individuals Connected" type="number" value={form.individualsConnected} onChange={(v: string) => update("individualsConnected", v)} placeholder="0" />
        <Input T={T} label="Households Connected" type="number" value={form.householdsConnected} onChange={(v: string) => update("householdsConnected", v)} placeholder="0" />
      </div>

      <SectionHeader T={T} icon="🌟">Core Activities</SectionHeader>
      <div style={{ background: T.surface, borderRadius: 10, padding: "14px 16px", border: `1.5px solid ${T.border}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div />
          {["No.", "Att.", "FoF."].map((h) => (
            <div key={h} style={{ fontSize: 11, color: T.accent, fontWeight: 700, letterSpacing: "0.1em", textAlign: "center" as const, textTransform: "uppercase" as const }}>{h}</div>
          ))}
        </div>
        <SubHeader T={T}>Children's Classes</SubHeader>
        <ActivityRow T={T} label="Children's Classes" values={form.activities.children} onChange={(k: string, v: string) => updateActivity("children", k, v)} />
        <SubHeader T={T}>Junior Youth Groups</SubHeader>
        <ActivityRow T={T} label="Junior Youth Groups" values={form.activities.juniorYouth} onChange={(k: string, v: string) => updateActivity("juniorYouth", k, v)} />
        <SubHeader T={T}>Study Circles</SubHeader>
        <ActivityRow T={T} label="Study Circles" values={form.activities.studyCircle} onChange={(k: string, v: string) => updateActivity("studyCircle", k, v)} />
        <SubHeader T={T}>Devotional Meetings</SubHeader>
        <ActivityRow T={T} label="Devotional Meetings" values={form.activities.devotional} onChange={(k: string, v: string) => updateActivity("devotional", k, v)} />
        <div style={{ marginTop: 12, background: `${T.accent}11`, borderRadius: 8, padding: "4px 0", border: `1px solid ${T.accent}44` }}>
          <SubHeader T={T}>Total Activities (Auto-generated)</SubHeader>
          <ActivityRow T={T} label="Total" values={totals} readOnly />
        </div>
      </div>

      <SectionHeader T={T} icon="👥">Human Resource Development</SectionHeader>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <Input T={T} label="Book 1 Completions (last 6 months)" type="number" value={form.book1} onChange={(v: string) => update("book1", v)} placeholder="0" />
        <Input T={T} label="Total Ruhi Completions (last 6 months)" type="number" value={form.totalRuhi} onChange={(v: string) => update("totalRuhi", v)} placeholder="0" />
        <Input T={T} label="New Individuals Arising to Serve" type="number" value={form.newHumanResources} onChange={(v: string) => update("newHumanResources", v)} placeholder="0" />
        <Input T={T} label="Total Individuals Serving" type="number" value={form.totalHumanResources} onChange={(v: string) => update("totalHumanResources", v)} placeholder="0" />
        <Input T={T} label="Individuals Who Accompany Other HR" type="number" value={form.accompany} onChange={(v: string) => update("accompany", v)} placeholder="0" />
        <Input T={T} label="No. of Pockets" type="number" value={form.pockets} onChange={(v: string) => update("pockets", v)} placeholder="0" />
      </div>

      <SectionHeader T={T} icon="🏡">Community Life & Indicators</SectionHeader>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        <RadioGroup T={T} label="Regular Community Undertakings" value={form.regularUndertakings} onChange={(v: string) => update("regularUndertakings", v)} options={["Yes", "No"]} />
        <RadioGroup T={T} label="Local Assembly Supporting the Process" value={form.localAssembly} onChange={(v: string) => update("localAssembly", v)} options={["Yes", "No"]} />
        <RadioGroup T={T} label="Emergence of Social Action" value={form.socialAction} onChange={(v: string) => update("socialAction", v)} options={["Yes", "No"]} />
        <RadioGroup T={T} label="Involvement of Local Leaders" value={form.localLeaders} onChange={(v: string) => update("localLeaders", v)} options={["Yes", "No"]} />
        <RadioGroup T={T} label="Efforts to Foster Spiritual Health" value={form.spiritualHealth} onChange={(v: string) => update("spiritualHealth", v)} options={["Yes", "No"]} />
      </div>

      <SectionHeader T={T} icon="💬">Comments</SectionHeader>
      <div onClick={() => setShowComments(true)} style={{
        background: T.inputBg, border: `1.5px dashed ${T.border}`,
        borderRadius: 8, padding: "12px 16px", cursor: "text",
        minHeight: 60, fontSize: 13,
        color: form.comments ? T.text : T.muted,
        fontStyle: form.comments ? "normal" : "italic",
      }}>
        {form.comments || "Click to add comments…"}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 28, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button onClick={() => setForms((prev: any[]) => prev.map((f: any, i: number) => i === currentIndex ? { ...emptyForm(), id: f.id } : f))}
          style={{ padding: "10px 24px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "transparent", color: T.muted, cursor: "pointer", fontSize: 13 }}>
          Clear Form
        </button>
        <button style={{ padding: "10px 32px", borderRadius: 8, border: "none", background: T.accent, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          ✓ Save Record
        </button>
      </div>
    </div>
  );
}

// ─── Summary ──────────────────────────────────────────────────────────────────
function Summary({ forms, T }: any) {
  const [search, setSearch] = useState("");
  const filtered = forms.filter((f: any) =>
    f.cia.toLowerCase().includes(search.toLowerCase()) ||
    f.cluster.toLowerCase().includes(search.toLowerCase()) ||
    f.nationalCommunity.toLowerCase().includes(search.toLowerCase())
  );

  const exportToExcel = () => {
    const headers = ["National Community","Cluster","CIA","Rural/Urban","Population","Households","Individuals Connected","Households Connected",
      "CC No","CC Att","CC FoF","JY No","JY Att","JY FoF","SC No","SC Att","SC FoF","DM No","DM Att","DM FoF",
      "Total No","Total Att","Total FoF","Book 1","Total Ruhi","New HR","Total HR","Accompany","Pockets",
      "Regular Undertakings","Local Assembly","Social Action","Local Leaders","Spiritual Health","Comments"];
    const rows = forms.map((f: any) => {
      const t = calcTotals(f.activities);
      return [f.nationalCommunity,f.cluster,f.cia,f.ruralUrban,f.generalPopulation,f.totalHouseholds,f.individualsConnected,f.householdsConnected,
        f.activities.children.no,f.activities.children.att,f.activities.children.fof,
        f.activities.juniorYouth.no,f.activities.juniorYouth.att,f.activities.juniorYouth.fof,
        f.activities.studyCircle.no,f.activities.studyCircle.att,f.activities.studyCircle.fof,
        f.activities.devotional.no,f.activities.devotional.att,f.activities.devotional.fof,
        t.no,t.att,t.fof,f.book1,f.totalRuhi,f.newHumanResources,f.totalHumanResources,f.accompany,f.pockets,
        f.regularUndertakings,f.localAssembly,f.socialAction,f.localLeaders,f.spiritualHealth,f.comments];
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map((_: any, i: number) => ({ wch: i < 3 ? 24 : 14 }));
    XLSX.utils.book_append_sheet(wb, ws, "Update CIA");
    XLSX.writeFile(wb, "Centre_of_Intense_Activity_Export.xlsx");
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <input value={search} onChange={(e: any) => setSearch(e.target.value)} placeholder="Search CIA / Cluster…"
          style={{ flex: 1, minWidth: 180, padding: "9px 16px", background: T.inputBg, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 13, outline: "none" }}
          onFocus={(e: any) => e.target.style.borderColor = T.accent}
          onBlur={(e: any) => e.target.style.borderColor = T.border}
        />
        <button onClick={exportToExcel} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 8, background: T.success, border: "none", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          ⬇ Export to Excel
        </button>
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: T.muted, padding: 60, fontSize: 14, fontStyle: "italic" }}>No records found. Add entries via the Data Collection Form.</div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 10, border: `1.5px solid ${T.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.surface }}>
                {["National Community","Cluster","CIA","Rural/Urban","Pop.","Individuals","CC","JY","SC","DM","Total Act.","Total HR","Comments"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left" as const, color: T.accent, fontWeight: 700, letterSpacing: "0.06em", borderBottom: `2px solid ${T.border}`, whiteSpace: "nowrap" as const, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f: any, i: number) => {
                const t = calcTotals(f.activities);
                return (
                  <tr key={f.id} style={{ background: i % 2 === 0 ? T.card : T.surface }}>
                    {[f.nationalCommunity||"—",f.cluster||"—",f.cia||"—",f.ruralUrban||"—",f.generalPopulation||"—",f.individualsConnected||"—",
                      `${f.activities.children.no||0}/${f.activities.children.att||0}`,
                      `${f.activities.juniorYouth.no||0}/${f.activities.juniorYouth.att||0}`,
                      `${f.activities.studyCircle.no||0}/${f.activities.studyCircle.att||0}`,
                      `${f.activities.devotional.no||0}/${f.activities.devotional.att||0}`,
                      `${t.no}/${t.att}`,f.totalHumanResources||"—",
                      f.comments ? f.comments.substring(0,28)+(f.comments.length>28?"…":"") : "—",
                    ].map((cell, ci) => (
                      <td key={ci} style={{ padding: "9px 12px", color: T.text, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" as const }}>{cell}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 12, fontSize: 12, color: T.muted }}>Showing {filtered.length} of {forms.length} record{forms.length !== 1 ? "s" : ""}</div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard",            icon: "⊞" },
  { key: "form",      label: "Data Collection Form", icon: "📋" },
  { key: "summary",   label: "Summary",              icon: "📊" },
  { key: "cycle",     label: "Cycle Report",         icon: "🔄" },
  { key: "resources", label: "Resources",            icon: "📚" },
  { key: "settings",  label: "Settings",             icon: "⚙️" },
  { key: "about",     label: "About",                icon: "ℹ️" },
];

function DashboardCard({ item, onClick, T }: any) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? `linear-gradient(135deg, ${T.card}, ${T.accent}22)` : T.card,
        border: `1.5px solid ${hov ? T.accent : T.border}`,
        borderRadius: 14, padding: "32px 16px",
        cursor: "pointer", transition: "all 0.25s",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 14, aspectRatio: "1 / 1",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? `0 12px 40px ${T.accent}22` : `0 2px 8px ${T.border}88`,
      }}>
      <div style={{ fontSize: 34 }}>{item.icon}</div>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: "0.08em", color: hov ? T.accentLight : T.text, textAlign: "center", fontWeight: 600, lineHeight: 1.4 }}>{item.label}</div>
    </div>
  );
}

function Dashboard({ setPage, T }: any) {
  const cards = NAV_ITEMS.filter((n) => n.key !== "dashboard");
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", position: "relative" }}>
      {/* Globe watermark */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "80%", aspectRatio: "1 / 1",
        backgroundImage: "url('./icon.png')",
        backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center",
        opacity: 0.07, pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", marginBottom: 36 }}>
        <img src="./icon.png" alt="CIA" style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 14, boxShadow: `0 4px 24px ${T.accent}44` }} />
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, color: T.accentLight, letterSpacing: "0.12em", marginBottom: 6 }}>Bahá'í CIA Data System</div>
        <div style={{ color: T.muted, fontSize: 13 }}>Centres of Intense Activity · Data Collection &amp; Reporting</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, position: "relative", zIndex: 1 }}>
        {cards.map((item) => <DashboardCard key={item.key} T={T} item={item} onClick={() => setPage(item.key)} />)}
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsPage({ theme, setTheme, T }: any) {
  return (
    <div style={{ maxWidth: 500, margin: "40px auto" }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: T.accentLight, letterSpacing: "0.1em", marginBottom: 28 }}>⚙️ Settings</div>

      {/* Theme selector */}
      <div style={{ background: T.surface, borderRadius: 12, padding: 24, border: `1.5px solid ${T.border}`, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Theme</div>
        <div style={{ display: "flex", gap: 14 }}>
          {[
            { key: "daylight", label: "☀️ Daylight", desc: "Bright & clean" },
            { key: "night",    label: "🌙 Night",    desc: "Dark & easy on eyes" },
          ].map((opt) => (
            <div key={opt.key} onClick={() => setTheme(opt.key)}
              style={{
                flex: 1, padding: "16px 12px", borderRadius: 10, cursor: "pointer", textAlign: "center" as const,
                border: `2px solid ${theme === opt.key ? T.accent : T.border}`,
                background: theme === opt.key ? `${T.accent}18` : T.card,
                transition: "all 0.2s",
              }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{opt.key === "daylight" ? "☀️" : "🌙"}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme === opt.key ? T.accent : T.text }}>{opt.key === "daylight" ? "Daylight" : "Night"}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{opt.desc}</div>
              {theme === opt.key && <div style={{ marginTop: 8, fontSize: 11, color: T.accent, fontWeight: 700 }}>✓ Active</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: T.muted, textAlign: "center" as const }}>Theme preference is applied immediately.</div>
    </div>
  );
}

// ─── About ────────────────────────────────────────────────────────────────────
function AboutPage({ T }: any) {
  return (
    <div style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" as const }}>
      <img src="./icon.png" alt="CIA" style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 20, boxShadow: `0 4px 24px ${T.accent}44` }} />
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: T.accentLight, letterSpacing: "0.1em", marginBottom: 20 }}>About</div>
      <div style={{ background: T.surface, borderRadius: 12, padding: 24, border: `1.5px solid ${T.border}`, textAlign: "left" as const, lineHeight: 1.9, color: T.text, fontSize: 14 }}>
        <p style={{ marginBottom: 12 }}>
          This app was created on <strong>3 June 2026</strong> by <strong>Simiona Bobai</strong>, a full stack developer who is Bahá'í of the Honiara community in the Solomon Islands.
        </p>
        <p style={{ marginBottom: 12 }}>
          This app is meant to help the <strong>National Institute Board Admin</strong> aide in her work to gather information for the Councillors.
        </p>
        <p style={{ marginBottom: 0, color: T.muted, fontSize: 12, borderTop: `1px solid ${T.border}`, paddingTop: 14, marginTop: 14 }}>
          Version 1.0.0 · CIA Data System · 2026
        </p>
      </div>
    </div>
  );
}

function PlaceholderPage({ title, icon, T }: any) {
  return (
    <div style={{ maxWidth: 600, margin: "80px auto", textAlign: "center" as const }}>
      <div style={{ fontSize: 52, marginBottom: 18 }}>{icon}</div>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: T.accentLight, letterSpacing: "0.1em", marginBottom: 10 }}>{title}</div>
      <div style={{ color: T.muted, fontSize: 14 }}>This section is under development.</div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setThemeKey] = useState("daylight");
  const T = THEMES[theme];
  C = T; // keep global C in sync for any legacy refs

  useEffect(() => { injectDynamicStyles(T); }, [theme]);

  const [page, setPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [forms, setForms] = useState([emptyForm()]);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentItem = NAV_ITEMS.find((n) => n.key === page);

  const setTheme = (key: string) => {
    setThemeKey(key);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: T.bg }}>
      {/* ── Header ── */}
      <header style={{
        height: 58, display: "flex", alignItems: "center",
        padding: "0 16px", background: T.topbar,
        borderBottom: `1px solid ${T.topbar}`,
        position: "sticky", top: 0, zIndex: 200,
        boxShadow: "0 2px 16px #00000033",
      }}>
        {/* Hamburger */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen((v) => !v)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "6px 8px", borderRadius: 6,
            display: "flex", flexDirection: "column", gap: 5,
          }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 22, height: 2,
                background: "#FFFFFF",
                borderRadius: 2, transition: "all 0.25s",
                transform: menuOpen && i === 0 ? "rotate(45deg) translate(5px, 5px)"
                  : menuOpen && i === 1 ? "scaleX(0)" : menuOpen && i === 2 ? "rotate(-45deg) translate(5px, -5px)" : "none",
                opacity: menuOpen && i === 1 ? 0 : 1,
              }} />
            ))}
          </button>

          {menuOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 10px)", left: 0,
              background: T.card, border: `1.5px solid ${T.border}`,
              borderRadius: 10, overflow: "hidden", zIndex: 300,
              boxShadow: "0 16px 48px #00000033", minWidth: 230,
              animation: "fadeIn 0.15s ease",
            }}>
              {NAV_ITEMS.map((item) => (
                <div key={item.key} onClick={() => { setPage(item.key); setMenuOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 18px", cursor: "pointer",
                    background: page === item.key ? `${T.accent}18` : "transparent",
                    color: page === item.key ? T.accent : T.text,
                    fontSize: 13, fontWeight: page === item.key ? 700 : 400,
                    borderLeft: `3px solid ${page === item.key ? T.accent : "transparent"}`,
                    transition: "all 0.15s",
                  }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Title */}
        <div style={{ marginLeft: 12, display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: "#FFFFFF", letterSpacing: "0.1em", fontWeight: 600 }}>CIA</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", letterSpacing: "0.05em" }}>Data System</span>
        </div>

        {/* Page label */}
        <div style={{ flex: 1, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.85)", letterSpacing: "0.06em" }}>
          {currentItem?.label}
        </div>

        {/* Icon */}
        <img src="./icon.png" alt="CIA" style={{ width: 36, height: 36, borderRadius: 8, boxShadow: "0 2px 10px #00000044", objectFit: "cover", flexShrink: 0 }} />
      </header>

      {/* ── Content ── */}
      <main style={{ flex: 1, padding: "24px 16px", animation: "slideUp 0.2s ease", background: T.bg }}>
        {page === "dashboard"  && <Dashboard T={T} setPage={setPage} />}
        {page === "form"       && <DataCollectionForm T={T} forms={forms} setForms={setForms} currentIndex={currentFormIndex} setCurrentIndex={setCurrentFormIndex} />}
        {page === "summary"    && <Summary T={T} forms={forms} />}
        {page === "cycle"      && <PlaceholderPage T={T} title="Cycle Report" icon="🔄" />}
        {page === "resources"  && <PlaceholderPage T={T} title="Resources" icon="📚" />}
        {page === "settings"   && <SettingsPage T={T} theme={theme} setTheme={setTheme} />}
        {page === "about"      && <AboutPage T={T} />}
      </main>
    </div>
  );
}
