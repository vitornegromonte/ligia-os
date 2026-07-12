import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import TalentBank from "./pages/TalentBank.jsx";
import Documentation from "./pages/Documentation.jsx";
import Certificates from "./pages/Certificates.jsx";
import ProjectView from "./pages/ProjectView.jsx";
import ProjectManagement from "./pages/ProjectManagement.jsx";
import Dashboard from "./pages/Dashboard.jsx";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="/" element={<Home />} />
          <Route path="/talentos" element={<TalentBank />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="/certificados" element={<Certificates />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projetos" element={<ProjectManagement />} />
          <Route path="/projetos/:projectId" element={<ProjectView />} />
          <Route path="/projetos/:projectId/:docId" element={<ProjectView />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
