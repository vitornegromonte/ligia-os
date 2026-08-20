import { useOutletContext } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  Menu, Award, Wand2, Trash2, Printer, Download,
  ChevronLeft, ChevronRight, Users, CircleCheck, BookOpen, Search, Upload
} from "lucide-react";
import { showToast } from "../utils/toast.js";
import { jsPDF } from "jspdf";

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
    position: "relative", width: "100%", aspectRatio: "16 / 9",
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
  const [eventDesc, setEventDesc] = useState("");
  const [coordinator, setCoordinator] = useState("");
  const [president, setPresident] = useState("");
  const [city, setCity] = useState("Recife");
  const [manualText, setManualText] = useState("");
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
    setShowingPreview(false);
    showToast("Campos limpos");
  }

  function handlePrint() {
    if (names.length === 0) return;
    const data = certData();
    const inner = names.map(name => buildCertHtml(name, data)).join("");
    const fullHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificados — ${data.eventTitle}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        ${PRINT_STYLES}
      </style>
    </head><body>${inner}</body></html>`;
    const win = window.open("", "_blank");
    if (!win) {
      showToast("Permita pop-ups para imprimir");
      return;
    }
    win.document.write(fullHtml);
    win.document.close();
    setTimeout(() => {
      const imgs = Array.from(win.document.images || []);
      const wait = () => {
        if (imgs.some(img => !img.complete)) { setTimeout(wait, 50); return; }
        win.focus();
        win.print();
      };
      wait();
    }, 150);
  }

  async function handleDownload() {
    if (names.length === 0) return;
    showToast("Gerando PDF…");
    try {
      const slug = eventName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "evento";
      const data = certData();
      const logos = await loadLogos();

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [297, 167] });

      for (let i = 0; i < names.length; i++) {
        if (i > 0) pdf.addPage();
        drawCertificate(pdf, names[i], data, logos);
      }

      pdf.save(`certificados-${slug}.pdf`);
      showToast(`PDF com ${names.length} certificado${names.length > 1 ? "s" : ""} baixado`);
    } catch (err) {
      console.error(err);
      showToast("Erro ao gerar PDF: " + err.message);
    }
  }

  function certData() {
    return {
      eventTitle: eventName.trim() || "Nome do Evento",
      eventDesc: eventDesc.trim(),
      dateText: eventDate.trim() || "Data do evento",
      hoursText: certHours.trim() || "Carga horária",
      coordinator: coordinator.trim() || "Nome do(a) Coordenador(a)",
      president: president.trim() || "Nome do(a) Presidente",
      city: city.trim() || "Recife",
    };
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
              <input type="text" placeholder="Ex: 20 horas" autoComplete="off"
                value={certHours} onChange={e => setCertHours(e.target.value)}
                style={s.input} />
            </div>
          </div>

          <div style={s.formGroup}>
            <label style={s.formLabel}>Descrição do evento</label>
            <textarea placeholder="Ex: maratona de desenvolvimento de soluções em Inteligência Artificial para o setor jurídico…"
              value={eventDesc} onChange={e => setEventDesc(e.target.value)}
              style={s.textarea} />
            <div style={s.hint}>Texto que aparece após o nome do evento. Ex: "maratona de desenvolvimento…".</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 26 }}>
            <div>
              <label style={s.formLabel}>Coordenador(a)</label>
              <input type="text" placeholder="Nome do(a) coordenador(a)" autoComplete="off"
                value={coordinator} onChange={e => setCoordinator(e.target.value)}
                style={s.input} />
            </div>
            <div>
              <label style={s.formLabel}>Presidente da Ligia</label>
              <input type="text" placeholder="Nome do(a) presidente" autoComplete="off"
                value={president} onChange={e => setPresident(e.target.value)}
                style={s.input} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 26 }}>
            <div>
              <label style={s.formLabel}>Cidade</label>
              <input type="text" placeholder="Ex: Recife" autoComplete="off"
                value={city} onChange={e => setCity(e.target.value)}
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

            <div style={{ ...s.certSheet, background: "radial-gradient(circle at 88% -8%, rgba(255,75,31,.07) 0%, transparent 42%), radial-gradient(circle at 4% 108%, rgba(255,144,104,.09) 0%, transparent 45%), #FFFBF8", border: "1px solid #F0DED4", justifyContent: "space-between", alignItems: "stretch", textAlign: "left", padding: "20px 44px" }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 12,
                background: "linear-gradient(135deg, #FF4B1F, #FF9068)"
              }}></div>
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 12,
                background: "linear-gradient(135deg, #FF4B1F, #FF9068)"
              }}></div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <img src="/media/ligia-dark.png" alt="Ligia"
                  style={{ height: 38, width: "auto" }} />
                <img src="/media/logos.png" alt="Logos"
                  style={{ height: 38, width: "auto" }} />
              </div>

              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 700, margin: "0 0 5px", letterSpacing: "-.03em", color: "transparent", background: "linear-gradient(135deg,#FF4B1F,#FF9068)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>
                  Certificado
                </h2>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4em", color: "#241914" }}>
                  de Participação
                </div>
                <div style={{ width: 80, height: 3, background: "linear-gradient(135deg,#FF4B1F,#FF9068)", borderRadius: 999, margin: "13px auto" }}></div>
                <p style={{ margin: 0, fontSize: 13.5, color: "#7A6A61" }}>
                  Certificamos para os devidos fins que
                </p>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, fontWeight: 700, color: "#241914", margin: "10px 0 8px", letterSpacing: "-.02em" }}>
                  {currentName}
                </div>
                <p style={{ margin: "0 auto", maxWidth: 620, fontSize: 12.5, color: "#7A6A61", lineHeight: 1.65 }}>
                  participou ativamente do <strong style={{ color: "#241914" }}>{eventName.trim() || "Nome do Evento"}</strong>
                  {eventDesc.trim() ? `, ${eventDesc.trim()}` : ""}.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 14, flexWrap: "wrap" }}>
                  {[["Data", certDateDisplay], ["Carga horária", certHoursDisplay]].map(([label, value]) => (
                    <span key={label} style={{ display: "inline-flex", alignItems: "baseline", gap: 7, border: "1.5px solid #F0DED4", borderRadius: 999, padding: "5px 17px", fontSize: 11.5, color: "#241914", background: "#FFF3EE" }}>
                      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".15em", color: "#FF4B1F" }}>{label}</span>
                      <span>{value}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 }}>
                <div style={{ display: "flex", gap: 24 }}>
                  {[["Coordenação Institucional", coordinator.trim() || "Nome do(a) Coordenador(a)"], ["Presidente da Ligia", president.trim() || "Nome do(a) Presidente"]].map(([role, who]) => (
                    <div key={role} style={{ textAlign: "center", width: 180 }}>
                      <div style={{ width: "100%", height: 1, background: "#241914", marginBottom: 7 }}></div>
                      <div style={{ fontWeight: 600, fontSize: 12.5, color: "#241914" }}>{who}</div>
                      <div style={{ fontSize: 10.5, color: "#7A6A61", marginTop: 2 }}>{role}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "#7A6A61", textAlign: "right", lineHeight: 1.5 }}>
                  {city.trim() || "Recife"}, {certDateDisplay}
                </div>
              </div>
            </div>

            <div style={s.certActions}>
              <button onClick={handlePrint}
                style={{ ...s.btn, ...s.btnSuccess }}>
                <Printer size={17} /> Imprimir todos
              </button>
              <button onClick={handleDownload}
                style={{ ...s.btn, ...s.btnGhost }}>
                <Download size={17} /> Baixar PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const PRINT_STYLES = `
:root {
  --ligia-orange-1: #FF4B1F;
  --ligia-orange-2: #FF9068;
  --ligia-gradient: linear-gradient(135deg, var(--ligia-orange-1), var(--ligia-orange-2));
  --text-dark: #241914;
  --text-muted: #7A6A61;
  --bg-light: #FFFBF8;
  --surface-2: #FFF3EE;
  --border: #F0DED4;
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body: 'Sora', sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { background: #fff; font-family: var(--font-body); display: flex; flex-direction: column; align-items: center; justify-content: center; }
@page { margin: 0; size: A4 landscape; }

.certificate-wrapper {
  width: 297mm;
  height: 167mm;
  background:
    radial-gradient(circle at 88% -8%, rgba(255,75,31,.07) 0%, transparent 42%),
    radial-gradient(circle at 4% 108%, rgba(255,144,104,.09) 0%, transparent 45%),
    var(--bg-light);
  position: relative;
  overflow: hidden;
  padding: 9mm 24mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  page-break-after: always;
}
.certificate-wrapper::before,
.certificate-wrapper::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 3mm;
  background: var(--ligia-gradient);
}
.certificate-wrapper::before { top: 0; }
.certificate-wrapper::after { bottom: 0; }

.header { display: flex; justify-content: space-between; align-items: flex-start; }
.logo { height: 11.6mm; width: auto; }
.logo-logos { height: 11.6mm; width: auto; }

.content { text-align: center; margin: auto 0; }
.title { font-family: var(--font-heading); font-size: 11mm; font-weight: 700; color: transparent; background: var(--ligia-gradient); -webkit-background-clip: text; background-clip: text; margin-bottom: 1.5mm; letter-spacing: -0.03em; }
.subtitle { font-family: var(--font-heading); font-size: 4.6mm; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4em; color: var(--text-dark); }
.divider { width: 42mm; height: 0.9mm; background: var(--ligia-gradient); border-radius: 999; margin: 5mm auto; }
.label { font-size: 4.3mm; color: var(--text-muted); font-weight: 400; }
.participant-name { font-family: var(--font-heading); font-size: 11.5mm; font-weight: 700; color: var(--text-dark); margin: 4.5mm 0 3.5mm; letter-spacing: -0.02em; }
.description { font-size: 4.4mm; color: var(--text-muted); line-height: 1.65; max-width: 205mm; margin: 0 auto; }
.event-name { font-weight: 600; color: var(--text-dark); }
.meta { display: flex; justify-content: center; gap: 7mm; margin-top: 6mm; }
.chip { display: inline-flex; align-items: baseline; gap: 2.5mm; border: 0.5mm solid var(--border); border-radius: 999; padding: 2.2mm 6mm; font-size: 3.6mm; color: var(--text-dark); background: var(--surface-2); }
.chip-label { font-family: var(--font-heading); font-size: 3mm; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; color: var(--ligia-orange-1); }

.footer { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1mm; }
.signatures { display: flex; gap: 14mm; }
.signature-block { text-align: center; width: 56mm; }
.signature-line { width: 100%; height: 0.3mm; background-color: var(--text-dark); margin-bottom: 2.5mm; }
.signature-name { font-weight: 600; font-size: 4mm; color: var(--text-dark); }
.signature-role { font-size: 3mm; color: var(--text-muted); margin-top: 0.8mm; }
.city-date { font-size: 3.4mm; color: var(--text-muted); text-align: right; line-height: 1.5; }
`;

function buildCertHtml(name, data) {
  const desc = `participou ativamente do <span class="event-name">${data.eventTitle}</span>` +
    (data.eventDesc ? `, ${data.eventDesc}` : "") + ".";
  return `
  <div class="certificate-wrapper">
    <header class="header">
      <img class="logo" src="/media/ligia-dark.png" alt="Ligia">
      <img class="logo-logos" src="/media/logos.png" alt="Logos">
    </header>
    <main class="content">
      <h1 class="title">Certificado</h1>
      <div class="subtitle">de Participação</div>
      <div class="divider"></div>
      <p class="label">Certificamos para os devidos fins que</p>
      <div class="participant-name">${name}</div>
      <p class="description">${desc}</p>
      <div class="meta">
        <span class="chip"><span class="chip-label">Data</span> ${data.dateText}</span>
        <span class="chip"><span class="chip-label">Carga horária</span> ${data.hoursText}</span>
      </div>
    </main>
    <footer class="footer">
      <div class="signatures">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-name">${data.coordinator}</div>
          <div class="signature-role">Coordenação Institucional</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-name">${data.president}</div>
          <div class="signature-role">Presidente da Ligia</div>
        </div>
      </div>
      <div class="city-date">
        ${data.city}, ${data.dateText}
      </div>
    </footer>
  </div>`;
}

function rasterize(src, w, h) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/png"));
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadLogos() {
  const [ligia, logos] = await Promise.all([
    rasterize("/media/ligia-dark.png", 384, 127),
    rasterize("/media/logos.png", 5610, 1255)
  ]);
  return { ligia, logos };
}

function drawGradientBar(pdf, x, y, w, h, c1, c2) {
  const steps = 80;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    pdf.setFillColor(
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t)
    );
    pdf.rect(x + (i * w) / steps, y, w / steps + 0.1, h, "F");
  }
}

function drawCertificate(pdf, name, data, logos) {
  const W = 297, H = 167, cx = W / 2;
  const ORANGE = [255, 75, 31];
  const ORANGE2 = [255, 144, 104];
  const DARK = [36, 25, 20];
  const MUTED = [122, 106, 97];
  const CHIP_BG = [255, 243, 238];
  const CHIP_BORDER = [240, 222, 212];

  pdf.setFillColor(255, 251, 248);
  pdf.rect(0, 0, W, H, "F");

  pdf.setFillColor(255, 243, 238);
  pdf.circle(268, 14, 48, "F");
  pdf.circle(18, 156, 60, "F");
  pdf.setDrawColor(255, 214, 200);
  pdf.setLineWidth(0.8);
  pdf.circle(282, 2, 38, "S");

  drawGradientBar(pdf, 0, 0, W, 3, ORANGE, ORANGE2);
  drawGradientBar(pdf, 0, H - 3, W, 3, ORANGE, ORANGE2);

  if (logos) {
    if (logos.ligia) pdf.addImage(logos.ligia, "PNG", 30, 24.4, 35.09, 11.6);
    if (logos.logos) pdf.addImage(logos.logos, "PNG", W - 30 - 51.85, 24.4, 51.85, 11.6);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  pdf.text("Certificado", cx, 68, { align: "center" });

  pdf.setFontSize(11);
  pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
  pdf.text("DE PARTICIPAÇÃO", cx, 76, { align: "center", charSpace: 2 });

  drawGradientBar(pdf, cx - 20, 80.5, 40, 1.1, ORANGE, ORANGE2);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10.5);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.text("Certificamos para os devidos fins que", cx, 88, { align: "center" });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(26);
  pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
  pdf.text(pdf.splitTextToSize(name, 220), cx, 106, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  const desc = `participou ativamente do ${data.eventTitle}` +
    (data.eventDesc ? `, ${data.eventDesc}` : "") + ".";
  pdf.text(pdf.splitTextToSize(desc, 185), cx, 118, { align: "center" });

  const chipW = 54, chipH = 12, chipY = 128, gap = 10;
  const chips = [
    { label: "DATA", value: data.dateText },
    { label: "CARGA HORÁRIA", value: data.hoursText }
  ];
  chips.forEach((c, i) => {
    const x = cx - chipW - gap / 2 + i * (chipW + gap);
    pdf.setFillColor(CHIP_BG[0], CHIP_BG[1], CHIP_BG[2]);
    pdf.roundedRect(x, chipY, chipW, chipH, 4, 4, "F");
    pdf.setDrawColor(CHIP_BORDER[0], CHIP_BORDER[1], CHIP_BORDER[2]);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, chipY, chipW, chipH, 4, 4, "S");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    pdf.text(c.label, cx + (i * 2 - 1) * (chipW + gap) / 2, chipY + 4.5, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
    pdf.text(pdf.splitTextToSize(c.value, chipW - 6), cx + (i * 2 - 1) * (chipW + gap) / 2, chipY + 9, { align: "center" });
  });

  const fy = 150;
  pdf.setDrawColor(DARK[0], DARK[1], DARK[2]);
  pdf.setLineWidth(0.3);
  pdf.line(36, fy - 2, 92, fy - 2);
  pdf.line(108, fy - 2, 164, fy - 2);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(DARK[0], DARK[1], DARK[2]);
  pdf.text(pdf.splitTextToSize(data.coordinator, 56), 64, fy + 5, { align: "center" });
  pdf.text(pdf.splitTextToSize(data.president, 56), 136, fy + 5, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.text("Coordenação Institucional", 64, fy + 11.5, { align: "center" });
  pdf.text("Presidente da Ligia", 136, fy + 11.5, { align: "center" });

  pdf.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  pdf.text(`${data.city}, ${data.dateText}`, W - 30, fy + 3, { align: "right" });
}
