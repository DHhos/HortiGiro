# HortiGiro

PWA para registrar pedidos de hortifruti por cliente, organizar entregas por rota e gerar listas em PDF para compra no Ceasa e separacao de mercadorias por cliente.

## Estado atual

O projeto esta em fase de MVP piloto. As principais funcoes ja foram validadas no celular, incluindo instalacao PWA em HTTPS e uso offline:

URL piloto: <https://horti-giro.vercel.app/>

- lancamento rapido de pedidos por cliente;
- pedido rapido por texto colado;
- data de entrega pre-selecionada para o dia seguinte;
- produtos com unidade padrao e quantidade decimal;
- soma automatica de itens repetidos;
- unificacao de pedidos do mesmo cliente, mesma data e mesma rota;
- rotas de entrega;
- lista geral Ceasa para compra total;
- PDFs por rota para compra;
- PDF de entrega por rota com clientes e itens;
- cadastro e edicao de clientes, produtos e rotas;
- backup/importacao local em JSON;
- tema escuro;
- PWA instalavel.
- funcionamento offline validado em HTTPS/Vercel.
- base sugerida de produtos importavel, sem duplicar cadastros existentes.

## Tecnologias

- React
- TypeScript
- Vite
- jsPDF
- lucide-react
- Service Worker simples para PWA
- Persistencia local via `localStorage`

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
npm run serve:dist
```

### Desenvolvimento

`npm run dev` inicia o Vite em `0.0.0.0`, permitindo testar pelo celular na mesma rede.

### Build

`npm run build` valida TypeScript e gera a pasta `dist`.

### Preview local estavel

`npm run serve:dist` serve a pasta `dist` com cache desativado. Esse script e util para testar no iPhone/Android pela rede local.

## Fluxo principal

1. Selecionar a data de entrega.
2. Selecionar a rota.
3. Criar pedido para um cliente.
4. Adicionar produtos e quantidades.
5. Salvar pedido.
6. Conferir pedidos por data.
7. Abrir a aba Ceasa.
8. Gerar PDF geral para compra.
9. Gerar PDFs por rota para compra ou entrega.

## PDFs

### Lista geral Ceasa

Soma todos os pedidos da data selecionada, independentemente da rota. E o PDF principal para comprar tudo de uma vez no Ceasa.

### Compra por rota

Soma os itens de uma rota especifica. Serve para conferir ou separar compra por rota.

### Entrega por rota

Mostra a rota, cada cliente e os produtos/quantidades daquele cliente. Serve para separar a mercadoria e entregar corretamente.

## Configuracoes

A tela de configuracoes permite:

- alterar o nome da empresa;
- exportar backup local em JSON;
- importar backup local em JSON;
- criar, editar, inativar e ordenar rotas.

O nome do app, a cor principal, a logo e o rodape do PDF ficam fixos para manter padronizacao.

## Offline/PWA

O teste offline real ja foi validado em HTTPS. Em rede local `http://192.168...`, o navegador pode nao ativar Service Worker como faria em producao.

Fluxo recomendado de teste offline:

1. Publicar em HTTPS.
2. Abrir no celular.
3. Adicionar a tela inicial.
4. Abrir uma vez online.
5. Ativar modo aviao.
6. Abrir pelo icone instalado.
7. Criar pedido, consultar dados locais e gerar PDF.

## Dados locais

Atualmente os dados ficam no navegador do aparelho:

- configuracoes;
- rotas;
- clientes;
- produtos;
- pedidos;
- itens marcados na lista Ceasa.

Antes de limpar navegador, trocar aparelho ou reinstalar o PWA, exporte um backup em JSON.

## Versao piloto

Uma instalacao nova comeca sem clientes, sem pedidos e sem produtos de exemplo. Ela mantem apenas uma rota principal.

Na tela de Produtos, o usuario pode seguir com a base limpa ou importar uma base sugerida de hortifruti. A importacao pula produtos que ja existem no cadastro.

No escopo atual, "clientes" sao os restaurantes, padarias e mercados que compram hortifruti. Empresas, assinantes ou contas do sistema ficam para uma fase futura de autenticacao e licenciamento.

## Proximas etapas

- Rodar piloto com um cliente real por alguns ciclos de entrega.
- Ajustar detalhes encontrados no uso diario.
- Fortalecer rotina de backup antes de migrar para nuvem.
- Depois do piloto, planejar autenticacao, banco online e sincronizacao.

## Documentacao

- [Planejamento inicial](docs/planejamento-inicial.md)
- [Status atual](docs/status-atual.md)
- [Deploy HTTPS](docs/deploy-https.md)
- [Teste com cliente real](docs/teste-cliente-real.md)
