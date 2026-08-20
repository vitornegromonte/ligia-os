import { useEffect, useState } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import MarkdownViewer from "./MarkdownViewer.jsx";
import { showToast } from "../utils/toast.js";

export default function DocModal({ open, title, content, onClose, canEdit, onEdit, onDelete }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setConfirmingDelete(false);
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

  function handleDelete() {
    setConfirmingDelete(true);
  }

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
        overflowY: "auto", border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)", background: "var(--surface)",
        boxShadow: "var(--shadow)"
      }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, padding: "15px 20px",
          borderBottom: "1px solid var(--line-soft)",
          background: "rgba(24,21,18,.92)", backdropFilter: "blur(12px)"
        }}>
          <div style={{
            color: "var(--muted-2)", fontSize: 11, textTransform: "uppercase",
            letterSpacing: ".1em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
          }}>
            {title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {canEdit && !confirmingDelete && (
              <button onClick={onEdit} title="Editar"
                style={{
                  display: "grid", placeItems: "center", width: 30, height: 30,
                  border: 0, borderRadius: 7, color: "var(--muted)",
                  background: "var(--surface-2)", cursor: "pointer"
                }}>
                <Pencil size={14} />
              </button>
            )}
            {canEdit && !confirmingDelete && (
              <button onClick={handleDelete} title="Excluir"
                style={{
                  display: "grid", placeItems: "center", width: 30, height: 30,
                  border: 0, borderRadius: 7, color: "#d47d7d",
                  background: "rgba(201,79,79,.12)", cursor: "pointer"
                }}>
                <Trash2 size={14} />
              </button>
            )}
            {canEdit && confirmingDelete && (
              <>
                <button onClick={() => setConfirmingDelete(false)}
                  style={{
                    height: 30, padding: "0 12px", border: "1px solid var(--line)", borderRadius: 7,
                    color: "var(--muted)", background: "var(--surface)", cursor: "pointer",
                    fontSize: 11, fontWeight: 600, fontFamily: "var(--font-body)"
                  }}>Cancelar</button>
                <button onClick={async () => {
                  try {
                    await onDelete();
                    showToast("Documento excluído");
                  } catch (err) {
                    showToast("Erro: " + err.message);
                  }
                }}
                  style={{
                    height: 30, padding: "0 12px", border: 0, borderRadius: 7,
                    color: "#fff", background: "#c94f4f", cursor: "pointer",
                    fontSize: 11, fontWeight: 600, fontFamily: "var(--font-body)"
                  }}>Confirmar exclusão</button>
              </>
            )}
            <button onClick={onClose}
              style={{
                display: "grid", placeItems: "center", width: 30, height: 30,
                border: 0, borderRadius: 7, color: "var(--muted)",
                background: "var(--surface-2)", cursor: "pointer"
              }}>
              <X size={15} />
            </button>
          </div>
        </div>
        <div style={{ padding: 26 }}>
          <MarkdownViewer content={content} />
        </div>
      </div>
    </div>
  );
}