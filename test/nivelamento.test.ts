import { describe, it, expect } from "vitest";
import { COMPETENCIAS, competenciaDoModulo } from "@/lib/competencias";
import type { CompetenciaId } from "@/lib/competencias";
import {
  avaliarEtapa2,
  COLAB_BONUS,
  MENSAGEM_A_CONFIRMAR,
  MENSAGENS_FRONTEIRA,
  PRIOR_BOOST,
  recomendar,
  scoreCompetencias,
} from "@/lib/nivelamento";
import type {
  QuestaoNivelamento,
  ResultadoEtapa2,
  ResultadoQuestao,
} from "@/lib/nivelamento";

// ---------------------------------------------------------------------------
// Fixtures sintéticas — a engine não conhece o conteúdo real; aqui montamos
// questões mínimas com o mesmo formato (4/competência como no conteúdo real,
// mais casos com N≠4 pra garantir que nada assume N=4).
// ---------------------------------------------------------------------------

function q(
  id: string,
  competencia: CompetenciaId,
  dificuldade: 1 | 2 | 3,
  conceitos: string[],
  etapa: 1 | 2 = 1,
): QuestaoNivelamento {
  return { id, competencia, dificuldade, conceitos, etapa };
}

/** Etapa 2 aprovada (ou não) sem precisar montar questões — pros testes de recomendar. */
function etapa2Feita(aprovada: boolean, conceitosFracos: string[] = []): ResultadoEtapa2 {
  return { aprovada, mcqScoreAcumulado: aprovada ? 100 : 50, acertos: 0, total: 8, conceitosFracos };
}

/** Todas as competências dadas aprovadas na etapa 2. */
function aprovadas(...ids: CompetenciaId[]): Partial<Record<CompetenciaId, ResultadoEtapa2>> {
  return Object.fromEntries(ids.map((id) => [id, etapa2Feita(true)]));
}

/** 4 questões da competência com as dificuldades dadas; 1 conceito único por questão. */
function quarteto(
  competencia: CompetenciaId,
  difs: (1 | 2 | 3)[] = [1, 2, 2, 3],
): QuestaoNivelamento[] {
  return difs.map((d, i) =>
    q(`${competencia}-q${i + 1}`, competencia, d, [`${competencia}-c${i + 1}`]),
  );
}

/** Resultados por posição: padroes[i] vale pra questões[i]. */
function resultadosDe(
  questoes: QuestaoNivelamento[],
  padroes: ResultadoQuestao[],
): Record<string, ResultadoQuestao> {
  const r: Record<string, ResultadoQuestao> = {};
  questoes.forEach((questao, i) => {
    r[questao.id] = padroes[i];
  });
  return r;
}

/**
 * Bateria completa: 4 questões de dificuldade 1 por competência listada em
 * `acertosPor` (as primeiras N acertam, o resto erra). Competência ausente
 * do mapa fica sem questões (→ sem-evidencia). Com pesos iguais, k/4 acertos
 * dá mcqScore = k×25 — fácil de raciocinar nos testes de recomendação.
 */
function bateria(acertosPor: Partial<Record<CompetenciaId, number>>): {
  questoes: QuestaoNivelamento[];
  resultados: Record<string, ResultadoQuestao>;
} {
  const questoes: QuestaoNivelamento[] = [];
  const resultados: Record<string, ResultadoQuestao> = {};
  for (const { id } of COMPETENCIAS) {
    const alvo = acertosPor[id];
    if (alvo === undefined) continue;
    const qs = quarteto(id, [1, 1, 1, 1]);
    questoes.push(...qs);
    qs.forEach((questao, i) => {
      resultados[questao.id] = i < alvo ? "acerto" : "erro";
    });
  }
  return { questoes, resultados };
}

// ---------------------------------------------------------------------------
// competencias.ts
// ---------------------------------------------------------------------------

describe("competencias", () => {
  it("tem 5 competências na ordem M0→M4", () => {
    expect(COMPETENCIAS.map((c) => c.id)).toEqual([
      "matematica",
      "ml-classico",
      "dl-fundamentos",
      "dl-aplicado",
      "transformers-llms",
    ]);
    expect(COMPETENCIAS.map((c) => c.modulo)).toEqual(["M0", "M1", "M2", "M3", "M4"]);
  });

  it("labels PT-BR pra UI", () => {
    expect(COMPETENCIAS.map((c) => c.label)).toEqual([
      "Matemática",
      "ML Clássico",
      "Fundamentos de DL",
      "DL Aplicado",
      "Transformers & LLMs",
    ]);
  });

  it("competenciaDoModulo resolve M0–M4 e devolve null fora deles", () => {
    expect(competenciaDoModulo("M0")).toBe("matematica");
    expect(competenciaDoModulo("M4")).toBe("transformers-llms");
    expect(competenciaDoModulo("M5")).toBeNull();
    expect(competenciaDoModulo("M9")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// scoreCompetencias — mcqScore ponderado por dificuldade
// ---------------------------------------------------------------------------

describe("mcqScore ponderado por dificuldade", () => {
  it("errar só a dificuldade-1 com pesos {1,2,2,3} → 87.5", () => {
    const qs = quarteto("matematica"); // difs [1,2,2,3], soma 8
    const m = scoreCompetencias(qs, resultadosDe(qs, ["erro", "acerto", "acerto", "acerto"]), {});
    expect(m.matematica.mcqScore).toBe(87.5); // (2+2+3)/8
    expect(m.matematica.acertos).toBe(3);
    expect(m.matematica.total).toBe(4);
  });

  it("tudo certo → 100; tudo errado → 0", () => {
    const qs = quarteto("matematica");
    const cheio = scoreCompetencias(qs, resultadosDe(qs, ["acerto", "acerto", "acerto", "acerto"]), {});
    const zero = scoreCompetencias(qs, resultadosDe(qs, ["erro", "erro", "erro", "erro"]), {});
    expect(cheio.matematica.mcqScore).toBe(100);
    expect(zero.matematica.mcqScore).toBe(0);
  });

  it("matriz sempre traz as 5 competências; sem questões → sem-evidencia com score null", () => {
    const qs = quarteto("matematica");
    const m = scoreCompetencias(qs, resultadosDe(qs, ["acerto", "acerto", "acerto", "acerto"]), {});
    for (const { id } of COMPETENCIAS) expect(m[id]).toBeDefined();
    expect(m["ml-classico"]).toMatchObject({
      score: null,
      mcqScore: null,
      confianca: "sem-evidencia",
      acertos: 0,
      total: 0,
      conceitosFracos: [],
    });
  });
});

// ---------------------------------------------------------------------------
// "nao-sei"
// ---------------------------------------------------------------------------

describe('"nao-sei"', () => {
  it("conta como errada no score e entra em conceitosFracos", () => {
    const qs = quarteto("matematica");
    const comErro = scoreCompetencias(qs, resultadosDe(qs, ["erro", "acerto", "acerto", "acerto"]), {});
    const comNaoSei = scoreCompetencias(
      qs,
      resultadosDe(qs, ["nao-sei", "acerto", "acerto", "acerto"]),
      {},
    );
    expect(comNaoSei.matematica.mcqScore).toBe(comErro.matematica.mcqScore); // 87.5
    expect(comNaoSei.matematica.acertos).toBe(3);
    expect(comNaoSei.matematica.conceitosFracos).toContain("matematica-c1");
  });
});

// ---------------------------------------------------------------------------
// PRIOR_BOOST
// ---------------------------------------------------------------------------

describe("PRIOR_BOOST", () => {
  it("constante pinada em 5", () => {
    expect(PRIOR_BOOST).toBe(5);
  });

  it("não aplica com mcqScore < 50 — nunca cria proficiência do nada", () => {
    const qs = quarteto("matematica"); // difs [1,2,2,3]
    const m = scoreCompetencias(qs, resultadosDe(qs, ["erro", "acerto", "erro", "erro"]), {
      prior: { matematica: true },
    });
    expect(m.matematica.mcqScore).toBe(25); // 2/8
    expect(m.matematica.priorBoost).toBe(0);
    expect(m.matematica.score).toBe(25);
  });

  it("aplica com prior declarado e mcqScore ≥ 50", () => {
    const qs = quarteto("matematica");
    const resultados = resultadosDe(qs, ["erro", "acerto", "erro", "acerto"]); // (2+3)/8 = 62.5
    const com = scoreCompetencias(qs, resultados, { prior: { matematica: true } });
    const sem = scoreCompetencias(qs, resultados, {});
    expect(com.matematica.priorBoost).toBe(5);
    expect(com.matematica.score).toBe(67.5);
    expect(sem.matematica.priorBoost).toBe(0);
    expect(sem.matematica.score).toBe(62.5);
  });

  it("prior sem nenhuma questão não cria score", () => {
    const m = scoreCompetencias([], {}, { prior: { matematica: true } });
    expect(m.matematica.score).toBeNull();
    expect(m.matematica.priorBoost).toBe(0);
  });

  it("boost jamais promove dispensa: score cruza 75 mas mcqScore < 75 → revisao-dirigida", () => {
    // difs {1,2,2,2} soma 7; acertos dif 1+2+2 = 5/7 ≈ 71.43 (< 75)
    const qs = quarteto("matematica", [1, 2, 2, 2]);
    const prior = { matematica: true } as const;
    const m = scoreCompetencias(qs, resultadosDe(qs, ["acerto", "acerto", "acerto", "erro"]), {
      prior,
    });
    expect(m.matematica.mcqScore).toBeCloseTo(71.43, 1);
    expect(m.matematica.score).toBeCloseTo(76.43, 1); // exibido ≥ 75…
    const rec = recomendar(m);
    expect(rec.estados.matematica).toBe("revisao-dirigida"); // …mas o gate usa SÓ mcqScore
  });
});

// ---------------------------------------------------------------------------
// COLAB_BONUS
// ---------------------------------------------------------------------------

describe("COLAB_BONUS", () => {
  it("constante pinada em 8", () => {
    expect(COLAB_BONUS).toBe(8);
  });

  it("aplica só em ml-classico quando fezColab", () => {
    const qs = [...quarteto("matematica"), ...quarteto("ml-classico")];
    const metade: ResultadoQuestao[] = ["erro", "acerto", "erro", "acerto"]; // 62.5 em cada
    const m = scoreCompetencias(qs, resultadosDe(qs, [...metade, ...metade]), { fezColab: true });
    expect(m["ml-classico"].colabBonus).toBe(8);
    expect(m["ml-classico"].score).toBe(70.5);
    expect(m.matematica.colabBonus).toBe(0);
    expect(m.matematica.score).toBe(62.5);
  });

  it("clamp em 100", () => {
    const qs = quarteto("ml-classico");
    const m = scoreCompetencias(qs, resultadosDe(qs, ["acerto", "acerto", "acerto", "acerto"]), {
      fezColab: true,
      prior: { "ml-classico": true },
    });
    expect(m["ml-classico"].mcqScore).toBe(100);
    expect(m["ml-classico"].score).toBe(100); // 100+5+8 preso em 100
  });

  it("fezColab sem questões de ml-classico não cria score", () => {
    const m = scoreCompetencias([], {}, { fezColab: true });
    expect(m["ml-classico"].score).toBeNull();
    expect(m["ml-classico"].colabBonus).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Confiança por ambiguidade do sinal
// ---------------------------------------------------------------------------

describe("confiança", () => {
  const casos: [acertos: number, total: number, esperado: string][] = [
    [4, 4, "alta"],
    [0, 4, "alta"],
    [3, 4, "media"],
    [1, 4, "media"],
    [2, 4, "baixa"],
    // N≠4: a regra é genérica na fração, não no absoluto
    [2, 5, "baixa"], // 0.4 → |0.4-0.5| < 0.25
    [4, 5, "media"], // 0.8
    [1, 1, "alta"],
    [0, 1, "alta"],
  ];

  it.each(casos)("%i/%i → %s", (acertos, total, esperado) => {
    const questoes = Array.from({ length: total }, (_, i) =>
      q(`matematica-q${i + 1}`, "matematica", 1, [`matematica-c${i + 1}`]),
    );
    const padroes = questoes.map((_, i): ResultadoQuestao => (i < acertos ? "acerto" : "erro"));
    const m = scoreCompetencias(questoes, resultadosDe(questoes, padroes), {});
    expect(m.matematica.confianca).toBe(esperado);
  });

  it("sem questões → sem-evidencia", () => {
    const m = scoreCompetencias([], {}, {});
    expect(m.matematica.confianca).toBe("sem-evidencia");
  });
});

// ---------------------------------------------------------------------------
// Dispensa em duas etapas
// ---------------------------------------------------------------------------

describe("etapa 1 só candidata o módulo", () => {
  it("4/4 → dispensa-a-confirmar: nada é dispensável sem a etapa 2", () => {
    const { questoes, resultados } = bateria({ matematica: 4 });
    const rec = recomendar(scoreCompetencias(questoes, resultados, {}));
    expect(rec.estados.matematica).toBe("dispensa-a-confirmar");
    expect(rec.candidatasDispensa).toEqual([
      { modulo: "M0", competencia: "matematica", conceitosFracos: [] },
    ]);
    expect(rec.dispensaveisSugeridos).toEqual([]);
  });

  it("3/4 = 75 também candidata, com o conceito errado listado — sem precisar de auto-relato", () => {
    const { questoes, resultados } = bateria({ "ml-classico": 3 });
    const rec = recomendar(scoreCompetencias(questoes, resultados, {}));
    expect(rec.estados["ml-classico"]).toBe("dispensa-a-confirmar");
    expect(rec.candidatasDispensa).toContainEqual({
      modulo: "M1",
      competencia: "ml-classico",
      conceitosFracos: ["ml-classico-c4"],
    });
  });

  it("o auto-relato não muda estado nenhum", () => {
    const { questoes, resultados } = bateria({ matematica: 3, "ml-classico": 2 });
    const prior = { matematica: true, "ml-classico": true } as const;
    const semPrior = recomendar(scoreCompetencias(questoes, resultados, {}));
    const comPrior = recomendar(scoreCompetencias(questoes, resultados, { prior }));
    expect(comPrior.estados).toEqual(semPrior.estados);
  });

  it("candidata bloqueia a fronteira e troca a mensagem pela de confirmação", () => {
    const { questoes, resultados } = bateria({ matematica: 4, "ml-classico": 1 });
    const rec = recomendar(scoreCompetencias(questoes, resultados, {}));
    expect(rec.fronteira).toBe("M0");
    expect(rec.mensagem).toBe(MENSAGEM_A_CONFIRMAR);
  });
});

describe("avaliarEtapa2", () => {
  /** Etapa 1 e etapa 2 de matemática com pesos {1,2,2,3} cada. */
  function duasEtapas() {
    const e1 = [1, 2, 2, 3].map((d, i) =>
      q(`m1-${i}`, "matematica", d as 1 | 2 | 3, [`e1-c${i}`], 1),
    );
    const e2 = [1, 2, 2, 3].map((d, i) =>
      q(`m2-${i}`, "matematica", d as 1 | 2 | 3, [`e2-c${i}`], 2),
    );
    return { e1, e2, todas: [...e1, ...e2] };
  }

  it("scoreCompetencias ignora a etapa 2: o radar é só da etapa 1", () => {
    const { e1, todas } = duasEtapas();
    const r = resultadosDe(todas, [
      "acerto", "acerto", "acerto", "acerto",
      "erro", "erro", "erro", "erro",
    ]);
    expect(scoreCompetencias(todas, r, {})).toEqual(scoreCompetencias(e1, r, {}));
  });

  it("aprova pela nota acumulada: 4/4 na etapa 1 compensa errar a difícil da etapa 2", () => {
    const { todas } = duasEtapas();
    const r = resultadosDe(todas, [
      "acerto", "acerto", "acerto", "acerto",
      "acerto", "acerto", "acerto", "erro",
    ]); // 13/16 = 81.25
    const e = avaliarEtapa2(todas, r).matematica!;
    expect(e.mcqScoreAcumulado).toBeCloseTo(81.25, 2);
    expect(e.aprovada).toBe(true);
    expect(e.conceitosFracos).toEqual(["e2-c3"]);
  });

  it("reprova abaixo de 75 acumulado e junta os fracos das duas etapas", () => {
    const { todas } = duasEtapas();
    const r = resultadosDe(todas, [
      "erro", "acerto", "acerto", "acerto", // etapa 1: 7/8
      "acerto", "erro", "nao-sei", "acerto", // etapa 2: 4/8 → acumulado 11/16
    ]);
    const e = avaliarEtapa2(todas, r).matematica!;
    expect(e.mcqScoreAcumulado).toBeCloseTo(68.75, 2);
    expect(e.aprovada).toBe(false);
    expect(e.conceitosFracos).toEqual(["e1-c0", "e2-c1", "e2-c2"]);
  });

  it("nunca aprova quem não foi candidato na etapa 1, mesmo gabaritando a etapa 2", () => {
    const { todas } = duasEtapas();
    const r = resultadosDe(todas, [
      "acerto", "acerto", "erro", "erro", // etapa 1: 3/8
      "acerto", "acerto", "acerto", "acerto",
    ]);
    // acumulado 11/16 < 75 de qualquer forma; o caso sem etapa 1 prova a regra
    expect(avaliarEtapa2(todas, r).matematica!.aprovada).toBe(false);
    const soEtapa2 = todas.filter((x) => x.etapa === 2);
    expect(avaliarEtapa2(soEtapa2, r).matematica!.aprovada).toBe(false);
  });

  it("só aparece competência que tem questão de etapa 2 na lista", () => {
    const { e1 } = duasEtapas();
    expect(avaliarEtapa2(e1, {})).toEqual({});
  });
});

describe("recomendar com a etapa 2", () => {
  it("aprovada → dispensavel, sugerida com os fracos das duas etapas", () => {
    const { questoes, resultados } = bateria({ matematica: 4 });
    const m = scoreCompetencias(questoes, resultados, {});
    const rec = recomendar(m, { etapa2: { matematica: etapa2Feita(true, ["gradiente"]) } });
    expect(rec.estados.matematica).toBe("dispensavel");
    expect(rec.dispensaveisSugeridos).toEqual([
      { modulo: "M0", competencia: "matematica", conceitosFracos: ["gradiente"] },
    ]);
    expect(rec.candidatasDispensa).toEqual([]);
  });

  it("reprovada → revisao-dirigida na fronteira, com ⭐ nos fracos acumulados", () => {
    const { questoes, resultados } = bateria({ matematica: 4 });
    const m = scoreCompetencias(questoes, resultados, {});
    const rec = recomendar(m, {
      etapa2: { matematica: etapa2Feita(false, ["gradiente", "probabilidade-basica"]) },
    });
    expect(rec.estados.matematica).toBe("revisao-dirigida");
    expect(rec.fronteira).toBe("M0");
    expect(rec.starNodes).toEqual(["gradiente", "probabilidade-basica"]);
    expect(rec.mensagem).toBe(MENSAGENS_FRONTEIRA.M0);
  });
});

// ---------------------------------------------------------------------------
// recomendar — fronteira, starNodes, mensagens
// ---------------------------------------------------------------------------

describe("fronteira", () => {
  it("primeiro módulo não-dispensável", () => {
    const { questoes, resultados } = bateria({
      matematica: 4,
      "ml-classico": 4,
      "dl-fundamentos": 2, // 50 → revisao-dirigida
      "dl-aplicado": 4,
      "transformers-llms": 4,
    });
    const rec = recomendar(scoreCompetencias(questoes, resultados, {}), {
      etapa2: aprovadas("matematica", "ml-classico", "dl-aplicado", "transformers-llms"),
    });
    expect(rec.fronteira).toBe("M2");
    expect(rec.estados["dl-fundamentos"]).toBe("revisao-dirigida");
    expect(rec.starNodes).toEqual(["dl-fundamentos-c3", "dl-fundamentos-c4"]);
    expect(rec.mensagem).toBe(MENSAGENS_FRONTEIRA.M2);
  });

  it("tudo dispensável → M5 com a copy dos Eixos", () => {
    const { questoes, resultados } = bateria({
      matematica: 4,
      "ml-classico": 4,
      "dl-fundamentos": 4,
      "dl-aplicado": 4,
      "transformers-llms": 4,
    });
    const rec = recomendar(scoreCompetencias(questoes, resultados, {}), {
      etapa2: aprovadas(...COMPETENCIAS.map((c) => c.id)),
    });
    expect(rec.fronteira).toBe("M5");
    expect(rec.starNodes).toEqual([]);
    expect(rec.mensagem).toBe(
      "Você já domina os Fundamentos — seu caminho são os Eixos (Acadêmico / Profissional / Fronteira) e o projeto final.",
    );
    expect(rec.dispensaveisSugeridos).toHaveLength(5);
  });

  it("sem-evidencia bloqueia dispensa e vira fronteira", () => {
    const { questoes, resultados } = bateria({
      matematica: 4,
      // ml-classico sem questões (migração de dados antigos)
      "dl-fundamentos": 4,
      "dl-aplicado": 4,
      "transformers-llms": 4,
    });
    const rec = recomendar(scoreCompetencias(questoes, resultados, {}), {
      etapa2: aprovadas("matematica", "dl-fundamentos", "dl-aplicado", "transformers-llms"),
    });
    expect(rec.estados["ml-classico"]).toBe("sem-evidencia");
    expect(rec.fronteira).toBe("M1");
    expect(rec.starNodes).toEqual([]); // sem questões, sem fracos
  });

  it("toda mensagem de fronteira existe e é não-vazia", () => {
    for (const f of ["M0", "M1", "M2", "M3", "M4", "M5"] as const) {
      expect(MENSAGENS_FRONTEIRA[f].length).toBeGreaterThan(0);
    }
  });
});

describe("starNodes", () => {
  it("dedup com ordem estável de primeira aparição; acertos não entram", () => {
    const qs = [
      q("m-q1", "matematica", 1, ["gradiente", "algebra-linear-basica"]),
      q("m-q2", "matematica", 2, ["calculo-vetorial", "gradiente"]),
      q("m-q3", "matematica", 2, ["probabilidade-basica"]),
      q("m-q4", "matematica", 3, ["gradiente"]),
    ];
    const m = scoreCompetencias(
      qs,
      resultadosDe(qs, ["erro", "nao-sei", "acerto", "acerto"]),
      {},
    );
    expect(m.matematica.conceitosFracos).toEqual([
      "gradiente",
      "algebra-linear-basica",
      "calculo-vetorial",
    ]);
    const rec = recomendar(m, {});
    expect(rec.fronteira).toBe("M0");
    expect(rec.starNodes).toEqual(["gradiente", "algebra-linear-basica", "calculo-vetorial"]);
  });
});

// ---------------------------------------------------------------------------
// Edge: aluno honesto que não sabe nada
// ---------------------------------------------------------------------------

describe("edge: tudo nao-sei", () => {
  it("todas comecar-aqui, fronteira M0", () => {
    const questoes = COMPETENCIAS.flatMap(({ id }) => quarteto(id, [1, 1, 1, 1]));
    const resultados = resultadosDe(
      questoes,
      questoes.map((): ResultadoQuestao => "nao-sei"),
    );
    const rec = recomendar(scoreCompetencias(questoes, resultados, {}), {});
    for (const { id } of COMPETENCIAS) expect(rec.estados[id]).toBe("comecar-aqui");
    expect(rec.fronteira).toBe("M0");
    expect(rec.starNodes).toEqual([
      "matematica-c1",
      "matematica-c2",
      "matematica-c3",
      "matematica-c4",
    ]);
  });
});
