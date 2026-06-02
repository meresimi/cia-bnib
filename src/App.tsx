import { useState, useRef, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0D1B2A",
  surface: "#162032",
  card: "#1C2B3A",
  border: "#253A50",
  accent: "#C8973A",
  accentLight: "#E8B55A",
  teal: "#2ABFBF",
  text: "#E8EEF4",
  muted: "#7A93A8",
  danger: "#E05C5C",
  success: "#4CAF86",
  inputBg: "#0D1B2A",
};

const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body {
  background: #0D1B2A;
  color: #E8EEF4;
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
::-webkit-scrollbar-track { background: #162032; }
::-webkit-scrollbar-thumb { background: #253A50; border-radius: 3px; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
let stylesInjected = false;
function injectStyles() {
  if (!stylesInjected) {
    const el = document.createElement("style");
    el.id = "cia-styles";
    el.textContent = globalStyles;
    document.head.appendChild(el);
    stylesInjected = true;
  }
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Input({ label, value, onChange, type = "text", placeholder, readOnly, style }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      {label && <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</label>}
      <input
        type={type}
        value={value ?? ""}
        onChange={(e: any) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{
          background: readOnly ? C.surface : C.inputBg,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          padding: "8px 12px",
          color: readOnly ? C.muted : C.text,
          fontSize: 13,
          outline: "none",
          width: "100%",
          transition: "border-color 0.2s",
          cursor: readOnly ? "default" : "text",
        }}
        onFocus={(e: any) => { if (!readOnly) e.target.style.borderColor = C.accent; }}
        onBlur={(e: any) => { e.target.style.borderColor = C.border; }}
      />
    </div>
  );
}

function RadioGroup({ label, value, onChange, options }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</label>}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {options.map((opt: string) => (
          <label key={opt} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <div
              onClick={() => onChange(opt)}
              style={{
                width: 18, height: 18, borderRadius: "50%",
                border: `2px solid ${value === opt ? C.accent : C.border}`,
                background: value === opt ? C.accent : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
              }}
            >
              {value === opt && <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.bg }} />}
            </div>
            <span onClick={() => onChange(opt)} style={{ color: value === opt ? C.text : C.muted }}>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ children, icon }: any) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 16px", margin: "24px 0 16px",
      background: `linear-gradient(90deg, ${C.accent}22, transparent)`,
      borderLeft: `3px solid ${C.accent}`,
      borderRadius: "0 6px 6px 0",
    }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: "0.1em", color: C.accentLight, fontWeight: 600 }}>{children}</h3>
    </div>
  );
}

function SubHeader({ children }: any) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
      color: C.teal, textTransform: "uppercase",
      borderBottom: `1px solid ${C.border}`,
      paddingBottom: 5, marginBottom: 10, marginTop: 14,
    }}>{children}</div>
  );
}

function ActivityRow({ label, values, onChange, readOnly }: any) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "140px 1fr 1fr 1fr",
      gap: 8, alignItems: "center", padding: "6px 0",
      borderBottom: `1px solid ${C.border}22`,
    }}>
      <div style={{ fontSize: 12, color: readOnly ? C.accentLight : C.text, fontWeight: readOnly ? 700 : 400 }}>{label}</div>
      {["no", "att", "fof"].map((k) => (
        <input
          key={k}
          type="number"
          value={values[k] ?? ""}
          onChange={(e: any) => onChange && onChange(k, e.target.value)}
          readOnly={readOnly}
          placeholder="0"
          style={{
            background: readOnly ? C.surface : C.inputBg,
            border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "7px 10px",
            color: readOnly ? C.muted : C.text,
            fontSize: 13, outline: "none", textAlign: "center" as const,
            cursor: readOnly ? "default" : "text",
          }}
        />
      ))}
    </div>
  );
}

// ─── Comments Modal ───────────────────────────────────────────────────────────
function CommentsModal({ value, onClose }: any) {
  const [draft, setDraft] = useState(value || "");
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000099", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={() => onClose(null)}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.card, borderRadius: 12, padding: 28, width: "100%", maxWidth: 560,
        border: `1px solid ${C.border}`, boxShadow: "0 20px 60px #00000088",
        animation: "slideUp 0.2s ease",
      }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: C.accentLight, marginBottom: 16, letterSpacing: "0.1em" }}>✏️ Comments</div>
        <textarea
          autoFocus
          value={draft}
          onChange={(e: any) => setDraft(e.target.value)}
          placeholder="Enter your comments here..."
          style={{
            width: "100%", minHeight: 160, background: C.inputBg,
            border: `1px solid ${C.border}`, borderRadius: 8,
            padding: 12, color: C.text, fontSize: 13,
            fontFamily: "'Lato', sans-serif", resize: "vertical" as const, outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={() => onClose(null)} style={{ padding: "8px 20px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={() => onClose(draft)} style={{ padding: "8px 24px", borderRadius: 6, border: "none", background: C.accent, color: C.bg, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>OK</button>
        </div>
      </div>
    </div>
  );
}

// ─── Form State ───────────────────────────────────────────────────────────────
const emptyForm = () => ({
  id: Date.now(),
  date: new Date().toISOString().split("T")[0],
  nationalCommunity: "",
  cluster: "",
  cia: "",
  ruralUrban: "",
  generalPopulation: "",
  totalHouseholds: "",
  individualsConnected: "",
  householdsConnected: "",
  activities: {
    children: { no: "", att: "", fof: "" },
    juniorYouth: { no: "", att: "", fof: "" },
    studyCircle: { no: "", att: "", fof: "" },
    devotional: { no: "", att: "", fof: "" },
  },
  book1: "",
  totalRuhi: "",
  newHumanResources: "",
  totalHumanResources: "",
  accompany: "",
  pockets: "",
  regularUndertakings: "",
  localAssembly: "",
  socialAction: "",
  localLeaders: "",
  spiritualHealth: "",
  comments: "",
});

function calcTotals(activities: any) {
  const keys = ["children", "juniorYouth", "studyCircle", "devotional"];
  const total = { no: 0, att: 0, fof: 0 };
  keys.forEach((k) => {
    total.no += parseInt(activities[k].no) || 0;
    total.att += parseInt(activities[k].att) || 0;
    total.fof += parseInt(activities[k].fof) || 0;
  });
  return total;
}

// ─── Data Collection Form ─────────────────────────────────────────────────────
function DataCollectionForm({ forms, setForms, currentIndex, setCurrentIndex }: any) {
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

  const addNewRecord = () => {
    const newForm = emptyForm();
    setForms((prev: any[]) => [...prev, newForm]);
    setCurrentIndex(forms.length);
  };

  const clearForm = () => {
    setForms((prev: any[]) => prev.map((f: any, i: number) => i === currentIndex ? { ...emptyForm(), id: f.id } : f));
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 60px" }}>
      {showComments && (
        <CommentsModal value={form.comments} onClose={(val: any) => {
          if (typeof val === "string") update("comments", val);
          setShowComments(false);
        }} />
      )}

      {/* Record navigator */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: C.muted }}>Record {currentIndex + 1} of {forms.length}</span>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {forms.map((_: any, i: number) => (
            <button key={i} onClick={() => setCurrentIndex(i)} style={{
              width: 28, height: 28, borderRadius: "50%",
              background: i === currentIndex ? C.accent : C.surface,
              border: `1px solid ${i === currentIndex ? C.accent : C.border}`,
              color: i === currentIndex ? C.bg : C.muted,
              fontSize: 11, cursor: "pointer", fontWeight: 700,
            }}>{i + 1}</button>
          ))}
        </div>
        <button onClick={addNewRecord} style={{
          marginLeft: "auto", padding: "7px 16px", borderRadius: 6,
          background: "transparent", border: `1px solid ${C.teal}`,
          color: C.teal, cursor: "pointer", fontSize: 12, fontWeight: 700,
        }}>+ New Record</button>
      </div>

      {/* General Info */}
      <SectionHeader icon="📋">General Information</SectionHeader>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <Input label="Date" type="date" value={form.date} onChange={(v: string) => update("date", v)} />
        <Input label="National Community" value={form.nationalCommunity} onChange={(v: string) => update("nationalCommunity", v)} placeholder="e.g. South Africa" />
        <Input label="Cluster" value={form.cluster} onChange={(v: string) => update("cluster", v)} placeholder="Cluster name" />
        <Input label="Centre of Intense Activity" value={form.cia} onChange={(v: string) => update("cia", v)} placeholder="CIA name" />
      </div>
      <div style={{ marginTop: 14 }}>
        <RadioGroup label="Rural or Urban" value={form.ruralUrban} onChange={(v: string) => update("ruralUrban", v)} options={["Rural", "Urban"]} />
      </div>
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <Input label="General Population (est.)" type="number" value={form.generalPopulation} onChange={(v: string) => update("generalPopulation", v)} placeholder="0" />
        <Input label="Total Households (if available)" type="number" value={form.totalHouseholds} onChange={(v: string) => update("totalHouseholds", v)} placeholder="0" />
        <Input label="Individuals Connected" type="number" value={form.individualsConnected} onChange={(v: string) => update("individualsConnected", v)} placeholder="0" />
        <Input label="Households Connected" type="number" value={form.householdsConnected} onChange={(v: string) => update("householdsConnected", v)} placeholder="0" />
      </div>

      {/* Core Activities */}
      <SectionHeader icon="🌟">Core Activities in the Centre of Intense Activity</SectionHeader>
      <div style={{ background: C.surface, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div />
          {["No.", "Att.", "FoF."].map((h) => (
            <div key={h} style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: "0.1em", textAlign: "center" as const, textTransform: "uppercase" as const }}>{h}</div>
          ))}
        </div>
        <SubHeader>Children's Classes</SubHeader>
        <ActivityRow label="Children's Classes" values={form.activities.children} onChange={(k: string, v: string) => updateActivity("children", k, v)} />
        <SubHeader>Junior Youth Groups</SubHeader>
        <ActivityRow label="Junior Youth Groups" values={form.activities.juniorYouth} onChange={(k: string, v: string) => updateActivity("juniorYouth", k, v)} />
        <SubHeader>Study Circles</SubHeader>
        <ActivityRow label="Study Circles" values={form.activities.studyCircle} onChange={(k: string, v: string) => updateActivity("studyCircle", k, v)} />
        <SubHeader>Devotional Meetings</SubHeader>
        <ActivityRow label="Devotional Meetings" values={form.activities.devotional} onChange={(k: string, v: string) => updateActivity("devotional", k, v)} />
        <div style={{ marginTop: 12, background: `${C.accent}11`, borderRadius: 8, padding: "4px 0", border: `1px solid ${C.accent}33` }}>
          <SubHeader>Total Activities (Auto-generated)</SubHeader>
          <ActivityRow label="Total Activities" values={totals} readOnly />
        </div>
      </div>

      {/* Human Resource Development */}
      <SectionHeader icon="👥">Human Resource Development in the Centre of Intense Activity</SectionHeader>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <Input label="Book 1 Completions (last 6 months)" type="number" value={form.book1} onChange={(v: string) => update("book1", v)} placeholder="0" />
        <Input label="Book 1 Completions (last 6 months)" type="number" value={form.book1} onChange={(v: string) => update("book1", v)} placeholder="0" />
        <Input label="Total Ruhi Completions (last 6 months)" type="number" value={form.totalRuhi} onChange={(v: string) => update("totalRuhi", v)} placeholder="0" />
        <Input label="New Individuals Arising to Serve (6 months)" type="number" value={form.newHumanResources} onChange={(v: string) => update("newHumanResources", v)} placeholder="0" />
        <Input label="Total Individuals Serving as Human Resources" type="number" value={form.totalHumanResources} onChange={(v: string) => update("totalHumanResources", v)} placeholder="0" />
        <Input label="Individuals Who Accompany Other HR" type="number" value={form.accompany} onChange={(v: string) => update("accompany", v)} placeholder="0" />
      </div>
      <div style={{ marginTop: 14 }}>
        <Input label="No. of Pockets (where applicable)" type="number" value={form.pockets} onChange={(v: string) => update("pockets", v)} placeholder="0" style={{ maxWidth: 260 }} />
      </div>

      {/* Community Life Indicators */}
      <SectionHeader icon="🏡">Community Life &amp; Indicators</SectionHeader>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        <RadioGroup label="Regular Community Undertakings (camps, festivals)" value={form.regularUndertakings} onChange={(v: string) => update("regularUndertakings", v)} options={["Yes", "No"]} />
        <RadioGroup label="Local Assembly Directly Supporting the Process" value={form.localAssembly} onChange={(v: string) => update("localAssembly", v)} options={["Yes", "No"]} />
        <RadioGroup label="Emergence of Social Action" value={form.socialAction} onChange={(v: string) => update("socialAction", v)} options={["Yes", "No"]} />
        <RadioGroup label="Involvement of Local Leaders / Traditional Chiefs" value={form.localLeaders} onChange={(v: string) => update("localLeaders", v)} options={["Yes", "No"]} />
        <RadioGroup label="Efforts to Foster Spiritual Health" value={form.spiritualHealth} onChange={(v: string) => update("spiritualHealth", v)} options={["Yes", "No"]} />
      </div>

      {/* Comments */}
      <SectionHeader icon="💬">Comments</SectionHeader>
      <div
        onClick={() => setShowComments(true)}
        style={{
          background: C.inputBg, border: `1px dashed ${C.border}`,
          borderRadius: 8, padding: "12px 16px", cursor: "text",
          minHeight: 60, fontSize: 13,
          color: form.comments ? C.text : C.muted,
          fontStyle: form.comments ? "normal" : "italic",
          transition: "border-color 0.2s",
        }}
        onMouseEnter={(e: any) => e.currentTarget.style.borderColor = C.accent}
        onMouseLeave={(e: any) => e.currentTarget.style.borderColor = C.border}
      >
        {form.comments || "Click to add comments…"}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, marginTop: 28, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button onClick={clearForm} style={{ padding: "10px 24px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 13 }}>
          Clear Form
        </button>
        <button style={{
          padding: "10px 32px", borderRadius: 8, border: "none",
          background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`,
          color: C.bg, cursor: "pointer", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em",
        }}>
          ✓ Save Record
        </button>
      </div>
    </div>
  );
}

// ─── Summary ──────────────────────────────────────────────────────────────────
function Summary({ forms }: any) {
  const [view, setView] = useState("National");
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = forms.filter((f: any) =>
    f.cia.toLowerCase().includes(search.toLowerCase()) ||
    f.cluster.toLowerCase().includes(search.toLowerCase()) ||
    f.nationalCommunity.toLowerCase().includes(search.toLowerCase())
  );

  const exportToExcel = () => {
    const noteRow = ["Please refer to notes in the heading cells G, AA & AB for clarification"];
    const headers = [
      "National\nCommunity", "Cluster", "Centre of intense activity", "Rural or Urban",
      "Size of general population residing in the centre of intense activity (est.)",
      "Total no. of households\n(if available)",
      "No. of individuals connected with the community-building activities and Bahá'í community life",
      "No. of households in which at least one person is connected to the community-building process",
      "No.", "Att.", "FoF.", "No.", "Att.", "FoF.", "No.", "Att.", "FoF.", "No.", "Att.", "FoF.", "No.", "Att.", "FoF.",
      "No. of Book 1 completions in the last 6 months",
      "No. of Total Ruhi Completions in the last 6 months",
      "No. of new individuals arising to serve as human resources in the last 6 months",
      "Total No. of individuals serving as human resources",
      "No. of individuals who accompany other human resources",
      "No. of pockets  (where applicable)",
      "Regular Community undertakings such as camps, festivals (Yes / No) ",
      "Local Assembly directly supporting the community-building process \n(Yes / No)",
      "Emergence of social action\n(Yes / No)",
      "Involvement of local leaders / traditional chiefs\n(Yes / No)",
      "Efforts to foster spiritual health\n(Yes / No)",
      "Comments"
    ];
    const rows = forms.map((f: any) => {
      const t = calcTotals(f.activities);
      return [
        f.nationalCommunity, f.cluster, f.cia, f.ruralUrban,
        f.generalPopulation, f.totalHouseholds, f.individualsConnected, f.householdsConnected,
        f.activities.children.no, f.activities.children.att, f.activities.children.fof,
        f.activities.juniorYouth.no, f.activities.juniorYouth.att, f.activities.juniorYouth.fof,
        f.activities.studyCircle.no, f.activities.studyCircle.att, f.activities.studyCircle.fof,
        f.activities.devotional.no, f.activities.devotional.att, f.activities.devotional.fof,
        t.no, t.att, t.fof,
        f.book1, f.totalRuhi, f.newHumanResources, f.totalHumanResources, f.accompany,
        f.pockets, f.regularUndertakings, f.localAssembly, f.socialAction, f.localLeaders, f.spiritualHealth, f.comments
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([noteRow, headers, ...rows]);
    ws["!cols"] = headers.map((_: any, i: number) => ({ wch: i < 3 ? 24 : 14 }));
    XLSX.utils.book_append_sheet(wb, ws, "Update CIA");
    XLSX.writeFile(wb, "Centre_of_Intense_Activity_Export.xlsx");
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div ref={dropRef} style={{ position: "relative" }}>
          <button onClick={() => setShowDropdown(v => !v)} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 16px", borderRadius: 8,
            background: C.accent, border: "none", color: C.bg,
            cursor: "pointer", fontSize: 13, fontWeight: 700,
          }}>
            {view}
            <span style={{ fontSize: 10, transform: showDropdown ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>▼</span>
          </button>
          {showDropdown && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0,
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 8, overflow: "hidden", zIndex: 100,
              boxShadow: "0 8px 32px #00000066", minWidth: 140, animation: "fadeIn 0.15s ease",
            }}>
              {["National", "Cluster", "Localities"].map((opt) => (
                <div key={opt} onClick={() => { setView(opt); setShowDropdown(false); }} style={{
                  padding: "10px 16px", cursor: "pointer", fontSize: 13,
                  color: view === opt ? C.accent : C.text,
                  background: view === opt ? `${C.accent}18` : "transparent",
                }}
                  onMouseEnter={(e: any) => e.currentTarget.style.background = `${C.accent}25`}
                  onMouseLeave={(e: any) => e.currentTarget.style.background = view === opt ? `${C.accent}18` : "transparent"}
                >{opt}</div>
              ))}
            </div>
          )}
        </div>

        <input value={search} onChange={(e: any) => setSearch(e.target.value)} placeholder="Search CIA"
          style={{
            flex: 1, minWidth: 180, padding: "9px 16px",
            background: C.inputBg, border: `1px solid ${C.border}`,
            borderRadius: 8, color: C.muted, fontSize: 13,
            fontStyle: "italic", outline: "none",
          }}
          onFocus={(e: any) => { e.target.style.borderColor = C.accent; e.target.style.color = C.text; }}
          onBlur={(e: any) => { e.target.style.borderColor = C.border; e.target.style.color = C.muted; }}
        />

        <button onClick={exportToExcel} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "9px 18px", borderRadius: 8,
          background: C.success, border: "none", color: "#fff",
          cursor: "pointer", fontSize: 13, fontWeight: 700,
        }}>⬇ Export to Excel</button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: C.muted, padding: 60, fontSize: 14, fontStyle: "italic" }}>
          No records found. Add entries via the Data Collection Form.
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${C.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.surface }}>
                {["National Community", "Cluster", "CIA", "Rural/Urban", "Pop.", "Individuals", "CC", "JY", "SC", "DM", "Total Act.", "Total HR", "Comments"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left" as const, color: C.accent, fontWeight: 700, letterSpacing: "0.06em", borderBottom: `2px solid ${C.border}`, whiteSpace: "nowrap" as const, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f: any, i: number) => {
                const t = calcTotals(f.activities);
                return (
                  <tr key={f.id} style={{ background: i % 2 === 0 ? C.card : C.surface }}
                    onMouseEnter={(e: any) => e.currentTarget.style.background = `${C.accent}11`}
                    onMouseLeave={(e: any) => e.currentTarget.style.background = i % 2 === 0 ? C.card : C.surface}
                  >
                    {[
                      f.nationalCommunity || "—", f.cluster || "—", f.cia || "—", f.ruralUrban || "—",
                      f.generalPopulation || "—", f.individualsConnected || "—",
                      `${f.activities.children.no || 0}/${f.activities.children.att || 0}`,
                      `${f.activities.juniorYouth.no || 0}/${f.activities.juniorYouth.att || 0}`,
                      `${f.activities.studyCircle.no || 0}/${f.activities.studyCircle.att || 0}`,
                      `${f.activities.devotional.no || 0}/${f.activities.devotional.att || 0}`,
                      `${t.no}/${t.att}`, f.totalHumanResources || "—",
                      f.comments ? f.comments.substring(0, 28) + (f.comments.length > 28 ? "…" : "") : "—",
                    ].map((cell, ci) => (
                      <td key={ci} style={{ padding: "9px 12px", color: C.text, borderBottom: `1px solid ${C.border}22`, whiteSpace: "nowrap" as const }}>{cell}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 12, fontSize: 12, color: C.muted }}>
        Showing {filtered.length} of {forms.length} record{forms.length !== 1 ? "s" : ""} · View: {view}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "⊞" },
  { key: "form", label: "Data Collection Form", icon: "📋" },
  { key: "summary", label: "Summary", icon: "📊" },
  { key: "cycle", label: "Cycle Report", icon: "🔄" },
  { key: "resources", label: "Resources", icon: "📚" },
  { key: "settings", label: "Settings", icon: "⚙️" },
  { key: "about", label: "About", icon: "ℹ️" },
];

function DashboardCard({ item, onClick }: any) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? `linear-gradient(135deg, ${C.card}, ${C.accent}22)` : C.card,
        border: `1px solid ${hov ? C.accent : C.border}`,
        borderRadius: 14, padding: "32px 16px",
        cursor: "pointer", transition: "all 0.25s",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 14, aspectRatio: "1 / 1",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? `0 12px 40px ${C.accent}22` : "none",
      }}>
      <div style={{ fontSize: 34 }}>{item.icon}</div>
      <div style={{
        fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: "0.08em",
        color: hov ? C.accentLight : C.text, textAlign: "center", fontWeight: 600, lineHeight: 1.4,
      }}>{item.label}</div>
    </div>
  );
}

function Dashboard({ setPage }: any) {
  const cards = NAV_ITEMS.filter((n) => n.key !== "dashboard");
  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <img src="./icon.png" alt="CIA" style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 14, boxShadow: `0 4px 24px ${C.accent}44` }} />
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, color: C.accentLight, letterSpacing: "0.12em", marginBottom: 6 }}>
          Bahá'í CIA Data System
        </div>
        <div style={{ color: C.muted, fontSize: 13 }}>Centres of Intense Activity · Data Collection &amp; Reporting</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {cards.map((item) => (
          <DashboardCard key={item.key} item={item} onClick={() => setPage(item.key)} />
        ))}
      </div>
    </div>
  );
}

function PlaceholderPage({ title, icon }: any) {
  return (
    <div style={{ maxWidth: 600, margin: "80px auto", textAlign: "center" }}>
      <div style={{ fontSize: 52, marginBottom: 18 }}>{icon}</div>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: C.accentLight, letterSpacing: "0.1em", marginBottom: 10 }}>{title}</div>
      <div style={{ color: C.muted, fontSize: 14 }}>This section is under development.</div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => { injectStyles(); }, []);

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

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.bg }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        height: 58, display: "flex", alignItems: "center",
        padding: "0 16px", background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        position: "sticky", top: 0, zIndex: 200,
        boxShadow: "0 2px 16px #00000055",
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
                background: menuOpen ? C.accent : C.muted,
                borderRadius: 2, transition: "all 0.25s",
                transform: menuOpen && i === 0 ? "rotate(45deg) translate(5px, 5px)"
                  : menuOpen && i === 1 ? "scaleX(0) opacity(0)"
                    : menuOpen && i === 2 ? "rotate(-45deg) translate(5px, -5px)"
                      : "none",
                opacity: menuOpen && i === 1 ? 0 : 1,
              }} />
            ))}
          </button>

          {menuOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 10px)", left: 0,
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 10, overflow: "hidden", zIndex: 300,
              boxShadow: "0 16px 48px #00000077", minWidth: 230,
              animation: "fadeIn 0.15s ease",
            }}>
              {NAV_ITEMS.map((item) => (
                <div key={item.key} onClick={() => { setPage(item.key); setMenuOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 18px", cursor: "pointer",
                    background: page === item.key ? `${C.accent}18` : "transparent",
                    color: page === item.key ? C.accent : C.text,
                    fontSize: 13, fontWeight: page === item.key ? 700 : 400,
                    borderLeft: `3px solid ${page === item.key ? C.accent : "transparent"}`,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e: any) => { if (page !== item.key) e.currentTarget.style.background = `${C.accent}0f`; }}
                  onMouseLeave={(e: any) => { if (page !== item.key) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Title */}
        <div style={{ marginLeft: 12, display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: C.accentLight, letterSpacing: "0.1em", fontWeight: 600 }}>CIA</span>
          <span style={{ fontSize: 11, color: C.muted, letterSpacing: "0.05em" }}>Data System</span>
        </div>

        {/* Page label - center */}
        <div style={{ flex: 1, textAlign: "center", fontSize: 12, color: C.muted, letterSpacing: "0.06em" }}>
          {currentItem?.label}
        </div>

        {/* Icon - top right */}
        <img
          src="./icon.png"
          alt="CIA"
          style={{
            width: 36, height: 36, borderRadius: 8,
            boxShadow: `0 2px 10px ${C.accent}44`,
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      </header>

      {/* ── Content ── */}
      <main style={{ flex: 1, padding: "24px 16px", animation: "slideUp 0.2s ease" }}>
        {page === "dashboard" && <Dashboard setPage={setPage} />}
        {page === "form" && (
          <DataCollectionForm
            forms={forms} setForms={setForms}
            currentIndex={currentFormIndex} setCurrentIndex={setCurrentFormIndex}
          />
        )}
        {page === "summary" && <Summary forms={forms} />}
        {page === "cycle" && <PlaceholderPage title="Cycle Report" icon="🔄" />}
        {page === "resources" && <PlaceholderPage title="Resources" icon="📚" />}
        {page === "settings" && <PlaceholderPage title="Settings" icon="⚙️" />}
        {page === "about" && (
          <div style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
            <img src="./icon.png" alt="CIA" style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 20, boxShadow: `0 4px 24px ${C.accent}44` }} />
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: C.accentLight, letterSpacing: "0.1em", marginBottom: 14 }}>About</div>
            <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.8 }}>
              <p style={{ marginBottom: 10 }}>The CIA Data Collection System supports Bahá'í communities in gathering and analysing data from Centres of Intense Activity.</p>
              <p style={{ marginBottom: 10 }}>It tracks core activities, human resource development, and community-building indicators across clusters and localities.</p>
              <p style={{ color: C.border, fontSize: 12, marginTop: 24 }}>Version 1.0.0 · 2026</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
