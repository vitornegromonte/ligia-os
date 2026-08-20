import { useEffect, useCallback } from "react";
import { CircleCheck, CircleX } from "lucide-react";

let toastTimer;
const isError = m => typeof m === "string" && m.startsWith("Erro");

export default function Toast({ message, visible, onClose, type }) {
  const isErr = (type != null && type !== "success") || isError(message);

  const close = useCallback(() => {
    clearTimeout(toastTimer);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      clearTimeout(toastTimer);
      toastTimer = setTimeout(close, 2800);
    }
  }, [visible, close]);

  const Icon = isErr ? CircleX : CircleCheck;

  return (
    <div aria-live={isErr ? "assertive" : "polite"} className="toast" style={{
      position: "fixed", bottom: 28, left: "50%", zIndex: 200,
      display: "flex", alignItems: "center", gap: 9,
      padding: "12px 22px", borderRadius: 9999,
      background: "#272722", color: "var(--text)", fontSize: 12,
      transform: `translateX(-50%) translateY(${visible ? "0" : "16px"})`,
      opacity: visible ? 1 : 0,
      visibility: visible ? "visible" : "hidden",
      transition: "all .26s ease"
    }}>
      <Icon size={15} style={{ color: isErr ? "var(--danger, #e56a6a)" : "var(--accent)", flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
}