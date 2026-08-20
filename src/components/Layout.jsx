import { useState, useCallback, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Toast from "./Toast.jsx";
import SearchModal from "./SearchModal.jsx";
import { toastState } from "../utils/toast.js";
import { registerSearchOpen } from "../utils/searchBus.js";

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState({ message: "", visible: false, type: "success" });
  const [searchOpen, setSearchOpen] = useState(false);

  toastState.set = useCallback((message, type = "success") => {
    setToast({ message, visible: true, type });
  }, []);

  toastState.close = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    registerSearchOpen(() => setSearchOpen(true));
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app-shell" style={{
      display: "grid",
      gridTemplateColumns: "var(--sidebar-width) minmax(0, 1fr)",
      minHeight: "100vh"
    }}>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Outlet context={{ menuOpen, setMenuOpen }} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toast message={toast.message} visible={toast.visible} type={toast.type} onClose={toastState.close} />
    </div>
  );
}
