const people = [
  {
    id: 1, name: "Amara Oliveira", initials: "AO",
    email: "amara@exemplo.com", team: "NLP", discipline: "NLP",
    skills: ["Python", "Transformers", "Rasa", "Pytorch"],
    project: "Chatbot Inteligente", affiliation: "CIn-UFPE",
    availability: "Available", capacity: "100% disponível",
    researchInterests: "Modelos de linguagem, análise de sentimentos, sumarização de texto",
    color: "#b7c2d2", status: "online",
    lattes: "http://lattes.cnpq.br/1111111", github: "https://github.com/amara",
    linkedin: "https://linkedin.com/in/amara", kaggle: "https://kaggle.com/amara",
    cv: "https://drive.google.com/amara", bio: "Pesquisadora em PLN com foco em modelos transformer e sistemas de diálogo. Contribui em projetos open-source e participa ativamente de competições de NLP.",
    history: [["CIn-UFPE", "Mestranda em Ciência da Computação"], ["Ligia", "Pesquisadora NLP"]]
  },
  {
    id: 2, name: "Jonas Almeida", initials: "JA",
    email: "jonas@exemplo.com", team: "ML", discipline: "ML",
    skills: ["Python", "Scikit-learn", "TensorFlow", "SQL"],
    project: "Sistema de Recomendação", affiliation: "IME-USP",
    availability: "Available", capacity: "100% disponível",
    researchInterests: "Aprendizado supervisionado, otimização de hiperparâmetros, explicabilidade",
    color: "#c6b6d1", status: "online",
    lattes: "http://lattes.cnpq.br/2222222", github: "https://github.com/jonas",
    linkedin: "https://linkedin.com/in/jonas", kaggle: "https://kaggle.com/jonas",
    cv: "https://drive.google.com/jonas", bio: "Cientista de dados com experiência em sistemas de recomendação e modelos preditivos. Interesse em ML aplicado a problemas de negócio.",
    history: [["IME-USP", "Graduando em Estatística"], ["Ligia", "Cientista de Dados"]]
  },
  {
    id: 3, name: "Sofia Martins", initials: "SM",
    email: "sofia@exemplo.com", team: "Comunicação", discipline: "Comunicação",
    skills: ["Estratégia", "Produto", "UX Research", "Figma"],
    project: "Portal da Comunidade", affiliation: "UFPE",
    availability: "Limited", capacity: "Capacidade limitada",
    researchInterests: "Experiência do usuário, design de interação, comunicação científica",
    color: "#d1ba9e", status: "busy",
    lattes: "http://lattes.cnpq.br/3333333", github: "https://github.com/sofia",
    linkedin: "https://linkedin.com/in/sofia", kaggle: "",
    cv: "https://drive.google.com/sofia", bio: "Profissional de produto e design com foco em experiência do usuário. Trabalha na interseção entre comunicação e tecnologia.",
    history: [["UFPE", "Graduanda em Design"], ["Ligia", "Líder de Produto"]]
  },
  {
    id: 4, name: "Elena Costa", initials: "EC",
    email: "elena@exemplo.com", team: "Comunicação", discipline: "Comunicação",
    skills: ["Copywriting", "Mídias Sociais", "Eventos", "inglês avançado"],
    project: "Marketing e Comunidade", affiliation: "UFPE",
    availability: "Available", capacity: "100% disponível",
    researchInterests: "Comunicação digital, marketing de conteúdo, organização de eventos acadêmicos",
    color: "#aebfba", status: "online",
    lattes: "http://lattes.cnpq.br/4444444", github: "https://github.com/elena",
    linkedin: "https://linkedin.com/in/elena", kaggle: "",
    cv: "https://drive.google.com/elena", bio: "Comunicadora apaixonada por conectar pessoas e ideias. Organiza eventos, produz conteúdo e fortalece a comunidade Ligia.",
    history: [["UFPE", "Graduanda em Comunicação Social"], ["Ligia", "Analista de Comunidade"]]
  },
  {
    id: 5, name: "Theo Santos", initials: "TS",
    email: "theo@exemplo.com", team: "ML", discipline: "ML",
    skills: ["Python", "PyTorch", "RL", "C++"],
    project: "Agente Autônomo", affiliation: "ITA",
    availability: "Allocated", capacity: "Alocado em tempo integral",
    researchInterests: "Aprendizado por reforço, sistemas multiagente, robótica",
    color: "#c6b6d1", status: "away",
    lattes: "http://lattes.cnpq.br/5555555", github: "https://github.com/theo",
    linkedin: "https://linkedin.com/in/theo", kaggle: "https://kaggle.com/theo",
    cv: "https://drive.google.com/theo", bio: "Pesquisador em aprendizado por reforço com background em engenharia. Desenvolve agentes autônomos para simulação e robótica.",
    history: [["ITA", "Mestrando em Engenharia Aeroespacial"], ["Ligia", "Pesquisador ML"]]
  },
  {
    id: 6, name: "Maya Singh", initials: "MS",
    email: "maya@exemplo.com", team: "NLP", discipline: "NLP",
    skills: ["Python", "NLTK", "Spacy", "Hugging Face", "Java"],
    project: "Analisador de Textos Jurídicos", affiliation: "UFMG",
    availability: "Available", capacity: "100% disponível",
    researchInterests: "Processamento de linguagem natural jurídico, extração de informação, chatbots",
    color: "#b7c2d2", status: "online",
    lattes: "http://lattes.cnpq.br/6666666", github: "https://github.com/maya",
    linkedin: "https://linkedin.com/in/maya", kaggle: "https://kaggle.com/maya",
    cv: "https://drive.google.com/maya", bio: "Pesquisadora em PLN com foco em textos jurídicos. Desenvolve ferramentas para automação de análise documental.",
    history: [["UFMG", "Graduanda em Ciência da Computação"], ["Ligia", "Pesquisadora NLP"]]
  },
  {
    id: 7, name: "Noah Pereira", initials: "NP",
    email: "noah@exemplo.com", team: "ML", discipline: "ML",
    skills: ["Python", "Pandas", "SQL", "Power BI", "Excel"],
    project: "Dashboard de Métricas", affiliation: "UFRJ",
    availability: "Limited", capacity: "Capacidade limitada",
    researchInterests: "Análise de dados, visualização de informação, business intelligence",
    color: "#d1ba9e", status: "online",
    lattes: "http://lattes.cnpq.br/7777777", github: "https://github.com/noah",
    linkedin: "https://linkedin.com/in/noah", kaggle: "https://kaggle.com/noah",
    cv: "https://drive.google.com/noah", bio: "Analista de dados com foco em dashboards e visualização. Transforma dados brutos em insights acionáveis para a comunidade.",
    history: [["UFRJ", "Graduando em Administração"], ["Ligia", "Analista de Dados"]]
  },
  {
    id: 8, name: "Priya Patel", initials: "PP",
    email: "priya@exemplo.com", team: "CV", discipline: "CV",
    skills: ["Python", "OpenCV", "YOLO", "Keras"],
    project: "Reconhecimento de Padrões", affiliation: "UNICAMP",
    availability: "Available", capacity: "100% disponível",
    researchInterests: "Visão computacional, detecção de objetos, segmentação semântica, deep learning",
    color: "#aebfba", status: "online",
    lattes: "http://lattes.cnpq.br/8888888", github: "https://github.com/priya",
    linkedin: "https://linkedin.com/in/priya", kaggle: "https://kaggle.com/priya",
    cv: "https://drive.google.com/priya", bio: "Pesquisadora em visão computacional com experiência em detecção e segmentação de objetos. Aplicações em agricultura de precisão.",
    history: [["UNICAMP", "Mestranda em Computação Visual"], ["Ligia", "Pesquisadora CV"]]
  }
];

export default people;
