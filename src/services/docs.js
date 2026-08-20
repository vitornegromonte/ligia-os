import { supabase } from "../lib/supabase.js";
import { isConfigured } from "./supabase.js";
import {
  guides as mockGuides,
  researchDocs as mockResearchDocs,
  projectDocs as mockProjectDocs
} from "../data/docs.js";

export async function fetchProjectDocs() {
  if (!isConfigured()) return mockProjectDocs;

  const { data: projects, error: projError } = await supabase
    .from("projects")
    .select("*");

  if (projError) {
    console.warn("Failed to fetch project docs, falling back to mock:", projError.message);
    return mockProjectDocs;
  }

  const { data: docs, error: docsError } = await supabase
    .from("project_docs")
    .select("*");

  if (docsError) {
    console.warn("Failed to fetch docs, falling back to mock:", docsError.message);
    return mockProjectDocs;
  }

  const docsByProject = {};
  (docs || []).forEach(d => {
    if (!docsByProject[d.project_id]) docsByProject[d.project_id] = [];
    docsByProject[d.project_id].push({
      id: d.id,
      title: d.title,
      category: d.category || "geral",
      content: d.content || "",
    });
  });

  return (projects || []).map(p => ({
    id: p.id,
    title: p.name,
    icon: p.icon ? p.icon.charAt(0).toUpperCase() + p.icon.slice(1) : "FileText",
    docs: docsByProject[p.id] || [],
  }));
}

export async function fetchGuides() {
  if (!isConfigured()) return mockGuides;

  const { data, error } = await supabase
    .from("guides")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Failed to fetch guides, falling back to mock:", error.message);
    return mockGuides;
  }

  if (!data || data.length === 0) return mockGuides;

  return data.map(g => ({
    id: g.id,
    title: g.title,
    icon: g.icon || "BookOpen",
    category: g.category || "",
    updated: g.updated || "",
    readTime: g.read_time || "",
    content: g.content || "",
  }));
}

export async function fetchResearchDocs() {
  if (!isConfigured()) return mockResearchDocs;

  const { data, error } = await supabase
    .from("research_docs")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Failed to fetch research docs, falling back to mock:", error.message);
    return mockResearchDocs;
  }

  if (!data || data.length === 0) return mockResearchDocs;

  return data.map(r => ({
    id: r.id,
    title: r.title,
    icon: r.icon || "Microscope",
    area: r.area || "",
    updated: r.updated || "",
    readTime: r.read_time || "",
    content: r.content || "",
  }));
}

export async function createGuide(data) {
  if (!isConfigured()) {
    const g = { id: Date.now().toString(), ...data };
    mockGuides.push(g);
    return g;
  }

  const { data: created, error } = await supabase
    .from("guides")
    .insert({
      title: data.title,
      icon: data.icon || "BookOpen",
      category: data.category || "",
      updated: data.updated || new Date().toLocaleDateString("pt-BR"),
      read_time: data.readTime || "",
      content: data.content || "",
    })
    .select()
    .single();

  if (error) throw error;
  return { ...created, readTime: created.read_time, read_time: undefined };
}

export async function createResearchDoc(data) {
  if (!isConfigured()) {
    const r = { id: Date.now().toString(), ...data };
    mockResearchDocs.push(r);
    return r;
  }

  const { data: created, error } = await supabase
    .from("research_docs")
    .insert({
      title: data.title,
      icon: data.icon || "Microscope",
      area: data.area || "",
      updated: data.updated || new Date().toLocaleDateString("pt-BR"),
      read_time: data.readTime || "",
      content: data.content || "",
    })
    .select()
    .single();

  if (error) throw error;
  return { ...created, readTime: created.read_time, read_time: undefined };
}

export async function createProjectDoc(data) {
  if (!isConfigured()) {
    const d = { id: Date.now().toString(), ...data };
    const proj = mockProjectDocs.find(p => p.id === data.project_id);
    if (proj) proj.docs.push(d);
    return d;
  }

  const { data: created, error } = await supabase
    .from("project_docs")
    .insert({
      project_id: data.project_id,
      title: data.title,
      category: data.category || "geral",
      icon: data.icon || "FileText",
      content: data.content || "",
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}

export async function updateGuide(id, data) {
  if (!isConfigured()) {
    const g = mockGuides.find(x => x.id === id);
    if (g) Object.assign(g, data);
    return g;
  }

  const { data: updated, error } = await supabase
    .from("guides")
    .update({
      title: data.title,
      icon: data.icon || "BookOpen",
      category: data.category || "",
      updated: data.updated || new Date().toLocaleDateString("pt-BR"),
      read_time: data.readTime || "",
      content: data.content || "",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return { ...updated, readTime: updated.read_time, read_time: undefined };
}

export async function updateResearchDoc(id, data) {
  if (!isConfigured()) {
    const r = mockResearchDocs.find(x => x.id === id);
    if (r) Object.assign(r, data);
    return r;
  }

  const { data: updated, error } = await supabase
    .from("research_docs")
    .update({
      title: data.title,
      icon: data.icon || "Microscope",
      area: data.area || "",
      updated: data.updated || new Date().toLocaleDateString("pt-BR"),
      read_time: data.readTime || "",
      content: data.content || "",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return { ...updated, readTime: updated.read_time, read_time: undefined };
}

export async function updateProjectDoc(id, data) {
  if (!isConfigured()) {
    for (const p of mockProjectDocs) {
      const d = p.docs.find(x => x.id === id);
      if (d) Object.assign(d, data);
    }
    return { id, ...data };
  }

  const { data: updated, error } = await supabase
    .from("project_docs")
    .update({
      title: data.title,
      category: data.category || "geral",
      icon: data.icon || "FileText",
      content: data.content || "",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

export async function deleteGuide(id) {
  if (!isConfigured()) {
    const idx = mockGuides.findIndex(x => x.id === id);
    if (idx >= 0) mockGuides.splice(idx, 1);
    return { id };
  }

  const { error } = await supabase.from("guides").delete().eq("id", id);
  if (error) throw error;
  return { id };
}

export async function deleteResearchDoc(id) {
  if (!isConfigured()) {
    const idx = mockResearchDocs.findIndex(x => x.id === id);
    if (idx >= 0) mockResearchDocs.splice(idx, 1);
    return { id };
  }

  const { error } = await supabase.from("research_docs").delete().eq("id", id);
  if (error) throw error;
  return { id };
}

export async function deleteProjectDoc(id) {
  if (!isConfigured()) {
    for (const p of mockProjectDocs) {
      const idx = p.docs.findIndex(d => d.id === id);
      if (idx >= 0) p.docs.splice(idx, 1);
    }
    return { id };
  }

  const { error } = await supabase.from("project_docs").delete().eq("id", id);
  if (error) throw error;
  return { id };
}
