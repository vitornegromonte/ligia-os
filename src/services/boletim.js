// Boletim Ligia — lê o conteúdo direto do repositório público
// github.com/ligia-ufpe/boletim via raw.githubusercontent.com, do jeito que
// o próprio README desse repositório descreve para um "blogsite" consumir:
// index.json -> metadata.json de cada edição -> texto.md de cada texto.
const RAW_BASE = "https://raw.githubusercontent.com/ligia-ufpe/boletim/main";

const cache = new Map();

async function fetchJSON(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(`${RAW_BASE}/${path}`);
  if (!res.ok) throw new Error(`Falha ao buscar ${path}: ${res.status}`);
  const data = await res.json();
  cache.set(path, data);
  return data;
}

async function fetchRaw(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(`${RAW_BASE}/${path}`);
  if (!res.ok) throw new Error(`Falha ao buscar ${path}: ${res.status}`);
  const data = await res.text();
  cache.set(path, data);
  return data;
}

/**
 * Frontmatter simples (chave: valor), não YAML completo — espelha o parser
 * de scripts/montar_boletim.py no repositório boletim de propósito.
 */
function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { data: {}, body: raw };
  const end = raw.indexOf("---", 3);
  if (end === -1) return { data: {}, body: raw };

  const data = {};
  for (const line of raw.slice(3, end).split("\n")) {
    const trimmed = line.trim();
    const sep = trimmed.indexOf(":");
    if (!trimmed || sep === -1) continue;
    const key = trimmed.slice(0, sep).trim();
    let value = trimmed.slice(sep + 1).trim().replace(/^"(.*)"$/, "$1");
    if (value === "true") value = true;
    else if (value === "false") value = false;
    data[key] = value;
  }

  return { data, body: raw.slice(end + 3).trim() };
}

/** Lista de edições (mais recente primeiro). */
export async function fetchIndex() {
  const { boletins } = await fetchJSON("index.json");
  return [...(boletins || [])].sort((a, b) => b.edicao - a.edicao);
}

export async function fetchEdicaoMetadata(path) {
  return fetchJSON(`${path}/metadata.json`);
}

export async function fetchTexto(path, slug) {
  const raw = await fetchRaw(`${path}/${slug}/texto.md`);
  const { data, body } = parseFrontmatter(raw);
  return {
    slug,
    titulo: data.titulo || slug,
    autor: data.autor || "",
    autorUrl: data.autor_url || "",
    colunaConvidado: data.coluna_convidado === true,
    pendente: data.pendente === true,
    minibio: data.minibio || "",
    fonte: data.fonte || "",
    imagem: data.imagem || "",
    corpo: body,
  };
}

/** Edição completa: metadata + textos publicados (textos com `pendente: true` ficam de fora). */
export async function fetchEdicaoCompleta(path) {
  const metadata = await fetchEdicaoMetadata(path);
  const textos = await Promise.all((metadata.textos || []).map(slug => fetchTexto(path, slug)));
  return { ...metadata, path, textos: textos.filter(t => !t.pendente) };
}

/** Todas as edições, mais recente primeiro, já com os textos carregados. */
export async function fetchTodasEdicoes() {
  const index = await fetchIndex();
  return Promise.all(index.map(({ path }) => fetchEdicaoCompleta(path)));
}
