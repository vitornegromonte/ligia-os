import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
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
const Styleguide = lazy(() => import("./pages/aprender/Styleguide.jsx"));
const Trilha = lazy(() => import("./aprender/Trilha.jsx"));
const Nivelamento = lazy(() => import("./aprender/Nivelamento.jsx"));
const Licao = lazy(() => import("./aprender/Licao.jsx"));
const Praticar = lazy(() => import("./aprender/Praticar.jsx"));
const Codar = lazy(() => import("./aprender/Codar.jsx"));
const CodarDetalhe = lazy(() => import("./aprender/CodarDetalhe.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

const fallback = (
  <div style={{
    minHeight: "100vh", background: "var(--bg)"
  }} />
);

/** Preserva o slug ao redirecionar /pratica/:slug para o endereço novo. */
function RedirecionaPratica() {
  const { slug } = useParams();
  return <Navigate to={`/aprender/codar/${slug}`} replace />;
}

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
            {/* Endereços antigos: os links já compartilhados continuam vivos. */}
            <Route path="/pratica" element={<Navigate to="/aprender/codar" replace />} />
            <Route path="/pratica/:slug" element={<RedirecionaPratica />} />
            {/* Área de aprendizado: acesso geral. Qualquer papel entra —
                visitante, membro ou admin —, porque estudar não é privilégio. */}
            <Route path="/aprender" element={<Trilha />} />
            <Route path="/aprender/nivelamento" element={<Nivelamento />} />
            <Route path="/aprender/c/:conceptId" element={<Licao />} />
            <Route path="/aprender/c/:conceptId/praticar" element={<Praticar />} />
            <Route path="/aprender/codar" element={<Codar />} />
            <Route path="/aprender/codar/:slug" element={<CodarDetalhe />} />
            <Route path="/aprender/styleguide" element={<Styleguide />} />
            {/* Catch-all: antes um endereço desconhecido renderizava tela em branco. */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
