# Rifas

O módulo de rifas é uma vertical separada de produtos e pedidos do marketplace. A categoria persistida `Rifas` é criada pela migração e pelos seeds, e cada campanha referencia essa categoria.

## Fluxo administrativo

1. Acesse o painel administrativo e abra a aba **Rifas**.
2. Crie a campanha como rascunho, informando preço por número, quantidade total, limite por participante e, opcionalmente, a data do sorteio.
   - A campanha aceita até 5 imagens JPG, PNG, WebP ou AVIF, com até 5 MB por arquivo. Os arquivos ficam no volume persistente de uploads e podem ser removidos individualmente durante a edição.
3. Altere o status para **Aberta** quando a campanha estiver pronta. O status pode ser pausado ou cancelado; campanhas sorteadas não podem ser editadas.
4. O botão **Sortear** é exclusivo de `ADMIN`, só aparece com números pagos e escolhe um número pago usando aleatoriedade criptograficamente segura.
5. A ação **Ver reservas** mostra os pedidos, participantes, números e situação do PIX da campanha, sem misturar esses dados com os pedidos regulares.

## Compra e PIX

- A vitrine fica em `/rifas` e cada campanha em `/rifa/{slug}`.
- As imagens cadastradas aparecem como capa na listagem e como galeria na página pública da rifa; `imageUrl` continua disponível apenas como fallback legado.
- O participante escolhe os números disponíveis e informa nome, e-mail e telefone.
- Os números são reservados por 15 minutos em uma transação; números pagos ou reservados não podem ser escolhidos novamente.
- A cobrança é criada pelo gateway Mercado Pago já existente, sempre com `method: "pix"`. Nenhum cartão é aceito neste fluxo.
- O webhook existente e a reconciliação manual identificam pagamentos regulares e de rifas pelo identificador externo do provedor.
- Pagamento aprovado transforma a reserva em números pagos. Pagamento rejeitado, cancelado ou expirado libera os números.

## Banco e operação

Execute a migração em cada ambiente com:

```bash
npx prisma migrate deploy
```

Antes da validação manual, configure as credenciais Mercado Pago no painel em **Configurações > Pagamentos** e confirme que o webhook público está acessível. O fluxo de produção depende de `DATABASE_URL`, das credenciais do provedor e da entrega do webhook; os testes automatizados validam as regras e os adaptadores sem movimentar dinheiro real.

O participante pode consultar a rifa pelo número gerado com o mesmo formulário de acompanhamento de pedidos, usando o e-mail informado na reserva.
