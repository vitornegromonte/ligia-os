import { useOutletContext } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import {
  Menu, Users, Activity, CircleGauge, BrainCircuit, Award,
  GraduationCap, Github, Linkedin, Building, BookOpen,
  BarChart3, PieChart, TrendingUp, CalendarDays, ChevronDown,
  Search, Filter, ArrowUpRight
} from "lucide-react";
import { showToast } from "../utils/toast.js";
import people from "../data/people.js";

const teamColors = {
  NLP: { bar: "#6b8eb3", bg: "rgba(107,142,179,.15)" },
  ML: { bar: "#6da87c", bg: "rgba(109,168,124,.15)" },
  CV: { bar: "#c4a358", bg: "rgba(196,163,88,.15)" },
  "Comunicação": { bar: "#c76b60", bg: "rgba(199,107,96,.15)" }
};

const statusColors = {
  online: { dot: "#6da87c", label: "Online" },
  busy: { dot: "#c76b60", label: "Ocupado" },
  away: { dot: "#c4a358", label: "Ausente" }
};

export default function Dashboard() {
  const { menuOpen, setMenuOpen } = useOutletContext();
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => { document.title = "Ligia — Dashboard"; window.scrollTo({ top: 0 }); }, []);

  const stats = useMemo(() => {
    const total = people.length;
    const active = people.filter(p => p.status === "online").length;
    const available = people.filter(p => p.availability === "Available").length;
    const withLattes = people.filter(p => p.lattes).length;
    const withGithub = people.filter(p => p.github).length;
    const totalSkills = new Set(people.flatMap(p => p.skills));
    return { total, active, available, withLattes, withGithub, totalSkills: totalSkills.size };
  }, []);

  const teamDist = useMemo(() => {
    const dist = {};
    people.forEach(p => { dist[p.team] = (dist[p.team] || 0) + 1; });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
  }, []);

  const availDist = useMemo(() => {
    const dist = {};
    people.forEach(p => { dist[p.availability] = (dist[p.availability] || 0) + 1; });
    return dist;
  }, []);

  const statusDist = useMemo(() => {
    const dist = {};
    people.forEach(p => { dist[p.status] = (dist[p.status] || 0) + 1; });
    return dist;
  }, []);

  const skillRank = useMemo(() => {
    const freq = {};
    people.forEach(p => p.skills.forEach(s => { freq[s] = (freq[s] || 0) + 1; }));
    return Object.entries(freq).sort((a, b) => b[1] - a[1]);
  }, []);

  const maxTeamCount = Math.max(...teamDist.map(([, c]) => c), 1);
  const maxSkillCount = Math.max(...skillRank.map(([, c]) => c), 1);

  const c = {
    page: { padding: "36px clamp(20px, 4vw, 52px) 72px" },
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
    statCard: {
      padding: "20px 22px", borderRadius: "var(--radius)",
      border: "1px solid var(--line-soft)", background: "var(--surface)"
    },
    section: {
      marginBottom: 36
    },
    sectionTitle: {
      margin: "0 0 18px", fontSize: 15, fontWeight: 550,
      display: "flex", alignItems: "center", gap: 8
    },
    card: {
      padding: 22, borderRadius: "var(--radius)",
      border: "1px solid var(--line-soft)", background: "var(--surface)"
    }
  };

  return (
    <>
      <header style={c.topbar}>
        <button className="mobile-menu" onClick={() => setMenuOpen(true)}
          aria-label="Abrir navegação" style={c.mobileMenu}>
          <Menu size={20} />
        </button>
        <div style={c.breadcrumbs}>
          Ligia &nbsp;/&nbsp; <strong style={c.breadcrumbStrong}>Dashboard</strong>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => showToast("Exportando relatório…")}
            style={{
              padding: "8px 16px", border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)", color: "var(--muted)",
              background: "transparent", cursor: "pointer", fontSize: 12,
              fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 6
            }}>
            <BarChart3 size={15} /> Exportar
          </button>
        </div>
      </header>

      <div style={c.page}>
        <div style={{ marginBottom: 36 }}>
          <div style={{
            marginBottom: 8, color: "var(--muted-2)", fontSize: 11,
            fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase"
          }}>Visão geral</div>
          <h1 style={{
            margin: "0 0 10px", fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 500, letterSpacing: "-.03em"
          }}><span className="gradient-text">Dashboard.</span></h1>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.7, maxWidth: 500 }}>
            Acompanhe métricas, distribuição de times, habilidades e atividade da comunidade Ligia.
          </p>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 14, marginBottom: 36
        }}>
          <div style={c.statCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                display: "grid", placeItems: "center", width: 36, height: 36,
                borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)"
              }}><Users size={18} /></div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, fontFamily: "var(--font-heading)", letterSpacing: "-.03em" }}>{stats.total}</div>
            <div style={{ color: "var(--muted-2)", fontSize: 11, marginTop: 4 }}>Membros totais</div>
          </div>

          <div style={c.statCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                display: "grid", placeItems: "center", width: 36, height: 36,
                borderRadius: 10, background: "rgba(109,168,124,.15)", color: "#6da87c"
              }}><Activity size={18} /></div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, fontFamily: "var(--font-heading)", letterSpacing: "-.03em" }}>{stats.active}</div>
            <div style={{ color: "var(--muted-2)", fontSize: 11, marginTop: 4 }}>Ativos agora</div>
          </div>

          <div style={c.statCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                display: "grid", placeItems: "center", width: 36, height: 36,
                borderRadius: 10, background: "rgba(107,142,179,.15)", color: "#6b8eb3"
              }}><CircleGauge size={18} /></div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, fontFamily: "var(--font-heading)", letterSpacing: "-.03em" }}>{stats.available}</div>
            <div style={{ color: "var(--muted-2)", fontSize: 11, marginTop: 4 }}>Disponíveis</div>
          </div>

          <div style={c.statCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                display: "grid", placeItems: "center", width: 36, height: 36,
                borderRadius: 10, background: "rgba(196,163,88,.15)", color: "#c4a358"
              }}><BrainCircuit size={18} /></div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, fontFamily: "var(--font-heading)", letterSpacing: "-.03em" }}>{stats.totalSkills}</div>
            <div style={{ color: "var(--muted-2)", fontSize: 11, marginTop: 4 }}>Habilidades únicas</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 36 }}>
          <div style={c.card}>
            <h3 style={c.sectionTitle}><PieChart size={16} style={{ color: "var(--accent)" }} /> Membros por time</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {teamDist.map(([team, count]) => {
                const pct = Math.round((count / stats.total) * 100);
                const colors = teamColors[team] || { bar: "var(--muted)", bg: "var(--surface-2)" };
                return (
                  <div key={team}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{team}</span>
                      <span style={{ color: "var(--muted-2)", fontSize: 11 }}>{count} · {pct}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
                      <div style={{
                        width: `${(count / maxTeamCount) * 100}%`, height: "100%",
                        borderRadius: 999, background: colors.bar,
                        transition: "width .4s ease"
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={c.card}>
            <h3 style={c.sectionTitle}><TrendingUp size={16} style={{ color: "var(--accent)" }} /> Disponibilidade</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                { key: "Available", label: "Disponível", color: "#6da87c" },
                { key: "Limited", label: "Limitado", color: "#c4a358" },
                { key: "Allocated", label: "Alocado", color: "#c76b60" }
              ].map(item => {
                const count = availDist[item.key] || 0;
                const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={item.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{item.label}</span>
                      <span style={{ color: "var(--muted-2)", fontSize: 11 }}>{count} · {pct}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
                      <div style={{
                        width: `${pct}%`, height: "100%", borderRadius: 999,
                        background: item.color, transition: "width .4s ease"
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line-soft)" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(statusDist).map(([status, count]) => {
                  const s = statusColors[status] || { dot: "var(--muted-2)", label: status };
                  return (
                    <span key={status} style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "4px 10px", borderRadius: 999,
                      background: "var(--surface-2)", fontSize: 11
                    }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: s.dot, display: "inline-block"
                      }} />
                      {s.label}: {count}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, marginBottom: 36 }}>
          <div style={c.card}>
            <h3 style={c.sectionTitle}><Award size={16} style={{ color: "var(--accent)" }} /> Habilidades mais frequentes</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {skillRank.slice(0, 10).map(([skill, count]) => {
                const pct = Math.round((count / maxSkillCount) * 100);
                return (
                  <div key={skill} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 80, fontSize: 11, color: "var(--muted)", flexShrink: 0, textAlign: "right" }}>
                      {skill}
                    </span>
                    <div style={{
                      flex: 1, height: 6, borderRadius: 999,
                      background: "var(--surface-2)", overflow: "hidden"
                    }}>
                      <div style={{
                        width: `${pct}%`, height: "100%", borderRadius: 999,
                        background: "var(--accent)", opacity: .7,
                        transition: "width .4s ease"
                      }} />
                    </div>
                    <span style={{ color: "var(--muted-2)", fontSize: 10, width: 24, textAlign: "right" }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={c.card}>
            <h3 style={c.sectionTitle}><GraduationCap size={16} style={{ color: "var(--accent)" }} /> Redes e portfólio</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { icon: GraduationCap, label: "Lattes", count: stats.withLattes, color: "#6b8eb3" },
                { icon: Github, label: "GitHub", count: stats.withGithub, color: "#fff" },
                { icon: Linkedin, label: "LinkedIn", count: people.filter(p => p.linkedin).length, color: "#6b8eb3" },
                { icon: Award, label: "Kaggle", count: people.filter(p => p.kaggle).length, color: "#c4a358" },
                { icon: Building, label: "Vínculo institucional", count: people.filter(p => p.affiliation).length, color: "var(--muted)" }
              ].map(item => {
                const pct = stats.total ? Math.round((item.count / stats.total) * 100) : 0;
                const Icon = item.icon;
                return (
                  <div key={item.label} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 8, background: "var(--surface-2)"
                  }}>
                    <Icon size={14} style={{ color: item.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 11 }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 550 }}>{item.count}</span>
                    <span style={{ color: "var(--muted-2)", fontSize: 10 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={c.card}>
          <h3 style={c.sectionTitle}>
            <Users size={16} style={{ color: "var(--accent)" }} />
            Membros por instituição
          </h3>
          <div style={{ display: "grid", gap: 8 }}>
            {Object.entries(
              people.reduce((acc, p) => {
                const inst = p.affiliation || "Não informado";
                acc[inst] = (acc[inst] || 0) + 1;
                return acc;
              }, {})
            ).sort((a, b) => b[1] - a[1]).map(([inst, count]) => (
              <div key={inst} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 8, background: "var(--surface-2)"
              }}>
                <Building size={14} style={{ color: "var(--muted-2)", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12 }}>{inst}</span>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 22, height: 22, borderRadius: 999,
                  background: "var(--accent-soft)", color: "var(--accent)",
                  fontSize: 11, fontWeight: 600, padding: "0 6px"
                }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
