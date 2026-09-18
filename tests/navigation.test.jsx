import { beforeEach, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "../src/components/Sidebar.jsx";
const { auth, toast } = vi.hoisted(() => ({ auth: {}, toast:vi.fn() }));
vi.mock("../src/contexts/AuthContext.jsx",()=>({ useAuth:()=>auth }));
vi.mock("../src/components/ProfileEdit.jsx",()=>({ default:()=>null }));
vi.mock("../src/utils/toast.js",()=>({showToast:toast}));
beforeEach(()=>{ auth.signOut=vi.fn().mockResolvedValue(); });
function setup(role) {
  auth.profile={id:"a",name:"Account",role};
  return render(<MemoryRouter><Sidebar open onClose={()=>{}} /></MemoryRouter>);
}
it("visitor navigation does not expose internal destinations",()=>{
  setup("visitante");
  expect(screen.getByRole("link",{name:"Perfil"})).toHaveAttribute("href","/perfil");
  expect(screen.queryByRole("link",{name:"Projetos"})).not.toBeInTheDocument();
  expect(screen.queryByRole("link",{name:"Prática Torch"})).not.toBeInTheDocument();
  expect(screen.queryByRole("link",{name:"Membros"})).not.toBeInTheDocument();
});
it.each(["membro","admin"])("shows appropriate internal navigation to %s",role=>{
  setup(role);
  expect(screen.getByRole("link",{name:"Projetos"})).toBeInTheDocument();
  expect(screen.getByRole("link",{name:role === "admin" ? "Gestão de membros" : "Membros"})).toBeInTheDocument();
});
it("reports logout failure instead of silently pretending it succeeded",async()=>{
  setup("membro"); auth.signOut.mockRejectedValue(new Error("offline"));
  fireEvent.click(screen.getByRole("button",{name:"Sair"}));
  await waitFor(()=>expect(toast).toHaveBeenCalledWith("Não foi possível sair. Tente novamente.","error"));
});
