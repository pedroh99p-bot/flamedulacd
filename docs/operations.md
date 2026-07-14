# Operação do ambiente oficial

## Publicar conteúdo

1. Entre em `https://flamedula-platforms.vercel.app/admin/login.html`.
2. Abra **Publicações** e escolha o tipo de conteúdo.
3. Preencha o texto e pressione **Continuar para escolher a imagem**.
4. Na etapa **Imagem**, use **Enviar uma nova imagem** para abrir o Cloudinary
   ou **Escolher uma imagem da biblioteca** para reutilizar um arquivo existente.
5. Confira a prévia. Salve como rascunho, agende ou publique.
6. Confirme a publicação na landing.

O endereço do botão de WhatsApp é administrado pelo sistema e não deve ser
digitado pelo operador.

## Acompanhar falhas

O cartão **Saúde do sistema**, na página inicial da dashboard, mostra eventos
recentes. Uma falha crítica não resolvida também aparece como alerta no topo.

Para investigar:

1. abra o cartão e identifique origem, horário e código do erro;
2. confira **Supabase > Edge Functions > Logs** para falhas de backend;
3. confira **Vercel > Project > Logs** para falhas da aplicação;
4. depois de corrigir, marque o evento como resolvido no banco e registre uma
   nota curta em `resolution_note`.

Não registre nome, telefone, e-mail, mensagem de paciente ou qualquer dado de
saúde em `operational_events`. A tabela foi desenhada apenas para metadados
técnicos.

## Alertas externos

A função `record-operational-event` envia eventos críticos ao endereço definido
no segredo `ALERT_WEBHOOK_URL`. Sem esse segredo, os eventos continuam visíveis
na dashboard e nos logs, mas nenhuma mensagem externa é enviada.

## Backup e reversão

A carga inicial criou uma cópia única em
`private.content_migration_backups`. O schema `private` não é exposto pela API.
Antes de qualquer nova carga em massa:

1. faça um backup verificável do banco;
2. teste a migration em banco limpo;
3. aplique pela CLI autenticada ou pelo SQL Editor;
4. valide contagens, RLS, dashboard e landing;
5. registre a versão em `supabase_migrations.schema_migrations`.

## Pagamentos

O fluxo atual apenas exibe o QR Code/Pix e direciona dúvidas ao WhatsApp. Não há
captura de cartão, confirmação automática ou integração com gateway. Qualquer
mudança nesse fluxo exige uma revisão separada de segurança e conciliação.
