# Ligia OS — Auth & Access Control Implementation Report

Data: 18/09/2026. Branch: `feat/auth-roles-and-access-control`. Base: `main`, commit `7c562fb`.

**Entrega: frontend implementado e testado; proposta SQL validada em PostgreSQL local. A implantação e a segurança do Supabase real continuam pendentes.** Não considerar atendidos em produção os critérios de cadastro confiável, prevenção de autopromoção e bloqueio de dados pelo banco até reconciliar e aplicar as policies sobre o schema real. Nenhuma mudança foi feita no Supabase remoto. Não foi criado backend.

## Estado inicial encontrado

A investigação foi refeita antes de modificar os arquivos. Não havia relatório anterior de auditoria disponível no repositório; as conclusões foram baseadas no código atual.

- `AuthContext` mantinha sessão, perfil, loading e recuperação separadamente. `getSession` e `onAuthStateChange` carregavam perfis concorrentemente, sem invalidar respostas anteriores. Qualquer erro de SELECT ou falta de resultado disparava INSERT pelo navegador. Falhas de provisionamento eram ignoradas.
- `ProtectedRoute` exigia sessão, mas autorizava uma rota com papéis quando o perfil estava ausente. Apenas `/pratica` e seu detalhe tinham lista de papéis. Projetos, banco de talentos, notas, agenda, documentação, certificados e dashboard eram acessíveis a qualquer sessão.
- Login sempre navegava para `/inicio`. Não preservava o destino solicitado. Login/cadastro não redirecionavam usuários autenticados. Não havia rota de perfil, 403 consistente ou catch-all 404.
- `mapProfile` removia `role`. Serviços retornavam mocks após erros de consulta; `updateProfile` devolvia linha bruta e `ProfileEdit` mantinha um segundo mapeamento parcial. O AuthContext também usava a linha bruta.
- O Banco de Talentos já oferecia mudança de papel para admin, mas o serviço fazia UPDATE direto de `role`. A interface assumia o valor solicitado em vez de consumir a resposta persistida. Também existia código de formulário de criação de perfil com ID `mock-*`, sem criação correspondente em Auth.
- `role` já usava visitante/membro/admin. `category` distinguia membro/diretor/professor e `director_role` a diretoria; ambos apareciam no diretório. `project_members` vinculava projeto e perfil, sem liderança demonstrada no código. Atribuição/remoção de participantes estava disponível a membro/admin.
- Logout não inspecionava `error` retornado pelo Supabase e limpava o estado mesmo em falha. Recuperação enviava email para `/reset-password`, reconhecia `PASSWORD_RECOVERY` e atualizava a senha via Auth.
- A landing consultava perfis/projetos internos com o cliente autenticado e compartilhava um cache de sessão sem identidade. Código da prática e preferências de tabelas usavam chaves compartilhadas entre contas.
- Não havia testes automatizados de Auth, migrations, policies ou schema versionados. O ignore global de `*.sql` impedia o versionamento usual. A consulta de descoberta da Data API com a configuração local retornou HTTP 401; não havia conexão administrativa disponível. Isso não permite afirmar se a configuração remota está segura ou insegura.

## Arquivos modificados/adicionados

| Arquivo | Mudança | Motivo |
|---|---|---|
| `src/auth/access.js` | Papéis e helpers de acesso, home e destino seguro | Centralizar regras repetidas; separar classificação de autorização |
| `src/auth/errors.js` | Classificação de falhas e timeout de 15 segundos | Distinguir rede, RLS explícita, sessão inválida e erro Supabase |
| `src/contexts/AuthContext.jsx` | Estado explícito, validação de identidade, controle de concorrência e logout | Negar acesso sem perfil confiável e descartar respostas antigas |
| `src/services/profiles.js` | Mapper único com role, erros propagados, RPC com resposta singular | Evitar mocks como identidade e persistir mudança de papel no banco |
| `src/data/people.js` | Role explícito nos exemplos de membros | Manter contrato dos mocks, sem usá-los para autenticar |
| `src/components/ProfileEdit.jsx` | Remove role do payload e recarrega perfil do banco | Evitar atribuição local de identidade e mapper duplicado |
| `src/components/ProtectedRoute.jsx` | AuthenticatedRoute, RoleRoute, GuestRoute, erro de identidade e 403 | Negação por padrão, destino preservado e ausência de loops |
| `src/App.jsx` | Grupos autenticado/interno, perfil e 404 | Restringir cada área conforme seu uso real |
| `src/pages/Profile.jsx` | Perfil mínimo acessível aos três papéis | Oferecer destino útil ao visitante sem criar trilhas/conteúdos |
| `src/pages/Login.jsx` | Remove redirect fixo; mantém estado no link de cadastro | Esperar perfil resolvido antes de escolher destino |
| `src/pages/Register.jsx` | Preserva destino nos links de login | Suportar cadastro com confirmação e sessão imediata pelo guard |
| `src/components/Sidebar.jsx` | Menu por papel, home correta, erro de logout e modal desmontável | Navegação coerente e remoção de formulários antigos em memória |
| `src/components/Layout.jsx` | Layout por identidade/papel e busca só interna; encaminha conteúdo | Desmontar dados da conta anterior e impedir busca interna para visitante |
| `src/index.css` | Compatibilidade do shell/menu móvel com abertura da navegação | Tornar a área de perfil e os estados de acesso navegáveis em telas pequenas |
| `src/pages/TalentBank.jsx` | Administração explícita, resposta persistida e remoção de criação avulsa | Manter vínculo Auth/perfil; impedir simulação de mudança só em React |
| `src/lib/supabase.js` | Cliente público separado, sem sessão persistida | Impedir que a landing herde visibilidade de um admin |
| `src/pages/Landing.jsx` | Consulta pública isolada, sem perfis/projetos internos ou fallback desses dados; cache novo | Separar publicação de conteúdo e acesso interno; métricas não disponíveis ficam “—” |
| `src/pages/ProcessoSeletivo.jsx` | Link de entrada respeita a home do papel | Evitar encaminhar visitante para `/inicio` |
| `src/pages/PracticeDetail.jsx` | Código local separado por perfil | Não mostrar código salvo de outra conta; chaves antigas não são importadas |
| `src/components/db/DbView.jsx` | Preferências de tabela separadas por perfil | Não reutilizar filtros da conta anterior |
| `.gitignore` | Exceção para SQL em `supabase` | Versionar propostas, inventário e testes |
| `supabase/inspect-access.sql` | Inventário somente leitura | Permitir a reconciliação do schema e das permissões reais |
| `supabase/proposals/001_identity.sql` | Default, trigger, backfill, grants, RLS de perfis e RPC | Autoridade no banco para identidade e papéis |
| `supabase/proposals/002_internal_boundary.sql` | Fronteira global restritiva e operações administrativas | Bloquear visitantes sem alargar permissões preexistentes de membros |
| `supabase/tests/fixture.sql` | Schema representativo com permissões antigas amplas | Exercitar o SQL sem presumir conhecer o schema real |
| `supabase/tests/access.sql` | Ataques e operações válidas usando roles PostgreSQL | Comprovar o comportamento local das propostas fora do React |
| `scripts/test-rls.mjs` | Cluster isolado, portas locais e desligamento/limpeza | Executar testes reproduzíveis sem tocar em bancos configurados |
| `supabase/README.md` | Contrato, matriz por tabela, bloqueios e plano | Explicitar o que pode e o que não pode ser afirmado sobre RLS |
| `vitest.config.js` | Vitest, React e JSDOM | Testar estados e componentes reais |
| `tests/setup.js` | Matchers e limpeza do DOM | Isolamento entre testes |
| `tests/access.test.js` | Papéis, destinos e tipos de erro | Validar as decisões compartilhadas |
| `tests/auth.test.jsx` | AuthProvider com StrictMode, falhas e concorrência | Validar a evolução de sessão/perfil e trocas de conta |
| `tests/guards.test.jsx` | Guards, fluxo de retorno e contexto de rotas aninhadas | Impedir passagem sem identidade/permissão e regressões de navegação |
| `tests/profiles.test.js` | Mapper, atualização normal e RPC | Garantir contratos e propagação de erros |
| `tests/navigation.test.jsx` | Menus por papel e falha de logout | Verificar UX coerente com os guards |
| `package.json` | Dependências e comandos de teste | Tornar as verificações reproduzíveis |
| `package-lock.json` | Lock das dependências de teste | Instalação consistente com npm |
| `README.md` | Runtime, rotas, testes e dependência da implantação SQL | Instruções compatíveis com o estado entregue |
| `docs/auth-access-control-report.md` | Este relatório | Registrar decisões, evidências e pendências |

`pnpm-lock.yaml` e `pnpm-workspace.yaml` já existiam como arquivos não rastreados e foram preservados fora dos commits. Não houve migração de gerenciador de pacotes.

## Modelo final de papéis

| Papel | Uso |
|---|---|
| visitante | Conta autenticada, perfil próprio e futura área de aprendizado |
| membro | Área interna; operações ainda sujeitas a RLS e às relações de domínio |
| admin | Área interna e administração de pessoas/papéis |

Diretor, professor, líder de projeto, ativo, afastado e ex-membro **não são papéis globais**. `category` e `director_role` continuam separados. Liderança de projeto deverá residir no vínculo de projeto, se implementada. Não foi criado framework ou tabela configurável de permissões.

## Fluxo de cadastro

```text
register → Supabase Auth → auth.users
                            ↓ trigger confiável da proposta SQL
                          profiles → role = visitante
```

O formulário não oferece promoção. Auth recebe somente uma lista permitida de campos de apresentação; o banco ignora metadata de autorização mesmo quando enviada fora do frontend. Default e CHECK complementam o trigger. INSERT/DELETE de perfis são retirados dos clientes; reparo idempotente no banco usa `ON CONFLICT DO NOTHING`, preservando identidades existentes.

**Esse fluxo no banco foi testado na fixture local, não no serviço Auth real.** O cadastro em produção depende da aplicação validada do SQL. Confirmação de email mantém a mensagem existente; se Auth emitir sessão imediatamente, GuestRoute aguarda o perfil e encaminha o usuário. A configuração de emails/URLs permitidas continua sob responsabilidade do projeto Supabase.

## Fluxo de autenticação

```text
session_loading
 ├─ sem sessão → unauthenticated
 ├─ erro → session_error
 └─ sessão → profile_loading → getUser → SELECT do próprio profile
                                ├─ identidade e papel válidos → authenticated
                                └─ falha/ausência/papel inválido → profile_error
```

`session`, `profile`, `status`, `error` e `recovery` formam um estado coerente. `loading` permanece derivado para compatibilidade. Perfis nunca vêm de mocks no AuthContext. Toda transição de sessão invalida o perfil anterior; geração, cancelamento e cleanup descartam respostas antigas. O callback de Auth é síncrono e a consulta ocorre em outro efeito, evitando chamadas Supabase dentro do lock de Auth.

Falhas distinguem `network`, `rls` explícita, `supabase`, `invalid_session`, `invalid_profile` e `profile_unavailable`. SELECT vazio **não prova** ausência: RLS também pode ocultar uma linha. Por isso não há criação automática pelo navegador. A interface bloqueia e oferece tentar novamente/sair; o inventário administrativo diferencia a ausência real.

Logout propaga erros retornados ou lançados. Só um resultado bem-sucedido ou evento de Auth limpa a identidade. A conclusão tardia de um logout não sobrescreve uma sessão mais recente. `PASSWORD_RECOVERY` direciona para a tela existente; atualizar senha continua usando Supabase Auth.

O destino inclui path, query e fragmento. Depois do login, o guard do destino autoriza ou mostra 403, sem redirecionar de volta ao login. Destinos externos e páginas de autenticação são recusados pelo helper para evitar loops. A preservação usa o estado de navegação; não promete transportar o destino entre dispositivos ou uma nova aba de confirmação de email.

## Rotas

“Sim” nas áreas autenticadas exige sessão validada e perfil válido. Páginas públicas continuam acessíveis mesmo se o carregamento de identidade falhar.

| Rota | Público | Visitante | Membro | Admin |
|---|---|---|---|---|
| `/` | Sim | Sim | Sim | Sim |
| `/processo-seletivo` | Sim | Sim | Sim | Sim |
| `/login` | Sim | Redireciona | Redireciona | Redireciona |
| `/register` | Sim | Redireciona | Redireciona | Redireciona |
| `/reset-password` | Instrução pública; alteração exige recuperação Auth | Recuperação | Recuperação | Recuperação |
| `/perfil` | Login | Sim | Sim | Sim |
| `/inicio` | Login | 403 | Sim | Sim |
| `/dia` | Login | 403 | Sim | Sim |
| `/agenda` | Login | 403 | Sim | Sim |
| `/notas` | Login | 403 | Sim | Sim |
| `/membros` | Login | 403 | Consulta | Consulta + administração |
| `/docs` | Login | 403 | Sim | Sim |
| `/projetos` | Login | 403 | Sim | Sim |
| `/projetos/:projectId` | Login | 403 | Sim | Sim |
| `/projetos/:projectId/:docId` | Login | 403 | Sim | Sim |
| `/dashboard` | Login | 403 | Sim | Sim |
| `/certificados` | Login | 403 | Sim | Sim |
| `/pratica` | Login | 403 | Sim | Sim |
| `/pratica/:slug` | Login | 403 | Sim | Sim |
| `/conteudos`, `/trilhas`, `/trilhas/:slug` | Não implementadas / 404 | 404 | 404 | 404 |
| Qualquer rota desconhecida | 404 | 404 | 404 | 404 |

Não foi criado painel admin separado: a gestão existente permanece no Banco de Talentos. `RoleRoute` aceita papéis explicitamente, com lista vazia negando acesso por padrão; os testes cobrem também uso exclusivamente admin. 401 é representado pelo fluxo de login, 403 por componente de acesso negado e 404 pelo catch-all, sem alegar status HTTP de servidor numa SPA.

Notas/tarefas são ferramentas internas, agenda contém participantes e eventos internos, dashboard agrega dados de operação, e certificados usam pessoas/dados da liga: mantidos como membro/admin. A prática já tinha essa restrição. Não foi introduzida emissão de certificados ou funcionalidade de conteúdos/trilhas.

## RLS e segurança

**Policies remotas verificadas: nenhuma.** Não havia schema/policies versionados nem credencial administrativa; a descoberta pública retornou 401. Detalhes por tabela, contrato e plano estão em [supabase/README.md](../supabase/README.md).

Policies e mecanismos adicionados **como proposta**: leitura/edição consciente de perfis; grants por coluna; proteção de campos organizacionais; RPC admin; provisionamento por trigger; fronteira restritiva nas 13 tabelas internas observadas; separação de leitura pública e escrita interna de eventos; escritas administrativas em guias/pesquisas e criação/remoção de projetos. As propostas foram aplicadas duas vezes em banco local para validar idempotência.

Riscos restantes:

- **Autopromoção e profile em produção:** o frontend sozinho não impede requisições forjadas. Sem reconciliar/aplicar os grants, trigger e RPC, a proteção real não está comprovada. Funções elevadas antigas, grants herdados e triggers precisam de inventário.
- **Dados internos:** a fronteira proposta bloqueia visitantes, mas preserva policies entre membros. Autoria de notas/tarefas, destinatários de notificações, acesso entre projetos e submissões ainda exigem schema e testes reais. Vários serviços recebem um profileId mas não o aplicam como filtro.
- **Publicação:** a landing não consulta mais perfis/projetos internos. Para voltar a publicá-los, criar projeções públicas deliberadas. Revisar ainda colunas de eventos públicos e o catálogo de initiatives. Um SELECT limitado no frontend não restringe colunas na API.
- **Rotas:** guards protegem a navegação. O banco deve consultar o papel atual; a UI revalida perfil nos eventos Auth e pode permanecer visualmente desatualizada até o próximo evento. A revogação efetiva deve ocorrer em RLS independentemente disso.
- **Caches:** áreas internas desmontam por identidade/papel; código e filtros usam chaves por usuário. Chaves legadas não são importadas nem apagadas, para não destruir trabalho anterior. localStorage continua sendo armazenamento do mesmo navegador, sem promessa de sigilo contra acesso local/devtools.
- **Assets públicos:** os dados de exemplo já embarcados no bundle não são protegidos por RLS. Se contiverem informação real sensível, precisam ser retirados. Fallbacks de outros serviços permanecem fora desta refatoração; nunca são usados para decidir identidade.
- **Validação remota:** confirmação de email, links de recuperação e contratos PostgREST ainda precisam ser exercitados em staging. A RPC usa `.single()` para consumir um perfil como objeto. Não havia navegador disponível na ferramenta de UI, portanto não se declara inspeção visual ou E2E de navegador.

A separação de grants e RLS segue as [orientações oficiais da API](https://supabase.com/docs/guides/api/securing-your-api) e de [privilégios de coluna](https://supabase.com/docs/guides/database/postgres/column-level-security). O provisionamento confiável segue o modelo de [perfil associado a Auth](https://supabase.com/docs/guides/auth/managing-user-data).

## Testes e resultados

- `npm test`: **75 testes passaram, 5 arquivos**. Visitante/membro/admin; restauração de sessão; perfil pendente, ausente, inválido e com erros; login e logout; falha retornada/lançada de logout; StrictMode; sessão antiga, perfil antigo e conclusão tardia de logout; metadata de cadastro; recuperação; guards; menus; destino completo e 403 sem loop; contexto de Outlet; mapper e persistência pelo contrato de RPC.
- `npm run test:rls`: **passou em PostgreSQL 18.4**, cluster temporário. Trigger ignora role/category forjados, backfill/default visitante, idempotência, sincronização de email, edição própria, proibição de INSERT/upsert/DELETE/role/email, administração via RPC, bloqueio de autoalteração inclusive por admin, leitura de diretório por papel, acesso anônimo/visitante, CRUD de visitante nas 13 tabelas, eventos públicos e despromoção sem novo JWT.
- O teste SQL usa PostgreSQL de verdade; a tabela `auth.users` e a função `auth.uid()` são uma fixture controlada. **Não comprova Supabase Auth, JWT, PostgREST ou o banco remoto.** Os testes React, por sua vez, usam mocks de Supabase e não são apresentados como evidência de RLS.
- `git diff --check`: sem erros de whitespace.

## Build

`npm run build`: **passou** com Vite 6.4.3. Aviso preexistente: atributo `placeholder` duplicado em `src/components/CreateProjectModal.jsx:113`, mantido por estar fora do escopo.

Ambiente utilizado: Node 24.15.0 e npm 11.12.1. A suíte de teste atual exige runtime moderno; README recomenda Node 24.15+ na linha 24 LTS.

## Pendências reais e aceite

1. **Bloqueio de implantação:** obter schema/policies reais, adaptar e promover as propostas para migrations, testar em staging e publicar banco/cliente de forma coordenada. Critérios 1, 2 e 10 não podem ser declarados concluídos em produção. O critério 17 está atendido pela documentação explícita do bloqueio.
2. Validar as permissões por operação entre membros, projeções públicas, funções elevadas e endpoints expostos conforme o inventário. Administração persistente depende da RPC instalada.
3. Realizar teste integrado de Auth por email, recuperação, mudança de papel e reload usando o Supabase de staging. A matriz de frontend está coberta localmente; não substitui essa validação.
4. Problemas fora do escopo observados: warning de `placeholder` e `npm audit` com 8 ocorrências (5 altas, 2 moderadas, 1 baixa) nas dependências instaladas. Não foram aplicadas atualizações gerais. Pacotes sinalizados: browserslist, baseline-browser-mapping, dompurify, monaco-editor, nanoid, postcss, react-router e react-router-dom.

Durante a primeira execução do runner, o processo `pg_ctl` herdou pipes no Windows e excedeu o timeout. O runner foi corrigido e a suíte passou, incluindo desligamento normal. O cluster daquela primeira tentativa desligou; sobrou apenas log e diretório vazio em `C:\Users\sirmi\AppData\Local\Temp\ligia-rls-test-CnlXrO`. A revisão automática bloqueou sua limpeza com a razão genérica `blocked by policy`; os resíduos foram deixados intactos. Nenhum banco preexistente foi alterado.

## Próxima branch recomendada

**`chore/supabase-schema-and-rls`**, com o plano de seis passos em [supabase/README.md](../supabase/README.md). A lacuna real é comprovar o contrato do banco e a autoridade das operações. `feat/visitor-content-tracks`, `feat/member-management` e `feat/project-permissions` devem vir depois da base de schema/identidade/policies confiável; a última dependerá das relações efetivamente encontradas no inventário.
