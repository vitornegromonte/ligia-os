import { beforeEach, it, expect, vi } from "vitest";
import { fetchProfile, fetchProfiles, mapProfile, updateProfile, updateRole } from "../src/services/profiles.js";
const { client } = vi.hoisted(() => ({ client: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock("../src/lib/supabase.js", () => ({ supabase: client }));
vi.mock("../src/services/supabase.js", () => ({ isConfigured: () => true }));
beforeEach(() => vi.clearAllMocks());
it.each(["visitante", "membro", "admin"])("preserves %s and independent classification in mapper", role => {
  expect(mapProfile({ id:"a", name:"A",email:"a@test", role, category:"professor", director_role:"Ensino" })).toMatchObject({ id:"a",name:"A",email:"a@test",role,category:"professor",director_role:"Ensino" });
});
it("does not invent membership for profiles without role", () => expect(mapProfile({ id:"a" }).role).toBeNull());
it("refuses role fields in regular profile updates", async () => {
  await expect(updateProfile("a", { role:"admin" })).rejects.toThrow(); expect(client.from).not.toHaveBeenCalled();
});
it("persists administrative changes through the checked RPC and maps its response", async () => {
  client.rpc.mockReturnValue({ single: () => Promise.resolve({ data: { id:"b", name:"B", role:"membro" } }) });
  await expect(updateRole("b", "membro")).resolves.toMatchObject({ id:"b",role:"membro" });
  expect(client.rpc).toHaveBeenCalledWith("change_profile_role",{target_id:"b",new_role:"membro"});
});
it("propagates administrative authorization errors", async () => {
  client.rpc.mockReturnValue({ single: () => Promise.resolve({ error: {code:"42501"} }) });
  await expect(updateRole("a", "admin")).rejects.toMatchObject({code:"42501"});
});
it("does not replace RLS/network errors with mock profiles", async () => {
  const result = { data:null,error:{code:"42501"} };
  const query = { select:()=>query, eq:()=>query, maybeSingle:()=>Promise.resolve(result), then: callback=>Promise.resolve(result).then(callback) };
  client.from.mockReturnValue(query);
  await expect(fetchProfile("a")).rejects.toMatchObject({code:"42501"});
  await expect(fetchProfiles()).rejects.toMatchObject({code:"42501"});
});
it("keeps profile edits separate from Auth email and returns the canonical mapper", async () => {
  const builder = { update: vi.fn(()=>builder), eq:()=>builder, select:()=>builder, single:()=>Promise.resolve({data:{id:"a",name:"A",role:"visitante",research_interests:"AI"}}) };
  client.from.mockReturnValue(builder);
  await expect(updateProfile("a",{name:"A",email:"spoof@test",research_interests:"AI"})).resolves.toMatchObject({role:"visitante",researchInterests:"AI"});
  expect(builder.update).toHaveBeenCalledWith({name:"A",research_interests:"AI"});
});
