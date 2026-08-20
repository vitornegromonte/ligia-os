import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Zap, CalendarClock, UserPlus, FileText, MessageCircle } from "lucide-react";
import { fetchNotifications, markNotificationsRead, markAllNotificationsRead } from "../services/notifications.js";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { formatDate } from "./db/helpers.jsx";

const typeIcon = {
  mention: { icon: MessageCircle, color: "#c4a358" },
  task: { icon: Zap, color: "#6da87c" },
  milestone: { icon: CheckCheck, color: "#6b8eb3" },
  event: { icon: CalendarClock, color: "#c4a358" },
  member: { icon: UserPlus, color: "#6da87c" },
  doc: { icon: FileText, color: "#6b8eb3" },
};

export default function NotificationsBell() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!profile?.id) return;
    fetchNotifications(profile.id).then(setItems).catch(() => {});
    if (!import.meta.env.VITE_SUPABASE_URL) return;
    let sub;
    try {
      sub = supabase
        .channel("notif-" + profile.id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${profile.id}` }, () => {
          fetchNotifications(profile.id).then(setItems).catch(() => {});
        })
        .subscribe();
    } catch (e) { /* não configurado */ }
    return () => {
      if (sub) sub.unsubscribe();
    };
  }, [profile?.id]);

  useEffect(() => {
    const onDoc = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const unread = items.filter(i => !i.read).length;

  function openPanel() {
    setOpen(o => !o);
    if (!open && unread > 0) {
      markNotificationsRead(items.filter(i => !i.read).map(i => i.id)).catch(() => {});
      setItems(prev => prev.map(i => ({ ...i, read: true })));
    }
  }

  function go(n) {
    if (n.link) navigate(n.link);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={openPanel} aria-label="Notificações"
        style={{
          position: "relative", display: "grid", placeItems: "center",
          width: 32, height: 32, border: 0, borderRadius: 9,
          color: open ? "var(--text)" : "var(--muted)", background: "transparent", cursor: "pointer"
        }}>
        <Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            minWidth: 16, height: 16, display: "grid", placeItems: "center",
            padding: "0 4px", borderRadius: 9999, fontSize: 9, fontWeight: 700,
            color: "#fff", background: "var(--accent)"
          }}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: 40, zIndex: 130,
          width: 340, maxWidth: "calc(100vw - 32px)",
          border: "1px solid #37362f", borderRadius: 14, background: "#1c1c19",
          boxShadow: "var(--shadow)", overflow: "hidden"
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderBottom: "1px solid var(--line-soft)"
          }}>
            <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>Notificações</span>
            {unread > 0 && (
              <button onClick={() => {
                markAllNotificationsRead(profile?.id).catch(() => {});
                setItems(prev => prev.map(i => ({ ...i, read: true })));
              }} style={{
                display: "inline-flex", alignItems: "center", gap: 5, border: 0,
                background: "none", color: "var(--accent)", cursor: "pointer",
                fontSize: 11, fontFamily: "var(--font-body)"
              }}>
                <CheckCheck size={13} /> marcar todas
              </button>
            )}
          </div>
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {items.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted-2)", fontSize: 12 }}>
                Nenhuma notificação
              </div>
            )}
            {items.map(n => {
              const t = typeIcon[n.type] || { icon: Bell, color: "var(--muted)" };
              return (
                <button key={n.id} onClick={() => go(n)} style={{
                  display: "flex", alignItems: "flex-start", gap: 11, width: "100%",
                  padding: "12px 16px", border: 0, borderBottom: "1px solid var(--line-soft)",
                  background: n.read ? "transparent" : "rgba(255,75,31,.045)",
                  cursor: "pointer", textAlign: "left", fontFamily: "var(--font-body)"
                }}>
                  <span style={{
                    width: 30, height: 30, flex: "0 0 auto", display: "grid", placeItems: "center",
                    borderRadius: 9, background: "var(--surface)", color: t.color
                  }}>
                    <t.icon size={15} />
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", color: "var(--text)", fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 }}>
                      {n.title}
                    </span>
                    {n.body && (
                      <span style={{ display: "block", color: "var(--muted)", fontSize: 11.5, lineHeight: 1.5, marginTop: 2 }}>
                        {n.body}
                      </span>
                    )}
                    <span style={{ display: "block", color: "var(--muted-2)", fontSize: 10, marginTop: 5 }}>
                      {formatDate(n.created_at)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}