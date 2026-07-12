import { useEffect } from "react";
import { X } from "lucide-react";
import MarkdownViewer from "./MarkdownViewer.jsx";

export default function DocModal({ open, title, content, onClose }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        background: "rgba(5,5,4,.72)", backdropFilter: "blur(9px)"
      }}>
      <div style={{
        width: "min(760px, 100%)", maxHeight: "min(860px, 92vh)",
        overflowY: "auto", border: "1px solid #37362f",
        borderRadius: 18, background: "#181815",
        boxShadow: "var(--shadow)"
      }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "15px 20px",
          borderBottom: "1px solid var(--line-soft)",
          background: "rgba(24,24,21,.92)", backdropFilter: "blur(12px)"
        }}>
          <div style={{ color: "var(--muted-2)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>
            {title}
          </div>
          <button onClick={onClose}
            style={{
              display: "grid", placeItems: "center", width: 30, height: 30,
              border: 0, borderRadius: 7, color: "var(--muted)",
              background: "var(--surface-2)", cursor: "pointer"
            }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: 26 }}>
          <MarkdownViewer content={content} />
        </div>
      </div>
    </div>
  );
}
