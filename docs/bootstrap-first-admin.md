# Primeiro Diretor ou Coordenador

Use `scripts/bootstrap-first-admin.mjs` apenas numa instalação que ainda não tenha Diretor nem Coordenador. Um operador com acesso à conta `postgres` do banco escolhe um perfil já criado pelo Auth. O script não é parte do frontend nem usa chave `anon` ou metadados do usuário.

## Requisitos

- Node.js e `psql` do PostgreSQL 18 disponíveis no computador do operador. Se necessário, defina `LOCAL_PG_BIN` com o caminho completo de `psql`.
- `DATABASE_URL` no ambiente do processo, com credenciais da conta `postgres` do projeto correto. Não coloque a URL na linha de comando, em arquivos versionados ou em mensagens.
- Perfil alvo já existente, sem solicitação de acesso pendente. Para um Externo, o status passa a `none`; para um Membro, permanece `approved`.
- Janela operacional controlada. Confirme o host do banco e o UUID exibidos na prévia antes de aplicar, sobretudo em produção.

## Uso

Depois de carregar `DATABASE_URL` por um meio seguro no ambiente do terminal, faça uma prévia:

```sh
node scripts/bootstrap-first-admin.mjs --email pessoa@example.invalid --role diretor
```

Também é possível usar `--id UUID` no lugar de `--email`. A prévia informa host e banco, role atual, UUID do perfil e o comando de aplicação. Confira esses dados com o projeto pretendido. A aplicação exige o UUID e o host exatos, informados novamente pelo operador:

```sh
node scripts/bootstrap-first-admin.mjs --email pessoa@example.invalid --role diretor --apply --confirm-id UUID_EXIBIDO_NA_PREVIA --expect-host HOST_EXIBIDO_NA_PREVIA
```

`--role coordenador` segue o mesmo fluxo. O script abre uma transação, bloqueia a tabela de perfis contra alterações concorrentes, confirma que não existe administrador, encontra exatamente um perfil e altera apenas `role` e, quando necessário, `status_membro`. Se alguma condição falhar, a transação é revertida. Uma vez criado o primeiro administrador, use a tela **Gestão de usuários e cargos** para mudanças posteriores.

Verifique o resultado pela saída do comando e, com uma sessão administrativa, pela tela de gestão de usuários. Não execute o bootstrap contra contas reais para testá-lo; os testes automatizados usam um PostgreSQL descartável.
