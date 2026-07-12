import { supabase } from "../lib/supabase.js";
import { isConfigured } from "./supabase.js";
import mockProjects from "../data/projects.js";

function mapProject(p, members = [], milestones = []) {
  return {
    id: p.id,
    name: p.name,
    description: p.description || "",
    status: p.status || "Em andamento",
    icon: p.icon || "sparkles",
    color: p.color || "#6b8eb3",
    progress: p.progress || 0,
    deadline: p.deadline || "",
    members,
    milestones,
  };
}

async function fetchMemberProjectIds(profileId) {
  const { data } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("profile_id", profileId);
  return (data || []).map(r => r.project_id);
}

export async function fetchProjects(profileId = null, role = null) {
  if (!isConfigured()) return mockProjects;

  let query = supabase.from("projects").select("*");

  if (role === "membro" && profileId) {
    const ids = await fetchMemberProjectIds(profileId);
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }

  const { data, error } = await query;

  if (error) {
    console.warn("Failed to fetch projects, falling back to mock:", error.message);
    return mockProjects;
  }

  return (data || []).map(p => mapProject(p));
}

export async function fetchProjectsWithMilestones(profileId = null, role = null) {
  if (!isConfigured()) return mockProjects;

  let projectQuery = supabase.from("projects").select("*");

  if (role === "membro" && profileId) {
    const ids = await fetchMemberProjectIds(profileId);
    if (ids.length === 0) return [];
    projectQuery = projectQuery.in("id", ids);
  }

  const { data: projects, error: projError } = await projectQuery;

  if (projError) {
    console.warn("Failed to fetch projects, falling back to mock:", projError.message);
    return mockProjects;
  }

  const { data: milestones, error: milError } = await supabase
    .from("milestones")
    .select("*");

  if (milError) {
    console.warn("Failed to fetch milestones, falling back to mock:", milError.message);
    return mockProjects;
  }

  const { data: projectMembers } = await supabase
    .from("project_members")
    .select("*") || [];

  const { data: milestoneMembers } = await supabase
    .from("milestone_members")
    .select("*") || [];

  const milsByProject = {};
  (milestones || []).forEach(m => {
    if (!milsByProject[m.project_id]) milsByProject[m.project_id] = [];
    const mm = (milestoneMembers || []).filter(mm => mm.milestone_id === m.id);
    milsByProject[m.project_id].push({
      id: m.id,
      name: m.name,
      description: m.description || "",
      status: m.status,
      members: mm.map(mm => mm.profile_id),
    });
  });

  const membersByProject = {};
  (projectMembers || []).forEach(pm => {
    if (!membersByProject[pm.project_id]) membersByProject[pm.project_id] = [];
    membersByProject[pm.project_id].push(pm.profile_id);
  });

  return (projects || []).map(p =>
    mapProject(p, membersByProject[p.id] || [], milsByProject[p.id] || [])
  );
}

export async function createProject(data) {
  if (!isConfigured()) {
    const p = { id: Date.now().toString(), ...data, milestones: [], members: [] };
    mockProjects.push(p);
    return p;
  }

  const { data: created, error } = await supabase
    .from("projects")
    .insert({
      name: data.name,
      description: data.description || "",
      status: data.status || "Em andamento",
      icon: data.icon || "sparkles",
      color: data.color || "#6b8eb3",
      deadline: data.deadline || null,
      progress: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return mapProject(created);
}

export async function createMilestone(projectId, name, description = "", memberIds = []) {
  if (!isConfigured()) {
    const m = { id: Date.now().toString(), name, description, status: "todo", members: memberIds };
    const proj = mockProjects.find(p => p.id === projectId);
    if (proj) proj.milestones.push(m);
    return m;
  }

  const { data: created, error } = await supabase
    .from("milestones")
    .insert({ project_id: projectId, name, description, status: "todo" })
    .select()
    .single();

  if (error) throw error;

  if (memberIds.length > 0) {
    const rows = memberIds.map(profile_id => ({ milestone_id: created.id, profile_id }));
    const { error: memError } = await supabase
      .from("milestone_members")
      .insert(rows);
    if (memError) console.warn("Failed to assign members:", memError.message);
  }

  return { id: created.id, name, description, status: "todo", members: memberIds };
}

export async function updateMilestone(id, updates) {
  if (!isConfigured()) {
    for (const p of mockProjects) {
      const m = p.milestones.find(ms => ms.id === id);
      if (m) { Object.assign(m, updates); return m; }
    }
    return null;
  }

  const { data, error } = await supabase
    .from("milestones")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return { id: data.id, name: data.name, description: data.description || "", status: data.status, members: [] };
}
