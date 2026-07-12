import { useEffect, useCallback } from "react";
import { CircleCheck } from "lucide-react";

let toastTimer;
export default function Toast({ message, visible, onClose }) {
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

  return (
    <div className="toast" style={{
      position: "fixed", bottom: 28, left: "50%", zIndex: 200,
      display: "flex", alignItems: "center", gap: 9,
      padding: "12px 22px", borderRadius: 9999,
      background: "#272722", color: "var(--text)", fontSize: 12,
      transform: `translateX(-50%) translateY(${visible ? "0" : "16px"})`,
      opacity: visible ? 1 : 0,
      visibility: visible ? "visible" : "hidden",
      transition: "all .26s ease"
    }}>
      <CircleCheck size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
}
