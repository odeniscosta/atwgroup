# Configuração de notificações

O painel de integrações em `/admin/configuracoes` possui os canais SMTP e WhatsApp via Evolution API.

## SMTP

Informe host, porta, usuário, senha, remetente e se a conexão deve usar TLS/SSL. O botão **Testar conexão** valida conexão e autenticação sem enviar e-mail. A senha é cifrada no `Setting` e nunca é retornada pela API.

## WhatsApp

Informe a URL da Evolution API, a chave, o nome da instância e o WhatsApp do administrador. O botão **Atualizar status** consulta a conexão da instância. O botão **Enviar teste** envia uma mensagem somente para o número informado no momento do teste; esse número não é persistido.

As rotas de configuração exigem a permissão `admin:write`. A aplicação aceita os valores persistidos no banco e usa as variáveis de ambiente do `.env.example` como provisionamento inicial. Não versionar valores reais nessas variáveis.
