# Deploy HTTPS para teste PWA

## Opcao recomendada: Vercel

O HortiGiro e uma PWA Vite/React. Para testar instalacao e offline de forma real no iPhone/Android, publique em HTTPS.

## Passo a passo

1. Acesse <https://vercel.com>.
2. Entre com a conta GitHub.
3. Clique em `Add New` > `Project`.
4. Importe o repositorio `DHhos/HortiGiro`.
5. Confira as configuracoes:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Clique em `Deploy`.
7. Ao finalizar, abra a URL HTTPS gerada pela Vercel no celular.

## Teste PWA/offline

1. Abra a URL HTTPS no Safari do iPhone ou Chrome do Android.
2. Adicione o app a tela inicial.
3. Abra o app pelo icone instalado.
4. Navegue pelas telas principais uma vez com internet.
5. Ative modo aviao.
6. Abra o app novamente pelo icone.
7. Verifique:
   - app abre;
   - dados locais aparecem;
   - pedidos podem ser consultados;
   - PDF pode ser gerado.

## Observacao

Os dados continuam locais no navegador do aparelho. Antes de limpar cache, trocar aparelho ou reinstalar o app, exporte backup em JSON pela tela de Configuracoes.
