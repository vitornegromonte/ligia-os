import { supabase } from "../lib/supabase.js";
import { isConfigured } from "./supabase.js";
import mockPeople from "../data/people.js";

function mapProfile(p) {
  return {
    id: p.id,
    name: p.name,
    initials: p.initials || p.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
    email: p.email,
    team: p.team || "Geral",
    discipline: p.discipline || p.team || "Geral",
    skills: p.skills || [],
    project: p.project || "",
    affiliation: p.affiliation || "",
    availability: p.capacity ? "Available" : "Available",
    capacity: p.capacity || "Disponível",
    researchInterests: p.research_interests || "",
    color: p.color || "#b7c2d2",
    lattes: p.lattes || "",
    github: p.github || "",
    linkedin: p.linkedin || "",
    kaggle: p.kaggle || "",
    cv: p.cv || "",
    bio: p.bio || "",
    history: p.history || [],
    avatar_url: p.avatar_url || "",
  };
}

export async function fetchProfiles() {
  if (!isConfigured()) return mockPeople;

  const { data, error } = await supabase
    .from("profiles")
    .select("*");

  if (error) {
    console.warn("Failed to fetch profiles, falling back to mock:", error.message);
    return mockPeople;
  }

  return (data || []).map(mapProfile);
}

export async function fetchProfile(id) {
  if (!isConfigured()) return mockPeople.find(p => p.id === id) || null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.warn("Failed to fetch profile, falling back to mock:", error?.message);
    return mockPeople.find(p => p.id === id) || null;
  }

  return mapProfile(data);
}

export async function createProfile(profile) {
  if (!isConfigured()) {
    const newMock = { id: Date.now(), ...profile };
    mockPeople.push(newMock);
    return newMock;
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: profile.id,
      name: profile.name,
      initials: profile.initials,
      email: profile.email,
      role: profile.role || "visitante",
      team: profile.team,
      discipline: profile.discipline,
      skills: profile.skills,
      project: profile.project,
      affiliation: profile.affiliation,
      capacity: profile.capacity,
      research_interests: profile.researchInterests,
      color: profile.color,
      lattes: profile.lattes,
      github: profile.github,
      linkedin: profile.linkedin,
      kaggle: profile.kaggle,
      cv: profile.cv,
      bio: profile.bio,
      history: profile.history || [],
    })
    .select()
    .single();

  if (error) throw error;
  return mapProfile(data);
}

export async function updateProfile(id, updates) {
  if (!isConfigured()) {
    const idx = mockPeople.findIndex(p => p.id === id);
    if (idx >= 0) {
      const mapped = { ...mockPeople[idx] };
      if (updates.skills !== undefined) mapped.skills = updates.skills;
      if (updates.bio !== undefined) mapped.bio = updates.bio;
      if (updates.team !== undefined) mapped.team = updates.team;
      if (updates.affiliation !== undefined) mapped.affiliation = updates.affiliation;
      if (updates.lattes !== undefined) mapped.lattes = updates.lattes;
      if (updates.github !== undefined) mapped.github = updates.github;
      if (updates.linkedin !== undefined) mapped.linkedin = updates.linkedin;
      if (updates.kaggle !== undefined) mapped.kaggle = updates.kaggle;
      if (updates.cv !== undefined) mapped.cv = updates.cv;
      if (updates.name !== undefined) mapped.name = updates.name;
      if (updates.research_interests !== undefined) mapped.researchInterests = updates.research_interests;
      if (updates.project !== undefined) mapped.project = updates.project;
      if (updates.capacity !== undefined) mapped.capacity = updates.capacity;
      if (updates.history !== undefined) mapped.history = updates.history;
      if (updates.initials !== undefined) mapped.initials = updates.initials;
      if (updates.discipline !== undefined) mapped.discipline = updates.discipline;
      if (updates.color !== undefined) mapped.color = updates.color;
      mockPeople[idx] = mapped;
      return mapped;
    }
    return null;
  }

  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.initials !== undefined) dbUpdates.initials = updates.initials;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.team !== undefined) dbUpdates.team = updates.team;
  if (updates.discipline !== undefined) dbUpdates.discipline = updates.discipline;
  if (updates.skills !== undefined) dbUpdates.skills = updates.skills;
  if (updates.project !== undefined) dbUpdates.project = updates.project;
  if (updates.affiliation !== undefined) dbUpdates.affiliation = updates.affiliation;
  if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity;
  if (updates.research_interests !== undefined) dbUpdates.research_interests = updates.research_interests;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.lattes !== undefined) dbUpdates.lattes = updates.lattes;
  if (updates.github !== undefined) dbUpdates.github = updates.github;
  if (updates.linkedin !== undefined) dbUpdates.linkedin = updates.linkedin;
  if (updates.kaggle !== undefined) dbUpdates.kaggle = updates.kaggle;
  if (updates.cv !== undefined) dbUpdates.cv = updates.cv;
  if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
  if (updates.history !== undefined) dbUpdates.history = updates.history;

  const { data, error } = await supabase
    .from("profiles")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
