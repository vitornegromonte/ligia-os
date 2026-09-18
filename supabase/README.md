# Identidade e fronteira de acesso

**Estado: proposta testada em PostgreSQL local; não aplicada nem verificada no Supabase do projeto.** Não trate esta pasta como um histórico de migrations completo. O frontend depende do provisionamento confiável de `profiles` e da RPC `change_profile_role`; coordene a publicação com o banco.

## Bloqueio encontrado

O repositório não continha schema, triggers, grants ou policies versionados; `.gitignore` ignorava todos os arquivos SQL. O ambiente disponível contém configuração de frontend, sem conexão administrativa de PostgreSQL. A descoberta somente de leitura em `/rest/v1/`, usando a chave pública local, retornou HTTP 401. Não foi possível inferir quais policies, constraints ou funções estão ativas. Docker está instalado, mas seu daemon não estava disponível. PostgreSQL 18 está instalado e foi usado em um cluster **novo e descartável**, sem acessar outros bancos locais.

O resultado do frontend `maybeSingle()` sem linha pode significar ausência real **ou ocultação por RLS**. Não há como separar essas duas situações com a mesma credencial de cliente. A aplicação mostra `profile_unavailable`, bloqueia acesso e não executa INSERT. A ausência real é identificada no banco por uma consulta confiável a `auth.users`/`profiles`, e reparada pelo provisionamento idempotente.

## O que os SQLs fazem

`inspect-access.sql` inventaria colunas, constraints, policies, grants, triggers, funções e perfis ausentes. É somente leitura. O resultado pode conter informações sensíveis de implementação; não o publique sem revisão.

`proposals/001_identity.sql`:

- Exige `profiles.id UUID` único e `role TEXT` com os três valores conhecidos. Papéis legados/nulos e triggers desconhecidos em `auth.users` interrompem a execução; não converte silenciosamente pessoas em membros.
- Assume a FK `profiles.id → auth.users.id` e as colunas usadas no cadastro: `name`, `email`, `team`, `affiliation`, `avatar_url`, `lattes`, `github`, `linkedin`, `kaggle`. Confira a FK, enums, campos obrigatórios extras e defaults no schema real. A fixture não comprova esse contrato.
- Define default `visitante`, NOT NULL e CHECK. Um trigger em Auth insere apenas `visitante`, independentemente de metadata forjada. Um backfill idempotente cria apenas perfis ausentes. A atualização do email de Auth sincroniza o perfil.
- Retira os grants de aplicação existentes, inclusive por coluna, e recompõe SELECT e UPDATE apenas das colunas editáveis. Clientes não inserem, apagam ou reescrevem `role`, `id` e `email` em `profiles`.
- Substitui as policies de **profiles**. Visitante lê e edita seu perfil; membro lê os perfis de membros/admins e edita só o próprio; admin lê todos e edita campos organizacionais. A leitura interna inclui todos os campos atuais (email, bio, currículo etc.), como exige o Banco de Talentos atual. Não há diretório público de perfis nessa proposta.
- `category` e `director_role` só mudam por admin. Continuam classificação e função organizacional, sem conceder autorização global.
- A RPC `change_profile_role(uuid,text)` exige admin pelo valor atual no banco, bloqueia alteração do próprio papel, valida o destino e retorna o perfil persistido. Bloqueia a linha do ator para serializar a verificação com uma despromoção concorrente. Falhas são transacionais. O primeiro admin é estabelecido pelo operador confiável do banco, nunca por metadata ou formulário.
- Funções privilegiadas usam `search_path` vazio e EXECUTE restrito. Execute a proposta com o proprietário confiável `postgres`; confirme ownership/BYPASSRLS. O schema `private` não pode integrar os schemas expostos na Data API. Audite funções SECURITY DEFINER legadas e views: uma RPC antiga com privilégios elevados pode contornar RLS e não é corrigida por estas policies.

`proposals/002_internal_boundary.sql` adiciona policies **RESTRICTIVE** sem conceder operações: o papel global precisa ser membro/admin **e** as policies permissivas existentes precisam autorizar a operação. Sem policy permissiva, permanece negado. Isso evita que uma policy antiga `USING (true)` continue liberando visitantes. Não representa validação do isolamento entre membros.

| Tabela observada | Uso confirmado no código | Fronteira proposta e pendência |
|---|---|---|
| projects | Início, projetos, dashboard e documentação; alguns serviços filtram membro por vínculo, outros listam tudo | Somente interno; INSERT/DELETE admin. Confirmar leitura e edição por projeto; filtro React não basta. |
| project_members | Vínculo `project_id/profile_id`; membro e admin atribuem/removem pessoas na interface atual | Somente interno; preservar políticas existentes até definir autoridade no projeto. Não foi observada liderança no vínculo. |
| milestones, milestone_members | Marcos por projeto e responsáveis | Somente interno; herdar permissão do projeto na próxima etapa. |
| tasks | CRUD interno; `fetchTasks(profileId)` ignora o argumento e INSERT não envia owner | Somente interno; descobrir owner/defaults e decidir tarefa pessoal x compartilhada antes de restringir por pessoa. |
| notes | CRUD interno, eventos, menções/participantes; `fetchNotes(profileId)` ignora o argumento | Somente interno; mesma investigação de autoria/compartilhamento. A busca presume `profile_id`. |
| guides, research_docs | Leitura de membro; criação/edição administrativa | Somente interno; escritas admin. |
| project_docs | Documentos editados por membros do projeto na UI | Somente interno; falta comprovar associação ao projeto nas policies. |
| notifications | Busca por destinatário; criação para menções | Somente interno; confirmar SELECT/UPDATE por destinatário e INSERT autorizado. |
| events | Agenda interna e landing com `visibility=public` | SELECT público só em linhas públicas; escrita somente interno, ainda sujeita às policies antigas. Revisar projeção pública para não expor campos internos da mesma linha. |
| event_participants | Participantes carregados separadamente pela agenda | Somente interno, inclusive para eventos públicos. |
| challenges, submissions | Prática já era membro/admin; submissões associadas a `profile_id` | Somente interno; confirmar autoria imutável e leitura individual de submissões. |
| initiatives | Catálogo na landing; sem escrita no serviço atual | Não inventada policy: revisar se todo registro é publicável e grants de escrita. A landing consulta como anônimo. |

Não foi observada tabela `documents`: os nomes efetivamente usados são `guides`, `research_docs` e `project_docs`. O inventário real deve encontrar tabelas adicionais, Storage, views, Realtime, GraphQL e RPCs expostos. Novas tabelas devem nascer sem grants/policies que liberem visitantes por engano.

## Testes reproduzíveis

```sh
npm run test:rls
```

O script cria um cluster PostgreSQL temporário, aplica uma **fixture representativa** e aplica as propostas duas vezes. Exercita grants, trigger e RLS de verdade via `SET ROLE anon/authenticated` e `auth.uid()` compatível com o subject de teste. Isso não testa o serviço Supabase Auth, emissão/validação de JWT, PostgREST, emails ou o schema de produção.

Requer binários PostgreSQL (`initdb`, `pg_ctl`, `psql`). No Windows, o default é PostgreSQL 18 em `C:/Program Files/PostgreSQL/18/bin`; use `LOCAL_PG_BIN` para outra instalação. No Linux/macOS, use PATH ou `LOCAL_PG_BIN` e um usuário sem privilégios root. Não usa `DATABASE_URL` nem o `.env` da aplicação. O servidor temporário só escuta em loopback e é desligado ao terminar.

## Próxima branch: `chore/supabase-schema-and-rls`

1. Obter acesso administrativo somente para o inventário inicial; executar `inspect-access.sql` e exportar schema/migrations, sem dados pessoais ou segredos no Git.
2. Reconciliar tipos, FK, defaults, usuários sem perfil, papéis legados, triggers existentes e funções elevadas. Identificar publicações da landing e separar projeções públicas de dados privados.
3. Definir, por operação, as policies entre membros na tabela acima. Revisar grants de coluna, roles herdadas, views, RPCs, Storage e schemas expostos. Não adicionar políticas permissivas genéricas para fazer as telas funcionarem.
4. Adaptar as propostas para migrations sobre esse schema e aplicar primeiro em staging. Validar cadastro/confirmacão de email, primeiro admin, sessão/restauração, recuperação de senha e RPC via PostgREST com `.single()`.
5. Repetir a matriz usando contas reais de teste anônimo/visitante/membro/admin e chamadas diretas à Data API (SELECT/INSERT/UPDATE/DELETE, upsert, role forjada, remoção de perfil, acesso entre projetos/pessoas, demissão e metadata alterada).
6. Fazer backup e planejar publicação coordenada banco → frontend. Preservar papéis existentes, verificar backfill e monitorar erros. Não reabrir acesso público como rollback. Só depois considerar identidade/autorização comprovadas em produção.

Referências usadas: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [privilégios de coluna](https://supabase.com/docs/guides/database/postgres/column-level-security), [gestão de usuários](https://supabase.com/docs/guides/auth/managing-user-data), [callback de Auth](https://supabase.com/docs/reference/javascript/auth-onauthstatechange), [RPC](https://supabase.com/docs/reference/javascript/rpc).
