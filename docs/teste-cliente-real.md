# Teste com cliente real

## Objetivo

Validar o HortiGiro em uma rotina real de pedidos, compra no Ceasa, separacao por rota e entrega.

## Antes do primeiro uso

1. Abrir o app pela URL HTTPS da Vercel.
2. Instalar na tela inicial do celular.
3. Acessar Configuracoes e conferir o nome da empresa.
4. Cadastrar rotas reais, se existir mais de uma.
5. Cadastrar clientes reais dos pedidos.
6. Revisar produtos iniciais e adicionar os que faltarem.
7. Exportar um backup JSON inicial.

## Durante o teste

1. Fazer pedidos normalmente pelo celular.
2. Conferir se a data de entrega ficou correta.
3. Conferir se itens repetidos somaram corretamente.
4. Gerar PDF geral para compra no Ceasa.
5. Gerar PDF de entrega por rota.
6. Marcar pedidos entregues quando fizer sentido.
7. Anotar qualquer ponto que atrapalhou velocidade ou clareza.

## Depois de cada ciclo de entrega

1. Exportar backup JSON.
2. Conferir se a lista geral bate com a compra realizada.
3. Conferir se os PDFs por rota ajudaram na separacao.
4. Listar produtos/unidades que ficaram confusos.
5. Listar telas ou botoes que o usuario teve dificuldade de encontrar.

## Criterios para considerar o piloto aprovado

- O usuario consegue lancar pedidos sem ajuda.
- A lista geral do Ceasa reduz retrabalho manual.
- A separacao por rota ajuda na entrega.
- O PDF fica legivel no celular.
- O backup local foi exportado com sucesso.
- O app abre offline depois de instalado.

## Fora do escopo deste piloto

- Login por email e senha.
- Painel de assinantes/licencas.
- Sincronizacao entre varios celulares.
- Banco de dados online.

Esses pontos entram depois que o fluxo operacional estiver confirmado com cliente real.
