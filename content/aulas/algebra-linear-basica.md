---
aula: "001"
titulo: "Álgebra Linear na intuição"
autor: "Equipe LigIA (aula-exemplo)"
area: "tópico-do-mês"
youtube: "https://www.youtube.com/watch?v=fNk_zzaMoSs"
duracao_min: 10
conceitos_cobertos: ["algebra-linear-basica"]
publicado_em: "2026-06-01"
---

> **Motivação em 2 min:** quase tudo em ML é vetor e matriz por baixo do capô.
> Pegar a *intuição geométrica* antes da álgebra mecânica faz o resto do
> currículo (gradiente, backprop, atenção) parar de parecer magia.

## O essencial

- Um **vetor** é uma seta com direção e tamanho — ou uma lista de números num
  sistema de coordenadas. As duas visões são a mesma coisa.
- **Combinação linear**: esticar e somar vetores. O conjunto de tudo que dá pra
  alcançar assim é o *span*.
- Uma **matriz** é uma transformação linear: ela pega o espaço e o estica,
  rotaciona ou cisalha — preservando a origem e as linhas de grade paralelas.

## Por que isso importa pra IA

| Conceito | Onde reaparece |
|---|---|
| Produto escalar | similaridade, atenção (`q · k`) |
| Multiplicação matriz·vetor | uma camada de rede neural |
| Autovalores | PCA, estabilidade de treino |

## Mão na massa

Tente, no papel, aplicar a matriz `[[2, 0], [0, 1]]` ao vetor `(1, 1)`. O que
acontece com o quadrado unitário? (Resposta: vira um retângulo 2×1.)

```python
import numpy as np
A = np.array([[2, 0], [0, 1]])
v = np.array([1, 1])
print(A @ v)   # [2 1]
```

## No skill tree

Cobre o nó **Álgebra Linear Básica** (M0) — porta de entrada pra quem vai do
zero. Depois dela, *Cálculo Vetorial* e *Gradiente* destravam.

## Referências

- 3Blue1Brown — *Essence of Linear Algebra* (a série inteira vale o tempo).
- Gilbert Strang — *Linear Algebra and Its Applications*.
