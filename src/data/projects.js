const projects = [
  {
    id: "coracao",
    name: "Segmentação de Gordura do Coração",
    description: "Segmentação automática de gordura epicárdica e pericárdica em imagens de TC cardíaca usando deep learning.",
    status: "Em andamento", icon: "microscope", color: "#c76b60",
    progress: 40, deadline: "Dezembro 2025",
    members: [1, 3, 5],
    milestones: [
      { id: "m1", name: "Revisão bibliográfica", status: "done", members: [1, 3] },
      { id: "m2", name: "Aquisição e anotação do dataset", status: "in_progress", members: [3, 5] },
      { id: "m3", name: "Implementação das baselines", status: "todo", members: [1] },
      { id: "m4", name: "Desenvolvimento do método proposto", status: "todo", members: [1, 5] },
      { id: "m5", name: "Avaliação e redação do artigo", status: "todo", members: [1, 3, 5] },
    ]
  },
  {
    id: "adversariais-llms",
    name: "Métodos Adversariais em LLMs",
    description: "Investigação de ataques adversariais e defesas para modelos de linguagem de grande porte em português.",
    status: "Em andamento", icon: "bot", color: "#6b8eb3",
    progress: 30, deadline: "Fevereiro 2026",
    members: [2, 6, 8],
    milestones: [
      { id: "m1", name: "Revisão sistemática da literatura", status: "done", members: [2, 6] },
      { id: "m2", name: "Implementação de ataques baseline", status: "in_progress", members: [2, 8] },
      { id: "m3", name: "Proposta de defesa adversarial", status: "todo", members: [2, 6, 8] },
      { id: "m4", name: "Experimentos comparativos", status: "todo", members: [6, 8] },
      { id: "m5", name: "Redação e submissão", status: "todo", members: [2, 6] },
    ]
  },
  {
    id: "neurips",
    name: "Competição NeurIPS",
    description: "Participação em competição do NeurIPS com solução baseada em aprendizado profundo para problema de visão computacional.",
    status: "Em andamento", icon: "sparkles", color: "#c4a358",
    progress: 25, deadline: "Setembro 2025",
    members: [4, 7],
    milestones: [
      { id: "m1", name: "Análise do dataset e baseline", status: "done", members: [4, 7] },
      { id: "m2", name: "Pipeline de pré-processamento", status: "in_progress", members: [4] },
      { id: "m3", name: "Implementação do modelo principal", status: "todo", members: [4, 7] },
      { id: "m4", name: "Ensembles e pós-processamento", status: "todo", members: [4, 7] },
      { id: "m5", name: "Submissão final e relatório", status: "todo", members: [4, 7] },
    ]
  }
];

export default projects;
