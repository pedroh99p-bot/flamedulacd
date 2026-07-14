# Matriz de controle de acesso

Esta matriz é a especificação do backend. Ocultar botões na interface não substitui RLS.

## Conteúdo e mídia

| Ação | anônimo | viewer | editor | owner | super_admin |
|---|---:|---:|---:|---:|---:|
| Ler conteúdo publicado | sim | sim | sim | sim | sim |
| Ler rascunhos | não | sim | sim | sim | sim |
| Criar/editar/publicar | não | não | sim | sim | sim |
| Excluir conteúdo | não | não | não | sim | sim |
| Enviar/editar mídia | não | não | sim | sim | sim |
| Excluir mídia | não | não | não | sim | sim |
| Administrar acessos do CMS | não | não | não | não | sim |

## Operação e dados pessoais

Os papéis globais existentes em `admin_profiles` continuam responsáveis pelos módulos operacionais:

| Ação | viewer | operator | admin | super_admin |
|---|---:|---:|---:|---:|
| Ler doadores e casos | sim | sim | sim | sim |
| Atualizar status/notas | não | sim | sim | sim |
| Excluir doador/caso | não | não | sim | sim |
| Ler intenções financeiras | não | não | sim | sim |
| Ler auditoria | não | não | sim | sim |

## Mapeamento temporário

`admin_profiles.role` é o papel organizacional; `admin_app_access.access_role` é o papel específico do CMS. A migration cria acesso CMS automaticamente para perfis existentes:

| Papel global | Papel CMS inicial |
|---|---|
| `super_admin` | `owner` |
| `admin` | `editor` |
| `operator` | `editor` |
| `viewer` | `viewer` |

O mapeamento inicial preserva operação, mas deve ser revisado pelo responsável antes de produção — especialmente operadores que não publicam conteúdo.
