---
aula: "002"
titulo: "Regressão Linear, do zero ao notebook"
autor: "Equipe LigIA (aula-exemplo)"
area: "IC"
youtube: "https://www.youtube.com/watch?v=PaFPbb66DxQ"
duracao_min: 18
conceitos_cobertos: ["regressao-linear"]
colab: "https://colab.research.google.com/github/lucasddmc/trilha-ligia/blob/main/templates/notebook.ipynb"
publicado_em: "2026-06-01"
---

> **Motivação em 2 min:** regressão linear é o "olá, mundo" do ML — simples o
> bastante pra você ver *toda* a engrenagem (modelo, perda, otimização,
> avaliação) sem se afogar em detalhes.

## A ideia

Ajustar uma reta `ŷ = w·x + b` que minimize o **erro quadrático médio** entre a
previsão `ŷ` e o valor real `y`. "Treinar" é achar `w` e `b` que deixam esse erro
o menor possível.

1. Comece com um split honesto: **treino** pra ajustar, **teste** pra medir.
2. Ajuste o modelo só no treino.
3. Reporte a métrica (ex.: `R²` ou `RMSE`) **no teste** — nunca no treino.

## Hands-on (notebook)

Abra o notebook base no Colab e refaça o exercício com o dataset Iris:
split treino/teste, treine, reporte a métrica com uma *baseline* boba (prever a
média) pra comparar.

```python
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
modelo = LinearRegression().fit(X_tr, y_tr)
print("R² teste:", r2_score(y_te, modelo.predict(X_te)))
```

> **Critério de conclusão (rubric do nó):** notebook reprodutível com split
> treino/teste + ao menos uma métrica comparada a uma baseline.

## No skill tree

Cobre o nó **Regressão Linear** (M1). Pré-requisitos: *Álgebra Linear Básica* e
*Gradiente*. Destrava *Regressão Logística* e *Regularização*.

## Referências

- Andrew Ng — *Machine Learning Specialization*, Curso 1.
- *An Introduction to Statistical Learning* (ISL), cap. 3.
