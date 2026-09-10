import { describe, it, expect } from "vitest";
import {
  progressoDeLinhas,
  linhasDeProgresso,
  loopsDeLinhas,
  linhasDeLoops,
  eventosDeLinhas,
  linhasDeEventos,
  nivelamentoDeLinha,
  linhaDeNivelamento,
  pull,
  push,
  sincronizar,
  type LoopRow,
  type EventRow,
  type PretestRow,
} from "@/lib/sync";
import type { EstadoSincronizavel } from "@/lib/sync-merge";
import type { LoopResult } from "@/lib/loop-progress";
import type { PretestResultV2 } from "@/lib/pretest-storage";

const UID = "11111111-2222-4333-8444-555555555555";

describe("mapeadores de progresso", () => {
  it("ida e volta preserva o mapa", () => {
    const status = { "regressao-linear": "done" as const, atencao: "in-progress" as const };
    const rows = linhasDeProgresso(UID, status);
    expect(rows).toHaveLength(2);
    expect(rows[0].user_id).toBe(UID);
    expect(progressoDeLinhas(rows)).toEqual(status);
  });

  it("mapa vazio não gera linha (evita upsert à toa)", () => {
    expect(linhasDeProgresso(UID, {})).toEqual([]);
  });
});

describe("mapeadores de práticas", () => {
  const loop: LoopResult = {
    at: "2026-08-02T10:00:00.000Z",
    times: 3,
    streak: 2,
    acertei: 4,
    parcial: 1,
    errei: 0,
    total: 5,
  };

  it("ida e volta preserva o placar inteiro", () => {
    const rows = linhasDeLoops(UID, { overfitting: loop });
    expect(rows[0]).toMatchObject({ user_id: UID, concept_id: "overfitting", practiced_at: loop.at });
    expect(loopsDeLinhas(rows as LoopRow[])).toEqual({ overfitting: loop });
  });
});

describe("mapeadores de eventos", () => {
  it("ida e volta preserva id, tipo e instante", () => {
    const evts = [
      { id: UID, at: "2026-08-01T10:00:00.000Z", type: "loop_completed" as const, object: "atencao" },
    ];
    const rows = linhasDeEventos(UID, evts);
    expect(rows[0].occurred_at).toBe(evts[0].at);
    expect(eventosDeLinhas(rows as EventRow[])).toEqual(evts);
  });

  it("data ausente vira null na linha e some de volta (não vira `data: undefined`)", () => {
    const rows = linhasDeEventos(UID, [
      { id: UID, at: "2026-08-01T10:00:00.000Z", type: "loop_completed", object: "x" },
    ]);
    expect(rows[0].data).toBeNull();
    expect(eventosDeLinhas(rows as EventRow[])[0]).not.toHaveProperty("data");
  });

  it("preserva o payload quando existe", () => {
    const rows = linhasDeEventos(UID, [
      { id: UID, at: "2026-08-01T10:00:00.000Z", type: "loop_completed", object: "x", data: { n: 1 } },
    ]);
    expect(eventosDeLinhas(rows as EventRow[])[0].data).toEqual({ n: 1 });
  });
});

describe("mapeadores de nivelamento", () => {
  const n = {
    version: 2,
    contentVersion: "2",
    matriz: { matematica: { score: 100 } },
    resultados: {},
    autoRelato: { ar1: [0] },
    recomendacao: { fronteira: "M1" },
    dispensasConfirmadas: ["M0"],
    ts: "2026-08-02T10:00:00.000Z",
  } as unknown as PretestResultV2;

  it("ida e volta preserva a rodada, inclusive as dispensas confirmadas", () => {
    const row = linhaDeNivelamento(UID, n);
    expect(row.taken_at).toBe(n.ts);
    expect(row.dispensas_confirmadas).toEqual(["M0"]);
    expect(nivelamentoDeLinha(row as unknown as PretestRow)).toEqual(n);
  });

  it("linha ausente devolve null", () => {
    expect(nivelamentoDeLinha(null)).toBeNull();
  });

  it("projeto antigo sem a coluna de dispensas não quebra — vira lista vazia", () => {
    const row = linhaDeNivelamento(UID, n) as Record<string, unknown>;
    delete row.dispensas_confirmadas;
    expect(nivelamentoDeLinha(row as unknown as PretestRow)?.dispensasConfirmadas).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Propagação de erro. O client do Supabase resolve com { data, error } em vez
// de lançar — se o sync não desembrulhar, uma falha total vira "ok: true".
// ---------------------------------------------------------------------------

type Resposta = { data: unknown; error: { message: string } | null };

/** Stub encadeável: todo método devolve o próprio objeto, que é thenable. */
function fakeSupabase(porTabela: Record<string, Resposta>) {
  const chamadas: string[] = [];
  const criar = (tabela: string) => {
    const resposta = porTabela[tabela] ?? { data: [], error: null };
    const chain: Record<string, unknown> = {
      then: (res: (r: Resposta) => unknown) => Promise.resolve(resposta).then(res),
    };
    for (const m of ["select", "eq", "order", "limit", "maybeSingle", "upsert"]) {
      chain[m] = (...args: unknown[]) => {
        if (m === "upsert") chamadas.push(`${tabela}.upsert(${(args[0] as unknown[]).length ?? 1})`);
        return chain;
      };
    }
    return chain;
  };
  return { sb: { from: (t: string) => criar(t) }, chamadas };
}

describe("propagação de erro do Supabase", () => {
  const vazio = {
    progresso: {},
    loops: {},
    eventos: [],
    nivelamento: null,
  } as EstadoSincronizavel;

  it("pull com erro numa tabela lança, dizendo qual", async () => {
    const { sb } = fakeSupabase({
      student_progress: { data: null, error: { message: "permission denied" } },
    });
    await expect(pull(sb as never, UID)).rejects.toThrow(/pull progresso.*permission denied/);
  });

  it("push com erro lança em vez de fingir sucesso", async () => {
    const { sb } = fakeSupabase({
      loop_results: { data: null, error: { message: "relation does not exist" } },
    });
    const estado = { ...vazio, loops: { x: { at: "2026-08-01T00:00:00.000Z", times: 1, streak: 1, acertei: 1, parcial: 0, errei: 0, total: 1 } } };
    await expect(push(sb as never, UID, estado, vazio)).rejects.toThrow(/práticas.*relation does not exist/);
  });

  it("sincronizar devolve ok:false — nunca lança pra UI", async () => {
    const { sb } = fakeSupabase({
      learning_events: { data: null, error: { message: "boom" } },
    });
    const r = await sincronizar(sb as never, UID);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/boom/);
  });

  it("não faz upsert de tabela sem dado (evita ida à rede à toa)", async () => {
    const { sb, chamadas } = fakeSupabase({});
    await push(sb as never, UID, vazio, vazio);
    expect(chamadas).toEqual([]);
  });
});
