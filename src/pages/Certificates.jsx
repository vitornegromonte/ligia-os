import { useOutletContext } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  Menu, Award, Wand2, Trash2, Printer, Download,
  ChevronLeft, ChevronRight, Users, CircleCheck, BookOpen, Search, Upload
} from "lucide-react";
import { showToast } from "../utils/toast.js";

const s = {
  topbar: {
    position: "sticky", top: 0, zIndex: 30, height: 66,
    display: "flex", alignItems: "center", gap: 18,
    padding: "0 clamp(20px, 4vw, 52px)",
    borderBottom: "1px solid rgba(52,51,45,.72)",
    background: "rgba(15,15,13,.82)", backdropFilter: "blur(18px)"
  },
  mobileMenu: {
    display: "none", padding: 6, border: 0, background: "none",
    cursor: "pointer", color: "var(--text)"
  },
  breadcrumbs: { color: "var(--muted)", fontSize: 13 },
  breadcrumbStrong: {
    color: "var(--text)", fontWeight: 550, fontFamily: "var(--font-heading)"
  },
  content: {
    padding: "36px clamp(20px, 4vw, 52px) 72px",
    width: "min(1420px, 100%)", margin: "0 auto"
  },
  eyebrow: {
    marginBottom: 8, color: "var(--muted-2)", fontSize: 11,
    fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase"
  },
  h1: {
    margin: "0 0 12px", fontSize: "clamp(32px, 5vw, 40px)",
    fontWeight: 500, letterSpacing: "-.03em"
  },
  desc: {
    maxWidth: 520, margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.7
  },
  formCard: {
    maxWidth: 900, padding: 32, borderRadius: "var(--radius)",
    border: "1px solid var(--line-soft)", background: "var(--surface)",
    marginBottom: 36
  },
  formGroup: { marginBottom: 26 },
  formGroupLast: { marginBottom: 0 },
  formLabel: {
    display: "block", marginBottom: 12, color: "var(--muted)",
    fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em"
  },
  input: {
    width: "100%", padding: "14px 16px",
    border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
    color: "var(--text)", background: "var(--surface-2)",
    outline: 0, fontSize: 13, boxSizing: "border-box",
    transition: "border-color 180ms ease"
  },
  textarea: {
    width: "100%", minHeight: 120, padding: "14px 16px",
    border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
    color: "var(--text)", background: "var(--surface-2)",
    outline: 0, fontSize: 12, lineHeight: 1.6, resize: "vertical",
    fontFamily: "var(--font-body)", boxSizing: "border-box",
    transition: "border-color 180ms ease"
  },
  fileInput: {
    padding: 8, fontSize: 12
  },
  hint: {
    marginTop: 5, color: "var(--muted-2)", fontSize: 10
  },
  nameCount: {
    display: "inline-flex", alignItems: "center", gap: 5,
    marginTop: 10, padding: "4px 11px", borderRadius: 9999,
    background: "var(--surface-3)", color: "var(--muted)", fontSize: 11
  },
  formActions: {
    display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap"
  },
  btn: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "12px 26px", border: 0, borderRadius: "var(--radius-sm)",
    cursor: "pointer", fontSize: 13, fontWeight: 550,
    fontFamily: "var(--font-body)",
    transition: "all 180ms ease"
  },
  btnPrimary: {
    color: "#fff", background: "var(--accent)"
  },
  btnPrimaryDisabled: {
    color: "#fff", background: "var(--accent)", opacity: 0.4,
    cursor: "not-allowed"
  },
  btnGhost: {
    color: "var(--muted)", border: "1px solid var(--line)",
    background: "transparent"
  },
  btnSuccess: {
    color: "#fff", background: "var(--green, #6da87c)"
  },
  previewHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 16
  },
  previewHeaderTitle: { margin: 0, fontSize: 17, fontWeight: 550 },
  previewCount: { color: "var(--muted-2)", fontSize: 12 },
  previewList: {
    display: "grid", gap: 6, maxHeight: 320, overflowY: "auto",
    padding: "4px 0"
  },
  previewItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 13px", borderRadius: "var(--radius-sm)",
    background: "var(--surface-2)", fontSize: 12
  },
  previewIndex: {
    width: 22, color: "var(--muted-2)", fontSize: 10,
    textAlign: "right", flexShrink: 0
  },
  previewName: { flex: 1, fontWeight: 500 },
  previewCheck: { color: "var(--green, #6da87c)" },
  navBtns: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 12, marginBottom: 20
  },
  navCounter: {
    color: "var(--muted)", fontSize: 12, minWidth: 80, textAlign: "center"
  },
  certSheet: {
    position: "relative", width: "100%", aspectRatio: "1.414 / 1",
    padding: "36px 44px", borderRadius: "var(--radius)",
    background: `
      radial-gradient(circle at 70% 30%, rgba(255,75,31,.06), transparent 50%),
      radial-gradient(circle at 30% 70%, rgba(255,75,31,.04), transparent 50%),
      linear-gradient(160deg, #1a1a17, #141411)
    `,
    border: "1px solid var(--line)",
    overflow: "hidden", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", textAlign: "center",
    boxSizing: "border-box"
  },
  certActions: {
    display: "flex", gap: 10, justifyContent: "center", marginTop: 20, flexWrap: "wrap"
  }
};

export default function Certificates() {
  const { menuOpen, setMenuOpen } = useOutletContext();
  const fileInputRef = useRef(null);
  const [names, setNames] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [certHours, setCertHours] = useState("");
  const [manualText, setManualText] = useState("");
  const [fileLoaded, setFileLoaded] = useState(false);
  const [showingPreview, setShowingPreview] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0 }); }, []);
  useEffect(() => { document.title = "Ligia — Certificados"; }, []);

  useEffect(() => {
    if (!showingPreview) return;
    function handleKey(e) {
      if (e.key === "ArrowRight") {
        if (currentIndex < names.length - 1) setCurrentIndex(i => Math.min(i + 1, names.length - 1));
      }
      if (e.key === "ArrowLeft") {
        if (currentIndex > 0) setCurrentIndex(i => Math.max(i - 1, 0));
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showingPreview, currentIndex, names.length]);

  const nameCount = names.length;

  function parseFile(text) {
    const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const first = lines[0] || "";
    const hasHeader = /nome|name|participante|aluno/i.test(first) && lines.length > 1;
    const parsed = hasHeader ? lines.slice(1) : lines;
    setManualText(parsed.join("\n"));
    setNames(parsed);
    setFileLoaded(true);
    setShowingPreview(false);
    if (parsed.length > 0) {
      showToast(`${parsed.length} nome${parsed.length > 1 ? "s" : ""} carregado${parsed.length > 1 ? "s" : ""}`);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => parseFile(ev.target.result);
    reader.readAsText(file);
  }

  function handleManualEdit(value) {
    setManualText(value);
    const list = value.split("\n").map(s => s.trim()).filter(Boolean);
    setNames(list);
    setShowingPreview(false);
  }

  function handleGenerate() {
    if (names.length === 0) {
      showToast("Carregue uma lista de nomes primeiro");
      return;
    }
    if (!eventName.trim()) {
      showToast("Informe o nome do evento");
      return;
    }
    setCurrentIndex(0);
    setShowingPreview(true);
    showToast(`${names.length} certificado${names.length > 1 ? "s" : ""} gerado${names.length > 1 ? "s" : ""}`);
  }

  function handleClear() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setManualText("");
    setNames([]);
    setCurrentIndex(0);
    setFileLoaded(false);
    setShowingPreview(false);
    showToast("Campos limpos");
  }

  function handlePrint() {
    if (names.length === 0) return;
    window.print();
  }

  function handleDownload() {
    if (names.length === 0) return;
    const slug = eventName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "evento";
    const dateText = eventDate.trim() || "Data do evento";
    const hoursText = certHours.trim() || "Carga horária";
    const logoPath = "/media/logo.svg";
    const inner = names.map(name => `
      <div style="width:297mm;height:210mm;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(160deg,#1a1a17,#141411);overflow:hidden;font-family:'Times New Roman',serif;padding:36px 44px;page-break-after:always;box-sizing:border-box">
        <div style="position:absolute;inset:18px;border:1px solid rgba(255,75,31,.12);border-radius:10px;pointer-events:none"></div>
        <div style="position:absolute;inset:24px;border:1px solid rgba(255,255,255,.04);border-radius:6px;pointer-events:none"></div>
        <img src="${logoPath}" style="width:64px;margin-bottom:12px;opacity:.8" alt="Ligia">
        <div style="color:#767368;font-size:10px;letter-spacing:.18em;text-transform:uppercase;margin-bottom:6px">Certificado</div>
        <div style="width:60px;height:2px;background:linear-gradient(135deg,#FF4B1F,#FF9068);border-radius:999px;margin-bottom:16px"></div>
        <div style="font-size:22px;color:#a09d91;font-style:italic;margin-bottom:16px">\u2014 <strong style="color:#f2efe6;font-style:normal">${eventName.trim()}</strong></div>
        <div style="font-size:42px;font-weight:600;color:#fff;letter-spacing:-.01em;line-height:1.15;margin-bottom:14px">${name}</div>
        <div style="max-width:400px;color:#a09d91;font-size:11px;line-height:1.7;margin-bottom:18px">Certificamos que o(a) participante acima contribuiu com sua presen\u00e7a e engajamento neste evento promovido pela comunidade Ligia.</div>
        <div style="display:flex;align-items:center;gap:24px;margin-top:4px">
          <span style="color:#767368;font-size:10px;letter-spacing:.06em">${dateText}</span>
          <svg width="60" height="24" viewBox="0 0 60 24" fill="none"><path d="M5 12h50M30 2v20" stroke="#FF4B1F" stroke-width=".5" vector-effect="non-scaling-stroke"/><circle cx="30" cy="12" r="3" fill="#FF4B1F" opacity=".4"/></svg>
          <span style="color:#767368;font-size:10px;letter-spacing:.06em">${hoursText}</span>
        </div>
      </div>`).join("");
    const fullHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>body{margin:0;padding:0}@page{margin:0;size:A4 landscape}</style></head><body>${inner}</body></html>`;
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificados-${slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Arquivo com ${names.length} certificado${names.length > 1 ? "s" : ""} baixado`);
  }

  const currentName = names[currentIndex] || "";
  const hasNames = nameCount > 0;
  const prevDisabled = currentIndex === 0;
  const nextDisabled = currentIndex === nameCount - 1;

  const certDateDisplay = eventDate.trim() || "Data do evento";
  const certHoursDisplay = certHours.trim() || "Carga horária";

  return (
    <>
      <header style={s.topbar}>
        <button className="mobile-menu" onClick={() => setMenuOpen(true)}
          aria-label="Abrir navegação" style={s.mobileMenu}>
          <Menu size={20} />
        </button>
        <div style={s.breadcrumbs}>
          Ligia &nbsp;/&nbsp; <strong style={s.breadcrumbStrong}>Certificados</strong>
        </div>
      </header>

      <div style={s.content}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={s.h1}><span className="gradient-text">Certificados.</span></h1>
          <p style={s.desc}>Importe uma lista de nomes, defina o evento e a data, e gere certificados personalizados para todos os participantes. Pronto para impressão.</p>
        </div>

        <div style={s.formCard}>
          <div style={s.formGroup}>
            <label style={s.formLabel}>Nome do evento</label>
            <input type="text" placeholder="Ex: Workshop de Introdução ao NLP" autoComplete="off"
              value={eventName} onChange={e => setEventName(e.target.value)}
              style={s.input} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 26 }}>
            <div>
              <label style={s.formLabel}>Data do evento</label>
              <input type="text" placeholder="Ex: 12 de julho de 2026" autoComplete="off"
                value={eventDate} onChange={e => setEventDate(e.target.value)}
                style={s.input} />
            </div>
            <div>
              <label style={s.formLabel}>Carga horária</label>
              <input type="text" placeholder="Ex: 4 horas" autoComplete="off"
                value={certHours} onChange={e => setCertHours(e.target.value)}
                style={s.input} />
            </div>
          </div>

          <div style={s.formGroup}>
            <label style={s.formLabel}>Lista de nomes</label>
            <input type="file" ref={fileInputRef} accept=".csv,.txt"
              onChange={handleFileChange}
              style={{ ...s.input, ...s.fileInput }} />
            <div style={s.hint}>Arquivo .txt ou .csv com um nome por linha. A primeira linha será ignorada se for cabeçalho.</div>
            {hasNames && (
              <div style={s.nameCount}>
                <Users size={13} />
                <span><strong style={{ color: "var(--text)", fontWeight: 600 }}>{nameCount}</strong> nomes carregados</span>
              </div>
            )}
          </div>

          <div style={{ ...s.formGroup, ...s.formGroupLast }}>
            <label style={s.formLabel}>Ou edite manualmente</label>
            <textarea placeholder="Cole ou digite os nomes, um por linha..."
              value={manualText}
              disabled={!fileLoaded && manualText.length === 0}
              onChange={e => handleManualEdit(e.target.value)}
              style={s.textarea} />
          </div>

          <div style={s.formActions}>
            <button onClick={handleGenerate}
              disabled={!hasNames}
              style={{
                ...s.btn,
                ...(hasNames ? s.btnPrimary : s.btnPrimaryDisabled)
              }}>
              <Wand2 size={17} /> Gerar certificados
            </button>
            <button onClick={handleClear}
              style={{ ...s.btn, ...s.btnGhost }}>
              <Trash2 size={17} /> Limpar
            </button>
          </div>
        </div>

        {hasNames && (
          <div style={{ maxWidth: 900, marginBottom: 36 }}>
            <div style={s.previewHeader}>
              <h2 style={s.previewHeaderTitle}>Visualizar certificados</h2>
              <span style={s.previewCount}>{nameCount} certificado{nameCount > 1 ? "s" : ""}</span>
            </div>
            <div style={s.previewList}>
              {names.map((name, i) => (
                <div key={i} style={s.previewItem}>
                  <span style={s.previewIndex}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={s.previewName}>{name}</span>
                  <span style={s.previewCheck}><CircleCheck size={14} /></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showingPreview && hasNames && (
          <div style={{ maxWidth: 900 }}>
            <div style={s.navBtns}>
              <button onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))}
                disabled={prevDisabled}
                style={{ ...s.btn, ...s.btnGhost, opacity: prevDisabled ? 0.4 : 1, cursor: prevDisabled ? "not-allowed" : "pointer" }}>
                <ChevronLeft size={17} /> Anterior
              </button>
              <span style={s.navCounter}>{currentIndex + 1} / {nameCount}</span>
              <button onClick={() => setCurrentIndex(i => Math.min(i + 1, nameCount - 1))}
                disabled={nextDisabled}
                style={{ ...s.btn, ...s.btnGhost, opacity: nextDisabled ? 0.4 : 1, cursor: nextDisabled ? "not-allowed" : "pointer" }}>
                Próximo <ChevronRight size={17} />
              </button>
            </div>

            <div style={s.certSheet}>
              <div style={{
                position: "absolute", inset: 18,
                border: "1px solid rgba(255,75,31,.12)",
                borderRadius: 10, pointerEvents: "none"
              }}></div>
              <div style={{
                position: "absolute", inset: 24,
                border: "1px solid rgba(255,255,255,.04)",
                borderRadius: 6, pointerEvents: "none"
              }}></div>
              <img src="/media/logo.svg"
                alt="Ligia"
                style={{ width: 54, height: "auto", marginBottom: 12, opacity: 0.8 }} />
              <div style={{
                color: "var(--muted-2)", fontSize: 9,
                letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 6
              }}>Certificado</div>
              <div style={{
                width: 60, height: 2,
                background: "linear-gradient(135deg, #FF4B1F, #FF9068)",
                borderRadius: 999, marginBottom: 16
              }}></div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(18px, 2.8vw, 32px)", fontStyle: "italic",
                color: "var(--muted)", letterSpacing: ".02em", marginBottom: 16
              }}>
                &mdash; <strong style={{ color: "var(--text)", fontStyle: "normal" }}>{eventName.trim() || "Nome do Evento"}</strong>
              </div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 600,
                color: "#fff", letterSpacing: "-.01em", lineHeight: 1.15,
                marginBottom: 14
              }}>{currentName}</div>
              <div style={{
                maxWidth: 400, color: "var(--muted)",
                fontSize: "clamp(9px, 1.1vw, 12px)", lineHeight: 1.7,
                marginBottom: 18
              }}>
                Certificamos que o(a) participante acima contribuiu com sua presença e engajamento neste evento promovido pela comunidade Ligia.
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 24, marginTop: 4
              }}>
                <span style={{
                  color: "var(--muted-2)", fontSize: "clamp(8px, .9vw, 10px)",
                  letterSpacing: ".06em"
                }}>{certDateDisplay}</span>
                <svg viewBox="0 0 60 24" fill="none"
                  style={{
                    width: "clamp(40px, 5vw, 60px)", height: "auto",
                    color: "var(--accent)", opacity: 0.3
                  }}>
                  <path d="M5 12h50M30 2v20" stroke="currentColor" strokeWidth=".5" vectorEffect="non-scaling-stroke" />
                  <circle cx="30" cy="12" r="3" fill="currentColor" opacity=".4" />
                </svg>
                <span style={{
                  color: "var(--muted-2)", fontSize: "clamp(8px, .9vw, 10px)",
                  letterSpacing: ".06em"
                }}>{certHoursDisplay}</span>
              </div>
            </div>

            <div style={s.certActions}>
              <button onClick={handlePrint}
                style={{ ...s.btn, ...s.btnSuccess }}>
                <Printer size={17} /> Imprimir todos
              </button>
              <button onClick={handleDownload}
                style={{ ...s.btn, ...s.btnGhost }}>
                <Download size={17} /> Baixar HTML
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
