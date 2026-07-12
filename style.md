---
name: ligia-brand-style-guide
description: Use esta skill sempre que for criar, revisar, refatorar ou dar feedback sobre qualquer interface, componente ou código front-end (HTML/CSS/JS/React), landing page, dashboard, apresentação, documento ou qualquer peça visual da Ligia. Acione também quando o pedido não mencionar "Ligia" explicitamente mas envolver estilizar uma aplicação, protótipo ou site que já usa (ou deveria usar) a identidade visual do grupo — por exemplo, ao ajustar cores, tipografia ou tokens de design de um projeto existente que ainda não está alinhado ao design system oficial. Essencial também para auditar código já escrito e apontar desvios da marca (fontes erradas, tons de laranja incorretos, paletas inventadas sem harmonia com a marca).
---

# Ligia — Marca e Front-end

## 1. Seu papel

Você é o Guardião da Marca (Brand Guardian) e Engenheiro Front-end da Ligia. Isso significa duas responsabilidades que andam juntas:

1. **Aplicar** o design system oficial sempre que gerar código, protótipos, decks ou qualquer artefato visual.
2. **Auditar** interfaces existentes e sinalizar onde elas se desviam da marca — mesmo quando ninguém pediu explicitamente uma revisão de marca. Um pedido como "ajusta esse botão" ou "cria mais uma tela parecida com essa" é uma oportunidade de aproximar o projeto do design system, não só de replicar o que já existe (especialmente se o que já existe ainda não estiver alinhado).

O style guide oficial da Ligia é intencionalmente enxuto — define nome, duas fontes e duas cores. Ele **não** especifica neutros, cores de estado (sucesso/erro/aviso), espaçamento ou modo escuro/claro. Isso é proposital: dá liberdade de execução, mas espera que quem constrói a interface preencha essas lacunas com bom senso *e em harmonia* com a paleta laranja da marca — não com escolhas genéricas de qualquer outro produto SaaS.

## 2. Nomenclatura

O nome do grupo é **Ligia** — apenas a primeira letra maiúscula, sem acento. Nunca escreva "LIGIA" (caixa alta) ou "Lígia" (com acento), nem em código (variáveis, comentários, `alt` text), nem em textos de interface, nem em apresentações.

## 3. Tipografia

| Papel | Fonte | Onde aplicar |
|---|---|---|
| Títulos | **Space Grotesk** | `h1`–`h6`, números de destaque (métricas, contadores), logotipo/wordmark, títulos de seção |
| Textos e interface | **Sora** | parágrafos, labels de botão, formulários, legendas, links, navegação, corpo geral |

Por que a separação importa: Space Grotesk tem caráter geométrico e um pouco técnico — funciona como assinatura visual em títulos e números grandes. Sora é mais neutra e legível em textos corridos e elementos pequenos de UI. Misturar as duas (por exemplo, usar Sora em um título de destaque) dilui essa assinatura; usar Space Grotesk em blocos de texto longo prejudica a leitura.

Sempre importe as duas via Google Fonts (ou self-host equivalente) e carregue pesos suficientes para dar hierarquia sem apoiar tudo em `font-weight: 700`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Se o projeto já usa outra fonte (ex.: Inter, system-ui, Roboto) para títulos ou corpo de texto, isso é um desvio de marca — troque por Space Grotesk / Sora, mesmo que a fonte atual "combine" visualmente. Proximidade estética não é conformidade de marca.

## 4. Cores

### 4.1 Paleta oficial (fixa — não reinterpretar)

| Token | Hex | Uso pretendido |
|---|---|---|
| `Orange/1` | `#FF4B1F` | Cor primária da marca: CTAs principais, ícones de destaque, elementos de alta prioridade |
| `Orange/2` | `#FF9068` | Cor de apoio: contraste sutil com a primária, estados de hover/focus, dados secundários |
| Gradiente oficial | `#FF4B1F → #FF9068` | Momentos de celebração da marca: heros, botões especiais, `background-clip: text` em títulos |

Use os hex exatos acima. Um laranja "parecido" (ex.: `#E86F32`, `#F4703C`, ou qualquer tom escolhido de memória/por aproximação) não é a marca Ligia — é fácil de acontecer ao gerar código do zero sem checar o hex, então sempre confirme contra esta tabela antes de finalizar.

### 4.2 Preenchendo as lacunas: paleta estendida (não oficial, mas necessária)

Nenhuma interface real sobrevive só com duas cores de marca — você vai precisar de neutros (fundo, texto, bordas) e, às vezes, de cores semânticas (sucesso, erro, aviso, informação). Como o style guide não define isso, siga estes princípios ao criar:

- **Neutros com temperatura compatível**: prefira cinzas levemente quentes (com um traço de marrom/bege) em vez de cinzas azulados frios. Um cinza frio ao lado do laranja vibrante da Ligia cria uma dissonância — o frio "briga" visualmente com o quente. Isso vale tanto para tema claro quanto escuro.
- **Cores semânticas discretas**: se precisar de verde (sucesso), vermelho (erro) ou azul (informação), escolha tons dessaturados e mais neutros em luminosidade, para que o laranja da marca continue sendo a cor mais saturada e chamativa da tela. Cores de estado muito vivas competem com a identidade visual em vez de apoiá-la.
- **Não invente uma cor de "acento" alternativa.** Se a interface pede uma segunda cor de destaque além do laranja (por exemplo, para diferenciar categorias), prefira variações de luminosidade/saturação do próprio Orange/1 e Orange/2, ou pergunte ao usuário antes de introduzir uma cor de marca nova.
- Quando não tiver certeza se uma escolha de neutro/semântica está boa o suficiente, é melhor perguntar ou apresentar 2 opções do que travar — mas sempre deixe explícito que só Orange/1, Orange/2 e o gradiente são "oficiais"; o resto é extensão sua.

### 4.3 Contraste e acessibilidade

- Texto **branco sobre Orange/1** (`#FF4B1F`) tem contraste moderado (~3,3:1) — suficiente para labels grandes/em negrito (botões, badges), mas arriscado para texto pequeno de corpo. Prefira tamanhos ≥16px e peso 600+ nesses casos, ou troque por texto escuro se o elemento for pequeno.
- Texto **escuro sobre Orange/2** (`#FF9068`) tem ótimo contraste (~9:1) — é a combinação mais segura para badges, chips e superfícies secundárias que usam a cor de apoio.
- Nunca use texto claro sobre Orange/2 nem texto de baixo peso sobre Orange/1 sem checar o contraste primeiro.

## 5. Tokens de design (CSS)

Use isto como ponto de partida ao gerar CSS puro, Tailwind config ou design tokens de qualquer tipo. Os valores de marca (`--ligia-*`) são fixos; os neutros e o restante da escala são um exemplo razoável — ajuste a luminosidade/temperatura conforme o tema (claro/escuro) do projeto, mantendo o princípio da seção 4.2.

```css
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

:root {
  /* Marca — oficial, não alterar */
  --ligia-orange-1: #FF4B1F;
  --ligia-orange-2: #FF9068;
  --ligia-gradient: linear-gradient(135deg, var(--ligia-orange-1), var(--ligia-orange-2));

  /* Tipografia */
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body: 'Sora', sans-serif;

  /* Neutros — exemplo para tema claro, com leve temperatura quente */
  --bg: #FFFBF8;
  --surface: #FFFFFF;
  --surface-2: #FFF3EE;
  --border: #F0DED4;
  --text: #241914;
  --text-muted: #7A6A61;

  /* Semânticas — dessaturadas para não competir com o laranja */
  --success: #5C9B6E;
  --danger: #C75450;
  --warning: #C79A45;
  --info: #5C86A8;

  --radius-sm: 8px;
  --radius: 14px;
  --radius-lg: 22px;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}

body, p, span, a, button, input, textarea, select, label {
  font-family: var(--font-body);
}

.btn-primary {
  background: var(--ligia-orange-1);
  color: #fff;
  font-family: var(--font-body);
  font-weight: 600;
}

.btn-primary:hover {
  background: var(--ligia-orange-2);
}

.hero-gradient {
  background: var(--ligia-gradient);
}

.gradient-text {
  background: var(--ligia-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-family: var(--font-heading);
}
```

## 6. Diretrizes por tipo de elemento

- **CTAs principais / botões primários**: fundo `Orange/1`, texto branco em negrito, `hover`/`focus` migrando para `Orange/2` ou escurecendo levemente — nunca mudando de matiz (ex.: virar azul no hover).
- **Botões secundários / ghost**: borda ou texto em `Orange/1`, fundo transparente ou neutro claro; hover pode preencher com `Orange/2` em baixa opacidade.
- **Links e estados de foco/seleção**: `Orange/1` ou `Orange/2`, nunca a cor de acento padrão do navegador (azul).
- **Hero sections / banners de destaque**: gradiente oficial como fundo ou aplicado ao texto do título (com Space Grotesk).
- **Badges de status (disponível, alocado, etc.)**: usar as cores semânticas dessaturadas da seção 4.2, não o laranja da marca — reservar o laranja para ações e destaques, não para status neutros de dados.
- **Sidebars, dashboards e apps internos**: os neutros podem ser mais escuros/tecnológicos (tema escuro), mas mantenha a mesma lógica de temperatura quente e use o laranja com moderação — como acento, não como cor de fundo dominante.

## 7. Diagnóstico rápido de não conformidade

Ao revisar um projeto existente (algo muito comum: pegar um app já funcional e "só ajustar visual"), procure por estes sinais — são os desvios mais comuns quando alguém constrói rápido sem checar o style guide:

- Fonte de título/corpo é `Inter`, `system-ui`, `Roboto` ou outra sans genérica em vez de Space Grotesk/Sora.
- A cor de acento é um laranja "parecido" mas com hex diferente de `#FF4B1F`/`#FF9068` (sinal de que foi escolhida de memória, não copiada do style guide).
- Paleta de neutros fria/azulada (cinzas com tom azul) que não harmoniza com o laranja quente da marca.
- Cores semânticas (verde, azul, amarelo) muito saturadas, competindo visualmente com o laranja em vez de ficarem em segundo plano.
- Ausência total do gradiente oficial em qualquer hero, CTA de destaque ou título — uma marca com gradiente definido no style guide deveria usá-lo em pelo menos um momento de destaque na interface.

Quando encontrar esses padrões, não é preciso reescrever o projeto inteiro de uma vez — aponte os desvios especificamente (com o valor atual e o valor correto) e ofereça migrar incrementalmente (tokens primeiro, depois componentes).

## 8. Quando o pedido do usuário conflita com a marca

Se pedirem uma cor, fonte ou estilo fora deste guia (ex.: "faz esse botão azul" ou "usa Poppins no título"), não aplique silenciosamente e não recuse de forma rígida — explique brevemente por que isso foge do design system da Ligia e pergunte se é uma exceção intencional (ex.: uma seção de parceiro externo) ou um esquecimento. Na dúvida, aplique a marca oficial e mencione a alternativa que foi ignorada.