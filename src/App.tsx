import { useState, useRef, useEffect, useCallback } from "react";
import { App as CapApp } from "@capacitor/app";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

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
function StatPill({ label, value, T }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 12, color: T.muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{value ?? "—"}</span>
    </div>
  );
}

function ActivityMini({ label, values, T }: any) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
      <div style={{ display: "flex", gap: 6 }}>
        {[["No", values.no], ["Att", values.att], ["FoF", values.fof]].map(([k, v]) => (
          <div key={k} style={{ flex: 1, background: T.bg, borderRadius: 6, padding: "4px 6px", textAlign: "center" as const, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 9, color: T.muted }}>{k}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{v || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function YesNo({ value, T }: any) {
  const yes = value === "Yes";
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: yes ? T.success : T.danger, background: yes ? `${T.success}18` : `${T.danger}18`, borderRadius: 4, padding: "2px 7px" }}>
      {value || "—"}
    </span>
  );
}

function CIACard({ f, T }: any) {
  const [expanded, setExpanded] = useState(false);
  const t = calcTotals(f.activities);
  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1.5px solid ${T.border}`, marginBottom: 16, overflow: "hidden", boxShadow: `0 2px 8px ${T.border}44` }}>
      {/* Card header */}
      <div onClick={() => setExpanded((v) => !v)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: `linear-gradient(90deg, ${T.accent}11, transparent)` }}>
        <div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700, color: T.accentLight, letterSpacing: "0.06em" }}>{f.cia || "Unnamed CIA"}</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{f.cluster || "—"} · {f.region || "—"} · {f.ruralUrban || "—"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "center" as const }}>
            <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase" as const }}>Total Acts</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.accent }}>{t.no}</div>
          </div>
          <div style={{ fontSize: 18, color: T.muted, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>⌄</div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "14px 16px" }}>
          {/* Community size */}
          <div style={{ fontSize: 11, fontWeight: 700, color: T.teal, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 8 }}>Community</div>
          <StatPill T={T} label="General Population (est.)" value={f.generalPopulation} />
          <StatPill T={T} label="Total Households" value={f.totalHouseholds} />
          <StatPill T={T} label="Individuals Connected" value={f.individualsConnected} />
          <StatPill T={T} label="Households Connected" value={f.householdsConnected} />

          {/* Core Activities */}
          <div style={{ fontSize: 11, fontWeight: 700, color: T.teal, textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "14px 0 8px" }}>Core Activities</div>
          <ActivityMini T={T} label="Children's Classes" values={f.activities.children} />
          <ActivityMini T={T} label="Junior Youth Groups" values={f.activities.juniorYouth} />
          <ActivityMini T={T} label="Study Circles" values={f.activities.studyCircle} />
          <ActivityMini T={T} label="Devotional Meetings" values={f.activities.devotional} />
          <div style={{ background: `${T.accent}11`, borderRadius: 8, padding: "8px 10px", marginTop: 6, border: `1px solid ${T.accent}33` }}>
            <ActivityMini T={T} label="Total Activities" values={t} />
          </div>

          {/* Human Resources */}
          <div style={{ fontSize: 11, fontWeight: 700, color: T.teal, textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "14px 0 8px" }}>Human Resource Development</div>
          <StatPill T={T} label="Book 1 Completions (last 6 months)" value={f.book1} />
          <StatPill T={T} label="Total Ruhi Completions (last 6 months)" value={f.totalRuhi} />
          <StatPill T={T} label="New Individuals Arising to Serve" value={f.newHumanResources} />
          <StatPill T={T} label="Total Individuals Serving" value={f.totalHumanResources} />
          <StatPill T={T} label="Individuals Who Accompany Other HR" value={f.accompany} />
          <StatPill T={T} label="No. of Pockets" value={f.pockets} />

          {/* Community Life */}
          <div style={{ fontSize: 11, fontWeight: 700, color: T.teal, textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "14px 0 8px" }}>Community Life & Indicators</div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
            {[
              ["Regular Undertakings", f.regularUndertakings],
              ["Local Assembly", f.localAssembly],
              ["Social Action", f.socialAction],
              ["Local Leaders", f.localLeaders],
              ["Spiritual Health", f.spiritualHealth],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, color: T.muted, textAlign: "center" as const }}>{label}</div>
                <YesNo T={T} value={val} />
              </div>
            ))}
          </div>

          {/* Comments */}
          {f.comments && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.teal, textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "14px 0 6px" }}>Comments</div>
              <div style={{ fontSize: 12, color: T.text, background: T.surface, borderRadius: 8, padding: "10px 12px", border: `1px solid ${T.border}`, lineHeight: 1.6 }}>{f.comments}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Summary table column definitions ────────────────────────────────────────
const SUMMARY_COLS = [
  // col 0 — sticky first column
  { key: "cia",                  label: "Centre of Intense\nActivity",                                      group: null,                        subgroup: null,    width: 100 },
  // basic info
  { key: "ruralUrban",           label: "Rural or Urban",                                                    group: null,                        subgroup: null,    width: 80  },
  { key: "generalPopulation",    label: "Size of General\nPopulation (est.)",                               group: null,                        subgroup: null,    width: 90  },
  { key: "totalHouseholds",      label: "Total no.\nof households",                                         group: null,                        subgroup: null,    width: 80  },
  { key: "individualsConnected", label: "No. of individuals\nconnected",                                    group: null,                        subgroup: null,    width: 80  },
  { key: "householdsConnected",  label: "No. of households\nconnected",                                     group: null,                        subgroup: null,    width: 80  },
  // Core Activities — Children's Classes
  { key: "cc_no",                label: "No.",  group: "Core Activities", subgroup: "Children's Classes",   width: 50  },
  { key: "cc_att",               label: "Att.", group: "Core Activities", subgroup: "Children's Classes",   width: 50  },
  { key: "cc_fof",               label: "FoF.", group: "Core Activities", subgroup: "Children's Classes",   width: 50  },
  // Core Activities — Junior Youth Groups
  { key: "jy_no",                label: "No.",  group: "Core Activities", subgroup: "Junior Youth Groups",  width: 50  },
  { key: "jy_att",               label: "Att.", group: "Core Activities", subgroup: "Junior Youth Groups",  width: 50  },
  { key: "jy_fof",               label: "FoF.", group: "Core Activities", subgroup: "Junior Youth Groups",  width: 50  },
  // Core Activities — Study Circles
  { key: "sc_no",                label: "No.",  group: "Core Activities", subgroup: "Study Circles",        width: 50  },
  { key: "sc_att",               label: "Att.", group: "Core Activities", subgroup: "Study Circles",        width: 50  },
  { key: "sc_fof",               label: "FoF.", group: "Core Activities", subgroup: "Study Circles",        width: 50  },
  // Core Activities — Devotional Meetings
  { key: "dm_no",                label: "No.",  group: "Core Activities", subgroup: "Devotional Meetings",  width: 50  },
  { key: "dm_att",               label: "Att.", group: "Core Activities", subgroup: "Devotional Meetings",  width: 50  },
  { key: "dm_fof",               label: "FoF.", group: "Core Activities", subgroup: "Devotional Meetings",  width: 50  },
  // Core Activities — Total
  { key: "tot_no",               label: "No.",  group: "Core Activities", subgroup: "Total Activities",     width: 50  },
  { key: "tot_att",              label: "Att.", group: "Core Activities", subgroup: "Total Activities",     width: 50  },
  { key: "tot_fof",              label: "FoF.", group: "Core Activities", subgroup: "Total Activities",     width: 50  },
  // Human Resource Development
  { key: "book1",                label: "No. of Book 1 completions\nin the last six months",                group: "Human Resource Development", subgroup: null,   width: 90,  cellBg: true },
  { key: "totalRuhi",            label: "No. of total Ruhi completions\nin the last six months",            group: "Human Resource Development", subgroup: null,   width: 90,  cellBg: true },
  { key: "newHumanResources",    label: "No. of new individuals arising to serve\nas human resources in the last 6 months", group: "Human Resource Development", subgroup: null, width: 110, cellBg: true },
  { key: "totalHumanResources",  label: "Total No. of individuals\nserving as human resources",             group: "Human Resource Development", subgroup: null,   width: 90,  cellBg: true },
  { key: "accompany",            label: "No. of individuals who accompany\nother human resources",          group: "Human Resource Development", subgroup: null,   width: 90,  cellBg: true },
  // Community & Indicators
  { key: "pockets",              label: "No. of pockets\n(where applicable)",                               group: null, subgroup: null, width: 80  },
  { key: "regularUndertakings",  label: "Regular Community undertakings\nsuch as camps, festivals (Yes/No)", group: null, subgroup: null, width: 100 },
  { key: "localAssembly",        label: "Local Assembly directly supporting\nthe community-building process (Yes/No)", group: null, subgroup: null, width: 110 },
  { key: "socialAction",         label: "Emergence of\nsocial action (Yes/No)",                             group: null, subgroup: null, width: 90  },
  { key: "localLeaders",         label: "Involvement of local leaders /\ntraditional chiefs (Yes/No)",      group: null, subgroup: null, width: 100 },
  { key: "spiritualHealth",      label: "Efforts to foster\nspiritual health (Yes/No)",                     group: null, subgroup: null, width: 90  },
  { key: "comments",             label: "Comments",                                                          group: null, subgroup: null, width: 140 },
];

const VIEW_LEVELS = ["National", "Regional", "Cluster", "Locality"] as const;
type ViewLevel = typeof VIEW_LEVELS[number];

function getCellValue(f: any, key: string): any {
  const t = calcTotals(f.activities);
  const map: Record<string, any> = {
    cia: f.cia, ruralUrban: f.ruralUrban, generalPopulation: f.generalPopulation,
    totalHouseholds: f.totalHouseholds, individualsConnected: f.individualsConnected,
    householdsConnected: f.householdsConnected,
    cc_no: f.activities.children.no,   cc_att: f.activities.children.att,   cc_fof: f.activities.children.fof,
    jy_no: f.activities.juniorYouth.no, jy_att: f.activities.juniorYouth.att, jy_fof: f.activities.juniorYouth.fof,
    sc_no: f.activities.studyCircle.no, sc_att: f.activities.studyCircle.att, sc_fof: f.activities.studyCircle.fof,
    dm_no: f.activities.devotional.no,  dm_att: f.activities.devotional.att,  dm_fof: f.activities.devotional.fof,
    tot_no: t.no, tot_att: t.att, tot_fof: t.fof,
    book1: f.book1, totalRuhi: f.totalRuhi, newHumanResources: f.newHumanResources,
    totalHumanResources: f.totalHumanResources, accompany: f.accompany, pockets: f.pockets,
    regularUndertakings: f.regularUndertakings, localAssembly: f.localAssembly,
    socialAction: f.socialAction, localLeaders: f.localLeaders,
    spiritualHealth: f.spiritualHealth, comments: f.comments,
  };
  return map[key] ?? "";
}

// ─── Selection Modal (Region / Cluster / Locality picker) ────────────────────
function SelectionModal({ title, options, onSelect, onClose, T }: any) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "#00000088",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.card, borderRadius: 14,
        border: `1.5px solid ${T.border}`,
        boxShadow: "0 16px 48px #00000055",
        width: "100%", maxWidth: 340,
        maxHeight: "70vh", display: "flex", flexDirection: "column" as const,
        overflow: "hidden",
      }}>
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${T.border}`,
          fontFamily: "'Cinzel', serif", fontSize: 14,
          color: T.accentLight, fontWeight: 700, letterSpacing: "0.06em",
          flexShrink: 0,
        }}>
          {title}
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {options.map((opt: string) => (
            <div key={opt} onClick={() => onSelect(opt)} style={{
              padding: "13px 20px", cursor: "pointer", fontSize: 13,
              color: T.text, borderBottom: `1px solid ${T.border}44`,
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.accent + "22")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {opt}
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
          <button onClick={onClose} style={{
            width: "100%", padding: "10px", borderRadius: 8,
            background: T.surface, border: `1px solid ${T.border}`,
            color: T.muted, cursor: "pointer", fontSize: 13,
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Summary({ forms, T }: any) {
  const [viewLevel, setViewLevel] = useState<ViewLevel>("National");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // When view level changes, reset filter and open selection modal if needed
  const handleLevelSelect = (lvl: ViewLevel) => {
    setViewLevel(lvl);
    setDropdownOpen(false);
    setSelectedFilter(null);
    if (lvl !== "National") setShowModal(true);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Modal options per level
  const modalTitle = viewLevel === "Regional" ? "Select a Region"
    : viewLevel === "Cluster" ? "Select a Cluster"
    : viewLevel === "Locality" ? "Select a Locality"
    : "";

  const modalOptions: string[] =
    viewLevel === "Regional" ? REGIONS :
    viewLevel === "Cluster"  ? CLUSTERS :
    viewLevel === "Locality" ? Array.from(new Set(forms.map((f: any) => f.cia).filter(Boolean))).sort() as string[] :
    [];

  // Filter forms based on selection
  const filteredForms: any[] = viewLevel === "National" ? forms
    : viewLevel === "Regional"  ? forms.filter((f: any) => f.region  === selectedFilter)
    : viewLevel === "Cluster"   ? forms.filter((f: any) => f.cluster === selectedFilter)
    : viewLevel === "Locality"  ? forms.filter((f: any) => f.cia     === selectedFilter)
    : forms;

  // Only show rows that have at least a CIA name entered
  const displayForms = filteredForms.filter((f: any) => f.cia && f.cia.trim() !== "");

  // Table title
  const tableTitle = viewLevel === "National" ? "CIAs of Solomon Islands"
    : selectedFilter
      ? viewLevel === "Cluster"
        ? `CIAs of ${selectedFilter}`
        : `CIAs of ${selectedFilter}`
      : null;

  // ── Build and export the faithful replica of the CIA Excel template ──────────
  const exportToExcel = async () => {
    const FILENAME = "Centre_of_Intense_Activity_Form_2026.xlsx";
    setExporting(true);
    setExportMsg(null);

    try {
      // ── Build .xlsx as raw OOXML + JSZip (pure browser, full style support) ─
      const sharedStrings: string[] = [];
      const ssMap = new Map<string, number>();
      const ss = (v: string): number => {
        if (ssMap.has(v)) return ssMap.get(v)!;
        const idx = sharedStrings.length;
        sharedStrings.push(v);
        ssMap.set(v, idx);
        return idx;
      };
      const colLetter = (n: number): string => {
        let s = ""; let m = n;
        while (m > 0) { m--; s = String.fromCharCode(65 + (m % 26)) + s; m = Math.floor(m / 26); }
        return s;
      };
      const colNum = (col: string): number =>
        col.split("").reduce((a: number, c: string) => a * 26 + c.charCodeAt(0) - 64, 0);
      const addr = (c: number, r: number) => `${colLetter(c)}${r}`;
      const xe = (s: string) => String(s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

      // Style index constants (matching cellXfs in styles.xml)
      const XF_HEADER = 1;
      const XF_DATA   = 2;
      const XF_NOTE1  = 3;
      const XF_NOTE2  = 4;
      const XF_NOTE3  = 5;

      type CellDef = { t: "s"|"n"|"f"|"b"; v: any; xf: number };
      const cells = new Map<string, CellDef>();
      const setS = (c: number, r: number, v: string, xf: number) =>
        cells.set(addr(c,r), { t:"s", v: ss(v), xf });
      const setN = (c: number, r: number, v: number|null, xf: number) =>
        cells.set(addr(c,r), { t:"n", v: v ?? "", xf });
      const setF = (c: number, r: number, formula: string, xf: number) =>
        cells.set(addr(c,r), { t:"f", v: formula, xf });
      // Stamp thin border on every non-anchor cell in a merged region
      const XF_BORDER = 6;
      const stampMergeBorders = (c1: number, r1: number, c2: number, r2: number) => {
        for (let r = r1; r <= r2; r++) {
          for (let c = c1; c <= c2; c++) {
            if (r === r1 && c === c1) continue; // anchor already has XF_HEADER border
            if (!cells.has(addr(c, r)))
              cells.set(addr(c, r), { t:"b", v: "", xf: XF_BORDER });
          }
        }
      };

      // ROW 1
      setS(1, 1, "Please refer to notes in the heading cells G, AA & AB for clarification ", XF_NOTE2);
      // ROW 2
      setS(1,  2, "National\nCommunity", XF_HEADER);
      setS(2,  2, "Cluster", XF_HEADER);
      setS(3,  2, "Centre of intense activity", XF_HEADER);
      setS(4,  2, "Rural or Urban", XF_HEADER);
      setS(5,  2, "Size of general population residing in the centre of intense activity (est.)", XF_HEADER);
      setS(6,  2, "Total no. of households\n(if available)", XF_HEADER);
      setS(7,  2, "No. of individuals connected with the community-building activities and Bah\u00e1\u2019\u00ed community life", XF_HEADER);
      setS(8,  2, "No. of households in which at least one person is connected to the community-building process", XF_HEADER);
      setS(9,  2, "Core Activities in the centre of intense activity", XF_HEADER);
      setS(24, 2, "Human Resource Development in the centre of intense activity", XF_HEADER);
      setS(29, 2, "No. of pockets  (where applicable)", XF_HEADER);
      setS(30, 2, "Regular Community undertakings such as camps, festivals (Yes / No) ", XF_HEADER);
      setS(31, 2, "Local Assembly directly supporting the community-building process   (Yes / No)", XF_HEADER);
      setS(32, 2, "Emergence of social action\n(Yes / No)", XF_HEADER);
      setS(33, 2, "Involvement of local leaders / traditional chiefs\n(Yes / No)", XF_HEADER);
      setS(34, 2, "Efforts to foster spiritual health\n(Yes / No)", XF_HEADER);
      setS(35, 2, "Comments", XF_HEADER);
      // ROW 3
      setS(9,  3, "Children's\nclasses", XF_HEADER);
      setS(12, 3, "Junior youth\ngroups", XF_HEADER);
      setS(15, 3, "Study\ncircles", XF_HEADER);
      setS(18, 3, "Devotional\nmeetings", XF_HEADER);
      setS(21, 3, "Total activities", XF_HEADER);
      setS(24, 3, "No. of Book 1 completions in the last 6 months", XF_HEADER);
      setS(25, 3, "No. of Total Ruhi Completions in the last 6 months", XF_HEADER);
      setS(26, 3, "No. of new individuals arising to serve as human resources in the last 6 months", XF_HEADER);
      setS(27, 3, "Total No. of individuals serving as human resources", XF_HEADER);
      setS(28, 3, "No. of individuals who accompany other human resources", XF_HEADER);
      // ROW 4
      ["No.","Att.","FoF.","No.","Att.","FoF.","No.","Att.","FoF.","No.","Att.","FoF.","No.","Att.","FoF."]
        .forEach((lbl, i) => setS(9 + i, 4, lbl, XF_HEADER));

      // DATA ROWS
      const dataRowStart = 5;
      displayForms.forEach((f: any, idx: number) => {
        const r = dataRowStart + idx;
        const d = (v: any) => (v !== "" && v !== undefined && v !== null ? String(v) : "");
        const n = (v: any): number|null => (v !== "" && v !== undefined && v !== null) ? Number(v) : null;
        setS(1,r,d(f.region),XF_DATA);  setS(2,r,d(f.cluster),XF_DATA);
        setS(3,r,d(f.cia),XF_DATA);     setS(4,r,d(f.ruralUrban),XF_DATA);
        setN(5,r,n(f.generalPopulation),XF_DATA);  setN(6,r,n(f.totalHouseholds),XF_DATA);
        setN(7,r,n(f.individualsConnected),XF_DATA); setN(8,r,n(f.householdsConnected),XF_DATA);
        setN(9, r,n(f.activities.children.no),XF_DATA);
        setN(10,r,n(f.activities.children.att),XF_DATA);
        setN(11,r,n(f.activities.children.fof),XF_DATA);
        setN(12,r,n(f.activities.juniorYouth.no),XF_DATA);
        setN(13,r,n(f.activities.juniorYouth.att),XF_DATA);
        setN(14,r,n(f.activities.juniorYouth.fof),XF_DATA);
        setN(15,r,n(f.activities.studyCircle.no),XF_DATA);
        setN(16,r,n(f.activities.studyCircle.att),XF_DATA);
        setN(17,r,n(f.activities.studyCircle.fof),XF_DATA);
        setN(18,r,n(f.activities.devotional.no),XF_DATA);
        setN(19,r,n(f.activities.devotional.att),XF_DATA);
        setN(20,r,n(f.activities.devotional.fof),XF_DATA);
        setF(21,r,`I${r}+L${r}+O${r}+R${r}`,XF_DATA);
        setF(22,r,`J${r}+M${r}+P${r}+S${r}`,XF_DATA);
        setF(23,r,`K${r}+N${r}+Q${r}+T${r}`,XF_DATA);
        setN(24,r,n(f.book1),XF_DATA);            setN(25,r,n(f.totalRuhi),XF_DATA);
        setN(26,r,n(f.newHumanResources),XF_DATA); setN(27,r,n(f.totalHumanResources),XF_DATA);
        setN(28,r,n(f.accompany),XF_DATA);         setN(29,r,n(f.pockets),XF_DATA);
        setS(30,r,d(f.regularUndertakings),XF_DATA); setS(31,r,d(f.localAssembly),XF_DATA);
        setS(32,r,d(f.socialAction),XF_DATA);        setS(33,r,d(f.localLeaders),XF_DATA);
        setS(34,r,d(f.spiritualHealth),XF_DATA);     setS(35,r,d(f.comments),XF_DATA);
      });

      const lastDataRow = dataRowStart + displayForms.length - 1;
      const notesStart  = Math.max(lastDataRow + 2, dataRowStart + 11);
      setS(1, notesStart,     "G - Including those participating in the core activities, this represents the size of the local community that we are engaging, and should include, for example, those that attend Holy Day commemorations, parents of children and junior youth in educational activities, participants of periodic camps and festivals, those receiving home visits, those who are part of ongoing conversations, etc.", XF_NOTE1);
      setS(1, notesStart + 3, "AA - This represents teachers of children's classes, junior youth animators, tutors, hosts of devotionals, those conducting home visits, those participating in direct teaching efforts, etc.", XF_NOTE3);
      setS(1, notesStart + 5, "AB - This represents coordinators, assistants to Auxiliary Board members, collaborators, informal network of friends supporting the activities, etc.", XF_NOTE3);

      // Build sheetData XML
      const rowMap = new Map<number, Array<[string, CellDef]>>();
      cells.forEach((def, cellAddr) => {
        const rn = parseInt(cellAddr.match(/\d+$/)![0]);
        if (!rowMap.has(rn)) rowMap.set(rn, []);
        rowMap.get(rn)!.push([cellAddr, def]);
      });
      const ROW_HT: Record<number, number> = { 2:14.45, 3:28.9, 4:89.45 };
      ROW_HT[notesStart] = 20.25; ROW_HT[notesStart+1] = 20.25;

      let sheetDataXml = "";
      Array.from(rowMap.keys()).sort((a,b) => a-b).forEach(rn => {
        const ht = ROW_HT[rn];
        const rowAttr = ht ? ` ht="${ht}" customHeight="1"` : "";
        const rowCells = rowMap.get(rn)!.sort((a,b) =>
          colNum(a[0].replace(/\d+$/,"")) - colNum(b[0].replace(/\d+$/,"")));
        let rowXml = `<row r="${rn}"${rowAttr}>`;
        rowCells.forEach(([ca, def]) => {
          if (def.t === "s")      rowXml += `<c r="${ca}" t="s" s="${def.xf}"><v>${def.v}</v></c>`;
          else if (def.t === "n") rowXml += def.v !== "" ? `<c r="${ca}" t="n" s="${def.xf}"><v>${def.v}</v></c>` : `<c r="${ca}" s="${def.xf}"/>`;
          else if (def.t === "b") rowXml += `<c r="${ca}" s="${def.xf}"/>`;
          else                    rowXml += `<c r="${ca}" s="${def.xf}"><f>${xe(def.v)}</f></c>`;
        });
        sheetDataXml += rowXml + `</row>`;
      });

      // Stamp borders on all non-anchor cells in every header merge
      // (skip A1:O1 — row 1 has no border per original template)
      stampMergeBorders(1,2,1,4);   stampMergeBorders(2,2,2,4);   // A2:A4, B2:B4
      stampMergeBorders(3,2,3,4);   stampMergeBorders(4,2,4,4);   // C2:C4, D2:D4
      stampMergeBorders(5,2,5,4);   stampMergeBorders(6,2,6,4);   // E2:E4, F2:F4
      stampMergeBorders(7,2,7,4);   stampMergeBorders(8,2,8,4);   // G2:G4, H2:H4
      stampMergeBorders(9,2,23,2);  stampMergeBorders(24,2,28,2); // I2:W2, X2:AB2
      stampMergeBorders(29,2,29,4); stampMergeBorders(30,2,30,4); // AC2:AC4, AD2:AD4
      stampMergeBorders(31,2,31,4); stampMergeBorders(32,2,32,4); // AE2:AE4, AF2:AF4
      stampMergeBorders(33,2,33,4); stampMergeBorders(34,2,34,4); // AG2:AG4, AH2:AH4
      stampMergeBorders(35,2,35,4);                                // AI2:AI4
      stampMergeBorders(9,3,11,3);  stampMergeBorders(12,3,14,3); // I3:K3, L3:N3
      stampMergeBorders(15,3,17,3); stampMergeBorders(18,3,20,3); // O3:Q3, R3:T3
      stampMergeBorders(21,3,23,3);                                // U3:W3
      stampMergeBorders(24,3,24,4); stampMergeBorders(25,3,25,4); // X3:X4, Y3:Y4
      stampMergeBorders(26,3,26,4); stampMergeBorders(27,3,27,4); // Z3:Z4, AA3:AA4
      stampMergeBorders(28,3,28,4);                                // AB3:AB4

      const merges = [
        "A1:O1",
        "A2:A4","B2:B4","C2:C4","D2:D4","E2:E4","F2:F4","G2:G4","H2:H4",
        "I2:W2","X2:AB2",
        "AC2:AC4","AD2:AD4","AE2:AE4","AF2:AF4","AG2:AG4","AH2:AH4","AI2:AI4",
        "I3:K3","L3:N3","O3:Q3","R3:T3","U3:W3",
        "X3:X4","Y3:Y4","Z3:Z4","AA3:AA4","AB3:AB4",
        `A${notesStart}:O${notesStart+1}`,
      ];
      const mergesXml = `<mergeCells count="${merges.length}">${merges.map(m=>`<mergeCell ref="${m}"/>`).join("")}</mergeCells>`;

      const COL_WIDTHS = [
        9.68359375,12.375,15.73828125,10.76171875,10.89453125,13.1796875,
        13,13,6.1875,13,13,13,13,13,13,13,13,13,13,13,13,13,13,
        10.76171875,13,13,13,13,13,10.89453125,9.953125,13,9.953125,13,17.75390625,
      ];
      const colsXml = `<cols>${COL_WIDTHS.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1" bestFit="0"/>`).join("")}</cols>`;

      const sheetXml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<sheetView workbookViewId="0"><selection activeCell="A1"/></sheetView>` +
        `<sheetFormatPr defaultRowHeight="15"/>` +
        colsXml + `<sheetData>` + sheetDataXml + `</sheetData>` + mergesXml +
        `</worksheet>`;

      // fonts: 0=default, 1=TNR10B(header), 2=TNR12(data), 3=Calibri11B(note1), 4=TimesExtRoman11(note2)
      // fills: 0=none, 1=gray125(required), 2=solid BDD7EE
      // borders: 0=none, 1=thin all
      // xfs: 0=default, 1=header, 2=data, 3=note1centered, 4=note2plain
      const stylesXml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<fonts count="5">` +
          `<font><sz val="11"/><name val="Calibri"/></font>` +
          `<font><b/><sz val="10"/><name val="Times New Roman"/></font>` +
          `<font><sz val="12"/><name val="Times New Roman"/></font>` +
          `<font><b/><sz val="11"/><name val="Calibri"/></font>` +
          `<font><sz val="11"/><name val="Times Ext Roman"/></font>` +
        `</fonts>` +
        `<fills count="3">` +
          `<fill><patternFill patternType="none"/></fill>` +
          `<fill><patternFill patternType="gray125"/></fill>` +
          `<fill><patternFill patternType="solid"><fgColor rgb="FFBDD7EE"/></patternFill></fill>` +
        `</fills>` +
        `<borders count="2">` +
          `<border><left/><right/><top/><bottom/><diagonal/></border>` +
          `<border>` +
            `<left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right>` +
            `<top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom>` +
            `<diagonal/>` +
          `</border>` +
        `</borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="7">` +
          `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
          `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>` +
          `<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>` +
          `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>` +
          `<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
          `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>` +
          `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>` +
        `</cellXfs>` +
        `</styleSheet>`;

      const ssXml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">` +
        sharedStrings.map(s=>`<si><t xml:space="preserve">${xe(s)}</t></si>`).join("") +
        `</sst>`;

      const workbookXml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="Update CIA" sheetId="1" r:id="rId1"/></sheets></workbook>`;

      const wbRels =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>` +
        `</Relationships>`;

      const rootRels =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`;

      const contentTypes =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>` +
        `</Types>`;

      // ZIP using JSZip (browser-native, no Node deps)
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      zip.file("[Content_Types].xml", contentTypes);
      zip.file("_rels/.rels", rootRels);
      zip.file("xl/workbook.xml", workbookXml);
      zip.file("xl/_rels/workbook.xml.rels", wbRels);
      zip.file("xl/worksheets/sheet1.xml", sheetXml);
      zip.file("xl/styles.xml", stylesXml);
      zip.file("xl/sharedStrings.xml", ssXml);

      const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Save & share via Capacitor (Android).
      // Directory.Cache is always writable — no runtime permission needed.
      // Directory.Documents is blocked on Android 10+ which caused the silent failure.
      let savedUri: string | null = null;
      try {
        const savedFile = await Filesystem.writeFile({
          path: FILENAME,
          data: base64,
          directory: Directory.Cache,
          recursive: true,
        });
        savedUri = savedFile.uri;
      } catch (fsErr: any) {
        console.error("Filesystem.writeFile failed:", fsErr);
        setExportMsg("Save failed: " + (fsErr?.message ?? String(fsErr)));
        return;
      }

      try {
        setExportMsg("File saved. Opening share sheet\u2026");
        await Share.share({
          title: FILENAME,
          text: `Please find attached ${FILENAME} from Mercy (Acting NSO for Solomon Islands).`,
          url: savedUri,
          dialogTitle: "Share CIA Data",
        });
        setExportMsg(null);
      } catch (shareErr: any) {
        console.warn("Share dismissed or failed:", shareErr);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = FILENAME;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        setExportMsg("Downloaded successfully.");
      }
    } catch (err: any) {
      console.error("Export error:", err);
      setExportMsg("Export failed. Please try again.");
    } finally {
      setExporting(false);
      setTimeout(() => setExportMsg(null), 3000);
    }
  };

  // Build multi-level header rows
  const scrollCols = SUMMARY_COLS.slice(1);
  const groupColor: Record<string, string> = {
    "Core Activities":            T.accent + "33",
    "Human Resource Development": T.accentLight + "44",  // darker for group header row
  };
  const hrdCellBg = T.accentLight + "18";  // lighter for the 4 specific sub-cells
  const thBase: React.CSSProperties = {
    padding: "6px 8px", fontSize: 11, fontWeight: 700, color: T.text,
    border: `1px solid ${T.border}`, whiteSpace: "pre-line" as const,
    textAlign: "center" as const, verticalAlign: "middle" as const,
    background: T.surface, letterSpacing: "0.03em", lineHeight: 1.4,
  };
  type HeaderCell = { label: string; colSpan?: number; rowSpan?: number; bg?: string; width?: number };
  const rowA: HeaderCell[] = [];
  const rowB: HeaderCell[] = [];
  const rowC: HeaderCell[] = [];
  let i = 0;
  while (i < scrollCols.length) {
    const col = scrollCols[i];
    if (!col.group) {
      rowA.push({ label: col.label, rowSpan: 3, colSpan: 1, width: col.width });
      i++;
    } else {
      const grpStart = i;
      while (i < scrollCols.length && scrollCols[i].group === col.group) i++;
      const grpCols = scrollCols.slice(grpStart, i);
      rowA.push({ label: col.group, colSpan: grpCols.length, bg: groupColor[col.group] });
      let j = 0;
      while (j < grpCols.length) {
        const sub = grpCols[j].subgroup;
        if (!sub) {
          rowB.push({ label: grpCols[j].label, rowSpan: 2, bg: (grpCols[j] as any).cellBg ? hrdCellBg : groupColor[col.group] });
          j++;
        } else {
          const subStart = j;
          while (j < grpCols.length && grpCols[j].subgroup === sub) j++;
          const subCols = grpCols.slice(subStart, j);
          rowB.push({ label: sub, colSpan: subCols.length, bg: groupColor[col.group] + "88" });
          subCols.forEach((sc) => rowC.push({ label: sc.label }));
        }
      }
    }
  }

  const tdBase: React.CSSProperties = {
    padding: "6px 8px", fontSize: 12, color: T.text,
    border: `1px solid ${T.border}`,
    whiteSpace: "nowrap" as const, textAlign: "center" as const,
    background: T.card,
  };

  return (
    <div style={{ padding: "0 0 24px" }}>
      {/* ── Selection modal ── */}
      {showModal && (
        <SelectionModal
          T={T}
          title={modalTitle}
          options={modalOptions}
          onSelect={(val: string) => { setSelectedFilter(val); setShowModal(false); }}
          onClose={() => { setShowModal(false); if (!selectedFilter) setViewLevel("National"); }}
        />
      )}

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" as const }}>
        {/* View level dropdown */}
        <div ref={dropRef} style={{ position: "relative" }}>
          <button onClick={() => setDropdownOpen((v) => !v)} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 14px", borderRadius: 8,
            background: T.accent, border: "none", color: "#fff",
            cursor: "pointer", fontSize: 13, fontWeight: 700,
            boxShadow: `0 2px 8px ${T.accent}44`,
          }}>
            {viewLevel}{selectedFilter ? `: ${selectedFilter}` : ""}
            <span style={{ fontSize: 10, opacity: 0.8 }}>{dropdownOpen ? "▲" : "▼"}</span>
          </button>
          {dropdownOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0,
              background: T.card, border: `1.5px solid ${T.border}`,
              borderRadius: 10, overflow: "hidden", zIndex: 400,
              boxShadow: "0 8px 32px #00000033", minWidth: 180,
            }}>
              {VIEW_LEVELS.map((lvl) => (
                <div key={lvl} onClick={() => handleLevelSelect(lvl)} style={{
                  padding: "11px 18px", cursor: "pointer", fontSize: 13,
                  fontWeight: lvl === viewLevel ? 700 : 400,
                  color: lvl === viewLevel ? T.accent : T.text,
                  background: lvl === viewLevel ? `${T.accent}18` : "transparent",
                  borderLeft: `3px solid ${lvl === viewLevel ? T.accent : "transparent"}`,
                  transition: "all 0.15s",
                }}>
                  {lvl}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Re-open picker if filter already selected */}
        {selectedFilter && (
          <button onClick={() => setShowModal(true)} style={{
            padding: "9px 12px", borderRadius: 8,
            background: T.surface, border: `1px solid ${T.border}`,
            color: T.muted, cursor: "pointer", fontSize: 12,
          }}>Change</button>
        )}

        <div style={{ flex: 1 }} />
        <button onClick={exportToExcel} disabled={exporting} style={{
          padding: "9px 16px", borderRadius: 8,
          background: exporting ? T.muted : T.success,
          border: "none", color: "#fff",
          cursor: exporting ? "not-allowed" : "pointer",
          fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" as const,
          opacity: exporting ? 0.7 : 1,
          transition: "all 0.2s",
        }}>{exporting ? "⏳ Exporting…" : "⬇ Export Excel"}</button>
        {exportMsg && (
          <div style={{
            fontSize: 12, color: exportMsg.includes("fail") ? T.danger : T.success,
            fontWeight: 600, marginLeft: 8,
          }}>{exportMsg}</div>
        )}
      </div>

      {/* ── Table title (centered) ── */}
      {tableTitle && (
        <div style={{
          textAlign: "center" as const, marginBottom: 12,
          fontFamily: "'Cinzel', serif", fontSize: 14,
          color: T.accentLight, fontWeight: 700, letterSpacing: "0.08em",
        }}>
          {tableTitle}
        </div>
      )}

      {/* ── Prompt to select filter if none chosen yet ── */}
      {viewLevel !== "National" && !selectedFilter ? (
        <div style={{
          textAlign: "center" as const, padding: 48,
          color: T.muted, fontSize: 14, fontStyle: "italic",
        }}>
          Tap the button above to select a {viewLevel.toLowerCase()}.
        </div>
      ) : (
        <>
          {/* ── Scrollable table ── */}
          <div style={{ overflowX: "auto", borderRadius: 10, border: `1.5px solid ${T.border}`, boxShadow: `0 2px 12px ${T.border}66` }}>
            <table style={{ borderCollapse: "collapse", tableLayout: "auto" as const, width: "100%" }}>
              <thead>
                <tr>
                  <th rowSpan={3} style={{
                    ...thBase, position: "sticky", left: 0, zIndex: 10,
                    background: T.surface, minWidth: SUMMARY_COLS[0].width,
                    borderRight: `2px solid ${T.accent}`,
                    fontFamily: "'Cinzel', serif", fontSize: 12, whiteSpace: "pre-line",
                  }}>
                    {SUMMARY_COLS[0].label}
                  </th>
                  {rowA.map((cell, idx) => (
                    <th key={idx} colSpan={cell.colSpan} rowSpan={cell.rowSpan}
                      style={{ ...thBase, background: cell.bg ?? T.surface, minWidth: cell.rowSpan === 3 ? (cell.width ?? 80) : undefined }}>
                      {cell.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {rowB.map((cell, idx) => (
                    <th key={idx} colSpan={cell.colSpan} rowSpan={cell.rowSpan}
                      style={{ ...thBase, background: cell.bg ?? T.surface }}>
                      {cell.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {rowC.map((cell, idx) => (
                    <th key={idx} style={{ ...thBase, background: T.surface }}>{cell.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayForms.length === 0 ? (
                  <tr>
                    <td colSpan={SUMMARY_COLS.length} style={{ ...tdBase, textAlign: "center" as const, padding: 40, color: T.muted, fontStyle: "italic" }}>
                      No records found{selectedFilter ? ` for ${selectedFilter}` : ""}. Add entries via the Data Collection Form.
                    </td>
                  </tr>
                ) : (
                  displayForms.map((f: any, rowIdx: number) => (
                    <tr key={f.id} style={{ background: rowIdx % 2 === 0 ? T.card : T.surface }}>
                      <td style={{
                        ...tdBase, position: "sticky", left: 0, zIndex: 1,
                        background: rowIdx % 2 === 0 ? T.card : T.surface,
                        borderRight: `2px solid ${T.accent}`,
                        fontWeight: 600, textAlign: "left" as const,
                        whiteSpace: "normal" as const,
                        minWidth: SUMMARY_COLS[0].width,
                      }}>
                        {f.cia}
                      </td>
                      {scrollCols.map((col) => {
                        const val = getCellValue(f, col.key);
                        return (
                          <td key={col.key} style={{
                            ...tdBase, background: "inherit",
                            minWidth: col.width,
                            // Let content expand the cell naturally
                            whiteSpace: "nowrap" as const,
                          }}>
                            {val !== "" && val != null ? val : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: T.muted }}>
            {displayForms.length} record{displayForms.length !== 1 ? "s" : ""}
            {selectedFilter ? ` · ${viewLevel}: ${selectedFilter}` : " · National"}
          </div>
        </>
      )}
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
      {/* Hero section: icon as full-width background, text overlaid, flush to top */}
      <div style={{ position: "relative", width: "100%", marginBottom: 24 }}>
        {/* Background globe — full width, centered, low opacity */}
        <img src="./icon.png" alt="" aria-hidden="true" style={{
          position: "absolute", top: 0, left: "50%",
          transform: "translateX(-50%)",
          width: "72%", maxWidth: 320,
          opacity: 0.16,
          pointerEvents: "none", zIndex: 0,
          border: "none", boxShadow: "none", borderRadius: 0,
        }} />
        {/* Hero text overlaid on top of the globe */}
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" as const, paddingTop: 28, paddingBottom: 28 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: T.accentLight, letterSpacing: "0.1em", marginBottom: 6 }}>Baha'i Faith in the Solomon Islands</div>
          <div style={{ color: T.muted, fontSize: 13, letterSpacing: "0.04em" }}>Centre of Intense Activity</div>
        </div>
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
    <div style={{ maxWidth: 560, margin: "24px auto" }}>

      {/* App identity */}
      <div style={{ background: T.surface, borderRadius: 12, padding: 20, border: `1.5px solid ${T.border}`, lineHeight: 1.8, color: T.text, fontSize: 14, marginBottom: 14 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: T.accent, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" as const }}>About This App</div>
        <p style={{ marginBottom: 10 }}>This app was created on <strong>3 June 2026</strong> by <strong>Simiona Bobai</strong>, a full stack developer who is a member of the Bahá'í Community in Honiara, Solomon Islands.</p>
        <p style={{ marginBottom: 0 }}>This app is meant to help the <strong>National Institute Board Admin</strong> aide in her work to gather information for the Councillors regarding data on <strong>Centres of Intense Activities</strong>.</p>
      </div>

      {/* What is a CIA */}
      <div style={{ background: T.surface, borderRadius: 12, padding: 20, border: `1.5px solid ${T.border}`, lineHeight: 1.8, color: T.text, fontSize: 14, marginBottom: 14 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: T.accent, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" as const }}>What is a Centre of Intense Activity?</div>
        <p style={{ marginBottom: 0 }}>A <strong>Centre of Intense Activity (CIA)</strong> is a neighbourhood or village where the Bahá'í community-building process has reached a level of intensity — where study circles, junior youth groups, children's classes, and devotional gatherings are woven into the rhythm of community life, and where a growing number of people are walking a path of service together.</p>
      </div>

      {/* How to use */}
      <div style={{ background: T.surface, borderRadius: 12, padding: 20, border: `1.5px solid ${T.border}`, lineHeight: 1.8, color: T.text, fontSize: 14, marginBottom: 14 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: T.accent, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" as const }}>How to Use</div>
        <p style={{ marginBottom: 6 }}>1. Go to <strong>Data Collection Form</strong> to enter CIA cycle data.</p>
        <p style={{ marginBottom: 6 }}>2. View and search all records in <strong>Summary</strong>.</p>
        <p style={{ marginBottom: 6 }}>3. Export all records to Excel via the <strong>Summary</strong> page.</p>
        <p style={{ marginBottom: 0 }}>4. Browse UHJ guidance in <strong>Resources</strong> — tap any card to read the full message.</p>
      </div>

      {/* Data & privacy */}
      <div style={{ background: T.surface, borderRadius: 12, padding: 20, border: `1.5px solid ${T.border}`, lineHeight: 1.8, color: T.text, fontSize: 14, marginBottom: 14 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: T.accent, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" as const }}>Data & Privacy</div>
        <p style={{ marginBottom: 0 }}>All data entered is stored <strong>locally on your device</strong> and is not sent to any external server. To share or back up your data, use the Excel export feature in the Summary page.</p>
      </div>

      {/* Acknowledgements */}
      <div style={{ background: T.surface, borderRadius: 12, padding: 20, border: `1.5px solid ${T.border}`, lineHeight: 1.8, color: T.text, fontSize: 14, marginBottom: 14 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: T.accent, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" as const }}>Acknowledgements</div>
        <p style={{ marginBottom: 0 }}>Developed in service to the <strong>Bahá'í National Institute Board of the Solomon Islands</strong> and in support of the work of the Counsellors in advancing the process of growth across the country.</p>
      </div>

      {/* UHJ quote */}
      <div style={{ background: `${T.accent}11`, borderRadius: 12, padding: 20, border: `1.5px solid ${T.accent}44`, lineHeight: 1.8, color: T.text, fontSize: 13, fontStyle: "italic", marginBottom: 14 }}>
        <p style={{ marginBottom: 8 }}>"Witness, for instance, those <strong>centres of intense activity</strong> where the inhabitants have embraced the work of community building with enthusiasm…"</p>
        <div style={{ fontSize: 11, color: T.muted, fontStyle: "normal" }}>— The Universal House of Justice, Riḍván 2023</div>
      </div>

      {/* Version footer */}
      <div style={{ textAlign: "center" as const, color: T.muted, fontSize: 12, paddingTop: 4, paddingBottom: 8 }}>
        Version 1.0.0 · CIA Data System · Solomon Islands · 2026
      </div>

    </div>
  );
}

const RESOURCES = [
  {
    title: "Riḍván 2023 – To the Bahá'ís of the World",
    snippet: "Witness, for instance, those centres of intense activity where the inhabitants have…",
    source: "The Universal House of Justice / Riḍván 2023 – To the Bahá'ís of the World",
    fileKey: "20230430", paraIndex: 2,
  },
  {
    title: "28 November 2023 - To the Bahá'ís of the World",
    snippet: "neighbourhoods that are centres of intense activity, a community emerges with … attempt to differentiate those areas of activity in which the individual can best exercise … complementary and mutually reinforcing activities that welcome all and seek to uplift",
    source: "The Universal House of Justice / 28 November 2023 - To the Bahá'ís of the World",
    fileKey: "20231128", paraIndex: 41,
  },
  {
    title: "31 December 2025 – To the Conference of the Continental Boards of Counsellors",
    snippet: "evident in the cluster's centres of intense activity—not only where participation … those involved in the pattern of activity in third milestone clusters, even … attracted to the programmes and activities of the community. There is a rise",
    source: "The Universal House of Justice / 31 December 2025 – To the Conference of the Continental Boards of Counsellors",
    fileKey: "20251231", paraIndex: 4,
  },
  {
    title: "31 December 2025 – To the Conference of the Continental Boards of Counsellors",
    snippet: "been passed and particular centres of intense activity have gained strength, the",
    source: "The Universal House of Justice / 31 December 2025 – To the Conference of the Continental Boards of Counsellors",
    fileKey: "20251231", paraIndex: 6,
  },
  {
    title: "30 December 2021 – To the Conference of the Continental Boards of Counsellors",
    snippet: "a number of flourishing centres of intense activity, efforts being made across … To have come this far implies intense activity occurring in specific neighbourhoods … represent a large proportion of all the activity that is occurring. We also acknowledge",
    source: "The Universal House of Justice / 30 December 2021 – To the Conference of the Continental Boards of Counsellors",
    fileKey: "20211230", paraIndex: 13,
  },
  {
    title: "30 December 2021 – To the Conference of the Continental Boards of Counsellors",
    snippet: "adjoining clusters and within centres of intense activity. Individuals with a depth … look to the International Teaching Centre to organize what has been learned and … experience in the promotion of institute activities are serving as resource persons,",
    source: "The Universal House of Justice / 30 December 2021 – To the Conference of the Continental Boards of Counsellors",
    fileKey: "20211230", paraIndex: 14,
  },
  {
    title: "30 December 2021 – To the Conference of the Continental Boards of Counsellors",
    snippet: "closely the development of any centres of intense activity in the locality, especially … the more the intensification of activity requires organizational arrangements … welcomed into the embrace of Bahá'í activities, and where the complexity of an Assembly's",
    source: "The Universal House of Justice / 30 December 2021 – To the Conference of the Continental Boards of Counsellors",
    fileKey: "20211230", paraIndex: 27,
  },
  {
    title: "30 December 2021 – To the Conference of the Continental Boards of Counsellors",
    snippet: "complexity involved. Within each centre of intense activity, collaborative arrangements … locations begin to participate in Bahá'í activities in large numbers, more consideration … who organize community-building activities among themselves with a view to widening",
    source: "The Universal House of Justice / 30 December 2021 – To the Conference of the Continental Boards of Counsellors",
    fileKey: "20211230", paraIndex: 38,
  },
  {
    title: "Riḍván 2023 – To the Bahá'ís of the World",
    snippet: "Witness, for instance, those centres of intense activity where the inhabitants have…",
    source: "The Universal House of Justice / Riḍván 2023 – To the Bahá'ís of the World",
    fileKey: "20230430", paraIndex: 2,
  },
  {
    title: "28 November 2023 - To the Bahá'ís of the World",
    snippet: "neighbourhoods that are centres of intense activity, a community emerges with … attempt to differentiate those areas of activity in which the individual can best exercise … complementary and mutually reinforcing activities that welcome all and seek to uplift",
    source: "The Universal House of Justice / 28 November 2023 - To the Bahá'ís of the World",
    fileKey: "20231128", paraIndex: 41,
  },
  {
    title: "31 December 2025 – To the Conference of the Continental Boards of Counsellors",
    snippet: "evident in the cluster's centres of intense activity—not only where participation … those involved in the pattern of activity in third milestone clusters, even … attracted to the programmes and activities of the community. There is a rise",
    source: "The Universal House of Justice / 31 December 2025 – To the Conference of the Continental Boards of Counsellors",
    fileKey: "20251231", paraIndex: 4,
  },
  {
    title: "30 December 2021 – To the Conference of the Continental Boards of Counsellors",
    snippet: "a number of flourishing centres of intense activity, efforts being made across … To have come this far implies intense activity occurring in specific neighbourhoods … represent a large proportion of all the activity that is occurring. We also acknowledge",
    source: "The Universal House of Justice / 30 December 2021 – To the Conference of the Continental Boards of Counsellors",
    fileKey: "20211230", paraIndex: 13,
  },
];

// ─── In-app document reader ──────────────────────────────────────────────────
import { sharedCss, documents } from "./documents";

function DocumentReader({ fileKey, paraIndex, onClose, T }: any) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const doc = documents[fileKey] || "";
  const css = sharedCss;

  // Inject shared CSS + highlight target paragraph, then scroll to it
  const fullHtml = doc
    .replace(/<\/head>/, `<style>${css}
      #p${paraIndex} {
        background: #fff3cd;
        border-left: 4px solid #c8973a;
        padding-left: 12px;
        border-radius: 0 4px 4px 0;
        scroll-margin-top: 80px;
      }
    </style></head>`)
    + `<script>
        window.onload = function() {
          var el = document.getElementById('p${paraIndex}');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el.innerHTML = el.innerHTML.replace(
              /(centres? of intense activit(?:y|ies))/gi,
              '<strong>$1</strong>'
            );
          }
        };
      </script>`;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", flexDirection: "column" as const, background: T.bg }}>
      {/* Reader topbar */}
      <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", background: T.topbar, boxShadow: "0 2px 8px #00000033", flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", padding: "0 8px 0 0", lineHeight: 1 }}>←</button>
        <span style={{ flex: 1, color: "#fff", fontSize: 13, fontFamily: "'Cinzel', serif", letterSpacing: "0.06em", textAlign: "center" as const }}>UHJ Message</span>
        <div style={{ width: 32 }} />
      </div>
      {/* iFrame renders the full HTML document */}
      <iframe
        ref={iframeRef}
        srcDoc={fullHtml}
        style={{ flex: 1, border: "none", width: "100%" }}
        title="UHJ Message"
      />
    </div>
  );
}

function ResourceCard({ item, onOpen, T }: any) {
  return (
    <div onClick={() => onOpen(item)} style={{
      background: T.card, borderRadius: 10, padding: "16px 16px 14px",
      marginBottom: 14, border: `1.5px solid ${T.border}`,
      boxShadow: `0 2px 6px ${T.border}44`, cursor: "pointer",
      transition: "border-color 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={(e: any) => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.boxShadow = `0 4px 16px ${T.accent}22`; }}
      onMouseLeave={(e: any) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = `0 2px 6px ${T.border}44`; }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: T.accent, lineHeight: 1.4, marginBottom: 6 }}>{item.title}</div>
      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, marginBottom: 8 }}>
        {item.snippet.split(/(centres? of intense activity)/i).map((part: string, i: number) =>
          /centres? of intense activity/i.test(part) ? <strong key={i}>{part}</strong> : part
        )}
      </div>
      <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.4, fontStyle: "italic" }}>{item.source}</div>
    </div>
  );
}

function ResourcesPage({ T, reader, setReader }: any) {
  return (
    <>
      {reader && (
        <DocumentReader
          T={T}
          fileKey={reader.fileKey}
          paraIndex={reader.paraIndex}
          onClose={() => setReader(null)}
        />
      )}
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {RESOURCES.map((item, i) => (
          <ResourceCard key={i} item={item} T={T} onOpen={setReader} />
        ))}
      </div>
    </>
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
  // Topbar height — must match the <header> height in root App
  const TOPBAR_H = 58;
  // Equal vertical padding above and below the title text
  const V_PAD = 14;
  return (
    <div style={{
      position: "sticky",
      // <main> is the scroll container; PageHeader sticks to its top edge (0)
      top: 0,
      zIndex: 150,
      // Break out of parent's 16px horizontal padding so bg touches screen edges
      margin: `0 -16px`,
      // Same colour as app background — one layer above page content so
      // scrolled content slides behind this band
      background: T.bg,
      padding: `${V_PAD}px 16px`,
      textAlign: "center" as const,
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

  // ── Lifted grandchild state: DocumentReader (opened from Resources) ─────────
  const [reader, setReader] = useState<any>(null);

  // ── Refs so the back button handler (registered once) always reads fresh state
  const pageRef = useRef(page);
  const readerRef = useRef(reader);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { readerRef.current = reader; }, [reader]);

  // ── Device back button handler via Capacitor (works reliably on Android) ────
  useEffect(() => {
    // CapApp.addListener is synchronous in Capacitor 6 — no async needed
    const listenerHandle = CapApp.addListener("backButton", () => {
      const currentPage = pageRef.current;
      const currentReader = readerRef.current;

      if (currentReader) {
        // Grandchild (DocumentReader) open → close it, stay on Resources
        setReader(null);
      } else if (currentPage === "form") {
        // Form has its own internal back logic (unsaved-changes modal etc.)
        window.dispatchEvent(new Event("cia-back"));
      } else if (currentPage === "dashboard") {
        // Root screen → show exit confirmation modal
        setShowExitModal(true);
      } else {
        // Any other child page → return to Dashboard
        setPage("dashboard");
      }
    });

    // Capacitor returns a PluginListenerHandle — call .remove() to unsubscribe
    return () => { listenerHandle.then((h: any) => h.remove()); };
  }, []); // ← empty deps: registered once, reads live values via refs

  // ── Ensure ConfirmModal exit actually closes the app via Capacitor ──────────
  const handleExitApp = () => {
    CapApp.exitApp();
  };

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navigateTo = (key: string) => {
    setPage(key);
    setMenuOpen(false);
  };

  const currentItem = NAV_ITEMS.find((n) => n.key === page);

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: T.bg, overflow: "hidden" }}>

      {/* Exit App Modal */}
      {showExitModal && (
        <ConfirmModal T={T}
          title="Exit App"
          message="Are you sure you want to exit the CIA Data App?"
          onConfirm={handleExitApp}
          onCancel={() => setShowExitModal(false)}
        />
      )}

      {/* ── Header ── */}
      <header style={{ display: "flex", alignItems: "center", padding: "0 16px", background: T.topbar, borderBottom: `1px solid ${T.topbar}`, position: "sticky", top: 0, zIndex: 200, boxShadow: "0 2px 16px #00000033",
        // paddingTop pushes content below the system status bar (time/battery strip)
        paddingTop: "env(safe-area-inset-top, 0px)",
        // Total visual height = content row (58px) + status bar inset
        minHeight: "calc(58px + env(safe-area-inset-top, 0px))",
      }}>
        <div ref={menuRef} style={{ position: "relative" }}>
          <button onClick={() => setMenuOpen((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: 6, display: "flex", flexDirection: "column", gap: 7 }}>
            {[0,1,2].map((i) => (
              <div key={i} style={{ width: 31, height: 3, background: "#FFFFFF", borderRadius: 2, transition: "all 0.25s",
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
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: "#FFFFFF", letterSpacing: "0.1em", fontWeight: 600 }}>CIA Solomon Islands</span>
        </div>
        <img src="./icon.png" alt="CIA" style={{ width: 43, height: 43, border: "none", boxShadow: "none", borderRadius: 0, objectFit: "contain", flexShrink: 0 }} />
      </header>

      {/* ── Content ── */}
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 0 24px", animation: "slideUp 0.2s ease", background: T.bg }}>
        {/* Section header below topbar for all non-dashboard pages */}
        {page !== "dashboard" && <PageHeader T={T} title={NAV_ITEMS.find((n) => n.key === page)?.label ?? ""} />}
        <div style={{ padding: "0 16px" }}>
          {page === "dashboard"  && <Dashboard T={T} setPage={navigateTo} />}
          {page === "form"       && <DataCollectionForm T={T} forms={forms} setForms={setForms} currentIndex={currentFormIndex} setCurrentIndex={setCurrentFormIndex} setPage={navigateTo} />}
          {page === "summary"    && <Summary T={T} forms={forms} />}
          {page === "cycle"      && <PlaceholderPage T={T} title="Cycle Report" icon="🔄" />}
          {page === "resources"  && <ResourcesPage T={T} reader={reader} setReader={setReader} />}
          {page === "settings"   && <SettingsPage T={T} theme={theme} setTheme={setThemeKey} />}
          {page === "about"      && <AboutPage T={T} />}
        </div>
      </main>
    </div>
  );
}
