---
aula: "003"
titulo: "Overfitting: quando o modelo decora em vez de aprender"
autor: "Equipe LigIA (aula-exemplo)"
area: "tópico-do-mês"
duracao_min: 8
conceitos_cobertos: ["overfitting"]
publicado_em: "2026-06-01"
---

> **Motivação em 2 min:** um modelo com 100% de acerto no treino e 60% no teste
> não é genial — está **decorando**. Reconhecer e combater isso é metade do
> trabalho prático de ML.

## O sintoma

**Overfitting** é quando o modelo aprende o *ruído* do conjunto de treino, não o
*padrão* que generaliza. O sinal clássico:

- erro de **treino** baixíssimo;
- erro de **validação/teste** bem maior;
- a distância entre os dois (*generalization gap*) só cresce com mais épocas.

O oposto — modelo simples demais que erra até no treino — é **underfitting**.

## Por que acontece

- Modelo com **capacidade** alta demais pro tamanho dos dados.
- Treinar tempo demais sem checar a validação.
- *Data leakage*: informação do teste vazando pro treino (ex.: normalizar
  *antes* do split).

## O que fazer

1. **Mais dados** (ou *data augmentation*).
2. **Regularização** (L2/dropout) — penaliza complexidade.
3. **Early stopping** — pare quando a validação parar de melhorar.
4. **Validação cruzada** pra estimar a generalização com honestidade.

## No skill tree

Cobre o nó **Overfitting** (M1). Liga diretamente a *Regularização (L2)*, o
próximo passo natural.

## Referências

- ISL, cap. 2 (trade-off viés–variância) e cap. 5 (validação).
