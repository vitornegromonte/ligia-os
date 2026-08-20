const STOP = new Set([
  "a","e","o","ou","de","da","do","em","um","uma","as","os","na","no","com","que","dos","das",
  "para","pela","pelo","ser","sua","seu","nas","nos","vai","ter","mais","menos","etc","perfil",
  "sobre","cargo","trabalhar","candidato","candidata","vaga","requisitos","experiencia","fazer",
  "ativo","conhecimentos","sou","atuar","desejavel","diferencial","beneficios"
]);

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s+#]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1);
}

function buildCorpus(person) {
  const parts = [
    person.name, person.team, person.discipline, person.project, person.affiliation,
    person.researchInterests, person.bio,
    (person.skills || []).join(" "),
    (person.history || []).map(h => h.join(" ")).join(" "),
    person.resume_text,
  ];
  return new Set(tokenize(parts.join(" ")).filter(t => !STOP.has(t)));
}

// Mock de ATS: dado o texto de uma vaga, ranqueia os membros pelo
// percentual de palavras-chave da vaga presentes no currículo deles.
export function matchJob(people, jobText) {
  const tokens = tokenize(jobText).filter(t => !STOP.has(t));
  if (tokens.length === 0) return [];

  return people
    .map(person => {
      const corpus = buildCorpus(person);
      const matched = tokens.filter(t => corpus.has(t));
      const raw = Math.round((matched.length / tokens.length) * 100);
      let score = Math.min(100, raw);
      if (person.availability === "Allocated") score = Math.round(score * 0.8);
      if (person.availability === "Limited") score = Math.round(score * 0.92);
      return { person, matched, score, total: tokens.length };
    })
    .sort((a, b) => b.score - a.score);
}