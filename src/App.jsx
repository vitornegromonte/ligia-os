import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));
const Landing = lazy(() => import("./pages/Landing.jsx"));
const ProcessoSeletivo = lazy(() => import("./pages/ProcessoSeletivo.jsx"));
const Home = lazy(() => import("./pages/Home.jsx"));
const TalentBank = lazy(() => import("./pages/TalentBank.jsx"));
const Documentation = lazy(() => import("./pages/Documentation.jsx"));
const Certificates = lazy(() => import("./pages/Certificates.jsx"));
const ProjectView = lazy(() => import("./pages/ProjectView.jsx"));
const ProjectManagement = lazy(() => import("./pages/ProjectManagement.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const MyDay = lazy(() => import("./pages/MyDay.jsx"));
const Agenda = lazy(() => import("./pages/Agenda.jsx"));
const Notas = lazy(() => import("./pages/Notas.jsx"));

const fallback = (
  <div style={{
    minHeight: "100vh", background: "var(--bg)"
  }} />
);

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={fallback}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/processo-seletivo" element={<ProcessoSeletivo />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/inicio" element={<Home />} />
            <Route path="/dia" element={<MyDay />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/notas" element={<Notas />} />
            <Route path="/membros" element={<TalentBank />} />
            <Route path="/docs" element={<Documentation />} />
            <Route path="/certificados" element={<Certificates />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projetos" element={<ProjectManagement />} />
            <Route path="/projetos/:projectId" element={<ProjectView />} />
            <Route path="/projetos/:projectId/:docId" element={<ProjectView />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
