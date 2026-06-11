# Status atual do HortiGiro

Data do marco: 2026-06-11

## Objetivo validado

O HortiGiro atende o fluxo principal de um comercio de hortifruti que recebe pedidos por telefone e precisa consolidar a compra no Ceasa.

O app e usado internamente pelo dono/funcionario, nao pelo cliente final.

## Funcionalidades prontas

- PWA com interface responsiva para celular.
- Tema escuro.
- Logo e identidade visual do HortiGiro.
- Cadastro de produtos com unidade padrao.
- Cadastro e edicao de clientes.
- Cadastro, edicao, inativacao e ordenacao de rotas.
- Pedido por cliente, data de entrega e rota.
- Entrega pre-selecionada para o dia seguinte ao criar novo pedido.
- Soma de itens repetidos dentro do pedido.
- Unificacao de pedidos do mesmo cliente, mesma data e mesma rota.
- Lista geral Ceasa por data de entrega.
- PDFs por rota.
- PDF de entrega por rota, separado por cliente.
- Backup local em JSON.
- Importacao de backup local em JSON.

## Regras importantes

- O nome do app permanece fixo como HortiGiro.
- A cor principal permanece fixa em `#287e1d`.
- A logo permanece fixa.
- O rodape do PDF permanece fixo.
- Somente o nome da empresa pode ser alterado nas configuracoes.
- A compra no Ceasa usa a lista geral.
- A separacao e entrega usam os PDFs por rota.

## Fluxo de compra e entrega

1. O funcionario registra os pedidos por cliente.
2. O app soma os pedidos do mesmo cliente na mesma entrega/rota.
3. Na aba Ceasa, a lista geral mostra tudo que precisa ser comprado.
4. O PDF geral ajuda na compra total.
5. Os PDFs por rota ajudam na separacao.
6. O PDF de entrega por rota mostra cada cliente e os itens dele.

## Limitacoes atuais

- Dados ficam no navegador do aparelho.
- Ainda nao existe login.
- Ainda nao existe banco online.
- O teste offline completo precisa de HTTPS.
- Mais de um usuario ao mesmo tempo ainda nao e suportado.

## Proximos passos tecnicos

1. Criar repositorio no GitHub.
2. Publicar a PWA em HTTPS para validar instalacao/offline.
3. Definir backend: Firebase ou Supabase.
4. Criar autenticacao.
5. Migrar dados locais para banco online com estrategia de backup/sincronizacao.
