# Autenticação

O MVP possui cadastro, login, logout, sessão e página de conta em `/cadastro`, `/login` e `/minha-conta`.

Requisitos de ativação:

- `DATABASE_URL` configurada;
- `NEXTAUTH_SECRET` com pelo menos 32 caracteres aleatórios.

Senhas são armazenadas com `scrypt`; a sessão é um cookie `HttpOnly`, `SameSite=Lax`, assinado com HMAC e expirado em 30 dias. A resposta das APIs retorna apenas o DTO público do usuário.

Antes da produção, adicionar rate limiting distribuído para login/cadastro, confirmação de e-mail, recuperação de senha e MFA conforme o risco do produto. O MVP não possui login social nem recuperação de senha.
