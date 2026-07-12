import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Toast from "./Toast.jsx";
import { toastState } from "../utils/toast.js";

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false });

  toastState.set = useCallback((message) => {
    setToast({ message, visible: true });
  }, []);

  toastState.close = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <div className="app-shell" style={{
      display: "grid",
      gridTemplateColumns: "var(--sidebar-width) minmax(0, 1fr)",
      minHeight: "100vh"
    }}>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Outlet context={{ menuOpen, setMenuOpen }} />
      <Toast message={toast.message} visible={toast.visible} onClose={toastState.close} />
    </div>
  );
}
