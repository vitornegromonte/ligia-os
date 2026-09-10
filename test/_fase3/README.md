# Testes parqueados até a Fase 3

Estes testes vieram da plataforma Next.js e exercitam componentes que ainda
não foram portados (`RadarChart`, `MatrixRadar`, `QuestionCard`, e o canário
do `button`). Voltam para `test/` junto com os componentes correspondentes.

Não estão excluídos por serem ruins — estão parqueados porque o alvo deles
ainda não existe aqui. O `vitest.config.ts` só coleta `test/**/*.test.{ts,tsx}`
na raiz de `test/`, então esta pasta não é executada.
