import { useState, useRef, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

// ─── Themes ───────────────────────────────────────────────────────────────────
const THEMES: Record<string, any> = {
  daylight: {
    bg: "#F4F6F9", surface: "#FFFFFF", card: "#FFFFFF", border: "#C5D0DE",
    accent: "#2E6DB4", accentLight: "#1A4F8A", teal: "#1A7A7A",
    text: "#1A1A2E", muted: "#5A6A7E", danger: "#D93025", success: "#1E8A5E",
    inputBg: "#FFFFFF", topbar: "#3C6AA3", topbarText: "#FFFFFF",
    placeholder: "#A0AABB",
  },
  night: {
    bg: "#0D1B2A", surface: "#162032", card: "#1C2B3A", border: "#253A50",
    accent: "#C8973A", accentLight: "#E8B55A", teal: "#2ABFBF",
    text: "#E8EEF4", muted: "#7A93A8", danger: "#E05C5C", success: "#4CAF86",
    inputBg: "#0D1B2A", topbar: "#0D1B2A", topbarText: "#FFFFFF",
    placeholder: "#4A6070",
  },
};

function injectDynamicStyles(theme: any) {
  let el = document.getElementById("cia-styles") as HTMLStyleElement | null;
  if (!el) { el = document.createElement("style") as HTMLStyleElement; el.id = "cia-styles"; document.head.appendChild(el); }
  el.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body { background: ${theme.bg}; color: ${theme.text}; font-family: 'Lato', sans-serif; min-height: 100vh; font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
input[type=number] { -moz-appearance: textfield; }
::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: ${theme.surface}; } ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
input::placeholder, textarea::placeholder, select.cia-placeholder { color: ${theme.placeholder} !important; font-style: italic; }
select option:not([value=""]) { color: ${theme.text}; font-style: normal; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
`;
}

// ─── Shared field width: 40% of full ─────────────────────────────────────────
const FIELD_W = "40%";
const FIELD_MIN = 140;

// ─── Reusable input style ────────────────────────────────────────────────────
function inputStyle(T: any, readOnly = false) {
  return {
    background: readOnly ? T.surface : T.inputBg,
    border: `1.5px solid ${T.border}`,
    borderRadius: 6, padding: "8px 12px",
    color: readOnly ? T.muted : T.text,
    fontSize: 13, outline: "none", width: "100%",
    transition: "border-color 0.2s",
    cursor: readOnly ? "default" : "text",
  };
}

function SmallInput({ label, value, onChange, type = "text", placeholder, readOnly, T, numeric, width, error, refCb }: any) {
  return (
    <div ref={refCb} style={{ display: "flex", flexDirection: "column", gap: 4, width: width || FIELD_W, minWidth: FIELD_MIN }}>
      {label && <label style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{label}</label>}
      <input type={type} value={value ?? ""} readOnly={readOnly} placeholder={numeric ? "Estimated Value" : placeholder}
        onChange={(e: any) => onChange && onChange(e.target.value)}
        style={{ ...inputStyle(T, readOnly), borderColor: error ? T.danger : T.border }}
        onFocus={(e: any) => { if (!readOnly) e.target.style.borderColor = error ? T.danger : T.accent; }}
        onBlur={(e: any) => { e.target.style.borderColor = error ? T.danger : T.border; }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder, T, width, error, refCb }: any) {
  const isEmpty = !value;
  return (
    <div ref={refCb} style={{ display: "flex", flexDirection: "column", gap: 4, width: width || FIELD_W, minWidth: FIELD_MIN }}>
      {label && <label style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{label}</label>}
      <select value={value} onChange={(e: any) => onChange(e.target.value)}
        className={isEmpty ? "cia-placeholder" : ""}
        style={{
          ...inputStyle(T),
          color: isEmpty ? T.placeholder : T.text,
          fontStyle: isEmpty ? "italic" : "normal",
          appearance: "none" as const, WebkitAppearance: "none" as const,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
          paddingRight: 30,
          borderColor: error ? T.danger : T.border,
        }}
        onFocus={(e: any) => e.target.style.borderColor = error ? T.danger : T.accent}
        onBlur={(e: any) => e.target.style.borderColor = error ? T.danger : T.border}
      >
        <option value="" style={{ fontStyle: "italic", color: T.placeholder }}>{placeholder}</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function RadioGroup({ label, value, onChange, options, T }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{label}</label>}
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

// ─── Inline Field: label left, input floats right, same line ─────────────────
function InlineField({ label, value, onChange, type = "number", T, numeric, width = "40%", error, refCb, noPlaceholder }: any) {
  return (
    <div ref={refCb} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "4px 0", borderBottom: `1px solid ${T.border}` }}>
      <label style={{ fontSize: 12, color: T.text, fontWeight: 600, flex: 1, whiteSpace: "nowrap" as const }}>{label}</label>
      <input type={type} value={value ?? ""} placeholder={noPlaceholder ? "" : (numeric ? "Estimated Value" : "")}
        onChange={(e: any) => onChange && onChange(e.target.value)}
        style={{
          background: T.inputBg, border: `1.5px solid ${error ? T.danger : T.border}`,
          borderRadius: 6, padding: "7px 10px",
          color: T.text, fontSize: 13, outline: "none",
          width: width, textAlign: "right" as const, flexShrink: 0,
          transition: "border-color 0.2s",
        }}
        onFocus={(e: any) => e.target.style.borderColor = error ? T.danger : T.accent}
        onBlur={(e: any) => e.target.style.borderColor = error ? T.danger : T.border}
      />
    </div>
  );
}

function SectionHeader({ children, icon, T }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", margin: "24px 0 16px", background: `linear-gradient(90deg, ${T.accent}22, transparent)`, borderLeft: `3px solid ${T.accent}`, borderRadius: "0 6px 6px 0" }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: "0.1em", color: T.accentLight, fontWeight: 600 }}>{children}</h3>
    </div>
  );
}

// ─── Activity Block (stacked, responsive) ────────────────────────────────────
function ActivityBlock({ label, values, onChange, readOnly, T, errors, actKey, setRef }: any) {
  const fieldStyle = {
    display: "flex", flexDirection: "column" as const, gap: 3, flex: 1,
  };
  const numInput = (k: string, lbl: string) => {
    const errKey = actKey ? `${actKey}_${k}` : null;
    const hasError = !readOnly && errKey && errors?.[errKey];
    return (
      <div key={k} ref={setRef ? setRef(errKey!) : undefined} style={fieldStyle}>
        <label style={{ fontSize: 10, color: T.accent, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, textAlign: "center" as const, display: "block" }}>{lbl}</label>
        <input type="number" value={values[k] ?? ""} readOnly={readOnly} placeholder=""
          onChange={(e: any) => onChange && onChange(k, e.target.value)}
          style={{
            background: readOnly ? T.surface : T.inputBg,
            border: `1.5px solid ${hasError ? T.danger : T.border}`,
            borderRadius: 6, padding: "7px 10px",
            color: readOnly ? T.muted : T.text,
            fontSize: 13, outline: "none", width: "100%", textAlign: "center" as const,
            cursor: readOnly ? "default" : "text",
          }}
          onFocus={(e: any) => { if (!readOnly) e.target.style.borderColor = hasError ? T.danger : T.accent; }}
          onBlur={(e: any) => e.target.style.borderColor = hasError ? T.danger : T.border}
        />
      </div>
    );
  };
  return (
    <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: readOnly ? T.accent : T.text, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 10 }}>
        {numInput("no",  "No.")}
        {numInput("att", "Att.")}
        {numInput("fof", "FoF.")}
      </div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel, T }: any) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000099", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: T.card, borderRadius: 12, padding: 28, width: "100%", maxWidth: 380, border: `1.5px solid ${T.border}`, boxShadow: "0 20px 60px #00000088", animation: "slideUp 0.2s ease" }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: T.accentLight, marginBottom: 12, letterSpacing: "0.08em" }}>{title}</div>
        <div style={{ fontSize: 13, color: T.text, marginBottom: 24, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "9px 20px", borderRadius: 6, border: `1.5px solid ${T.border}`, background: "transparent", color: T.muted, cursor: "pointer", fontSize: 13 }}>No, Stay</button>
          <button onClick={onConfirm} style={{ padding: "9px 24px", borderRadius: 6, border: "none", background: T.danger, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Yes, Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ─── Comments Modal ───────────────────────────────────────────────────────────
function CommentsModal({ value, onClose, T }: any) {
  const [draft, setDraft] = useState(value || "");
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000099", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => onClose(null)}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.card, borderRadius: 12, padding: 28, width: "100%", maxWidth: 560, border: `1.5px solid ${T.border}`, boxShadow: "0 20px 60px #00000088", animation: "slideUp 0.2s ease" }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: T.accentLight, marginBottom: 16, letterSpacing: "0.1em" }}>✏️ Comments</div>
        <textarea autoFocus value={draft} onChange={(e: any) => setDraft(e.target.value)} placeholder="Enter your comments here…"
          style={{ width: "100%", minHeight: 160, background: T.inputBg, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: 12, color: T.text, fontSize: 13, fontFamily: "'Lato', sans-serif", resize: "vertical" as const, outline: "none" }}
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
const CLUSTERS = [
  "Central Malaita Cluster","Central Western Cluster","Choiseul Cluster",
  "East Are'are Cluster","East Western Cluster","Guadacanal Cluster",
  "Honiara Urban Cluster","Isabel Cluster","Makira Cluster",
  "North Malaita Cluster","RenBel Cluster","Shortland Islands Cluster",
  "Small Malaita Cluster","Temotu Cluster","West Are'are Cluster",
];
const REGIONS = ["Region 1","Region 2"];

const emptyForm = () => ({
  id: Date.now(),
  date: new Date().toISOString().split("T")[0],
  region: "", cluster: "", cia: "", ruralUrban: "",
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
  const keys = ["children","juniorYouth","studyCircle","devotional"];
  const t = { no: 0, att: 0, fof: 0 };
  keys.forEach((k) => { t.no += parseInt(activities[k].no)||0; t.att += parseInt(activities[k].att)||0; t.fof += parseInt(activities[k].fof)||0; });
  return t;
}

// ─── Data Collection Form ─────────────────────────────────────────────────────
function DataCollectionForm({ forms, setForms, currentIndex, setCurrentIndex, setPage, T }: any) {
  const [showComments, setShowComments] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const form = forms[currentIndex];

  // Device back button → show cancel modal
  useEffect(() => {
    const handler = () => { setShowCancelModal(true); };
    window.addEventListener("cia-back", handler);
    return () => window.removeEventListener("cia-back", handler);
  }, []);

  // Clear errors when form changes
  useEffect(() => { setErrors({}); }, [currentIndex]);

  const update = useCallback((field: string, val: any) => {
    setForms((prev: any[]) => prev.map((f: any, i: number) => i === currentIndex ? { ...f, [field]: val } : f));
    setErrors((prev) => ({ ...prev, [field]: false }));
  }, [currentIndex, setForms]);

  const updateActivity = useCallback((activity: string, key: string, val: string) => {
    setForms((prev: any[]) => prev.map((f: any, i: number) => i === currentIndex ? { ...f, activities: { ...f.activities, [activity]: { ...f.activities[activity], [key]: val } } } : f));
    setErrors((prev) => ({ ...prev, [`${activity}_${key}`]: false }));
  }, [currentIndex, setForms]);

  const totals = calcTotals(form.activities);

  // Required field order (top to bottom) for scroll-to-first-error
  const REQUIRED_FIELDS = [
    "date","region","cluster","cia","ruralUrban",
    "generalPopulation","totalHouseholds","individualsConnected","householdsConnected",
    "children_no","children_att","children_fof",
    "juniorYouth_no","juniorYouth_att","juniorYouth_fof",
    "studyCircle_no","studyCircle_att","studyCircle_fof",
    "devotional_no","devotional_att","devotional_fof",
    "book1","totalRuhi","newHumanResources","totalHumanResources","accompany","pockets",
    "regularUndertakings","localAssembly","socialAction","localLeaders","spiritualHealth",
  ];

  const handleSave = () => {
    const newErrors: Record<string, boolean> = {};
    REQUIRED_FIELDS.forEach((key) => {
      if (key.includes("_")) {
        const [act, subKey] = key.split("_");
        const val = form.activities[act]?.[subKey];
        if (val === "" || val == null) newErrors[key] = true;
      } else {
        const val = form[key];
        if (val === "" || val == null) newErrors[key] = true;
      }
    });
    setErrors(newErrors);
    // Scroll to first error
    const firstError = REQUIRED_FIELDS.find((k) => newErrors[k]);
    if (firstError) {
      const el = fieldRefs.current[firstError];
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); }
      return;
    }
    // All valid — save logic here
    alert("Record saved!");
  };

  const setRef = (key: string) => (el: HTMLElement | null) => { fieldRefs.current[key] = el; };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 60px" }}>
      {showComments && (
        <CommentsModal T={T} value={form.comments} onClose={(val: any) => {
          if (typeof val === "string") update("comments", val);
          setShowComments(false);
        }} />
      )}
      {showCancelModal && (
        <ConfirmModal T={T}
          title="Exit Form"
          message="Are you sure you want to exit the form? Any unsaved changes will be lost."
          onConfirm={() => { setShowCancelModal(false); setPage("dashboard"); }}
          onCancel={() => setShowCancelModal(false)}
        />
      )}



      {/* ── General Information ── */}
      <SectionHeader T={T} icon="📋">General Information</SectionHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Each row: label left (no wrap), input floats right at 40% */}
        <SmallInput T={T} label="Date" type="date" value={form.date} onChange={(v: string) => update("date", v)} width="40%" error={errors.date} refCb={setRef("date")} />
        <SelectField T={T} label="Region" value={form.region} onChange={(v: string) => update("region", v)} options={REGIONS} placeholder="Select Region" width="40%" error={errors.region} refCb={setRef("region")} />
        <SelectField T={T} label="Cluster" value={form.cluster} onChange={(v: string) => update("cluster", v)} options={CLUSTERS} placeholder="Select Cluster" width="60%" error={errors.cluster} refCb={setRef("cluster")} />
        <SmallInput T={T} label="Centre of Intense Activity" value={form.cia} onChange={(v: string) => update("cia", v)} placeholder="CIA name" width="60%" error={errors.cia} refCb={setRef("cia")} />
        <div ref={setRef("ruralUrban")} style={{ paddingTop: 4, outline: errors.ruralUrban ? `2px solid ${T.danger}` : "none", borderRadius: 6, padding: "4px 6px" }}>
          <RadioGroup T={T} label="Rural or Urban" value={form.ruralUrban} onChange={(v: string) => update("ruralUrban", v)} options={["Rural","Urban"]} />
        </div>
        <InlineField T={T} label="General Population (est.)" value={form.generalPopulation} onChange={(v: string) => update("generalPopulation", v)} numeric error={errors.generalPopulation} refCb={setRef("generalPopulation")} />
        <InlineField T={T} label="Total Households" value={form.totalHouseholds} onChange={(v: string) => update("totalHouseholds", v)} numeric error={errors.totalHouseholds} refCb={setRef("totalHouseholds")} />
        <InlineField T={T} label="Individuals Connected" value={form.individualsConnected} onChange={(v: string) => update("individualsConnected", v)} numeric error={errors.individualsConnected} refCb={setRef("individualsConnected")} />
        <InlineField T={T} label="Households Connected" value={form.householdsConnected} onChange={(v: string) => update("householdsConnected", v)} numeric error={errors.householdsConnected} refCb={setRef("householdsConnected")} />
      </div>

      {/* ── Core Activities ── */}
      <SectionHeader T={T} icon="🌟">Core Activities</SectionHeader>
      <div style={{ background: T.surface, borderRadius: 10, padding: "18px 16px", border: `1.5px solid ${T.border}` }}>
        <ActivityBlock T={T} label="Children's Classes" values={form.activities.children} onChange={(k: string, v: string) => updateActivity("children", k, v)} errors={errors} actKey="children" setRef={setRef} />
        <ActivityBlock T={T} label="Junior Youth Groups" values={form.activities.juniorYouth} onChange={(k: string, v: string) => updateActivity("juniorYouth", k, v)} errors={errors} actKey="juniorYouth" setRef={setRef} />
        <ActivityBlock T={T} label="Study Circles" values={form.activities.studyCircle} onChange={(k: string, v: string) => updateActivity("studyCircle", k, v)} errors={errors} actKey="studyCircle" setRef={setRef} />
        <ActivityBlock T={T} label="Devotional Meetings" values={form.activities.devotional} onChange={(k: string, v: string) => updateActivity("devotional", k, v)} errors={errors} actKey="devotional" setRef={setRef} />
        <div style={{ background: `${T.accent}11`, borderRadius: 8, padding: "12px 14px", border: `1px solid ${T.accent}44`, marginTop: 6 }}>
          <ActivityBlock T={T} label="Total (Auto-calculated)" values={totals} readOnly />
        </div>
      </div>

      {/* ── Human Resource Development ── */}
      <SectionHeader T={T} icon="👥">Human Resource Development</SectionHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <InlineField T={T} label="Book 1 Completions (last 6 months)" value={form.book1} onChange={(v: string) => update("book1", v)} error={errors.book1} refCb={setRef("book1")} width="30%" noPlaceholder />
        <InlineField T={T} label="Total Ruhi Completions (last 6 months)" value={form.totalRuhi} onChange={(v: string) => update("totalRuhi", v)} error={errors.totalRuhi} refCb={setRef("totalRuhi")} width="30%" noPlaceholder />
        <InlineField T={T} label="New Individuals Arising to Serve" value={form.newHumanResources} onChange={(v: string) => update("newHumanResources", v)} error={errors.newHumanResources} refCb={setRef("newHumanResources")} width="30%" noPlaceholder />
        <InlineField T={T} label="Total Individuals Serving" value={form.totalHumanResources} onChange={(v: string) => update("totalHumanResources", v)} error={errors.totalHumanResources} refCb={setRef("totalHumanResources")} width="30%" noPlaceholder />
        <InlineField T={T} label="Individuals Who Accompany Other HR" value={form.accompany} onChange={(v: string) => update("accompany", v)} error={errors.accompany} refCb={setRef("accompany")} width="30%" noPlaceholder />
        <InlineField T={T} label="No. of Pockets" value={form.pockets} onChange={(v: string) => update("pockets", v)} error={errors.pockets} refCb={setRef("pockets")} width="30%" noPlaceholder />
      </div>

      {/* ── Community Life ── */}
      <SectionHeader T={T} icon="🏡">Community Life &amp; Indicators</SectionHeader>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
        <div ref={setRef("regularUndertakings")} style={{ outline: errors.regularUndertakings ? `2px solid ${T.danger}` : "none", borderRadius: 6, padding: "4px 6px" }}><RadioGroup T={T} label="Regular Community Undertakings" value={form.regularUndertakings} onChange={(v: string) => update("regularUndertakings", v)} options={["Yes","No"]} /></div>
        <div ref={setRef("localAssembly")} style={{ outline: errors.localAssembly ? `2px solid ${T.danger}` : "none", borderRadius: 6, padding: "4px 6px" }}><RadioGroup T={T} label="Local Assembly Supporting the Process" value={form.localAssembly} onChange={(v: string) => update("localAssembly", v)} options={["Yes","No"]} /></div>
        <div ref={setRef("socialAction")} style={{ outline: errors.socialAction ? `2px solid ${T.danger}` : "none", borderRadius: 6, padding: "4px 6px" }}><RadioGroup T={T} label="Emergence of Social Action" value={form.socialAction} onChange={(v: string) => update("socialAction", v)} options={["Yes","No"]} /></div>
        <div ref={setRef("localLeaders")} style={{ outline: errors.localLeaders ? `2px solid ${T.danger}` : "none", borderRadius: 6, padding: "4px 6px" }}><RadioGroup T={T} label="Involvement of Local Leaders" value={form.localLeaders} onChange={(v: string) => update("localLeaders", v)} options={["Yes","No"]} /></div>
        <div ref={setRef("spiritualHealth")} style={{ outline: errors.spiritualHealth ? `2px solid ${T.danger}` : "none", borderRadius: 6, padding: "4px 6px" }}><RadioGroup T={T} label="Efforts to Foster Spiritual Health" value={form.spiritualHealth} onChange={(v: string) => update("spiritualHealth", v)} options={["Yes","No"]} /></div>
      </div>

      {/* ── Comments ── */}
      <SectionHeader T={T} icon="💬">Comments</SectionHeader>
      <div onClick={() => setShowComments(true)} style={{ background: T.inputBg, border: `1.5px dashed ${T.border}`, borderRadius: 8, padding: "12px 16px", cursor: "text", minHeight: 60, fontSize: 13, color: form.comments ? T.text : T.placeholder, fontStyle: form.comments ? "normal" : "italic" }}>
        {form.comments || "Click to add comments…"}
      </div>

      {/* ── Buttons ── */}
      <div style={{ display: "flex", marginTop: 28, alignItems: "center" }}>
        {/* Left */}
        <button onClick={() => setShowCancelModal(true)}
          style={{ padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${T.danger}`, background: "transparent", color: T.danger, cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" as const }}>
          ✕ Cancel
        </button>
        {/* Center */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <button onClick={() => setForms((prev: any[]) => prev.map((f: any, i: number) => i === currentIndex ? { ...emptyForm(), id: f.id } : f))}
            style={{ padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "transparent", color: T.muted, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" as const }}>
            Clear Form
          </button>
        </div>
        {/* Right */}
        <button onClick={handleSave} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: T.accent, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" as const }}>
          Save
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
    (f.region||"").toLowerCase().includes(search.toLowerCase())
  );
  const exportToExcel = () => {
    const headers = ["Region","Cluster","CIA","Rural/Urban","Population","Households","Individuals Connected","Households Connected",
      "CC No","CC Att","CC FoF","JY No","JY Att","JY FoF","SC No","SC Att","SC FoF","DM No","DM Att","DM FoF",
      "Total No","Total Att","Total FoF","Book 1","Total Ruhi","New HR","Total HR","Accompany","Pockets",
      "Regular Undertakings","Local Assembly","Social Action","Local Leaders","Spiritual Health","Comments"];
    const rows = forms.map((f: any) => {
      const t = calcTotals(f.activities);
      return [f.region,f.cluster,f.cia,f.ruralUrban,f.generalPopulation,f.totalHouseholds,f.individualsConnected,f.householdsConnected,
        f.activities.children.no,f.activities.children.att,f.activities.children.fof,
        f.activities.juniorYouth.no,f.activities.juniorYouth.att,f.activities.juniorYouth.fof,
        f.activities.studyCircle.no,f.activities.studyCircle.att,f.activities.studyCircle.fof,
        f.activities.devotional.no,f.activities.devotional.att,f.activities.devotional.fof,
        t.no,t.att,t.fof,f.book1,f.totalRuhi,f.newHumanResources,f.totalHumanResources,f.accompany,f.pockets,
        f.regularUndertakings,f.localAssembly,f.socialAction,f.localLeaders,f.spiritualHealth,f.comments];
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers,...rows]);
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
        <button onClick={exportToExcel} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 8, background: T.success, border: "none", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>⬇ Export to Excel</button>
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: T.muted, padding: 60, fontSize: 14, fontStyle: "italic" }}>No records found. Add entries via the Data Collection Form.</div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 10, border: `1.5px solid ${T.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.surface }}>
                {["Region","Cluster","CIA","Rural/Urban","Pop.","Individuals","CC","JY","SC","DM","Total Act.","Total HR","Comments"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left" as const, color: T.accent, fontWeight: 700, letterSpacing: "0.06em", borderBottom: `2px solid ${T.border}`, whiteSpace: "nowrap" as const, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f: any, i: number) => {
                const t = calcTotals(f.activities);
                return (
                  <tr key={f.id} style={{ background: i % 2 === 0 ? T.card : T.surface }}>
                    {[f.region||"—",f.cluster||"—",f.cia||"—",f.ruralUrban||"—",f.generalPopulation||"—",f.individualsConnected||"—",
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
      style={{ background: hov ? `linear-gradient(135deg, ${T.card}, ${T.accent}22)` : T.card, border: `1.5px solid ${hov ? T.accent : T.border}`, borderRadius: 14, padding: "32px 16px", cursor: "pointer", transition: "all 0.25s", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, aspectRatio: "1 / 1", transform: hov ? "translateY(-3px)" : "none", boxShadow: hov ? `0 12px 40px ${T.accent}22` : `0 2px 8px ${T.border}88` }}>
      <div style={{ fontSize: 34 }}>{item.icon}</div>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: "0.08em", color: hov ? T.accentLight : T.text, textAlign: "center" as const, fontWeight: 600, lineHeight: 1.4 }}>{item.label}</div>
    </div>
  );
}

function Dashboard({ setPage, T }: any) {
  const cards = NAV_ITEMS.filter((n) => n.key !== "dashboard");
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", position: "relative" }}>
      {/* Globe watermark — 38% of original (60% reduction), top center */}
      <img src="./icon.png" alt="" aria-hidden="true" style={{
        display: "block",
        margin: "0 auto",
        width: "38%", maxWidth: 160,
        opacity: 0.25,
        pointerEvents: "none", zIndex: 0,
        position: "relative",
        border: "none", boxShadow: "none", borderRadius: 0,
      }} />
      {/* Hero text centered below globe */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" as const, marginBottom: 24, paddingTop: 10 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: T.accentLight, letterSpacing: "0.1em", marginBottom: 6 }}>Baha'i Faith in the Solomon Islands</div>
        <div style={{ color: T.muted, fontSize: 13, letterSpacing: "0.04em" }}>Centre of Intense Activity</div>
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
      <div style={{ background: T.surface, borderRadius: 12, padding: 24, border: `1.5px solid ${T.border}`, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Theme</div>
        <div style={{ display: "flex", gap: 14 }}>
          {[{ key: "daylight", emoji: "☀️", label: "Daylight", desc: "Bright & clean" }, { key: "night", emoji: "🌙", label: "Night", desc: "Dark & easy on eyes" }].map((opt) => (
            <div key={opt.key} onClick={() => setTheme(opt.key)}
              style={{ flex: 1, padding: "16px 12px", borderRadius: 10, cursor: "pointer", textAlign: "center" as const, border: `2px solid ${theme === opt.key ? T.accent : T.border}`, background: theme === opt.key ? `${T.accent}18` : T.card, transition: "all 0.2s" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{opt.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme === opt.key ? T.accent : T.text }}>{opt.label}</div>
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
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: T.accentLight, letterSpacing: "0.1em", marginBottom: 20 }}>About</div>
      <div style={{ background: T.surface, borderRadius: 12, padding: 24, border: `1.5px solid ${T.border}`, textAlign: "left" as const, lineHeight: 1.9, color: T.text, fontSize: 14 }}>
        <p style={{ marginBottom: 12 }}>This app was created on <strong>3 June 2026</strong> by <strong>Simiona Bobai</strong>, a full stack developer who is Bahá'í of the Honiara community in the Solomon Islands.</p>
        <p style={{ marginBottom: 12 }}>This app is meant to help the <strong>National Institute Board Admin</strong> aide in her work to gather information for the Councillors.</p>
        <p style={{ marginBottom: 0, color: T.muted, fontSize: 12, borderTop: `1px solid ${T.border}`, paddingTop: 14, marginTop: 14 }}>Version 1.0.0 · CIA Data System · 2026</p>
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

// ─── Page Header — section title centered below topbar ───────────────────────
function PageHeader({ title, T }: any) {
  return (
    <div style={{
      textAlign: "center" as const,
      padding: "14px 16px 4px",
      marginBottom: 8,
    }}>
      <span style={{
        fontFamily: "'Cinzel', serif",
        fontSize: 16,
        fontWeight: 600,
        color: T.accentLight,
        letterSpacing: "0.1em",
      }}>{title}</span>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setThemeKey] = useState("daylight");
  const T = THEMES[theme];
  useEffect(() => { injectDynamicStyles(T); }, [theme]);

  const [page, setPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [forms, setForms] = useState([emptyForm()]);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Device back button handler ─────────────────────────────────────────────
  useEffect(() => {
    const handleBackButton = (e: PopStateEvent) => {
      if (page === "form") {
        // Delegate to the form's own back handler
        window.dispatchEvent(new Event("cia-back"));
        // Push state again so next back press works
        window.history.pushState(null, "", window.location.href);
      } else if (page === "dashboard") {
        setShowExitModal(true);
        window.history.pushState(null, "", window.location.href);
      } else {
        setPage("dashboard");
        window.history.pushState(null, "", window.location.href);
      }
    };
    // Push a state so we can intercept popstate
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handleBackButton);
    return () => window.removeEventListener("popstate", handleBackButton);
  }, [page]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navigateTo = (key: string) => {
    setPage(key);
    setMenuOpen(false);
    window.history.pushState(null, "", window.location.href);
  };

  const currentItem = NAV_ITEMS.find((n) => n.key === page);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: T.bg }}>

      {/* Exit App Modal */}
      {showExitModal && (
        <ConfirmModal T={T}
          title="Exit App"
          message="Are you sure you want to exit the CIA Data App?"
          onConfirm={() => { (navigator as any).app?.exitApp?.(); window.close(); }}
          onCancel={() => setShowExitModal(false)}
        />
      )}

      {/* ── Header ── */}
      <header style={{ height: 58, display: "flex", alignItems: "center", padding: "0 16px", background: T.topbar, borderBottom: `1px solid ${T.topbar}`, position: "sticky", top: 0, zIndex: 200, boxShadow: "0 2px 16px #00000033" }}>
        <div ref={menuRef} style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: 6, display: "flex", flexDirection: "column", gap: 5 }}>
            {[0,1,2].map((i) => (
              <div key={i} style={{ width: 22, height: 2, background: "#FFFFFF", borderRadius: 2, transition: "all 0.25s",
                transform: menuOpen && i===0 ? "rotate(45deg) translate(5px,5px)" : menuOpen && i===1 ? "scaleX(0)" : menuOpen && i===2 ? "rotate(-45deg) translate(5px,-5px)" : "none",
                opacity: menuOpen && i===1 ? 0 : 1 }} />
            ))}
          </button>
          {menuOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 10px)", left: 0, background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 10, overflow: "hidden", zIndex: 300, boxShadow: "0 16px 48px #00000033", minWidth: 230, animation: "fadeIn 0.15s ease" }}>
              {NAV_ITEMS.map((item) => (
                <div key={item.key} onClick={() => navigateTo(item.key)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", cursor: "pointer", background: page === item.key ? `${T.accent}18` : "transparent", color: page === item.key ? T.accent : T.text, fontSize: 13, fontWeight: page === item.key ? 700 : 400, borderLeft: `3px solid ${page === item.key ? T.accent : "transparent"}`, transition: "all 0.15s" }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, textAlign: "center" as const }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: "#FFFFFF", letterSpacing: "0.1em", fontWeight: 600 }}>CIA Solomon Islands</span>
        </div>
        <img src="./icon.png" alt="CIA" style={{ width: 36, height: 36, border: "none", boxShadow: "none", borderRadius: 0, objectFit: "contain", flexShrink: 0 }} />
      </header>

      {/* ── Content ── */}
      <main style={{ flex: 1, padding: "0 0 24px", animation: "slideUp 0.2s ease", background: T.bg }}>
        {/* Section header below topbar for all non-dashboard pages */}
        {page !== "dashboard" && <PageHeader T={T} title={NAV_ITEMS.find((n) => n.key === page)?.label ?? ""} />}
        <div style={{ padding: "0 16px" }}>
          {page === "dashboard"  && <Dashboard T={T} setPage={navigateTo} />}
          {page === "form"       && <DataCollectionForm T={T} forms={forms} setForms={setForms} currentIndex={currentFormIndex} setCurrentIndex={setCurrentFormIndex} setPage={navigateTo} />}
          {page === "summary"    && <Summary T={T} forms={forms} />}
          {page === "cycle"      && <PlaceholderPage T={T} title="Cycle Report" icon="🔄" />}
          {page === "resources"  && <PlaceholderPage T={T} title="Resources" icon="📚" />}
          {page === "settings"   && <SettingsPage T={T} theme={theme} setTheme={setThemeKey} />}
          {page === "about"      && <AboutPage T={T} />}
        </div>
      </main>
    </div>
  );
}
