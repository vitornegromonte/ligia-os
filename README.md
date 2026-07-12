# Ligia OS

Ligia OS é uma plataforma web de gestão interna da Ligia, construída com React e Vite. O sistema centraliza autenticação, banco de talentos, documentação, projetos, marcos, certificados e um dashboard com indicadores da comunidade.

## Funcionalidades

- Autenticação com Supabase (`login` e `cadastro`).
- Proteção de rotas para usuários autenticados.
- Início com métricas resumidas e atalhos para os módulos principais.
- Banco de Talentos com busca, filtros, visualização em grade/lista e cadastro de perfis.
- Documentação com abas para guias, pesquisa e documentação de projetos.
- Gestão de projetos com timeline, board e visão por projeto.
- Cadastro de marcos e detalhamento de entregas.
- Emissão e pré-visualização de certificados.
- Fallback para dados mockados quando o Supabase não estiver configurado.

## Stack

- React 19
- Vite 6
- React Router DOM 7
- Supabase
- lucide-react
- marked

## Requisitos

- Node.js 18+ recomendado
- npm, yarn ou pnpm
- Projeto Supabase configurado, se você quiser usar os dados reais

## Instalação

```bash
npm install
```

## Configuração do ambiente

Crie um arquivo `.env` na raiz do projeto com as credenciais do Supabase:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

Se essas variáveis não estiverem presentes, o app continua funcionando com dados locais/mockados, mas sem persistência real no banco.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

- `npm run dev`: inicia o ambiente de desenvolvimento.
- `npm run build`: gera a build de produção.
- `npm run preview`: sobe uma prévia local da build.

## Fluxo da aplicação

- `/login`: entrada na plataforma.
- `/register`: criação de conta com perfil básico.
- `/`: página inicial com resumo e atalhos.
- `/talentos`: banco de talentos da equipe.
- `/docs`: biblioteca de documentação e materiais internos.
- `/certificados`: geração e exportação de certificados.
- `/dashboard`: visão consolidada da operação.
- `/projetos`: gestão de projetos e marcos.
- `/projetos/:projectId`: visão detalhada de um projeto.
- `/projetos/:projectId/:docId`: visão detalhada de documento de projeto.

## Estrutura principal

```text
src/
  components/   componentes de UI e modais
  contexts/     contexto de autenticação
  data/         dados mockados usados no fallback local
  lib/          cliente Supabase
  pages/        telas principais
  services/     acesso aos dados e operações de domínio
  utils/        utilitários compartilhados
```

## Observações

- O app usa Supabase para autenticação e persistência quando configurado corretamente.
- Quando não há conexão com Supabase, os serviços retornam dados de exemplo para permitir navegação e desenvolvimento local.
- A interface foi pensada para uso interno da Ligia e segue a identidade visual com foco em laranja, tipografia destacada e layout escuro.
