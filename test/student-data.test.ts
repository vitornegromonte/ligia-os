import { describe, it, expect } from "vitest";
import {
  SCHEMA_VERSION,
  montarExport,
  StudentDataExportSchema,
} from "@/lib/student-data";
import type { PretestResultV2 } from "@/lib/pretest-storage";
import type { LearningEvent } from "@/lib/events";
import type { LoopResult } from "@/lib/loop-progress";
import { emptyMatrix } from "./helpers/matriz";

const AGORA = "2026-08-01T12:00:00.000Z";

const pretest = (): PretestResultV2 => ({
  version: 2,
  contentVersion: "2",
  matriz: emptyMatrix({ matematica: 100, "ml-classico": 62.5 }),
  resultados: { "n-matematica-1": "acerto", "n-ml-classico-4": "nao-sei" },
  autoRelato: { ar1: [0, 1] },
  recomendacao: {
    fronteira: "M1",
    estados: {
      matematica: "dispensavel",
      "ml-classico": "revisao-dirigida",
      "dl-fundamentos": "comecar-aqui",
      "dl-aplicado": "comecar-aqui",
      "transformers-llms": "comecar-aqui",
    },
    starNodes: ["regularizacao"],
    dispensaveisSugeridos: [
      { modulo: "M0", competencia: "matematica", sugestao: "pre-marcada", conceitosFracos: [] },
    ],
    mensagem: "Matemática em dia!",
  },
  dispensasConfirmadas: ["M0"],
  ts: AGORA,
});

const evento = (over: Partial<LearningEvent> = {}): LearningEvent => ({
  id: "e1",
  at: AGORA,
  type: "node_status_changed",
  object: "regressao-linear",
  ...over,
});

const loop = (over: Partial<LoopResult> = {}): LoopResult => ({
  at: AGORA,
  times: 2,
  streak: 1,
  acertei: 3,
  parcial: 1,
  errei: 0,
  total: 4,
  ...over,
});

describe("montarExport — contrato", () => {
  it("valida contra o próprio schema (o contrato é a view externa)", () => {
    const e = montarExport({
      pretest: pretest(),
      progress: { "regressao-linear": "done" },
      loops: { overfitting: loop() },
      events: [evento()],
      now: AGORA,
    });
    expect(() => StudentDataExportSchema.parse(e)).not.toThrow();
    expect(e.schema_version).toBe(SCHEMA_VERSION);
    expect(e.exported_at).toBe(AGORA);
  });

  it("é coerente com aluno anônimo e storages vazios", () => {
    const e = montarExport({ pretest: null, progress: {}, loops: {}, events: [], now: AGORA });
    expect(e.identity).toEqual({ user_id: null, email: null });
    expect(e.pretest).toBeNull();
    expect(e.progress).toEqual([]);
    expect(e.loops).toEqual([]);
    expect(e.events).toEqual([]);
    expect(e.resumo.nos_concluidos).toBe(0);
    expect(e.resumo.conceitos_praticados).toBe(0);
    for (const v of Object.values(e.resumo.por_competencia)) {
      expect(v).toEqual({ score: null, estado: null });
    }
  });

  it("usa arrays nas coleções (ingestão externa: JSONL/SQL, não mapa)", () => {
    const e = montarExport({
      pretest: null,
      progress: { a: "done", b: "in-progress" },
      loops: { c: loop() },
      events: [],
      now: AGORA,
    });
    expect(Array.isArray(e.progress)).toBe(true);
    expect(e.progress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ node_id: "a", status: "done" }),
        expect.objectContaining({ node_id: "b", status: "in-progress" }),
      ]),
    );
    expect(e.loops[0]).toMatchObject({ concept_id: "c", times: 2, streak: 1 });
  });
});

describe("montarExport — timestamps do progresso", () => {
  it("deriva `at` do evento node_status_changed mais recente do nó", () => {
    const e = montarExport({
      pretest: null,
      progress: { "regressao-linear": "done" },
      loops: {},
      events: [
        evento({ id: "e1", at: "2026-07-01T10:00:00.000Z" }),
        evento({ id: "e2", at: "2026-07-20T10:00:00.000Z" }),
      ],
      now: AGORA,
    });
    expect(e.progress[0].at).toBe("2026-07-20T10:00:00.000Z");
  });

  it("marca `at: null` no progresso anterior ao event log (legado honesto)", () => {
    const e = montarExport({
      pretest: null,
      progress: { "knn": "done" },
      loops: {},
      events: [evento({ object: "outro-no" })],
      now: AGORA,
    });
    expect(e.progress[0].at).toBeNull();
  });
});

describe("montarExport — resumo derivado", () => {
  it("resume score e estado por competência a partir do pretest", () => {
    const e = montarExport({
      pretest: pretest(),
      progress: {},
      loops: {},
      events: [],
      now: AGORA,
    });
    expect(e.resumo.por_competencia.matematica).toEqual({ score: 100, estado: "dispensavel" });
    expect(e.resumo.por_competencia["ml-classico"]).toEqual({
      score: 62.5,
      estado: "revisao-dirigida",
    });
  });

  it("conta nós concluídos (só done) e conceitos praticados", () => {
    const e = montarExport({
      pretest: null,
      progress: { a: "done", b: "in-progress", c: "done" },
      loops: { x: loop(), y: loop() },
      events: [],
      now: AGORA,
    });
    expect(e.resumo.nos_concluidos).toBe(2);
    expect(e.resumo.conceitos_praticados).toBe(2);
  });
});
