import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadModule, parse } from "libpg-query";

/**
 * As migrações só podem ser aplicadas contra o Supabase do ligia-os, ao qual
 * não temos acesso ainda. O que dá para garantir daqui é que elas são SQL
 * válido pela gramática real do PostgreSQL — isso pega erro de sintaxe, que
 * é a falha mais cara de descobrir com o SQL Editor aberto.
 *
 * O que este teste NÃO garante: que as colunas e funções referenciadas
 * existem. Isso depende do dump do schema.
 */
const DIR = join(process.cwd(), "supabase/migrations");
const arquivos = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const ler = (f: string) => readFileSync(join(DIR, f), "utf8");

/**
 * Remove comentários antes de asserir. Os comentários citam de propósito as
 * construções que a migração EVITA (o trigger em auth.users, p.cohort, os
 * papéis 'mentor'/'diretoria'), então uma asserção ingênua casaria com a
 * explicação em vez do SQL vigente.
 */
const semComentarios = (sql: string) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
const lerLimpo = (f: string) => semComentarios(ler(f));

describe("migrações — sintaxe", () => {
  it("existem migrações para conferir", () => {
    expect(arquivos.length).toBeGreaterThan(0);
  });

  for (const arquivo of arquivos) {
    it(`${arquivo} é SQL válido`, async () => {
      await loadModule();
      const resultado = await parse(ler(arquivo));
      expect(resultado.stmts.length).toBeGreaterThan(0);
    });
  }
});

describe("migrações — invariantes de segurança", () => {
  const nucleo = lerLimpo("0100_learning_core.sql");

  it("não toca em auth.users — um trigger quebrado ali derruba todo cadastro", () => {
    expect(nucleo).not.toMatch(/\bon\s+auth\.users\b/i);
    expect(nucleo).not.toMatch(/create\s+(or\s+replace\s+)?trigger/i);
  });

  it("não cria nem altera public.profiles — a tabela é do ligia-os", () => {
    expect(nucleo).not.toMatch(/create\s+table[^;]*\bprofiles\b/i);
    expect(nucleo).not.toMatch(/alter\s+table\s+(public\.)?profiles/i);
  });

  it("referencia auth.users(id), não profiles(id), nas tabelas de aprendizado", () => {
    // Evita a corrida com a criação client-side do perfil no AuthContext.
    const refs = nucleo.match(/references\s+[a-z_.]+\(id\)/gi) ?? [];
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) expect(r).toMatch(/auth\.users\(id\)/i);
  });

  it("toda tabela de aprendizado tem RLS habilitada", () => {
    for (const t of ["student_progress", "pretest_results", "learning_events", "loop_results"]) {
      expect(nucleo).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`, "i"));
    }
  });

  it("as views usam security_invoker — sem isso vazam dados de todo aluno", () => {
    for (const arquivo of arquivos) {
      const sql = lerLimpo(arquivo);
      const views = sql.match(/create\s+(or\s+replace\s+)?view[\s\S]*?\bas\b/gi) ?? [];
      for (const v of views) expect(v).toMatch(/security_invoker\s*=\s*true/i);
    }
  });

  it("is_learning_staff fala o vocabulário de papéis deste banco", () => {
    expect(nucleo).toMatch(/role\s*=\s*'admin'/);
    // O original testava ('mentor','diretoria'), que não existe aqui — não
    // daria erro, apenas nunca concederia nada.
    expect(nucleo).not.toMatch(/'mentor'|'diretoria'/);
  });

  it("a view de export não seleciona cohort, coluna que não existe aqui", () => {
    expect(nucleo).not.toMatch(/\bp\.cohort\b/);
  });

  it("o limitador de taxa não é acessível pelo cliente", () => {
    const rl = lerLimpo("0101_rate_limit.sql");
    expect(rl).toMatch(/enable row level security/i);
    expect(rl).toMatch(/security definer/i);
    expect(rl).toMatch(/grant execute[\s\S]*to service_role/i);
    // Nenhuma policy em rate_limits = nenhum acesso direto.
    expect(rl).not.toMatch(/create policy[^;]*rate_limits/i);
  });
});
